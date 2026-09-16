import React from "react";
import { Flame, CloudOff, Zap, ShieldCheck } from "lucide-react";
import {
  PERIODIZATION_MODES,
  getWeeklyPeriodizationMode,
  setWeeklyPeriodizationMode,
} from "../utils/periodization";

export default function WorkoutHeader({
  dateText,
  isDeviceOnline = true,
  hasSets = false,
  onDiscard = null,
  periodizationMode = getWeeklyPeriodizationMode(),
  onPeriodizationChange = null,
}) {
  const isOverload = periodizationMode === PERIODIZATION_MODES.OVERLOAD;
  const isDeload = periodizationMode === PERIODIZATION_MODES.DELOAD;

  const handleSelectMode = (newMode) => {
    setWeeklyPeriodizationMode(newMode);
    if (onPeriodizationChange) {
      onPeriodizationChange(newMode);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#1C1C1E] p-3.5 sm:p-4 space-y-3 select-none">
      {/* Top row: Date, Session status & Discard */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white font-bold">
            <Flame size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold capitalize text-white leading-snug">
              {dateText}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E93]">
              <span>Sesión de Carga</span>
              {!isDeviceOnline && (
                <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                  <CloudOff size={10} /> Offline
                </span>
              )}
            </div>
          </div>
        </div>

        {hasSets && onDiscard && (
          <button
            type="button"
            onClick={onDiscard}
            className="text-xs font-semibold text-[#8E8E93] hover:text-rose-400 p-1 transition"
            title="Descartar sesión"
          >
            Descartar
          </button>
        )}
      </div>

      {/* Periodization Chips / Selector */}
      <div className="pt-0.5 space-y-1.5">
        <div className="grid grid-cols-2 gap-2">
          {/* SEMANA DURA (Sobrecarga) */}
          <button
            type="button"
            onClick={() => handleSelectMode(PERIODIZATION_MODES.OVERLOAD)}
            className={`min-h-[44px] rounded-2xl px-2.5 py-2 text-xs font-semibold transition active:scale-95 flex items-center justify-center gap-1.5 ${
              isOverload
                ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                : "border border-white/10 bg-[#121212] text-[#8E8E93] hover:border-white/20 hover:text-white"
            }`}
          >
            <span className="text-sm">⚡</span>
            <span className="tracking-tight truncate">SEMANA DURA</span>
          </button>

          {/* SEMANA DE DESCARGA (Deload) */}
          <button
            type="button"
            onClick={() => handleSelectMode(PERIODIZATION_MODES.DELOAD)}
            className={`min-h-[44px] rounded-2xl px-2.5 py-2 text-xs font-semibold transition active:scale-95 flex items-center justify-center gap-1.5 ${
              isDeload
                ? "border border-sky-400 bg-sky-400/10 text-sky-400"
                : "border border-white/10 bg-[#121212] text-[#8E8E93] hover:border-white/20 hover:text-white"
            }`}
          >
            <span className="text-sm">🛡️</span>
            <span className="tracking-tight truncate">SEMANA DE DESCARGA</span>
          </button>
        </div>

        {/* Micro-hint depending on mode */}
        <div className="text-center">
          {isOverload ? (
            <p className="text-[11px] font-medium text-[#FF5722] flex items-center justify-center gap-1">
              <span>Sobrecarga: +2.5 kg barra / +1.25 kg mancuernas • RIR 1-2</span>
            </p>
          ) : (
            <p className="text-[11px] font-medium text-sky-400 flex items-center justify-center gap-1">
              <span>Deload: 70% del peso habitual (múltiplos 2.5 kg) • RIR 3-4</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
