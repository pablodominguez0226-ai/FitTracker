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
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import {
  getMetricsSummary,
  getMuscleDistribution,
  getRecords,
  getWorkouts,
} from "../api/client";
import ExerciseProgressCard from "../components/ExerciseProgressCard";
import Header from "../components/Header";
import HistoryModal from "../components/HistoryModal";
import { getLocalDateString, parseDateSafe } from "../utils/dateUtils";
import { getStrengthRank } from "../utils/strengthRanks";

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

// Paleta sólida para los 6 grupos canónicos del Radar
const CANONICAL_CONFIG = [
  { key: "Piernas", label: "Piernas", color: "#06B6D4" },
  { key: "Espalda", label: "Espalda", color: "#EF4444" },
  { key: "Pecho", label: "Pecho", color: "#EF4444" },
  { key: "Hombros", label: "Hombros", color: "#F59E0B" },
  { key: "Brazos", label: "Brazos", color: "#6366F1" },
  { key: "Core", label: "Core", color: "#EF4444" },
];

function matchMuscle(name = "", muscleGroup = "") {
  const mg = String(muscleGroup || "").trim().toLowerCase();
  if (mg) {
    if (mg.includes("pierna") || mg.includes("cuádriceps") || mg.includes("cuadriceps") || mg.includes("femoral") || mg.includes("isquio") || mg.includes("glúteo") || mg.includes("gluteo") || mg.includes("gemelo")) return "Piernas";
    if (mg.includes("espalda") || mg.includes("dorsal") || mg.includes("trapecio")) return "Espalda";
    if (mg.includes("pecho") || mg.includes("pectoral")) return "Pecho";
    if (mg.includes("hombro") || mg.includes("deltoid")) return "Hombros";
    if (mg.includes("brazo") || mg.includes("bíceps") || mg.includes("biceps") || mg.includes("bicep") || mg.includes("tríceps") || mg.includes("triceps") || mg.includes("tricep")) return "Brazos";
    if (mg.includes("core") || mg.includes("abdom") || mg.includes("lumbar")) return "Core";
  }
  const ex = String(name || "").trim().toLowerCase();
  if (!ex) return null;
  if (ex.includes("tríceps") || ex.includes("triceps") || ex.includes("tricep") || ex.includes("francés") || ex.includes("frances") || ex.includes("pushdown") || ex.includes("patada") || ex.includes("katana") || ex.includes("bíceps") || ex.includes("biceps") || ex.includes("bicep") || ex.includes("curl") || ex.includes("martillo") || ex.includes("predicador")) return "Brazos";
  if (ex.includes("pierna") || ex.includes("leg") || ex.includes("sentadilla") || ex.includes("squat") || ex.includes("prensa") || ex.includes("femoral") || ex.includes("isquio") || ex.includes("cuádriceps") || ex.includes("cuadriceps") || ex.includes("gemelo") || ex.includes("hack") || ex.includes("hip thrust") || ex.includes("aductor") || ex.includes("abductor")) return "Piernas";
  if (ex.includes("espalda") || ex.includes("back") || ex.includes("remo") || ex.includes("jalón") || ex.includes("jalon") || ex.includes("dominada") || ex.includes("pulldown") || ex.includes("dorsal") || ex.includes("pullover") || ex.includes("pull over")) return "Espalda";
  if (ex.includes("hombro") || ex.includes("shoulder") || ex.includes("militar") || ex.includes("deltoid") || ex.includes("lateral") || ex.includes("pájaro") || ex.includes("pajaro") || ex.includes("face pull")) return "Hombros";
  if (ex.includes("core") || ex.includes("abs") || ex.includes("abdom") || ex.includes("plancha") || ex.includes("crunch") || ex.includes("lumbar")) return "Core";
  if (ex.includes("pecho") || ex.includes("chest") || ex.includes("press banca") || ex.includes("press plano") || ex.includes("press inclinado") || ex.includes("press declinado") || ex.includes("aperturas") || ex.includes("cruces en polea") || ex.includes("pec")) return "Pecho";
  return null;
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
  const [metricsSummary, setMetricsSummary] = useState(null);
  const [muscleDistApi, setMuscleDistApi] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("Todos");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // -------------------------------------------------------------
  // 2. ELEVACIÓN TOTAL DE HOOKS: CALLBACKS (useCallback)
  // -------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recs, wList, dist, summary] = await Promise.all([
        getRecords().catch(() => []),
        getWorkouts().catch(() => []),
        getMuscleDistribution().catch(() => null),
        getMetricsSummary().catch(() => null),
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
      if (summary) {
        setMetricsSummary(summary);
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
  const overallTotals = useMemo(() => {
    let vol = 0;
    let sets = 0;
    let reps = 0;
    (workouts || []).forEach((w) => {
      (w?.sets || []).forEach((s) => {
        if (s?.completed !== false && !["warmup", "w"].includes((s?.set_type || "").toLowerCase())) {
          const wKg = parseFloat(s?.weight) || 0;
          const r = parseInt(s?.reps, 10) || 0;
          vol += wKg * r;
          sets += 1;
          reps += r;
        }
      });
    });

    const totalVolume = vol > 0 ? Math.round(vol) : Math.round(metricsSummary?.total_volume_kg || 0);
    const totalSets = sets > 0 ? sets : (metricsSummary?.total_sets || 0);
    const totalReps = reps > 0 ? reps : (metricsSummary?.total_reps || 0);
    const totalWorkouts = (workouts || []).length || (metricsSummary?.total_workouts || 0);

    return {
      totalVolume,
      totalSets,
      totalReps,
      totalWorkouts,
      hasWorkouts: totalWorkouts > 0 || (records || []).length > 0 || totalSets > 0,
    };
  }, [workouts, metricsSummary, records]);

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

  // WIDGET 2: VOLUMEN SEMANAL (Lunes a Domingo - solo sesiones reales)
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

    const totalTrainingsDone = days.filter((d) => d.volume > 0).length;

    return {
      days,
      maxVol,
      totalWeeklyVolume: Math.round(totalWeeklyVolume),
      totalTrainingsDone,
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

    const counts = { Piernas: 0, Espalda: 0, Pecho: 0, Hombros: 0, Brazos: 0, Core: 0 };
    const vols = { Piernas: 0, Espalda: 0, Pecho: 0, Hombros: 0, Brazos: 0, Core: 0 };

    (workouts || []).forEach((w) => {
      if (!w?.date) return;
      const parsed = parseDateSafe(w.date);
      if (!parsed || parsed.getTime() < thirtyDaysAgo) return;

      (w.sets || []).forEach((s) => {
        if (s?.completed !== false && !["warmup", "W"].includes(s?.set_type || "normal")) {
          const group = matchMuscle(s?.exercise_name || "", s?.muscle_group_name || w?.muscle_group_name || "");
          if (!group || !(group in counts)) return;
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
    const vols = { Piernas: 0, Espalda: 0, Pecho: 0, Hombros: 0, Brazos: 0, Core: 0 };
    let totalVol = 0;

    (workouts || []).forEach((w) => {
      if (!w?.date) return;
      const parsed = parseDateSafe(w.date);
      if (!parsed || parsed.getTime() < thirtyDaysAgo) return;

      (w.sets || []).forEach((s) => {
        if (s?.completed !== false && !["warmup", "W"].includes(s?.set_type || "normal")) {
          const group = matchMuscle(s?.exercise_name || "", s?.muscle_group_name || w?.muscle_group_name || "");
          if (!group || !(group in vols)) return;
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
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener("fittracker:workoutFinished", handleRefresh);
    window.addEventListener("fittracker:workoutDeleted", handleRefresh);
    window.addEventListener("fittracker:workoutSaved", handleRefresh);
    window.addEventListener("fittracker:workoutUpdated", handleRefresh);
    window.addEventListener("fittracker:refreshMetrics", handleRefresh);
    return () => {
      window.removeEventListener("fittracker:workoutFinished", handleRefresh);
      window.removeEventListener("fittracker:workoutDeleted", handleRefresh);
      window.removeEventListener("fittracker:workoutSaved", handleRefresh);
      window.removeEventListener("fittracker:workoutUpdated", handleRefresh);
      window.removeEventListener("fittracker:refreshMetrics", handleRefresh);
    };
  }, [loadData]);

  // -------------------------------------------------------------
  // 5. RETORNOS CONDICIONALES (SOLO DESPUÉS DE TODOS LOS HOOKS)
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-red-500 select-none">
        <Loader2 size={36} className="animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-[#64748B]">
          Cargando tus métricas...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pb-36 select-none">
      {/* Header */}
      <Header
        title="Métricas"
        subtitle="Rendimiento, volumen y progreso estilo Hevy"
      />

      {/* TARJETAS KPI PRINCIPALES: TONELAJE TOTAL, SERIES/REPS, ENTRENAMIENTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Tonelaje Acumulado
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white">
              <Trophy size={14} />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-[#0F172A]">
              {overallTotals.totalVolume.toLocaleString("es-ES")} <span className="text-xs font-semibold text-[#64748B]">kg</span>
            </h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Volumen total en entrenamientos
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Series &amp; Reps
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-[#0F172A]">
              <Layers size={14} />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-[#0F172A]">
              {overallTotals.totalSets} <span className="text-xs font-semibold text-[#64748B]">series</span>
            </h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {overallTotals.totalReps.toLocaleString("es-ES")} repeticiones efectivas
            </p>
          </div>
        </div>

        <div
          onClick={() => setIsHistoryOpen(true)}
          className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 flex flex-col justify-between hover:border-red-500/50 transition cursor-pointer group"
          title="Ver historial de sesiones"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] group-hover:text-[#0F172A] transition">
              Sesiones Registradas
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-500/15 text-red-500 group-hover:scale-110 transition">
              <Dumbbell size={14} />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-[#0F172A]">
              {overallTotals.totalWorkouts} <span className="text-xs font-semibold text-[#64748B]">entrenamientos</span>
            </h3>
            <p className="text-[11px] text-red-500 mt-0.5 font-medium flex items-center gap-1">
              <span>Tocar para ver historial</span>
              <ChevronRight size={12} />
            </p>
          </div>
        </div>
      </div>

      {/* WIDGET 1: RESUMEN DEL MES */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
              <Calendar size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Resumen del Mes
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">
                {monthSummary.monthName}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-500">
              <Flame size={12} />
              <span>{monthSummary.progressPct}% meta</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-2xl border border-slate-100 bg-white p-3.5 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
              Entrenamientos
            </span>
            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
                {monthSummary.activeDaysCount}
              </span>
              <span className="text-xs font-semibold text-[#64748B]">
                / {monthSummary.monthlyTarget}
              </span>
            </div>
            <span className="text-[10px] text-[#64748B] block mt-0.5">días este mes</span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-3.5 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
              Volumen Mensual
            </span>
            <div className="mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-[#FF8A65]">
                {monthSummary.monthVolume.toLocaleString("es-ES")}
              </span>
            </div>
            <span className="text-[10px] text-[#64748B] block mt-0.5">kg movidos</span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-3.5 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
              Series Totales
            </span>
            <div className="mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
                {monthSummary.monthSets}
              </span>
            </div>
            <span className="text-[10px] text-[#64748B] block mt-0.5">series registradas</span>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Progreso hacia tu meta ({monthSummary.monthlyTarget} sesiones)</span>
            <span className="font-bold text-[#0F172A]">
              {monthSummary.activeDaysCount} de {monthSummary.monthlyTarget} días
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-50 border border-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-red-600 hover:bg-red-700 transition-all duration-500"
              style={{ width: `${monthSummary.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* WIDGET 2: VOLUMEN SEMANAL */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Tocar para ver historial completo"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold group-hover:scale-105 transition">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] group-hover:text-[#0F172A] transition">
                  Volumen Semanal
                </span>
                <span className="text-[10px] text-red-500 font-medium hidden sm:inline">• Ver Historial</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] group-hover:text-red-500 transition">
                {weeklyVolumeData.totalWeeklyVolume.toLocaleString("es-ES")} kg
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-100 bg-slate-50 text-[#64748B] hover:text-[#0F172A] hover:border-red-500/40 transition active:scale-95 cursor-pointer shadow-sm"
              title="Abrir historial detallado de sesiones"
            >
              <Layers size={13} className="text-red-500" />
              <span>Historial</span>
            </button>
          </div>
        </div>

        {/* Gráfico de Barras de sesiones reales */}
        <div
          onClick={() => setIsHistoryOpen(true)}
          className="pt-3 pb-1 cursor-pointer group"
          title="Tocar para ver historial completo"
        >
          <div className="grid grid-cols-7 gap-2 items-end h-36 sm:h-40 px-1">
            {(weeklyVolumeData.days || []).map((day) => {
              const heightPct =
                (day?.volume || 0) > 0
                  ? Math.max(16, Math.round(((day.volume || 0) / weeklyVolumeData.maxVol) * 100))
                  : 8;

              return (
                <div key={day.label} className="flex flex-col items-center justify-end h-full gap-1.5">
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold truncate transition-opacity ${
                      (day?.volume || 0) > 0 ? "text-red-500" : "text-[#64748B]"
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
                          ? "bg-red-600 hover:bg-red-700 shadow-[0_0_12px_rgba(204,255,0,0.25)]"
                          : "bg-slate-50 border-t border-slate-100"
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${day.fullName}: ${(day?.volume || 0).toLocaleString("es-ES")} kg`}
                    />
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className={`text-xs font-bold ${
                        day.isToday
                          ? "text-red-500"
                          : (day?.volume || 0) > 0
                          ? "text-[#0F172A]"
                          : "text-[#64748B]"
                      }`}
                    >
                      {day.label}
                    </span>
                    {day.isToday && (
                      <span className="h-1 w-1 rounded-full bg-red-600 hover:bg-red-700" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen de sesiones reales en la semana */}
        <div className="flex items-center justify-between gap-1.5 text-[11px] text-[#64748B] pt-2 border-t border-slate-100">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F172A]">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 hover:bg-red-700" />
            Sesiones reales esta semana: {weeklyVolumeData.totalTrainingsDone}
          </span>
        </div>
      </div>

      {/* WIDGET DE BALANCE MUSCULAR (ÚLTIMOS 30 DÍAS) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex-shrink-0">
              <Scale size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Balance Muscular (30 días)
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">
                Distribución Cuantitativa de Volumen
              </h3>
            </div>
          </div>

          <span className="rounded-full border border-slate-100 bg-[#050505] px-3 py-1 text-xs font-mono font-bold text-[#64748B] self-start sm:self-auto">
            {muscleVolumeBalance.totalVolume.toLocaleString("es-ES")} kg totales
          </span>
        </div>

        {/* Indicador conciso: "Grupo líder: [Músculo] (X%) | Rezagado: [Músculo] (Y%)" */}
        <div className="rounded-2xl border border-[#2C2C2E] bg-[#050505] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          {muscleVolumeBalance.hasData && muscleVolumeBalance.leader ? (
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap text-xs sm:text-sm font-bold text-[#0F172A] w-full sm:w-auto">
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
              <span className="text-[#64748B] mx-1">|</span>
              <span className="text-[#64748B]">Rezagado:</span>
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
            <div className="text-xs text-[#64748B] w-full text-center py-1">
              Sin volumen registrado en los últimos 30 días para evaluar el balance muscular.
            </div>
          )}

          {muscleVolumeBalance.hasData && (
            <span className="text-[11px] font-semibold text-[#64748B] whitespace-nowrap">
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
                  className="rounded-2xl border border-slate-100 bg-white p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">
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
                  <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                    <span>{item.volume.toLocaleString("es-ES")} kg</span>
                    {item.key === muscleVolumeBalance.leader?.key && (
                      <span className="text-red-500 font-bold">Líder</span>
                    )}
                    {item.key === muscleVolumeBalance.lagging?.key &&
                      item.volume < (muscleVolumeBalance.leader?.volume || 0) && (
                        <span className="text-red-400 font-medium">Rezagado</span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* COMPONENTE: DISTRIBUCIÓN MUSCULAR */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
              <PieChart size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Distribución Muscular
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">
                Series Efectivas (30 días)
              </h3>
            </div>
          </div>

          <span className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs font-bold text-[#64748B]">
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
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
            Leyenda de Grupos Musculares
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(muscleDistributionData.sortedItems || []).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2.5 hover:border-slate-100 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-[#0F172A] truncate">
                    {item.label}
                  </span>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-xs font-bold text-[#FF8A65] block">
                    {item.percentage}%
                  </span>
                  <span className="text-[10px] text-[#64748B] block">
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


      {/* SECCIÓN RÉCORDS PERSONALES */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
              <Trophy size={18} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">
                Récords Personales
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Mejores marcas registradas por ejercicio
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-60">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ejercicio..."
              className="w-full h-11 rounded-xl border border-slate-100 bg-[#F9FAFB] pl-9 pr-3 text-xs text-[#0F172A] placeholder:text-[#64748B] outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              type="button"
              onClick={() => setSelectedMuscle(mg)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedMuscle === mg
                  ? "border border-red-500 bg-red-500/15 text-red-500"
                  : "border border-slate-100 bg-slate-50 text-[#64748B] hover:text-[#0F172A]"
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
                  className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center justify-between gap-3 hover:border-slate-100 transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#0F172A] truncate">
                        {ex?.exercise_name || "Ejercicio"}
                      </span>
                      {rank && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rank?.badgeColor || rank?.badgeClass || ""}`}>
                          {rank?.name || rank?.rankName || "Liga Bronce"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B]">
                      PR actual:{" "}
                      {hasRecords ? (
                        <strong className="text-[#0F172A] font-semibold">
                          {ex.pr_weight} kg × {ex?.pr_reps || 0} reps
                        </strong>
                      ) : (
                        <span className="text-[#64748B] font-medium">
                          Sin registros aún (-- kg)
                        </span>
                      )}
                      {hasRecords && ex?.pr_date && ` • ${ex.pr_date}`}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-[#64748B] block">Mejor carga</span>
                    <span className="text-base sm:text-lg font-extrabold text-red-500">
                      {hasRecords ? `${ex.pr_weight} kg` : "-- kg"}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-xs text-[#64748B]">
              No se encontraron récords registrados para este filtro.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Historial Detallado de Sesiones */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        initialSessions={workouts}
        onSessionDeleted={() => loadData()}
        onSessionUpdated={() => loadData()}
      />
    </div>
  );
}
