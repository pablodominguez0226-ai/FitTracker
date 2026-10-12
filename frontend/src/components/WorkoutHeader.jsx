import React from "react";
import { Flame, CloudOff, Zap, ShieldAlert, Sparkles } from "lucide-react";

/**
 * WorkoutHeader - Cabecera simplificada con ciclo de periodización 100% automático
 * Muestra dinámicamente el estado biológico: Sobrecarga activa o Sugerencia de Descarga.
 */
export default function WorkoutHeader({
  dateText,
  timerText = "",
  isDeviceOnline = true,
  isUsingOfflineCache = false,
  hasSets = false,
  onDiscard = null,
  cycleStatus = null,
}) {
  const isDeload = cycleStatus?.status === "deload";
  const isOffline = !isDeviceOnline || isUsingOfflineCache;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#1C1C1E] p-3.5 sm:p-4 space-y-3 select-none">
      {/* Fila superior: Fecha, estado de conectividad, cronómetro y descarte */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white font-bold flex-shrink-0">
            <Flame size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold capitalize text-white leading-snug">
              {dateText}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E93]">
              <span>Sesión de Carga</span>
              {isOffline && (
                <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                  <CloudOff size={10} /> Offline
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {timerText && (
            <div className="flex items-center gap-1.5 rounded-full border border-[#FF5722]/30 bg-[#121212] px-2.5 py-1 text-xs font-mono font-bold text-white shadow-inner">
              <span className="text-[#FF5722] animate-pulse">⏱️</span>
              <span>{timerText.replace(/^⏱️\s*/, "")}</span>
            </div>
          )}

          {hasSets && onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="text-xs font-semibold text-[#8E8E93] hover:text-rose-400 p-1 transition cursor-pointer"
              title="Descartar sesión"
            >
              Descartar
            </button>
          )}
        </div>
      </div>

      {/* Indicadores de Estado y Ciclo Biológico */}
      <div className="pt-0.5 flex flex-wrap items-center gap-2">
        {/* Chip compacto Modo sin conexión con catálogo local activo */}
        {isOffline && (
          <div className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-sm animate-in fade-in duration-200">
            <span>📶</span>
            <span>Modo sin conexión (Catálogo local activo)</span>
          </div>
        )}

        {/* Indicador Dinámico de Ciclo Biológico Automático 100% */}
        {isDeload ? (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-300 shadow-sm">
            <span className="text-sm">🛡️</span>
            <span>Recuperación activa recomendada (-30% de carga sugerido)</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[#FF5722]/30 bg-[#FF5722]/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm">
            <span className="text-sm">⚡</span>
            <span>Fase de sobrecarga activa</span>
          </div>
        )}
      </div>
    </div>
  );
}
