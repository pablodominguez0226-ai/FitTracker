import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Eye,
  Layers,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  createRoutine,
  deleteExercise,
  deleteRoutine,
  getExercises,
  getMuscleGroups,
  getRoutines,
  getWorkouts,
  updateRoutine,
} from "../api/client";
import { showToast } from "../components/Toast";
import ExerciseSelectorModal from "../components/ExerciseSelectorModal";
import CreateExerciseModal from "../components/CreateExerciseModal";
import {
  getMuscleRecoveryTracker,
} from "../utils/routines";
import { RoutineExerciseRowCompact, ExerciseRowCompact } from "./Bitacora";
import EditRoutineModal from "../components/EditRoutineModal";

export default function Routines() {
  const navigate = useNavigate();

  // Estados principales
  const [routines, setRoutines] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [allExercises, setAllExercises] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado del modal de crear/editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [routineName, setRoutineName] = useState("");
  const [routineDescription, setRoutineDescription] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]); // [{ exercise_id, exercise_name, muscle_group_name, target_sets, target_reps }]
  const [isSaving, setIsSaving] = useState(false);

  // Estados para el buscador del modal
  const [modalSearch, setModalSearch] = useState("");
  const [modalMuscleFilter, setModalMuscleFilter] = useState("all");

  // Estado de confirmación de eliminación
  const [routineToDelete, setRoutineToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado de vista rápida "Ver ejercicios" (RoutineDetailModal)
  const [viewingRoutine, setViewingRoutine] = useState(null);

  // Estado para colapsar/expandir rutinas del sistema
  const [expandedPresets, setExpandedPresets] = useState({});

  // Estado para sustituir o agregar ejercicio con modal rápido
  const [substitutingExerciseIndex, setSubstitutingExerciseIndex] = useState(null);
  const [isAddModalOpenInRoutine, setIsAddModalOpenInRoutine] = useState(false);
  const [isCreateExerciseModalOpen, setIsCreateExerciseModalOpen] = useState(false);

  // Carga inicial de datos
  const loadData = async () => {
    try {
      setLoading(true);
      const [routinesData, groupsData, exercisesData, workoutsData] = await Promise.all([
        getRoutines().catch(() => []),
        getMuscleGroups().catch(() => []),
        getExercises().catch(() => []),
        getWorkouts().catch(() => []),
      ]);
      setRoutines(routinesData || []);
      setMuscleGroups(groupsData || []);
      setAllExercises(exercisesData || []);
      setWorkouts(workoutsData || []);
    } catch (err) {
      console.error("Error al cargar rutinas:", err);
      showToast("Error al cargar las rutinas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Separar rutinas de usuario y rutinas base del sistema
  const userRoutines = useMemo(
    () => routines.filter((r) => !r.is_preset),
    [routines]
  );

  const presetRoutines = useMemo(
    () => routines.filter((r) => r.is_preset),
    [routines]
  );


  const currentTargetMuscle = useMemo(() => {
    const todayDay = new Date().getDay();
    if (todayDay === 1) return ["Pecho", "Espalda"];
    if (todayDay === 2) return ["Piernas", "Core"];
    if (todayDay === 4) return ["Hombros", "Tríceps", "Bíceps"];
    if (todayDay === 5) return ["Espalda", "Hombros", "Core"];
    return ["Pecho", "Espalda"];
  }, []);

  const muscleRecovery = useMemo(() => {
    return getMuscleRecoveryTracker({
      workouts: workouts || [],
      targetMuscle: currentTargetMuscle,
      allExercises: allExercises || [],
      muscleGroups: muscleGroups || [],
    });
  }, [workouts, currentTargetMuscle, allExercises, muscleGroups]);

  // Filtrado de ejercicios dentro del modal selector
  const filteredCatalogExercises = useMemo(() => {
    const search = modalSearch.toLowerCase().trim();
    return allExercises.filter((ex) => {
      if (!ex.is_active) return false;
      const matchesSearch =
        !search || (ex?.name && ex.name.toLowerCase().includes(search));
      const matchesMuscle =
        modalMuscleFilter === "all" ||
        String(ex.muscle_group_id) === String(modalMuscleFilter);
      return matchesSearch && matchesMuscle;
    });
  }, [allExercises, modalSearch, modalMuscleFilter]);

  // Abrir modal para crear
  const handleOpenCreateModal = () => {
    setEditingRoutineId(null);
    setRoutineName("");
    setRoutineDescription("");
    setSelectedExercises([]);
    setModalSearch("");
    setModalMuscleFilter("all");
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditModal = (routine) => {
    setEditingRoutineId(routine?.id);
    setRoutineName(routine?.name || "");
    setRoutineDescription(routine?.description || "");
    const mapped = (routine?.exercises || []).map((re) => ({
      exercise_id: re?.exercise_id,
      exercise_name: re?.exercise_name || `Ejercicio #${re?.exercise_id}`,
      muscle_group_name: re?.muscle_group_name || "",
      target_sets: re?.target_sets || 4,
      target_reps: re?.target_reps || "8-12",
    }));
    setSelectedExercises(mapped);
    setModalSearch("");
    setModalMuscleFilter("all");
    setIsModalOpen(true);
  };

  // Añadir ejercicio a la rutina en construcción
  const handleAddExerciseToRoutine = (exercise) => {
    const isAlreadyAdded = selectedExercises.some(
      (e) => e.exercise_id === exercise?.id
    );
    if (isAlreadyAdded) {
      showToast(`"${exercise?.name || 'Ejercicio'}" ya está en la rutina`, "info");
      return;
    }

    const mg = muscleGroups.find((g) => g?.id === exercise?.muscle_group_id);
    setSelectedExercises((prev) => [
      ...prev,
      {
        exercise_id: exercise?.id,
        exercise_name: exercise?.name || "Ejercicio",
        muscle_group_name: mg ? (mg?.name || "") : "",
        target_sets: 4,
        target_reps: "8-12",
      },
    ]);
  };

  // Quitar ejercicio de la rutina en construcción
  const handleRemoveExerciseFromRoutine = (index) => {
    setSelectedExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Cambiar series de un ejercicio en la lista
  const handleUpdateExerciseSets = (index, delta) => {
    setSelectedExercises((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      const current = next[index]?.target_sets || 4;
      const updated = Math.max(1, Math.min(10, current + delta));
      next[index] = { ...next[index], target_sets: updated };
      return next;
    });
  };

  // Cambiar reps objetivo de un ejercicio en la lista
  const handleUpdateExerciseReps = (index, value) => {
    setSelectedExercises((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], target_reps: value };
      return next;
    });
  };

  // Mover ejercicio arriba/abajo
  const handleMoveExercise = (index, direction) => {
    setSelectedExercises((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      if (!next[index] || !next[targetIndex]) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Eliminar ejercicio del catálogo de forma segura
  const handleDeleteExerciseFromCatalog = async (e, exercise) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar el ejercicio "${exercise?.name}" del catálogo?`)) {
      return;
    }
    try {
      await deleteExercise(exercise.id);
      setAllExercises((prev) => prev.filter((item) => item.id !== exercise.id));
      setSelectedExercises((prev) => prev.filter((item) => item.exercise_id !== exercise.id));
      showToast(`Ejercicio "${exercise?.name}" eliminado del catálogo`, "info");
    } catch (err) {
      console.error("Error al eliminar ejercicio:", err);
      showToast("No se pudo eliminar el ejercicio", "error");
    }
  };

  // Guardar (Crear o Editar)
  const handleSaveRoutine = async (e) => {
    if (e) e.preventDefault();
    const cleanName = routineName.trim();
    if (!cleanName) {
      showToast("Por favor ingresa un nombre para la rutina", "error");
      return;
    }
    if (selectedExercises.length === 0) {
      showToast("Añade al menos un ejercicio a la rutina", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: cleanName,
        description: routineDescription.trim() || null,
        exercises: selectedExercises.map((ex, idx) => ({
          exercise_id: ex.exercise_id,
          order_index: idx,
          target_sets: Number(ex.target_sets) || 4,
          target_reps: String(ex.target_reps || "8-12").trim(),
        })),
      };

      if (editingRoutineId) {
        await updateRoutine(editingRoutineId, payload);
        showToast("Rutina actualizada con éxito", "success");
      } else {
        await createRoutine(payload);
        showToast("Rutina creada con éxito", "success");
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Error al guardar rutina:", err);
      const detail = err.response?.data?.detail || "Error al guardar la rutina";
      showToast(detail, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar un ejercicio puntual rápido desde la tarjeta de rutina
  const handleQuickRemoveExercise = async (routine, exerciseIdx) => {
    if (!routine || !Array.isArray(routine.exercises)) return;
    const remaining = routine.exercises.filter((_, idx) => idx !== exerciseIdx);

    try {
      const payload = {
        name: routine.name,
        description: routine.description || null,
        exercises: remaining.map((ex, idx) => ({
          exercise_id: Number(ex.exercise_id),
          order_index: idx,
          target_sets: Number(ex.target_sets) || 3,
          target_reps: String(ex.target_reps || "8-12").trim(),
        })),
      };
      const updated = await updateRoutine(routine.id, payload);
      setRoutines((prev) =>
        (prev || []).map((r) => (r.id === routine.id ? updated : r))
      );
      if (viewingRoutine && viewingRoutine.id === routine.id) {
        setViewingRoutine(updated);
      }
      showToast("Ejercicio quitado de la rutina", "success");
    } catch (err) {
      console.error("Error al quitar ejercicio de la rutina:", err);
      showToast("No se pudo quitar el ejercicio", "error");
    }
  };

  // Eliminar rutina
  const handleConfirmDelete = async () => {
    if (!routineToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRoutine(routineToDelete.id);
      showToast("Rutina eliminada correctamente", "success");
      setRoutineToDelete(null);
      await loadData();
    } catch (err) {
      console.error("Error al eliminar rutina:", err);
      const detail =
        err.response?.data?.detail || "No se pudo eliminar la rutina";
      showToast(detail, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle colapso de tarjeta de sistema
  const togglePresetExpand = (id) => {
    setExpandedPresets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Iniciar / Cargar rutina en el entrenamiento activo
  const handleLoadRoutineIntoWorkout = (routine, enterFocus = false) => {
    if (!routine || !routine.exercises || routine.exercises.length === 0) {
      showToast("La rutina no tiene ejercicios para cargar", "info");
      return;
    }

    navigate("/workouts", {
      state: {
        loadRoutine: routine,
        enterFocus: enterFocus,
      },
    });
  };

  return (
    <div className="pb-40 pb-[calc(8rem+env(safe-area-inset-bottom))] w-full space-y-6 select-none">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.07] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-sm text-white font-bold shadow-none">
              <Layers size={16} />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Rutinas & Planes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Crea, personaliza y organiza tus sesiones o planes de tu entrenador
          </p>
        </div>

        {/* Botón de acción principal: Crear Nueva Rutina */}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="h-11 px-5 inline-flex items-center justify-center gap-2 rounded-full bg-red-600 hover:bg-red-700 text-sm font-bold text-white shadow-md transition active:scale-95 cursor-pointer select-none"
        >
          <Plus size={18} />
          <span>Crear Nueva Rutina</span>
        </button>
      </div>

      {/* SECCIÓN 1: MIS RUTINAS PERSONALIZADAS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Mis Rutinas Personalizadas
            </h2>
            <span className="rounded-full bg-slate-100 dark:bg-[#161B26] border border-slate-200 dark:border-white/5 px-2.5 py-0.5 text-xs text-slate-600 dark:text-slate-300">
              {userRoutines.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-100 dark:border-white/[0.07] bg-white dark:bg-[#0E131F] p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 size={28} className="animate-spin text-red-500" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Cargando tus rutinas...</p>
          </div>
        ) : userRoutines.length === 0 ? (
          /* Estado limpio sin rutinas */
          <div className="w-full bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] rounded-3xl p-6 flex flex-col items-center text-center gap-5 shadow-xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/30 text-red-500">
              <Dumbbell size={32} />
            </div>

            <div className="space-y-1.5 max-w-xs">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                No tenés rutinas creadas todavía
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Comenzá un entrenamiento libre con cualquier ejercicio o armá tu primera rutina personalizada (ej: Torso Lunes).
              </p>
            </div>

            <div className="w-full space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate("/workouts")}
                className="h-12 w-full flex items-center justify-center font-bold text-sm rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 active:scale-95 transition cursor-pointer gap-2"
              >
                <span>⚡</span>
                <span>Iniciar Entrenamiento Libre</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="h-12 w-full flex items-center justify-center font-bold text-sm rounded-full border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-[#161B26] hover:bg-slate-100 dark:hover:bg-[#1E2534] text-slate-900 dark:text-white active:scale-95 transition cursor-pointer gap-2"
              >
                <Plus size={16} strokeWidth={2.5} className="text-red-500" />
                <span>＋ Crear Nueva Rutina</span>
              </button>
            </div>
          </div>
        ) : (
          /* Grid de Rutinas Creadas */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userRoutines.map((routine) => (
              <div
                key={routine.id}
                className="w-full bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xl transition-all"
              >
                {/* Header limpio sin superposiciones */}
                <div className="flex flex-col gap-3 mb-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingRoutine(routine)}
                      className="flex-1 py-2.5 px-4 rounded-full bg-slate-100 dark:bg-[#161B26] text-slate-900 dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200/80 dark:border-white/5 transition active:scale-95 cursor-pointer"
                    >
                      <Eye size={14} className="text-red-500" />
                      <span>Ver ejercicios</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadRoutineIntoWorkout(routine, true)}
                      className="flex-1 py-2.5 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                    >
                      <span>⚡</span>
                      <span>Iniciar</span>
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                        {routine?.name || "Rutina"}
                      </h1>
                      {routine.description ? (
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-2">
                          {routine.description}
                        </p>
                      ) : (
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                          {routine.exercises?.length || 0} {routine.exercises?.length === 1 ? "ejercicio en esta rutina" : "ejercicios en esta rutina"}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(routine)}
                        className="p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#161B26] transition active:scale-90 cursor-pointer"
                        title="Editar rutina"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoutineToDelete(routine)}
                        className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition active:scale-90 cursor-pointer"
                        title="Eliminar rutina"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista ultra compacta de ejercicios incluidos (RoutineExerciseRowCompact) */}
                <div className="flex flex-col gap-1 space-y-1">
                  {(routine.exercises || []).map((ex, idx) => (
                    <RoutineExerciseRowCompact
                      key={ex.id || idx}
                      ex={ex}
                      idx={idx}
                      onRemoveExercise={() => handleQuickRemoveExercise(routine, idx)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ACCIÓN FINAL SCROLLEABLE: INICIAR ENTRENAMIENTO LIBRE */}
      {userRoutines.length > 0 && (
        <div className="pt-2 mb-4 space-y-2.5">
          <button
            type="button"
            onClick={() => navigate("/workouts")}
            className="h-12 w-full mb-4 flex items-center justify-center font-bold text-sm rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 active:scale-95 transition cursor-pointer gap-2"
          >
            <span>⚡</span>
            <span>Iniciar Entrenamiento Libre</span>
          </button>
        </div>
      )}

      {/* SECCIÓN 2: RUTINAS RÁPIDAS (SISTEMA) - Sólo visible si existen rutinas preset */}
      {presetRoutines.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-[10px] font-bold text-white">
                ⚡
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">
                Rutinas Rápidas (Sistema)
              </h2>
            </div>
            <span className="text-xs text-[#64748B]">
              Planes predefinidos optimizados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presetRoutines.map((routine) => {
              const isExpanded = expandedPresets[routine.id] ?? false;

              return (
                <div
                  key={routine.id}
                  className="w-full bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xl hover:border-red-500/40 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold border border-slate-100 bg-slate-50 text-red-500">
                        Rutina Oficial
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        {routine.exercises?.length || 0} ejercicios
                      </span>
                    </div>

                    <h3 className="text-[#0F172A] font-semibold text-base leading-snug">
                      {routine?.name || "Rutina"}
                    </h3>

                    {routine.description && (
                      <p className="text-[#64748B] text-xs mt-1 leading-relaxed">
                        {routine.description}
                      </p>
                    )}

                    {/* Toggle ver ejercicios */}
                    <button
                      type="button"
                      onClick={() => togglePresetExpand(routine.id)}
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:underline transition cursor-pointer"
                    >
                      <span>
                        {isExpanded ? "Ocultar ejercicios" : "Ver ejercicios"}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>

                    {/* Lista desplegable de ejercicios */}
                    {isExpanded && (
                      <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                        {(routine.exercises || []).map((ex, idx) => (
                          <div
                            key={ex?.id || idx}
                            className="flex items-center justify-between text-xs py-1 text-[#D4D4D8] border-b border-slate-100/40 last:border-0"
                          >
                            <span className="truncate pr-2 font-medium">
                              {ex?.exercise_name || ex?.name || "Ejercicio"}
                            </span>
                            <span className="flex-shrink-0 text-[10px] text-[#64748B] bg-[#F9FAFB] px-1.5 py-0.5 rounded border border-slate-100">
                              {ex.target_sets}×{ex.target_reps}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botón Cargar en Entrenamiento */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleLoadRoutineIntoWorkout(routine, false)}
                      className="h-12 w-full rounded-xl border border-slate-100 active:scale-95 transition text-[#0F172A] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-[#26262B]"
                    >
                      <Play size={13} fill="currentColor" className="text-red-500" />
                      <span>Cargar en Entrenamiento</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MODAL DE RUTINA / "VER EJERCICIOS" (RoutineExercisesModal / RutinaPersonalizada) */}
      {viewingRoutine && (
        <div
          onClick={() => setViewingRoutine(null)}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 select-none animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md md:max-w-xl flex flex-col max-h-[88dvh] md:max-h-[90%] rounded-t-3xl sm:rounded-2xl bg-[#0B0F17] border border-white/10 overflow-hidden shadow-2xl pt-2 md:my-auto"
          >
            {/* Header del Modal ultra compacto */}
            <div className="px-4 mb-2 pt-1 pb-2 border-b border-white/5 flex items-start justify-between gap-2 shrink-0 bg-[#0B0F17]">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] tracking-wider text-red-500 font-bold uppercase block">
                  RUTINA PERSONALIZADA
                </span>
                <h3 className="text-lg font-black text-white leading-none mt-0.5 truncate">
                  {viewingRoutine.name}
                </h3>
                {viewingRoutine.description && (
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight line-clamp-1">
                    {viewingRoutine.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewingRoutine(null)}
                className="w-7 h-7 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center text-xs shrink-0 transition active:scale-95 cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X size={14} />
              </button>
            </div>

            {/* Lista central compacta con scroll independiente */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 flex flex-col gap-1 space-y-1 custom-scrollbar">
              {(viewingRoutine.exercises || []).map((ex, idx) => (
                <RoutineExerciseRowCompact
                  key={ex.id || idx}
                  ex={ex}
                  idx={idx}
                  onRemoveExercise={() => handleQuickRemoveExercise(viewingRoutine, idx)}
                />
              ))}
            </div>

            {/* Footer de Acciones (Completamente Visible y Compacto) */}
            <div className="pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] px-4 bg-[#0B0F17] border-t border-white/5 flex items-center gap-2 shrink-0 z-20">
              <button
                type="button"
                onClick={() => setViewingRoutine(null)}
                className="py-2.5 px-4 rounded-full bg-[#161B26] hover:bg-[#1f2636] text-slate-300 text-xs font-semibold flex-1 text-center border border-white/5 transition active:scale-95 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const r = viewingRoutine;
                  setViewingRoutine(null);
                  handleLoadRoutineIntoWorkout(r, true);
                }}
                className="py-2.5 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex-[1.6] text-center shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <span>⚡</span>
                <span>Iniciar Rutina</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR RUTINA (EditRoutineModal) */}
      <EditRoutineModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRoutineId(null);
        }}
        routine={
          editingRoutineId
            ? routines.find((r) => r.id === editingRoutineId) || {
                id: editingRoutineId,
                name: routineName,
                description: routineDescription,
                exercises: selectedExercises,
              }
            : null
        }
        allExercises={allExercises}
        muscleGroups={muscleGroups}
        onRoutineSaved={async () => {
          setIsModalOpen(false);
          setEditingRoutineId(null);
          await loadData();
        }}
        onExerciseCreated={(newEx) => {
          setAllExercises((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            if (arr.some((item) => item.id === newEx.id)) return arr;
            return [...arr, newEx];
          });
        }}
      />

      {/* DIÁLOGO: CONFIRMAR ELIMINACIÓN */}
      {routineToDelete && (
        <div
          onClick={() => !isDeleting && setRoutineToDelete(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm md:max-w-md rounded-2xl border border-white/10 bg-[#0B0F17] p-6 shadow-2xl space-y-4 text-center md:my-auto"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                ¿Eliminar la rutina {routineToDelete?.name || "seleccionada"}?
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Se eliminará la rutina{" "}
                <span className="text-white font-semibold">
                  "{routineToDelete?.name || "esta rutina"}"
                </span>{" "}
                y se desvincularán sus ejercicios asignados.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setRoutineToDelete(null)}
                className="h-11 rounded-full bg-[#161B26] border border-white/5 text-xs font-semibold text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="h-11 rounded-full bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <span>Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO PARA CAMBIAR O AGREGAR EJERCICIO A LA RUTINA */}
      <ExerciseSelectorModal
        isOpen={substitutingExerciseIndex !== null || isAddModalOpenInRoutine}
        onClose={() => {
          setSubstitutingExerciseIndex(null);
          setIsAddModalOpenInRoutine(false);
        }}
        title={substitutingExerciseIndex !== null ? "🔄 Cambiar Ejercicio" : "＋ Agregar Ejercicio a esta Rutina"}
        subtitle={
          substitutingExerciseIndex !== null
            ? `Sustituyendo: ${selectedExercises[substitutingExerciseIndex]?.exercise_name || "Ejercicio"}`
            : "Selecciona un ejercicio del catálogo para incorporarlo a tu rutina"
        }
        allExercises={allExercises}
        muscleGroups={muscleGroups}
        onSelect={(newEx) => {
          if (substitutingExerciseIndex !== null) {
            setSelectedExercises((prev) => {
              const next = [...prev];
              const prevItem = next[substitutingExerciseIndex];
              const mg = muscleGroups.find((g) => g.id === newEx.muscle_group_id);
              next[substitutingExerciseIndex] = {
                exercise_id: newEx.id,
                exercise_name: newEx.name,
                muscle_group_name: mg?.name || newEx.muscle_group_name || "",
                target_sets: prevItem?.target_sets || 3,
                target_reps: prevItem?.target_reps || "8-12",
              };
              return next;
            });
            setSubstitutingExerciseIndex(null);
          } else {
            handleAddExerciseToRoutine(newEx);
            setIsAddModalOpenInRoutine(false);
          }
        }}
      />

      {/* Modal Reutilizable Crear Ejercicio */}
      <CreateExerciseModal
        isOpen={isCreateExerciseModalOpen}
        onClose={() => setIsCreateExerciseModalOpen(false)}
        onExerciseCreated={(newEx) => {
          setAllExercises((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            if (arr.some((item) => item.id === newEx.id)) return arr;
            return [...arr, newEx];
          });
          handleAddExerciseToRoutine(newEx);
          showToast(`"${newEx.name}" añadido a la rutina`, "success");
        }}
        muscleGroups={muscleGroups}
        initialMuscleId={modalMuscleFilter !== "all" ? Number(modalMuscleFilter) : null}
      />
    </div>
  );
}
