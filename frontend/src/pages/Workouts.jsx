import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Activity,
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudOff,
  Dumbbell,
  Flame,
  Layers,
  Loader2,
  Minus,
  Play,
  Plus,
  RotateCcw,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  addWorkoutSet,
  createExercise,
  deleteWorkout,
  deleteWorkoutSet,
  finishWorkout,
  getActiveWorkout,
  getCycleStatus,
  getExercises,
  getMuscleGroups,
  getRecords,
  getSuggestedRoutines,
  getUserProfile,
  getWorkouts,
  saveWorkout,
  startWorkout,
  startWorkoutFromRoutine,
  updateRoutineExercises,
  updateWorkoutDate,
} from "../api/client";

import ExerciseLogger from "../components/ExerciseLogger";
import ExerciseSelectorModal from "../components/ExerciseSelectorModal";
import HeavyDutyRecoveryBanner from "../components/HeavyDutyRecoveryBanner";
import WorkoutHeader from "../components/WorkoutHeader";
import WorkoutSummaryModal from "../components/WorkoutSummaryModal";
import { getLocalDateString, formatDateLong } from "../utils/dateUtils";
import { getExerciseEquipment } from "../utils/fitnessUtils";
import {
  PERIODIZATION_MODES,
  getWeeklyPeriodizationMode,
  setWeeklyPeriodizationMode,
} from "../utils/periodization";
import {
  PREDEFINED_ROUTINES,
  resolveRoutineExercises,
  getProfileAdaptedRoutines,
  getHeavyDutyRecoveryStatus,
  getMuscleRecoveryTracker,
} from "../utils/routines";
import { enqueueSyncAction, getPendingQueue, isOnline, processSyncQueue } from "../utils/syncQueue";
import { analyzeWorkoutSession } from "../utils/workoutAnalytics";
import {
  getCachedMuscleGroups,
  getCachedExercises,
  syncCatalogCache,
} from "../services/exerciseCache";

export { getExerciseEquipment };

// Helper for muscle icon
function getMuscleIcon(name = "") {
  const n = (name || "").toLowerCase();
  if (n.includes("pecho")) return Flame;
  if (n.includes("espalda")) return Layers;
  if (n.includes("pierna") || n.includes("cuádriceps") || n.includes("femoral")) return Zap;
  if (n.includes("hombro")) return Target;
  if (n.includes("bíceps") || n.includes("biceps")) return Dumbbell;
  if (n.includes("tríceps") || n.includes("triceps")) return Dumbbell;
  if (n.includes("core") || n.includes("abs") || n.includes("abdomen")) return Activity;
  return Dumbbell;
}

export function getActiveSessionStorageKey(user) {
  if (user && user.id) {
    return `fittracker_active_session_${user.id}`;
  }
  try {
    const raw = localStorage.getItem("fittracker_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        return `fittracker_active_session_${parsed.id}`;
      }
    }
  } catch {}
  return "fittracker_active_session";
}

export function getSessionStartedAtStorageKey(user) {
  if (user && user.id) {
    return `fittracker_session_started_at_${user.id}`;
  }
  try {
    const raw = localStorage.getItem("fittracker_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        return `fittracker_session_started_at_${parsed.id}`;
      }
    }
  } catch {}
  return "fittracker_session_started_at";
}

const LOCAL_STORAGE_KEY = "fittracker_active_session";
const SESSION_STARTED_AT_KEY = "fittracker_session_started_at";

