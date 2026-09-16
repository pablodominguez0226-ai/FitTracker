import React from "react";
import {
  Trophy,
  Flame,
  AlertTriangle,
  Lightbulb,
  Check,
  Sparkles,
  CloudOff,
} from "lucide-react";
import { formatDateLong } from "../utils/dateUtils";

export default function WorkoutSummaryModal({
  isOpen,
  onClose,
  date,
  summary,
  isOfflineSaved = false,
}) {
  if (!isOpen || !summary) return null;

  const formattedDate = date ? formatDateLong(date) : "Hoy";
  const {
    totalVolumeKg = 0,
    totalSets = 0,
    prsBroken = [],
    improvements = [],
    declines = [],
    nextSessionSuggestion = "",
  } = summary;

  const hasAchievements = prsBroken.length > 0 || improvements.length > 0;
  const hasDeclines = declines.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1C1C1E] p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* 1. CABECERA */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white">
            <Trophy size={28} strokeWidth={2.5} />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Entrenamiento Completado
            </h2>
            <p className="text-xs text-[#8E8E93] capitalize mt-0.5">
              {formattedDate}
            </p>
          </div>

          {/* Tonelaje Total y Series Badge */}
          <div className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-[#121212] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white">
            <span className="text-[#FF5722]">
              {totalVolumeKg.toLocaleString()} kg
            </span>
            <span className="text-[#8E8E93] mx-2">movidos</span>
            <span className="text-[#8E8E93]">|</span>
            <span className="text-emerald-400 ml-2">
              {totalSets} {totalSets === 1 ? "serie" : "series"}
            </span>
          </div>

          {isOfflineSaved && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg py-1 px-2.5">
              <CloudOff size={12} />
              <span>Guardado localmente. Se sincronizará al conectar.</span>
            </div>
          )}
        </div>

        {/* 2. LOGROS / AVANCES */}
        {hasAchievements ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Sparkles size={14} />
              <span>Logros y Avances</span>
            </div>
            <div className="space-y-1.5 text-xs font-medium text-white">
              {prsBroken.map((pr, idx) => (
                <div key={`pr-${idx}`} className="flex items-start gap-2">
                  <span className="text-amber-400">🏆</span>
                  <span className="leading-snug">
                    <strong className="text-white font-semibold">{pr.text}</strong>
                  </span>
                </div>
              ))}
              {improvements.map((imp, idx) => (
                <div key={`imp-${idx}`} className="flex items-start gap-2">
                  <span className="text-[#FF5722]">🔥</span>
                  <span className="leading-snug">{imp.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-[#121212] p-3 text-center text-xs font-medium text-[#8E8E93]">
            <span>✓ Cargas consolidadas y sesión registrada para futuras comparativas</span>
          </div>
        )}

        {/* 3. ATENCIÓN / BAJONES */}
        {hasDeclines && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
              <AlertTriangle size={14} />
              <span>Atención / Cargas</span>
            </div>
            <div className="space-y-1 text-xs font-medium text-amber-200">
              {declines.map((dec, idx) => (
                <div key={`dec-${idx}`} className="flex items-start gap-2">
                  <span className="text-amber-400">⚠️</span>
                  <span className="leading-snug">{dec.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. SUGERENCIA DIRECTA PARA LA PRÓXIMA SEMANA */}
        {nextSessionSuggestion && (
          <div className="rounded-2xl border border-white/10 bg-[#121212] p-3.5 flex items-start gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF5722]/10 text-[#FF5722] flex-shrink-0 mt-0.5">
              <Lightbulb size={14} />
            </div>
            <p className="text-xs font-medium text-[#E4E4E7] leading-relaxed">
              <span className="text-[#FF5722] font-semibold">Próxima sesión sugerida: </span>
              {nextSessionSuggestion.replace(/^Próxima sesión sugerida:\s*/i, "")}
            </p>
          </div>
        )}

        {/* 5. BOTÓN ANCHO INFERIOR: Listo / Volver al Inicio */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white font-semibold text-sm sm:text-base tracking-wide hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-2 select-none"
          >
            <Check size={20} strokeWidth={2.5} />
            <span>Listo / Volver al Inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
