import React from "react";
import { ChevronRight } from "lucide-react";

export const WEEKLY_GOAL_TARGET = 4;

/**
 * WeeklyGoalsCard
 * Componente que muestra las metas de entrenamiento de la semana actual con:
 * - Indicador de progreso circular (SVG strokeDashoffset).
 * - Conteo dinámico ("safeCompleted/safeTarget", ej. "0/4").
 * - Mensaje de estado dinámico ("Faltan X • Vamos" o "¡Meta cumplida! • Vamos").
 * - Parametrizable a través de `user.weeklyGoalDays`, `targetDays` o fallback `WEEKLY_GOAL_TARGET`.
 */
export function WeeklyGoalsCard({
  completedDays,
  completedCount,
  targetDays,
  targetCount,
  remainingDays,
  progressPercentage,
  user,
  onClick,
}) {
  const safeTarget = Math.max(
    1,
    Number(
      targetDays ??
        targetCount ??
        user?.weeklyGoalDays ??
        user?.weekly_goal_days ??
        WEEKLY_GOAL_TARGET
    ) || WEEKLY_GOAL_TARGET
  );

  const safeCompleted = Math.max(
    0,
    Number(completedDays ?? completedCount ?? 0)
  );

  const safeRemaining =
    remainingDays !== undefined
      ? Math.max(0, Number(remainingDays))
      : Math.max(0, safeTarget - safeCompleted);

  const safeProgressPercentage =
    progressPercentage !== undefined
      ? Math.min(100, Math.max(0, Number(progressPercentage)))
      : Math.min(100, Math.round((safeCompleted / safeTarget) * 100));

  const progressRatio = Math.min(1, Math.max(0, safeCompleted / safeTarget));

  const size = 64;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <section
      onClick={onClick}
      aria-label="Metas de esta semana"
      className="bg-[#FFFFFF] border border-[#F1F5F9] dark:bg-[#0E131F] dark:border-white/[0.07] rounded-3xl p-5 flex items-center gap-5 shadow-sm cursor-pointer hover:border-slate-200 dark:hover:border-white/15 transition-all active:scale-[0.99]"
    >
      {/* Lado izquierdo: Progress ring circular SVG minimalista */}
      <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-16 h-16 -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
          aria-valuenow={safeProgressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-[#F1F5F9] dark:text-slate-800"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#EF4444"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          {safeCompleted}/{safeTarget}
        </span>
      </div>

      {/* Lado derecho: Título en negrita y contador destacado */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-base text-[#0F172A] dark:text-[#F8FAFC] truncate">
            Metas de esta semana
          </h2>
          <ChevronRight size={18} className="text-[#64748B] dark:text-[#94A3B8] flex-shrink-0" />
        </div>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
          Mantén el ritmo semanal de entrenamiento
        </p>
        <p className="text-sm font-bold text-red-600 dark:text-red-500 mt-1.5">
          {safeRemaining > 0
            ? `Faltan ${safeRemaining} • Vamos`
            : "¡Meta cumplida! • Vamos"}
        </p>
      </div>
    </section>
  );
}

export const WeeklyGoalCard = WeeklyGoalsCard;
export default WeeklyGoalsCard;
