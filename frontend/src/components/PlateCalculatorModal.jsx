import React, { useState, useMemo } from "react";
import { X, Scale, Plus, Minus, Check, Dumbbell } from "lucide-react";

// Standard plates available in Olympic gyms
const STANDARD_PLATES = [
  { weight: 25, color: "bg-red-600 border-red-400 text-white", label: "25kg", name: "Rojo (25 kg)" },
  { weight: 20, color: "bg-blue-600 border-blue-400 text-white", label: "20kg", name: "Azul (20 kg)" },
  { weight: 15, color: "bg-yellow-500 border-yellow-300 text-black", label: "15kg", name: "Amarillo (15 kg)" },
  { weight: 10, color: "bg-emerald-600 border-emerald-400 text-white", label: "10kg", name: "Verde (10 kg)" },
  { weight: 5, color: "bg-zinc-200 border-white text-zinc-900", label: "5kg", name: "Blanco (5 kg)" },
  { weight: 2.5, color: "bg-zinc-800 border-zinc-600 text-zinc-200", label: "2.5kg", name: "Negro (2.5 kg)" },
  { weight: 1.25, color: "bg-slate-400 border-slate-300 text-slate-900", label: "1.25", name: "Cromo (1.25 kg)" },
];

export function calculatePlates(targetTotalWeight, barWeight = 20) {
  const total = parseFloat(targetTotalWeight) || 0;
  if (total <= barWeight) {
    return {
      perSideWeight: 0,
      plates: [],
      remainder: 0,
      isBarOnly: total === barWeight,
      isUnderBar: total < barWeight,
    };
  }

  const perSideTarget = (total - barWeight) / 2;
  let remaining = perSideTarget;
  const plateCounts = [];

  for (const plate of STANDARD_PLATES) {
    if (remaining >= plate.weight) {
      const count = Math.floor(remaining / plate.weight);
      remaining = Math.round((remaining - count * plate.weight) * 100) / 100;
      plateCounts.push({
        ...plate,
        count,
      });
    }
  }

  return {
    perSideWeight: perSideTarget,
    plates: plateCounts,
    remainder: remaining,
    isBarOnly: false,
    isUnderBar: false,
  };
}

export default function PlateCalculatorModal({
  isOpen,
  onClose,
  initialWeight = 80,
  exerciseName = "Barra",
  onApplyWeight = null,
}) {
  const [weight, setWeight] = useState(parseFloat(initialWeight) || 20);
  const [barWeight, setBarWeight] = useState(20);

  // Sync when opening
  React.useEffect(() => {
    if (isOpen) {
      setWeight(parseFloat(initialWeight) || 20);
    }
  }, [isOpen, initialWeight]);

  const calculation = useMemo(() => {
    return calculatePlates(weight, barWeight);
  }, [weight, barWeight]);

  if (!isOpen) return null;

  const handleAdjustWeight = (delta) => {
    setWeight((prev) => Math.max(0, Math.round((prev + delta) * 10) / 10));
  };

  const handleApply = () => {
    if (onApplyWeight) {
      onApplyWeight(weight);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#1C1C1E] p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF5722]/10 text-[#FF5722]">
              <Scale size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Calculadora de Discos</h3>
              <p className="text-[11px] text-[#8E8E93] truncate max-w-[220px]">
                {exerciseName} • Barra estándar {barWeight} kg
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-[#121212] text-[#8E8E93] hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Weight Selector with quick chips */}
        <div className="rounded-2xl border border-white/10 bg-[#121212] p-3 text-center space-y-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            Peso Total Objetivo
          </span>

          <div className="flex items-center justify-center gap-2">
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
                value={weight}
                onChange={(e) => setWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 text-center px-2 py-2 text-2xl font-bold rounded-xl border border-white/10 bg-[#1C1C1E] text-white outline-none focus:border-[#FF5722] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8E8E93]">
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

          {/* Quick Jump Chips */}
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {[40, 60, 80, 100, 120, 140].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeight(w)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                  weight === w
                    ? "border border-[#FF5722] bg-[#FF5722]/10 text-[#FF5722]"
                    : "border border-white/10 bg-[#1C1C1E] text-[#8E8E93] hover:border-white/20 hover:text-white"
                }`}
              >
                {w}kg
              </button>
            ))}
          </div>
        </div>

        {/* Calculation Summary */}
        <div className="rounded-2xl border border-white/10 bg-[#121212] p-3 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#8E8E93]">Por cada lado:</span>
            <span className="text-base font-bold text-white">
              {calculation.perSideWeight} kg
            </span>
          </div>

          {/* Graphical Barbell Sleeve Representation */}
          <div className="py-2">
            <div className="flex items-center justify-center gap-1 bg-[#1C1C1E] p-3 rounded-xl border border-white/5 min-h-[70px] overflow-x-auto no-scrollbar">
              {/* Bar collar */}
              <div className="h-10 w-3 rounded-l bg-zinc-600 border-r border-zinc-400 flex-shrink-0" title="Collar" />
              {/* Bar shaft */}
              <div className="h-4 w-6 bg-zinc-400 flex-shrink-0" />

              {/* Plates stack */}
              {calculation.plates.length === 0 ? (
                <div className="text-xs font-medium text-[#8E8E93] italic px-4">
                  {calculation.isBarOnly
                    ? "Barra sola (sin discos)"
                    : calculation.isUnderBar
                    ? "Peso menor a 20 kg"
                    : "Sin discos adicionales"}
                </div>
              ) : (
                calculation.plates.flatMap((p, pIdx) =>
                  Array.from({ length: p.count }).map((_, cIdx) => (
                    <div
                      key={`${p.weight}-${pIdx}-${cIdx}`}
                      className={`h-12 w-4 sm:w-5 rounded border flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${p.color}`}
                      title={`${p.weight} kg`}
                    >
                      <span className="-rotate-90 select-none text-[8px] font-bold">{p.label}</span>
                    </div>
                  ))
                )
              )}

              {/* Sleeve end */}
              <div className="h-4 w-10 rounded-r bg-zinc-500 border-l border-zinc-400 flex-shrink-0" />
            </div>
          </div>

          {/* Plates Text List */}
          <div className="space-y-1 text-xs">
            <span className="text-[11px] font-semibold text-[#8E8E93]">Discos necesarios por lado:</span>
            {calculation.plates.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {calculation.plates.map((p) => (
                  <span
                    key={p.weight}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#1C1C1E] px-2.5 py-1 font-semibold text-white text-xs"
                  >
                    <span className="text-[#FF5722] font-bold">{p.count}×</span>
                    <span>{p.weight} kg</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8E8E93] italic">
                {calculation.isBarOnly
                  ? "Cargar únicamente la barra olímpica de 20 kg."
                  : "No se requieren discos."}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 pt-1">
          {onApplyWeight && (
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 active:scale-95 transition text-white font-semibold text-xs flex items-center justify-center gap-2 select-none"
            >
              <Check size={16} />
              <span>Cargar {weight} kg en la serie</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] px-4 rounded-2xl border border-white/10 bg-[#121212] hover:bg-white/5 text-[#8E8E93] hover:text-white transition text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
