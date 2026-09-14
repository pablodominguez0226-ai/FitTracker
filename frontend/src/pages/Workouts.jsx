import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRightLeft,
  Check,
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
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  addWorkoutSet,
  deleteWorkout,
  deleteWorkoutSet,
  finishWorkout,
  getActiveWorkout,
  getExercises,
  getMuscleGroups,
  getRecords,
  getUserProfile,
  saveWorkout,
  startWorkout,
  updateWorkoutDate,
} from "../api/client";
import ExerciseLogger from "../components/ExerciseLogger";
import WorkoutHeader from "../components/WorkoutHeader";
import WorkoutSummaryModal from "../components/WorkoutSummaryModal";
import { getLocalDateString, formatDateLong } from "../utils/dateUtils";
import { getExerciseEquipment } from "../utils/fitnessUtils";
import {
  PERIODIZATION_MODES,
  getWeeklyPeriodizationMode,
  setWeeklyPeriodizationMode,
} from "../utils/periodization";
import { enqueueSyncAction, getPendingQueue, isOnline, processSyncQueue } from "../utils/syncQueue";
import { analyzeWorkoutSession } from "../utils/workoutAnalytics";

export { getExerciseEquipment };

// Helper for muscle icon
function getMuscleIcon(name = "") {
  const n = (name || "").toLowerCase();
  if (n.includes("pecho")) return Flame;
  if (n.includes("espalda")) return Layers;
  if (n.includes("pierna") || n.includes("cuádriceps") || n.includes("femoral")) return Zap;
  if (n.includes("hombro")) return Target;
  if (n.includes("brazo") || n.includes("bíceps") || n.includes("tríceps")) return Dumbbell;
  if (n.includes("core") || n.includes("abs") || n.includes("abdomen")) return Activity;
  return Dumbbell;
}

