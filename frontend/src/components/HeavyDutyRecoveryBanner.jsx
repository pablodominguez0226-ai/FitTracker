import React from "react";
import { Zap, Clock, ShieldCheck, AlertCircle, Sparkles, Shield, Moon } from "lucide-react";

export default function HeavyDutyRecoveryBanner({
  recoveryStatus = null,
  muscleTracker = null,
  compact = false,
  onStartRoutine = null,
}) {
  const isWeekendDay = (() => {
    const d = new Date().getDay();
    return d === 0 || d === 6;
  })();

  const weekendNotice = muscleTracker?.weekendNotice || (isWeekendDay ? "Sábado y Domingo programados de descanso biológico" : null);

  const hasStimulusInfo = Boolean(muscleTracker && (muscleTracker.stimulusLabel || muscleTracker.hoursElapsed !== null));
  const stimulusText = muscleTracker?.stimulusLabel || (muscleTracker?.hoursElapsed !== null && muscleTracker?.hoursElapsed !== undefined
    ? `Último estímulo de este grupo: hace ${muscleTracker.hoursElapsed} horas`
    : null);

  const isUnderRecovery = Boolean(muscleTracker?.isUnderRecovery);

  return (
    <div className="rounded-2xl border border-[#2C2C2E] bg-[#121212] p-4 sm:p-5 space-y-3 transition-all hover:border-[#FF5722]/30 shadow-md">
      {/* 1. NOTIFICACIÓN DE FIN DE SEMANA */}
      {weekendNotice && (
        <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/15 to-[#7C4DFF]/15 px-3 py-2 text-xs font-semibold text-indigo-200 flex items-center gap-2 shadow-sm">
          <Moon size={15} className="text-indigo-400 flex-shrink-0" />
          <span>{weekendNotice}</span>
        </div>
      )}

      {/* 2. CABECERA: RECUPERACIÓN SISTÉMICA Y MOTOR BIOMÉTRICO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white flex-shrink-0 shadow-sm">
            <Zap size={20} className="fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Recuperación Sistémica Heavy Duty
              </h3>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  recoveryStatus?.badgeClass || "border-white/10 bg-white/5 text-[#8E8E93]"
                }`}
              >
                {recoveryStatus?.statusLabel || "Mentzer Protocol"}
              </span>
            </div>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              {recoveryStatus?.hasHistory && recoveryStatus?.daysCompleted !== null ? (
                <>
                  <strong className="text-white">Descanso post-Heavy Duty:</strong>{" "}
                  <span className="text-emerald-400 font-bold">
                    {recoveryStatus.daysCompleted}{" "}
                    {recoveryStatus.daysCompleted === 1 ? "día completado" : "días completados"}
                  </span>
                  {recoveryStatus.lastDate && ` (última sesión el ${recoveryStatus.lastDate})`}
                </>
              ) : (
                "Aún no registraste una sesión de alta intensidad Heavy Duty"
              )}
            </p>
          </div>
        </div>

        <div className="self-start sm:self-center flex items-center gap-1.5 rounded-xl border border-white/5 bg-[#050505] px-2.5 py-1 text-[11px] text-[#8E8E93]">
          <Clock size={12} className="text-[#FF5722]" />
          <span>
            Ventana ideal: <strong>72h - 120h (3 a 5 días)</strong>
          </span>
        </div>
      </div>

      {/* 3. MOTOR BIOMÉTRICO DE RECUPERACIÓN (GRUPO MUSCULAR) */}
      {hasStimulusInfo && (
        <div className="rounded-xl border border-white/5 bg-[#0A0A0A] p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-white">
              <span className="h-2 w-2 rounded-full bg-[#FF5722]" />
              <strong className="font-semibold">{stimulusText}</strong>
              {muscleTracker?.displayMuscleName && muscleTracker.displayMuscleName !== "este grupo muscular" && (
                <span className="text-[11px] text-[#8E8E93]">
                  ({muscleTracker.displayMuscleName})
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#8E8E93]">
              Umbral mínimo Mentzer: <strong className="text-[#C4C4C6]">96 horas</strong>
            </div>
          </div>

          {/* ALERTA DE RECUPERACIÓN INCOMPLETA (< 96h) */}
          {isUnderRecovery && (
            <div className="inline-flex w-full items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-semibold shadow-sm animate-in fade-in">
              <Shield size={16} className="text-amber-400 flex-shrink-0" />
              <span>🛡️ Aviso Mentzer: Músculo en fase de reparación. El crecimiento ocurre durante el descanso</span>
            </div>
          )}
        </div>
      )}

      {/* 4. SUGERENCIA AUTOMÁTICA DEL PROTOCOLO MENTZER */}
      {recoveryStatus?.suggestion && (
        <div className="rounded-xl border border-white/5 bg-[#050505] p-3 text-xs text-[#C4C4C6] leading-relaxed flex items-start gap-2.5">
          <div className="mt-0.5 flex-shrink-0">
            {recoveryStatus.status === "optimal" ? (
              <Sparkles size={15} className="text-emerald-400" />
            ) : recoveryStatus.status === "resting" ? (
              <AlertCircle size={15} className="text-amber-400" />
            ) : (
              <ShieldCheck size={15} className="text-[#7C4DFF]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-white block mb-0.5">
              Sugerencia de Recuperación del SNC:
            </span>
            <p className="text-xs text-[#8E8E93] leading-relaxed">
              {recoveryStatus.suggestion}
            </p>
          </div>
        </div>
      )}

      {!compact && onStartRoutine && (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onStartRoutine}
            className="text-xs font-semibold text-[#FF5722] hover:text-white transition flex items-center gap-1"
          >
            <span>Ver Rutinas Heavy Duty →</span>
          </button>
        </div>
      )}
    </div>
  );
}
