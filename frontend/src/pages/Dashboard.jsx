import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Layers,
  Play,
  Plus,
  Scale,
  TrendingUp,
} from "lucide-react";
import { getProfile, getWorkouts, getMetricsSummary } from "../api/client";
import HistoryModal from "../components/HistoryModal";
import ManualWorkoutLogModal from "../components/ManualWorkoutLogModal";
import { getLocalDateString, parseDateSafe } from "../utils/dateUtils";
import WeeklyGoalsCard, {
  WeeklyGoalCard,
  WEEKLY_GOAL_TARGET,
} from "../components/WeeklyGoalsCard";

export { WeeklyGoalsCard, WeeklyGoalCard, WEEKLY_GOAL_TARGET };

const DAY_LABELS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/**
 * Calcula los 7 días (lunes a domingo) de la semana actual
 */
function getCurrentWeekDays(completedDatesSet = new Set()) {
  const now = new Date();
  const todayStr = getLocalDateString(now);

  // Obtener lunes de la semana actual (getDay(): 0 = domingo, 1 = lunes, ...)
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday,
    12,
    0,
    0
  );

  return DAY_LABELS.map((label, idx) => {
    const d = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + idx,
      12,
      0,
      0
    );
    const dateStr = getLocalDateString(d);
    const isToday = dateStr === todayStr;
    const isCompleted = completedDatesSet.has(dateStr);

    return {
      key: dateStr,
      label,
      dayNumber: d.getDate(),
      isToday,
      isCompleted,
    };
  });
}

/**
 * Calcula la racha de días consecutivos entrenando hasta hoy/ayer
 */