export default function Workouts() {
  const navigate = useNavigate();

  // Data states
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [allExercises, setAllExercises] = useState([]);
  const [records, setRecords] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 3-Step Selection States
  const [selectedMuscleId, setSelectedMuscleId] = useState(null);
  const [equipmentFilter, setEquipmentFilter] = useState("Barra"); // Barra | Mancuerna | Polea | Máquina
  const [exerciseSearch, setExerciseSearch] = useState("");

  // Focus Mode States
  const [focusExercise, setFocusExercise] = useState(null);
  const [secondExercise, setSecondExercise] = useState(null);
  const [activeSlot, setActiveSlot] = useState("A"); // "A" | "B"

  // Active workout session state
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeExercises, setActiveExercises] = useState([]);
  // [{ exerciseId, exerciseName, muscleGroupId, sets: [{ id, setNumber, weight, reps, completed }] }]
  const [workoutDate, setWorkoutDate] = useState(() => getLocalDateString());
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [syncStatus, setSyncStatus] = useState("synced"); // 'synced' | 'saving' | 'offline'
  const [isDeviceOnline, setIsDeviceOnline] = useState(() => isOnline());
  const [pendingQueueCount, setPendingQueueCount] = useState(() => getPendingQueue().length);

  // Finishing / Summary state
  const [isSaving, setIsSaving] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Periodization mode state (Semana Dura vs Descarga)
  const [periodizationMode, setPeriodizationMode] = useState(() => getWeeklyPeriodizationMode());

  const LOCAL_STORAGE_KEY = "fittracker_active_session";

  // Listen to offline/online and periodization events
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

    const handlePeriodizationChange = (e) => {
      if (e.detail) {
        setPeriodizationMode(e.detail);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("fittracker:syncQueueChanged", handleQueueChange);
    window.addEventListener("fittracker:setIdSynced", handleSetIdSynced);
    window.addEventListener("fittracker:periodizationChanged", handlePeriodizationChange);

    if (isOnline()) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("fittracker:syncQueueChanged", handleQueueChange);
      window.removeEventListener("fittracker:setIdSynced", handleSetIdSynced);
      window.removeEventListener("fittracker:periodizationChanged", handlePeriodizationChange);
    };
  }, []);

  const saveToLocalStorage = (sessionId, exercisesList, notes, date, muscleId) => {
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
          savedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn("Error guardando en localStorage:", e);
    }
  };

  // Initial load
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [groups, recs, allExList, activeSession, profile] = await Promise.all([
          getMuscleGroups(),
          getRecords(),
          getExercises(), // all exercises for quick 0ms filtering
          getActiveWorkout().catch(() => null),
          getUserProfile().catch(() => null),
        ]);

        setMuscleGroups(groups || []);
        setRecords(recs || []);
        setAllExercises(allExList || []);
        if (profile) setUserProfile(profile);

        let initialMuscleId = groups.length > 0 ? groups[0].id : null;

        if (activeSession && activeSession.status === "in_progress") {
          setActiveSessionId(activeSession.id);
          if (activeSession.date) setWorkoutDate(activeSession.date);
          if (activeSession.muscle_group_id) initialMuscleId = activeSession.muscle_group_id;
          if (activeSession.notes) setWorkoutNotes(activeSession.notes);

          // Group sets by exercise_id
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
            });
          });

          const restored = Object.values(grouped);
          setActiveExercises(restored);
        } else {
          // Check localStorage draft
          try {
            const rawDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (rawDraft) {
              const draft = JSON.parse(rawDraft);
              if (draft.activeExercises && draft.activeExercises.length > 0) {
                setActiveExercises(draft.activeExercises);
                if (draft.workoutNotes) setWorkoutNotes(draft.workoutNotes);
                if (draft.workoutDate) setWorkoutDate(draft.workoutDate);
                if (draft.selectedMuscleId) initialMuscleId = draft.selectedMuscleId;
                if (draft.activeSessionId) setActiveSessionId(draft.activeSessionId);
              }
            }
          } catch (e) {
            console.warn("Error leyendo draft local:", e);
          }
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

  // Records map
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

  // Filtered exercises for Step 3 (matching selected muscle + equipment)
  const filteredExercises = useMemo(() => {
    return allExercises.filter((ex) => {
      if (selectedMuscleId && ex.muscle_group_id !== selectedMuscleId) {
        return false;
      }
      if (equipmentFilter) {
        const eq = getExerciseEquipment(ex.name);
        if (eq !== equipmentFilter) return false;
      }
      if (exerciseSearch.trim()) {
        const q = exerciseSearch.toLowerCase().trim();
        if (!ex.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allExercises, selectedMuscleId, equipmentFilter, exerciseSearch]);

  // Ensure active workout session exists in backend
  const ensureActiveSession = async (muscleId = selectedMuscleId) => {
    if (activeSessionId) return activeSessionId;
    try {
      setSyncStatus("saving");
      const session = await startWorkout({
        date: workoutDate,
        muscle_group_id: muscleId,
        notes: workoutNotes.trim() || null,
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

  // Select exercise -> Enters Focus Mode
  const handleSelectExercise = (exercise) => {
    setFocusExercise(exercise);
    setActiveSlot("A");

    // Ensure entry in activeExercises if not already present
    setActiveExercises((prev) => {
      if (prev.some((ae) => ae.exerciseId === exercise.id)) return prev;
      const next = [
        ...prev,
        {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          muscleGroupId: exercise.muscle_group_id,
          sets: [],
        },
      ];
      saveToLocalStorage(activeSessionId, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });
  };

  // Add set from ExerciseLogger
  const handleAddSet = async (exerciseId, setData) => {
    const ex = allExercises.find((e) => e.id === exerciseId);
    const exerciseName = ex?.name || `Ejercicio #${exerciseId}`;
    const muscleGroupId = ex?.muscle_group_id || selectedMuscleId;

    const tempSetId = `temp_set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nextWeight = parseFloat(setData.weight) || 0;
    const nextReps = parseInt(setData.reps, 10) || 1;

    const newSet = {
      id: tempSetId,
      setNumber: setData.setNumber || 1,
      weight: nextWeight,
      reps: nextReps,
      completed: true,
    };

    // 1. Immediate 0ms UI update
    setActiveExercises((prev) => {
      const existing = prev.find((item) => item.exerciseId === exerciseId);
      let next;
      if (existing) {
        next = prev.map((item) => {
          if (item.exerciseId !== exerciseId) return item;
          const renumbered = [...item.sets, { ...newSet, setNumber: item.sets.length + 1 }];
          return {
            ...item,
            sets: renumbered,
          };
        });
      } else {
        next = [
          ...prev,
          {
            exerciseId,
            exerciseName,
            muscleGroupId,
            sets: [newSet],
          },
        ];
      }
      saveToLocalStorage(activeSessionId, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    // 2. Background sync
    (async () => {
      try {
        const sessionId = await ensureActiveSession(muscleGroupId);
        if (sessionId) {
          setSyncStatus("saving");
          const saved = await addWorkoutSet(sessionId, {
            exercise_id: exerciseId,
            set_number: newSet.setNumber,
            weight: nextWeight,
            reps: nextReps,
            completed: true,
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
              set_number: newSet.setNumber,
              weight: nextWeight,
              reps: nextReps,
              completed: true,
            },
          },
        });
      }
    })();
  };

  // Remove set from ExerciseLogger
  const handleRemoveSet = async (exerciseId, setIndex) => {
    const exItem = activeExercises.find((ae) => ae.exerciseId === exerciseId);
    const setToRemove = exItem?.sets?.[setIndex];
    if (!setToRemove) return;

    // 1. Immediate UI removal
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
        deleteWorkoutSet(setToRemove.id).catch((err) => {
          enqueueSyncAction({
            type: "DELETE_SET",
            payload: { setId: setToRemove.id },
          });
        });
      }
    }
  };

  // Calculate live workout stats
  const totalSetsCount = useMemo(() => {
    return activeExercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  }, [activeExercises]);

  const totalVolume = useMemo(() => {
    return activeExercises.reduce((acc, ex) => {
      const vol = ex.sets.reduce((sum, s) => {
        const wt = parseFloat(s.weight) || 0;
        const rp = parseInt(s.reps, 10) || 0;
        return sum + wt * rp;
      }, 0);
      return acc + vol;
    }, 0);
  }, [activeExercises]);

  // Finish and consolidate workout session
  const handleFinishWorkout = async () => {
    const payloadSets = [];
    activeExercises.forEach((ex) => {
      ex.sets.forEach((s, idx) => {
        if (s.weight > 0 || s.reps > 0) {
          payloadSets.push({
            id: s.id,
            exercise_id: ex.exerciseId,
            set_number: idx + 1,
            weight: parseFloat(s.weight) || 0.0,
            reps: parseInt(s.reps, 10) || 0,
            completed: true,
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

      const finishDataPayload = {
        date: workoutDate,
        notes: workoutNotes.trim() || null,
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

      // Silent metrics calculation engine
      const analytics = analyzeWorkoutSession(activeExercises, {
        recordsMap,
        records: saved?.records || records,
        previous_history: saved?.previous_history || {},
      });

      // Show concise post-workout summary modal
      setCompletedSummary({
        ...analytics,
        id: saved?.id,
        date: saved?.date || workoutDate,
        isOfflineSaved,
      });

      if (isOnline()) {
        try {
          const updatedRecords = saved?.records || (await getRecords());
          setRecords(updatedRecords);
        } catch (e) {}
      }

      // Reset state & clear draft
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {}

      setActiveSessionId(null);
      setActiveExercises([]);
      setWorkoutNotes("");
      setFocusExercise(null);
      setSecondExercise(null);
      setActiveSlot("A");
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
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}
    setActiveSessionId(null);
    setActiveExercises([]);
    setWorkoutNotes("");
    setFocusExercise(null);
    setSecondExercise(null);
    setActiveSlot("A");
  };

  const formattedToday = useMemo(() => formatDateLong(workoutDate), [workoutDate]);

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

  // 1. PANTALLA DE CARGA AISLADA ("FOCUS MODE" DE EJERCICIO)
  // Al seleccionar el ejercicio:
  // - La vista principal se oculta temporalmente y entra en "Modo Foco" ocupando toda la pantalla.
  // - NO hay tarjetas al final de una lista infinita. Solo existe el ejercicio actual.
  if (focusExercise) {
    const activeExItem = activeExercises.find(
      (ae) => ae.exerciseId === focusExercise.id
    );
    const secondExItem = secondExercise
      ? activeExercises.find((ae) => ae.exerciseId === secondExercise.id)
      : null;

    return (
      <ExerciseLogger
        exercise={focusExercise}
        equipment={getExerciseEquipment(focusExercise.name)}
        sets={activeExItem?.sets || []}
        onAddSet={handleAddSet}
        onRemoveSet={handleRemoveSet}
        onExitFocus={() => setFocusExercise(null)}
        onFinishWorkout={handleFinishWorkout}
        secondExercise={secondExercise}
        secondSets={secondExItem?.sets || []}
        activeSlot={activeSlot}
        onSwitchSlot={setActiveSlot}
        onSelectSecondExercise={(sec) => {
          setSecondExercise(sec);
          setActiveExercises((prev) => {
            if (prev.some((ae) => ae.exerciseId === sec.id)) return prev;
            return [
              ...prev,
              {
                exerciseId: sec.id,
                exerciseName: sec.name,
                muscleGroupId: sec.muscle_group_id,
                sets: [],
              },
            ];
          });
        }}
        onRemoveSecondExercise={() => {
          setSecondExercise(null);
          setActiveSlot("A");
        }}
        allAvailableExercises={allExercises}
        muscleGroups={muscleGroups}
        recordsMap={recordsMap}
        periodizationMode={periodizationMode}
      />
    );
  }

  // 2. VISTA PRINCIPAL: FLUJO DE SELECCIÓN EN 3 PASOS
  return (
    <div className="w-full max-w-md sm:max-w-3xl mx-auto space-y-4 pb-28 px-1 sm:px-0 select-none">
      {/* Workout Header with Weekly Periodization Mode Toggle */}
      <WorkoutHeader
        dateText={formattedToday}
        isDeviceOnline={isDeviceOnline}
        hasSets={totalSetsCount > 0}
        onDiscard={handleDiscardWorkout}
        periodizationMode={periodizationMode}
        onPeriodizationChange={setPeriodizationMode}
      />

      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-200">
          {errorMessage}
        </div>
      )}

      {/* Banner de Sesión en Curso (si hay series registradas) */}
      {totalSetsCount > 0 && (
        <div className="rounded-2xl border-2 border-[#FF5722]/50 bg-gradient-to-r from-[#FF5722]/15 via-[#181210] to-[#181210] p-4 shadow-neon flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-[#FF6D00] uppercase tracking-wider">
              <Sparkles size={14} />
              <span>SESIÓN EN CURSO</span>
            </div>
            <p className="text-xs font-bold text-white mt-0.5">
              {activeExercises.filter((e) => e.sets.length > 0).length} ejercicios • {totalSetsCount} series registradas
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeExercises.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const lastActive = activeExercises[activeExercises.length - 1];
                  const ex = allExercises.find((e) => e.id === lastActive.exerciseId) || {
                    id: lastActive.exerciseId,
                    name: lastActive.exerciseName,
                  };
                  handleSelectExercise(ex);
                }}
                className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-xl bg-[#FF5722] text-[#050505] font-black text-xs shadow-neon flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <Play size={14} fill="currentColor" />
                <span>Reanudar Modo Foco</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFinishWorkout}
              disabled={isSaving}
              className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-xl border border-[#FF5722] bg-[#121113] text-white font-black text-xs hover:bg-[#FF5722]/20 flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin text-[#FF5722]" />
              ) : (
                <Trophy size={14} className="text-[#FF6D00]" />
              )}
              <span>Terminar</span>
            </button>
          </div>
        </div>
      )}

      {/* PASO 1: SELECTOR DE MÚSCULO */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5722] text-[11px] font-black text-[#050505]">
            1
          </span>
          <h2 className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
            Paso 1: Selector de Músculo
          </h2>
        </div>

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
                  setExerciseSearch("");
                }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-center transition active:scale-95 min-h-[84px] ${
                  isSelected
                    ? "border-2 border-[#FF5722] bg-[#2A1B14] shadow-cardActive text-white"
                    : "border border-[#2A1B14] bg-[#121113] text-[#A1A1AA] hover:border-[#FF5722]/40 hover:text-white"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                    isSelected
                      ? "bg-[#FF5722] text-[#050505] shadow-neon font-black"
                      : "bg-[#050505] border border-[#2A1B14] text-[#FF6D00]"
                  }`}
                >
                  <MuscleIcon size={20} />
                </div>
                <span className="text-xs font-black tracking-tight leading-tight truncate max-w-full">
                  {group.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PASO 2: SELECTOR DE EQUIPAMIENTO (Barra | Mancuerna | Polea | Máquina) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5722] text-[11px] font-black text-[#050505]">
            2
          </span>
          <h2 className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
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
                className={`min-h-[48px] rounded-xl text-xs font-black transition active:scale-95 flex items-center justify-center ${
                  isSelected
                    ? "border-2 border-[#FF5722] bg-[#FF5722] text-[#050505] shadow-neon"
                    : "border border-[#2A1B14] bg-[#121113] text-[#A1A1AA] hover:border-[#FF5722]/40 hover:text-white"
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
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5722] text-[11px] font-black text-[#050505]">
              3
            </span>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
              Paso 3: Selector de Ejercicio ({filteredExercises.length})
            </h2>
          </div>
          {currentMuscle && (
            <span className="text-[11px] font-bold text-[#FF6D00]">
              {currentMuscle.name} • {equipmentFilter}
            </span>
          )}
        </div>

        {/* Buscador Rápido */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="🔍 Buscar ejercicio en esta categoría..."
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-[#2A1B14] bg-[#121113] px-3.5 text-xs font-bold text-white placeholder-[#71717A] outline-none transition focus:border-[#FF5722]"
          />
          {exerciseSearch && (
            <button
              type="button"
              onClick={() => setExerciseSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#71717A] hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Lista táctil de ejercicios disponibles */}
        <div className="space-y-2">
          {filteredExercises.map((ex) => {
            const rec = recordsMap[ex.id];
            const activeSets = activeExercises.find((ae) => ae.exerciseId === ex.id)?.sets || [];

            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => handleSelectExercise(ex)}
                className="w-full text-left p-3.5 sm:p-4 rounded-2xl border border-[#2A1B14] bg-[#121113] hover:border-[#FF5722] hover:bg-[#1A1618] transition flex items-center justify-between gap-3 active:scale-[0.98] shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-black text-white leading-snug break-words">
                      {ex.name}
                    </p>
                    {activeSets.length > 0 && (
                      <span className="rounded-full bg-[#FF5722]/20 border border-[#FF5722]/40 px-2 py-0.5 text-[10px] font-black text-[#FF6D00]">
                        {activeSets.length} series
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#71717A]">
                    <span className="uppercase font-bold">{getExerciseEquipment(ex.name)}</span>
                    {rec?.pr_weight && (
                      <span>• PR: {rec.pr_weight}kg × {rec.pr_reps}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="rounded-xl bg-[#FF5722] text-[#050505] px-3 py-2 text-xs font-black shadow-neon flex items-center gap-1">
                    <span>Entrenar</span>
                    <ChevronRight size={14} strokeWidth={3} />
                  </span>
                </div>
              </button>
            );
          })}

          {filteredExercises.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#2A1B14] bg-[#121113] p-8 text-center space-y-2">
              <Dumbbell size={28} className="mx-auto text-[#71717A]" />
              <p className="text-xs font-bold text-[#A1A1AA]">
                No hay ejercicios para {currentMuscle?.name || "este músculo"} con {equipmentFilter}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEquipmentFilter("Barra");
                  setExerciseSearch("");
                }}
                className="text-xs font-black text-[#FF6D00] hover:underline"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </div>
      </div>

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
