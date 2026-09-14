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
    <div className="rounded-2xl border border-[#2A1B14] bg-[#121113] p-3.5 sm:p-4 space-y-3 shadow-card select-none">
      {/* Top row: Date, Session status & Discard */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF5722] to-[#FF6D00] text-[#050505] font-black shadow-neon">
            <Flame size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black capitalize text-white leading-snug">
              {dateText}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA]">
              <span>Sesión de Carga</span>
              {!isDeviceOnline && (
                <span className="text-amber-400 font-bold flex items-center gap-0.5">
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
            className="text-xs font-bold text-[#71717A] hover:text-red-400 p-1 transition"
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
            className={`min-h-[44px] rounded-xl px-2.5 py-2 text-xs font-black transition active:scale-95 flex items-center justify-center gap-1.5 ${
              isOverload
                ? "border-2 border-[#FF5722] bg-[#FF5722] text-[#050505] shadow-[0_0_16px_rgba(255,87,34,0.45)]"
                : "border border-[#2A1B14] bg-[#050505] text-[#A1A1AA] hover:border-[#FF5722]/40 hover:text-white"
            }`}
          >
            <span className="text-sm">⚡</span>
            <span className="tracking-tight truncate">SEMANA DURA</span>
          </button>

          {/* SEMANA DE DESCARGA (Deload) */}
          <button
            type="button"
            onClick={() => handleSelectMode(PERIODIZATION_MODES.DELOAD)}
            className={`min-h-[44px] rounded-xl px-2.5 py-2 text-xs font-black transition active:scale-95 flex items-center justify-center gap-1.5 ${
              isDeload
                ? "border-2 border-[#38BDF8] bg-[#38BDF8] text-[#050505] shadow-[0_0_16px_rgba(56,189,248,0.45)]"
                : "border border-[#2A1B14] bg-[#050505] text-[#A1A1AA] hover:border-[#38BDF8]/40 hover:text-white"
            }`}
          >
            <span className="text-sm">🛡️</span>
            <span className="tracking-tight truncate">SEMANA DE DESCARGA</span>
          </button>
        </div>

        {/* Micro-hint depending on mode */}
        <div className="text-center">
          {isOverload ? (
            <p className="text-[11px] font-bold text-[#FF6D00] flex items-center justify-center gap-1">
              <span>Sobrecarga: +2.5 kg barra / +1.25 kg mancuernas • RIR 1-2</span>
            </p>
          ) : (
            <p className="text-[11px] font-bold text-[#38BDF8] flex items-center justify-center gap-1">
              <span>Deload: 70% del peso habitual (múltiplos 2.5 kg) • RIR 3-4</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
