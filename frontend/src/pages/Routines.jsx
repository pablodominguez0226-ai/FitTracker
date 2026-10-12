import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Layers,
  Loader2,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  createRoutine,
  deleteRoutine,
  getExercises,
  getMuscleGroups,
  getRoutines,
  getWorkouts,
  updateRoutine,
} from "../api/client";
import { showToast } from "../components/Toast";
import HeavyDutyRecoveryBanner from "../components/HeavyDutyRecoveryBanner";
import {
  getHeavyDutyRecoveryStatus,
  getMuscleRecoveryTracker,
} from "../utils/routines";

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

  // Estado para colapsar/expandir rutinas del sistema
  const [expandedPresets, setExpandedPresets] = useState({});

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

  const heavyDutyRecovery = useMemo(
    () => getHeavyDutyRecoveryStatus(workouts),
    [workouts]
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

    navigate("/", {
      state: {
        loadRoutine: routine,
        enterFocus: enterFocus,
      },
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-sm text-white shadow-md shadow-[#FF5722]/10">
              <Layers size={16} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Rutinas & Planes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#8E8E93] mt-1">
            Crea, personaliza y organiza tus sesiones o planes de tu entrenador
          </p>
        </div>

        {/* Botón de acción principal: Crear Nueva Rutina */}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#FF5722]/20 hover:opacity-95 active:scale-95 transition cursor-pointer select-none"
        >
          <Plus size={18} />
          <span>Crear Nueva Rutina</span>
        </button>
      </div>

      {/* Motor Biométrico de Recuperación Heavy Duty */}
      <HeavyDutyRecoveryBanner
        recoveryStatus={heavyDutyRecovery}
        muscleTracker={muscleRecovery}
        onStartRoutine={() => {
          const firstHd = presetRoutines[0];
          if (firstHd) handleLoadRoutineIntoWorkout(firstHd, true);
        }}
      />

      {/* SECCIÓN 1: MIS RUTINAS PERSONALIZADAS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FF5722]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Mis Rutinas Personalizadas
            </h2>
            <span className="rounded-full bg-[#1C1C1E] border border-white/5 px-2 py-0.5 text-xs text-[#8E8E93]">
              {userRoutines.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 size={28} className="animate-spin text-[#FF5722]" />
            <p className="text-xs text-[#8E8E93]">Cargando tus rutinas...</p>
          </div>
        ) : userRoutines.length === 0 ? (
          /* Estado vacío elegante */
          <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1C1C1E] border border-white/5 flex items-center justify-center text-[#8E8E93] mb-4">
              <Dumbbell size={26} />
            </div>
            <h3 className="text-white font-semibold text-base mb-1.5">
              No tienes rutinas guardadas
            </h3>
            <p className="text-[#8E8E93] text-xs sm:text-sm max-w-md mx-auto mb-6">
              Añade una rutina propia o la que te dio tu entrenador para cargarla
              con un solo toque en tu sesión de entrenamiento.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#FF5722]/50 hover:bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition active:scale-95 cursor-pointer"
            >
              <Plus size={16} className="text-[#FF5722]" />
              <span>Añadir mi primera rutina</span>
            </button>
          </div>
        ) : (
          /* Grid de Rutinas Creadas */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userRoutines.map((routine) => (
              <div
                key={routine.id}
                className="group rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 flex flex-col justify-between transition-all hover:border-[#3C3C3E]"
              >
                <div>
                  {/* Header de tarjeta */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-lg leading-snug truncate">
                        {routine?.name || "Rutina"}
                      </h3>
                      {routine.description ? (
                        <p className="text-[#8E8E93] text-xs sm:text-sm mt-1 line-clamp-2">
                          {routine.description}
                        </p>
                      ) : (
                        <p className="text-[#636366] text-xs mt-0.5 italic">
                          Sin notas adicionales
                        </p>
                      )}
                    </div>

                    {/* Botones de acción secundarios: Editar y Eliminar */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(routine)}
                        className="p-2 rounded-xl bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white hover:border-[#FF5722]/40 transition active:scale-95 cursor-pointer"
                        title="Editar rutina"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoutineToDelete(routine)}
                        className="p-2 rounded-xl bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-rose-400 hover:border-rose-500/30 transition active:scale-95 cursor-pointer"
                        title="Eliminar rutina"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Badge de cantidad de ejercicios */}
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="rounded-full bg-[#1C1C1E] border border-white/5 px-2.5 py-0.5 text-[11px] font-medium text-[#FF8A65]">
                      {routine.exercises?.length || 0} ejercicios
                    </span>
                  </div>

                  {/* Lista de ejercicios incluidos */}
                  <div className="space-y-1.5 pt-2.5 border-t border-white/5">
                    {(routine.exercises || []).map((ex, idx) => (
                      <div
                        key={ex.id || idx}
                        className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.03] last:border-0"
                      >
                        <div className="truncate pr-2 flex items-center gap-2">
                          <span className="text-[#FF5722] text-[10px] font-bold">
                            {idx + 1}.
                          </span>
                          <span className="truncate text-white font-medium">
                            {ex?.exercise_name || ex?.name || "Ejercicio"}
                          </span>
                          {ex.muscle_group_name && (
                            <span className="hidden sm:inline text-[10px] text-[#8E8E93]">
                              ({ex.muscle_group_name})
                            </span>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#1C1C1E] border border-white/5 text-[#A1A1AA]">
                          {ex.target_sets || 4} series × {ex.target_reps || "8-12"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botón de acción principal: Iniciar / Cargar en Modo Foco */}
                <div className="pt-5 mt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleLoadRoutineIntoWorkout(routine, true)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 active:scale-95 transition text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 select-none shadow-md shadow-[#FF5722]/10 cursor-pointer"
                  >
                    <Play size={15} fill="currentColor" />
                    <span>Iniciar / Cargar en Modo Foco</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECCIÓN 2: RUTINAS RÁPIDAS (SISTEMA) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-[10px] font-bold text-white">
              ⚡
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Rutinas Rápidas (Sistema)
            </h2>
          </div>
          <span className="text-xs text-[#8E8E93]">
            Planes predefinidos optimizados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {presetRoutines.map((routine) => {
            const isExpanded = expandedPresets[routine.id] ?? false;
            const isHeavyDuty =
              routine?.name?.toLowerCase().includes("heavy duty") ||
              routine?.description?.toLowerCase().includes("heavy duty");

            return (
              <div
                key={routine.id}
                className={`rounded-3xl border p-4 flex flex-col justify-between transition-all ${
                  isHeavyDuty
                    ? "border-[#FF5722]/40 bg-[#121212] hover:border-[#FF5722]/70 shadow-lg shadow-[#FF5722]/5"
                    : "border-[#2C2C2E] bg-[#121212] hover:border-[#3C3C3E]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isHeavyDuty
                          ? "border border-[#FF5722]/40 bg-gradient-to-r from-[#FF5722]/20 to-[#7C4DFF]/20 text-[#FF8A65]"
                          : "border border-white/5 bg-[#1C1C1E] text-[#FF8A65]"
                      }`}
                    >
                      {isHeavyDuty ? "🔥 Heavy Duty" : "Preset"}
                    </span>
                    <span className="text-[11px] text-[#8E8E93]">
                      {routine.exercises?.length || 0} ejercicios
                    </span>
                  </div>

                  <h3 className="text-white font-semibold text-base leading-snug">
                    {routine?.name || "Rutina"}
                  </h3>

                  {routine.description && (
                    <p className="text-[#8E8E93] text-xs mt-1 leading-relaxed">
                      {routine.description}
                    </p>
                  )}

                  {isHeavyDuty && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#FF8A65] font-semibold bg-[#FF5722]/10 border border-[#FF5722]/20 px-2 py-1 rounded-xl">
                      <span>⏱️ Cadencia 4-2-4 • 1 serie al fallo absoluto</span>
                    </div>
                  )}

                  {/* Toggle ver ejercicios */}
                  <button
                    type="button"
                    onClick={() => togglePresetExpand(routine.id)}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF8A65] hover:text-white transition cursor-pointer"
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
                    <div className="mt-2.5 space-y-1.5 pt-2 border-t border-white/5 animate-in fade-in duration-200">
                      {(routine.exercises || []).map((ex, idx) => (
                        <div
                          key={ex?.id || idx}
                          className="flex items-center justify-between text-xs py-1 text-[#D4D4D8] border-b border-white/[0.03] last:border-0"
                        >
                          <span className="truncate pr-2 font-medium">
                            {ex?.exercise_name || ex?.name || "Ejercicio"}
                          </span>
                          <span className="flex-shrink-0 text-[10px] text-[#8E8E93] bg-[#1C1C1E] px-1.5 py-0.5 rounded">
                            {ex.target_sets}×{ex.target_reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón Cargar en Entrenamiento */}
                <button
                  type="button"
                  onClick={() => handleLoadRoutineIntoWorkout(routine, false)}
                  className={`w-full mt-4 py-2 rounded-xl border active:scale-95 transition text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                    isHeavyDuty
                      ? "bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] border-transparent hover:opacity-90 shadow-md shadow-[#FF5722]/15"
                      : "bg-[#1C1C1E] hover:bg-[#2C2C2E] border-white/10"
                  }`}
                >
                  <Play size={13} fill="currentColor" className={isHeavyDuty ? "text-white" : "text-[#FF5722]"} />
                  <span>{isHeavyDuty ? "🔥 Iniciar Heavy Duty" : "Cargar en Entrenamiento"}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* MODAL: CREAR / EDITAR RUTINA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveRoutine}
            className="w-full max-w-lg bg-[#121212] border border-[#2C2C2E] rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[88dvh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
          >
            {/* Capa 1 - Cabecera Fija */}
            <div className="p-4 border-b border-[#2C2C2E] flex justify-between items-center bg-[#121212] flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white text-xs">
                  {editingRoutineId ? <Pencil size={14} /> : <Plus size={16} />}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {editingRoutineId ? "Editar Rutina" : "Crear Nueva Rutina"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white transition active:scale-95 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Capa 2 - Cuerpo Scrolleable */}
            <div className="p-4 space-y-4 overflow-y-auto overscroll-contain flex-1">
              {/* 1. Nombre de la Rutina */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Nombre de la rutina <span className="text-[#FF5722]">*</span>
                </label>
                <input
                  type="text"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                  placeholder="ej. Torso Pesado Profe Juan"
                  required
                  className="w-full rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] px-4 py-3 text-sm text-white placeholder-[#636366] focus:border-[#FF5722] focus:outline-none transition"
                />
              </div>

              {/* 2. Notas / Instrucciones */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Notas / Instrucciones (opcional)
                </label>
                <input
                  type="text"
                  value={routineDescription}
                  onChange={(e) => setRoutineDescription(e.target.value)}
                  placeholder="ej. Foco en deltoides y pectoral superior, descansar 2 min"
                  className="w-full rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] px-4 py-3 text-sm text-white placeholder-[#636366] focus:border-[#FF5722] focus:outline-none transition"
                />
              </div>

              {/* 3. Selector de Ejercicios del Catálogo */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Catálogo de Ejercicios
                  </label>
                  <span className="text-[11px] text-[#636366]">
                    Toca para agregar a la rutina
                  </span>
                </div>

                {/* Filtros: Buscador + Chips de Músculo */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]"
                    />
                    <input
                      type="text"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Buscar ejercicio en el catálogo..."
                      className="w-full rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#636366] focus:border-[#FF5722] focus:outline-none"
                    />
                  </div>

                  {/* Chips de filtro muscular */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <button
                      type="button"
                      onClick={() => setModalMuscleFilter("all")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
                        modalMuscleFilter === "all"
                          ? "bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white"
                          : "bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white"
                      }`}
                    >
                      Todos
                    </button>
                    {muscleGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setModalMuscleFilter(group.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
                          String(modalMuscleFilter) === String(group?.id)
                            ? "bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white"
                            : "bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white"
                        }`}
                      >
                        {group?.name || "Músculo"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de ejercicios para agregar */}
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E]/50 p-2">
                  {filteredCatalogExercises.length === 0 ? (
                    <p className="text-center text-xs text-[#8E8E93] py-4">
                      No se encontraron ejercicios
                    </p>
                  ) : (
                    filteredCatalogExercises.map((ex) => {
                      const isAdded = selectedExercises.some(
                        (se) => se.exercise_id === ex?.id
                      );
                      const mg = muscleGroups.find(
                        (g) => g?.id === ex?.muscle_group_id
                      );
                      return (
                        <button
                          key={ex?.id || Math.random()}
                          type="button"
                          onClick={() => handleAddExerciseToRoutine(ex)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                            isAdded
                              ? "bg-[#FF5722]/10 border border-[#FF5722]/40 text-white"
                              : "hover:bg-white/5 text-[#D4D4D8]"
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="text-xs font-medium">{ex?.name || "Ejercicio"}</span>
                            {mg && (
                              <span className="ml-2 text-[10px] text-[#8E8E93]">
                                • {mg?.name || ""}
                              </span>
                            )}
                          </div>
                          {isAdded ? (
                            <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#FF8A65]">
                              <Check size={13} />
                              <span>Añadido</span>
                            </span>
                          ) : (
                            <span className="flex-shrink-0 text-xs text-[#8E8E93] hover:text-white">
                              ＋
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 4. Lista de Ejercicios Agregados en la Rutina */}
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Ejercicios en la Rutina ({selectedExercises.length})
                  </label>
                  <span className="text-[11px] text-[#636366]">
                    Ajusta series y reps objetivo
                  </span>
                </div>

                {selectedExercises.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#2C2C2E] p-6 text-center text-xs text-[#8E8E93]">
                    No has seleccionado ningún ejercicio todavía. Toca los
                    ejercicios del catálogo para añadirlos.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedExercises.map((ex, index) => (
                      <div
                        key={ex.exercise_id}
                        className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Nombre y Orden */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Botones para reordenar */}
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveExercise(index, "up")}
                              className="p-1 rounded bg-[#2C2C2E] text-[#8E8E93] hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Subir orden"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              disabled={index === selectedExercises.length - 1}
                              onClick={() => handleMoveExercise(index, "down")}
                              className="p-1 rounded bg-[#2C2C2E] text-[#8E8E93] hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Bajar orden"
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>

                          <span className="text-xs font-bold text-[#FF5722] w-4 text-center">
                            {index + 1}.
                          </span>

                          <div className="truncate">
                            <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                              {ex?.exercise_name || ex?.name || "Ejercicio"}
                            </h4>
                            {ex?.muscle_group_name && (
                              <span className="text-[10px] text-[#8E8E93]">
                                {ex.muscle_group_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Controles de Series y Reps */}
                        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                          {/* Series */}
                          <div className="flex items-center gap-1 bg-[#121212] border border-[#2C2C2E] rounded-xl px-2 py-1">
                            <span className="text-[10px] text-[#8E8E93] font-medium mr-1">
                              Series:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateExerciseSets(index, -1)}
                              className="w-5 h-5 rounded bg-[#2C2C2E] text-white text-xs font-bold hover:bg-[#3C3C3E] cursor-pointer flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-white">
                              {ex.target_sets}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateExerciseSets(index, 1)}
                              className="w-5 h-5 rounded bg-[#2C2C2E] text-white text-xs font-bold hover:bg-[#3C3C3E] cursor-pointer flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>

                          {/* Reps */}
                          <div className="flex items-center gap-1 bg-[#121212] border border-[#2C2C2E] rounded-xl px-2 py-1">
                            <span className="text-[10px] text-[#8E8E93] font-medium">
                              Reps:
                            </span>
                            <input
                              type="text"
                              value={ex.target_reps}
                              onChange={(e) =>
                                handleUpdateExerciseReps(index, e.target.value)
                              }
                              placeholder="8-12"
                              className="w-14 bg-transparent text-center text-xs font-bold text-white focus:outline-none"
                            />
                          </div>

                          {/* Quitar ejercicio */}
                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseFromRoutine(index)}
                            className="p-1.5 rounded-xl text-[#8E8E93] hover:text-rose-400 hover:bg-rose-500/10 transition active:scale-95 cursor-pointer"
                            title="Quitar ejercicio"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Capa 3 - Pie de Acción Fijo / Anclado */}
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#2C2C2E] bg-[#121212] flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 sm:px-5 py-3.5 rounded-2xl bg-[#1C1C1E] border border-white/5 text-sm font-semibold text-[#8E8E93] hover:text-white transition active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white py-3.5 rounded-2xl font-semibold shadow-none hover:opacity-95 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>
                    {editingRoutineId ? "Guardar Cambios" : "Guardar Rutina"}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DIÁLOGO: CONFIRMAR ELIMINACIÓN */}
      {routineToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-[#2C2C2E] bg-[#121212] p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                ¿Eliminar rutina?
              </h3>
              <p className="text-xs text-[#8E8E93] mt-1.5 leading-relaxed">
                Estás a punto de eliminar{" "}
                <span className="text-white font-semibold">
                  "{routineToDelete?.name || "esta rutina"}"
                </span>
                . Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setRoutineToDelete(null)}
                className="py-2.5 rounded-2xl bg-[#1C1C1E] border border-white/5 text-xs font-semibold text-[#8E8E93] hover:text-white transition active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
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
    </div>
  );
}