export default function Workouts({ currentUser: propCurrentUser }) {
  // -------------------------------------------------------------
  // 1. ELEVACIÓN TOTAL DE HOOKS: ROUTER & REFS
  // -------------------------------------------------------------
  const navigate = useNavigate();
  const location = useLocation();

  const activeSessionIdRef = useRef(null);
  const sessionPromiseRef = useRef(null);
  const activeWorkoutRef = useRef(null);

  // -------------------------------------------------------------
  // 2. ELEVACIÓN TOTAL DE HOOKS: ESTADOS (useState)
  // Inicialización defensiva para BD con 0 registros
  // -------------------------------------------------------------
  const user = useMemo(() => {
    if (propCurrentUser && propCurrentUser.id) return propCurrentUser;
    try {
      const raw = localStorage.getItem("fittracker_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [propCurrentUser]);

  const storageKey = useMemo(() => {
    return user ? `fittracker_active_session_${user.id}` : "fittracker_active_session";
  }, [user]);

  const sessionStartedKey = useMemo(() => {
    return user ? `fittracker_session_started_at_${user.id}` : "fittracker_session_started_at";
  }, [user]);

  const [muscleGroups, setMuscleGroups] = useState([]);
  const [allExercises, setAllExercises] = useState([]);
  const [records, setRecords] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rutinas Dinámicas Sugeridas según Perfil
  const [suggestedRoutines, setSuggestedRoutines] = useState(() =>
    getProfileAdaptedRoutines(PREDEFINED_ROUTINES, null)
  );
  const [suggestedBadge, setSuggestedBadge] = useState("");

  // 3-Step Selection States
  const [selectedMuscleId, setSelectedMuscleId] = useState(null);
  const [equipmentFilter, setEquipmentFilter] = useState("Barra"); // Barra | Mancuerna | Polea | Máquina
  const [exerciseSearch, setExerciseSearch] = useState("");

  // Create Custom Exercise Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseEquipment, setNewExerciseEquipment] = useState("Barra");
  const [newExerciseMuscleId, setNewExerciseMuscleId] = useState(null);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [createExerciseError, setCreateExerciseError] = useState("");

  // Focus Mode States
  const [focusExercise, setFocusExercise] = useState(null);
  const [secondExercise, setSecondExercise] = useState(null);
  const [activeSlot, setActiveSlot] = useState("A"); // "A" | "B"
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);

  // Active workout session state
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeExercises, setActiveExercises] = useState([]);
  const [workoutDate, setWorkoutDate] = useState(() => getLocalDateString());
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [syncStatus, setSyncStatus] = useState("synced"); // 'synced' | 'saving' | 'offline'
  const [isDeviceOnline, setIsDeviceOnline] = useState(() => isOnline());
  const [isUsingOfflineCache, setIsUsingOfflineCache] = useState(() => !isOnline());
  const [pendingQueueCount, setPendingQueueCount] = useState(() => getPendingQueue().length);

  // Finishing / Summary state
  const [isSaving, setIsSaving] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [historicalWorkouts, setHistoricalWorkouts] = useState([]);

  // Rutina Base y Edición Dinámica en Vivo
  const [baseRoutine, setBaseRoutine] = useState(null);
  const [replacingExercise, setReplacingExercise] = useState(null);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [saveToPermanentRoutine, setSaveToPermanentRoutine] = useState(false);

  // Periodization mode state (100% automático desde el motor biológico)
  const [periodizationMode, setPeriodizationMode] = useState(() => getWeeklyPeriodizationMode());
  const [cycleStatus, setCycleStatus] = useState(null);


  const [sessionStartedAt, setSessionStartedAt] = useState(() => {
    try {
      const uKey = propCurrentUser?.id ? `fittracker_session_started_at_${propCurrentUser.id}` : null;
      const saved = (uKey ? localStorage.getItem(uKey) : null) || localStorage.getItem(SESSION_STARTED_AT_KEY);
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });
  const [liveTimerText, setLiveTimerText] = useState("");

  // -------------------------------------------------------------
  // 3. ELEVACIÓN TOTAL DE HOOKS: MEMOS (useMemo)
  // -------------------------------------------------------------
  const isCurrentHeavyDuty = useMemo(() => {
    const list = Array.isArray(activeExercises) ? activeExercises : [];
    return (
      list.some(
        (ae) =>
          ae?.isHeavyDuty ||
          (ae?.sets || []).some(
            (s) => s?.set_type === "heavy_duty" || s?.technique || s?.rest_effort
          )
      ) || Boolean(workoutNotes && workoutNotes.toLowerCase().includes("heavy duty"))
    );
  }, [activeExercises, workoutNotes]);

  const hasRoutineChanges = useMemo(() => {
    if (!baseRoutine || !baseRoutine.exercises) return false;
    const baseIds = baseRoutine.exercises.map((e) => e.exerciseId || e.id);
    const currentIds = (activeExercises || []).map((e) => e.exerciseId);
    if (baseIds.length !== currentIds.length) return true;
    return baseIds.some((id, idx) => id !== currentIds[idx]);
  }, [baseRoutine, activeExercises]);

  const heavyDutyRecovery = useMemo(
    () => getHeavyDutyRecoveryStatus(historicalWorkouts),
    [historicalWorkouts]
  );

  const currentTargetMuscle = useMemo(() => {
    if (activeExercises.length > 0) {
      const activeIdx = activeExerciseIndex >= 0 && activeExerciseIndex < activeExercises.length ? activeExerciseIndex : 0;
      const cur = activeExercises[activeIdx];
      if (cur?.muscleGroupId) return cur.muscleGroupId;
      if (cur?.muscle_group_name) return cur.muscle_group_name;
    }
    if (selectedMuscleId) {
      return selectedMuscleId;
    }
    const todayDay = new Date().getDay();
    if (todayDay === 1) return ["Pecho", "Espalda"];
    if (todayDay === 2) return ["Piernas", "Core"];
    if (todayDay === 4) return ["Hombros", "Tríceps", "Bíceps"];
    if (todayDay === 5) return ["Espalda", "Hombros", "Core"];
    return ["Pecho", "Espalda"];
  }, [activeExercises, activeExerciseIndex, selectedMuscleId]);

  const muscleRecovery = useMemo(() => {
    return getMuscleRecoveryTracker({
      workouts: historicalWorkouts || [],
      targetMuscle: currentTargetMuscle,
      allExercises: allExercises || [],
      muscleGroups: muscleGroups || [],
    });
  }, [historicalWorkouts, currentTargetMuscle, allExercises, muscleGroups]);
  const currentGoalLabel = useMemo(() => {
    const rawGoal = (userProfile?.training_goal || "hipertrofia").toLowerCase();
    const map = {
      hipertrofia: "Hipertrofia",
      fuerza: "Fuerza",
      definicion_adelgazar: "Definición",
      potencia_rapidez: "Potencia",
    };
    return map[rawGoal] || "Hipertrofia";
  }, [userProfile?.training_goal]);

  const recordsMap = useMemo(() => {
    const ee = {};
    const m = records;
    if (Array.isArray(m)) {
      m.forEach((pe) => {
        if (pe?.exercise_id) {
          ee[pe.exercise_id] = pe;
        }
      });
    } else if (m && typeof m === "object") {
      Object.values(m).forEach((pe) => {
        if (pe?.exercise_id) {
          ee[pe.exercise_id] = pe;
        }
      });
    }
    return ee;
  }, [records]);

  const currentMuscle = useMemo(() => {
    const list = Array.isArray(muscleGroups) ? muscleGroups : [];
    return list.find((g) => g && g.id === selectedMuscleId);
  }, [muscleGroups, selectedMuscleId]);

  const filteredExercises = useMemo(() => {
    const list = Array.isArray(allExercises) ? allExercises : [];
    return list.filter((ex) => {
      if (!ex) return false;
      if (selectedMuscleId && ex.muscle_group_id !== selectedMuscleId) {
        return false;
      }
      if (equipmentFilter) {
        const eq = getExerciseEquipment(ex?.name || "");
        if (eq !== equipmentFilter) return false;
      }
      if (exerciseSearch.trim()) {
        const q = exerciseSearch.toLowerCase().trim();
        if (!ex?.name?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allExercises, selectedMuscleId, equipmentFilter, exerciseSearch]);

  const totalSetsCount = useMemo(() => {
    const list = Array.isArray(activeExercises) ? activeExercises : [];
    return list.reduce((acc, ex) => acc + (Array.isArray(ex?.sets) ? ex.sets.length : 0), 0);
  }, [activeExercises]);

  const hasActiveWorkout = useMemo(() => {
    return totalSetsCount > 0;
  }, [totalSetsCount]);

  const totalVolume = useMemo(() => {
    const list = Array.isArray(activeExercises) ? activeExercises : [];
    return list.reduce((acc, ex) => {
      const sets = Array.isArray(ex?.sets) ? ex.sets : [];
      const vol = sets.reduce((sum, s) => {
        const wt = parseFloat(s?.weight) || 0;
        const rp = parseInt(s?.reps, 10) || 0;
        return sum + wt * rp;
      }, 0);
      return acc + vol;
    }, 0);
  }, [activeExercises]);

  const formattedToday = useMemo(() => {
    return formatDateLong(workoutDate);
  }, [workoutDate]);

  // -------------------------------------------------------------
  // 4. ELEVACIÓN TOTAL DE HOOKS: EFECTOS (useEffect)
  // -------------------------------------------------------------
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    const handleLogout = () => {
      setActiveExercises([]);
      setActiveSessionId(null);
      setSessionStartedAt(null);
      activeSessionIdRef.current = null;
      activeWorkoutRef.current = null;
      try {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(sessionStartedKey);
        localStorage.removeItem(SESSION_STARTED_AT_KEY);
      } catch {}
    };
    window.addEventListener("fittracker:logout", handleLogout);
    return () => window.removeEventListener("fittracker:logout", handleLogout);
  }, [storageKey, sessionStartedKey]);

  useEffect(() => {
    if (!sessionStartedAt) {
      setLiveTimerText("");
      return;
    }
    const update = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      setLiveTimerText(`⏱️ ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sessionStartedAt]);

  useEffect(() => {
    const handleOnline = () => {
      setIsDeviceOnline(true);
      setIsUsingOfflineCache(false);
      processSyncQueue();
      syncCatalogCache().then((res) => {
        if (res?.muscleGroups?.length) setMuscleGroups(res.muscleGroups);
        if (res?.exercises?.length) setAllExercises(res.exercises);
      }).catch(() => {});
    };
    const handleOffline = () => {
      setIsDeviceOnline(false);
      setIsUsingOfflineCache(true);
    };
    const handleQueueChange = (e) => {
      if (e.detail && typeof e.detail.count === "number") {
        setPendingQueueCount(e.detail.count);
      } else {
        setPendingQueueCount(getPendingQueue().length);
      }
    };
    const handleSetIdSynced = (e) => {
      if (e.detail && e.detail.tempId && e.detail.realId) {
        const { tempId, realId } = e.detail;
        setActiveExercises((prev) =>
          (prev || []).map((ex) => ({
            ...ex,
            sets: (ex.sets || []).map((s) => (s.id === tempId ? { ...s, id: realId } : s)),
          }))
        );
      }
    };

    const handlePeriodizationChange = (e) => {
      if (e.detail) {
        setPeriodizationMode(e.detail);
      }
    };

    const handleCacheUpdated = (e) => {
      const groups = getCachedMuscleGroups();
      const exs = getCachedExercises();
      if (groups.length) setMuscleGroups(groups);
      if (exs.length) setAllExercises(exs);
      if (e?.detail?.isFromCache !== undefined) {
        setIsUsingOfflineCache(e.detail.isFromCache);
      }
    };

    const handleExerciseSynced = (e) => {
      if (e?.detail) {
        const { tempId, realId, exercise } = e.detail;
        setAllExercises((prev) =>
          (prev || []).map((item) =>
            item.id === tempId ? { ...item, ...exercise, id: realId } : item
          )
        );
      }
    };

    const handleActiveSessionCleared = () => {
      setActiveSessionId(null);
      setActiveExercises([]);
      setWorkoutNotes("");
      setBaseRoutine(null);
      setSessionStartedAt(null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("fittracker:syncQueueChanged", handleQueueChange);
    window.addEventListener("fittracker:setIdSynced", handleSetIdSynced);
    window.addEventListener("fittracker:periodizationChanged", handlePeriodizationChange);
    window.addEventListener("fittracker:catalogCacheUpdated", handleCacheUpdated);
    window.addEventListener("fittracker:exerciseSynced", handleExerciseSynced);
    window.addEventListener("fittracker:activeSessionCleared", handleActiveSessionCleared);

    if (isOnline()) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("fittracker:syncQueueChanged", handleQueueChange);
      window.removeEventListener("fittracker:setIdSynced", handleSetIdSynced);
      window.removeEventListener("fittracker:periodizationChanged", handlePeriodizationChange);
      window.removeEventListener("fittracker:catalogCacheUpdated", handleCacheUpdated);
      window.removeEventListener("fittracker:exerciseSynced", handleExerciseSynced);
      window.removeEventListener("fittracker:activeSessionCleared", handleActiveSessionCleared);
    };
  }, []);

  // Carga inicial
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [groups, recs, allExList, activeSession, profile, suggestedData, cycleData, pastWorkouts] = await Promise.all([
          getMuscleGroups().catch(() => getCachedMuscleGroups()),
          getRecords().catch(() => []),
          getExercises().catch(() => getCachedExercises()),
          getActiveWorkout().catch(() => null),
          getUserProfile().catch(() => null),
          getSuggestedRoutines().catch(() => null),
          getCycleStatus().catch(() => null),
          getWorkouts().catch(() => []),
        ]);

        const cachedFallbackGroups = getCachedMuscleGroups();
        const cachedFallbackExs = getCachedExercises();

        const safeGroups = Array.isArray(groups) && groups.length > 0
          ? groups
          : cachedFallbackGroups;
        const safeRecs = Array.isArray(recs)
          ? recs
          : recs && typeof recs === "object"
          ? Object.values(recs)
          : [];
        const safeAllExList = Array.isArray(allExList) && allExList.length > 0
          ? allExList
          : cachedFallbackExs;

        const usingOffline = !isOnline() || !groups?.length || !allExList?.length;
        setIsUsingOfflineCache(usingOffline);

        setMuscleGroups(safeGroups);
        setRecords(safeRecs);
        setAllExercises(safeAllExList);
        setHistoricalWorkouts(Array.isArray(pastWorkouts) ? pastWorkouts : []);
        if (profile) setUserProfile(profile);

        if (cycleData && cycleData.status) {
          setCycleStatus(cycleData);
          const autoMode = cycleData.status === "deload" ? PERIODIZATION_MODES.DELOAD : PERIODIZATION_MODES.OVERLOAD;
          setPeriodizationMode(autoMode);
          setWeeklyPeriodizationMode(autoMode);
        }

        if (suggestedData?.routines && suggestedData.routines.length > 0) {
          setSuggestedRoutines(suggestedData.routines);
          if (suggestedData.recommended_label) {
            setSuggestedBadge(suggestedData.recommended_label);
          }
        } else if (profile) {
          setSuggestedRoutines(getProfileAdaptedRoutines(PREDEFINED_ROUTINES, profile));
        }

        let initialMuscleId = safeGroups.length > 0 ? safeGroups[0].id : null;


        if (activeSession && activeSession.status === "in_progress") {
          setActiveSessionId(activeSession.id);
          if (activeSession.date) setWorkoutDate(activeSession.date);
          if (activeSession.muscle_group_id) initialMuscleId = activeSession.muscle_group_id;
          if (activeSession.notes) setWorkoutNotes(activeSession.notes);

          // Restore session timer
          if (activeSession.started_at && !localStorage.getItem(sessionStartedKey)) {
            const startMs = new Date(activeSession.started_at).getTime();
            if (startMs && !isNaN(startMs)) {
              localStorage.setItem(sessionStartedKey, String(startMs));
              setSessionStartedAt(startMs);
              window.dispatchEvent(new CustomEvent("fittracker:sessionTimerChanged", { detail: { startedAt: startMs } }));
            }
          }

          const grouped = {};
          const sessionSets = Array.isArray(activeSession.sets)
            ? activeSession.sets
            : activeSession.sets && typeof activeSession.sets === "object"
            ? Object.values(activeSession.sets)
            : [];
          sessionSets.forEach((s) => {
            if (!s || !s.exercise_id) return;
            if (!grouped[s.exercise_id]) {
              grouped[s.exercise_id] = {
                exerciseId: s.exercise_id,
                exerciseName: s.exercise_name || `Ejercicio #${s.exercise_id}`,
                muscleGroupId: activeSession.muscle_group_id,
                sets: [],
              };
            }
            grouped[s.exercise_id].sets.push({
              id: s.id,
              setNumber: s.set_number,
              weight: s.weight,
              reps: s.reps,
              completed: Boolean(s.completed),
            });
          });

          const restored = Object.values(grouped);
          setActiveExercises(restored);
          if (activeSession.routine_id) {
            setBaseRoutine({
              id: activeSession.routine_id,
              name: activeSession.routine_name || "Rutina",
              exercises: [],
            });
          }
        } else {
          // El backend no tiene sesión activa: purgar claves residuales de sesión activa
          try {
            localStorage.removeItem(storageKey);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            localStorage.removeItem("active_workout_id");
            localStorage.removeItem(sessionStartedKey);
            localStorage.removeItem(SESSION_STARTED_AT_KEY);
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const k = localStorage.key(i);
              if (
                k &&
                (k.startsWith("fittracker_active_session") ||
                  k.startsWith("fittracker_session_started_at") ||
                  k.startsWith("active_workout"))
              ) {
                localStorage.removeItem(k);
              }
            }
          } catch (e) {
            console.warn("Error purgando almacenamiento residual de sesión activa:", e);
          }
          setActiveSessionId(null);
          setActiveExercises([]);
          setWorkoutNotes("");
          setBaseRoutine(null);
          setSessionStartedAt(null);
        }

        if (initialMuscleId) {
          setSelectedMuscleId(initialMuscleId);
        }
      } catch (err) {
        console.error("Error cargando datos iniciales:", err);
        setErrorMessage("Error al conectar con la base de datos.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Actualizar rutinas sugeridas si cambia el perfil del usuario
  useEffect(() => {
    let isMounted = true;
    getSuggestedRoutines()
      .then((data) => {
        if (isMounted && data?.routines && data.routines.length > 0) {
          setSuggestedRoutines(data.routines);
          if (data.recommended_label) {
            setSuggestedBadge(data.recommended_label);
          }
        }
      })
      .catch(() => {
        if (isMounted && userProfile) {
          setSuggestedRoutines(getProfileAdaptedRoutines(PREDEFINED_ROUTINES, userProfile));
        }
      });
    return () => {
      isMounted = false;
    };
  }, [userProfile?.id]);


  // Cargar rutina enviada desde la pestaña Rutinas si existe en navigation state
  useEffect(() => {
    if (location.state?.loadRoutine && allExercises.length > 0) {
      const routineToLoad = location.state.loadRoutine;
      const enterFocus = Boolean(location.state.enterFocus);
      window.history.replaceState({}, document.title);
      handleStartRoutine(routineToLoad, enterFocus);
    }
  }, [location.state, allExercises, muscleGroups]);

  useEffect(() => {
    const handleSyncComplete = () => {
      setSyncStatus("synced");
      setActiveExercises((prev) => {
        const prevList = Array.isArray(prev) ? prev : [];
        return prevList.map((ex) => ({
          ...ex,
          sets: (ex.sets || []).map((s) => ({ ...s, is_offline: false })),
        }));
      });
    };
    window.addEventListener("fittracker:syncQueueCompleted", handleSyncComplete);
    return () => {
      window.removeEventListener("fittracker:syncQueueCompleted", handleSyncComplete);
    };
  }, []);

  // -------------------------------------------------------------
  // 5. HANDLERS Y FUNCIONES AUXILIARES DEL COMPONENTE
  // -------------------------------------------------------------
  const saveToLocalStorage = (
    sessionId,
    exercisesList,
    notes,
    date,
    muscleId,
    currentBaseRoutine = baseRoutine
  ) => {
    try {
      const hasSets = exercisesList && exercisesList.length > 0;
      if (!hasSets) {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return;
      }
      const rawStarted = localStorage.getItem(sessionStartedKey) || localStorage.getItem(SESSION_STARTED_AT_KEY);
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          activeSessionId: sessionId,
          activeExercises: exercisesList,
          workoutNotes: notes,
          workoutDate: date || getLocalDateString(),
          selectedMuscleId: muscleId,
          sessionStartedAt: rawStarted ? parseInt(rawStarted, 10) : sessionStartedAt,
          baseRoutine: currentBaseRoutine,
          savedAt: new Date().toISOString(),
          userId: user?.id,
        })
      );
    } catch (e) {
      console.warn("Error guardando en localStorage:", e);
    }
  };

  const ensureActiveSession = async (muscleId = selectedMuscleId) => {
    if (activeSessionIdRef.current) return activeSessionIdRef.current;
    if (sessionPromiseRef.current) return sessionPromiseRef.current;

    sessionPromiseRef.current = (async () => {
      try {
        setSyncStatus("saving");
        const session = await startWorkout({
          date: workoutDate,
          muscle_group_id: muscleId,
          notes: workoutNotes.trim() || null,
          sport_type: "strength",
        });
        setActiveSessionId(session.id);
        activeSessionIdRef.current = session.id;
        setSyncStatus("synced");
        return session.id;
      } catch (err) {
        console.error("Error iniciando sesión activa en backend:", err);
        setSyncStatus("offline");
        return null;
      } finally {
        sessionPromiseRef.current = null;
      }
    })();

    return sessionPromiseRef.current;
  };

  const handleSelectExercise = (exercise, index) => {
    if (!exercise) return;
    setFocusExercise(exercise);
    setActiveSlot("A");

    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const existingIdx = prevList.findIndex((ae) => ae.exerciseId === exercise.id);
      if (existingIdx !== -1) {
        setActiveExerciseIndex(typeof index === "number" ? index : existingIdx);
        return prevList;
      }
      const next = [
        ...prevList,
        {
          exerciseId: exercise?.id,
          exerciseName: exercise?.name || "Ejercicio",
          muscleGroupId: exercise?.muscle_group_id,
          sets: [],
        },
      ];
      setActiveExerciseIndex(next.length - 1);
      saveToLocalStorage(activeSessionIdRef.current, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });
  };

  const handleStartRoutine = async (routine, enterFocus = false) => {
    const resolved = resolveRoutineExercises(routine, allExercises, muscleGroups);
    if (!resolved || resolved.length === 0) return;

    const primaryMuscleId = resolved?.[0]?.muscleGroupId || selectedMuscleId;
    if (primaryMuscleId) {
      setSelectedMuscleId(primaryMuscleId);
    }

    const routineInfo = {
      id: routine.id,
      name: routine.name || routine.title || "Rutina",
      exercises: resolved.map((r, i) => ({
        exerciseId: r.exerciseId,
        orderIndex: i,
        name: r.exerciseName,
      })),
    };
    setBaseRoutine(routineInfo);

    if (routine.id && isOnline()) {
      try {
        const started = await startWorkoutFromRoutine(routine.id);
        if (started?.session?.id) {
          setActiveSessionId(started.session.id);
          activeSessionIdRef.current = started.session.id;
        }
      } catch (err) {
        console.warn("Fallo endpoint start-from-routine, iniciando en modo local:", err);
      }
    }

    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const hasCompletedSets = prevList.some((ex) => (ex?.sets || []).length > 0);
      let next;
      if (hasCompletedSets) {
        const existingIds = new Set(prevList.map((e) => e.exerciseId));
        const toAdd = resolved.filter((r) => !existingIds.has(r.exerciseId));
        next = [...prevList, ...toAdd];
      } else {
        next = resolved;
      }

      saveToLocalStorage(
        activeSessionIdRef.current,
        next,
        workoutNotes || routine.description || "",
        workoutDate,
        primaryMuscleId,
        routineInfo
      );
      return next;
    });

    ensureActiveSession(primaryMuscleId);

    if (enterFocus && resolved?.[0]) {
      setActiveExerciseIndex(0);
      const firstExObj =
        allExercises.find(
          (e) =>
            e?.id === resolved?.[0]?.exerciseId ||
            (e?.name && resolved?.[0]?.exerciseName && e.name.toLowerCase() === resolved[0].exerciseName.toLowerCase())
        ) || {
          id: resolved?.[0]?.exerciseId,
          name: resolved?.[0]?.exerciseName || "Ejercicio",
          muscle_group_id: primaryMuscleId,
        };
      setFocusExercise(firstExObj);
      setActiveSlot("A");
    } else {
      setTimeout(() => {
        if (activeWorkoutRef.current) {
          activeWorkoutRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 120);
    }
  };

  const handleRemoveExerciseFromSession = (exerciseId) => {
    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const next = prevList.filter((ae) => ae.exerciseId !== exerciseId);
      saveToLocalStorage(
        activeSessionIdRef.current,
        next,
        workoutNotes,
        workoutDate,
        selectedMuscleId
      );
      return next;
    });
    setActiveExerciseIndex((prev) => Math.max(0, prev > 0 ? prev - 1 : 0));
  };

  const handleReplaceExerciseInSession = (oldExerciseId, newExercise) => {
    if (!newExercise || !oldExerciseId) return;

    if (focusExercise?.id === oldExerciseId) {
      setFocusExercise(newExercise);
    }
    if (secondExercise?.id === oldExerciseId) {
      setSecondExercise(newExercise);
    }

    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const updated = prevList.map((item) => {
        if (item.exerciseId === oldExerciseId) {
          return {
            ...item,
            exerciseId: newExercise.id,
            exerciseName: newExercise.name,
            muscleGroupId: newExercise.muscle_group_id || item.muscleGroupId,
          };
        }
        return item;
      });
      saveToLocalStorage(
        activeSessionIdRef.current,
        updated,
        workoutNotes,
        workoutDate,
        selectedMuscleId
      );
      return updated;
    });
    setReplacingExercise(null);
  };

  const handleAddExerciseToSession = (newExercise) => {
    if (!newExercise) return;
    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      if (prevList.some((ae) => ae.exerciseId === newExercise.id)) {
        return prevList;
      }
      const next = [
        ...prevList,
        {
          exerciseId: newExercise.id,
          exerciseName: newExercise.name,
          muscleGroupId: newExercise.muscle_group_id,
          sets: [],
        },
      ];
      saveToLocalStorage(
        activeSessionIdRef.current,
        next,
        workoutNotes,
        workoutDate,
        selectedMuscleId
      );
      return next;
    });
    setIsAddExerciseModalOpen(false);
  };

  const handleSaveAndSelectCustomExercise = async (e) => {
    if (e) e.preventDefault();
    const cleanName = newExerciseName.trim();
    if (!cleanName) {
      setCreateExerciseError("Por favor ingresa el nombre del ejercicio.");
      return;
    }
    setCreateExerciseError("");
    setIsCreatingExercise(true);

    const targetMuscleId = newExerciseMuscleId || selectedMuscleId || (muscleGroups[0]?.id ?? 1);
    const chosenEquip = newExerciseEquipment || equipmentFilter || "Barra";
    const normalizedEquip = chosenEquip === "Máquina / Peso Corporal" ? "Máquina" : chosenEquip;

    try {
      let created = null;
      try {
        created = await createExercise(cleanName, Number(targetMuscleId));
      } catch (err) {
        console.warn("Error creando en backend, creando en memoria local:", err);
        created = {
          id: `temp_exercise_${Date.now()}`,
          name: cleanName,
          muscle_group_id: Number(targetMuscleId),
          is_active: true,
          is_temp: true,
        };
      }

      try {
        const stored = localStorage.getItem("fittracker_custom_exercise_equipment");
        const map = stored ? JSON.parse(stored) : {};
        map[created.id] = normalizedEquip;
        map[cleanName.toLowerCase().trim()] = normalizedEquip;
        localStorage.setItem("fittracker_custom_exercise_equipment", JSON.stringify(map));
      } catch (e) {
        console.warn("Error guardando equipo personalizado en localStorage:", e);
      }

      setAllExercises((prev) => {
        const prevList = Array.isArray(prev) ? prev : [];
        if (prevList.some((ex) => ex.id === created.id)) return prevList;
        return [...prevList, created];
      });

      setSelectedMuscleId(Number(targetMuscleId));
      setEquipmentFilter(normalizedEquip);
      setExerciseSearch("");

      setIsCreateModalOpen(false);
      setNewExerciseName("");

      handleSelectExercise(created);
    } catch (err) {
      console.error("Error al crear ejercicio:", err);
      setCreateExerciseError("No se pudo crear el ejercicio. Inténtalo de nuevo.");
    } finally {
      setIsCreatingExercise(false);
    }
  };

  const handleAddSet = async (exerciseId, setData) => {
    if (!localStorage.getItem(sessionStartedKey) && !localStorage.getItem(SESSION_STARTED_AT_KEY)) {
      const nowMs = Date.now();
      localStorage.setItem(sessionStartedKey, String(nowMs));
      setSessionStartedAt(nowMs);
      window.dispatchEvent(new CustomEvent("fittracker:sessionTimerChanged", { detail: { startedAt: nowMs } }));
    }

    const ex = (allExercises || []).find((e) => e?.id === exerciseId);
    const exerciseName = ex?.name || (exerciseId ? `Ejercicio #${exerciseId}` : "Ejercicio");
    const muscleGroupId = ex?.muscle_group_id || selectedMuscleId;

    const tempSetId = setData.id || `temp_set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nextWeight = parseFloat(setData.weight) || 0;
    const nextReps = parseInt(setData.reps, 10) || 1;

    let targetSetNumber = setData.setNumber || 1;

    const isCurrentlyOffline = !isOnline();

    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const existing = prevList.find((item) => item.exerciseId === exerciseId);
      let next;
      if (existing) {
        const existingSets = Array.isArray(existing.sets) ? existing.sets : [];
        targetSetNumber = setData.setNumber || existingSets.length + 1;
        const newSet = {
          id: tempSetId,
          setNumber: targetSetNumber,
          weight: nextWeight,
          reps: nextReps,
          completed: true,
          is_offline: isCurrentlyOffline,
          set_type: setData.set_type || "normal",
          technique: setData.technique || null,
          rest_effort: setData.rest_effort || setData.technique || null,
          cadence: setData.cadence || null,
        };
        next = prevList.map((item) => {
          if (item.exerciseId !== exerciseId) return item;
          return {
            ...item,
            sets: [...existingSets, newSet],
          };
        });
      } else {
        targetSetNumber = 1;
        const newSet = {
          id: tempSetId,
          setNumber: 1,
          weight: nextWeight,
          reps: nextReps,
          completed: true,
          is_offline: isCurrentlyOffline,
          set_type: setData.set_type || "normal",
          technique: setData.technique || null,
          rest_effort: setData.rest_effort || setData.technique || null,
          cadence: setData.cadence || null,
        };
        next = [
          ...prevList,
          {
            exerciseId,
            exerciseName,
            muscleGroupId,
            sets: [newSet],
          },
        ];
      }
      saveToLocalStorage(activeSessionIdRef.current, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    (async () => {
      if (isCurrentlyOffline) {
        setSyncStatus("offline");
        enqueueSyncAction({
          type: "ADD_SET",
          tempId: tempSetId,
          payload: {
            workoutSessionId: activeSessionIdRef.current || "active",
            tempId: tempSetId,
            setData: {
              exercise_id: exerciseId,
              set_number: targetSetNumber,
              weight: nextWeight,
              reps: nextReps,
              completed: true,
              set_type: setData.set_type || "normal",
              rest_effort: setData.rest_effort || setData.technique || null,
            },
          },
        });
        return;
      }

      try {
        const sessionId = await ensureActiveSession(muscleGroupId);
        if (sessionId) {
          setSyncStatus("saving");
          const saved = await addWorkoutSet(sessionId, {
            exercise_id: exerciseId,
            set_number: targetSetNumber,
            weight: nextWeight,
            reps: nextReps,
            completed: true,
            set_type: setData.set_type || "normal",
            rest_effort: setData.rest_effort || setData.technique || null,
          });
          setActiveExercises((prev) => {
            const prevList = Array.isArray(prev) ? prev : [];
            const next = prevList.map((item) => {
              if (item.exerciseId !== exerciseId) return item;
              return {
                ...item,
                sets: (item.sets || []).map((s) => (s.id === tempSetId ? { ...s, id: saved.id, is_offline: false } : s)),
              };
            });
            saveToLocalStorage(sessionId, next, workoutNotes, workoutDate, selectedMuscleId);
            return next;
          });
          setSyncStatus("synced");
        }
      } catch (err) {
        console.warn("Fallo guardando serie en servidor, encolando offline:", err);
        setSyncStatus("offline");
        setActiveExercises((prev) => {
          const prevList = Array.isArray(prev) ? prev : [];
          const next = prevList.map((item) => {
            if (item.exerciseId !== exerciseId) return item;
            return {
              ...item,
              sets: (item.sets || []).map((s) => (s.id === tempSetId ? { ...s, is_offline: true } : s)),
            };
          });
          saveToLocalStorage(activeSessionIdRef.current, next, workoutNotes, workoutDate, selectedMuscleId);
          return next;
        });
        enqueueSyncAction({
          type: "ADD_SET",
          tempId: tempSetId,
          payload: {
            workoutSessionId: activeSessionIdRef.current || "active",
            tempId: tempSetId,
            setData: {
              exercise_id: exerciseId,
              set_number: targetSetNumber,
              weight: nextWeight,
              reps: nextReps,
              completed: true,
              set_type: setData.set_type || "normal",
              rest_effort: setData.rest_effort || setData.technique || null,
            },
          },
        });
      }
    })();
  };

  const handleRemoveSet = async (exerciseId, setIndex) => {
    let setToRemove = null;

    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const exItem = prevList.find((ae) => ae?.exerciseId === exerciseId);
      if (!exItem || !Array.isArray(exItem.sets) || !exItem.sets[setIndex]) return prevList;
      setToRemove = exItem?.sets?.[setIndex];

      const next = prevList.map((item) => {
        if (item.exerciseId !== exerciseId) return item;
        const filtered = (item.sets || []).filter((_, idx) => idx !== setIndex);
        const renumbered = filtered.map((s, idx) => ({
          ...s,
          setNumber: idx + 1,
        }));
        return { ...item, sets: renumbered };
      });
      saveToLocalStorage(activeSessionIdRef.current, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    if (setToRemove && setToRemove.id) {
      if (String(setToRemove.id).startsWith("temp_")) {
        enqueueSyncAction({
          type: "DELETE_SET",
          tempId: setToRemove.id,
          payload: { setId: setToRemove.id },
        });
      } else {
        deleteWorkoutSet(setToRemove.id).catch(() => {
          enqueueSyncAction({
            type: "DELETE_SET",
            payload: { setId: setToRemove.id },
          });
        });
      }
    }
  };

  const handleReplaceExercise = useCallback((oldExerciseId, newExercise) => {
    if (!newExercise || !oldExerciseId) return;

    if (focusExercise?.id === oldExerciseId) {
      setFocusExercise(newExercise);
    }
    if (secondExercise?.id === oldExerciseId) {
      setSecondExercise(newExercise);
    }

    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const updated = prevList.map((item) => {
        if (item.exerciseId === oldExerciseId) {
          return {
            ...item,
            exerciseId: newExercise?.id,
            exerciseName: newExercise?.name || item?.exerciseName || "Ejercicio",
            muscleGroupId: newExercise?.muscle_group_id || item?.muscleGroupId,
          };
        }
        return item;
      });
      saveToLocalStorage(
        activeSessionIdRef.current,
        updated,
        workoutNotes,
        workoutDate,
        selectedMuscleId
      );
      return updated;
    });
  }, [focusExercise, secondExercise, workoutNotes, workoutDate, selectedMuscleId]);

  const handleFinishWorkout = () => {
    const hasAnySets = (activeExercises || []).some((ex) =>
      (ex.sets || []).some((s) => s && (s.weight > 0 || s.reps > 0))
    );

    if (!hasAnySets) {
      alert("Registrá al menos una serie para guardar el entrenamiento.");
      return;
    }

    if (baseRoutine) {
      setSaveToPermanentRoutine(hasRoutineChanges);
      setIsFinishConfirmOpen(true);
    } else {
      executeFinishWorkout(false);
    }
  };

  const executeFinishWorkout = async (shouldSavePermanent = false) => {
    const payloadSets = [];
    const safeExercises = Array.isArray(activeExercises)
      ? activeExercises
      : activeExercises && typeof activeExercises === "object"
      ? Object.values(activeExercises)
      : [];
    safeExercises.forEach((ex) => {
      if (!ex) return;
      const safeSets = Array.isArray(ex.sets)
        ? ex.sets
        : ex.sets && typeof ex.sets === "object"
        ? Object.values(ex.sets)
        : [];
      safeSets.forEach((s, idx) => {
        if (s && (s.weight > 0 || s.reps > 0)) {
          payloadSets.push({
            id: s.id,
            exercise_id: ex.exerciseId,
            set_number: idx + 1,
            weight: parseFloat(s.weight) || 0.0,
            reps: parseInt(s.reps, 10) || 0,
            completed: true,
            set_type: s.set_type || "normal",
            rest_effort: s.rest_effort || s.technique || null,
          });
        }
      });
    });

    if (payloadSets.length === 0) {
      alert("Registrá al menos una serie para guardar el entrenamiento.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      // Guardar cambios en la rutina permanente si el usuario lo marcó
      if (shouldSavePermanent && baseRoutine?.id && isOnline()) {
        try {
          const exercisesPayload = (activeExercises || []).map((ae, idx) => ({
            exercise_id: ae.exerciseId,
            order_index: idx,
            target_sets: Array.isArray(ae.sets) && ae.sets.length > 0 ? ae.sets.length : 4,
            target_reps: "8-12",
          }));
          await updateRoutineExercises(baseRoutine.id, exercisesPayload);
        } catch (rErr) {
          console.warn("No se pudo actualizar la rutina permanente:", rErr);
        }
      }

      const rawStarted = localStorage.getItem(sessionStartedKey) || localStorage.getItem(SESSION_STARTED_AT_KEY);
      const startedMs = rawStarted ? parseInt(rawStarted, 10) : sessionStartedAt;
      const durationSeconds = startedMs ? Math.max(1, Math.floor((Date.now() - startedMs) / 1000)) : 0;

      const isHeavyDutySession = safeExercises.some(
        (ex) =>
          ex?.isHeavyDuty ||
          (ex?.sets || []).some(
            (s) => s?.set_type === "heavy_duty" || s?.technique || s?.rest_effort
          )
      ) || Boolean(workoutNotes && workoutNotes.toLowerCase().includes("heavy duty"));

      const finalNotes = isHeavyDutySession
        ? (workoutNotes && workoutNotes.includes("[Heavy Duty]")
            ? workoutNotes.trim()
            : (workoutNotes ? `[Heavy Duty] ${workoutNotes.trim()}` : "[Heavy Duty]"))
        : (workoutNotes.trim() || null);

      const finishDataPayload = {
        date: workoutDate,
        notes: finalNotes,
        sport_type: isHeavyDutySession ? "heavy_duty" : "strength",
        duration_seconds: durationSeconds,
      };

      let saved = null;
      let isOfflineSaved = false;

      if (isOnline()) {
        try {
          if (activeSessionId) {
            saved = await finishWorkout(activeSessionId, finishDataPayload);
          } else {
            saved = await saveWorkout({
              date: workoutDate,
              muscle_group_id: selectedMuscleId,
              sets: payloadSets,
              ...finishDataPayload,
            });
          }
        } catch (err) {
          if (!err.response || err.code === "ERR_NETWORK" || err.message?.includes("Network")) {
            isOfflineSaved = true;
          } else {
            throw err;
          }
        }
      } else {
        isOfflineSaved = true;
      }

      if (isOfflineSaved) {
        if (activeSessionId && !String(activeSessionId).startsWith("offline_") && !String(activeSessionId).startsWith("temp_")) {
          enqueueSyncAction({
            type: "FINISH_WORKOUT",
            payload: {
              workoutId: activeSessionId,
              finishData: finishDataPayload,
            },
          });
        } else {
          enqueueSyncAction({
            type: "SAVE_WORKOUT",
            payload: {
              date: workoutDate,
              muscle_group_id: selectedMuscleId,
              sets: payloadSets,
              ...finishDataPayload,
            },
          });
        }
        saved = {
          id: activeSessionId || `offline_${Date.now()}`,
          date: workoutDate,
          duration_seconds: durationSeconds,
        };
      }

      const analytics = analyzeWorkoutSession(activeExercises, {
        recordsMap,
        records: saved?.records || records,
        previous_history: saved?.previous_history || {},
      });

      setCompletedSummary({
        ...analytics,
        id: saved?.id,
        date: saved?.date || workoutDate,
        duration_seconds: durationSeconds,
        durationSeconds: durationSeconds,
        totalVolumeKg: analytics.totalVolumeKg || saved?.total_volume || totalVolume,
        total_volume: analytics.totalVolumeKg || saved?.total_volume || totalVolume,
        prsBroken: saved?.broken_records || analytics.prsBroken || [],
        pr_count: saved?.pr_count ?? analytics.prsBroken?.length ?? 0,
        activeExercises: activeExercises,
        exercises: activeExercises,
        isOfflineSaved,
      });

      if (isOnline()) {
        try {
          const updatedRecords = saved?.records || (await getRecords());
          const safeUpdated = Array.isArray(updatedRecords)
            ? updatedRecords
            : updatedRecords && typeof updatedRecords === "object"
            ? Object.values(updatedRecords)
            : [];
          setRecords(safeUpdated);
        } catch (e) {}
      }

      try {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(sessionStartedKey);
        localStorage.removeItem(SESSION_STARTED_AT_KEY);
        setSessionStartedAt(null);
        setLiveTimerText("");
        window.dispatchEvent(new CustomEvent("fittracker:sessionTimerChanged", { detail: { startedAt: null } }));
      } catch (e) {}

      setActiveSessionId(null);
      setActiveExercises([]);
      setActiveExerciseIndex(0);
      setWorkoutNotes("");
      setFocusExercise(null);
      setSecondExercise(null);
      setActiveSlot("A");
      setBaseRoutine(null);
      setSaveToPermanentRoutine(false);
      setIsFinishConfirmOpen(false);
    } catch (err) {
      console.error("Error guardando entrenamiento:", err);
      setErrorMessage(
        err.response?.data?.detail || "Error al guardar el entrenamiento."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardWorkout = async () => {
    if (
      totalSetsCount > 0 &&
      !window.confirm(
        "¿Seguro que querés descartar el entrenamiento actual? Se borrarán las series registradas."
      )
    ) {
      return;
    }
    if (activeSessionId) {
      try {
        await deleteWorkout(activeSessionId);
      } catch (err) {
        console.error("Error eliminando sesión activa:", err);
      }
    }
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(sessionStartedKey);
      localStorage.removeItem(SESSION_STARTED_AT_KEY);
      setSessionStartedAt(null);
      setLiveTimerText("");
      window.dispatchEvent(new CustomEvent("fittracker:sessionTimerChanged", { detail: { startedAt: null } }));
    } catch (e) {}
    setActiveSessionId(null);
    setActiveExercises([]);
    setActiveExerciseIndex(0);
    setWorkoutNotes("");
    setFocusExercise(null);
    setSecondExercise(null);
    setActiveSlot("A");
  };

  // -------------------------------------------------------------
  // 6. RETORNOS CONDICIONALES (SOLO DESPUÉS DE TODOS LOS HOOKS)
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-[#FF5722]">
        <Loader2 size={36} className="animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-[#A1A1AA]">
          Cargando FitTracker...
        </p>
      </div>
    );
  }

  // PANTALLA DE MODO FOCO DE EJERCICIO
  if (focusExercise) {
    const safeActiveExercises = Array.isArray(activeExercises) ? activeExercises : [];
    const activeExItem = safeActiveExercises.find(
      (ae) => ae.exerciseId === focusExercise.id
    );
    const secondExItem = secondExercise
      ? safeActiveExercises.find((ae) => ae.exerciseId === secondExercise.id)
      : null;

    return (
      <ExerciseLogger
        exercise={focusExercise}
        equipment={getExerciseEquipment(focusExercise?.name || "")}
        sets={activeExItem?.sets || []}
        onAddSet={handleAddSet}
        onRemoveSet={handleRemoveSet}
        onExitFocus={() => setFocusExercise(null)}
        secondExercise={secondExercise}
        secondSets={secondExItem?.sets || []}
        activeSlot={activeSlot}
        onSwitchSlot={setActiveSlot}
        onSelectSecondExercise={(sec) => {
          setSecondExercise(sec);
          setActiveExercises((prev) => {
            const prevList = Array.isArray(prev) ? prev : [];
            if (prevList.some((ae) => ae.exerciseId === sec?.id)) return prevList;
            const next = [
              ...prevList,
              {
                exerciseId: sec?.id,
                exerciseName: sec?.name || "Ejercicio",
                muscleGroupId: sec?.muscle_group_id,
                sets: [],
              },
            ];
            saveToLocalStorage(activeSessionIdRef.current, next, workoutNotes, workoutDate, selectedMuscleId);
            return next;
          });
        }}
        onRemoveSecondExercise={() => {
          setSecondExercise(null);
          setActiveSlot("A");
        }}
        onReplaceExercise={handleReplaceExercise}
        allAvailableExercises={allExercises}
        muscleGroups={muscleGroups}
        recordsMap={recordsMap}
        periodizationMode={periodizationMode}
        isHeavyDuty={Boolean(
          focusExercise?.isHeavyDuty ||
          focusExercise?.is_heavy_duty ||
          activeExItem?.isHeavyDuty ||
          isCurrentHeavyDuty
        )}
      />
    );
  }

  // VISTA PRINCIPAL: FLUJO DE SELECCIÓN EN 3 PASOS
  return (
    <div
      className={`w-full max-w-md sm:max-w-3xl mx-auto space-y-4 px-1 sm:px-0 select-none ${
        hasActiveWorkout
          ? "pb-[calc(10rem+env(safe-area-inset-bottom,0px))] sm:pb-28"
          : "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-12"
      }`}
    >
      <WorkoutHeader
        dateText={formattedToday}
        timerText={liveTimerText}
        isDeviceOnline={isDeviceOnline}
        isUsingOfflineCache={isUsingOfflineCache}
        hasSets={totalSetsCount > 0}
        onDiscard={handleDiscardWorkout}
        cycleStatus={cycleStatus}
      />


      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-200">
          {errorMessage}
        </div>
      )}

      {/* Motor Biométrico de Recuperación Heavy Duty */}
      <HeavyDutyRecoveryBanner
        recoveryStatus={heavyDutyRecovery}
        muscleTracker={muscleRecovery}
        compact={hasActiveWorkout}
        onStartRoutine={() => navigate("/routines")}
      />

      {/* SECCIÓN: ENTRENAMIENTO ACTIVO */}
      {activeExercises.length > 0 && (
        <div
          ref={activeWorkoutRef}
          className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-4 sm:p-5 space-y-3.5 transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2C2E] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#FF5722] animate-pulse" />
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Entrenamiento Activo
                </h2>
                <p className="text-xs text-[#8E8E93]">
                  {activeExercises.length} {activeExercises.length === 1 ? "ejercicio" : "ejercicios"} listos • {totalSetsCount} series registradas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFinishWorkout}
                disabled={isSaving}
                className="flex-1 sm:flex-none min-h-[40px] px-3.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin text-white" />
                ) : (
                  <Trophy size={14} />
                )}
                <span>Terminar ({totalSetsCount})</span>
              </button>

              <button
                type="button"
                onClick={handleDiscardWorkout}
                className="min-h-[40px] px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs flex items-center justify-center gap-1 active:scale-95 transition"
                title="Descartar sesión"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {(activeExercises || []).map((ae, index) => {
              const fullEx = (allExercises || []).find((e) => e.id === ae.exerciseId) || {
                id: ae.exerciseId,
                name: ae.exerciseName,
                muscle_group_id: ae.muscleGroupId,
              };
              const rec = recordsMap[ae.exerciseId];
              const completedSets = (ae.sets || []).filter((s) => s?.completed !== false);
              const hasSets = completedSets.length > 0;

              return (
                <div
                  key={ae.exerciseId || index}
                  onClick={() => handleSelectExercise(fullEx, index)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99] ${
                    hasSets
                      ? "border-[#FF5722]/30 bg-[#1C1C1E]"
                      : "border-[#2C2C2E] bg-[#1C1C1E] hover:border-white/20 hover:bg-[#252528]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                        {ae.exerciseName}
                      </h3>
                      {hasSets ? (
                        <span className="rounded-full border border-[#FF5722]/40 bg-[#FF5722]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#FF5722]">
                          ✓ {completedSets.length} {completedSets.length === 1 ? "serie" : "series"}
                        </span>
                      ) : (
                        <span className="rounded-full border border-[#2C2C2E] bg-[#121212] px-2 py-0.5 text-[10px] font-medium text-[#8E8E93]">
                          0 series • Listo
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-[#8E8E93] flex-wrap">
                      <span className="uppercase font-medium text-[10px]">
                        {getExerciseEquipment(ae.exerciseName, ae.exerciseId)}
                      </span>
                      {rec?.pr_weight && (
                        <span>• PR: <strong className="text-white">{rec.pr_weight}kg × {rec.pr_reps}</strong></span>
                      )}
                      {hasSets && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#FF8A65] font-semibold flex-wrap">
                          <span>•</span>
                          {(completedSets || []).map((s, sIdx) => (
                            <span key={s.id || sIdx} className="bg-[#121212] border border-[#2C2C2E] px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                              <span>{s.weight}k×{s.reps}</span>
                              {s.is_offline && (
                                <span className="text-amber-400 text-[9px]" title="Guardado local (offline)">💾</span>
                              )}
                            </span>
                          ))}
                          {completedSets.some((s) => s.is_offline) && (
                            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 font-medium inline-flex items-center gap-1">
                              💾 Guardado local (offline)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplacingExercise({ exercise: ae, index });
                      }}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-[#2C2C2E] bg-[#121212] hover:border-[#FF5722]/50 hover:bg-[#252528] text-white font-medium text-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                      title="Sustituir por otro ejercicio del catálogo"
                    >
                      <RefreshCw size={13} className="text-[#FF5722]" />
                      <span>Cambiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveExerciseFromSession(ae.exerciseId);
                      }}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer"
                      title="Quitar este ejercicio de la sesión de hoy"
                    >
                      <X size={13} />
                      <span>Quitar</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectExercise(fullEx, index);
                      }}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 text-white font-semibold text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer shadow-sm"
                    >
                      <span>{hasSets ? "Continuar" : "Entrenar"}</span>
                      <ChevronRight size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTÓN AL FINAL DE LA SESIÓN: AGREGAR EJERCICIO */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsAddExerciseModalOpen(true)}
              className="w-full min-h-[50px] py-3.5 px-4 rounded-2xl border border-dashed border-[#FF5722]/40 bg-[#FF5722]/5 hover:bg-[#FF5722]/10 hover:border-[#FF5722] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer shadow-sm"
            >
              <Plus size={18} className="text-[#FF5722]" strokeWidth={2.5} />
              <span>＋ Agregar Ejercicio a la sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* PASO 1: SELECTOR DE MÚSCULO */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-[11px] font-bold text-white">
            1
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
            Paso 1: Selector de Músculo
          </h2>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {(muscleGroups || []).map((group) => {
            const isSelected = selectedMuscleId === group?.id;
            const MuscleIcon = getMuscleIcon(group?.name || "");

            return (
              <button
                key={group?.id || Math.random()}
                type="button"
                onClick={() => {
                  setSelectedMuscleId(group?.id);
                  setExerciseSearch("");
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center transition active:scale-95 min-h-[90px] ${
                  isSelected
                    ? "border border-[#FF5722] bg-[#FF5722]/15 text-white font-semibold shadow-lg shadow-[#FF5722]/10"
                    : "border border-[#2C2C2E] bg-[#1C1C1E] text-[#8E8E93] hover:border-white/20 hover:text-white font-medium"
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                    isSelected
                      ? "bg-[#FF5722] text-white font-bold shadow-md shadow-[#FF5722]/20"
                      : "bg-[#121212] border border-[#2C2C2E] text-[#FF5722]"
                  }`}
                >
                  <MuscleIcon size={22} />
                </div>
                <span className="text-xs font-semibold tracking-tight leading-tight truncate max-w-full">
                  {group?.name || "Músculo"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PASO 2: SELECTOR DE EQUIPAMIENTO */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-[11px] font-bold text-white">
            2
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
            Paso 2: Selector de Equipamiento
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {["Barra", "Mancuerna", "Polea", "Máquina"].map((eq) => {
            const isSelected = equipmentFilter === eq;
            return (
              <button
                key={eq}
                type="button"
                onClick={() => setEquipmentFilter(eq)}
                className={`min-h-[48px] rounded-2xl text-xs transition active:scale-95 flex items-center justify-center font-medium ${
                  isSelected
                    ? "border border-[#FF5722] bg-[#FF5722]/10 text-white font-semibold"
                    : "border border-[#2C2C2E] bg-[#1C1C1E] text-[#8E8E93] hover:border-white/20 hover:text-white"
                }`}
              >
                {eq}
              </button>
            );
          })}
        </div>
      </div>

      {/* PASO 3: SELECTOR DEL EJERCICIO ESPECÍFICO */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-[11px] font-bold text-white">
              3
            </span>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
              Paso 3: Selector de Ejercicio ({(filteredExercises || []).length})
            </h2>
          </div>
          {currentMuscle && (
            <span className="text-[11px] font-semibold text-[#FF5722]">
              {currentMuscle?.name || "Músculo"} • {equipmentFilter}
            </span>
          )}
        </div>

        {/* Buscador Rápido y Botón Crear Ejercicio */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="🔍 Buscar ejercicio en esta categoría..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="w-full min-h-[44px] rounded-2xl border border-white/10 bg-[#1C1C1E] px-3.5 text-xs font-medium text-white placeholder:text-[#8E8E93] outline-none transition focus:border-[#FF5722]"
            />
            {exerciseSearch && (
              <button
                type="button"
                onClick={() => setExerciseSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8E8E93] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setNewExerciseMuscleId(selectedMuscleId);
              setNewExerciseEquipment(equipmentFilter || "Barra");
              setNewExerciseName(exerciseSearch.trim() || "");
              setCreateExerciseError("");
              setIsCreateModalOpen(true);
            }}
            className="min-h-[44px] px-4 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition flex-shrink-0"
            title="Crear un ejercicio personalizado que no esté en la lista"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>＋ Crear Ejercicio Personalizado</span>
          </button>
        </div>

        {/* Lista de ejercicios disponibles */}
        <div className="space-y-2">
          {(filteredExercises || []).map((ex) => {
            const rec = recordsMap[ex?.id];
            const activeSets = (activeExercises || []).find((ae) => ae.exerciseId === ex?.id)?.sets || [];

            return (
              <button
                key={ex?.id || Math.random()}
                type="button"
                onClick={() => handleSelectExercise(ex)}
                className="w-full text-left p-3.5 sm:p-4 rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] hover:border-white/20 hover:bg-[#252528] transition flex items-center justify-between gap-3 active:scale-[0.98]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                      {ex?.name || "Ejercicio"}
                    </p>
                    {activeSets.length > 0 && (
                      <span className="rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF5722]">
                        {activeSets.length} series
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8E8E93]">
                    <span className="uppercase font-semibold text-[#8E8E93]">{getExerciseEquipment(ex?.name || "", ex?.id)}</span>
                    {rec?.pr_weight && (
                      <span className="text-[#8E8E93] font-medium">• PR: {rec.pr_weight}kg × {rec.pr_reps}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 text-white px-3.5 py-2 text-xs font-semibold flex items-center gap-1">
                    <span>Entrenar</span>
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </span>
                </div>
              </button>
            );
          })}

          {(filteredExercises || []).length > 0 && (
            <div className="pt-3">
              <button
                type="button"
                onClick={() => {
                  setNewExerciseMuscleId(selectedMuscleId);
                  setNewExerciseEquipment(equipmentFilter || "Barra");
                  setNewExerciseName(exerciseSearch.trim() || "");
                  setCreateExerciseError("");
                  setIsCreateModalOpen(true);
                }}
                className="w-full min-h-[52px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 text-white font-semibold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-98 transition select-none"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>+ Crear Ejercicio Personalizado</span>
              </button>
            </div>
          )}

          {(filteredExercises || []).length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#1C1C1E] p-8 text-center space-y-3">
              <Dumbbell size={32} className="mx-auto text-[#8E8E93]" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-white">
                  No hay ejercicios para {currentMuscle?.name || "este músculo"} con {equipmentFilter}.
                </p>
                <p className="text-[11px] text-[#8E8E93] mt-0.5">
                  Podés agregar esta variante ahora mismo o cambiar de equipamiento.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setNewExerciseMuscleId(selectedMuscleId);
                    setNewExerciseEquipment(equipmentFilter || "Barra");
                    setNewExerciseName(exerciseSearch.trim() || "");
                    setCreateExerciseError("");
                    setIsCreateModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Crear "{exerciseSearch || 'Nuevo Ejercicio'}" ahora</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEquipmentFilter("Barra");
                    setExerciseSearch("");
                  }}
                  className="text-xs font-semibold text-[#FF5722] hover:underline px-3 py-2"
                >
                  Restablecer filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mini-Modal: Crear Ejercicio Personalizado */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveAndSelectCustomExercise}
            className="w-full max-w-lg bg-[#121212] border border-[#2C2C2E] rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[88dvh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
          >
            <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between bg-[#121212] flex-shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#FF5722]">
                  <span>✨ Personalizado</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1 truncate">
                  ＋ Crear Ejercicio Personalizado
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white transition active:scale-95 cursor-pointer flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto overscroll-contain flex-1">
              {createExerciseError && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300">
                  {createExerciseError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] block">
                  Nombre del ejercicio <span className="text-[#FF5722]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sentadilla Goblet talones elevados"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  className="w-full min-h-[48px] rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:text-[#636366] focus:border-[#FF5722]"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] block">
                  Equipamiento:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {["Barra", "Mancuerna", "Polea", "Máquina"].map((eq) => {
                    const isSelected = newExerciseEquipment === eq;
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => setNewExerciseEquipment(eq)}
                        className={`min-h-[42px] px-2 py-1.5 rounded-xl text-xs transition active:scale-95 flex items-center justify-center text-center leading-tight font-medium cursor-pointer ${
                          isSelected
                            ? "border border-[#FF5722] bg-[#FF5722]/10 text-white font-semibold"
                            : "border border-white/5 bg-[#1C1C1E] text-[#8E8E93] hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {eq}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] block">
                  Grupo Muscular:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(muscleGroups || []).map((g) => {
                    const isSelected = (newExerciseMuscleId || selectedMuscleId) === g.id;
                    return (
                      <button
                        key={g?.id || Math.random()}
                        type="button"
                        onClick={() => setNewExerciseMuscleId(g?.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                            : "border border-white/5 bg-[#1C1C1E] text-[#8E8E93] hover:border-white/20 hover:text-white font-medium"
                        }`}
                      >
                        <span>{g?.name || "Músculo"}</span>
                        {isSelected && <Check size={13} strokeWidth={2.5} className="text-[#FF5722]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#2C2C2E] bg-[#121212] flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 sm:px-5 py-3.5 rounded-2xl bg-[#1C1C1E] border border-white/5 text-sm font-semibold text-[#8E8E93] hover:text-white transition active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreatingExercise || !newExerciseName.trim()}
                className="flex-1 bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white py-3.5 rounded-2xl font-semibold shadow-none hover:opacity-95 transition active:scale-95 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
              >
                {isCreatingExercise ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Guardando ejercicio...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Guardar Ejercicio</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BOTÓN GLOBAL DE TERMINAR ENTRENAMIENTO */}
      {hasActiveWorkout && (
        <div className="fixed inset-x-0 z-40 active-workout-banner bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 p-2.5 sm:p-3.5 bg-[#000000]/95 backdrop-blur-xl border-t border-white/10">
          <div className="w-full max-w-md sm:max-w-3xl mx-auto flex flex-row items-center justify-between gap-2.5 sm:gap-4">
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-[#FF5722] uppercase tracking-wider">
                <span className="inline-block h-2 w-2 rounded-full bg-[#FF5722] animate-pulse flex-shrink-0" />
                <span className="truncate">Entrenamiento Activo</span>
                {liveTimerText && (
                  <span className="ml-1 text-white font-mono text-[11px] font-bold">
                    {liveTimerText}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-[#8E8E93] truncate mt-0.5">
                {(activeExercises || []).filter((e) => (e?.sets || []).length > 0).length} ejerc. • {totalSetsCount} series • {Math.round(totalVolume)} kg
              </p>
            </div>

            <button
              type="button"
              onClick={handleFinishWorkout}
              disabled={isSaving}
              className="px-3 sm:px-4 py-2 sm:py-2.5 min-h-[40px] sm:min-h-[44px] rounded-2xl font-semibold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 transition flex-shrink-0 select-none bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin text-white flex-shrink-0" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Trophy size={15} className="text-white flex-shrink-0" />
                  <span className="inline sm:hidden">Terminar</span>
                  <span className="hidden sm:inline">Terminar Entrenamiento</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Ejercicio de la sesión */}
      <ExerciseSelectorModal
        isOpen={Boolean(replacingExercise)}
        onClose={() => setReplacingExercise(null)}
        title="🔄 Cambiar Ejercicio"
        subtitle={
          replacingExercise
            ? `Sustituyendo: ${replacingExercise.exercise?.exerciseName}`
            : ""
        }
        initialMuscleId={replacingExercise?.exercise?.muscleGroupId}
        allExercises={allExercises}
        muscleGroups={muscleGroups}
        recordsMap={recordsMap}
        onSelect={(newEx) => {
          if (replacingExercise) {
            handleReplaceExerciseInSession(replacingExercise.exercise.exerciseId, newEx);
          }
        }}
        onCreateCustom={() => {
          setNewExerciseMuscleId(replacingExercise?.exercise?.muscleGroupId || selectedMuscleId);
          setNewExerciseEquipment("Barra");
          setNewExerciseName("");
          setCreateExerciseError("");
          setIsCreateModalOpen(true);
        }}
      />

      {/* Modal: Agregar Ejercicio a la sesión */}
      <ExerciseSelectorModal
        isOpen={isAddExerciseModalOpen}
        onClose={() => setIsAddExerciseModalOpen(false)}
        title="＋ Agregar Ejercicio a la Sesión"
        subtitle="Selecciona cualquier ejercicio del catálogo para sumarlo a hoy"
        initialMuscleId={selectedMuscleId}
        allExercises={allExercises}
        muscleGroups={muscleGroups}
        recordsMap={recordsMap}
        onSelect={handleAddExerciseToSession}
        onCreateCustom={() => {
          setNewExerciseMuscleId(selectedMuscleId);
          setNewExerciseEquipment("Barra");
          setNewExerciseName("");
          setCreateExerciseError("");
          setIsCreateModalOpen(true);
        }}
      />

      {/* Modal de Confirmación para Finalizar con Rutina Permanente */}
      {isFinishConfirmOpen && (
        <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-md bg-[#121212] border border-[#2C2C2E] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white">
                  <Trophy size={16} />
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Finalizar Entrenamiento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFinishConfirmOpen(false)}
                className="p-1.5 rounded-xl bg-[#1C1C1E] text-[#8E8E93] hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-[#8E8E93]">
                Vas a finalizar la sesión con <strong className="text-white">{totalSetsCount} series</strong> registradas y un volumen total de <strong className="text-white">{Math.round(totalVolume)} kg</strong>.
              </p>

              {baseRoutine && (
                <div className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-[#8E8E93] font-semibold">
                      Rutina Base:
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[200px]">
                      {baseRoutine.name}
                    </span>
                  </div>

                  {hasRoutineChanges ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-400/10 px-2.5 py-1.5 rounded-xl border border-amber-400/20 font-medium leading-snug">
                      <span>⚡ Modificaste ejercicios en vivo respecto a tu rutina base.</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-xl border border-emerald-400/20 font-medium">
                      <span>✓ Mismos ejercicios que la plantilla original.</span>
                    </div>
                  )}

                  <label className="flex items-start gap-3 pt-2 cursor-pointer border-t border-[#2C2C2E]/60 select-none">
                    <input
                      type="checkbox"
                      checked={saveToPermanentRoutine}
                      onChange={(e) => setSaveToPermanentRoutine(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[#2C2C2E] bg-[#121212] text-[#FF5722] focus:ring-0 cursor-pointer accent-[#FF5722]"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-white block">
                        Guardar estos cambios en mi rutina permanente
                      </span>
                      <span className="text-[11px] text-[#8E8E93] block mt-0.5 leading-tight">
                        Actualiza la lista de ejercicios de "{baseRoutine.name}" en tu catálogo con los cambios de hoy.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFinishConfirmOpen(false)}
                className="flex-1 min-h-[44px] rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] text-white font-semibold text-xs hover:bg-[#252528] active:scale-95 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => executeFinishWorkout(saveToPermanentRoutine)}
                className="flex-1 min-h-[44px] rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg shadow-[#FF5722]/20 cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <Trophy size={16} />
                )}
                <span>Finalizar y Guardar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Celebration Modal */}
      <WorkoutSummaryModal
        isOpen={Boolean(completedSummary)}
        onClose={() => setCompletedSummary(null)}
        date={completedSummary?.date}
        summary={completedSummary}
        isOfflineSaved={completedSummary?.isOfflineSaved}
      />
    </div>
  );
}
