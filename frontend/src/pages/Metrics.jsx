import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronRight,
  Dumbbell,
  Flame,
  Layers,
  Loader2,
  PieChart,
  Scale,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import {
  getMuscleDistribution,
  getProfile,
  getRecords,
  getUserProfile,
  getWorkouts,
} from "../api/client";
import ExerciseProgressCard from "../components/ExerciseProgressCard";
import HeavyDutyRecoveryBanner from "../components/HeavyDutyRecoveryBanner";
import Header from "../components/Header";
import { getLocalDateString, parseDateSafe } from "../utils/dateUtils";
import { getStrengthRank } from "../utils/strengthRanks";
import { getHeavyDutyRecoveryStatus } from "../utils/routines";

const MUSCLE_GROUPS = [
  "Todos",
  "Pecho",
  "Espalda",
  "Piernas",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Core",
];

// Paleta degradada sólida oficial para los 7 grupos canónicos
const CANONICAL_CONFIG = [
  { key: "Pecho", label: "Pecho", color: "#FF5722" },
  { key: "Espalda", label: "Espalda", color: "#C84218" },
  { key: "Piernas", label: "Piernas", color: "#9C27B0" },
  { key: "Hombros", label: "Hombros", color: "#7C4DFF" },
  { key: "Bíceps", label: "Bíceps", color: "#00BCD4" },
  { key: "Tríceps", label: "Tríceps", color: "#3F51B5" },
  { key: "Core", label: "Core", color: "#4CAF50" },
];

function matchMuscle(name = "", muscleGroup = "") {
  const combined = `${name || ""} ${muscleGroup || ""}`.toLowerCase();
  if (combined.includes("pecho") || combined.includes("chest") || combined.includes("banca") || combined.includes("pec")) return "Pecho";
  if (combined.includes("espalda") || combined.includes("back") || combined.includes("remo") || combined.includes("jalón") || combined.includes("jalon") || combined.includes("dominada") || combined.includes("pulldown") || combined.includes("dorsal")) return "Espalda";
  if (combined.includes("pierna") || combined.includes("leg") || combined.includes("sentadilla") || combined.includes("squat") || combined.includes("prensa") || combined.includes("femoral") || combined.includes("cuádriceps") || combined.includes("cuadriceps") || combined.includes("gemelo") || combined.includes("hack") || combined.includes("hip thrust") || combined.includes("aductor") || combined.includes("abductor")) return "Piernas";
  if (combined.includes("hombro") || combined.includes("shoulder") || combined.includes("militar") || combined.includes("deltoid") || combined.includes("lateral") || combined.includes("pájaro") || combined.includes("pajaro")) return "Hombros";
  if (combined.includes("tríceps") || combined.includes("triceps") || combined.includes("francés") || combined.includes("frances") || combined.includes("cuerda") || combined.includes("fondos") || combined.includes("pushdown") || combined.includes("patada")) return "Tríceps";
  if (combined.includes("bíceps") || combined.includes("biceps") || combined.includes("curl") || combined.includes("martillo") || combined.includes("predicador")) return "Bíceps";
  if (combined.includes("core") || combined.includes("abs") || combined.includes("abdom") || combined.includes("plancha") || combined.includes("crunch") || combined.includes("lumbar")) return "Core";
  return "Pecho";
}

