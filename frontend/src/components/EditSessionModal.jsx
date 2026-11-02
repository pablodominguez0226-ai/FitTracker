import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Dumbbell,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { updateWorkoutSession } from "../api/client";
import { showToast } from "./Toast";

/**
 * EditSessionModal - Modal para editar un entrenamiento registrado en el Historial de Sesiones.
 * Permite ajustar la fecha de la sesión, ver el desglose de ejercicios y editar los valores
 * de carga (kg) y repeticiones de cada serie, o eliminar/agregar series.
 */
export default function EditSessionModal({
  isOpen,
  session,
  onClose,
  onSessionUpdated,
}) {
  const [dateValue, setDateValue] = useState("");
  const [notesValue, setNotesValue] = useState("");
  const [editableSets, setEditableSets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !session) return;
    setError("");
    const rawDate = session.local_date_str || session.date || "";
    const normalizedDate = String(rawDate).split("T")[0];
    setDateValue(normalizedDate);
    setNotesValue(session.notes || "");

    const initialSets = (session.sets || []).map((st, idx) => ({
      id: st.id || null,
      tempKey: st.id ? `set-${st.id}` : `temp-${idx}-${Date.now()}`,
      exercise_id: st.exercise_id,
      exercise_name: st.exercise_name || `Ejercicio #${st.exercise_id}`,
      muscle_group_name: st.muscle_group_name || null,
      subgroup: st.subgroup || null,
      set_number: st.set_number || idx + 1,
      weight: st.weight ?? 0,
      reps: st.reps ?? 0,
      completed: st.completed !== undefined ? Boolean(st.completed) : true,
      rest_effort: st.rest_effort || null,
      rir: st.rir ?? null,
      set_type: st.set_type || "normal",
    }));
    setEditableSets(initialSets);
  }, [isOpen, session]);

  // Agrupar series por ejercicio manteniendo el orden de aparición
  const groupedExercises = useMemo(() => {
    const groups = [];
    const mapByExId = new Map();

    editableSets.forEach((st) => {
      const exId = st.exercise_id;
      if (!mapByExId.has(exId)) {
        const group = {
          exercise_id: exId,
          exercise_name: st.exercise_name || `Ejercicio #${exId}`,
          sets: [],
        };
        mapByExId.set(exId, group);
        groups.push(group);
      }
      mapByExId.get(exId).sets.push(st);
    });

    return groups;
  }, [editableSets]);

  const totalVolumePreview = useMemo(() => {
    return editableSets.reduce((acc, st) => {
      if (!st.completed) return acc;
      const w = parseFloat(st.weight) || 0;
      const r = parseInt(st.reps, 10) || 0;
      return acc + w * r;
    }, 0);
  }, [editableSets]);

  if (!isOpen || !session) return null;

  const handleSetFieldChange = (tempKey, field, rawVal) => {
    setEditableSets((prev) =>
      prev.map((item) => {
        if (item.tempKey !== tempKey) return item;
        return {
          ...item,
          [field]: rawVal,
        };
      })
    );
  };

  const handleRemoveSet = (tempKey) => {
    setEditableSets((prev) => {
      const filtered = prev.filter((item) => item.tempKey !== tempKey);
      // Renumerar series dentro de cada ejercicio
      const countsByEx = {};
      return filtered.map((item) => {
        const exId = item.exercise_id;
        countsByEx[exId] = (countsByEx[exId] || 0) + 1;
        return {
          ...item,
          set_number: countsByEx[exId],
        };
      });
    });
  };

  const handleAddSetToExercise = (exerciseId, exerciseName) => {
    setEditableSets((prev) => {
      const existingForEx = prev.filter(
        (item) => item.exercise_id === exerciseId
      );
      const lastSet = existingForEx[existingForEx.length - 1];
      const nextSetNum = existingForEx.length + 1;
      const newSet = {
        id: null,
        tempKey: `new-${exerciseId}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        set_number: nextSetNum,
        weight: lastSet ? lastSet.weight : 0,
        reps: lastSet ? lastSet.reps : 10,
        completed: true,
        rest_effort: null,
        rir: null,
        set_type: "normal",
      };
      return [...prev, newSet];
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!dateValue) {
      setError("Seleccioná una fecha válida para la sesión.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const countsByEx = {};
      const normalizedSetsPayload = editableSets.map((st) => {
        const exId = Number(st.exercise_id);
        countsByEx[exId] = (countsByEx[exId] || 0) + 1;
        const parsedWeight = parseFloat(
          String(st.weight).replace(",", ".")
        );
        const parsedReps = parseInt(st.reps, 10);
        return {
          id: st.id ? Number(st.id) : null,
          exercise_id: exId,
          set_number: countsByEx[exId],
          weight: isNaN(parsedWeight) || parsedWeight < 0 ? 0 : parsedWeight,
          reps: isNaN(parsedReps) || parsedReps < 0 ? 0 : parsedReps,
          completed: Boolean(st.completed),
          rest_effort: st.rest_effort || null,
          rir: st.rir ?? null,
          set_type: st.set_type || "normal",
        };
      });

      const updated = await updateWorkoutSession(session.id, {
        date: dateValue,
        notes: notesValue,
        sets: normalizedSetsPayload,
      });

      showToast("Entrenamiento actualizado correctamente", "success");
      if (onSessionUpdated) {
        onSessionUpdated(updated);
      }
      onClose();
    } catch (err) {
      console.error("Error guardando sesión editada:", err);
      const msg =
        err.response?.data?.detail ||
        "No se pudieron guardar los cambios de la sesión.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md sm:max-w-lg bg-[#0B0F19] border border-white/10 rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[88dvh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-white"
      >
        {/* Cabecera */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0E131F] flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Editar Entrenamiento
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ajustá la fecha, cargas (kg) y repeticiones registradas
            </p>
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
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 custom-scrollbar">
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300">
              {error}
            </div>
          )}

          {/* Selector de Fecha y Resumen de Volumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#0E131F] border border-white/[0.08] p-3 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar size={12} className="text-red-400" />
                <span>Fecha de la sesión</span>
              </label>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                required
                className="w-full h-9 rounded-xl bg-[#161B26] border border-white/10 px-3 text-xs font-semibold text-white outline-none focus:border-red-500"
              />
            </div>

            <div className="rounded-2xl bg-[#0E131F] border border-white/[0.08] p-3 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Resumen recalculado
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-extrabold text-white">
                  {Math.round(totalVolumePreview).toLocaleString("es-ES")} kg
                </span>
                <span className="text-xs font-semibold text-red-400">
                  {editableSets.length}{" "}
                  {editableSets.length === 1 ? "serie" : "series"}
                </span>
              </div>
            </div>
          </div>

          {/* Notas opcionales de la sesión */}
          <div className="rounded-2xl bg-[#0E131F] border border-white/[0.08] p-3 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Notas de la sesión (opcional)
            </label>
            <input
              type="text"
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Ej: Buen rendimiento, ajuste de cargas..."
              className="w-full h-9 rounded-xl bg-[#161B26] border border-white/10 px-3 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-red-500"
            />
          </div>

          {/* Desglose de Ejercicios y Series */}
          <div className="space-y-3">
            {groupedExercises.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#0E131F]/60 p-6 text-center">
                <Dumbbell size={24} className="mx-auto text-slate-500 mb-1.5" />
                <p className="text-xs text-slate-400">
                  No quedan series en esta sesión.
                </p>
              </div>
            ) : (
              groupedExercises.map((group) => (
                <div
                  key={group.exercise_id}
                  className="rounded-2xl bg-[#0E131F] border border-white/[0.08] p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                      {group.exercise_name}
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddSetToExercise(
                          group.exercise_id,
                          group.exercise_name
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-red-950/40 hover:bg-red-950/70 text-red-400 border border-red-900/30 px-2 py-1 text-[11px] font-bold transition cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Serie</span>
                    </button>
                  </div>

                  {/* Cabecera de columnas */}
                  <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="col-span-2">Serie</span>
                    <span className="col-span-4 text-center">Carga (kg)</span>
                    <span className="col-span-4 text-center">Reps</span>
                    <span className="col-span-2 text-right">Acción</span>
                  </div>

                  <div className="space-y-1.5">
                    {group.sets.map((st, idx) => (
                      <div
                        key={st.tempKey}
                        className="grid grid-cols-12 gap-2 items-center bg-[#161B26] rounded-xl px-2.5 py-1.5 border border-white/[0.05]"
                      >
                        <div className="col-span-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/5 text-xs font-bold text-slate-300">
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="col-span-4">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={st.weight}
                            onChange={(e) =>
                              handleSetFieldChange(
                                st.tempKey,
                                "weight",
                                e.target.value
                              )
                            }
                            aria-label={`Peso serie ${idx + 1}`}
                            className="w-full h-8 rounded-lg bg-[#0B0F19] border border-white/10 px-2 text-center text-xs font-bold text-white outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="col-span-4">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={st.reps}
                            onChange={(e) =>
                              handleSetFieldChange(
                                st.tempKey,
                                "reps",
                                e.target.value
                              )
                            }
                            aria-label={`Repeticiones serie ${idx + 1}`}
                            className="w-full h-8 rounded-lg bg-[#0B0F19] border border-white/10 px-2 text-center text-xs font-bold text-white outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(st.tempKey)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                            title="Quitar serie"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer de Acciones */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-white/10 bg-[#0E131F] flex items-center justify-end gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full py-2.5 px-4 text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full py-2.5 px-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-red-600/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Guardar Cambios</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
