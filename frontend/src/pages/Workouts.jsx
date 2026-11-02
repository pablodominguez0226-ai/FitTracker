import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Trophy, X } from "lucide-react";
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
  getUserProfile,
  getWorkouts,
  saveWorkout,
  startWorkout,
  startWorkoutFromRoutine,
  updateRoutineExercises,
  createRoutine,
  getRoutines,
} from "../api/client";
import {
  ACTIVE_SESSION_CACHE_KEY,
  readActiveSessionCache,
  writeActiveSessionCache,
  clearActiveSessionCache,
} from "../context/WorkoutContext";

import ActiveWorkoutSession from "../components/ActiveWorkoutSession";
import CreateExerciseModal from "../components/CreateExerciseModal";
import ExerciseSelectorModal from "../components/ExerciseSelectorModal";
import WorkoutSummaryModal from "../components/WorkoutSummaryModal";
import { showToast } from "../components/Toast";
import { getLocalDateString } from "../utils/dateUtils";
import { getExerciseEquipment } from "../utils/fitnessUtils";
import {
  PERIODIZATION_MODES,
  getWeeklyPeriodizationMode,
  setWeeklyPeriodizationMode,
} from "../utils/periodization";
import { resolveRoutineExercises } from "../utils/routines";
import {
  enqueueSyncAction,
  getPendingQueue,
  isOnline,
  processSyncQueue,
} from "../utils/syncQueue";
import { analyzeWorkoutSession } from "../utils/workoutAnalytics";
import {
  getCachedMuscleGroups,
  getCachedExercises,
  syncCatalogCache,
} from "../services/exerciseCache";

