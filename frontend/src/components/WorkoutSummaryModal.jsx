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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md rounded-3xl border border-[#2A1B14] bg-[#050505] p-5 sm:p-6 shadow-neon space-y-4 max-h-[90vh] overflow-y-auto">
        {/* 1. CABECERA */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#FF6D00] text-[#050505] shadow-[0_0_20px_rgba(255,87,34,0.5)]">
            <Trophy size={28} strokeWidth={2.5} />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Entrenamiento Completado
            </h2>
            <p className="text-xs text-[#A1A1AA] capitalize mt-0.5">
              {formattedDate}
            </p>
          </div>

          {/* Tonelaje Total y Series Badge */}
          <div className="inline-flex items-center justify-center rounded-xl border border-[#FF5722]/40 bg-[#121113] px-3.5 py-1.5 text-xs sm:text-sm font-black text-white shadow-sm">
            <span className="text-[#FF6D00]">
              {totalVolumeKg.toLocaleString()} kg
            </span>
            <span className="text-[#71717A] mx-2">movidos</span>
            <span className="text-[#71717A]">|</span>
            <span className="text-[#34D399] ml-2">
              {totalSets} {totalSets === 1 ? "serie" : "series"}
            </span>
          </div>

          {isOfflineSaved && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg py-1 px-2.5">
              <CloudOff size={12} />
              <span>Guardado localmente. Se sincronizará al conectar.</span>
            </div>
          )}
        </div>

        {/* 2. LOGROS / AVANCES (Verde neón / Naranja neón) */}
        {hasAchievements ? (
          <div className="rounded-2xl border border-[#34D399]/30 bg-[#34D399]/10 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#34D399]">
              <Sparkles size={14} />
              <span>Logros y Avances</span>
            </div>
            <div className="space-y-1.5 text-xs font-bold text-white">
              {prsBroken.map((pr, idx) => (
                <div key={`pr-${idx}`} className="flex items-start gap-2">
                  <span className="text-amber-400">🏆</span>
                  <span className="leading-snug">
                    <strong className="text-white">{pr.text}</strong>
                  </span>
                </div>
              ))}
              {improvements.map((imp, idx) => (
                <div key={`imp-${idx}`} className="flex items-start gap-2">
                  <span className="text-[#FF6D00]">🔥</span>
                  <span className="leading-snug">{imp.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#2A1B14] bg-[#121113] p-3 text-center text-xs font-bold text-[#A1A1AA]">
            <span>✓ Cargas consolidadas y sesión registrada para futuras comparativas</span>
          </div>
        )}

        {/* 3. ATENCIÓN / BAJONES (si los hubo, en tono ámbar/óxido sutil) */}
        {hasDeclines && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
              <AlertTriangle size={14} />
              <span>Atención / Cargas</span>
            </div>
            <div className="space-y-1 text-xs font-semibold text-amber-200">
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
          <div className="rounded-2xl border border-[#FF5722]/30 bg-[#121113] p-3.5 flex items-start gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF5722]/20 text-[#FF6D00] flex-shrink-0 mt-0.5">
              <Lightbulb size={14} />
            </div>
            <p className="text-xs font-bold text-[#E4E4E7] leading-relaxed">
              <span className="text-[#FF6D00] font-black">Próxima sesión sugerida: </span>
              {nextSessionSuggestion.replace(/^Próxima sesión sugerida:\s*/i, "")}
            </p>
          </div>
        )}

        {/* 5. BOTÓN ANCHO INFERIOR: Listo / Volver al Inicio */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[52px] rounded-2xl bg-[#FF5722] text-[#050505] font-black text-sm sm:text-base tracking-wider shadow-[0_0_20px_rgba(255,87,34,0.4)] hover:bg-[#FF6D00] active:scale-95 transition flex items-center justify-center gap-2 select-none"
          >
            <Check size={20} strokeWidth={3} />
            <span>Listo / Volver al Inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
