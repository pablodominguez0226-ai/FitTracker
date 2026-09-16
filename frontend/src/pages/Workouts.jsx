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
  createExercise,
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
import { PREDEFINED_ROUTINES, resolveRoutineExercises } from "../utils/routines";
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

  // Active workout session state
  const [activeSessionId, setActiveSessionId] = useState(null);
  const activeSessionIdRef = useRef(activeSessionId);
  const sessionPromiseRef = useRef(null);
  const activeWorkoutRef = useRef(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

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

  // Ensure active workout session exists in backend (mutex / deduplicated promise)
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
      saveToLocalStorage(activeSessionIdRef.current, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });
  };

  // Iniciar Rutina Predefinida: Inyecta los ejercicios y enfoca la sección de Entrenamiento Activo
  const handleStartRoutine = async (routine) => {
    const resolved = resolveRoutineExercises(routine, allExercises, muscleGroups);
    if (!resolved || resolved.length === 0) return;

    const primaryMuscleId = resolved[0]?.muscleGroupId || selectedMuscleId;
    if (primaryMuscleId) {
      setSelectedMuscleId(primaryMuscleId);
    }

    // Si ya hay series registradas, conservarlas y sumar los nuevos ejercicios.
    // Si no hay series, reemplazar la lista con la rutina elegida.
    setActiveExercises((prev) => {
      const hasCompletedSets = prev.some((ex) => (ex.sets || []).length > 0);
      let next;
      if (hasCompletedSets) {
        const existingIds = new Set(prev.map((e) => e.exerciseId));
        const toAdd = resolved.filter((r) => !existingIds.has(r.exerciseId));
        next = [...prev, ...toAdd];
      } else {
        next = resolved;
      }

      saveToLocalStorage(
        activeSessionIdRef.current,
        next,
        workoutNotes,
        workoutDate,
        primaryMuscleId
      );
      return next;
    });

    // Asegurar sesión activa en el backend
    ensureActiveSession(primaryMuscleId);

    // Desplazar automáticamente hacia la sección de Entrenamiento Activo
    setTimeout(() => {
      if (activeWorkoutRef.current) {
        activeWorkoutRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 120);
  };

  // Eliminar un ejercicio específico de la sesión activa
  const handleRemoveExerciseFromSession = (exerciseId) => {
    setActiveExercises((prev) => {
      const next = prev.filter((ae) => ae.exerciseId !== exerciseId);
      saveToLocalStorage(
        activeSessionIdRef.current,
        next,
        workoutNotes,
        workoutDate,
        selectedMuscleId
      );
      return next;
    });
  };

  // Create custom exercise and immediately enter Focus Mode
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
          id: `custom_${Date.now()}`,
          name: cleanName,
          muscle_group_id: Number(targetMuscleId),
          is_active: true,
        };
      }

      // Save custom equipment mapping in localStorage so getExerciseEquipment detects it
      try {
        const stored = localStorage.getItem("fittracker_custom_exercise_equipment");
        const map = stored ? JSON.parse(stored) : {};
        map[created.id] = normalizedEquip;
        map[cleanName.toLowerCase().trim()] = normalizedEquip;
        localStorage.setItem("fittracker_custom_exercise_equipment", JSON.stringify(map));
      } catch (e) {
        console.warn("Error guardando equipo personalizado en localStorage:", e);
      }

      // Add to allExercises list
      setAllExercises((prev) => {
        if (prev.some((ex) => ex.id === created.id)) return prev;
        return [...prev, created];
      });

      // Synchronize category filters with the new exercise
      setSelectedMuscleId(Number(targetMuscleId));
      setEquipmentFilter(normalizedEquip);
      setExerciseSearch("");

      // Close modal and reset form
      setIsCreateModalOpen(false);
      setNewExerciseName("");

      // Automatically launch into Focus Mode!
      handleSelectExercise(created);
    } catch (err) {
      console.error("Error al crear ejercicio:", err);
      setCreateExerciseError("No se pudo crear el ejercicio. Inténtalo de nuevo.");
    } finally {
      setIsCreatingExercise(false);
    }
  };

  // Add set from ExerciseLogger
  const handleAddSet = async (exerciseId, setData) => {
    const ex = allExercises.find((e) => e.id === exerciseId);
    const exerciseName = ex?.name || `Ejercicio #${exerciseId}`;
    const muscleGroupId = ex?.muscle_group_id || selectedMuscleId;

    const tempSetId = setData.id || `temp_set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nextWeight = parseFloat(setData.weight) || 0;
    const nextReps = parseInt(setData.reps, 10) || 1;

    let targetSetNumber = setData.setNumber || 1;

    // 1. Immediate 0ms UI update with functional update
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

    // 2. Background sync
    (async () => {
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
          });
          setActiveExercises((prev) => {
            const next = prev.map((item) => {
              if (item.exerciseId !== exerciseId) return item;
              return {
                ...item,
                sets: item.sets.map((s) => (s.id === tempSetId ? { ...s, id: saved.id } : s)),
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
            },
          },
        });
      }
    })();
  };

  // Remove set from ExerciseLogger
  const handleRemoveSet = async (exerciseId, setIndex) => {
    let setToRemove = null;

    // 1. Immediate UI removal
    setActiveExercises((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const exItem = prevList.find((ae) => ae.exerciseId === exerciseId);
      if (!exItem || !exItem.sets || !exItem.sets[setIndex]) return prevList;
      setToRemove = exItem.sets[setIndex];

      const next = prevList.map((item) => {
        if (item.exerciseId !== exerciseId) return item;
        const filtered = item.sets.filter((_, idx) => idx !== setIndex);
        const renumbered = filtered.map((s, idx) => ({
          ...s,
          setNumber: idx + 1,
        }));
        return { ...item, sets: renumbered };
      });
      saveToLocalStorage(activeSessionIdRef.current, next, workoutNotes, workoutDate, selectedMuscleId);
      return next;
    });

    // 2. Background delete
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

  // Calculate live workout stats
  const totalSetsCount = useMemo(() => {
    return activeExercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  }, [activeExercises]);

  const hasActiveWorkout = totalSetsCount > 0;

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
        secondExercise={secondExercise}
        secondSets={secondExItem?.sets || []}
        activeSlot={activeSlot}
        onSwitchSlot={setActiveSlot}
        onSelectSecondExercise={(sec) => {
          setSecondExercise(sec);
          setActiveExercises((prev) => {
            if (prev.some((ae) => ae.exerciseId === sec.id)) return prev;
            const next = [
              ...prev,
              {
                exerciseId: sec.id,
                exerciseName: sec.name,
                muscleGroupId: sec.muscle_group_id,
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
        allAvailableExercises={allExercises}
        muscleGroups={muscleGroups}
        recordsMap={recordsMap}
        periodizationMode={periodizationMode}
      />
    );
  }

  // 2. VISTA PRINCIPAL: FLUJO DE SELECCIÓN EN 3 PASOS
  return (
    <div
      className={`w-full max-w-md sm:max-w-3xl mx-auto space-y-4 px-1 sm:px-0 select-none ${
        hasActiveWorkout
          ? "pb-[calc(10rem+env(safe-area-inset-bottom,0px))] sm:pb-28"
          : "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-12"
      }`}
    >
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

      {/* SECCIÓN: ENTRENAMIENTO ACTIVO (Si hay ejercicios en la sesión) */}
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

          {/* Lista de Ejercicios en Sesión */}
          <div className="space-y-2">
            {activeExercises.map((ae, index) => {
              const fullEx = allExercises.find((e) => e.id === ae.exerciseId) || {
                id: ae.exerciseId,
                name: ae.exerciseName,
                muscle_group_id: ae.muscleGroupId,
              };
              const rec = recordsMap[ae.exerciseId];
              const completedSets = (ae.sets || []).filter((s) => s.completed !== false);
              const hasSets = completedSets.length > 0;

              return (
                <div
                  key={ae.exerciseId || index}
                  onClick={() => handleSelectExercise(fullEx)}
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
                        <div className="flex items-center gap-1 text-[11px] text-[#FF8A65] font-semibold">
                          <span>•</span>
                          {completedSets.map((s, sIdx) => (
                            <span key={s.id || sIdx} className="bg-[#121212] border border-[#2C2C2E] px-1.5 py-0.2 rounded text-[10px]">
                              {s.weight}k×{s.reps}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectExercise(fullEx);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 text-white font-semibold text-xs flex items-center gap-1 active:scale-95 transition"
                    >
                      <span>{hasSets ? "Continuar" : "Entrenar"}</span>
                      <ChevronRight size={13} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveExerciseFromSession(ae.exerciseId);
                      }}
                      className="p-1.5 rounded-xl border border-white/5 bg-[#121212] text-[#8E8E93] hover:text-rose-400 transition active:scale-95"
                      title="Eliminar de la sesión"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECCIÓN: RUTINAS RÁPIDAS (CARRUSEL PREMIUM FLAT OLED) */}
      <section className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-[11px] font-bold text-white">
              ⚡
            </span>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
              Rutinas Rápidas
            </h2>
          </div>
          <span className="text-[11px] font-medium text-[#8E8E93]">
            Desliza para elegir
          </span>
        </div>

        {/* Carrusel horizontal suave */}
        <div className="flex overflow-x-auto no-scrollbar gap-4 pb-4 -mx-1 px-1 scroll-smooth">
          {PREDEFINED_ROUTINES.map((routine) => (
            <div
              key={routine.id}
              className="min-w-[260px] sm:min-w-[280px] max-w-[300px] flex-shrink-0 rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 flex flex-col justify-between transition-all hover:border-white/20"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="rounded-full border border-[#2C2C2E] bg-[#1C1C1E] px-2.5 py-0.5 text-[10px] font-semibold text-[#FF8A65]">
                    {routine.category}
                  </span>
                  <span className="text-[11px] text-[#8E8E93] font-medium">
                    {routine.exercises.length} ejercicios
                  </span>
                </div>

                <h3 className="text-white font-semibold text-lg leading-snug">
                  {routine.title}
                </h3>

                <p className="text-[#8E8E93] text-sm line-clamp-2 mt-1 leading-relaxed">
                  {routine.summary}
                </p>
              </div>

              {/* Botón inferior Iniciar Rutina */}
              <button
                type="button"
                onClick={() => handleStartRoutine(routine)}
                className="w-full mt-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 active:scale-95 transition text-white font-medium text-sm flex items-center justify-center gap-1.5 select-none"
              >
                <Play size={14} fill="currentColor" />
                <span>Iniciar Rutina</span>
              </button>
            </div>
          ))}
        </div>
      </section>

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
                    ? "border border-[#FF5722] bg-[#FF5722]/10 text-white font-semibold"
                    : "border border-[#2C2C2E] bg-[#1C1C1E] text-[#8E8E93] hover:border-white/20 hover:text-white font-medium"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                    isSelected
                      ? "bg-[#FF5722] text-white font-bold"
                      : "bg-[#121212] border border-[#2C2C2E] text-[#FF5722]"
                  }`}
                >
                  <MuscleIcon size={20} />
                </div>
                <span className="text-xs font-semibold tracking-tight leading-tight truncate max-w-full">
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
              Paso 3: Selector de Ejercicio ({filteredExercises.length})
            </h2>
          </div>
          {currentMuscle && (
            <span className="text-[11px] font-semibold text-[#FF5722]">
              {currentMuscle.name} • {equipmentFilter}
            </span>
          )}
        </div>

        {/* Buscador Rápido y Botón Accesible: ＋ Crear Ejercicio Personalizado */}
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
                className="w-full text-left p-3.5 sm:p-4 rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] hover:border-white/20 hover:bg-[#252528] transition flex items-center justify-between gap-3 active:scale-[0.98]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                      {ex.name}
                    </p>
                    {activeSets.length > 0 && (
                      <span className="rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF5722]">
                        {activeSets.length} series
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8E8E93]">
                    <span className="uppercase font-semibold text-[#8E8E93]">{getExerciseEquipment(ex.name, ex.id)}</span>
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

          {filteredExercises.length > 0 && (
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

          {filteredExercises.length === 0 && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1C1C1E] p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#FF5722]">
                  <span>✨ Personalizado</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  ＋ Crear Ejercicio Personalizado
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Agregá tu variante y empezá a registrar series al instante.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl border border-white/10 bg-[#121212] p-2 text-[#8E8E93] hover:text-white transition active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {createExerciseError && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300">
                {createExerciseError}
              </div>
            )}

            <form onSubmit={handleSaveAndSelectCustomExercise} className="space-y-4">
              {/* 1. Grupo muscular preseleccionado */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8E8E93] block">
                  Grupo Muscular (preseleccionado):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {muscleGroups.map((g) => {
                    const isSelected = (newExerciseMuscleId || selectedMuscleId) === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setNewExerciseMuscleId(g.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 flex items-center gap-1 ${
                          isSelected
                            ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                            : "border border-white/10 bg-[#121212] text-[#8E8E93] hover:border-white/20 hover:text-white font-medium"
                        }`}
                      >
                        <span>{g.name}</span>
                        {isSelected && <Check size={13} strokeWidth={2.5} className="text-[#FF5722]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Selector rápido de Equipamiento: [Barra | Mancuerna | Polea | Máquina] */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8E8E93] block">
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
                        className={`min-h-[42px] px-2 py-1.5 rounded-xl text-xs transition active:scale-95 flex items-center justify-center text-center leading-tight font-medium ${
                          isSelected
                            ? "border border-[#FF5722] bg-[#FF5722]/10 text-white font-semibold"
                            : "border border-white/10 bg-[#121212] text-[#8E8E93] hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {eq}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Input: Nombre del ejercicio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8E8E93] block">
                  Nombre del ejercicio:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sentadilla Goblet talones elevados"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  className="w-full min-h-[48px] rounded-2xl border border-white/10 bg-[#121212] px-3.5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-[#8E8E93] focus:border-[#FF5722]"
                  autoFocus
                />
              </div>

              {/* 4. Botón: Guardar y Seleccionar */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreatingExercise || !newExerciseName.trim()}
                  className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 text-white font-semibold text-sm sm:text-base active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isCreatingExercise ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Guardando ejercicio...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} strokeWidth={2.5} />
                      <span>Guardar y Seleccionar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. BOTÓN GLOBAL DE "TERMINAR ENTRENAMIENTO" (Solo en pantalla principal y con entrenamiento activo) */}
      {hasActiveWorkout && (
        <div className="fixed inset-x-0 z-40 active-workout-banner bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 p-2.5 sm:p-3.5 bg-[#000000]/95 backdrop-blur-xl border-t border-white/10">
          <div className="w-full max-w-md sm:max-w-3xl mx-auto flex flex-row items-center justify-between gap-2.5 sm:gap-4">
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-[#FF5722] uppercase tracking-wider">
                <span className="inline-block h-2 w-2 rounded-full bg-[#FF5722] animate-pulse flex-shrink-0" />
                <span className="truncate">Entrenamiento Activo</span>
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-[#8E8E93] truncate mt-0.5">
                {activeExercises.filter((e) => e.sets.length > 0).length} ejerc. • {totalSetsCount} series • {Math.round(totalVolume)} kg
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
