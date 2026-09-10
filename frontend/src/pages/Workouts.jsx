import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Flame,
  Layers,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Scale,
  Swords,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  Wifi,
  WifiOff,
  CloudOff,
  X,
  Zap,
} from "lucide-react";
import {
  addWorkoutSet,
  deleteWorkout,
  deleteWorkoutSet,
  finishWorkout,
  getActiveWorkout,
  getContextualTips,
  getExercisePreviousSession,
  getExercises,
  getMuscleGroups,
  getProfile,
  getRecords,
  getUserProfile,
  saveWorkout,
  startWorkout,
  updateWorkoutDate,
  updateWorkoutReadiness,
  updateWorkoutSet,
} from "../api/client";
import RestTimerModal from "../components/RestTimerModal";
import { getLocalDateString, formatDateLong, formatDateSafe, parseDateSafe } from "../utils/dateUtils";
import { enqueueSyncAction, getPendingQueue, isOnline, processSyncQueue } from "../utils/syncQueue";


// Helper for muscle icon
function getMuscleIcon(name = "") {
  const n = (name || "").toLowerCase();
  if (n.includes("pecho")) return Flame;
  if (n.includes("espalda")) return Layers;
  if (n.includes("pierna") || n.includes("cuádriceps") || n.includes("femoral")) return Zap;
  if (n.includes("hombro")) return Target;
  if (n.includes("brazo") || n.includes("bíceps") || n.includes("tríceps"))
    return Dumbbell;
  if (n.includes("core") || n.includes("abs") || n.includes("abdomen")) return Activity;
  return Dumbbell;
}

// Classifier for equipment filter chips: [Todos | Barra | Mancuerna | Polea | Máquina]
export function getExerciseEquipment(name = "") {
  const n = (name || "").toLowerCase();
  if (n.includes("mancuerna") || n.includes("goblet") || n.includes("zancadas")) return "Mancuerna";
  if (
    n.includes("polea") ||
    n.includes("jalón") ||
    n.includes("jalon") ||
    n.includes("cruce") ||
    n.includes("cruces") ||
    n.includes("face pull") ||
    n.includes("leñador") ||
    n.includes("woodchopper")
  ) {
    return "Polea";
  }
  if (
    n.includes("barra") ||
    n.includes("disco") ||
    n.includes("svend") ||
    n.includes("press banca") ||
    n.includes("peso muerto") ||
    n.includes("sentadilla trasera") ||
    n.includes("sentadilla frontal") ||
    n.includes("hip thrust con barra") ||
    n.includes("lastradas")
  ) {
    return "Barra";
  }
  if (
    n.includes("máquina") ||
    n.includes("maquina") ||
    n.includes("smith") ||
    n.includes("prensa") ||
    n.includes("hack") ||
    n.includes("peck deck") ||
    n.includes("banco") ||
    n.includes("paralela") ||
    n.includes("paralelas") ||
    n.includes("fondos") ||
    n.includes("dominadas") ||
    n.includes("colgado") ||
    n.includes("plancha") ||
    n.includes("wheel") ||
    n.includes("rueda") ||
    n.includes("dead bug") ||
    n.includes("vacío") ||
    n.includes("vacio") ||
    n.includes("crunch") ||
    n.includes("flexiones") ||
    n.includes("abductor") ||
    n.includes("abductores") ||
    n.includes("aductor") ||
    n.includes("aductores") ||
    n.includes("talones") ||
    n.includes("gemelos")
  ) {
    return "Máquina";
  }
  return "Máquina";
}

// Real-time hypertrophy progression analyzer
function getProgressionBadge(currentSet, prevSet) {
  if (!prevSet) {
    return {
      type: "new",
      label: "★ Nueva serie",
      className: "text-[#C084FC] border-[#C084FC]/30 bg-[#C084FC]/10",
    };
  }

  const curW = parseFloat(currentSet.weight);
  const curR = parseInt(currentSet.reps, 10);
  const prevW = parseFloat(prevSet.weight);
  const prevR = parseInt(prevSet.reps, 10);

  if (isNaN(curW) || isNaN(curR) || (curW === 0 && curR === 0)) {
    return null;
  }

  const diffW = +(curW - prevW).toFixed(1);
  const diffR = curR - prevR;

  // 1. Same weight, more reps (Pure Hypertrophy progressive overload)
  if (diffW === 0 && diffR > 0) {
    return {
      type: "reps",
      label: `↑ +${diffR} reps (Hipertrofia)`,
      className: "text-[#34D399] border-[#34D399]/40 bg-[#34D399]/15 shadow-sm font-black",
    };
  }

  // 2. More weight and more reps
  if (diffW > 0 && diffR > 0) {
    return {
      type: "both",
      label: `↑ +${diffW}kg / +${diffR} reps`,
      className: "text-[#34D399] border-[#34D399]/40 bg-[#34D399]/15 shadow-sm font-black",
    };
  }

  // 3. More weight (even if reps are equal or slightly fewer)
  if (diffW > 0) {
    return {
      type: "weight",
      label: `↑ +${diffW} kg`,
      className: "text-[#34D399] border-[#34D399]/40 bg-[#34D399]/15 font-black",
    };
  }

  // 4. Maintained exact weight and reps
  if (diffW === 0 && diffR === 0) {
    return {
      type: "equal",
      label: "✓ Carga consolidada",
      className: "text-[#C084FC] border-[#C084FC]/40 bg-[#C084FC]/10 font-bold",
    };
  }

  // 5. Weight or reps decreased
  return {
    type: "deload",
    label: "↓ Control / Descarga",
    className: "text-[#A1A1AA] border-[#2D1B4E] bg-[#140E24] font-medium",
  };
}

// Exercise Volume (Tonaje) stats calculator
function getExerciseVolumeStats(activeExercise, prevSession) {
  const currentVolume = activeExercise.sets.reduce((sum, s) => {
    const w = parseFloat(s.weight) || 0;
    const r = parseInt(s.reps, 10) || 0;
    return sum + w * r;
  }, 0);

  const prevVolume = prevSession?.total_volume || 0;
  const hasPrev = Boolean(prevSession && prevVolume > 0);
  const diffVolume = currentVolume - prevVolume;
  const percentDiff =
    prevVolume > 0 ? Math.round((diffVolume / prevVolume) * 100) : 0;

  return {
    currentVolume,
    prevVolume,
    hasPrev,
    diffVolume,
    percentDiff,
  };
}

/**
 * Computes estimated 1RM using the Epley formula:
 * 1RM = Weight * (1 + Reps / 30)
 */
export function calculateEstimated1RM(weight, reps) {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps, 10) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

/**
 * Returns advice badge, relative strength ratio, and estimated 1RM
 * based on training_goal, weight, reps, and bodyweight.
 */
export function getLoadAdvisor({ weight, reps, trainingGoal = "hipertrofia", bodyweight = 70, prWeight = null }) {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps, 10) || 0;
  const bw = parseFloat(bodyweight) || 70;

  if (w <= 0 && r <= 0) return null;

  const est1RM = calculateEstimated1RM(w, r);
  const relativeRatio = bw > 0 && w > 0 ? (w / bw).toFixed(2) : null;

  let badge = null;

  switch (trainingGoal) {
    case "fuerza":
      if (r >= 1 && r <= 5) {
        badge = {
          label: "💥 Estímulo de Fuerza pura",
          sublabel: ">85% 1RM • Tensión mecánica máxima",
          className: "border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
        };
      } else if (r >= 6 && r <= 8) {
        badge = {
          label: "⚡ Carga de transición (6-8 reps)",
          sublabel: "Fuerza submáxima / Hipertrofia",
          className: "border-purple-500/40 bg-purple-500/15 text-[#C084FC]",
        };
      } else if (r > 8) {
        badge = {
          label: "ℹ️ Carga accesoria (>8 reps)",
          sublabel: "Para fuerza pura, apuntá a 1-5 reps",
          className: "border-zinc-700 bg-zinc-900/80 text-zinc-400",
        };
      }
      break;

    case "potencia_rapidez":
      const isMediumLoad = (prWeight && prWeight > 0 && w >= prWeight * 0.38 && w <= prWeight * 0.65) || (r >= 3 && r <= 6);
      if (isMediumLoad) {
        badge = {
          label: "⚡ Estímulo de Potencia y Velocidad",
          sublabel: "40-60% 1RM • Mover a máxima aceleración",
          className: "border-cyan-500/50 bg-cyan-500/15 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]",
        };
      } else if (r > 6) {
        badge = {
          label: "⚡ Ajustar a 3-6 reps explosivas",
          sublabel: "40-60% con velocidad máxima",
          className: "border-blue-500/40 bg-blue-500/15 text-blue-300",
        };
      } else {
        badge = {
          label: "⚡ Estímulo de Potencia",
          sublabel: "Aceleración concéntrica explosiva",
          className: "border-cyan-500/50 bg-cyan-500/15 text-cyan-300",
        };
      }
      break;

    case "definicion_adelgazar":
      if (r >= 4 && r <= 12) {
        badge = {
          label: "🛡️ Carga protectora de masa",
          sublabel: "Tensión alta para retener músculo en déficit",
          className: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
        };
      } else if (r > 12) {
        badge = {
          label: "🛡️ Carga ligera (>12 reps)",
          sublabel: "Priorizá cargas pesadas para proteger masa",
          className: "border-amber-500/40 bg-amber-500/15 text-amber-300",
        };
      } else {
        badge = {
          label: "🛡️ Carga protectora de masa",
          sublabel: "Alta intensidad para retención muscular",
          className: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
        };
      }
      break;

    case "hipertrofia":
    default:
      if (r >= 8 && r <= 12) {
        badge = {
          label: "⚡ En rango de Hipertrofia óptimo",
          sublabel: "8-12 reps • 65-80% 1RM • RPE 7-9",
          className: "border-[#A855F7]/60 bg-[#9333EA]/20 text-[#C084FC] shadow-neon",
        };
      } else if (r >= 5 && r < 8) {
        badge = {
          label: "💥 Rango de Fuerza-Tensión (5-7 reps)",
          sublabel: "Excelente tensión mecánica para hipertrofia",
          className: "border-purple-400/40 bg-purple-500/15 text-purple-300",
        };
      } else if (r > 12 && r <= 20) {
        badge = {
          label: "🔥 Estrés metabólico (13-20 reps)",
          sublabel: "Bombeo e hipertrofia sarcoplasmática",
          className: "border-pink-500/40 bg-pink-500/15 text-pink-300",
        };
      } else if (r >= 1 && r < 5) {
        badge = {
          label: "💥 Estímulo de Fuerza pura",
          sublabel: "Rango de 1-5 reps pesadas (>85% 1RM)",
          className: "border-amber-500/40 bg-amber-500/15 text-amber-300",
        };
      } else {
        badge = null;
      }
      break;
  }

  return {
    est1RM,
    relativeRatio,
    badge,
  };
}

