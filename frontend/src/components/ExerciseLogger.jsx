import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Minus,
  Check,
  Trash2,
  ChevronRight,
  Sparkles,
  ArrowRightLeft,
} from "lucide-react";
import { getExerciseEquipment } from "../utils/fitnessUtils";
import {
  PERIODIZATION_MODES,
  getWeeklyPeriodizationMode,
  getSmartPeriodizationSuggestion,
} from "../utils/periodization";

export default function ExerciseLogger({
  exercise,
  equipment: propEquipment,
  sets = [],
  onAddSet,
  onRemoveSet,
  onExitFocus,
  // Biserie / Superserie props
  secondExercise = null,
  secondSets = [],
  activeSlot = "A", // "A" | "B"
  onSwitchSlot,
  onSelectSecondExercise,
  onRemoveSecondExercise,
  allAvailableExercises = [],
  muscleGroups = [],
  recordsMap = {},
  periodizationMode: propPeriodizationMode,
}) {
  // Determine current active exercise based on slot
  const isSlotB = activeSlot === "B" && secondExercise;
  const currentEx = isSlotB ? secondExercise : exercise;

  // Local state for current exercise sets to ensure 0ms instantaneous UI updates and prevent race conditions
  const [currentExerciseSets, setCurrentExerciseSets] = useState(() => {
    const initial = isSlotB ? secondSets : sets;
    return Array.isArray(initial) ? initial : [];
  });

  // Keep local sets in sync when parent sets prop updates (e.g. from server sync or switching exercise/slot)
  useEffect(() => {
    const incoming = isSlotB ? secondSets : sets;
    setCurrentExerciseSets(Array.isArray(incoming) ? incoming : []);
  }, [sets, secondSets, isSlotB, currentEx?.id]);

  const currentEquipment =
    (isSlotB ? getExerciseEquipment(secondExercise?.name) : propEquipment) ||
    getExerciseEquipment(currentEx?.name) ||
    "Máquina";

  const activeMode = propPeriodizationMode || getWeeklyPeriodizationMode();

  // Find previous weight & reps from recordsMap (last session or PR)
  const historicalRecord = recordsMap[currentEx?.id];
  const prevHistoricalWeight =
    historicalRecord?.last_weight || historicalRecord?.pr_weight || 0;
  const prevHistoricalReps =
    historicalRecord?.last_reps || historicalRecord?.pr_reps || 10;

  // Compute smart periodization suggestion
  const smartSuggestion = useMemo(() => {
    return getSmartPeriodizationSuggestion({
      exerciseName: currentEx?.name || "",
      previousWeight: prevHistoricalWeight,
      previousReps: prevHistoricalReps,
      equipment: currentEquipment,
      mode: activeMode,
    });
  }, [currentEx?.name, prevHistoricalWeight, prevHistoricalReps, currentEquipment, activeMode]);

  // Pre-fill weight & reps from last set or smart suggestion
  const lastSet =
    currentExerciseSets.length > 0
      ? currentExerciseSets[currentExerciseSets.length - 1]
      : null;

  const [weight, setWeight] = useState(() =>
    lastSet ? parseFloat(lastSet.weight) || 20 : smartSuggestion.suggestedWeight
  );
  const [reps, setReps] = useState(() =>
    lastSet ? parseInt(lastSet.reps, 10) || 10 : smartSuggestion.suggestedReps
  );

  // Sync inputs when switching slots (Ejercicio A <-> Ejercicio B) or when exercise/suggestion changes
  useEffect(() => {
    if (currentExerciseSets.length > 0) {
      const prev = currentExerciseSets[currentExerciseSets.length - 1];
      setWeight(parseFloat(prev.weight) || 20);
      setReps(parseInt(prev.reps, 10) || 10);
    } else {
      setWeight(smartSuggestion.suggestedWeight);
      setReps(smartSuggestion.suggestedReps);
    }
  }, [activeSlot, currentEx?.id, smartSuggestion]);

  // Superset selection modal state
  const [isSupersetPickerOpen, setIsSupersetPickerOpen] = useState(false);
  const [supersetMuscleFilter, setSupersetMuscleFilter] = useState(null);

  // Quick weight adjustments
  const adjustWeight = (delta) => {
    setWeight((prev) => {
      const current = parseFloat(prev) || 0;
      const next = Math.max(0, +(current + delta).toFixed(1));
      return next;
    });
  };

  // Quick reps adjustments
  const adjustReps = (delta) => {
    setReps((prev) => {
      const current = parseInt(prev, 10) || 0;
      const next = Math.max(1, current + delta);
      return next;
    });
  };

  // Handler for "✓ REGISTRAR SERIE"
  const handleRegisterSet = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (e) {}
    }

    const currentWeight = parseFloat(weight) || 0;
    const currentReps = parseInt(reps, 10) || 1;
    const nextSetNumber = currentExerciseSets.length + 1;

    const newSet = {
      id: `temp_set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      setNumber: nextSetNumber,
      weight: currentWeight,
      reps: currentReps,
      completed: true,
      slot: activeSlot,
    };

    // React functional update as requested: setSets(prev => [...prev, newSet])
    setCurrentExerciseSets((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return [...arr, newSet];
    });

    onAddSet(currentEx.id, newSet);

    // Keep the same weight preloaded for the next set and maintain reps
    setWeight(currentWeight);
    setReps(currentReps);
  };

  // Handler for removing a set
  const handleRemoveLocalSet = (idx) => {
    setCurrentExerciseSets((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, setNumber: i + 1 }));
    });
    onRemoveSet(currentEx.id, idx);
  };

  return (
    <div className="fixed inset-0 z-50 min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-y-auto pb-28 pb-safe select-none">
      {/* Top Container with iOS Safe Area Top */}
      <div className="w-full max-w-md md:max-w-xl mx-auto flex-1 flex flex-col px-4 pt-[max(env(safe-area-inset-top),1.5rem)] space-y-4">
        {/* Cabecera limpia: Nombre del ejercicio, equipamiento, y botón "← Volver al Catálogo" arriba a la derecha */}
        <header className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                {currentEquipment}
              </span>
              {secondExercise && (
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7C4DFF]">
                    ⚡ Biserie Activa
                  </span>
                  <button
                    type="button"
                    onClick={onRemoveSecondExercise}
                    className="rounded-full border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 active:scale-95 transition"
                    title="Quitar Biserie"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white leading-tight break-words">
              {currentEx?.name || "Ejercicio"}
            </h1>
          </div>

          <button
            type="button"
            onClick={onExitFocus}
            className="flex items-center gap-1.5 rounded-2xl border border-white/5 bg-[#1C1C1E] px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#2C2C2E] transition active:scale-95 flex-shrink-0"
            title="Volver a la selección de ejercicios"
          >
            <span>← Catálogo</span>
          </button>
        </header>

        {/* Soporte para alternar 2 ejercicios (Biserie / Superserie) */}
        {secondExercise ? (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#1C1C1E] border border-white/5">
            <button
              type="button"
              onClick={() => onSwitchSlot("A")}
              className={`py-2.5 px-3 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 truncate active:scale-95 ${
                activeSlot === "A"
                  ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                  : "text-[#8E8E93] hover:text-white"
              }`}
            >
              <span className="truncate">A: {exercise?.name}</span>
              <span className="text-[10px] opacity-90 rounded bg-white/10 px-1 py-0.2 font-semibold">
                {activeSlot === "A" ? currentExerciseSets.length : sets.length}S
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchSlot("B")}
              className={`py-2.5 px-3 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 truncate active:scale-95 ${
                activeSlot === "B"
                  ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                  : "text-[#8E8E93] hover:text-white"
              }`}
            >
              <span className="truncate">B: {secondExercise?.name}</span>
              <span className="text-[10px] opacity-90 rounded bg-white/10 px-1 py-0.2 font-semibold">
                {activeSlot === "B" ? currentExerciseSets.length : secondSets.length}S
              </span>
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsSupersetPickerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8E8E93] hover:text-white transition active:scale-95"
            >
              <ArrowRightLeft size={13} className="text-[#FF5722]" />
              <span>+ Alternar con otro ejercicio (Biserie)</span>
            </button>
          </div>
        )}

        {/* Historial inmediato dinámico de series */}
        <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] px-3.5 py-2.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-white">
          <span className="text-[#8E8E93] text-[10px] font-semibold uppercase tracking-wider flex-shrink-0">
            Hoy:
          </span>
          {currentExerciseSets.length === 0 ? (
            <span className="text-[#8E8E93] italic text-xs">
              Sin series registradas aún — Iniciá con la Serie 1
            </span>
          ) : (
            <div className="flex items-center gap-2 text-white">
              {currentExerciseSets.map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="inline-flex items-center gap-1 text-white font-semibold"
                >
                  {idx > 0 && (
                    <span className="text-white/15 font-normal mr-1">|</span>
                  )}
                  <span className="text-[#FF5722] font-bold">
                    S{s.setNumber || idx + 1}:
                  </span>
                  <span className="text-white font-semibold">
                    {s.weight}kg × {s.reps}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLocalSet(idx)}
                    className="text-[#8E8E93] hover:text-red-400 p-0.5 ml-0.5 text-[11px] transition"
                    title="Eliminar esta serie"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicador de Serie Actual y Badge sutil de Periodización */}
        <div className="flex flex-col items-center justify-center gap-1.5 pt-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#8E8E93]">
            SERIE {currentExerciseSets.length + 1}
          </span>

          {/* Badge de Objetivo / PR / Rango */}
          {activeMode === PERIODIZATION_MODES.DELOAD ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-400">
              <span>🛡️</span>
              <span>Modo recuperación activa</span>
              <span className="text-[10px] text-[#8E8E93] font-normal">• RIR 3-4</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-3 py-1 text-xs font-semibold text-[#FF5722]">
              <span>⚡</span>
              <span>Objetivo: récord o +1 rep</span>
              {prevHistoricalWeight > 0 && (
                <span className="text-[10px] text-[#8E8E93] font-normal">
                  (+{smartSuggestion.incrementKg} kg)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Input rápido y cómodo con botones táctiles grandes: Fondo #1C1C1E, bordes border-white/5 */}
        <div className="rounded-2xl sm:rounded-3xl border border-white/5 bg-[#1C1C1E] p-4 sm:p-5 space-y-4">
          {/* Fila de Peso */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#8E8E93]">
              <span className="tracking-wide">PESO (KG)</span>
              <span className="text-[11px] text-[#8E8E93] font-normal">
                {lastSet
                  ? `Serie anterior: ${lastSet.weight} kg`
                  : prevHistoricalWeight > 0
                  ? `Sesión previa: ${prevHistoricalWeight} kg`
                  : "Carga inicial"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 items-center">
              <button
                type="button"
                onClick={() => adjustWeight(-2.5)}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-[#121212] text-sm font-semibold text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                -2.5 kg
              </button>

              <div className="relative col-span-1">
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full min-h-[52px] text-center text-white font-semibold text-2xl tracking-tight rounded-2xl border border-white/10 bg-[#121212] outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <button
                type="button"
                onClick={() => adjustWeight(2.5)}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-[#121212] text-sm font-semibold text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                +2.5 kg
              </button>

              <button
                type="button"
                onClick={() => adjustWeight(5)}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-[#121212] text-sm font-semibold text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                +5 kg
              </button>
            </div>
          </div>

          {/* Fila de Reps */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[#8E8E93]">
              <span className="tracking-wide">REPETICIONES</span>
              <span className="text-[11px] text-[#8E8E93] font-normal">
                {lastSet ? `Anterior: ${lastSet.reps} reps` : "Meta estándar"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <button
                type="button"
                onClick={() => adjustReps(-1)}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-[#121212] text-base font-semibold text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                -1
              </button>

              <div className="relative">
                <input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="w-full min-h-[52px] text-center text-white font-semibold text-2xl tracking-tight rounded-2xl border border-white/10 bg-[#121212] outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <button
                type="button"
                onClick={() => adjustReps(1)}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-[#121212] text-base font-semibold text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                +1
              </button>
            </div>

            {/* Accesos rápidos [8] [10] [12] */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[8, 10, 12].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setReps(num)}
                  className={`min-h-[44px] rounded-2xl border text-xs font-semibold transition active:scale-95 flex items-center justify-center ${
                    parseInt(reps, 10) === num
                      ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                      : "border border-white/10 bg-[#121212] text-[#8E8E93] hover:border-white/20 hover:text-white"
                  }`}
                >
                  {num} reps
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Botón principal de guardado: "✓ REGISTRAR SERIE" */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleRegisterSet}
            className="w-full min-h-[56px] rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 text-white font-semibold text-base sm:text-lg tracking-wide active:scale-[0.98] transition flex items-center justify-center gap-2 select-none"
          >
            <Check size={22} strokeWidth={2.5} />
            <span>✓ REGISTRAR SERIE</span>
          </button>
        </div>

        {/* Bottom utility bar: Solo interactuar con ejercicio actual o volver al catálogo */}
        <div className="flex items-center justify-center pt-2 text-xs">
          <button
            type="button"
            onClick={onExitFocus}
            className="inline-flex items-center gap-2 text-[#8E8E93] hover:text-white py-2 px-4 rounded-2xl border border-white/5 bg-[#1C1C1E] font-semibold transition active:scale-95"
          >
            <span>← Volver al Catálogo de Ejercicios</span>
          </button>
        </div>
      </div>

      {/* Modal de Selección de Ejercicio B (Biserie / Superserie) */}
      {isSupersetPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl border border-white/10 bg-[#1C1C1E] p-5 space-y-3 animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-white">
                  Alternar con otro ejercicio
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Selecciona el Ejercicio B para tu superserie
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSupersetPickerOpen(false)}
                className="p-1.5 text-[#8E8E93] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector rápido de Grupo Muscular */}
            {muscleGroups.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSupersetMuscleFilter(null)}
                  className={`rounded-full px-3 py-1 font-semibold whitespace-nowrap transition ${
                    supersetMuscleFilter === null
                      ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                      : "border border-white/10 bg-[#121212] text-[#8E8E93] hover:text-white"
                  }`}
                >
                  Todos
                </button>
                {muscleGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSupersetMuscleFilter(g.id)}
                    className={`rounded-full px-3 py-1 font-semibold whitespace-nowrap transition ${
                      supersetMuscleFilter === g.id
                        ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                        : "border border-white/10 bg-[#121212] text-[#8E8E93] hover:text-white"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            {/* Lista de ejercicios para el Ejercicio B */}
            <div className="overflow-y-auto space-y-1.5 max-h-60 pr-1">
              {allAvailableExercises
                .filter((ex) => ex.id !== exercise.id)
                .filter((ex) =>
                  supersetMuscleFilter
                    ? ex.muscle_group_id === supersetMuscleFilter
                    : true
                )
                .map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onSelectSecondExercise(ex);
                      setIsSupersetPickerOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-2xl border border-white/5 bg-[#121212] hover:border-white/20 hover:bg-[#252528] transition flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{ex.name}</p>
                      <span className="text-[10px] text-[#8E8E93] uppercase font-medium">
                        {getExerciseEquipment(ex.name)}
                      </span>
                    </div>
                    <span className="text-xs text-[#FF5722] font-semibold">
                      + Vincular
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
