import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Minus,
  Check,
  RotateCcw,
  Trophy,
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
  onFinishWorkout,
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
  // Determine current active exercise & sets based on slot
  const isSlotB = activeSlot === "B" && secondExercise;
  const currentEx = isSlotB ? secondExercise : exercise;
  const currentSets = isSlotB ? secondSets : sets;

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
    currentSets.length > 0 ? currentSets[currentSets.length - 1] : null;

  const [weight, setWeight] = useState(() =>
    lastSet ? parseFloat(lastSet.weight) || 20 : smartSuggestion.suggestedWeight
  );
  const [reps, setReps] = useState(() =>
    lastSet ? parseInt(lastSet.reps, 10) || 10 : smartSuggestion.suggestedReps
  );

  // Sync inputs when switching slots (Ejercicio A <-> Ejercicio B) or when exercise/suggestion changes
  useEffect(() => {
    if (currentSets.length > 0) {
      const prev = currentSets[currentSets.length - 1];
      setWeight(parseFloat(prev.weight) || 20);
      setReps(parseInt(prev.reps, 10) || 10);
    } else {
      setWeight(smartSuggestion.suggestedWeight);
      setReps(smartSuggestion.suggestedReps);
    }
  }, [activeSlot, currentEx?.id, smartSuggestion]);

  // Exit modal state
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
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
    const nextSetNumber = currentSets.length + 1;

    onAddSet(currentEx.id, {
      setNumber: nextSetNumber,
      weight: currentWeight,
      reps: currentReps,
      completed: true,
      slot: activeSlot,
    });

    // Keep the same weight preloaded for the next set (or clear if needed)
    // and maintain reps
    setWeight(currentWeight);
    setReps(currentReps);
  };

  return (
    <div className="fixed inset-0 z-50 min-h-[100dvh] bg-[#050505] text-white flex flex-col justify-between overflow-y-auto pb-28 pb-safe select-none">
      {/* Top Container */}
      <div className="w-full max-w-md md:max-w-xl mx-auto flex-1 flex flex-col px-4 pt-4 sm:pt-6 space-y-4">
        {/* Cabecera limpia: Nombre del ejercicio, equipamiento, y botón "Finalizar / Salir" arriba a la derecha */}
        <header className="flex items-start justify-between gap-3 border-b border-[#2A1B14] pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="rounded-lg border border-[#FF5722]/40 bg-[#FF5722]/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FF6D00]">
                {currentEquipment}
              </span>
              {secondExercise && (
                <span className="rounded-lg border border-purple-500/40 bg-purple-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-300">
                  ⚡ Biserie Activa
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight break-words">
              {currentEx?.name || "Ejercicio"}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsExitModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#2A1B14] bg-[#121113] px-3.5 py-2.5 text-xs font-black text-[#A1A1AA] hover:text-white hover:border-[#FF5722] transition active:scale-95 flex-shrink-0"
          >
            <span>Finalizar / Salir</span>
          </button>
        </header>

        {/* Soporte para alternar 2 ejercicios (Biserie / Superserie) */}
        {secondExercise ? (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#121113] border border-[#2A1B14]">
            <button
              type="button"
              onClick={() => onSwitchSlot("A")}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 truncate active:scale-95 ${
                activeSlot === "A"
                  ? "bg-[#FF5722] text-[#050505] shadow-[0_0_12px_rgba(255,87,34,0.4)]"
                  : "text-[#A1A1AA] hover:text-white hover:bg-[#1A1618]"
              }`}
            >
              <span className="truncate">A: {exercise?.name}</span>
              <span className="text-[10px] opacity-90 rounded bg-black/30 px-1 py-0.2">
                {sets.length}S
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchSlot("B")}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 truncate active:scale-95 ${
                activeSlot === "B"
                  ? "bg-[#FF5722] text-[#050505] shadow-[0_0_12px_rgba(255,87,34,0.4)]"
                  : "text-[#A1A1AA] hover:text-white hover:bg-[#1A1618]"
              }`}
            >
              <span className="truncate">B: {secondExercise?.name}</span>
              <span className="text-[10px] opacity-90 rounded bg-black/30 px-1 py-0.2">
                {secondSets.length}S
              </span>
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsSupersetPickerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A1A1AA] hover:text-[#FF6D00] transition active:scale-95"
            >
              <ArrowRightLeft size={13} className="text-[#FF5722]" />
              <span>+ Alternar con otro ejercicio (Biserie)</span>
            </button>
          </div>
        )}

        {/* Historial inmediato compacto:
            Una sola línea o micro-tabla con las series hechas hoy en este ejercicio:
            "S1: 60kg × 10 | S2: 65kg × 8" (sin textos largos explicativos). */}
        <div className="rounded-xl border border-[#2A1B14] bg-[#0D0C0E] px-3.5 py-2.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs">
          <span className="text-[#71717A] text-[10px] font-black uppercase tracking-wider flex-shrink-0">
            Hoy:
          </span>
          {currentSets.length === 0 ? (
            <span className="text-[#71717A] italic text-xs">
              Sin series registradas aún — Iniciá con la Serie 1
            </span>
          ) : (
            <div className="flex items-center gap-2">
              {currentSets.map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="inline-flex items-center gap-1 text-white font-bold"
                >
                  {idx > 0 && (
                    <span className="text-[#3D251C] font-normal mr-1">|</span>
                  )}
                  <span className="text-[#FF6D00] font-black">
                    S{s.setNumber || idx + 1}:
                  </span>
                  <span>
                    {s.weight}kg × {s.reps}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveSet(currentEx.id, idx)}
                    className="text-[#71717A] hover:text-red-400 p-0.5 ml-0.5 text-[11px] transition"
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
          <span className="text-xs font-black uppercase tracking-widest text-[#FF5722]">
            SERIE {currentSets.length + 1}
          </span>

          {/* Badge sutil: "Objetivo: romper récord o +1 rep" o "Modo recuperación activa" */}
          {activeMode === PERIODIZATION_MODES.DELOAD ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#38BDF8]/40 bg-[#38BDF8]/15 px-3 py-1 text-xs font-black text-[#38BDF8] shadow-sm">
              <span>🛡️</span>
              <span>Modo recuperación activa</span>
              <span className="text-[10px] text-[#A1A1AA] font-bold">• RIR 3-4</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FF5722]/40 bg-[#FF5722]/15 px-3 py-1 text-xs font-black text-[#FF6D00] shadow-sm">
              <span>⚡</span>
              <span>Objetivo: romper récord o +1 rep</span>
              {prevHistoricalWeight > 0 && (
                <span className="text-[10px] text-[#A1A1AA] font-bold">
                  (+{smartSuggestion.incrementKg} kg)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Input rápido y cómodo con botones táctiles grandes:
            Fila de Peso: Botones [-2.5kg] [ Input numérico Peso (kg) ] [+2.5kg] [+5kg].
            Fila de Reps: Botones [-1] [ Input numérico Reps ] [+1] y accesos rápidos [8] [10] [12]. */}
        <div className="rounded-2xl border border-[#2A1B14] bg-[#121113] p-4 sm:p-5 space-y-4 shadow-card">
          {/* Fila de Peso */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#A1A1AA]">
              <span>PESO (KG)</span>
              <span className="text-[11px] text-[#71717A]">
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
                className="min-h-[52px] rounded-xl border border-[#2A1B14] bg-[#1A1618] text-sm font-black text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
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
                  className="w-full min-h-[52px] text-center text-2xl font-black rounded-xl border border-[#2A1B14] bg-[#050505] text-white outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <button
                type="button"
                onClick={() => adjustWeight(2.5)}
                className="min-h-[52px] rounded-xl border border-[#2A1B14] bg-[#1A1618] text-sm font-black text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                +2.5 kg
              </button>

              <button
                type="button"
                onClick={() => adjustWeight(5)}
                className="min-h-[52px] rounded-xl border border-[#2A1B14] bg-[#1A1618] text-sm font-black text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                +5 kg
              </button>
            </div>
          </div>

          {/* Fila de Reps */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#A1A1AA]">
              <span>REPETICIONES</span>
              <span className="text-[11px] text-[#71717A]">
                {lastSet ? `Anterior: ${lastSet.reps} reps` : "Meta estándar"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <button
                type="button"
                onClick={() => adjustReps(-1)}
                className="min-h-[52px] rounded-xl border border-[#2A1B14] bg-[#1A1618] text-base font-black text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
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
                  className="w-full min-h-[52px] text-center text-2xl font-black rounded-xl border border-[#2A1B14] bg-[#050505] text-white outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <button
                type="button"
                onClick={() => adjustReps(1)}
                className="min-h-[52px] rounded-xl border border-[#2A1B14] bg-[#1A1618] text-base font-black text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
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
                  className={`min-h-[44px] rounded-xl border text-xs font-black transition active:scale-95 flex items-center justify-center ${
                    parseInt(reps, 10) === num
                      ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF6D00]"
                      : "border-[#2A1B14] bg-[#0A090B] text-[#A1A1AA] hover:border-[#FF5722]/40 hover:text-white"
                  }`}
                >
                  {num} reps
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Botón principal de guardado:
            "✓ REGISTRAR SERIE" (en naranja neón #FF5722).
            Al presionar: guarda la serie, precarga el mismo peso para la siguiente, y suma el contador */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleRegisterSet}
            className="w-full min-h-[56px] rounded-2xl bg-[#FF5722] text-[#050505] font-black text-base sm:text-lg tracking-wider shadow-[0_0_20px_rgba(255,87,34,0.45)] hover:bg-[#FF6D00] hover:shadow-[0_0_25px_rgba(255,109,0,0.6)] active:scale-[0.98] transition flex items-center justify-center gap-2 select-none"
          >
            <Check size={24} strokeWidth={3.5} />
            <span>✓ REGISTRAR SERIE</span>
          </button>
        </div>

        {/* Bottom utility bar */}
        <div className="flex items-center justify-between pt-2 text-xs">
          <button
            type="button"
            onClick={onExitFocus}
            className="text-[#A1A1AA] hover:text-white py-2 px-1 font-bold transition"
          >
            ← Cambiar Ejercicio
          </button>

          <button
            type="button"
            onClick={onFinishWorkout}
            className="text-[#FF6D00] hover:underline py-2 px-1 font-black transition flex items-center gap-1"
          >
            <Trophy size={14} />
            <span>Terminar Entrenamiento</span>
          </button>
        </div>
      </div>

      {/* Modal de Finalizar / Salir */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-[#2A1B14] bg-[#121113] p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 duration-200">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-white">
                ¿Qué deseas hacer?
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Puedes finalizar la sesión completa o cambiar de ejercicio
                manteniendo las series registradas.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsExitModalOpen(false);
                  onFinishWorkout();
                }}
                className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-[#FF5722] to-[#FF6D00] text-[#050505] font-black text-sm shadow-neon flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Trophy size={18} />
                <span>TERMINAR ENTRENAMIENTO</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsExitModalOpen(false);
                  onExitFocus();
                }}
                className="w-full min-h-[48px] rounded-xl border border-[#2A1B14] bg-[#1A1618] text-white font-bold text-sm hover:border-[#FF5722] flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <RotateCcw size={16} />
                <span>Elegir / Cambiar otro ejercicio</span>
              </button>

              {secondExercise && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveSecondExercise();
                    setIsExitModalOpen(false);
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 font-bold text-xs hover:bg-red-500/20 active:scale-95 transition"
                >
                  Quitar ejercicio alternado (Biserie)
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsExitModalOpen(false)}
                className="w-full min-h-[42px] rounded-xl text-[#71717A] hover:text-white text-xs font-semibold transition"
              >
                Continuar entrenando este ejercicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Selección de Ejercicio B (Biserie / Superserie) */}
      {isSupersetPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl border border-[#2A1B14] bg-[#121113] p-5 shadow-2xl space-y-3 animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between border-b border-[#2A1B14] pb-2">
              <div>
                <h3 className="text-base font-black text-white">
                  Alternar con otro ejercicio
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  Selecciona el Ejercicio B para tu superserie
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSupersetPickerOpen(false)}
                className="p-1.5 text-[#71717A] hover:text-white"
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
                  className={`rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition ${
                    supersetMuscleFilter === null
                      ? "bg-[#FF5722] text-black"
                      : "bg-[#181210] text-[#A1A1AA]"
                  }`}
                >
                  Todos
                </button>
                {muscleGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSupersetMuscleFilter(g.id)}
                    className={`rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition ${
                      supersetMuscleFilter === g.id
                        ? "bg-[#FF5722] text-black"
                        : "bg-[#181210] text-[#A1A1AA]"
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
                    className="w-full text-left p-2.5 rounded-xl border border-[#2A1B14] bg-[#0A090B] hover:border-[#FF5722] hover:bg-[#1A1618] transition flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-black text-white">{ex.name}</p>
                      <span className="text-[10px] text-[#71717A] uppercase">
                        {getExerciseEquipment(ex.name)}
                      </span>
                    </div>
                    <span className="text-xs text-[#FF6D00] font-black">
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