export default function Workouts() {
  const navigate = useNavigate();
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [selectedMuscleId, setSelectedMuscleId] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [records, setRecords] = useState([]);
  const [userLevel, setUserLevel] = useState("intermedio");
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("fittracker_user");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);


  // Active workout state
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [syncStatus, setSyncStatus] = useState("synced"); // 'synced' | 'saving' | 'offline'
  const [readinessEnergy, setReadinessEnergy] = useState(null); // 1-5
  const [readinessMotivation, setReadinessMotivation] = useState(null); // 1-5
  const [mentalEffort, setMentalEffort] = useState(null); // 1-5
  const [isReadinessOpen, setIsReadinessOpen] = useState(false);

  // Filtros rápidos del catálogo oficial (60 ejercicios)
  const [exerciseFilter, setExerciseFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("Todos");

  const [workoutDate, setWorkoutDate] = useState(() =>
    getLocalDateString()
  );
  const [isDeviceOnline, setIsDeviceOnline] = useState(() => isOnline());
  const [pendingQueueCount, setPendingQueueCount] = useState(() => getPendingQueue().length);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [activeExercises, setActiveExercises] = useState([]); // [{ exerciseId, exerciseName, muscleGroupId, sets: [{ id, setNumber, weight, reps, completed, rest_effort }] }]
  const [showRestTimer, setShowRestTimer] = useState(false); // Explicit trigger for RestTimerModal
  const [currentRestInfo, setCurrentRestInfo] = useState(null); // Context for active rest set
  const [previousSessions, setPreviousSessions] = useState({}); // { [exerciseId]: PreviousExerciseSessionOut }

  // Save / Finish state
  const [isSaving, setIsSaving] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Contextual Tips state (Fase 4)
  const [contextualTips, setContextualTips] = useState([]);
  const [currentTipIdx, setCurrentTipIdx] = useState(0);
  const [isTipDismissed, setIsTipDismissed] = useState(false);

  const updateTimeoutRef = React.useRef({});
  const LOCAL_STORAGE_KEY = "fittracker_active_session";

  // Listen to offline / online & sync queue events
  useEffect(() => {
    const handleOnline = () => {
      setIsDeviceOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => {
      setIsDeviceOnline(false);
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
          prev.map((ex) => ({
            ...ex,
            sets: ex.sets.map((s) => (s.id === tempId ? { ...s, id: realId } : s)),
          }))
        );
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("fittracker:syncQueueChanged", handleQueueChange);
    window.addEventListener("fittracker:setIdSynced", handleSetIdSynced);

    if (isOnline()) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("fittracker:syncQueueChanged", handleQueueChange);
      window.removeEventListener("fittracker:setIdSynced", handleSetIdSynced);
    };
  }, []);

  const saveToLocalStorage = (
    sessionId,
    exercisesList,
    notes,
    date,
    muscleId,
    rEnergy = readinessEnergy,
    rMotivation = readinessMotivation,
    mEffort = mentalEffort
  ) => {
    try {
      const hasSets = exercisesList && exercisesList.length > 0;
      if (!hasSets) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return;
      }
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          activeSessionId: sessionId,
          activeExercises: exercisesList,
          workoutNotes: notes,
          workoutDate: date || getLocalDateString(),
          selectedMuscleId: muscleId,
          readinessEnergy: rEnergy,
          readinessMotivation: rMotivation,
          mentalEffort: mEffort,
          sportType: "strength",
          savedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn("Error guardando en localStorage:", e);
    }
  };

  // Helper to fetch previous session for an exercise and update cache
  const fetchPreviousSession = async (exerciseId) => {
    if (previousSessions[exerciseId] !== undefined) {
      return previousSessions[exerciseId];
    }
    try {
      const prev = await getExercisePreviousSession(exerciseId, activeSessionId);
      setPreviousSessions((curr) => ({ ...curr, [exerciseId]: prev }));
      return prev;
    } catch (err) {
      console.error(`Error cargando sesión previa de ejercicio ${exerciseId}:`, err);
      return null;
    }
  };

  // Initial load: fetches muscle groups, records, and any active in-progress workout
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [groups, recs, activeSession, profile] = await Promise.all([
          getMuscleGroups(),
          getRecords(),
          getActiveWorkout().catch(() => null),
          getUserProfile().catch(() => null),
        ]);
        setMuscleGroups(groups || []);
        setRecords(recs || []);
        if (profile && typeof profile === "object") {
          setUserProfile((prev) => (prev ? { ...prev, ...profile } : profile));
          if (profile?.experience_level) {
            setUserLevel(profile.experience_level);
          }
        }

        let initialMuscleId = groups.length > 0 ? groups[0].id : null;


        if (activeSession && activeSession.status === "in_progress") {
          setActiveSessionId(activeSession.id);
          if (activeSession.date) setWorkoutDate(activeSession.date);
          if (activeSession.muscle_group_id) {
            initialMuscleId = activeSession.muscle_group_id;
          }
          if (activeSession.notes) setWorkoutNotes(activeSession.notes);
          if (activeSession.readiness_energy) setReadinessEnergy(activeSession.readiness_energy);
          if (activeSession.readiness_motivation) setReadinessMotivation(activeSession.readiness_motivation);
          if (activeSession.mental_effort) setMentalEffort(activeSession.mental_effort);

          // Group sets by exercise_id preserving database set IDs
          const grouped = {};
          (activeSession.sets || []).forEach((s) => {
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
              rest_effort: s.rest_effort || null,
            });
          });

          const restoredExercises = Object.values(grouped);
          setActiveExercises(restoredExercises);

          // Preload benchmarks for restored exercises
          restoredExercises.forEach((ex) => {
            fetchPreviousSession(ex.exerciseId);
          });
        } else {
          // Check local draft fallback
          try {
            const rawDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (rawDraft) {
              const draft = JSON.parse(rawDraft);
              const hasDraftSets = draft.activeExercises && draft.activeExercises.length > 0;
              if (hasDraftSets) {
                if (draft.activeExercises) setActiveExercises(draft.activeExercises);
                if (draft.workoutNotes) setWorkoutNotes(draft.workoutNotes);
                if (draft.workoutDate) setWorkoutDate(draft.workoutDate);
                if (draft.selectedMuscleId) initialMuscleId = draft.selectedMuscleId;
                if (draft.activeSessionId) setActiveSessionId(draft.activeSessionId);
                if (draft.readinessEnergy) setReadinessEnergy(draft.readinessEnergy);
                if (draft.readinessMotivation) setReadinessMotivation(draft.readinessMotivation);
                if (draft.mentalEffort) setMentalEffort(draft.mentalEffort);
              }
            }
          } catch (e) {
            console.warn("Error leyendo draft local:", e);
          }
        }

        getProfile()
          .then((prof) => {
            if (prof && typeof prof === "object") {
              setUserProfile((prev) => (prev ? { ...prev, ...prof } : prof));
              if (prof?.experience_level) setUserLevel(prof.experience_level);
            }
          })
          .catch(() => {});

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

    const handleLevelEvt = (e) => {
      if (e?.detail) setUserLevel(e.detail);
    };
    const handleProfileEvt = (e) => {
      try {
        if (!e?.detail) return;
        let prof = e.detail;
        if (typeof prof === "string") {
          try {
            prof = JSON.parse(prof);
          } catch {
            return;
          }
        }
        if (prof && typeof prof === "object") {
          setUserProfile((prev) => (prev ? { ...prev, ...prof } : prof));
          if (prof?.experience_level) setUserLevel(prof.experience_level);
        }
      } catch (err) {
        console.warn("Error procesando fittracker:profileChanged en Workouts:", err);
      }
    };
    window.addEventListener("fittracker:levelChanged", handleLevelEvt);
    window.addEventListener("fittracker:profileChanged", handleProfileEvt);
    return () => {
      window.removeEventListener("fittracker:levelChanged", handleLevelEvt);
      window.removeEventListener("fittracker:profileChanged", handleProfileEvt);
    };
  }, []);


  // Fetch exercises when selected muscle group changes
  useEffect(() => {
    if (!selectedMuscleId) return;
    async function loadExercises() {
      try {
        const exList = await getExercises(selectedMuscleId);
        setExercises(exList);
      } catch (err) {
        console.error("Error cargando ejercicios:", err);
      }
    }
    loadExercises();
  }, [selectedMuscleId]);

  // Fetch contextual tips (Fase 4)
  useEffect(() => {
    async function loadTips() {
      try {
        const firstExId = activeExercises.length > 0 ? activeExercises[0].exerciseId : null;
        const res = await getContextualTips({
          exercise_id: firstExId,
          muscle_group_id: selectedMuscleId,
          readiness_energy: readinessEnergy,
          readiness_motivation: readinessMotivation,
        });
        if (res && res.length > 0) {
          setContextualTips(res);
          setCurrentTipIdx(0);
          setIsTipDismissed(false);
        }
      } catch (e) {
        // fail silently
      }
    }
    loadTips();
  }, [readinessEnergy, readinessMotivation, selectedMuscleId, activeExercises.length]);

  // Lookup map for exercise records: { exercise_id: RecordOut }
  const recordsMap = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      map[r.exercise_id] = r;
    });
    return map;
  }, [records]);

  // Selected muscle object
  const currentMuscle = useMemo(
    () => muscleGroups.find((g) => g.id === selectedMuscleId),
    [muscleGroups, selectedMuscleId]
  );

  // Filtered exercises for rapid catalog selection
  const filteredExercisesForSelection = useMemo(() => {
    return exercises.filter((ex) => {
      if (equipmentFilter !== "Todos") {
        const eq = getExerciseEquipment(ex.name);
        if (eq !== equipmentFilter) return false;
      }
      if (exerciseFilter.trim()) {
        const query = exerciseFilter.toLowerCase().trim();
        if (!ex.name.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [exercises, equipmentFilter, exerciseFilter]);

  // Helper to ensure an active workout session exists in the backend
  const ensureActiveSession = async (muscleId = selectedMuscleId) => {
    if (activeSessionId) return activeSessionId;
    try {
      setSyncStatus("saving");
      const session = await startWorkout({
        date: workoutDate,
        muscle_group_id: muscleId,
        notes: workoutNotes.trim() || null,
        readiness_energy: readinessEnergy,
        readiness_motivation: readinessMotivation,
        sport_type: "strength",
      });
      setActiveSessionId(session.id);
      setSyncStatus("synced");
      return session.id;
    } catch (err) {
      console.error("Error iniciando sesión activa en backend:", err);
      setSyncStatus("offline");
      return null;
    }
  };

  const handleDateChange = async (newDate) => {
    setWorkoutDate(newDate);
    saveToLocalStorage(
      activeSessionId,
      activeExercises,
      workoutNotes,
      newDate,
      selectedMuscleId,
      readinessEnergy,
      readinessMotivation,
      mentalEffort
    );
    if (activeSessionId) {
      try {
        await updateWorkoutDate(activeSessionId, newDate);
      } catch (err) {
        console.warn("Fallo actualizando fecha en servidor, encolando en cola offline:", err);
        enqueueSyncAction({
          type: "START_WORKOUT",
          payload: { date: newDate },
        });
      }
    }
  };

  // Handle readiness update (Energía / Motivación)
  const handleSelectReadiness = async (field, val) => {
    const currentVal = field === "energy" ? readinessEnergy : readinessMotivation;
    const nextVal = currentVal === val ? null : val;
    let nextEnergy = readinessEnergy;
    let nextMotivation = readinessMotivation;

    if (field === "energy") {
      setReadinessEnergy(nextVal);
      nextEnergy = nextVal;
    } else {
      setReadinessMotivation(nextVal);
      nextMotivation = nextVal;
    }

    saveToLocalStorage(
      activeSessionId,
      activeExercises,
      workoutNotes,
      workoutDate,
      selectedMuscleId,
      nextEnergy,
      nextMotivation,
      mentalEffort
    );

    if (activeSessionId) {
      try {
        setSyncStatus("saving");
        await updateWorkoutReadiness(activeSessionId, {
          readiness_energy: nextEnergy,
          readiness_motivation: nextMotivation,
        });
        setSyncStatus("synced");
      } catch (err) {
        console.error("Error guardando estado del día:", err);
        setSyncStatus("offline");
      }
    }
  };

  // Handle mental effort selection (1-5)
  const handleSelectMentalEffort = (val) => {
    const nextVal = mentalEffort === val ? null : val;
    setMentalEffort(nextVal);
    saveToLocalStorage(
      activeSessionId,
      activeExercises,
      workoutNotes,
      workoutDate,
      selectedMuscleId,
      readinessEnergy,
      readinessMotivation,
      nextVal
    );
  };


  // Add exercise to active workout with Ghost Data pre-fill & atomic backend persistence (Optimistic 0ms UI)
  const handleAddExerciseToWorkout = async (exercise) => {
    const alreadyAdded = activeExercises.find(
      (ae) => ae.exerciseId === exercise.id
    );
    if (alreadyAdded) return; // already in workout

    // Fetch previous session
    const prev = await fetchPreviousSession(exercise.id);
    const rec = recordsMap[exercise.id];

    // Priority: previous session set 1 -> last lift -> PR -> 20kg
    const initialWeight =
      prev?.sets?.[0]?.weight ?? rec?.last_weight ?? rec?.pr_weight ?? 20.0;
    const initialReps =
      prev?.sets?.[0]?.reps ?? rec?.last_reps ?? rec?.pr_reps ?? 10;

    const tempSetId = `temp_set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. OPTIMISTIC UPDATE: Immediate 0ms UI update
    const newActiveExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroupId: exercise.muscle_group_id,
      sets: [
        {
          id: tempSetId,
          setNumber: 1,
          weight: initialWeight,
          reps: initialReps,
          completed: false,
          rest_effort: null,
        },
      ],
    };

    setActiveExercises((prevList) => {
      const next = [...prevList, newActiveExercise];
      saveToLocalStorage(activeSessionId, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    // 2. Background sync & persistence
    (async () => {
      try {
        const sessionId = await ensureActiveSession(exercise.muscle_group_id);
        if (sessionId) {
          setSyncStatus("saving");
          const saved = await addWorkoutSet(sessionId, {
            exercise_id: exercise.id,
            set_number: 1,
            weight: initialWeight,
            reps: initialReps,
            completed: false,
          });
          // Replace temp ID with server ID
          setActiveExercises((prev) =>
            prev.map((item) => {
              if (item.exerciseId !== exercise.id) return item;
              return {
                ...item,
                sets: item.sets.map((s) => (s.id === tempSetId ? { ...s, id: saved.id } : s)),
              };
            })
          );
          setSyncStatus("synced");
        }
      } catch (err) {
        console.warn("Fallo guardando serie en background, encolando en modo offline:", err);
        setSyncStatus("offline");
        enqueueSyncAction({
          type: "ADD_SET",
          tempId: tempSetId,
          payload: {
            workoutSessionId: activeSessionId || "active",
            tempId: tempSetId,
            setData: {
              exercise_id: exercise.id,
              set_number: 1,
              weight: initialWeight,
              reps: initialReps,
              completed: false,
            },
          },
        });
      }
    })();
  };


  // Remove exercise from active workout and delete its sets
  const handleRemoveExerciseFromWorkout = async (exerciseId) => {
    const exItem = activeExercises.find((ae) => ae.exerciseId === exerciseId);
    if (!exItem) return;

    // 1. OPTIMISTIC UPDATE: Immediate 0ms removal
    setActiveExercises((prev) => {
      const next = prev.filter((ae) => ae.exerciseId !== exerciseId);
      saveToLocalStorage(activeSessionId, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    // 2. Background delete for sets
    if (exItem.sets && exItem.sets.length > 0) {
      exItem.sets.forEach((s) => {
        if (s.id) {
          if (String(s.id).startsWith("temp_")) {
            enqueueSyncAction({
              type: "DELETE_SET",
              tempId: s.id,
              payload: { setId: s.id },
            });
          } else {
            deleteWorkoutSet(s.id).catch((err) => {
              console.warn("Error eliminando serie de servidor, encolando:", err);
              enqueueSyncAction({
                type: "DELETE_SET",
                payload: { setId: s.id },
              });
            });
          }
        }
      });
    }
  };

  // Add a new set to an exercise (Prefills with ghost set or previous set)
  const handleAddSet = async (exerciseId) => {
    const exItem = activeExercises.find((ae) => ae.exerciseId === exerciseId);
    if (!exItem) return;

    const sets = exItem.sets;
    const nextSetIndex = sets.length;
    const prevSession = previousSessions[exerciseId];
    const ghostSet = prevSession?.sets?.[nextSetIndex];

    let nextWeight = 20.0;
    let nextReps = 10;

    if (ghostSet) {
      nextWeight = ghostSet.weight;
      nextReps = ghostSet.reps;
    } else if (sets.length > 0) {
      const lastSet = sets[sets.length - 1];
      nextWeight = lastSet.weight;
      nextReps = lastSet.reps;
    } else {
      const rec = recordsMap[exerciseId];
      if (rec?.last_weight) nextWeight = rec.last_weight;
      if (rec?.last_reps) nextReps = rec.last_reps;
    }

    const nextSetNumber = sets.length + 1;
    const tempSetId = `temp_set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const newSet = {
      id: tempSetId,
      setNumber: nextSetNumber,
      weight: nextWeight,
      reps: nextReps,
      completed: false,
      rest_effort: null,
    };

    // 1. OPTIMISTIC UPDATE: Immediate 0ms UI update
    setActiveExercises((prevList) => {
      const next = prevList.map((item) => {
        if (item.exerciseId !== exerciseId) return item;
        return {
          ...item,
          sets: [...item.sets, newSet],
        };
      });
      saveToLocalStorage(activeSessionId, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    // 2. Background sync
    (async () => {
      try {
        const sessionId = await ensureActiveSession();
        if (sessionId) {
          setSyncStatus("saving");
          const saved = await addWorkoutSet(sessionId, {
            exercise_id: exerciseId,
            set_number: nextSetNumber,
            weight: nextWeight,
            reps: nextReps,
            completed: false,
          });
          setActiveExercises((prev) =>
            prev.map((item) => {
              if (item.exerciseId !== exerciseId) return item;
              return {
                ...item,
                sets: item.sets.map((s) => (s.id === tempSetId ? { ...s, id: saved.id } : s)),
              };
            })
          );
          setSyncStatus("synced");
        }
      } catch (err) {
        console.warn("Fallo guardando serie en servidor, encolando offline:", err);
        setSyncStatus("offline");
        enqueueSyncAction({
          type: "ADD_SET",
          tempId: tempSetId,
          payload: {
            workoutSessionId: activeSessionId || "active",
            tempId: tempSetId,
            setData: {
              exercise_id: exerciseId,
              set_number: nextSetNumber,
              weight: nextWeight,
              reps: nextReps,
              completed: false,
            },
          },
        });
      }
    })();
  };

  // Quick 1-tap: Repeat previous load for a single set
  const handleRepeatPreviousSet = (exerciseId, setIdx) => {
    const prevSession = previousSessions[exerciseId];
    const prevSet = prevSession?.sets?.[setIdx];
    if (!prevSet) return;

    handleUpdateSet(exerciseId, setIdx, "weight", prevSet.weight);
    handleUpdateSet(exerciseId, setIdx, "reps", prevSet.reps);
  };

  // Quick 1-tap: Replicate entire previous session sets for this exercise
  const handleCopyFullPreviousSession = async (exerciseId) => {
    const prevSession = previousSessions[exerciseId];
    if (!prevSession || !prevSession.sets || prevSession.sets.length === 0) return;

    const exItem = activeExercises.find((ae) => ae.exerciseId === exerciseId);
    if (!exItem) return;

    // Delete existing sets in background
    for (const s of exItem.sets) {
      if (s.id) {
        if (String(s.id).startsWith("temp_")) {
          enqueueSyncAction({ type: "DELETE_SET", tempId: s.id, payload: { setId: s.id } });
        } else {
          deleteWorkoutSet(s.id).catch(() => {});
        }
      }
    }

    const newSets = prevSession.sets.map((s, idx) => ({
      id: `temp_set_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      setNumber: idx + 1,
      weight: s.weight,
      reps: s.reps,
      completed: false,
    }));

    // 1. OPTIMISTIC UPDATE: Immediate 0ms UI update
    setActiveExercises((prevList) => {
      const next = prevList.map((item) => {
        if (item.exerciseId !== exerciseId) return item;
        return {
          ...item,
          sets: newSets,
        };
      });
      saveToLocalStorage(activeSessionId, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    // 2. Background sync each replicated set
    (async () => {
      const sessionId = await ensureActiveSession();
      if (!sessionId) {
        newSets.forEach((ns) => {
          enqueueSyncAction({
            type: "ADD_SET",
            tempId: ns.id,
            payload: {
              workoutSessionId: "active",
              tempId: ns.id,
              setData: {
                exercise_id: exerciseId,
                set_number: ns.setNumber,
                weight: ns.weight,
                reps: ns.reps,
                completed: false,
              },
            },
          });
        });
        return;
      }

      for (const ns of newSets) {
        try {
          const res = await addWorkoutSet(sessionId, {
            exercise_id: exerciseId,
            set_number: ns.setNumber,
            weight: ns.weight,
            reps: ns.reps,
            completed: false,
          });
          setActiveExercises((prev) =>
            prev.map((item) => {
              if (item.exerciseId !== exerciseId) return item;
              return {
                ...item,
                sets: item.sets.map((s) => (s.id === ns.id ? { ...s, id: res.id } : s)),
              };
            })
          );
        } catch (err) {
          enqueueSyncAction({
            type: "ADD_SET",
            tempId: ns.id,
            payload: {
              workoutSessionId: sessionId,
              tempId: ns.id,
              setData: {
                exercise_id: exerciseId,
                set_number: ns.setNumber,
                weight: ns.weight,
                reps: ns.reps,
                completed: false,
              },
            },
          });
        }
      }
    })();
  };

  // Remove a set from an exercise
  const handleRemoveSet = async (exerciseId, setIndex) => {
    const exItem = activeExercises.find((ae) => ae.exerciseId === exerciseId);
    const setToRemove = exItem?.sets?.[setIndex];
    if (!setToRemove) return;

    // 1. OPTIMISTIC UPDATE: Immediate 0ms removal
    setActiveExercises((prev) => {
      const next = prev.map((item) => {
        if (item.exerciseId !== exerciseId) return item;
        const filtered = item.sets.filter((_, idx) => idx !== setIndex);
        const renumbered = filtered.map((s, idx) => ({
          ...s,
          setNumber: idx + 1,
        }));
        return { ...item, sets: renumbered };
      });
      saveToLocalStorage(activeSessionId, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    // 2. Background delete
    if (setToRemove.id) {
      if (String(setToRemove.id).startsWith("temp_")) {
        enqueueSyncAction({
          type: "DELETE_SET",
          tempId: setToRemove.id,
          payload: { setId: setToRemove.id },
        });
      } else {
        (async () => {
          try {
            setSyncStatus("saving");
            await deleteWorkoutSet(setToRemove.id);
            setSyncStatus("synced");
          } catch (err) {
            console.warn("Error eliminando serie en servidor, encolando offline:", err);
            setSyncStatus("offline");
            enqueueSyncAction({
              type: "DELETE_SET",
              payload: { setId: setToRemove.id },
            });
          }
        })();
      }
    }
  };

  // Update set values (optimistic UI + debounce save to backend & localStorage)
  const handleUpdateSet = (exerciseId, setIndex, field, value) => {
    let targetSetId = null;

    // 1. OPTIMISTIC UPDATE: Immediate 0ms local state update
    setActiveExercises((prev) => {
      const next = prev.map((item) => {
        if (item.exerciseId !== exerciseId) return item;
        const sets = [...item.sets];
        const currentSet = sets[setIndex];
        if (currentSet) {
          targetSetId = currentSet.id;
          sets[setIndex] = {
            ...currentSet,
            [field]: value,
          };
        }
        return { ...item, sets };
      });
      saveToLocalStorage(activeSessionId, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    if (targetSetId) {
      if (updateTimeoutRef.current[targetSetId]) {
        clearTimeout(updateTimeoutRef.current[targetSetId]);
      }
      setSyncStatus("saving");
      updateTimeoutRef.current[targetSetId] = setTimeout(async () => {
        const payload = {};
        if (field === "weight") payload.weight = parseFloat(value) || 0.0;
        if (field === "reps") payload.reps = parseInt(value, 10) || 0;

        if (String(targetSetId).startsWith("temp_")) {
          enqueueSyncAction({
            type: "UPDATE_SET",
            tempId: targetSetId,
            payload: { updateData: payload },
          });
          setSyncStatus("offline");
        } else {
          try {
            await updateWorkoutSet(targetSetId, payload);
            setSyncStatus("synced");
          } catch (err) {
            console.warn("Error actualizando serie, encolando offline:", err);
            setSyncStatus("offline");
            enqueueSyncAction({
              type: "UPDATE_SET",
              payload: {
                setId: targetSetId,
                updateData: payload,
              },
            });
          }
        }
      }, 350);
    }
  };

  // Toggle set completion (Check/Listo button with haptic feel & immediate persistence)
  const handleToggleSetCompleted = async (exerciseId, setIndex) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (e) {}
    }

    const exItem = activeExercises.find((ae) => ae.exerciseId === exerciseId);
    if (!exItem || !exItem.sets || !exItem.sets[setIndex]) return;

    const currentSet = exItem.sets[setIndex];
    const nextCompleted = !currentSet.completed;

    const targetSet = {
      ...currentSet,
      completed: nextCompleted,
    };

    // 1. Immediately update UI state & localStorage (0ms delay)
    setActiveExercises((prev) => {
      const next = prev.map((item) => {
        if (item.exerciseId !== exerciseId) return item;
        const sets = [...item.sets];
        sets[setIndex] = targetSet;
        return { ...item, sets };
      });
      saveToLocalStorage(activeSessionId, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    // 2. CRUCIAL: Trigger Rest Timer Modal explicitly when set is marked completed!
    if (nextCompleted) {
      setCurrentRestInfo({
        setId: targetSet.id || null,
        exerciseId: exerciseId,
        exerciseName: exItem.exerciseName || "Ejercicio",
        setIndex: setIndex,
        setNumber: setIndex + 1,
        weight: parseFloat(targetSet.weight) || 0.0,
        reps: parseInt(targetSet.reps, 10) || 0,
        totalSets: exItem.sets.length,
      });
      setShowRestTimer(true);
    }

    // 3. Persist check state to backend or enqueue if offline
    if (targetSet.id) {
      const updateData = {
        completed: nextCompleted,
        weight: parseFloat(targetSet.weight) || 0.0,
        reps: parseInt(targetSet.reps, 10) || 0,
      };

      if (String(targetSet.id).startsWith("temp_")) {
        enqueueSyncAction({
          type: "UPDATE_SET",
          tempId: targetSet.id,
          payload: { updateData },
        });
      } else {
        (async () => {
          try {
            setSyncStatus("saving");
            await updateWorkoutSet(targetSet.id, updateData);
            setSyncStatus("synced");
          } catch (err) {
            console.warn("Error actualizando check de serie, encolando offline:", err);
            setSyncStatus("offline");
            enqueueSyncAction({
              type: "UPDATE_SET",
              payload: {
                setId: targetSet.id,
                updateData,
              },
            });
          }
        })();
      }
    }
  };

  // Persist perceived effort selected in RestTimerModal (non-blocking)
  const handleRestEffortSelected = async (effort) => {
    if (!currentRestInfo) return;
    const { exerciseId, setIndex, setId } = currentRestInfo;

    setActiveExercises((prev) => {
      const next = prev.map((item) => {
        if (item.exerciseId !== exerciseId) return item;
        const sets = [...item.sets];
        if (sets[setIndex]) {
          sets[setIndex] = {
            ...sets[setIndex],
            rest_effort: effort,
          };
        }
        return { ...item, sets };
      });
      saveToLocalStorage(activeSessionId, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    if (setId) {
      if (String(setId).startsWith("temp_")) {
        enqueueSyncAction({
          type: "UPDATE_SET",
          tempId: setId,
          payload: { updateData: { rest_effort: effort } },
        });
      } else {
        try {
          await updateWorkoutSet(setId, { rest_effort: effort });
        } catch (err) {
          enqueueSyncAction({
            type: "UPDATE_SET",
            payload: { setId, updateData: { rest_effort: effort } },
          });
        }
      }
    }
  };

  // Calculate live workout stats
  const totalSetsCount = useMemo(() => {
    return activeExercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  }, [activeExercises]);

  const completedSetsCount = useMemo(() => {
    return activeExercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );
  }, [activeExercises]);

  const totalVolume = useMemo(() => {
    return activeExercises.reduce((acc, ex) => {
      const exerciseVol = ex.sets.reduce((sum, s) => {
        const wt = parseFloat(s.weight) || 0;
        const rp = parseInt(s.reps, 10) || 0;
        return sum + wt * rp;
      }, 0);
      return acc + exerciseVol;
    }, 0);
  }, [activeExercises]);

  // Save / Finalize workout session
  const handleFinishWorkout = async () => {
    const payloadSets = [];
    activeExercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.weight > 0 || s.reps > 0) {
          payloadSets.push({
            id: s.id,
            exercise_id: ex.exerciseId,
            set_number: s.setNumber,
            weight: parseFloat(s.weight) || 0.0,
            reps: parseInt(s.reps, 10) || 0,
            completed: Boolean(s.completed),
            rest_effort: s.rest_effort || null,
          });
        }
      });
    });

    if (payloadSets.length === 0) {
      alert("Agregá al menos una serie con peso y repeticiones para guardar el entrenamiento.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const finishDataPayload = {
        date: workoutDate,
        notes: workoutNotes.trim() || null,
        mental_effort: mentalEffort,
        readiness_energy: readinessEnergy,
        readiness_motivation: readinessMotivation,
        sport_type: "strength",
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
        if (activeSessionId) {
          enqueueSyncAction({
            type: "FINISH_WORKOUT",
            payload: {
              workoutId: activeSessionId,
              finishData: finishDataPayload,
            },
          });
        } else {
          enqueueSyncAction({
            type: "START_WORKOUT",
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
        };
      }

      // Calculate any broken PRs
      const brokenPRs = [];
      let exercisesWithVolumeGain = 0;

      activeExercises.forEach((ex) => {
        const oldPr = recordsMap[ex.exerciseId]?.pr_weight || 0;
        const maxSessionWeight = Math.max(
          ...ex.sets.map((s) => parseFloat(s.weight) || 0)
        );
        if (maxSessionWeight > oldPr && oldPr > 0) {
          brokenPRs.push({
            name: ex.exerciseName,
            oldPr,
            newPr: maxSessionWeight,
          });
        }

        const prevSession = previousSessions[ex.exerciseId];
        if (prevSession && prevSession.total_volume > 0) {
          const curVol = ex.sets.reduce(
            (sum, s) =>
              sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0),
            0
          );
          if (curVol > prevSession.total_volume) {
            exercisesWithVolumeGain += 1;
          }
        }
      });

      const isWillpowerDay = Boolean(
        (readinessEnergy && readinessEnergy <= 2) ||
        (mentalEffort && mentalEffort >= 4)
      );

      // Show summary celebration modal
      setCompletedSummary({
        id: saved.id,
        date: saved.date,
        exerciseCount: activeExercises.length,
        setsCount: payloadSets.length,
        volume: totalVolume,
        brokenPRs,
        volumeGainedExercises: exercisesWithVolumeGain,
        readinessEnergy,
        readinessMotivation,
        mentalEffort,
        isWillpowerDay,
        isOfflineSaved,
      });

      if (isOnline()) {
        try {
          const updatedRecords = await getRecords();
          setRecords(updatedRecords);
        } catch (e) {}
      }

      // Invalidate previous sessions cache to fetch updated ones next time
      setPreviousSessions({});

      // Reset workout session & clear localStorage
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {}

      setActiveSessionId(null);
      setActiveExercises([]);
      setWorkoutNotes("");
      setMentalEffort(null);
      setReadinessEnergy(null);
      setReadinessMotivation(null);
    } catch (err) {
      console.error("Error guardando entrenamiento:", err);
      setErrorMessage(
        err.response?.data?.detail || "Error al guardar el entrenamiento."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Discard current workout
  const handleDiscardWorkout = async () => {
    if (
      activeExercises.length > 0 &&
      !window.confirm("¿Seguro que querés descartar el entrenamiento actual? Se borrarán las series registradas en esta sesión.")
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
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
    setActiveSessionId(null);
    setActiveExercises([]);
    setWorkoutNotes("");
    setMentalEffort(null);
    setReadinessEnergy(null);
    setReadinessMotivation(null);
  };

  // Format today's date nicely in Spanish without day shifts
  const formattedToday = useMemo(() => {
    return formatDateLong(workoutDate);
  }, [workoutDate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-[#A855F7]">
        <Loader2 size={36} className="animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-[#A1A1AA]">
          Cargando FitTracker OLED...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md sm:max-w-4xl mx-auto space-y-5 pb-24 px-1 sm:px-0">
      {/* 1. Header & Date Section */}
      <div className="relative overflow-hidden rounded-2xl border border-[#2D1B4E] bg-gradient-to-r from-[#140E24] via-[#1C1433] to-[#140E24] p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#A855F7]/30 bg-[#9333EA]/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#C084FC]">
                <Flame size={14} className="text-[#A855F7]" />
                <span>SESIÓN DE ENTRENAMIENTO</span>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("fittracker:openProfile"))}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#A855F7]/40 bg-[#140E24] px-2.5 py-1 text-[10px] font-black uppercase text-[#C084FC] hover:border-[#A855F7] hover:bg-[#1C1433] transition"
                title="Cambiar nivel o ver explicaciones de entrenamiento"
              >
                <User size={11} className="text-[#A855F7]" />
                <span className="capitalize">{userLevel}</span>
              </button>
              {(!isDeviceOnline || pendingQueueCount > 0) ? (
                <div
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300"
                  title="Cambios guardados localmente. Se sincronizarán automáticamente al recuperar la conexión."
                >
                  <CloudOff size={11} className="text-amber-400" />
                  <span>
                    {!isDeviceOnline ? "Modo Offline" : "Sincronizando"}
                    {pendingQueueCount > 0 ? ` (${pendingQueueCount})` : ""}
                  </span>
                </div>
              ) : activeExercises.length > 0 ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/40 bg-[#34D399]/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#34D399]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]"></span>
                  </span>
                  <span>{syncStatus === "saving" ? "Guardando..." : "Guardado en vivo"}</span>
                </div>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-black capitalize tracking-tight text-white sm:text-3xl">
              {formattedToday}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#A1A1AA]">
              <span className="text-[#34D399] font-bold">
                {userLevel === "principiante" && "🎯 Foco Principiante:"}
                {userLevel === "intermedio" && "📈 Foco Intermedio:"}
                {userLevel === "avanzado" && "🧠 Foco Avanzado:"}
              </span>
              <span>
                {userLevel === "principiante" && "Priorizá técnica y control excéntrico (2-3s). 8-12 reps limpias sin balanceos."}
                {userLevel === "intermedio" && "Sobrecarga con RIR 1-2. Consolidá cargas antes de buscar +1 rep o micro-pesos."}
                {userLevel === "avanzado" && "Autorregulá RPE intra-serie. Si la velocidad de barra cae, cuidá tu SNC."}
              </span>
            </div>

          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="min-h-[44px] rounded-xl border border-[#2D1B4E] bg-[#0E0919] px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#A855F7]"
            />
            {activeExercises.length > 0 && (
              <button
                onClick={handleDiscardWorkout}
                title="Descartar sesión"
                className="oled-btn-ghost min-h-[44px] px-2.5 text-xs text-red-400 hover:text-red-300"
              >
                <RotateCcw size={16} />
                <span className="hidden sm:inline">Descartar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm font-semibold text-red-200">
          {errorMessage}
        </div>
      )}

      {/* Duelo en Vivo 1 vs 1 Shortcut Banner */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#A855F7]/40 bg-gradient-to-r from-[#1C1433] via-[#140E24] to-[#1C1433] p-3.5 shadow-neon">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#9333EA] to-[#A855F7] flex items-center justify-center text-white flex-shrink-0 shadow-neon">
            <Swords size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-white truncate">
              ¿Entrenando con un compañero hoy?
            </h4>
            <p className="text-[11px] text-[#C084FC] truncate">
              Lanzá un Duelo 1 vs 1 en vivo con fuerza relativa (normalizada por peso corporal)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/battle")}
          className="iron-btn-primary min-h-[40px] px-3 text-xs font-black flex-shrink-0 whitespace-nowrap"
        >
          ⚔️ Duelo 1v1
        </button>
      </div>


      {/* 1.5. Estado del Día (Readiness Check-in - Opcional & 1-Tap) */}
      <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5 sm:p-4 shadow-card space-y-3">
        <div
          onClick={() => setIsReadinessOpen(!isReadinessOpen)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-500/30">
              <Zap size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white">
                  Estado del Día (Readiness)
                </span>
                <span className="text-[10px] uppercase font-bold text-[#71717A]">
                  (Opcional)
                </span>
              </div>
              <p className="text-[11px] text-[#A1A1AA]">
                Registrá tu energía y motivación (1 toque, sin frenar tu sesión)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {readinessEnergy && (
                <span className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-300">
                  ⚡ {readinessEnergy}/5
                </span>
              )}
              {readinessMotivation && (
                <span className="rounded-lg border border-orange-500/30 bg-orange-500/15 px-2 py-0.5 text-[11px] font-black text-orange-300">
                  🔥 {readinessMotivation}/5
                </span>
              )}
            </div>
            <button
              type="button"
              className="p-1 text-[#A1A1AA] hover:text-white"
              aria-label="Alternar estado del día"
            >
              {isReadinessOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Collapsible content */}
        {isReadinessOpen && (
          <div className="space-y-3 pt-2 border-t border-[#2D1B4E]/60 animate-in fade-in duration-150">
            {/* Energy selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#E4E4E7] flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  Nivel de Energía
                </span>
                <span className="text-[11px] text-[#A1A1AA]">
                  {readinessEnergy === 1 && "1 · Agotado / Fatiga"}
                  {readinessEnergy === 2 && "2 · Bajo / Cansado"}
                  {readinessEnergy === 3 && "3 · Normal / Equilibrado"}
                  {readinessEnergy === 4 && "4 · Con energía / Óptimo"}
                  {readinessEnergy === 5 && "5 · Al 100% / Enérgico"}
                  {!readinessEnergy && "Sin registrar"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectReadiness("energy", val)}
                    className={`min-h-[44px] rounded-xl border text-xs sm:text-sm font-black transition active:scale-95 flex items-center justify-center ${
                      readinessEnergy === val
                        ? "border-amber-400 bg-amber-500/25 text-amber-300 shadow-neon"
                        : "border-[#2D1B4E] bg-[#0E0919] text-[#A1A1AA] hover:border-amber-400/40 hover:text-white"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Motivation selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#E4E4E7] flex items-center gap-1.5">
                  <Flame size={14} className="text-orange-400" />
                  Nivel de Motivación
                </span>
                <span className="text-[11px] text-[#A1A1AA]">
                  {readinessMotivation === 1 && "1 · Sin ganas"}
                  {readinessMotivation === 2 && "2 · Baja / Disciplina pura"}
                  {readinessMotivation === 3 && "3 · Normal / Constante"}
                  {readinessMotivation === 4 && "4 · Motivado"}
                  {readinessMotivation === 5 && "5 · Fuego total"}
                  {!readinessMotivation && "Sin registrar"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectReadiness("motivation", val)}
                    className={`min-h-[44px] rounded-xl border text-xs sm:text-sm font-black transition active:scale-95 flex items-center justify-center ${
                      readinessMotivation === val
                        ? "border-orange-400 bg-orange-500/25 text-orange-300 shadow-neon"
                        : "border-[#2D1B4E] bg-[#0E0919] text-[#A1A1AA] hover:border-orange-400/40 hover:text-white"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {readinessEnergy && readinessEnergy <= 2 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
                🛡️ <strong>Disciplina de hierro:</strong> Entrenar con energía baja demuestra verdadero compromiso. Si completás tu rutina hoy, la app reconocerá tu esfuerzo mental.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Selector Visual de Grupo Muscular (Touch Grid) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#9333EA]/20 text-xs font-black text-[#C084FC]">
              1
            </span>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
              Grupo Muscular de Hoy
            </h2>
          </div>
        </div>

        {/* Muscle Cards Grid - Tactile Touch */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {muscleGroups.map((group) => {
            const isSelected = selectedMuscleId === group.id;
            const MuscleIcon = getMuscleIcon(group.name);

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setSelectedMuscleId(group.id);
                  setExerciseFilter("");
                }}
                className={`relative flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-center transition duration-150 active:scale-95 ${
                  isSelected
                    ? "border-2 border-[#A855F7] bg-[#1C1433] shadow-cardActive text-white"
                    : "border border-[#2D1B4E] bg-[#140E24] text-[#A1A1AA] hover:border-[#A855F7]/40 hover:bg-[#1C1433] hover:text-white"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                    isSelected
                      ? "bg-gradient-to-br from-[#9333EA] to-[#7E22CE] text-white shadow-neon"
                      : "border border-[#2D1B4E] bg-[#0E0919] text-[#C084FC]"
                  }`}
                >
                  <MuscleIcon size={20} />
                </div>
                <div className="w-full min-w-0 px-0.5">
                  <span className="block text-xs font-black tracking-tight leading-tight truncate max-w-full break-words">
                    {group.name}
                  </span>
                  <span className="text-[10px] font-medium text-[#71717A]">
                    {group.exercise_count || 0} ejer.
                  </span>
                </div>
                {isSelected && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#A855F7] shadow-neon" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Selección Rápida del Catálogo Oficial (10 Ejercicios) */}
      {selectedMuscleId && (
        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-4 shadow-card space-y-3.5 sm:p-5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#9333EA]/20 text-xs font-black text-[#C084FC]">
                2
              </span>
              <h2 className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
                Ejercicios de {currentMuscle?.name} ({exercises.length})
              </h2>
            </div>

            {/* Chips de filtro rápido por equipamiento */}
            <div className="flex flex-wrap items-center gap-1.5">
              {["Todos", "Barra", "Mancuerna", "Polea", "Máquina"].map((chip) => {
                const isSelected = equipmentFilter === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setEquipmentFilter(chip)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition active:scale-95 ${
                      isSelected
                        ? "border border-[#A855F7] bg-[#9333EA]/30 text-white shadow-neon"
                        : "border border-[#2D1B4E] bg-[#0E0919] text-[#A1A1AA] hover:border-[#A855F7]/40 hover:text-white"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Barra de búsqueda rápida */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder="🔍 Buscar ejercicio..."
              value={exerciseFilter}
              onChange={(e) => setExerciseFilter(e.target.value)}
              className="w-full rounded-xl border border-[#2D1B4E] bg-[#0E0919] px-3.5 py-2.5 text-xs font-bold text-white placeholder-[#71717A] outline-none transition focus:border-[#A855F7] focus:shadow-neon"
            />
            {exerciseFilter && (
              <button
                type="button"
                onClick={() => setExerciseFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#71717A] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Grid fluido responsive con los ejercicios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
            {filteredExercisesForSelection.map((ex) => {
              const isAdded = activeExercises.some(
                (ae) => ae.exerciseId === ex.id
              );
              const rec = recordsMap[ex.id];
              const equipment = getExerciseEquipment(ex.name);

              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleAddExerciseToWorkout(ex)}
                  className={`flex items-center justify-between gap-3 rounded-xl p-3 text-left transition duration-150 active:scale-[0.98] ${
                    isAdded
                      ? "border-2 border-[#A855F7] bg-[#1C1433] text-white shadow-prGlow cursor-default"
                      : "border border-[#2D1B4E] bg-[#0E0919] text-white hover:border-[#A855F7]/70 hover:bg-[#1C1433]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition ${
                        isAdded
                          ? "bg-[#34D399]/20 text-[#34D399]"
                          : "bg-[#2D1B4E] text-[#C084FC]"
                      }`}
                    >
                      {isAdded ? <Check size={16} /> : <Plus size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white leading-snug break-words">
                        {ex.name}
                      </p>
                      <span className="text-[10px] font-semibold text-[#71717A] uppercase">
                        {equipment}
                      </span>
                    </div>
                  </div>

                  {rec?.pr_weight ? (
                    <span className="flex-shrink-0 rounded-md border border-[#A855F7]/30 bg-[#2D1B4E] px-2 py-0.5 text-[10px] font-black text-[#C084FC]">
                      PR {rec.pr_weight}kg
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {filteredExercisesForSelection.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#2D1B4E] bg-[#0E0919] p-6 text-center">
              <p className="text-xs font-bold text-[#A1A1AA]">
                No se encontraron ejercicios con ese filtro.
              </p>
              <button
                type="button"
                onClick={() => {
                  setExerciseFilter("");
                  setEquipmentFilter("Todos");
                }}
                className="mt-2 text-xs font-bold text-[#C084FC] hover:underline"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3.5. Mini-Tip Inteligente Contextual (Fase 4) */}
      {contextualTips.length > 0 && !isTipDismissed && (
        (() => {
          const currentTip = contextualTips[currentTipIdx % contextualTips.length];
          const isWillpower = currentTip.category === "willpower";
          const isOverload = currentTip.category === "overload";
          const isRecovery = currentTip.category === "recovery";

          let borderBg = "border-[#A855F7]/40 bg-gradient-to-r from-[#9333EA]/15 via-[#140E24] to-[#140E24]";
          let iconColor = "text-[#C084FC]";
          let categoryBadge = "border-[#A855F7]/30 bg-[#9333EA]/20 text-[#C084FC]";

          if (isWillpower) {
            borderBg = "border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-[#140E24] to-[#140E24]";
            iconColor = "text-amber-400";
            categoryBadge = "border-amber-500/40 bg-amber-500/20 text-amber-300";
          } else if (isRecovery) {
            borderBg = "border-blue-500/40 bg-gradient-to-r from-blue-500/15 via-[#140E24] to-[#140E24]";
            iconColor = "text-blue-400";
            categoryBadge = "border-blue-500/40 bg-blue-500/20 text-blue-300";
          } else if (isOverload) {
            borderBg = "border-[#34D399]/40 bg-gradient-to-r from-[#34D399]/15 via-[#140E24] to-[#140E24]";
            iconColor = "text-[#34D399]";
            categoryBadge = "border-[#34D399]/40 bg-[#34D399]/20 text-[#34D399]";
          }

          const TipIcon =
            currentTip.icon === "brain"
              ? Brain
              : currentTip.icon === "zap"
              ? Zap
              : currentTip.icon === "flame"
              ? Flame
              : currentTip.icon === "trending-up"
              ? TrendingUp
              : currentTip.icon === "shield"
              ? Shield
              : Sparkles;

          return (
            <div className={`relative rounded-2xl border p-3.5 sm:p-4 shadow-neon transition duration-200 ${borderBg}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E0919] flex-shrink-0 ${iconColor}`}>
                    <TipIcon size={18} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${categoryBadge}`}>
                        {currentTip.category}
                      </span>
                      <h4 className="text-xs font-black text-white">
                        {currentTip.title}
                      </h4>
                    </div>
                    <p className="text-xs text-[#D4D4D8] leading-relaxed">
                      {currentTip.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {contextualTips.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentTipIdx((prev) => (prev + 1) % contextualTips.length)}
                      title="Siguiente consejo"
                      className="rounded-lg border border-[#2D1B4E] bg-[#0E0919] p-1.5 text-[#A1A1AA] hover:text-white hover:border-[#A855F7] transition"
                    >
                      <Sparkles size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsTipDismissed(true)}
                    title="Ocultar consejo"
                    className="rounded-lg p-1.5 text-[#71717A] hover:text-white transition"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* 4. Registro de Cargas (In-Workout Exercises & Series) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#9333EA]/20 text-xs font-black text-[#C084FC]">
              3
            </span>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
              Cargas &amp; Sobrecarga Progresiva ({activeExercises.length} ejer.)
            </h2>
          </div>

          {activeExercises.length > 0 && (
            <span className="text-xs font-black text-[#34D399]">
              {completedSetsCount} / {totalSetsCount} series completadas
            </span>
          )}
        </div>

        {activeExercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#2D1B4E] bg-[#140E24]/60 p-8 text-center sm:p-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0E0919] text-[#A855F7] shadow-neon">
              <Dumbbell size={28} />
            </div>
            <h3 className="mt-3.5 text-base font-bold text-white">
              Entrenamiento listo para comenzar
            </h3>
            <p className="mt-1 max-w-sm text-xs text-[#A1A1AA]">
              Tocá un ejercicio arriba o escribí uno nuevo para registrar tus cargas y superar tu sesión previa.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {activeExercises.map((ae) => {
              const rec = recordsMap[ae.exerciseId];
              const prevSession = previousSessions[ae.exerciseId];
              const prWeight = rec?.pr_weight;
              const prReps = rec?.pr_reps;

              // Check if any completed or current set exceeds PR
              const currentMaxWeight = Math.max(
                0,
                ...ae.sets.map((s) => parseFloat(s.weight) || 0)
              );
              const isBreakingPr = prWeight && currentMaxWeight > prWeight;

              // Volume metrics for this exercise
              const exVolStats = getExerciseVolumeStats(ae, prevSession);

              return (
                <div
                  key={ae.exerciseId}
                  className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5 shadow-card sm:p-5 space-y-3"
                >
                  {/* Exercise Header */}
                  <div className="flex flex-col gap-2.5 border-b border-[#2D1B4E] pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-white truncate max-w-full break-words leading-tight">
                          {ae.exerciseName}
                        </h3>
                        {isBreakingPr && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#9333EA] to-[#7E22CE] px-2 py-0.5 text-[10px] font-black text-white shadow-neon animate-pulse flex-shrink-0">
                            <Sparkles size={11} /> ¡PR!
                          </span>
                        )}
                      </div>

                      {/* Benchmarks & Hypertrophy Overload Bar */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        <div className="oled-pr-badge">
                          <Trophy size={13} className="text-[#C084FC]" />
                          <span>
                            PR: {prWeight ? `${prWeight}kg × ${prReps}` : "Sin PR"}
                            {prWeight && (userProfile?.bodyweight ?? 70) ? (
                              <span className="text-zinc-400 font-normal ml-1">
                                ({(prWeight / (userProfile?.bodyweight ?? 70)).toFixed(2)}× peso)
                              </span>
                            ) : null}
                          </span>
                        </div>

                        {/* Carga Máxima de Hoy & Ratio Relativo */}
                        {currentMaxWeight > 0 && (
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#A855F7]/40 bg-[#1C1433] px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                            <Scale size={13} className="text-[#A855F7]" />
                            <span>
                              Hoy máx: <strong className="text-white">{currentMaxWeight}kg</strong>
                              {(userProfile?.bodyweight ?? 70) ? (
                                <span className="text-[#C084FC] ml-1 font-black">
                                  ({currentMaxWeight}kg = {(currentMaxWeight / (userProfile?.bodyweight ?? 70)).toFixed(2)}× tu peso)
                                </span>
                              ) : null}
                            </span>
                          </div>
                        )}

                        {/* Prompt to enter bodyweight if not configured */}
                        {!userProfile?.bodyweight && (
                          <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent("fittracker:openProfile"))}
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#2D1B4E] bg-[#0E0919] px-2.5 py-1 text-[11px] font-bold text-[#A1A1AA] hover:border-[#A855F7]/50 hover:text-[#C084FC] transition"
                            title="Ingresá tu peso corporal en Mi Perfil para calcular la fuerza relativa"
                          >
                            <Scale size={12} className="text-[#A855F7]" />
                            <span>+ Ingresar peso (ratio)</span>
                          </button>
                        )}

                        {/* Volume (Tonaje) Comparison Pill */}
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2D1B4E] bg-[#0E0919] px-2.5 py-1 text-xs font-semibold">
                          <span className="text-[#71717A]">Volumen:</span>
                          <span className="text-white font-black">
                            {Math.round(exVolStats.currentVolume).toLocaleString()} kg
                          </span>
                          {exVolStats.hasPrev && (
                            <>
                              <span className="text-[#71717A] text-[11px]">
                                (vs {Math.round(exVolStats.prevVolume).toLocaleString()} kg previa)
                              </span>
                              {exVolStats.diffVolume !== 0 && (
                                <span
                                  className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-black ${
                                    exVolStats.diffVolume > 0
                                      ? "text-[#34D399] bg-[#34D399]/15 border border-[#34D399]/30"
                                      : "text-[#A1A1AA] bg-[#140E24] border border-[#2D1B4E]"
                                  }`}
                                >
                                  {exVolStats.diffVolume > 0
                                    ? `↑ +${Math.round(exVolStats.diffVolume)} kg (+${exVolStats.percentDiff}%)`
                                    : `↓ ${Math.round(exVolStats.diffVolume)} kg`}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          const lastSet = ae.sets[ae.sets.length - 1];
                          setCurrentRestInfo({
                            exerciseId: ae.exerciseId,
                            exerciseName: ae.exerciseName,
                            setNumber: ae.sets.length,
                            totalSets: ae.sets.length,
                            weight: parseFloat(lastSet?.weight) || 0,
                            reps: parseInt(lastSet?.reps, 10) || 0,
                          });
                          setShowRestTimer(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#A855F7]/40 bg-[#1C1433] px-2.5 py-1.5 text-[11px] font-black text-[#C084FC] hover:border-[#A855F7] hover:bg-[#251A45] hover:text-white transition active:scale-95 shadow-neon"
                        title="Abrir temporizador de descanso"
                      >
                        <Clock size={12} />
                        <span>⏱️ Descanso</span>
                      </button>

                      {prevSession && prevSession.sets && prevSession.sets.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCopyFullPreviousSession(ae.exerciseId)}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#2D1B4E] bg-[#0E0919] px-2.5 py-1.5 text-[11px] font-bold text-[#C084FC] hover:border-[#A855F7] hover:bg-[#1C1433] transition active:scale-95"
                          title="Copiar todas las series y cargas de la sesión anterior"
                        >
                          <RotateCcw size={12} />
                          <span>Repetir sesión previa</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveExerciseFromWorkout(ae.exerciseId)}
                        title="Quitar ejercicio"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#71717A] hover:text-red-400 transition"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Sets Rows - Mobile First Ergonomics with Ghost Data & Real-Time Hypertrophy Progression */}
                  <div className="space-y-2.5">
                    {ae.sets.map((set, setIdx) => {
                      const isDone = set.completed;
                      const prevSet = prevSession?.sets?.[setIdx];
                      const progression = getProgressionBadge(set, prevSet);

                      const setWeight = parseFloat(set.weight) || 0;
                      const setReps = parseInt(set.reps, 10) || 0;
                      const loadAdvice = getLoadAdvisor({
                        weight: setWeight,
                        reps: setReps,
                        trainingGoal: userProfile?.training_goal ?? "hipertrofia",
                        bodyweight: userProfile?.bodyweight ?? 70,
                        prWeight: rec?.pr_weight,
                      });

                      return (
                        <div
                          key={set.id ? `set-${set.id}` : `num-${set.setNumber}`}
                          className={`rounded-xl border p-2.5 transition duration-150 ${
                            isDone
                              ? "border-[#34D399]/40 bg-[#34D399]/[0.06]"
                              : "border-[#2D1B4E] bg-[#0E0919]"
                          }`}
                        >
                          {/* Main Numeric Controls Row with Wrapping Flexbox for Mobile */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Left Group: Set Badge + Weight + Reps */}
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap flex-1 min-w-0">
                              {/* Set Badge */}
                              <div className="flex h-11 w-9 sm:h-12 sm:w-10 flex-col items-center justify-center rounded-lg bg-[#140E24] border border-[#2D1B4E] text-xs font-black text-white flex-shrink-0">
                                <span>#{set.setNumber}</span>
                                {set.rest_effort && (
                                  <span className="text-[10px] leading-none mt-0.5" title={`Descanso: ${set.rest_effort}`}>
                                    {set.rest_effort === "pesado" ? "🔥" : set.rest_effort === "moderado" ? "⚡" : "⏱️"}
                                  </span>
                                )}
                              </div>

                              {/* Weight Input (kg) */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseFloat(set.weight) || 0;
                                    handleUpdateSet(
                                      ae.exerciseId,
                                      setIdx,
                                      "weight",
                                      Math.max(0, cur - 2.5)
                                    );
                                  }}
                                  className="oled-stepper-btn hidden md:flex"
                                  title="-2.5 kg"
                                >
                                  <Minus size={14} />
                                </button>

                                <div className="relative">
                                  <input
                                    type="number"
                                    step="any"
                                    inputMode="decimal"
                                    value={set.weight}
                                    onChange={(e) =>
                                      handleUpdateSet(
                                        ae.exerciseId,
                                        setIdx,
                                        "weight",
                                        e.target.value
                                      )
                                    }
                                    className="w-20 text-center px-2 py-2 text-base font-black rounded-lg border border-[#2D1B4E] bg-[#0E0919] text-white outline-none focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder={prevSet ? `${prevSet.weight}` : "kg"}
                                  />
                                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#71717A]">
                                    kg
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseFloat(set.weight) || 0;
                                    handleUpdateSet(
                                      ae.exerciseId,
                                      setIdx,
                                      "weight",
                                      cur + 2.5
                                    );
                                  }}
                                  className="oled-stepper-btn hidden md:flex"
                                  title="+2.5 kg"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              {/* Reps Input */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseInt(set.reps, 10) || 0;
                                    handleUpdateSet(
                                      ae.exerciseId,
                                      setIdx,
                                      "reps",
                                      Math.max(0, cur - 1)
                                    );
                                  }}
                                  className="oled-stepper-btn hidden md:flex"
                                  title="-1 rep"
                                >
                                  <Minus size={14} />
                                </button>

                                <div className="relative">
                                  <input
                                    type="number"
                                    step="1"
                                    inputMode="decimal"
                                    value={set.reps}
                                    onChange={(e) =>
                                      handleUpdateSet(
                                        ae.exerciseId,
                                        setIdx,
                                        "reps",
                                        e.target.value
                                      )
                                    }
                                    className="w-20 text-center px-2 py-2 text-base font-black rounded-lg border border-[#2D1B4E] bg-[#0E0919] text-white outline-none focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder={prevSet ? `${prevSet.reps}` : "reps"}
                                  />
                                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#71717A]">
                                    rep
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseInt(set.reps, 10) || 0;
                                    handleUpdateSet(
                                      ae.exerciseId,
                                      setIdx,
                                      "reps",
                                      cur + 1
                                    );
                                  }}
                                  className="oled-stepper-btn hidden md:flex"
                                  title="+1 rep"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Right Group: Check/Listo Button + Delete Button */}
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleSetCompleted(ae.exerciseId, setIdx)
                                }
                                title={isDone ? "Marcar pendiente" : "Marcar completada"}
                                className={`oled-check-btn ${
                                  isDone
                                    ? "oled-check-btn-done"
                                    : "oled-check-btn-pending"
                                }`}
                              >
                                <Check size={24} strokeWidth={isDone ? 3.5 : 2} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveSet(ae.exerciseId, setIdx)}
                                disabled={ae.sets.length <= 1}
                                className="min-h-[44px] min-w-[32px] flex items-center justify-center text-[#71717A] hover:text-red-400 disabled:opacity-20 transition"
                                title="Eliminar serie"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Ghost Data & Hypertrophy Progression Indicators Row */}
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-[#2D1B4E]/60 pt-1.5 text-[11px]">
                            <div className="flex items-center gap-2">
                              {prevSet ? (
                                <span className="text-[#A1A1AA] font-semibold">
                                  Última vez: <span className="text-white font-black">{prevSet.weight} kg</span> × <span className="text-white font-black">{prevSet.reps} reps</span>
                                </span>
                              ) : (
                                <span className="text-[#71717A] text-[10px] italic">
                                  {prevSession ? "Nueva serie (sin registro previo)" : "Primer registro de este ejercicio"}
                                </span>
                              )}

                              {prevSet && (
                                <button
                                  type="button"
                                  onClick={() => handleRepeatPreviousSet(ae.exerciseId, setIdx)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#A855F7]/40 bg-[#1C1433] px-2 py-0.5 text-[10px] font-black text-[#C084FC] hover:border-[#A855F7] hover:text-white active:scale-95 transition"
                                  title="Copiar peso y repeticiones de la última sesión con 1 toque"
                                >
                                  <RotateCcw size={10} />
                                  <span>Repetir carga previa</span>
                                </button>
                              )}
                            </div>

                            {progression && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black tracking-tight ${progression.className}`}
                              >
                                {progression.label}
                              </span>
                            )}
                          </div>

                          {/* Asesor Inteligente de Cargas & Fuerza Relativa */}
                          {(setWeight > 0 || setReps > 0) && (
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#2D1B4E]/40 pt-1.5 text-[10px]">
                              <div className="flex items-center gap-2 flex-wrap">
                                {loadAdvice?.relativeRatio && (
                                  <span className="inline-flex items-center gap-1 font-bold text-[#C084FC] bg-[#140E24] px-2 py-0.5 rounded-md border border-[#2D1B4E]">
                                    <Scale size={11} className="text-[#A855F7]" />
                                    <span>{setWeight}kg = {loadAdvice.relativeRatio}× tu peso</span>
                                  </span>
                                )}

                                {loadAdvice?.est1RM > 0 && setReps > 1 && (
                                  <span className="text-[#A1A1AA] bg-[#0E0919] px-2 py-0.5 rounded-md border border-[#2D1B4E]/60 font-semibold">
                                    1RM est: <strong className="text-white">{loadAdvice.est1RM} kg</strong>
                                  </span>
                                )}
                              </div>

                              {loadAdvice?.badge && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-black tracking-tight ${loadAdvice.badge.className}`}
                                  title={loadAdvice.badge.sublabel}
                                >
                                  {loadAdvice.badge.label}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* + Agregar Serie Button (Auto-fills with ghost or previous set!) */}
                  <button
                    type="button"
                    onClick={() => handleAddSet(ae.exerciseId)}
                    className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#A855F7]/40 bg-[#0E0919] py-2.5 text-xs font-black text-[#C084FC] hover:border-[#A855F7] hover:bg-[#1C1433] transition active:scale-[0.98]"
                  >
                    <Plus size={16} />
                    <span>
                      + Agregar Serie (copia {ae.sets[ae.sets.length - 1]?.weight || 0}kg × {ae.sets[ae.sets.length - 1]?.reps || 0} reps)
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Cierre del Entrenamiento (Prominent Mobile Action) */}
      {activeExercises.length > 0 && (
        <div className="rounded-2xl border-2 border-[#A855F7]/40 bg-[#140E24] p-4 sm:p-5 shadow-neon space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#9333EA]/20 text-xs font-black text-[#C084FC]">
                  4
                </span>
                <h3 className="text-base font-black text-white">
                  Resumen del Entrenamiento
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-[#A1A1AA]">
                Revisá tus marcas y sobrecarga progresiva antes de guardar.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-2">
                <span className="text-[10px] uppercase font-bold text-[#71717A]">
                  Ejercicios
                </span>
                <p className="text-base font-black text-white">
                  {activeExercises.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-2">
                <span className="text-[10px] uppercase font-bold text-[#71717A]">
                  Series Listas
                </span>
                <p className="text-base font-black text-[#34D399]">
                  {completedSetsCount}/{totalSetsCount}
                </p>
              </div>
              <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-2">
                <span className="text-[10px] uppercase font-bold text-[#71717A]">
                  Volumen
                </span>
                <p className="text-base font-black text-[#C084FC]">
                  {Math.round(totalVolume)} kg
                </p>
              </div>
            </div>
          </div>

          {/* Mental Effort Selector */}
          <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-[#C084FC]" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Métrica de Voluntad (Esfuerzo Mental)
                </span>
                <span className="text-[10px] text-[#71717A]">(Opcional)</span>
              </div>
              {mentalEffort && (
                <span className="rounded-md border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                  {mentalEffort}/5
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#A1A1AA]">
              ¿Cuánto esfuerzo mental y concentración te demandó esta sesión?
            </p>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
              {[
                { val: 1, label: "Paseo" },
                { val: 2, label: "Cómodo" },
                { val: 3, label: "Normal" },
                { val: 4, label: "Exigente" },
                { val: 5, label: "Épico" },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => handleSelectMentalEffort(item.val)}
                  className={`min-h-[44px] rounded-xl border text-xs font-black transition active:scale-95 flex flex-col items-center justify-center p-1 ${
                    mentalEffort === item.val
                      ? "border-[#A855F7] bg-[#9333EA]/25 text-[#E9D5FF] shadow-neon"
                      : "border-[#2D1B4E] bg-[#140E24] text-[#A1A1AA] hover:border-[#A855F7]/40 hover:text-white"
                  }`}
                >
                  <span className="text-sm">{item.val}</span>
                  <span className="text-[9px] font-medium text-[#71717A] truncate max-w-full">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
            {((readinessEnergy && readinessEnergy <= 2) || (mentalEffort && mentalEffort >= 4)) && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300">
                <Sparkles size={14} className="flex-shrink-0 text-amber-400" />
                <span>¡Esta sesión califica para Reconocimiento de Voluntad de Hierro!</span>
              </div>
            )}
          </div>

          {/* Notes Input */}
          <div>
            <textarea
              rows={2}
              placeholder="Notas de la sesión (sensaciones, molestias, progresión)..."
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              className="w-full rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3 text-xs text-white outline-none placeholder:text-[#71717A] focus:border-[#A855F7]"
            />
          </div>

          {/* Big Action Save Button (XL Tactile Min 52px) */}
          <button
            type="button"
            onClick={handleFinishWorkout}
            disabled={isSaving}
            className="oled-btn-primary w-full min-h-[52px] py-3.5 text-sm sm:text-base tracking-wide"
          >
            {isSaving ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                <span>Guardando sesión...</span>
              </>
            ) : (
              <>
                <Trophy size={22} />
                <span>FINALIZAR Y GUARDAR ENTRENAMIENTO</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Celebration Modal when workout finishes */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-[#A855F7] bg-[#140E24] p-6 shadow-neonLg text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#9333EA] to-[#7E22CE] shadow-neon">
              <Trophy size={32} className="text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">
                ¡ENTRENAMIENTO GUARDADO!
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#A1A1AA]">
                Excelente sesión. Tus cargas y marcas personales han sido registradas.
              </p>
            </div>

            {completedSummary.isOfflineSaved && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left flex items-center gap-2.5 text-xs text-amber-200">
                <CloudOff size={18} className="text-amber-400 flex-shrink-0" />
                <span>
                  Guardado localmente en modo Offline. Tus marcas y series se sincronizarán automáticamente con la nube cuando vuelvas a tener conexión.
                </span>
              </div>
            )}

            {/* Willpower recognition banner */}
            {completedSummary.isWillpowerDay && (
              <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 p-3.5 text-left shadow-neon">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
                  <Brain size={18} className="text-amber-400" />
                  <span>★ Reconocimiento: Voluntad de Hierro</span>
                </div>
                <p className="mt-1 text-xs text-[#E4E4E7]">
                  {completedSummary.readinessEnergy && completedSummary.readinessEnergy <= 2
                    ? "Entrenaste con los niveles de energía bajos y cumpliste sin excusas. La verdadera disciplina se forja en estos días difíciles."
                    : "Superaste una sesión de alta exigencia mental. La consistencia en días duros es lo que construye resultados duraderos."}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-bold">
                  {completedSummary.readinessEnergy && (
                    <span className="rounded-md bg-[#09060E]/80 px-2 py-0.5 text-amber-300 border border-amber-500/30">
                      ⚡ Energía: {completedSummary.readinessEnergy}/5
                    </span>
                  )}
                  {completedSummary.readinessMotivation && (
                    <span className="rounded-md bg-[#09060E]/80 px-2 py-0.5 text-orange-300 border border-orange-500/30">
                      🔥 Motivación: {completedSummary.readinessMotivation}/5
                    </span>
                  )}
                  {completedSummary.mentalEffort && (
                    <span className="rounded-md bg-[#09060E]/80 px-2 py-0.5 text-purple-300 border border-purple-500/30">
                      🧠 Esfuerzo Mental: {completedSummary.mentalEffort}/5
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Broken PRs celebration */}
            {completedSummary.brokenPRs.length > 0 && (
              <div className="rounded-xl border border-[#C084FC]/40 bg-[#C084FC]/10 p-3 text-left">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#C084FC]">
                  <Sparkles size={14} />
                  <span>¡RÉCORDS PERSONALES BATIDOS HOY!</span>
                </div>
                <div className="mt-2 space-y-1">
                  {completedSummary.brokenPRs.map((b, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs font-bold text-white"
                    >
                      <span>{b.name}</span>
                      <span className="text-[#34D399]">
                        {b.oldPr} kg ➔ {b.newPr} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Volume Overload Badge in Modal */}
            {completedSummary.volumeGainedExercises > 0 && (
              <div className="rounded-xl border border-[#34D399]/40 bg-[#34D399]/10 p-3 text-left">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#34D399]">
                  <ArrowUpRight size={16} />
                  <span>¡SOBRECARGA PROGRESIVA LOGRADA!</span>
                </div>
                <p className="mt-1 text-xs text-[#A1A1AA]">
                  Superaste el volumen de entrenamiento previo en {completedSummary.volumeGainedExercises} {completedSummary.volumeGainedExercises === 1 ? "ejercicio" : "ejercicios"}.
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#71717A]">
                  Ejercicios
                </span>
                <p className="text-lg font-black text-white">
                  {completedSummary.exerciseCount}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#71717A]">
                  Series
                </span>
                <p className="text-lg font-black text-[#34D399]">
                  {completedSummary.setsCount}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#71717A]">
                  Volumen
                </span>
                <p className="text-lg font-black text-[#C084FC]">
                  {Math.round(completedSummary.volume)} kg
                </p>
              </div>
            </div>


            <button
              type="button"
              onClick={() => setCompletedSummary(null)}
              className="oled-btn-primary w-full min-h-[48px] py-3 text-sm font-black"
            >
              Comenzar Nueva Sesión
            </button>
          </div>
        </div>
      )}

      {/* Smart & Adaptive Hypertrophy Rest Timer (Focus Mode) */}
      <RestTimerModal
        isOpen={showRestTimer}
        onClose={() => setShowRestTimer(false)}
        setInfo={currentRestInfo}
        onSelectEffort={handleRestEffortSelected}
      />
    </div>
  );
}


