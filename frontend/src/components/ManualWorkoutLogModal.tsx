import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Dumbbell,
  Loader2,
  Plus,
  Trash2,
  X,
  Flame,
  Check,
} from "lucide-react";
import { createManualWorkout, getExercises, getMuscleGroups, getRecords } from "../api/client";
import { showToast } from "./Toast";
import ExerciseSelectorModal from "./ExerciseSelectorModal";
import { getCachedExercises, getCachedMuscleGroups } from "../services/exerciseCache";
import { getLocalDateString } from "../utils/dateUtils";

interface ManualSet {
  id?: string;
  set_number: number;
  weight: number | string;
  reps: number | string;
  is_warmup: boolean;
}

interface ManualExercise {
  id: number | string;
  name: string;
  muscle: string;
  sets: ManualSet[];
}

interface ManualWorkoutLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (session: any) => void;
  initialDate?: string;
}

const DURATION_PRESETS = [30, 45, 60, 75, 90, 120];

export default function ManualWorkoutLogModal({
  isOpen,
  onClose,
  onSaved,
  initialDate,
}: ManualWorkoutLogModalProps) {
  // Default to initialDate or yesterday
  const defaultDateStr = useMemo(() => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      return initialDate;
    }
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  }, [initialDate]);

  const [date, setDate] = useState<string>(defaultDateStr);
  const [time, setTime] = useState<string>("18:30");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [notes, setNotes] = useState<string>("");
  const [exercises, setExercises] = useState<ManualExercise[]>([]);

  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [allExercises, setAllExercises] = useState<any[]>(() => getCachedExercises() || []);
  const [muscleGroups, setMuscleGroups] = useState<any[]>(() => getCachedMuscleGroups() || []);
  const [recordsMap, setRecordsMap] = useState<Record<string | number, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync date when initialDate changes
  useEffect(() => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      setDate(initialDate);
    }
  }, [initialDate]);

  // Load catalog options if needed
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    Promise.all([
      getMuscleGroups().catch(() => getCachedMuscleGroups() || []),
      getExercises().catch(() => getCachedExercises() || []),
      getRecords().catch(() => []),
    ]).then(([groups, exList, recs]) => {
      if (!isMounted) return;
      if (Array.isArray(groups) && groups.length > 0) setMuscleGroups(groups);
      if (Array.isArray(exList) && exList.length > 0) setAllExercises(exList);
      const rMap: Record<string | number, any> = {};
      if (Array.isArray(recs)) {
        recs.forEach((r) => {
          if (r?.exercise_id) rMap[r.exercise_id] = r;
        });
      }
      setRecordsMap(rMap);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Add exercise from catalog
  const handleSelectExercises = (selectedList: any[]) => {
    if (!selectedList || selectedList.length === 0) return;

    setExercises((prev) => {
      const next = [...prev];
      selectedList.forEach((ex) => {
        const existingIdx = next.findIndex((item) => item.id === ex.id);
        if (existingIdx === -1) {
          next.push({
            id: ex.id,
            name: ex.name,
            muscle: ex.muscle_group_name || ex.muscle || "General",
            sets: [
              {
                id: `set_${Date.now()}_1`,
                set_number: 1,
                weight: 60,
                reps: 10,
                is_warmup: false,
              },
              {
                id: `set_${Date.now()}_2`,
                set_number: 2,
                weight: 60,
                reps: 10,
                is_warmup: false,
              },
              {
                id: `set_${Date.now()}_3`,
                set_number: 3,
                weight: 60,
                reps: 10,
                is_warmup: false,
              },
            ],
          });
        }
      });
      return next;
    });

    setIsCatalogOpen(false);
  };

  // Add set to an exercise
  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const targetEx = next[exerciseIndex];
      if (!targetEx) return prev;

      const prevSet = targetEx.sets[targetEx.sets.length - 1];
      const newSetNumber = targetEx.sets.length + 1;

      targetEx.sets.push({
        id: `set_${Date.now()}_${newSetNumber}`,
        set_number: newSetNumber,
        weight: prevSet ? prevSet.weight : 50,
        reps: prevSet ? prevSet.reps : 10,
        is_warmup: false,
      });

      return next;
    });
  };

  // Update set weight / reps / warmup
  const handleUpdateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: "weight" | "reps" | "is_warmup",
    value: any
  ) => {
    setExercises((prev) => {
      const next = [...prev];
      const targetEx = next[exerciseIndex];
      if (!targetEx || !targetEx.sets[setIndex]) return prev;

      targetEx.sets[setIndex] = {
        ...targetEx.sets[setIndex],
        [field]: value,
      };

      return next;
    });
  };

  // Remove set
  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const targetEx = next[exerciseIndex];
      if (!targetEx) return prev;

      targetEx.sets = targetEx.sets
        .filter((_, idx) => idx !== setIndex)
        .map((s, idx) => ({ ...s, set_number: idx + 1 }));

      return next;
    });
  };

  // Remove entire exercise
  const handleRemoveExercise = (exerciseIndex: number) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== exerciseIndex));
  };

  // Calculate estimated total volume
  const totalCalculatedVolume = exercises.reduce((acc, ex) => {
    return (
      acc +
      ex.sets.reduce((setAcc, s) => {
        if (s.is_warmup) return setAcc;
        const w = parseFloat(String(s.weight)) || 0;
        const r = parseInt(String(s.reps), 10) || 0;
        return setAcc + w * r;
      }, 0)
    );
  }, 0);

  // Submit manual workout
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (exercises.length === 0) {
      showToast("Agrega al menos un ejercicio realizado.", "error");
      return;
    }

    const hasSets = exercises.some((ex) => ex.sets.length > 0);
    if (!hasSets) {
      showToast("Agrega al menos una serie en tus ejercicios.", "error");
      return;
    }

    try {
      setIsSaving(true);

      // Build ISO date string from date and time
      const timeVal = time && /^\d{2}:\d{2}$/.test(time) ? time : "12:00";
      const isoDate = new Date(`${date}T${timeVal}:00`).toISOString();

      const payload = {
        date: isoDate,
        durationMinutes: Number(durationMinutes) || 60,
        notes: notes.trim() || undefined,
        exercises: exercises.map((ex) => ({
          exerciseId: ex.id,
          sets: ex.sets.map((s, idx) => ({
            setNumber: s.set_number || idx + 1,
            weightKg: parseFloat(String(s.weight)) || 0,
            reps: parseInt(String(s.reps), 10) || 0,
            isWarmup: Boolean(s.is_warmup),
            completed: true,
          })),
        })),
      };

      const createdSession = await createManualWorkout(payload);

      showToast("⚡ ¡Entrenamiento pasado registrado exitosamente!", "success");

      // Notify reactive listeners across Dashboard, Records and History
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fittracker:workoutSaved", { detail: createdSession })
        );
        window.dispatchEvent(
          new CustomEvent("fittracker:workoutFinished", { detail: createdSession })
        );
        window.dispatchEvent(new CustomEvent("fittracker:recordUpdated"));
      }

      if (onSaved) {
        onSaved(createdSession);
      }

      onClose();
    } catch (err: any) {
      console.error("Error al registrar entrenamiento manual:", err);
      const msg =
        err?.response?.data?.detail ||
        "No se pudo guardar el entrenamiento pasado. Revisa los datos.";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150 select-none"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-[#090D16] border border-white/10 rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92dvh] md:max-h-[88vh] overflow-hidden shadow-2xl text-white my-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0E131F] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-400 flex items-center justify-center shadow-xs">
                <Dumbbell size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-black text-lg text-white tracking-tight">
                  Registrar Entrenamiento Pasado
                </h2>
                <p className="text-xs text-slate-400">
                  Carga retroactiva de sesiones previas con cálculo automático
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* 2. Form Body (Scrollable) */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 custom-scrollbar">
            {/* Selector de Fecha, Horario y Duración */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar size={14} className="text-red-500" />
                <span>Fecha y Horario de la Sesión</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Selector de Fecha */}
                <div className="bg-[#0F141F] border border-white/10 rounded-xl p-3 text-white flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400">Día de entrenamiento</span>
                  <input
                    type="date"
                    value={date}
                    max={getLocalDateString()}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="bg-transparent text-white font-mono text-sm outline-none cursor-pointer"
                  />
                </div>

                {/* Selector de Hora y Duración */}
                <div className="bg-[#0F141F] border border-white/10 rounded-xl p-3 text-white flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400">Hora aproximada</span>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                      className="bg-transparent text-white font-mono text-sm outline-none cursor-pointer flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Duración en minutos */}
              <div className="bg-[#0F141F] border border-white/10 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">Duración estimada</span>
                  <span className="text-xs font-bold text-red-400 font-mono">{durationMinutes} min</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {DURATION_PRESETS.map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setDurationMinutes(dur)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap ${
                        durationMinutes === dur
                          ? "bg-red-600 text-white shadow-xs"
                          : "bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {dur}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bloque de Ejercicios Agregados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Flame size={14} className="text-red-500" />
                  <span>Ejercicios Realizados ({exercises.length})</span>
                </label>

                {totalCalculatedVolume > 0 && (
                  <span className="text-xs font-mono font-bold text-slate-300 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                    Volumen: {Math.round(totalCalculatedVolume).toLocaleString()} kg
                  </span>
                )}
              </div>

              {exercises.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-[#0F141F]/50 text-center space-y-2">
                  <Dumbbell size={28} className="mx-auto text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">
                    Aún no has agregado ejercicios a este registro.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Toca el botón inferior para abrir el catálogo y seleccionarlos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exercises.map((ex, exIdx) => (
                    <div
                      key={`${ex.id}_${exIdx}`}
                      className="bg-[#0F141F] rounded-xl p-3.5 border border-white/5 space-y-3"
                    >
                      {/* Cabecera del ejercicio */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-red-950/60 text-red-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {exIdx + 1}
                          </span>
                          <span className="font-bold text-white text-sm truncate">
                            {ex.name}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">
                            {ex.muscle}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(exIdx)}
                          className="w-7 h-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 flex items-center justify-center transition active:scale-95 cursor-pointer ml-2"
                          title="Eliminar ejercicio"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Tabla compacta de series */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                          <span className="col-span-2 text-center">Serie</span>
                          <span className="col-span-4 text-center">Peso (kg)</span>
                          <span className="col-span-4 text-center">Reps</span>
                          <span className="col-span-2 text-center">Acción</span>
                        </div>

                        {ex.sets.map((s, sIdx) => (
                          <div
                            key={s.id || `set_${sIdx}`}
                            className="grid grid-cols-12 gap-2 items-center bg-[#090D16] rounded-lg p-1.5 border border-white/5"
                          >
                            {/* Número de Serie / Warmup toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSet(exIdx, sIdx, "is_warmup", !s.is_warmup)
                              }
                              className={`col-span-2 h-8 rounded-md text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                                s.is_warmup
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-white/5 text-slate-300 hover:bg-white/10"
                              }`}
                              title={s.is_warmup ? "Serie de calentamiento (clic para cambiar a normal)" : "Serie efectiva (clic para marcar como calentamiento)"}
                            >
                              {s.is_warmup ? "W" : s.set_number}
                            </button>

                            {/* Input Peso */}
                            <div className="col-span-4 flex items-center">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={s.weight}
                                onChange={(e) =>
                                  handleUpdateSet(exIdx, sIdx, "weight", e.target.value)
                                }
                                placeholder="0"
                                className="w-full h-8 text-center bg-white/5 border border-white/10 rounded-md text-white font-mono text-xs font-bold outline-none focus:border-red-500 transition"
                              />
                            </div>

                            {/* Input Reps */}
                            <div className="col-span-4 flex items-center">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={s.reps}
                                onChange={(e) =>
                                  handleUpdateSet(exIdx, sIdx, "reps", e.target.value)
                                }
                                placeholder="0"
                                className="w-full h-8 text-center bg-white/5 border border-white/10 rounded-md text-white font-mono text-xs font-bold outline-none focus:border-red-500 transition"
                              />
                            </div>

                            {/* Eliminar serie */}
                            <div className="col-span-2 flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveSet(exIdx, sIdx)}
                                disabled={ex.sets.length <= 1}
                                className="w-7 h-7 rounded text-slate-500 hover:text-red-400 hover:bg-white/5 flex items-center justify-center disabled:opacity-30 disabled:hover:text-slate-500 cursor-pointer"
                                title="Quitar serie"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Botón "+ Añadir serie" */}
                      <button
                        type="button"
                        onClick={() => handleAddSet(exIdx)}
                        className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer pt-1"
                      >
                        <Plus size={14} />
                        <span>Añadir serie</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón ancho de Catálogo */}
              <button
                type="button"
                onClick={() => setIsCatalogOpen(true)}
                className="w-full py-3 px-4 rounded-xl border border-dashed border-red-500/40 bg-red-950/20 text-red-400 hover:bg-red-950/40 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Plus size={16} />
                <span>+ Agregar ejercicio</span>
              </button>
            </div>

            {/* Notas opcionales */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Notas de la sesión (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ej. Sesión recuperada de piernas, buena intensidad..."
                className="w-full bg-[#0F141F] border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-500 placeholder:text-slate-500 resize-none"
              />
            </div>
          </form>

          {/* 3. Footer Fijo */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0E131F] shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-12 px-5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || exercises.length === 0}
              className="flex-1 h-12 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 text-white font-bold py-3.5 rounded-full shadow-lg text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando registro...</span>
                </>
              ) : (
                <>
                  <Check size={17} strokeWidth={2.5} />
                  <span>Guardar Registro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Selector de Ejercicios del Catálogo Oficial */}
      {isCatalogOpen && (
        <ExerciseSelectorModal
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          title="Agregar ejercicio"
          allExercises={allExercises}
          muscleGroups={muscleGroups}
          recordsMap={recordsMap}
          onSelect={(ex) => handleSelectExercises([ex])}
          onSelectMultiple={(exList) => handleSelectExercises(exList)}
        />
      )}
    </>
  );
}
