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
    <div className="rounded-xl border border-slate-100 bg-white p-3 sm:p-3.5 space-y-2.5 select-none">
      {/* Fila superior: Fecha, estado de conectividad, cronómetro y descarte */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex-shrink-0">
            <Flame size={16} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold capitalize text-[#0F172A] leading-snug">
              {dateText}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-[#64748B]">
              <span>Sesión de Carga</span>
              {isOffline && (
                <span className="text-red-400 font-semibold flex items-center gap-0.5">
                  <CloudOff size={10} /> Offline
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {timerText && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-[#F9FAFB] px-2.5 py-1 text-xs font-mono font-bold text-[#0F172A] shadow-inner">
              <span className="text-red-500 animate-pulse">⏱️</span>
              <span>{timerText.replace(/^⏱️\s*/, "")}</span>
            </div>
          )}

          {hasSets && onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="text-xs font-semibold text-[#64748B] hover:text-red-400 p-1 transition cursor-pointer"
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
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 shadow-sm animate-in fade-in duration-200">
            <span>📶</span>
            <span>Modo sin conexión (Catálogo local activo)</span>
          </div>
        )}

        {/* Indicador Dinámico de Ciclo Biológico Automático 100% */}
        {isDeload ? (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 shadow-sm">
            <span>🛡️</span>
            <span>Recuperación activa recomendada (-30% de carga)</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500 shadow-sm">
            <span>⚡</span>
            <span>Fase de sobrecarga activa</span>
          </div>
        )}
      </div>
    </div>
  );
}
