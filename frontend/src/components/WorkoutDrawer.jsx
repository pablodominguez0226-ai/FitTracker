import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Minus,
  Check,
  Scale,
  Clock,
  Trophy,
  Trash2,
  Sparkles,
  Zap,
  Flame,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import PlateCalculatorModal from "./PlateCalculatorModal";
import { calculateEstimated1RM, getExerciseEquipment } from "../utils/fitnessUtils";

const RIR_OPTIONS = [
  { value: 0, label: "RIR 0 (Fallo)", short: "Fallo" },
  { value: 1, label: "RIR 1", short: "RIR 1" },
  { value: 2, label: "RIR 2", short: "RIR 2" },
  { value: 3, label: "RIR 3+", short: "RIR 3+" },
];

const SET_TYPES = [
  { key: "normal", label: "Normal", badge: "N" },
  { key: "warmup", label: "Calentamiento (W)", badge: "W" },
  { key: "dropset", label: "Drop Set (D)", badge: "D" },
  { key: "failure", label: "Al Fallo (F)", badge: "F" },
];

const REP_PILLS = [6, 8, 10, 12, 15];

export default function WorkoutDrawer({
  isOpen,
  onClose,
  exercise,
  activeExercise,
  record,
  previousSession,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onTriggerRestTimer,
}) {
  const [weightInput, setWeightInput] = useState(60);
  const [repsInput, setRepsInput] = useState(10);
  const [selectedRir, setSelectedRir] = useState(2);
  const [selectedType, setSelectedType] = useState("normal");
  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);

  // When exercise changes or drawer opens, pre-fill with latest set or ghost data
  useEffect(() => {
    if (!isOpen || !activeExercise) return;

    const existingSets = activeExercise.sets || [];
    if (existingSets.length > 0) {
      const lastSet = existingSets[existingSets.length - 1];
      setWeightInput(parseFloat(lastSet.weight) || 0);
      setRepsInput(parseInt(lastSet.reps, 10) || 10);
      setSelectedRir(lastSet.rir ?? 2);
      setSelectedType(lastSet.set_type ?? "normal");
    } else if (previousSession?.sets?.length > 0) {
      const prevLast = previousSession.sets[0];
      setWeightInput(parseFloat(prevLast.weight) || 0);
      setRepsInput(parseInt(prevLast.reps, 10) || 10);
      setSelectedRir(2);
      setSelectedType("normal");
    } else if (record?.pr_weight) {
      setWeightInput(parseFloat(record.pr_weight) || 0);
      setRepsInput(parseInt(record.pr_reps, 10) || 10);
      setSelectedRir(2);
      setSelectedType("normal");
    }
  }, [isOpen, activeExercise?.exerciseId]);

  if (!isOpen || !activeExercise) return null;

  const equipment = getExerciseEquipment(activeExercise.exerciseName);
  const isBarbell = equipment === "Barra";

  // PR Detection
  const maxWeightPrevio = record?.pr_weight ? parseFloat(record.pr_weight) : 0;
  const max1RMPrevio = record?.best_estimated_1rm
    ? parseFloat(record.best_estimated_1rm)
    : maxWeightPrevio > 0 && record?.pr_reps
    ? parseFloat(record.pr_weight) * (1 + parseInt(record.pr_reps, 10) / 30)
    : 0;

  const isWarmup = selectedType === "warmup";
  const curEst1RM =
    !isWarmup && weightInput > 0 && repsInput > 0
      ? calculateEstimated1RM(weightInput, repsInput)
      : 0;

  const isWeightPR =
    !isWarmup &&
    weightInput > 0 &&
    maxWeightPrevio > 0 &&
    weightInput > maxWeightPrevio;
  const weightDiff = isWeightPR ? +(weightInput - maxWeightPrevio).toFixed(1) : 0;

  const is1RMPR =
    !isWarmup && curEst1RM > 0 && max1RMPrevio > 0 && curEst1RM > max1RMPrevio;
  const oneRmDiff = is1RMPR ? +(curEst1RM - max1RMPrevio).toFixed(1) : 0;

  // Exercise volume calculation (excluding warmup sets)
  const totalVolume = (activeExercise.sets || []).reduce((sum, s) => {
    if (s.set_type === "warmup" || s.set_type === "W") return sum;
    return sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
  }, 0);

  const handleAdjustWeight = (delta) => {
    setWeightInput((prev) => Math.max(0, Math.round((prev + delta) * 10) / 10));
  };

  const handleAdjustReps = (delta) => {
    setRepsInput((prev) => Math.max(1, prev + delta));
  };

  const handleSaveSet = () => {
    const nextSetNumber = (activeExercise.sets || []).length + 1;
    onAddSet(activeExercise.exerciseId, {
      setNumber: nextSetNumber,
      weight: parseFloat(weightInput) || 0,
      reps: parseInt(repsInput, 10) || 0,
      completed: true,
      rir: selectedRir,
      set_type: selectedType,
    });

    // Automatically trigger floating rest timer
    onTriggerRestTimer({
      exerciseName: activeExercise.exerciseName,
      setNumber: nextSetNumber,
      weight: weightInput,
      reps: repsInput,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto rounded-t-3xl border-t-2 border-x border-[#FF5722]/50 bg-[#121113] p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto overflow-x-hidden animate-in slide-in-from-bottom-10 duration-200">
          {/* Header Bar */}
          <div className="flex items-start justify-between gap-2 border-b border-[#2A1B14] pb-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded-md border border-[#2A1B14] bg-[#050505] px-2 py-0.5 text-[10px] font-black text-[#A1A1AA]">
                  {equipment}
                </span>

                {record?.pr_weight ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300">
                    <Trophy size={11} /> PR: {record.pr_weight}kg × {record.pr_reps}
                  </span>
                ) : (
                  <span className="rounded-md border border-[#2A1B14] bg-[#050505] px-2 py-0.5 text-[10px] font-bold text-[#71717A]">
                    Sin PR previo
                  </span>
                )}

                {totalVolume > 0 && (
                  <span className="rounded-md border border-[#FF5722]/30 bg-[#2A1B14] px-2 py-0.5 text-[10px] font-black text-[#FF6D00]">
                    Volumen: {Math.round(totalVolume).toLocaleString()} kg
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white truncate break-words">
                {activeExercise.exerciseName}
              </h2>
            </div>

            {/* Close / Listo Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 rounded-xl border border-[#2A1B14] bg-[#050505] px-3 py-1.5 text-xs font-black text-white hover:border-[#FF5722] hover:bg-[#1A1618] transition active:scale-95 flex-shrink-0"
            >
              <span>Listo</span>
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Compact Today's Sets Table */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold text-[#A1A1AA]">
              <span>Series registradas hoy:</span>
              <span className="text-[#FF6D00] font-black">
                {(activeExercise.sets || []).length} completadas
              </span>
            </div>

            {(activeExercise.sets || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2A1B14] bg-[#050505] p-3 text-center text-xs text-[#71717A] italic">
                {previousSession?.sets?.length > 0
                  ? `Anterior: ${previousSession.sets[0].weight} kg × ${previousSession.sets[0].reps} reps • Cargá tu primera serie`
                  : "Aún no registraste series en este ejercicio hoy"}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar p-1 rounded-xl bg-[#050505] border border-[#2A1B14]">
                {activeExercise.sets.map((s, sIdx) => {
                  const isW = s.set_type === "warmup" || s.set_type === "W";
                  const isD = s.set_type === "dropset" || s.set_type === "D";
                  const isF = s.set_type === "failure" || s.set_type === "F";

                  return (
                    <div
                      key={s.id || sIdx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A1B14] bg-[#121113] px-2.5 py-1 text-xs font-bold text-white shadow-sm"
                    >
                      <span className="text-[#71717A] font-black">S{s.set_number || sIdx + 1}:</span>
                      <span>
                        {s.weight}kg × {s.reps}
                      </span>
                      {s.rir !== null && s.rir !== undefined && (
                        <span className="text-[10px] text-[#FF6D00] font-black">
                          RIR:{s.rir}
                        </span>
                      )}
                      {isW && (
                        <span className="rounded bg-amber-500/20 px-1 text-[9px] font-black text-amber-300">
                          W
                        </span>
                      )}
                      {isD && (
                        <span className="rounded bg-blue-500/20 px-1 text-[9px] font-black text-blue-300">
                          D
                        </span>
                      )}
                      {isF && (
                        <span className="rounded bg-red-500/20 px-1 text-[9px] font-black text-red-300">
                          F
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveSet(activeExercise.exerciseId, sIdx)}
                        className="text-[#71717A] hover:text-red-400 transition ml-0.5"
                        title="Eliminar serie"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-time PR Alerts in Drawer */}
          {isWeightPR && (
            <div className="rounded-xl border border-amber-400/80 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 p-2.5 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse flex items-center justify-between text-xs font-black">
              <div className="flex items-center gap-1.5">
                <span className="animate-bounce">🏆</span>
                <span>¡NUEVO PR DE PESO!</span>
              </div>
              <span className="text-white underline decoration-amber-400">
                +{weightDiff} kg sobre anterior ({maxWeightPrevio}kg)
              </span>
            </div>
          )}

          {!isWeightPR && is1RMPR && (
            <div className="rounded-xl border border-purple-400/70 bg-gradient-to-r from-purple-500/20 to-amber-500/10 p-2 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.3)] animate-pulse flex items-center justify-between text-xs font-black">
              <div className="flex items-center gap-1.5">
                <span className="animate-bounce">⚡</span>
                <span>¡NUEVO PR DE 1RM ESTIMADO!</span>
              </div>
              <span className="text-white underline decoration-purple-400">
                +{oneRmDiff} kg (1RM: {curEst1RM}kg)
              </span>
            </div>
          )}

          {/* Quick Input Controls for Weight and Reps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Peso (kg) with Steppers & Quick Jump */}
            <div className="rounded-2xl border border-[#2A1B14] bg-[#050505] p-3 space-y-2 text-center">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-[#A1A1AA]">
                  Carga (kg)
                </span>
                {isBarbell && (
                  <button
                    type="button"
                    onClick={() => setIsPlateModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#FF5722]/50 bg-[#2A1B14] px-2 py-0.5 text-[10px] font-black text-[#FF6D00] hover:bg-[#FF5722] hover:text-white transition active:scale-95"
                    title="Abrir calculadora de discos"
                  >
                    <Scale size={12} />
                    <span>⚖️ Discos</span>
                  </button>
                )}
              </div>

              {/* Stepper + Input */}
              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustWeight(-5)}
                  className="oled-stepper-btn"
                  title="-5 kg"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustWeight(-2.5)}
                  className="oled-stepper-btn"
                  title="-2.5 kg"
                >
                  -2.5
                </button>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={weightInput}
                    onChange={(e) =>
                      setWeightInput(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-20 sm:w-24 text-center px-2 py-2 text-xl font-black rounded-xl border border-[#2A1B14] bg-[#121113] text-white outline-none focus:border-[#FF5722] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#71717A]">
                    kg
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdjustWeight(+2.5)}
                  className="oled-stepper-btn"
                  title="+2.5 kg"
                >
                  +2.5
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustWeight(+5)}
                  className="oled-stepper-btn"
                  title="+5 kg"
                >
                  +5
                </button>
              </div>

              {/* Quick Increment Chips: [-5] [-2.5] [+2.5] [+5] [+10] */}
              <div className="flex justify-center gap-1 pt-1">
                {[+1.25, +2.5, +5, +10].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => handleAdjustWeight(inc)}
                    className="rounded-lg border border-[#2A1B14] bg-[#121113] px-2 py-0.5 text-[10px] font-black text-[#A1A1AA] hover:border-[#FF5722] hover:text-white active:scale-95 transition"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>

            {/* Repeticiones with Steppers & Quick Pills */}
            <div className="rounded-2xl border border-[#2A1B14] bg-[#050505] p-3 space-y-2 text-center">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-[#A1A1AA]">
                  Repeticiones
                </span>
                {curEst1RM > 0 && repsInput > 1 && (
                  <span className="text-[10px] font-bold text-[#FF6D00]">
                    1RM: {curEst1RM}kg
                  </span>
                )}
              </div>

              {/* Stepper + Input */}
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustReps(-1)}
                  className="oled-stepper-btn"
                  title="-1 rep"
                >
                  -1
                </button>

                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    value={repsInput}
                    onChange={(e) =>
                      setRepsInput(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="w-20 sm:w-24 text-center px-2 py-2 text-xl font-black rounded-xl border border-[#2A1B14] bg-[#121113] text-white outline-none focus:border-[#FF5722] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#71717A]">
                    reps
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdjustReps(+1)}
                  className="oled-stepper-btn"
                  title="+1 rep"
                >
                  +1
                </button>
              </div>

              {/* Quick Pills: [6, 8, 10, 12, 15] */}
              <div className="flex justify-center gap-1.5 pt-1">
                {REP_PILLS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRepsInput(r)}
                    className={`rounded-lg px-2.5 py-0.5 text-[10px] font-black transition active:scale-95 ${
                      repsInput === r
                        ? "border border-[#FF5722] bg-[#FF5722]/25 text-[#FF6D00]"
                        : "border border-[#2A1B14] bg-[#121113] text-[#A1A1AA] hover:border-[#FF5722]/50 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIR and Tipo de Serie Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* RIR (Repeticiones en Reserva) */}
            <div className="rounded-xl border border-[#2A1B14] bg-[#050505] p-2.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-[#71717A] block">
                RIR (Repeticiones en Reserva):
              </span>
              <div className="grid grid-cols-4 gap-1">
                {RIR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedRir(opt.value)}
                    className={`rounded-lg py-1.5 text-[10px] font-black transition active:scale-95 ${
                      selectedRir === opt.value
                        ? "border border-[#FF5722] bg-[#FF5722] text-[#050505] shadow-[0_0_10px_rgba(255,87,34,0.4)]"
                        : "border border-[#2A1B14] bg-[#121113] text-[#A1A1AA] hover:border-[#FF5722]/50 hover:text-white"
                    }`}
                  >
                    {opt.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de Serie */}
            <div className="rounded-xl border border-[#2A1B14] bg-[#050505] p-2.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-[#71717A] block">
                Tipo de Serie:
              </span>
              <div className="grid grid-cols-4 gap-1">
                {SET_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedType(t.key)}
                    className={`rounded-lg py-1.5 text-[10px] font-black transition active:scale-95 ${
                      selectedType === t.key
                        ? t.key === "warmup"
                          ? "border border-amber-500 bg-amber-500 text-black shadow-sm"
                          : t.key === "failure"
                          ? "border border-red-500 bg-red-500 text-white shadow-sm"
                          : "border border-[#FF5722] bg-[#FF5722] text-[#050505] shadow-[0_0_10px_rgba(255,87,34,0.4)]"
                        : "border border-[#2A1B14] bg-[#121113] text-[#A1A1AA] hover:border-[#FF5722]/50 hover:text-white"
                    }`}
                    title={t.label}
                  >
                    {t.badge} ({t.key === "normal" ? "Norm" : t.key === "warmup" ? "Cal" : t.key === "dropset" ? "Drop" : "Fallo"})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Big Action: ✓ Guardar Serie */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveSet}
              className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-[#FF5722] via-[#FF6D00] to-[#C84218] p-3.5 text-base font-black text-white shadow-[0_0_25px_rgba(255,87,34,0.45)] hover:shadow-[0_0_35px_rgba(255,109,0,0.6)] active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <Check size={22} strokeWidth={3} />
              <span>
                ✓ Guardar Serie #{ (activeExercise.sets || []).length + 1 } (
                {weightInput}kg × {repsInput} reps)
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Barbell Plate Calculator Modal */}
      <PlateCalculatorModal
        isOpen={isPlateModalOpen}
        onClose={() => setIsPlateModalOpen(false)}
        initialWeight={weightInput}
        exerciseName={activeExercise.exerciseName}
        onApplyWeight={(w) => setWeightInput(w)}
      />
    </>
  );
}
