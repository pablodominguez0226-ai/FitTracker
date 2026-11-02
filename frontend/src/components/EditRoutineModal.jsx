import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { createRoutine, updateRoutine } from "../api/client";
import ExerciseSelectorModal from "./ExerciseSelectorModal";
import { showToast } from "./Toast";

/**
 * EditRoutineModal - Modal para crear o editar una rutina personalizada.
 * Permite:
 * - Cambiar el nombre de la rutina (ej. de "Lunes" a "Torso / Empuje")
 * - Modificar series objetivo y rango de repeticiones de cada ejercicio (ej. 3 series, 8-12 reps)
 * - Reordenar ejercicios o eliminarlos con un botón de cesto de basura
 * - Botón "+ Agregar ejercicio a la rutina" que abre el catálogo limpio
 * - Botón "Guardar Rutina" (bg-red-600 text-white font-bold py-2.5 px-5 rounded-full)
 */
export default function EditRoutineModal({
  isOpen,
  routine = null,
  allExercises = [],
  muscleGroups = [],
  onClose,
  onSaved,
  onExerciseCreated,
  onExerciseDeleted,
}) {
  const isEditing = Boolean(routine?.id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsCatalogOpen(false);
      return;
    }
    if (routine) {
      setName(routine.name || "");
      setDescription(routine.description || "");
      const mapped = (routine.exercises || []).map((re, idx) => ({
        tempKey: re.id ? `re-${re.id}` : `item-${idx}-${Date.now()}`,
        exercise_id: re.exercise_id,
        exercise_name:
          re.exercise_name || re.name || `Ejercicio #${re.exercise_id}`,
        muscle_group_name: re.muscle_group_name || re.muscle || "",
        target_sets: re.target_sets || 3,
        target_reps: String(re.target_reps || "8-12").replace(/\s*reps$/i, ""),
      }));
      setExercises(mapped);
    } else {
      setName("");
      setDescription("");
      setExercises([]);
    }
  }, [isOpen, routine]);

  if (!isOpen) return null;

  const handleMoveExercise = (index, direction) => {
    setExercises((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleRemoveExercise = (index) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetsChange = (index, rawVal) => {
    setExercises((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      const parsed = parseInt(rawVal, 10);
      next[index] = {
        ...next[index],
        target_sets: isNaN(parsed) ? "" : Math.max(1, Math.min(20, parsed)),
      };
      return next;
    });
  };

  const handleAdjustSets = (index, delta) => {
    setExercises((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      const current = parseInt(next[index].target_sets, 10) || 3;
      next[index] = {
        ...next[index],
        target_sets: Math.max(1, Math.min(20, current + delta)),
      };
      return next;
    });
  };

  const handleRepsChange = (index, rawVal) => {
    setExercises((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = {
        ...next[index],
        target_reps: rawVal,
      };
      return next;
    });
  };

  const handleAddExerciseFromCatalog = (exercise) => {
    if (!exercise?.id) return;
    const mg = (muscleGroups || []).find(
      (g) => g?.id === exercise.muscle_group_id
    );
    setExercises((prev) => {
      if (prev.some((e) => e.exercise_id === exercise.id)) {
        showToast(`"${exercise.name}" ya está en la rutina`, "info");
        return prev;
      }
      return [
        ...prev,
        {
          tempKey: `new-${exercise.id}-${Date.now()}`,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          muscle_group_name: mg?.name || exercise.muscle_group_name || "",
          target_sets: 3,
          target_reps: "8-12",
        },
      ];
    });
    setIsCatalogOpen(false);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showToast("Ingresá un nombre para la rutina", "error");
      return;
    }
    if (exercises.length === 0) {
      showToast("Agregá al menos un ejercicio a la rutina", "error");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: cleanName,
        description: description.trim() || null,
        exercises: exercises.map((ex, idx) => ({
          exercise_id: Number(ex.exercise_id),
          order_index: idx,
          target_sets: Math.max(1, parseInt(ex.target_sets, 10) || 3),
          target_reps:
            String(ex.target_reps || "8-12")
              .replace(/\s*reps$/i, "")
              .trim() || "8-12",
        })),
      };

      const saved = isEditing
        ? await updateRoutine(routine.id, payload)
        : await createRoutine(payload);

      showToast(
        isEditing
          ? `Rutina "${cleanName}" actualizada`
          : `Rutina "${cleanName}" creada`,
        "success"
      );

      if (onSaved) {
        onSaved(saved, isEditing);
      }
      onClose();
    } catch (err) {
      console.error("Error guardando rutina:", err);
      const msg =
        err.response?.data?.detail || "No se pudo guardar la rutina";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none"
        onClick={onClose}
      >
        <form
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md sm:max-w-lg bg-[#0B0F19] border border-white/10 rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[88dvh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-white"
        >
          {/* Cabecera */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0E131F] shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-950/40 text-red-400 border border-red-900/30 font-bold">
                {isEditing ? <Pencil size={15} /> : <Plus size={16} />}
              </span>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {isEditing ? "Editar Rutina" : "Crear Nueva Rutina"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Personalizá nombre, ejercicios, series y repeticiones
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Cerrar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Cuerpo Scrolleable */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5 custom-scrollbar">
            {/* Nombre y Descripción */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Nombre de la rutina <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Torso / Empuje, Lunes..."
                  className="w-full h-9 rounded-xl bg-[#161B26] border border-white/10 px-3 text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Notas / Foco (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Foco en pecho y tríceps"
                  className="w-full h-9 rounded-xl bg-[#161B26] border border-white/10 px-3 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Lista de Ejercicios en la Rutina */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Ejercicios ({exercises.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsCatalogOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-950/40 hover:bg-red-950/70 text-red-400 border border-red-900/30 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <span>Agregar ejercicio</span>
                </button>
              </div>

              {exercises.length === 0 ? (
                <div
                  onClick={() => setIsCatalogOpen(true)}
                  className="rounded-2xl border border-dashed border-white/10 bg-[#0E131F]/60 p-6 text-center cursor-pointer hover:border-red-500/40 transition"
                >
                  <Dumbbell size={24} className="mx-auto text-slate-500 mb-1.5" />
                  <p className="text-xs font-semibold text-white">
                    No hay ejercicios en esta rutina
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tocá para abrir el catálogo y agregar ejercicios
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {exercises.map((ex, idx) => (
                    <div
                      key={ex.tempKey || `${ex.exercise_id}-${idx}`}
                      className="rounded-xl bg-[#0F141F] border border-white/5 px-2.5 py-2 flex flex-col gap-2"
                    >
                      {/* Fila 1: Orden, Nombre, Músculo y Papelera */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveExercise(idx, "up")}
                              className="p-0.5 rounded bg-white/5 text-slate-400 hover:text-white disabled:opacity-25 cursor-pointer"
                              title="Subir"
                            >
                              <ArrowUp size={10} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === exercises.length - 1}
                              onClick={() => handleMoveExercise(idx, "down")}
                              className="p-0.5 rounded bg-white/5 text-slate-400 hover:text-white disabled:opacity-25 cursor-pointer"
                              title="Bajar"
                            >
                              <ArrowDown size={10} />
                            </button>
                          </div>

                          <span className="w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>

                          <span className="text-xs font-semibold text-white truncate">
                            {ex.exercise_name}
                          </span>

                          {ex.muscle_group_name && (
                            <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-red-950/40 text-red-400 border border-red-900/30 shrink-0">
                              {ex.muscle_group_name}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(idx)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer shrink-0"
                          title="Eliminar ejercicio de la rutina"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Fila 2: Controles de Series objetivo y Rango de repeticiones */}
                      <div className="flex items-center justify-between gap-2 pl-6">
                        <div className="flex items-center gap-1.5 bg-[#161B26] border border-white/10 rounded-lg px-2 py-1">
                          <span className="text-[10px] font-semibold text-slate-400">
                            Series:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustSets(idx, -1)}
                            className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={ex.target_sets}
                            onChange={(e) =>
                              handleSetsChange(idx, e.target.value)
                            }
                            aria-label={`Series ${ex.exercise_name}`}
                            className="w-8 bg-transparent text-center text-xs font-bold text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustSets(idx, 1)}
                            className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#161B26] border border-white/10 rounded-lg px-2.5 py-1 flex-1 max-w-[165px]">
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                            Reps:
                          </span>
                          <input
                            type="text"
                            value={ex.target_reps}
                            onChange={(e) =>
                              handleRepsChange(idx, e.target.value)
                            }
                            placeholder="8-12"
                            aria-label={`Repeticiones ${ex.exercise_name}`}
                            className="w-full bg-transparent text-center text-xs font-bold text-red-400 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón "+ Agregar ejercicio a la rutina" */}
              <button
                type="button"
                onClick={() => setIsCatalogOpen(true)}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-white/15 bg-[#0E131F] hover:border-red-500/40 hover:bg-[#161B26] text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer"
              >
                <Plus size={14} className="text-red-400" strokeWidth={2.5} />
                <span>+ Agregar ejercicio a la rutina</span>
              </button>
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-white/10 bg-[#0E131F] flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full py-2.5 px-4 text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-full text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-red-600/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Rutina</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Selector de Ejercicios del Catálogo */}
      <ExerciseSelectorModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        title="Agregar Ejercicio a la Rutina"
        allExercises={allExercises}
        muscleGroups={muscleGroups}
        onSelect={handleAddExerciseFromCatalog}
        onExerciseCreated={(newEx) => {
          if (onExerciseCreated) onExerciseCreated(newEx);
          handleAddExerciseFromCatalog(newEx);
        }}
        onExerciseDeleted={onExerciseDeleted}
      />
    </>
  );
}
