import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Dumbbell,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  getRoutines,
  getMuscleGroups,
  getExercises,
  deleteRoutine,
  updateRoutine,
} from "../api/client";
import { showToast } from "../components/Toast";
import EditRoutineModal from "../components/EditRoutineModal";

/**
 * RoutineExerciseRowCompact - Ítem de ejercicio ultra compacto (altura ~34px - 38px)
 * - Padding estricto: py-1 px-2.5 rounded-lg bg-[#0F141F] border border-white/5 flex items-center justify-between
 * - Izquierda: Badge numérico w-4 h-4 + Nombre (text-xs font-semibold text-white truncate max-w-[170px]) + inline (text-[10px] text-slate-400 ml-1.5)
 * - Derecha: Badge muscular mini + Botón quitar ejercicio rápido (✕)
 */
export function RoutineExerciseRowCompact({
  ex,
  idx,
  onRemoveExercise = null,
}) {
  const exerciseTitle =
    ex?.exercise_name || ex?.name || `Ejercicio #${ex?.exercise_id || idx + 1}`;
  const muscleLabel = ex?.muscle_group_name || ex?.muscle || "";
  const targetSets = ex?.target_sets || 3;
  const rawReps = String(ex?.target_reps || "8-12")
    .replace(/\s*reps$/i, "")
    .trim();

  return (
    <div className="py-1 px-2.5 rounded-lg bg-[#0F141F] border border-white/5 flex items-center justify-between gap-1.5 min-h-[34px]">
      {/* Lado izquierdo */}
      <div className="flex items-center min-w-0 flex-1 overflow-hidden">
        <span className="w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 mr-2">
          {idx + 1}
        </span>
        <span className="text-xs font-semibold text-white truncate max-w-[170px]">
          {exerciseTitle}
        </span>
        <span className="text-[10px] text-slate-400 ml-1.5 whitespace-nowrap shrink-0">
          {targetSets} {targetSets === 1 ? "serie" : "series"} • {rawReps} reps
        </span>
      </div>

      {/* Lado derecho */}
      <div className="flex items-center shrink-0">
        {muscleLabel && (
          <span className="px-1.5 py-0.2 py-0.5 text-[9px] font-medium rounded bg-red-950/40 text-red-400 border border-red-900/30 shrink-0 mr-1">
            {muscleLabel}
          </span>
        )}
        {onRemoveExercise && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveExercise(ex, idx);
            }}
            className="text-slate-500 hover:text-red-400 text-xs p-1 leading-none transition cursor-pointer"
            title="Quitar ejercicio de la rutina"
            aria-label={`Quitar ${exerciseTitle} de la rutina`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export const ExerciseRowCompact = RoutineExerciseRowCompact;
export const ExerciseCompactItem = RoutineExerciseRowCompact;

export default function Bitacora({ currentUser }) {
  const navigate = useNavigate();

  const [routines, setRoutines] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [allExercises, setAllExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal "Ver ejercicios"
  const [selectedRoutineForModal, setSelectedRoutineForModal] = useState(null);

  // Modal Crear / Editar Rutina (EditRoutineModal)
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [routineBeingEdited, setRoutineBeingEdited] = useState(null);

  // Modal Confirmación Eliminar Rutina
  const [routineToDelete, setRoutineToDelete] = useState(null);
  const [isDeletingRoutine, setIsDeletingRoutine] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routinesData, groupsData, exercisesData] = await Promise.all([
        getRoutines().catch(() => []),
        getMuscleGroups().catch(() => []),
        getExercises().catch(() => []),
      ]);

      const userOnly = (
        Array.isArray(routinesData) ? routinesData : []
      ).filter((r) => !r.is_preset);
      setRoutines(userOnly);
      setMuscleGroups(Array.isArray(groupsData) ? groupsData : []);
      setAllExercises(Array.isArray(exercisesData) ? exercisesData : []);
    } catch (err) {
      console.error("Error al cargar datos en Bitácora:", err);
      showToast("Error al cargar las rutinas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lanzar entrenamiento con la rutina en Workouts.jsx
  const handleStartRoutine = (routine, enterFocus = true) => {
    const routinePayload = {
      id: routine.id,
      name: routine.name,
      title: routine.name,
      description: routine.description || "",
      exercises: (routine.exercises || []).map((re) => ({
        exercise_id: re.exercise_id,
        id: re.exercise_id,
        name: re.exercise_name || `Ejercicio #${re.exercise_id}`,
        muscle: re.muscle_group_name || "General",
        target_sets: re.target_sets || 3,
        target_reps: re.target_reps || "8-12",
      })),
    };

    showToast(`⚡ Iniciando "${routine.name}"...`, "info");
    navigate("/workouts", {
      state: {
        loadRoutine: routinePayload,
        enterFocus,
      },
    });
  };

  const handleStartFreeWorkout = () => {
    navigate("/workouts");
  };

  const handleOpenCreateRoutine = () => {
    setRoutineBeingEdited(null);
    setIsRoutineModalOpen(true);
  };

  const handleOpenEditRoutine = (routine) => {
    setRoutineBeingEdited(routine);
    setIsRoutineModalOpen(true);
  };

  // Quitar un ejercicio puntual de la rutina directamente desde la fila ultra compacta
  const handleQuickRemoveExercise = async (routine, exerciseIndex) => {
    if (!routine?.id) return;
    const currentExercises = Array.isArray(routine.exercises)
      ? routine.exercises
      : [];
    const removedEx = currentExercises[exerciseIndex];
    const remaining = currentExercises.filter((_, idx) => idx !== exerciseIndex);

    const backupRoutines = [...routines];
    // Actualización optimista inmediata en la tarjeta
    const optimisticRoutine = {
      ...routine,
      exercises: remaining.map((ex, i) => ({ ...ex, order_index: i })),
    };
    setRoutines((prev) =>
      prev.map((r) => (r.id === routine.id ? optimisticRoutine : r))
    );
    if (selectedRoutineForModal?.id === routine.id) {
      setSelectedRoutineForModal(optimisticRoutine);
    }

    try {
      const updated = await updateRoutine(routine.id, {
        name: routine.name,
        description: routine.description || null,
        exercises: remaining.map((ex, idx) => ({
          exercise_id: ex.exercise_id,
          order_index: idx,
          target_sets: ex.target_sets || 3,
          target_reps: String(ex.target_reps || "8-12").trim(),
        })),
      });
      setRoutines((prev) =>
        prev.map((r) => (r.id === routine.id ? updated : r))
      );
      if (selectedRoutineForModal?.id === routine.id) {
        setSelectedRoutineForModal(updated);
      }
      showToast(
        `"${removedEx?.exercise_name || "Ejercicio"}" quitado de ${routine.name}`,
        "info"
      );
    } catch (err) {
      console.error("Error quitando ejercicio de la rutina:", err);
      setRoutines(backupRoutines);
      showToast("No se pudo actualizar la rutina", "error");
    }
  };

  // Confirmar eliminación de rutina completa
  const handleConfirmDeleteRoutine = async () => {
    if (!routineToDelete?.id || isDeletingRoutine) return;
    const target = routineToDelete;
    setIsDeletingRoutine(true);

    try {
      await deleteRoutine(target.id);
      setRoutines((prev) => prev.filter((r) => r.id !== target.id));
      if (selectedRoutineForModal?.id === target.id) {
        setSelectedRoutineForModal(null);
      }
      setRoutineToDelete(null);
      showToast(`Rutina "${target.name}" eliminada`, "info");
    } catch (err) {
      console.error("Error al eliminar rutina:", err);
      showToast("No se pudo eliminar la rutina", "error");
    } finally {
      setIsDeletingRoutine(false);
    }
  };

  const handleRoutineSaved = (savedRoutine, isEditing) => {
    if (!savedRoutine?.id) {
      loadData();
      return;
    }
    if (isEditing) {
      setRoutines((prev) =>
        prev.map((r) => (r.id === savedRoutine.id ? savedRoutine : r))
      );
      if (selectedRoutineForModal?.id === savedRoutine.id) {
        setSelectedRoutineForModal(savedRoutine);
      }
    } else {
      setRoutines((prev) => [savedRoutine, ...prev]);
    }
  };

  if (loading) {
    return (
      <div className="pb-40 pb-[calc(8rem+env(safe-area-inset-bottom))] px-4 w-full max-w-md mx-auto min-h-[100dvh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-red-500" />
        <p className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
          Cargando rutinas...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 select-none pb-40 pb-[calc(8rem+env(safe-area-inset-bottom))]">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.07] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600 text-white font-bold shadow-none shrink-0">
            <Dumbbell size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Bitácora de Entrenamiento
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {routines.length > 0
                ? `${routines.length} ${
                    routines.length === 1
                      ? "rutina personalizada"
                      : "rutinas personalizadas"
                  }`
                : "Planificá y ejecutá tus sesiones de fuerza"}
            </p>
          </div>
        </div>

        {/* ACCIONES RÁPIDAS EN CABECERA */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate("/exercises")}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#0E131F] px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95 cursor-pointer"
          >
            <Dumbbell size={14} />
            <span>Catálogo</span>
          </button>

          {routines.length > 0 && (
            <button
              type="button"
              onClick={handleStartFreeWorkout}
              className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-[#0E131F] px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95 cursor-pointer"
            >
              <Activity size={14} className="text-red-500" />
              <span>Entrenamiento Libre</span>
            </button>
          )}
        </div>
      </div>

      {/* CASO 1: USUARIO SIN RUTINAS CREADAS */}
      {routines.length === 0 ? (
        <div className="w-full bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] rounded-3xl p-6 flex flex-col items-center text-center gap-5 shadow-xl mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/30 text-red-500">
            <Dumbbell size={32} />
          </div>

          <div className="space-y-1.5 max-w-xs">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              No tenés rutinas creadas todavía
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Comenzá un entrenamiento libre con cualquier ejercicio o armá tu
              primera rutina personalizada (ej: Lunes, Torso / Empuje).
            </p>
          </div>

          <div className="w-full space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleOpenCreateRoutine}
              className="h-12 w-full flex items-center justify-center font-bold text-sm rounded-full border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-[#161B26] hover:bg-slate-100 dark:hover:bg-[#1E2534] text-slate-900 dark:text-white hover:border-red-500/40 active:scale-95 transition cursor-pointer gap-2"
            >
              <Plus size={16} strokeWidth={2.5} className="text-red-500" />
              <span>＋ Crear Nueva Rutina</span>
            </button>

            <button
              type="button"
              onClick={handleStartFreeWorkout}
              className="h-12 w-full mb-4 flex items-center justify-center font-bold text-sm rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 active:scale-95 transition cursor-pointer gap-2"
            >
              <span>⚡</span>
              <span>Iniciar Entrenamiento Libre</span>
            </button>
          </div>
        </div>
      ) : (
        /* CASO 2: USUARIO CON RUTINAS GUARDADAS */
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tus Rutinas Guardadas
            </h2>
            <button
              type="button"
              onClick={handleOpenCreateRoutine}
              className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Crear Rutina</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {routines.map((routine) => {
              const exercisesList = routine.exercises || [];
              return (
                <div
                  key={routine.id}
                  className="w-full bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] rounded-3xl p-4 flex flex-col justify-between gap-2.5 shadow-xl transition-all"
                >
                  {/* Botones superiores: Ver ejercicios / Iniciar */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRoutineForModal(routine)}
                      className="flex-1 py-2 px-3.5 rounded-full bg-slate-100 dark:bg-[#161B26] text-slate-900 dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200/80 dark:border-white/5 transition active:scale-95 cursor-pointer"
                    >
                      <Eye size={13} className="text-red-500" />
                      <span>Ver ejercicios</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartRoutine(routine, true)}
                      className="flex-1 py-2 px-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                    >
                      <span>⚡</span>
                      <span>Iniciar</span>
                    </button>
                  </div>

                  {/* Cabecera de la Rutina ("Lunes") con controles de Editar y Eliminar alineados a la derecha */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                        {routine.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {routine.description ||
                          `${exercisesList.length} ${
                            exercisesList.length === 1
                              ? "ejercicio en esta rutina"
                              : "ejercicios en esta rutina"
                          }`}
                      </p>
                    </div>

                    {/* Controles de gestión: Editar (Pencil) y Eliminar (Trash2) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRoutine(routine)}
                        title={`Editar rutina ${routine.name}`}
                        aria-label={`Editar rutina ${routine.name}`}
                        className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-[#161B26] border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-red-500/40 flex items-center justify-center transition active:scale-90 cursor-pointer"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoutineToDelete(routine)}
                        title={`Eliminar rutina ${routine.name}`}
                        aria-label={`Eliminar rutina ${routine.name}`}
                        className="h-8 w-8 rounded-xl bg-red-950/30 border border-red-900/30 text-red-400 hover:text-red-300 hover:bg-red-950/60 flex items-center justify-center transition active:scale-90 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Lista ultra compacta de ejercicios (space-y-1 / gap-1) */}
                  <div className="flex flex-col space-y-1 gap-1 pt-0.5">
                    {exercisesList.map((ex, idx) => (
                      <RoutineExerciseRowCompact
                        key={ex.id || `${ex.exercise_id}-${idx}`}
                        ex={ex}
                        idx={idx}
                        onRemoveExercise={(_, indexToRemove) =>
                          handleQuickRemoveExercise(routine, indexToRemove)
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Acciones inferiores al final del flujo scrolleable con margen propio (mb-4) */}
          <div className="space-y-2.5 pt-2 pb-2">
            <button
              type="button"
              onClick={handleOpenCreateRoutine}
              className="h-11 w-full flex items-center justify-center font-bold text-xs sm:text-sm rounded-full border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0E131F] hover:bg-slate-50 dark:hover:bg-[#161B26] text-slate-900 dark:text-white transition active:scale-95 cursor-pointer gap-2"
            >
              <Plus size={16} strokeWidth={2.5} className="text-red-500" />
              <span>＋ Crear Nueva Rutina</span>
            </button>

            <button
              type="button"
              onClick={handleStartFreeWorkout}
              className="h-12 w-full mb-4 flex items-center justify-center font-bold text-sm rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 transition active:scale-95 cursor-pointer gap-2"
            >
              <span>⚡</span>
              <span>Iniciar Entrenamiento Libre</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE RUTINA / "VER EJERCICIOS" */}
      {selectedRoutineForModal && (
        <div
          onClick={() => setSelectedRoutineForModal(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 select-none animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md flex flex-col max-h-[88dvh] rounded-2xl bg-[#0B0F17] border border-white/10 overflow-hidden shadow-2xl pt-2"
          >
            {/* Header del Modal ultra compacto */}
            <div className="px-4 mb-2 pt-1 pb-2 border-b border-white/5 flex items-start justify-between gap-2 shrink-0 bg-[#0B0F17]">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] tracking-wider text-red-500 font-bold uppercase block">
                  RUTINA PERSONALIZADA
                </span>
                <h3 className="text-lg font-black text-white leading-none mt-0.5 truncate">
                  {selectedRoutineForModal.name}
                </h3>
                {selectedRoutineForModal.description && (
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight line-clamp-1">
                    {selectedRoutineForModal.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const r = selectedRoutineForModal;
                    setSelectedRoutineForModal(null);
                    handleOpenEditRoutine(r);
                  }}
                  className="w-7 h-7 rounded-full bg-white/5 text-slate-300 hover:text-white flex items-center justify-center text-xs transition active:scale-95 cursor-pointer"
                  title="Editar rutina"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoutineForModal(null)}
                  className="w-7 h-7 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center text-xs transition active:scale-95 cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Lista central compacta con scroll independiente */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 flex flex-col space-y-1 gap-1 custom-scrollbar">
              {(selectedRoutineForModal.exercises || []).map((ex, idx) => (
                <RoutineExerciseRowCompact
                  key={ex.id || `${ex.exercise_id}-${idx}`}
                  ex={ex}
                  idx={idx}
                  onRemoveExercise={(_, indexToRemove) =>
                    handleQuickRemoveExercise(
                      selectedRoutineForModal,
                      indexToRemove
                    )
                  }
                />
              ))}
            </div>

            {/* Footer de Acciones */}
            <div className="pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] px-4 bg-[#0B0F17] border-t border-white/5 flex items-center gap-2 shrink-0 z-20">
              <button
                type="button"
                onClick={() => setSelectedRoutineForModal(null)}
                className="py-2.5 px-4 rounded-full bg-[#161B26] hover:bg-[#1f2636] text-slate-300 text-xs font-semibold flex-1 text-center border border-white/5 transition active:scale-95 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const r = selectedRoutineForModal;
                  setSelectedRoutineForModal(null);
                  handleStartRoutine(r, true);
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

      {/* MODAL CONFIRMACIÓN ELIMINAR RUTINA */}
      {routineToDelete && (
        <div
          className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setRoutineToDelete(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-[#0E131F] border border-white/10 p-5 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-10 h-10 rounded-xl bg-red-950/40 border border-red-900/30 text-red-400 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {`¿Eliminar la rutina ${routineToDelete.name}?`}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Esta acción desvinculará sus ejercicios y no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingRoutine}
                onClick={() => setRoutineToDelete(null)}
                className="flex-1 py-2 px-3 rounded-full text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingRoutine}
                onClick={handleConfirmDeleteRoutine}
                className="flex-1 py-2 px-3 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition active:scale-95 cursor-pointer shadow-md shadow-red-600/25 flex items-center justify-center gap-1"
              >
                {isDeletingRoutine ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <span>Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR RUTINA */}
      <EditRoutineModal
        isOpen={isRoutineModalOpen}
        routine={routineBeingEdited}
        allExercises={allExercises}
        muscleGroups={muscleGroups}
        onClose={() => {
          setIsRoutineModalOpen(false);
          setRoutineBeingEdited(null);
        }}
        onSaved={handleRoutineSaved}
        onExerciseCreated={(newEx) => {
          setAllExercises((prev) => [newEx, ...prev]);
        }}
        onExerciseDeleted={(delId) => {
          setAllExercises((prev) => prev.filter((e) => e.id !== delId));
        }}
      />
    </div>
  );
}