export { getExerciseEquipment };

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
  const navigate = useNavigate();
  const location = useLocation();

  const initialCache = useMemo(() => readActiveSessionCache(), []);

  const activeSessionIdRef = useRef(initialCache?.activeSessionId || null);
  const sessionPromiseRef = useRef(null);
  const latestSessionStateRef = useRef(null);

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
    return user
      ? `fittracker_active_session_${user.id}`
      : "fittracker_active_session";
  }, [user]);

  const sessionStartedKey = useMemo(() => {
    return user
      ? `fittracker_session_started_at_${user.id}`
      : "fittracker_session_started_at";
  }, [user]);

  const [muscleGroups, setMuscleGroups] = useState([]);
  const [allExercises, setAllExercises] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMuscleId, setSelectedMuscleId] = useState(
    () => initialCache?.selectedMuscleId ?? null
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Active workout session state
  const [activeSessionId, setActiveSessionId] = useState(
    () => initialCache?.activeSessionId || null
  );
  const [activeExercises, setActiveExercises] = useState(() =>
    Array.isArray(initialCache?.activeExercises)
      ? initialCache.activeExercises
      : []
  );
  const [workoutDate, setWorkoutDate] = useState(
    () => initialCache?.workoutDate || getLocalDateString()
  );
  const [workoutNotes, setWorkoutNotes] = useState(
    () => initialCache?.workoutNotes || ""
  );

  // Finishing / Summary state
  const [isSaving, setIsSaving] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Rutina Base y Modales
  const [baseRoutine, setBaseRoutine] = useState(
    () => initialCache?.baseRoutine || null
  );
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [saveToPermanentRoutine, setSaveToPermanentRoutine] = useState(false);
  const [saveAsNewRoutine, setSaveAsNewRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");

  const [sessionStartedAt, setSessionStartedAt] = useState(() => {
    if (initialCache?.sessionStartedAt) {
      return Number(initialCache.sessionStartedAt);
    }
    try {
      const uKey = propCurrentUser?.id
        ? `fittracker_session_started_at_${propCurrentUser.id}`
        : null;
      const saved =
        (uKey ? localStorage.getItem(uKey) : null) ||
        localStorage.getItem(SESSION_STARTED_AT_KEY);
      return saved ? parseInt(saved, 10) : Date.now();
    } catch {
      return Date.now();
    }
  });

  const hasRoutineChanges = useMemo(() => {
    if (!baseRoutine || !baseRoutine.exercises) return false;
    const baseIds = baseRoutine.exercises.map((e) => e.exerciseId || e.id);
    const currentIds = (activeExercises || []).map((e) => e.exerciseId);
    if (baseIds.length !== currentIds.length) return true;
    return baseIds.some((id, idx) => id !== currentIds[idx]);
  }, [baseRoutine, activeExercises]);

  const recordsMap = useMemo(() => {
    const map = {};
    const list = Array.isArray(records)
      ? records
      : records && typeof records === "object"
      ? Object.values(records)
      : [];
    list.forEach((pe) => {
      if (pe?.exercise_id) map[pe.exercise_id] = pe;
    });
    return map;
  }, [records]);

  const totalSetsCount = useMemo(() => {
    const list = Array.isArray(activeExercises) ? activeExercises : [];
    return list.reduce(
      (acc, ex) =>
        acc + (Array.isArray(ex?.sets) && ex.sets.length > 0 ? ex.sets.length : 1),
      0
    );
  }, [activeExercises]);

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

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    const hasSessionState =
      (Array.isArray(activeExercises) && activeExercises.length > 0) ||
      Boolean(activeSessionId);

    if (!hasSessionState) {
      latestSessionStateRef.current = null;
      return;
    }

    const payload = {
      activeSessionId,
      activeExercises,
      workoutNotes,
      workoutDate: workoutDate || getLocalDateString(),
      selectedMuscleId,
      sessionStartedAt,
      baseRoutine,
      savedAt: new Date().toISOString(),
      userId: user?.id,
    };

    latestSessionStateRef.current = payload;
    writeActiveSessionCache(payload);
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  }, [
    activeSessionId,
    activeExercises,
    workoutNotes,
    workoutDate,
    selectedMuscleId,
    sessionStartedAt,
    baseRoutine,
    storageKey,
    user?.id,
  ]);

  useEffect(() => {
    const flushSessionToCacheSync = () => {
      try {
        const snapshot = latestSessionStateRef.current;
        if (
          snapshot &&
          ((snapshot.activeExercises && snapshot.activeExercises.length > 0) ||
            snapshot.activeSessionId)
        ) {
          const serialized = JSON.stringify({
            ...snapshot,
            savedAt: new Date().toISOString(),
          });
          localStorage.setItem(ACTIVE_SESSION_CACHE_KEY, serialized);
          localStorage.setItem(storageKey, serialized);
        }
      } catch {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushSessionToCacheSync();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", flushSessionToCacheSync);
    window.addEventListener("pagehide", flushSessionToCacheSync);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", flushSessionToCacheSync);
      window.removeEventListener("pagehide", flushSessionToCacheSync);
    };
  }, [storageKey]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [groups, recs, allExList, activeSession, cycleData] =
          await Promise.all([
            getMuscleGroups().catch(() => getCachedMuscleGroups()),
            getRecords().catch(() => []),
            getExercises().catch(() => getCachedExercises()),
            getActiveWorkout().catch(() => null),
            getCycleStatus().catch(() => null),
          ]);

        const safeGroups =
          Array.isArray(groups) && groups.length > 0
            ? groups
            : getCachedMuscleGroups();
        const safeRecs = Array.isArray(recs)
          ? recs
          : recs && typeof recs === "object"
          ? Object.values(recs)
          : [];
        const safeAllExList =
          Array.isArray(allExList) && allExList.length > 0
            ? allExList
            : getCachedExercises();

        setMuscleGroups(safeGroups);
        setRecords(safeRecs);
        setAllExercises(safeAllExList);

        if (cycleData && cycleData.status) {
          const autoMode =
            cycleData.status === "deload"
              ? PERIODIZATION_MODES.DELOAD
              : PERIODIZATION_MODES.OVERLOAD;
          setWeeklyPeriodizationMode(autoMode);
        }

        let initialMuscleId = safeGroups.length > 0 ? safeGroups[0].id : null;
        const exMapById = {};
        safeAllExList.forEach((e) => {
          if (e?.id) exMapById[e.id] = e;
        });

        const cachedSession = readActiveSessionCache();

        if (activeSession && activeSession.status === "in_progress") {
          setActiveSessionId(activeSession.id);
          activeSessionIdRef.current = activeSession.id;
          if (activeSession.date) setWorkoutDate(activeSession.date);
          if (activeSession.muscle_group_id)
            initialMuscleId = activeSession.muscle_group_id;
          if (activeSession.notes) setWorkoutNotes(activeSession.notes);

          const grouped = {};
          const sessionSets = Array.isArray(activeSession.sets)
            ? activeSession.sets
            : activeSession.sets && typeof activeSession.sets === "object"
            ? Object.values(activeSession.sets)
            : [];
          sessionSets.forEach((s) => {
            if (!s || !s.exercise_id) return;
            const catEx = exMapById[s.exercise_id];
            if (!grouped[s.exercise_id]) {
              grouped[s.exercise_id] = {
                exerciseId: s.exercise_id,
                exerciseName:
                  s.exercise_name ||
                  catEx?.name ||
                  `Ejercicio #${s.exercise_id}`,
                muscleGroupId:
                  catEx?.muscle_group_id || activeSession.muscle_group_id,
                muscleGroupName: catEx?.muscle_group_name || null,
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

          if (cachedSession && Array.isArray(cachedSession.activeExercises)) {
            cachedSession.activeExercises.forEach((cEx) => {
              if (!cEx || !cEx.exerciseId) return;
              const catEx = exMapById[cEx.exerciseId];
              if (!grouped[cEx.exerciseId]) {
                grouped[cEx.exerciseId] = {
                  ...cEx,
                  muscleGroupId: catEx?.muscle_group_id || cEx.muscleGroupId,
                  muscleGroupName:
                    catEx?.muscle_group_name || cEx.muscleGroupName || null,
                };
              } else if (
                Array.isArray(cEx.sets) &&
                cEx.sets.length > grouped[cEx.exerciseId].sets.length
              ) {
                grouped[cEx.exerciseId].sets = cEx.sets;
              }
            });
          }

          setActiveExercises(Object.values(grouped));
        } else if (
          cachedSession &&
          Array.isArray(cachedSession.activeExercises) &&
          cachedSession.activeExercises.length > 0
        ) {
          setActiveExercises(cachedSession.activeExercises);
        }

        if (initialMuscleId) {
          setSelectedMuscleId(initialMuscleId);
        }
      } catch (err) {
        console.error("Error cargando datos iniciales:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const ensureActiveSession = async (muscleId = selectedMuscleId) => {
    if (activeSessionIdRef.current) return activeSessionIdRef.current;
    if (sessionPromiseRef.current) return sessionPromiseRef.current;

    sessionPromiseRef.current = (async () => {
      try {
        const session = await startWorkout({
          date: workoutDate,
          muscle_group_id: muscleId,
          notes: workoutNotes.trim() || null,
          sport_type: "strength",
        });
        setActiveSessionId(session.id);
        activeSessionIdRef.current = session.id;
        return session.id;
      } catch {
        return null;
      } finally {
        sessionPromiseRef.current = null;
      }
    })();

    return sessionPromiseRef.current;
  };

  const handleStartRoutine = useCallback(
    async (routine) => {
      const resolved = resolveRoutineExercises(
        routine,
        allExercises,
        muscleGroups
      );
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
        } catch {}
      }

      setActiveExercises((prev) => {
        const prevList = Array.isArray(prev) ? prev : [];
        const hasCompletedSets = prevList.some(
          (ex) => (ex?.sets || []).length > 0
        );
        if (hasCompletedSets) {
          const existingIds = new Set(prevList.map((e) => e.exerciseId));
          const toAdd = resolved.filter((r) => !existingIds.has(r.exerciseId));
          return [...prevList, ...toAdd];
        }
        return resolved;
      });

      ensureActiveSession(primaryMuscleId);
    },
    [allExercises, muscleGroups, selectedMuscleId]
  );

  // Cargar rutina enviada desde Bitácora, Rutinas o Catálogo
  useEffect(() => {
    if (location.state?.loadRoutine && allExercises.length > 0) {
      const routineToLoad = location.state.loadRoutine;
      window.history.replaceState({}, document.title);
      handleStartRoutine(routineToLoad);
    }
  }, [location.state, allExercises, handleStartRoutine]);

  const handleAddExercisesList = (selectedList) => {
    const items = Array.isArray(selectedList)
      ? selectedList
      : selectedList
      ? [selectedList]
      : [];
    if (items.length === 0) return;

    if (!localStorage.getItem(sessionStartedKey)) {
      const nowMs = Date.now();
      localStorage.setItem(sessionStartedKey, String(nowMs));
      setSessionStartedAt(nowMs);
      window.dispatchEvent(
        new CustomEvent("fittracker:sessionTimerChanged", {
          detail: { startedAt: nowMs },
        })
      );
    }

    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const existingIds = new Set(prevList.map((ae) => ae.exerciseId));
      const additions = items
        .filter((ex) => ex && ex.id && !existingIds.has(ex.id))
        .map((ex) => ({
          exerciseId: ex.id,
          exerciseName: ex.name || "Ejercicio",
          muscleGroupId: ex.muscle_group_id,
          muscleGroupName: ex.muscle_group_name || null,
          sets: [],
        }));
      return [...prevList, ...additions];
    });
    setIsAddExerciseModalOpen(false);
  };

  const handleRemoveExerciseFromSession = (exerciseId) => {
    setActiveExercises((prev) =>
      (Array.isArray(prev) ? prev : []).filter(
        (ae) => ae.exerciseId !== exerciseId
      )
    );
  };

  const handleAddSet = async (exerciseId, setData) => {
    const ex = (allExercises || []).find((e) => e?.id === exerciseId);
    const exerciseName =
      ex?.name || (exerciseId ? `Ejercicio #${exerciseId}` : "Ejercicio");
    const muscleGroupId = ex?.muscle_group_id || selectedMuscleId;

    const tempSetId =
      setData.id ||
      `temp_set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nextWeight = parseFloat(setData.weight) || 0;
    const nextReps = parseInt(setData.reps, 10) || 10;
    let targetSetNumber = setData.setNumber || 1;
    const isCurrentlyOffline = !isOnline();

    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const existing = prevList.find((item) => item.exerciseId === exerciseId);
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
          set_type: "normal",
        };
        return prevList.map((item) =>
          item.exerciseId === exerciseId
            ? { ...item, sets: [...existingSets, newSet] }
            : item
        );
      } else {
        targetSetNumber = 1;
        const newSet = {
          id: tempSetId,
          setNumber: 1,
          weight: nextWeight,
          reps: nextReps,
          completed: true,
          is_offline: isCurrentlyOffline,
          set_type: "normal",
        };
        return [
          ...prevList,
          {
            exerciseId,
            exerciseName,
            muscleGroupId,
            sets: [newSet],
          },
        ];
      }
    });

    (async () => {
      if (isCurrentlyOffline) {
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
              set_type: "normal",
            },
          },
        });
        return;
      }

      try {
        const sessionId = await ensureActiveSession(muscleGroupId);
        if (sessionId) {
          const saved = await addWorkoutSet(sessionId, {
            exercise_id: exerciseId,
            set_number: targetSetNumber,
            weight: nextWeight,
            reps: nextReps,
            completed: true,
            set_type: "normal",
          });
          setActiveExercises((prev) =>
            (Array.isArray(prev) ? prev : []).map((item) =>
              item.exerciseId === exerciseId
                ? {
                    ...item,
                    sets: (item.sets || []).map((s) =>
                      s.id === tempSetId
                        ? { ...s, id: saved.id, is_offline: false }
                        : s
                    ),
                  }
                : item
            )
          );
        }
      } catch {
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
              set_type: "normal",
            },
          },
        });
      }
    })();
  };

  const handleUpdateSet = (exerciseId, setIndex, updatedFields) => {
    setActiveExercises((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) => {
        if (item.exerciseId !== exerciseId) return item;
        const nextSets = (item.sets || []).map((s, idx) =>
          idx === setIndex ? { ...s, ...updatedFields } : s
        );
        return { ...item, sets: nextSets };
      })
    );
  };

  const handleRemoveSet = async (exerciseId, setIndex) => {
    let setToRemove = null;

    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const exItem = prevList.find((ae) => ae?.exerciseId === exerciseId);
      if (!exItem || !Array.isArray(exItem.sets) || !exItem.sets[setIndex])
        return prevList;
      setToRemove = exItem.sets[setIndex];

      return prevList.map((item) => {
        if (item.exerciseId !== exerciseId) return item;
        const filtered = (item.sets || []).filter((_, idx) => idx !== setIndex);
        const renumbered = filtered.map((s, idx) => ({
          ...s,
          setNumber: idx + 1,
        }));
        return { ...item, sets: renumbered };
      });
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

  const handleFinishWorkout = () => {
    if ((activeExercises || []).length === 0) {
      showToast("Agregá al menos un ejercicio a la sesión", "info");
      return;
    }

    if (baseRoutine) {
      setSaveToPermanentRoutine(hasRoutineChanges);
      setSaveAsNewRoutine(false);
    } else {
      setSaveToPermanentRoutine(false);
      setSaveAsNewRoutine(false);
      const firstEx = (activeExercises || [])[0];
      const mgName = firstEx?.muscleGroupId
        ? muscleGroups.find((m) => m.id === firstEx.muscleGroupId)?.name || ""
        : "";
      const dayNames = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ];
      const todayDay = dayNames[new Date().getDay()] || "Lunes";
      setNewRoutineName(mgName ? `${mgName} ${todayDay}` : `Torso ${todayDay}`);
    }
    setIsFinishConfirmOpen(true);
  };

  const executeFinishWorkout = async (
    shouldSavePermanent = false,
    shouldSaveAsNew = false,
    customRoutineName = ""
  ) => {
    const payloadSets = [];
    const safeExercises = Array.isArray(activeExercises) ? activeExercises : [];

    safeExercises.forEach((ex) => {
      if (!ex) return;
      const safeSets = Array.isArray(ex.sets) ? ex.sets : [];
      if (safeSets.length > 0) {
        safeSets.forEach((s, idx) => {
          payloadSets.push({
            id: s.id,
            exercise_id: ex.exerciseId,
            set_number: idx + 1,
            weight: parseFloat(s.weight) || 0.0,
            reps: parseInt(s.reps, 10) || 10,
            completed: true,
            set_type: s.set_type || "normal",
          });
        });
      } else {
        // Si el usuario pulsó "Listo" sin tocar ✓ en la fila, guardar 1 serie base
        payloadSets.push({
          exercise_id: ex.exerciseId,
          set_number: 1,
          weight: 0.0,
          reps: 10,
          completed: true,
          set_type: "normal",
        });
      }
    });

    if (payloadSets.length === 0) return;

    try {
      setIsSaving(true);
      setErrorMessage("");

      if (shouldSavePermanent && baseRoutine?.id && isOnline()) {
        try {
          const exercisesPayload = safeExercises.map((ae, idx) => ({
            exercise_id: ae.exerciseId,
            order_index: idx,
            target_sets:
              Array.isArray(ae.sets) && ae.sets.length > 0 ? ae.sets.length : 4,
            target_reps: "8-12",
          }));
          await updateRoutineExercises(baseRoutine.id, exercisesPayload);
        } catch {}
      }

      if (
        shouldSaveAsNew &&
        customRoutineName &&
        customRoutineName.trim() &&
        isOnline()
      ) {
        try {
          const exercisesPayload = safeExercises.map((ae, idx) => ({
            exercise_id: ae.exerciseId,
            order_index: idx,
            target_sets:
              Array.isArray(ae.sets) && ae.sets.length > 0 ? ae.sets.length : 4,
            target_reps: "8-12",
          }));
          await createRoutine({
            name: customRoutineName.trim(),
            description: `Rutina creada a partir de la sesión del ${workoutDate}`,
            exercises: exercisesPayload,
          });
        } catch {}
      }

      const rawStarted =
        localStorage.getItem(sessionStartedKey) ||
        localStorage.getItem(SESSION_STARTED_AT_KEY);
      const startedMs = rawStarted
        ? parseInt(rawStarted, 10)
        : sessionStartedAt;
      const durationSeconds = startedMs
        ? Math.max(1, Math.floor((Date.now() - startedMs) / 1000))
        : 60;

      const finishDataPayload = {
        date: workoutDate,
        notes: workoutNotes.trim() || null,
        sport_type: "strength",
        duration_seconds: durationSeconds,
        save_as_routine: Boolean(shouldSaveAsNew),
        routine_name:
          customRoutineName && customRoutineName.trim()
            ? customRoutineName.trim()
            : null,
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
          if (
            !err.response ||
            err.code === "ERR_NETWORK" ||
            err.message?.includes("Network")
          ) {
            isOfflineSaved = true;
          } else {
            throw err;
          }
        }
      } else {
        isOfflineSaved = true;
      }

      if (isOfflineSaved) {
        enqueueSyncAction({
          type: "SAVE_WORKOUT",
          payload: {
            date: workoutDate,
            muscle_group_id: selectedMuscleId,
            sets: payloadSets,
            ...finishDataPayload,
          },
        });
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
        totalVolumeKg:
          analytics.totalVolumeKg || saved?.total_volume || totalVolume,
        total_volume:
          analytics.totalVolumeKg || saved?.total_volume || totalVolume,
        prsBroken: saved?.broken_records || analytics.prsBroken || [],
        pr_count: saved?.pr_count ?? analytics.prsBroken?.length ?? 0,
        activeExercises,
        exercises: activeExercises,
        isOfflineSaved,
      });

      try {
        latestSessionStateRef.current = null;
        clearActiveSessionCache(user?.id);
        localStorage.removeItem(storageKey);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(sessionStartedKey);
        localStorage.removeItem(SESSION_STARTED_AT_KEY);
        window.dispatchEvent(
          new CustomEvent("fittracker:sessionTimerChanged", {
            detail: { startedAt: null },
          })
        );
        window.dispatchEvent(
          new CustomEvent("fittracker:workoutFinished", {
            detail: { date: workoutDate },
          })
        );
      } catch {}

      setActiveSessionId(null);
      setActiveExercises([]);
      setWorkoutNotes("");
      setBaseRoutine(null);
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
      activeExercises.length > 0 &&
      !window.confirm(
        "¿Seguro que querés descartar el entrenamiento actual? Se borrarán las series registradas."
      )
    ) {
      return;
    }
    if (activeSessionId) {
      try {
        await deleteWorkout(activeSessionId);
      } catch {}
    }
    try {
      latestSessionStateRef.current = null;
      clearActiveSessionCache(user?.id);
      localStorage.removeItem(storageKey);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(sessionStartedKey);
      localStorage.removeItem(SESSION_STARTED_AT_KEY);
      window.dispatchEvent(
        new CustomEvent("fittracker:sessionTimerChanged", {
          detail: { startedAt: null },
        })
      );
    } catch {}
    setActiveSessionId(null);
    setActiveExercises([]);
    setWorkoutNotes("");
    setBaseRoutine(null);
    navigate("/train");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-red-600 dark:text-red-400">
        <Loader2 size={34} className="animate-spin" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Cargando entrenamiento activo...
        </p>
      </div>
    );
  }

  return (
    <>
      {errorMessage && (
        <div className="mb-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* MÓDULO 4: LOGGER DE ENTRENAMIENTO EN VIVO (ActiveWorkoutSession) */}
      <ActiveWorkoutSession
        activeExercises={activeExercises}
        allExercises={allExercises}
        sessionStartedAt={sessionStartedAt}
        onBack={() => navigate(-1)}
        onDiscard={handleDiscardWorkout}
        onFinish={handleFinishWorkout}
        onOpenAddExercise={() => setIsAddExerciseModalOpen(true)}
        onAddSet={handleAddSet}
        onUpdateSet={handleUpdateSet}
        onRemoveSet={handleRemoveSet}
        onRemoveExercise={handleRemoveExerciseFromSession}
        isSaving={isSaving}
      />

      {/* Modal: Catálogo de Ejercicios con Filtro Muscular y Detalle Técnico */}
      <ExerciseSelectorModal
        isOpen={isAddExerciseModalOpen}
        onClose={() => setIsAddExerciseModalOpen(false)}
        title="Agregar"
        initialMuscleId={selectedMuscleId}
        allExercises={allExercises}
        muscleGroups={muscleGroups}
        recordsMap={recordsMap}
        onSelect={(ex) => handleAddExercisesList([ex])}
        onSelectMultiple={(exList) => handleAddExercisesList(exList)}
        onExerciseCreated={(created) => {
          setAllExercises((prev) => [created, ...(prev || [])]);
        }}
      />

      {/* Modal: Crear Nuevo Ejercicio */}
      <CreateExerciseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onExerciseCreated={(created) => {
          setAllExercises((prev) => [created, ...(prev || [])]);
          handleAddExercisesList([created]);
        }}
        muscleGroups={muscleGroups}
        initialMuscleId={selectedMuscleId}
      />

      {/* Modal de Confirmación para Finalizar Entrenamiento */}
      {isFinishConfirmOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-md bg-white dark:bg-[#121824] border border-slate-100 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[88dvh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white font-bold">
                  <Trophy size={16} />
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Finalizar Entrenamiento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFinishConfirmOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Vas a guardar la sesión con{" "}
                <strong className="text-slate-900 dark:text-white">
                  {activeExercises.length}{" "}
                  {activeExercises.length === 1 ? "ejercicio" : "ejercicios"}
                </strong>{" "}
                y{" "}
                <strong className="text-slate-900 dark:text-white">
                  {totalSetsCount} series
                </strong>
                .
              </p>

              {!baseRoutine && (
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#1a2234] p-3.5 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveAsNewRoutine}
                      onChange={(e) => setSaveAsNewRoutine(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-[#EF4444] cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Guardar como nueva rutina
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Crea una plantilla con estos ejercicios para repetirla otro día.
                      </span>
                    </div>
                  </label>

                  {saveAsNewRoutine && (
                    <input
                      type="text"
                      value={newRoutineName}
                      onChange={(e) => setNewRoutineName(e.target.value)}
                      placeholder="Nombre de la rutina..."
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 dark:border-slate-800 flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsFinishConfirmOpen(false)}
                className="h-12 px-5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  executeFinishWorkout(
                    saveToPermanentRoutine,
                    saveAsNewRoutine,
                    newRoutineName
                  )
                }
                className="flex-1 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
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
        onClose={() => {
          setCompletedSummary(null);
          navigate("/records");
        }}
        date={completedSummary?.date}
        summary={completedSummary}
        isOfflineSaved={completedSummary?.isOfflineSaved}
      />
    </>
  );
}