function calculateStreakDays(completedDatesSet) {
  if (!completedDatesSet || completedDatesSet.size === 0) return 0;

  const today = new Date();
  const todayStr = getLocalDateString(today);
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
    12,
    0,
    0
  );
  const yesterdayStr = getLocalDateString(yesterday);

  if (!completedDatesSet.has(todayStr) && !completedDatesSet.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  let cursor = completedDatesSet.has(todayStr) ? today : yesterday;

  while (true) {
    const str = getLocalDateString(cursor);
    if (completedDatesSet.has(str)) {
      streak += 1;
      cursor = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate() - 1,
        12,
        0,
        0
      );
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 1. Header Principal
 */
function HomeHeader({ formattedDate, onOpenHistory, onStartWorkout, onOpenManualWorkout }) {
  return (
    <section className="space-y-3.5">
      <button
        type="button"
        onClick={onOpenHistory}
        className="text-red-600 dark:text-red-500 text-sm font-semibold flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
      >
        <Calendar size={15} strokeWidth={2.25} />
        <span className="capitalize">{formattedDate}</span>
        <ChevronRight size={14} strokeWidth={2.5} />
      </button>

      <div className="space-y-1.5">
        <h1 className="font-black text-3xl tracking-tight text-[#0F172A] dark:text-[#F8FAFC] leading-tight">
          ¿Listo? Empieza a entrenar.
        </h1>
        <p className="text-[#64748B] dark:text-[#94A3B8] text-sm font-normal max-w-[90%] leading-relaxed">
          Supera tus marcas personales y mantén tu disciplina día a día.
        </p>
      </div>

      <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
        <button
          type="button"
          onClick={onStartWorkout}
          className="flex-1 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-sm shadow-red-600/20 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Play size={16} fill="currentColor" strokeWidth={2} />
          <span>Iniciar entrenamiento</span>
        </button>

        <button
          type="button"
          onClick={onOpenManualWorkout}
          className="w-full sm:w-auto bg-[#161B26] hover:bg-[#1f2636] text-slate-200 border border-white/10 text-xs font-bold py-3.5 px-4 rounded-full flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 shrink-0"
        >
          <Plus size={15} className="text-red-500" />
          <span>Registrar sesión pasada</span>
        </button>
      </div>
    </section>
  );
}

/**
 * 2. Selector Semanal de Días (Horizontal Strip)
 */
function WeeklyDayStrip({ weekDays, onSelectDay }) {
  return (
    <section
      aria-label="Calendario semanal"
      className="bg-[#FFFFFF] border border-[#F1F5F9] dark:bg-[#0E131F] dark:border-white/[0.07] rounded-3xl px-4 py-4 shadow-sm transition-colors duration-200"
    >
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((day) => {
          const isToday = day.isToday;
          const isCompleted = day.isCompleted;

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDay && onSelectDay(day)}
              className="flex flex-col items-center justify-start gap-1.5 py-0.5 cursor-pointer group"
            >
              <span
                className={`text-[11px] font-semibold uppercase tracking-tight ${
                  isToday
                    ? "text-red-600 dark:text-red-500 font-bold"
                    : "text-[#64748B] dark:text-[#94A3B8]"
                }`}
              >
                {day.label}
              </span>

              {isToday ? (
                <div className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm flex items-center justify-center shadow-sm transition-transform group-active:scale-95">
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : day.dayNumber}
                </div>
              ) : isCompleted ? (
                <div className="w-10 h-10 rounded-full border-2 border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-bold text-sm flex items-center justify-center transition-transform group-active:scale-95">
                  <Check size={15} strokeWidth={2.75} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full border-dashed border-2 border-slate-300 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-semibold text-sm flex items-center justify-center transition-transform group-hover:border-red-500/50 group-active:scale-95">
                  {day.dayNumber}
                </div>
              )}

              <span
                className={`text-[10px] leading-none h-3 flex items-center ${
                  isToday
                    ? "font-bold text-red-600 dark:text-red-500"
                    : isCompleted
                    ? "font-semibold text-red-500"
                    : "text-transparent select-none"
                }`}
              >
                {isToday ? "Hoy" : isCompleted ? "•" : "·"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 4. Bento Grid de Métricas (Racha, Tonelaje, Volumen) en fila de 3 cards
 */
function QuickMetricsBentoGrid({
  streakDays = 0,
  tonnageKg = 0,
  totalHours = 0,
  totalSets = 0,
  onOpenMetrics,
}) {
  const formattedHours =
    totalHours === 0
      ? "0h"
      : totalHours === 1
      ? "1h"
      : `${totalHours}h`;

  const formattedTonnage =
    tonnageKg >= 1000
      ? `${(tonnageKg / 1000).toFixed(1)} Tn`
      : tonnageKg > 0
      ? `${Math.round(tonnageKg)} kg`
      : "0.0 Tn";

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {/* Card 1: Racha */}
      <div
        onClick={onOpenMetrics}
        className="bg-[#FFFFFF] border border-[#F1F5F9] dark:bg-[#0E131F] dark:border-white/[0.07] rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[148px] relative overflow-hidden cursor-pointer hover:border-slate-200 dark:hover:border-white/15 transition-all active:scale-[0.99] group"
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center">
            <Flame size={20} strokeWidth={2.25} />
          </div>
          <ChevronRight size={18} className="text-[#64748B] dark:text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] block mb-0.5">
              Racha
            </span>
            <p className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-none">
              {streakDays} {streakDays === 1 ? "Día" : "Días"}
            </p>
          </div>

          {/* Mini sparkline chart SVG minimalista de tendencia */}
          <svg
            width="52"
            height="28"
            viewBox="0 0 64 32"
            fill="none"
            aria-hidden="true"
            className="flex-shrink-0"
          >
            <path
              d="M2 26 C12 25, 18 18, 26 20 C34 22, 42 10, 50 12 C56 13, 59 6, 62 4"
              stroke="#EF4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="62" cy="4" r="2.5" fill="#EF4444" />
          </svg>
        </div>
      </div>

      {/* Card 2: Tonelaje */}
      <div
        onClick={onOpenMetrics}
        className="bg-[#FFFFFF] border border-[#F1F5F9] dark:bg-[#0E131F] dark:border-white/[0.07] rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[148px] relative overflow-hidden cursor-pointer hover:border-slate-200 dark:hover:border-white/15 transition-all active:scale-[0.99] group"
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center">
            <TrendingUp size={20} strokeWidth={2.25} />
          </div>
          <ChevronRight size={18} className="text-[#64748B] dark:text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] block mb-0.5">
              Tonelaje
            </span>
            <p className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-none">
              {formattedTonnage}
            </p>
          </div>

          <svg
            width="44"
            height="28"
            viewBox="0 0 44 28"
            fill="none"
            aria-hidden="true"
            className="flex-shrink-0"
          >
            <path
              d="M2 22 L14 16 L24 20 L34 8 L42 4"
              stroke="#EF4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="42" cy="4" r="2.5" fill="#EF4444" />
          </svg>
        </div>
      </div>

      {/* Card 3: Volumen / Tiempo */}
      <div
        onClick={onOpenMetrics}
        className="bg-[#FFFFFF] border border-[#F1F5F9] dark:bg-[#0E131F] dark:border-white/[0.07] rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[148px] relative overflow-hidden cursor-pointer hover:border-slate-200 dark:hover:border-white/15 transition-all active:scale-[0.99] group"
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center">
            <Dumbbell size={20} strokeWidth={2.25} />
          </div>
          <ChevronRight size={18} className="text-[#64748B] dark:text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] block mb-0.5">
              Volumen
            </span>
            <p className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-none">
              {totalSets > 0 ? `${totalSets} Series` : formattedHours}
            </p>
          </div>

          {/* Mini gráfico de barras SVG vertical */}
          <svg
            width="42"
            height="30"
            viewBox="0 0 48 34"
            fill="none"
            aria-hidden="true"
            className="flex-shrink-0"
          >
            <rect x="2" y="18" width="6" height="14" rx="3" className="fill-red-100 dark:fill-red-950/80" />
            <rect x="12" y="12" width="6" height="20" rx="3" className="fill-red-200 dark:fill-red-900/70" />
            <rect x="22" y="16" width="6" height="16" rx="3" className="fill-red-300 dark:fill-red-800/80" />
            <rect x="32" y="6" width="6" height="26" rx="3" className="fill-red-600 dark:fill-red-500" />
            <rect x="42" y="10" width="6" height="22" rx="3" className="fill-red-400 dark:fill-red-600/80" />
          </svg>
        </div>
      </div>
    </section>
  );
}

/**
 * 5. Tarjeta Métricas Corporales
 */
function BodyMetricsCard({ weightKg, heightCm, onOpenBodyMetrics }) {
  const formattedWeight = Number(weightKg || 85).toFixed(1);
  const formattedHeight = Math.round(Number(heightCm || 180));

  return (
    <section
      onClick={onOpenBodyMetrics}
      className="bg-[#FFFFFF] border border-[#F1F5F9] dark:bg-[#0E131F] dark:border-white/[0.07] rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:border-slate-200 dark:hover:border-white/15 transition-all active:scale-[0.99]"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center flex-shrink-0">
          <Scale size={22} strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-base text-[#0F172A] dark:text-[#F8FAFC] truncate">
            Métricas corporales
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 truncate">
            Peso, tendencias
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          {formattedWeight}kg / {formattedHeight}cm
        </span>
        <ChevronRight size={18} className="text-[#64748B] dark:text-[#94A3B8]" />
      </div>
    </section>
  );
}

/**
 * 6. Tarjeta Acceso a Rutinas
 */
function RoutineQuickAccessCard({ onNavigateRoutines, onStartWorkout }) {
  return (
    <section className="bg-[#FFFFFF] border border-[#F1F5F9] dark:bg-[#0E131F] dark:border-white/[0.07] rounded-3xl p-5 shadow-sm space-y-4 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center shrink-0">
            <Layers size={20} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-base text-[#0F172A] dark:text-[#F8FAFC] truncate">
              Acceso a Rutinas
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 truncate">
              Planes y sesiones guiadas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateRoutines}
          className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>Ver todas</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={onNavigateRoutines}
          className="h-11 px-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-[#161B26] dark:hover:bg-[#1E2534] border border-slate-200/80 dark:border-white/5 text-[#0F172A] dark:text-[#F8FAFC] text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
        >
          <Layers size={14} className="text-red-500" />
          <span>Mis Rutinas</span>
        </button>
        <button
          type="button"
          onClick={onStartWorkout}
          className="h-11 px-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/20 transition active:scale-95 cursor-pointer"
        >
          <Play size={13} fill="currentColor" />
          <span>Entrenar</span>
        </button>
      </div>
    </section>
  );
}

export function HomeScreen({ currentUser }) {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualModalDate, setManualModalDate] = useState("");

  const loadHomeData = async () => {
    try {
      const [workoutsRes, profileRes] = await Promise.all([
        getWorkouts().catch(() => []),
        getProfile().catch(() => null),
        getMetricsSummary().catch(() => null),
      ]);
      if (Array.isArray(workoutsRes)) {
        setWorkouts(workoutsRes);
      }
      if (profileRes && typeof profileRes === "object") {
        setProfile(profileRes);
      }
    } catch (err) {
      console.warn("Error cargando HomeScreen:", err);
    }
  };

  useEffect(() => {
    loadHomeData();

    const handleRefresh = () => loadHomeData();
    window.addEventListener("fittracker:workoutFinished", handleRefresh);
    window.addEventListener("fittracker:workoutDeleted", handleRefresh);
    window.addEventListener("fittracker:workoutSaved", handleRefresh);
    window.addEventListener("fittracker:workoutUpdated", handleRefresh);
    window.addEventListener("fittracker:profileChanged", handleRefresh);

    return () => {
      window.removeEventListener("fittracker:workoutFinished", handleRefresh);
      window.removeEventListener("fittracker:workoutDeleted", handleRefresh);
      window.removeEventListener("fittracker:workoutSaved", handleRefresh);
      window.removeEventListener("fittracker:workoutUpdated", handleRefresh);
      window.removeEventListener("fittracker:profileChanged", handleRefresh);
    };
  }, []);

  // Fechas con entrenamientos completados
  const completedDatesSet = useMemo(() => {
    const set = new Set();
    workouts.forEach((w) => {
      const rawDate = w?.date || w?.workout_date || w?.created_at;
      const parsed = parseDateSafe(rawDate);
      if (parsed) {
        set.add(getLocalDateString(parsed));
      }
    });
    return set;
  }, [workouts]);

  // Días de la semana actual (lun - dom)
  const weekDays = useMemo(
    () => getCurrentWeekDays(completedDatesSet),
    [completedDatesSet]
  );

  // Sesiones únicas completadas lun-dom en la semana actual
  const workoutsThisWeek = useMemo(
    () => weekDays.filter((d) => d.isCompleted),
    [weekDays]
  );

  // Estado o modelo de usuario (UserProfile / UserPreferences) con fallback a 4 días
  const user = useMemo(() => {
    const baseUser = profile || currentUser || {};
    return {
      weeklyGoalDays:
        baseUser?.weeklyGoalDays ??
        baseUser?.weekly_goal_days ??
        WEEKLY_GOAL_TARGET,
      ...baseUser,
    };
  }, [profile, currentUser]);

  // Cálculo dinámico del widget según especificación (4 días semanales)
  const targetDays = user?.weeklyGoalDays || WEEKLY_GOAL_TARGET;
  const completedDays = workoutsThisWeek.length; // Sesiones únicas completadas lun-dom
  const remainingDays = Math.max(0, targetDays - completedDays);
  const progressPercentage = Math.min(
    100,
    Math.round((completedDays / targetDays) * 100)
  );
  const completedThisWeek = completedDays;

  // Racha de días entrenando
  const streakDays = useMemo(
    () => calculateStreakDays(completedDatesSet),
    [completedDatesSet]
  );

  // Horas estimadas de entrenamiento en la semana actual
  const totalHoursThisWeek = useMemo(() => {
    if (!workouts.length) return 0;
    const weekKeys = new Set(weekDays.map((d) => d.key));
    let totalMinutes = 0;

    workouts.forEach((w) => {
      const parsed = parseDateSafe(w?.date || w?.workout_date || w?.created_at);
      if (!parsed) return;
      const dateStr = getLocalDateString(parsed);
      if (weekKeys.has(dateStr)) {
        const durMin = Number(w?.duration_minutes || w?.duration || 60);
        totalMinutes += durMin > 0 ? durMin : 60;
      }
    });

    return Math.round(totalMinutes / 60);
  }, [workouts, weekDays]);

  // Tonelaje y series estimadas de la semana
  const { totalTonnageKg, totalSetsThisWeek } = useMemo(() => {
    let tonnage = 0;
    let sets = 0;
    const weekKeys = new Set(weekDays.map((d) => d.key));
    (workouts || []).forEach((w) => {
      const parsed = parseDateSafe(w?.date || w?.workout_date || w?.created_at);
      if (!parsed) return;
      const dateStr = getLocalDateString(parsed);
      const isThisWeek = weekKeys.has(dateStr);
      (w?.sets || []).forEach((s) => {
        if (s?.completed !== false) {
          const wKg = parseFloat(s?.weight) || 0;
          const r = parseInt(s?.reps, 10) || 0;
          if (isThisWeek) {
            tonnage += wKg * r;
            sets += 1;
          }
        }
      });
    });

    // Fallback: si aún no hay series registradas esta semana, calcular de los últimos entrenamientos para visualización
    if (tonnage === 0 && Array.isArray(workouts) && workouts.length > 0) {
      workouts.slice(0, 5).forEach((w) => {
        (w?.sets || []).forEach((s) => {
          if (s?.completed !== false) {
            const wKg = parseFloat(s?.weight) || 0;
            const r = parseInt(s?.reps, 10) || 0;
            tonnage += wKg * r;
            sets += 1;
          }
        });
      });
    }

    return { totalTonnageKg: tonnage, totalSetsThisWeek: sets };
  }, [workouts, weekDays]);

  // Fecha formateada para el header superior
  const formattedToday = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date());
    } catch {
      return "Hoy";
    }
  }, []);

  const weightKg =
    profile?.bodyweight ?? currentUser?.bodyweight ?? 85.0;
  const heightCm =
    profile?.height ?? currentUser?.height ?? 180;

  const handleOpenBodyMetrics = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fittracker:openCheckIn"));
    }
  };

  return (
    <div className="w-full pb-6 select-none">
      {/* Grid responsivo dual: 1 columna en mobile, 12 columnas en desktop (8 + 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
        {/* Columna Izquierda (8 cols en desktop): Bienvenida, Días semanal, Bento 3 métricas */}
        <div className="space-y-5 lg:col-span-8 flex flex-col justify-start">
          {/* 1. Header de Bienvenida */}
          <HomeHeader
            formattedDate={formattedToday}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onStartWorkout={() => navigate("/workouts")}
            onOpenManualWorkout={() => {
              setManualModalDate("");
              setIsManualModalOpen(true);
            }}
          />

          {/* 2. Selector Semanal de Días Expandido Horizontalmente */}
          <WeeklyDayStrip
            weekDays={weekDays}
            onSelectDay={(day) => {
              if (day?.isCompleted) {
                setIsHistoryOpen(true);
              } else if (day?.key) {
                setManualModalDate(day.key);
                setIsManualModalOpen(true);
              } else {
                setIsHistoryOpen(true);
              }
            }}
          />

          {/* 3. Bento de Métricas en fila de 3 cards (Racha, Tonelaje, Volumen) */}
          <QuickMetricsBentoGrid
            streakDays={streakDays}
            tonnageKg={totalTonnageKg}
            totalHours={totalHoursThisWeek}
            totalSets={totalSetsThisWeek}
            onOpenMetrics={() => navigate("/records")}
          />
        </div>

        {/* Columna Derecha (4 cols en desktop): Widget Metas Semanales, Métricas Corporales, Acceso a Rutinas */}
        <div className="space-y-5 lg:col-span-4 flex flex-col justify-start">
          {/* 4. Widget de Metas Semanales (anillo circular 0/4) */}
          <WeeklyGoalsCard
            user={user}
            targetDays={targetDays}
            completedDays={completedDays}
            remainingDays={remainingDays}
            progressPercentage={progressPercentage}
            completedCount={completedDays}
            targetCount={targetDays}
            onClick={() => navigate("/train")}
          />

          {/* 5. Tarjeta Estadísticas Corporales */}
          <BodyMetricsCard
            weightKg={weightKg}
            heightCm={heightCm}
            onOpenBodyMetrics={handleOpenBodyMetrics}
          />

          {/* 6. Acceso a Rutinas */}
          <RoutineQuickAccessCard
            onNavigateRoutines={() => navigate("/routines")}
            onStartWorkout={() => navigate("/workouts")}
          />
        </div>
      </div>

      {/* Modal de Historial */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onWorkoutDeleted={() => loadHomeData()}
        onSessionUpdated={() => loadHomeData()}
      />

      {/* Modal de Registro Manual Retroactivo */}
      <ManualWorkoutLogModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        initialDate={manualModalDate}
        onSaved={() => loadHomeData()}
      />
    </div>
  );
}

export default function Dashboard(props) {
  return <HomeScreen {...props} />;
}