export default function Metrics({ currentUser }) {
  const navigate = useNavigate();

  // -------------------------------------------------------------
  // 1. ELEVACIÓN TOTAL DE HOOKS: ESTADOS (useState)
  // Inicialización defensiva ante BD con 0 registros
  // -------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [muscleDistApi, setMuscleDistApi] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("Todos");

  // -------------------------------------------------------------
  // 2. ELEVACIÓN TOTAL DE HOOKS: CALLBACKS (useCallback)
  // -------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recs, wList, dist] = await Promise.all([
        getRecords().catch(() => []),
        getWorkouts().catch(() => []),
        getMuscleDistribution().catch(() => null),
      ]);
      setRecords(
        Array.isArray(recs)
          ? recs
          : recs && typeof recs === "object"
          ? Object.values(recs)
          : []
      );
      setWorkouts(
        Array.isArray(wList)
          ? wList
          : wList && typeof wList === "object"
          ? Object.values(wList)
          : []
      );
      if (dist) {
        setMuscleDistApi(dist);
      }
    } catch (err) {
      console.error("Error cargando métricas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // -------------------------------------------------------------
  // 3. ELEVACIÓN TOTAL DE HOOKS: MEMOS (useMemo)
  // -------------------------------------------------------------
  const heavyDutyRecovery = useMemo(
    () => getHeavyDutyRecoveryStatus(workouts),
    [workouts]
  );

  // WIDGET 1: RESUMEN DEL MES
  const monthSummary = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const activeDatesThisMonth = new Set();
    let monthVolume = 0;
    let monthSets = 0;

    (workouts || []).forEach((w) => {
      if (!w?.date) return;
      const parsed = parseDateSafe(w.date);
      if (!parsed) return;
      if (parsed.getFullYear() === currentYear && parsed.getMonth() === currentMonth) {
        activeDatesThisMonth.add(w.date);
        (w.sets || []).forEach((s) => {
          if (s?.completed !== false && !["warmup", "W"].includes(s?.set_type || "normal")) {
            monthSets += 1;
            monthVolume += (parseFloat(s?.weight) || 0) * (parseInt(s?.reps, 10) || 0);
          }
        });
      }
    });

    const activeDaysCount = activeDatesThisMonth.size;
    const monthlyTarget = 16;
    const progressPct = Math.min(100, Math.round((activeDaysCount / monthlyTarget) * 100));

    return {
      monthName: monthNames[currentMonth] || "Mes actual",
      activeDaysCount,
      monthlyTarget,
      progressPct,
      monthVolume: Math.round(monthVolume),
      monthSets,
    };
  }, [workouts]);

  // WIDGET 2: VOLUMEN SEMANAL (Lunes a Domingo)
  const weeklyVolumeData = useMemo(() => {
    const now = new Date();
    const currentDayIdx = (now.getDay() + 6) % 7; // 0=L, 1=M, ... 6=D
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayIdx);
    monday.setHours(0, 0, 0, 0);

    const dayLabels = ["L", "M", "X", "J", "V", "S", "D"];
    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    let maxVol = 1;
    let totalWeeklyVolume = 0;

    const days = dayLabels.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = getLocalDateString(d);
      const isToday = idx === currentDayIdx;

      let dayVol = 0;
      let setsCount = 0;

      (workouts || []).forEach((w) => {
        if (w?.date === dateStr) {
          (w.sets || []).forEach((s) => {
            if (s?.completed !== false && !["warmup", "W"].includes(s?.set_type || "normal")) {
              dayVol += (parseFloat(s?.weight) || 0) * (parseInt(s?.reps, 10) || 0);
              setsCount += 1;
            }
          });
        }
      });

      totalWeeklyVolume += dayVol;
      if (dayVol > maxVol) maxVol = dayVol;

      return {
        label,
        fullName: dayNames[idx],
        date: dateStr,
        volume: Math.round(dayVol),
        setsCount,
        isToday,
      };
    });

    return {
      days,
      maxVol,
      totalWeeklyVolume: Math.round(totalWeeklyVolume),
    };
  }, [workouts]);

  // COMPONENTE: DISTRIBUCIÓN MUSCULAR (Torta / Dona SVG)
  const muscleDistributionData = useMemo(() => {
    if (muscleDistApi && Array.isArray(muscleDistApi.distribution) && muscleDistApi.total_sets > 0) {
      const distMap = {};
      muscleDistApi.distribution.forEach((d) => {
        if (d?.muscle_group) {
          distMap[d.muscle_group] = d;
        }
      });

      const items = CANONICAL_CONFIG.map((cfg) => {
        const found = distMap[cfg.key] || { set_count: 0, percentage: 0, volume: 0 };
        return {
          key: cfg.key,
          label: cfg.label,
          color: cfg.color,
          setCount: found.set_count || 0,
          percentage: found.percentage || 0,
          volume: Math.round(found.volume || 0),
        };
      });

      const sorted = [...items].sort((a, b) => b.setCount - a.setCount);
      const top = sorted[0]?.setCount > 0 ? sorted[0] : null;

      return {
        totalSets: muscleDistApi.total_sets,
        items,
        sortedItems: sorted,
        topMuscle: top,
      };
    }

    // Fallback con datos calculados localmente
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const counts = { Pecho: 0, Espalda: 0, Piernas: 0, Hombros: 0, Bíceps: 0, Tríceps: 0, Core: 0 };
    const vols = { Pecho: 0, Espalda: 0, Piernas: 0, Hombros: 0, Bíceps: 0, Tríceps: 0, Core: 0 };

    (workouts || []).forEach((w) => {
      if (!w?.date) return;
      const parsed = parseDateSafe(w.date);
      if (!parsed || parsed.getTime() < thirtyDaysAgo) return;

      (w.sets || []).forEach((s) => {
        if (s?.completed !== false && !["warmup", "W"].includes(s?.set_type || "normal")) {
          const group = matchMuscle(s?.exercise_name || "", w?.muscle_group_name || "");
          counts[group] = (counts[group] || 0) + 1;
          const wgt = parseFloat(s?.weight) || 0;
          const rep = parseInt(s?.reps, 10) || 0;
          vols[group] = (vols[group] || 0) + wgt * rep;
        }
      });
    });

    const totalSets = Object.values(counts).reduce((a, b) => a + b, 0);

    const items = CANONICAL_CONFIG.map((cfg) => {
      const cnt = counts[cfg.key] || 0;
      const pct = totalSets > 0 ? Math.round((cnt / totalSets) * 1000) / 10 : 0;
      return {
        key: cfg.key,
        label: cfg.label,
        color: cfg.color,
        setCount: cnt,
        percentage: pct,
        volume: Math.round(vols[cfg.key] || 0),
      };
    });

    const sorted = [...items].sort((a, b) => b.setCount - a.setCount);
    const top = sorted[0]?.setCount > 0 ? sorted[0] : null;

    return {
      totalSets,
      items,
      sortedItems: sorted,
      topMuscle: top,
    };
  }, [muscleDistApi, workouts]);

  // Cálculo geométrico de los arcos del Donut SVG
  const donutSlices = useMemo(() => {
    const circumference = 2 * Math.PI * 64; // ~402.12
    const items = muscleDistributionData?.items || [];
    const itemsWithSets = items.filter((i) => (i?.percentage || 0) > 0);
    const hasMultiple = itemsWithSets.length > 1;

    let currentAccumulated = 0;
    return items.map((item) => {
      const pct = item?.percentage || 0;
      const dashLength = (pct / 100) * circumference;
      const gap = hasMultiple && dashLength > 3 ? 2 : 0;
      const strokeDasharray = `${Math.max(0, dashLength - gap)} ${circumference}`;
      const strokeDashoffset = -((currentAccumulated / 100) * circumference);
      currentAccumulated += pct;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [muscleDistributionData]);

  // WIDGET DE BALANCE MUSCULAR: Volumen total movido en últimos 30 días entre grupos musculares
  const muscleVolumeBalance = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const vols = { Pecho: 0, Espalda: 0, Piernas: 0, Hombros: 0, Bíceps: 0, Tríceps: 0, Core: 0 };
    let totalVol = 0;

    (workouts || []).forEach((w) => {
      if (!w?.date) return;
      const parsed = parseDateSafe(w.date);
      if (!parsed || parsed.getTime() < thirtyDaysAgo) return;

      (w.sets || []).forEach((s) => {
        if (s?.completed !== false && !["warmup", "W"].includes(s?.set_type || "normal")) {
          const group = matchMuscle(s?.exercise_name || "", w?.muscle_group_name || "");
          const wgt = parseFloat(s?.weight) || 0;
          const rep = parseInt(s?.reps, 10) || 0;
          const v = wgt * rep;
          vols[group] = (vols[group] || 0) + v;
          totalVol += v;
        }
      });
    });

    const groups = CANONICAL_CONFIG.map((cfg) => {
      const v = vols[cfg.key] || 0;
      const pct = totalVol > 0 ? Math.round((v / totalVol) * 1000) / 10 : 0;
      return {
        key: cfg.key,
        label: cfg.label,
        color: cfg.color,
        volume: Math.round(v),
        percentage: pct,
      };
    });

    const sorted = [...groups].sort((a, b) => b.volume - a.volume);
    const leader = sorted[0]?.volume > 0 ? sorted[0] : null;
    const lagging = sorted[sorted.length - 1];

    return {
      totalVolume: Math.round(totalVol),
      groups,
      sorted,
      leader,
      lagging,
      hasData: totalVol > 0,
    };
  }, [workouts]);

  // Lista de Récords y Evolución de Ejercicios
  const exercisesEvolution = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const recsList = Array.isArray(records)
      ? records
      : records && typeof records === "object"
      ? Object.values(records)
      : [];
    return recsList
      .filter((r) => {
        if (!r) return false;
        const name = (r.exercise_name || "").toLowerCase();
        const mg = (r.muscle_group || r.muscle_group_name || "").toLowerCase();
        const matchSearch = !q || name.includes(q) || mg.includes(q);
        let matchMuscleFilter = true;
        if (selectedMuscle !== "Todos") {
          matchMuscleFilter = mg.includes(selectedMuscle.toLowerCase());
        }
        return matchSearch && matchMuscleFilter;
      })
      .sort((a, b) => (parseFloat(b.best_estimated_1rm) || 0) - (parseFloat(a.best_estimated_1rm) || 0));
  }, [records, search, selectedMuscle]);

  // -------------------------------------------------------------
  // 4. ELEVACIÓN TOTAL DE HOOKS: EFECTOS (useEffect)
  // -------------------------------------------------------------
  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------
  // 5. RETORNOS CONDICIONALES (SOLO DESPUÉS DE TODOS LOS HOOKS)
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-[#FF5722] select-none">
        <Loader2 size={36} className="animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-[#8E8E93]">
          Cargando tus métricas...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md sm:max-w-3xl mx-auto space-y-5 pb-24 select-none px-2 sm:px-0">
      {/* Header */}
      <Header
        title="Métricas"
        subtitle="Rendimiento, volumen y progreso estilo Hevy"
      />

      {/* Contador de Días de Recuperación / Descanso Sistémico Post-Heavy Duty */}
      <HeavyDutyRecoveryBanner
        recoveryStatus={heavyDutyRecovery}
        onStartRoutine={() => navigate("/routines")}
      />

      {/* WIDGET 1: RESUMEN DEL MES */}
      <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white font-bold">
              <Calendar size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Resumen del Mes
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {monthSummary.monthName}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-2.5 py-1 text-xs font-bold text-[#FF8A65]">
              <Flame size={12} />
              <span>{monthSummary.progressPct}% meta</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3.5 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] block">
              Entrenamientos
            </span>
            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {monthSummary.activeDaysCount}
              </span>
              <span className="text-xs font-semibold text-[#8E8E93]">
                / {monthSummary.monthlyTarget}
              </span>
            </div>
            <span className="text-[10px] text-[#8E8E93] block mt-0.5">días este mes</span>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3.5 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] block">
              Volumen Mensual
            </span>
            <div className="mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-[#FF8A65]">
                {monthSummary.monthVolume.toLocaleString("es-ES")}
              </span>
            </div>
            <span className="text-[10px] text-[#8E8E93] block mt-0.5">kg movidos</span>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3.5 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] block">
              Series Totales
            </span>
            <div className="mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-white">
                {monthSummary.monthSets}
              </span>
            </div>
            <span className="text-[10px] text-[#8E8E93] block mt-0.5">series registradas</span>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-[#8E8E93]">
            <span>Progreso hacia tu meta ({monthSummary.monthlyTarget} sesiones)</span>
            <span className="font-bold text-white">
              {monthSummary.activeDaysCount} de {monthSummary.monthlyTarget} días
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#1C1C1E] border border-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] transition-all duration-500"
              style={{ width: `${monthSummary.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* WIDGET 2: VOLUMEN SEMANAL */}
      <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white font-bold">
              <TrendingUp size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Volumen Semanal
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {weeklyVolumeData.totalWeeklyVolume.toLocaleString("es-ES")} kg
              </h3>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#8E8E93]">
            Esta semana
          </span>
        </div>

        <div className="pt-3 pb-1">
          <div className="grid grid-cols-7 gap-2 items-end h-36 sm:h-40 px-1">
            {(weeklyVolumeData.days || []).map((day) => {
              const heightPct =
                (day?.volume || 0) > 0
                  ? Math.max(15, Math.round(((day.volume || 0) / weeklyVolumeData.maxVol) * 100))
                  : 6;

              return (
                <div key={day.label} className="flex flex-col items-center justify-end h-full gap-1.5 group">
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold truncate transition-opacity ${
                      (day?.volume || 0) > 0
                        ? "text-[#FF8A65]"
                        : "text-transparent group-hover:text-[#8E8E93]"
                    }`}
                  >
                    {(day?.volume || 0) > 999
                      ? `${((day.volume || 0) / 1000).toFixed(1)}k`
                      : (day?.volume || 0) > 0
                      ? day.volume
                      : "0"}
                  </span>

                  <div className="w-full max-w-[32px] sm:max-w-[40px] h-full flex items-end">
                    <div
                      className={`w-full rounded-t-xl transition-all duration-300 ${
                        (day?.volume || 0) > 0
                          ? "bg-gradient-to-t from-[#FF5722] to-[#7C4DFF] shadow-lg shadow-[#FF5722]/15"
                          : "bg-[#1C1C1E] border-t border-white/5"
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${day.fullName}: ${(day?.volume || 0).toLocaleString("es-ES")} kg (${day?.setsCount || 0} series)`}
                    />
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className={`text-xs font-bold ${
                        day.isToday
                          ? "text-[#FF5722]"
                          : (day?.volume || 0) > 0
                          ? "text-white"
                          : "text-[#8E8E93]"
                      }`}
                    >
                      {day.label}
                    </span>
                    {day.isToday && (
                      <span className="h-1 w-1 rounded-full bg-[#FF5722]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8E8E93] pt-1 border-t border-white/5">
          <span>Lunes a Domingo</span>
          <span>Días activos con carga</span>
        </div>
      </div>

      {/* WIDGET DE BALANCE MUSCULAR (ÚLTIMOS 30 DÍAS) */}
      <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C2C2E] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white font-bold flex-shrink-0">
              <Scale size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Balance Muscular (30 días)
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Distribución Cuantitativa de Volumen
              </h3>
            </div>
          </div>

          <span className="rounded-full border border-white/10 bg-[#050505] px-3 py-1 text-xs font-mono font-bold text-[#8E8E93] self-start sm:self-auto">
            {muscleVolumeBalance.totalVolume.toLocaleString("es-ES")} kg totales
          </span>
        </div>

        {/* Indicador conciso: "Grupo líder: [Músculo] (X%) | Rezagado: [Músculo] (Y%)" */}
        <div className="rounded-2xl border border-[#2C2C2E] bg-[#050505] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          {muscleVolumeBalance.hasData && muscleVolumeBalance.leader ? (
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap text-xs sm:text-sm font-bold text-white w-full sm:w-auto">
              <span>Grupo líder:</span>
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 border"
                style={{
                  borderColor: `${muscleVolumeBalance.leader.color}50`,
                  backgroundColor: `${muscleVolumeBalance.leader.color}15`,
                  color: muscleVolumeBalance.leader.color,
                }}
              >
                {muscleVolumeBalance.leader.label} ({muscleVolumeBalance.leader.percentage}%)
              </span>
              <span className="text-[#8E8E93] mx-1">|</span>
              <span className="text-[#8E8E93]">Rezagado:</span>
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 border"
                style={{
                  borderColor: `${muscleVolumeBalance.lagging.color}50`,
                  backgroundColor: `${muscleVolumeBalance.lagging.color}15`,
                  color: muscleVolumeBalance.lagging.color,
                }}
              >
                {muscleVolumeBalance.lagging.label} ({muscleVolumeBalance.lagging.percentage}%)
              </span>
            </div>
          ) : (
            <div className="text-xs text-[#8E8E93] w-full text-center py-1">
              Sin volumen registrado en los últimos 30 días para evaluar el balance muscular.
            </div>
          )}

          {muscleVolumeBalance.hasData && (
            <span className="text-[11px] font-semibold text-[#8E8E93] whitespace-nowrap">
              {muscleVolumeBalance.sorted.filter((g) => g.volume > 0).length} de 6 grupos estimulados
            </span>
          )}
        </div>

        {/* Barras de distribución por grupo muscular */}
        {muscleVolumeBalance.hasData && (
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {muscleVolumeBalance.sorted.map((item) => (
                <div
                  key={item.key}
                  className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                    </span>
                    <span className="font-mono font-bold text-white">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#050505] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#8E8E93]">
                    <span>{item.volume.toLocaleString("es-ES")} kg</span>
                    {item.key === muscleVolumeBalance.leader?.key && (
                      <span className="text-[#FF5722] font-bold">Líder</span>
                    )}
                    {item.key === muscleVolumeBalance.lagging?.key &&
                      item.volume < (muscleVolumeBalance.leader?.volume || 0) && (
                        <span className="text-amber-400 font-medium">Rezagado</span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* COMPONENTE: DISTRIBUCIÓN MUSCULAR */}
      <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white font-bold">
              <PieChart size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Distribución Muscular
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Series Efectivas (30 días)
              </h3>
            </div>
          </div>

          <span className="rounded-full border border-white/10 bg-[#1C1C1E] px-3 py-1 text-xs font-bold text-[#8E8E93]">
            {muscleDistributionData.totalSets} series
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full overflow-visible"
            >
              <g transform="rotate(-90 100 100)">
                <circle
                  cx="100"
                  cy="100"
                  r="64"
                  stroke="#1C1C1E"
                  strokeWidth="24"
                  fill="transparent"
                />

                {(donutSlices || []).map(
                  (slice) =>
                    (slice?.percentage || 0) > 0 && (
                      <circle
                        key={slice.key}
                        cx="100"
                        cy="100"
                        r="64"
                        stroke={slice.color}
                        strokeWidth="24"
                        fill="transparent"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        strokeLinecap="butt"
                        className="transition-all duration-700 ease-out"
                      />
                    )
                )}
              </g>

              {muscleDistributionData.topMuscle ? (
                <>
                  <text
                    x="100"
                    y="93"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="22"
                    fontWeight="800"
                    className="font-sans"
                  >
                    {muscleDistributionData.topMuscle.percentage}%
                  </text>
                  <text
                    x="100"
                    y="112"
                    textAnchor="middle"
                    fill="#FF8A65"
                    fontSize="13"
                    fontWeight="700"
                    className="font-sans uppercase tracking-wider"
                  >
                    {muscleDistributionData.topMuscle.label}
                  </text>
                  <text
                    x="100"
                    y="126"
                    textAnchor="middle"
                    fill="#8E8E93"
                    fontSize="9"
                    fontWeight="500"
                    className="font-sans"
                  >
                    más trabajado
                  </text>
                </>
              ) : (
                <>
                  <text
                    x="100"
                    y="102"
                    textAnchor="middle"
                    fill="#8E8E93"
                    fontSize="13"
                    fontWeight="700"
                    className="font-sans"
                  >
                    Sin series
                  </text>
                  <text
                    x="100"
                    y="118"
                    textAnchor="middle"
                    fill="#636366"
                    fontSize="9"
                    fontWeight="500"
                    className="font-sans"
                  >
                    en 30 días
                  </text>
                </>
              )}
            </svg>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] block">
            Leyenda de Grupos Musculares
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(muscleDistributionData.sortedItems || []).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#1C1C1E] px-3 py-2.5 hover:border-white/10 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-white truncate">
                    {item.label}
                  </span>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-xs font-bold text-[#FF8A65] block">
                    {item.percentage}%
                  </span>
                  <span className="text-[10px] text-[#8E8E93] block">
                    {item.setCount} series
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COMPONENTE 2: CURVA DE SUPERACIÓN POR EJERCICIO */}
      <ExerciseProgressCard />


      {/* SECCIÓN RÉCORDS PERSONALES Y 1RM ESTIMADO */}
      <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2C2E] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white font-bold">
              <Trophy size={18} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Récords Personales
              </h2>
              <p className="text-xs text-[#8E8E93] mt-0.5">
                Mejores marcas y 1RM estimado por ejercicio
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-60">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ejercicio..."
              className="w-full min-h-[38px] rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] pl-9 pr-3 text-xs text-white placeholder:text-[#8E8E93] outline-none focus:border-[#FF5722]"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              type="button"
              onClick={() => setSelectedMuscle(mg)}
              className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedMuscle === mg
                  ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                  : "border border-white/5 bg-[#1C1C1E] text-[#8E8E93] hover:text-white"
              }`}
            >
              {mg}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 pt-1">
          {exercisesEvolution.length > 0 ? (
            exercisesEvolution.map((ex) => {
              const hasRecords = Boolean(ex?.pr_weight && ex.pr_weight > 0);
              const rank = hasRecords
                ? getStrengthRank(ex?.exercise_name || "", ex.pr_weight, ex?.pr_reps || 1)
                : null;
              return (
                <div
                  key={ex?.exercise_id || ex?.id || Math.random()}
                  className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-4 flex items-center justify-between gap-3 hover:border-white/10 transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">
                        {ex?.exercise_name || "Ejercicio"}
                      </span>
                      {rank && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rank?.badgeColor || rank?.badgeClass || ""}`}>
                          {rank?.name || rank?.rankName || "Liga Bronce"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8E8E93]">
                      PR actual:{" "}
                      {hasRecords ? (
                        <strong className="text-white font-semibold">
                          {ex.pr_weight} kg × {ex?.pr_reps || 0} reps
                        </strong>
                      ) : (
                        <span className="text-[#8E8E93] font-medium">
                          Sin registros aún (-- kg)
                        </span>
                      )}
                      {hasRecords && ex?.pr_date && ` • ${ex.pr_date}`}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-[#8E8E93] block">1RM Est.</span>
                    <span className="text-base sm:text-lg font-extrabold text-[#FF8A65]">
                      {hasRecords && parseFloat(ex?.best_estimated_1rm) > 0
                        ? `${Math.round(parseFloat(ex.best_estimated_1rm))} kg`
                        : "-- kg"}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-8 text-center text-xs text-[#8E8E93]">
              No se encontraron récords registrados para este filtro.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
