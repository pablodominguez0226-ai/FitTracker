import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  Dumbbell,
  Filter,
  Flame,
  Layers,
  Loader2,
  Plus,
  Scale,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getAnalyticsDashboard,
  getProfile,
  getRecords,
  getUserProfile,
  getWorkouts,
  updateProfile,
} from "../api/client";
import Header from "../components/Header";
import { getLocalDateString, parseDateSafe } from "../utils/dateUtils";
import { matchMusclePill } from "../utils/fitnessUtils";
import { getStrengthRank } from "../utils/strengthRanks";
import {
  analyzeWeeklyCycle,
  getWeeklyPeriodizationMode,
  PERIODIZATION_LABELS,
} from "../utils/periodization";

const MUSCLE_GROUPS = [
  "Todos",
  "Pecho",
  "Espalda",
  "Pierna",
  "Hombro",
  "Brazos",
  "Core",
];

export default function Metrics() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("Todos");
  const [periodizationMode, setPeriodizationMode] = useState(
    getWeeklyPeriodizationMode()
  );

  // Bodyweight trend state (Apple Health inspired)
  const [isLoggingWeight, setIsLoggingWeight] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [weightHistory, setWeightHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("fittracker_bodyweight_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Error leyendo historial de peso de localStorage:", e);
    }
    return [
      { date: "1 Sep", weight: 84.3 },
      { date: "4 Sep", weight: 84.6 },
      { date: "8 Sep", weight: 84.9 },
      { date: "11 Sep", weight: 84.7 },
      { date: "14 Sep", weight: 85.3 },
      { date: "16 Sep", weight: 85.2 },
    ];
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [recs, wList, dash, prof] = await Promise.all([
        getRecords().catch(() => []),
        getWorkouts().catch(() => []),
        getAnalyticsDashboard(getLocalDateString()).catch(() => null),
        getProfile().catch(() => getUserProfile().catch(() => null)),
      ]);
      setRecords(recs || []);
      setWorkouts(wList || []);
      setAnalytics(dash);
      if (prof && typeof prof === "object") {
        setUserProfile(prof);
        const bwVal = parseFloat(prof.bodyweight);
        if (!isNaN(bwVal) && bwVal > 0) {
          setWeightHistory((prev) => {
            const hasCustom = Boolean(localStorage.getItem("fittracker_bodyweight_history"));
            if (!hasCustom) {
              return [
                { date: "1 Sep", weight: +(bwVal - 0.9).toFixed(1) },
                { date: "4 Sep", weight: +(bwVal - 0.6).toFixed(1) },
                { date: "8 Sep", weight: +(bwVal - 0.3).toFixed(1) },
                { date: "11 Sep", weight: +(bwVal - 0.5).toFixed(1) },
                { date: "14 Sep", weight: +(bwVal + 0.1).toFixed(1) },
                { date: "16 Sep", weight: +(bwVal).toFixed(1) },
              ];
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error("Error cargando métricas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleModeChange = (e) => {
      if (e?.detail) setPeriodizationMode(e.detail);
    };
    const handleProfileChange = (e) => {
      if (e?.detail) setUserProfile(e.detail);
    };
    window.addEventListener("fittracker:periodizationChanged", handleModeChange);
    window.addEventListener("fittracker:profileChanged", handleProfileChange);
    return () => {
      window.removeEventListener(
        "fittracker:periodizationChanged",
        handleModeChange
      );
      window.removeEventListener(
        "fittracker:profileChanged",
        handleProfileChange
      );
    };
  }, []);

  const handleSaveBodyweight = async (e) => {
    if (e) e.preventDefault();
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 20 || val >= 350) return;

    try {
      setIsSavingWeight(true);
      await updateProfile({ bodyweight: val }).catch((err) => {
        console.warn("Error actualizando peso en backend, guardando localmente:", err);
      });

      const now = new Date();
      const monthNames = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
      ];
      const todayStr = `${now.getDate()} ${monthNames[now.getMonth()]}`;

      setWeightHistory((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.date === todayStr) {
          next[next.length - 1] = { date: todayStr, weight: val };
        } else {
          next.push({ date: todayStr, weight: val });
          if (next.length > 8) next.shift();
        }
        try {
          localStorage.setItem("fittracker_bodyweight_history", JSON.stringify(next));
        } catch (e) {
          console.warn("Error guardando historial de peso en localStorage:", e);
        }
        return next;
      });

      setUserProfile((prev) => ({ ...prev, bodyweight: val }));
      setIsLoggingWeight(false);
      setWeightInput("");
    } catch (err) {
      console.error("Error guardando peso corporal:", err);
    } finally {
      setIsSavingWeight(false);
    }
  };

  const userBw = parseFloat(userProfile?.bodyweight) || 75;
  const cycleInfo = useMemo(() => analyzeWeeklyCycle(workouts), [workouts]);

  // Exercise record map for muscle group lookup
  const exerciseRecordMap = useMemo(() => {
    const map = new Map();
    (records || []).forEach((r) => {
      if (r.exercise_id) {
        map.set(r.exercise_id, r);
      }
    });
    return map;
  }, [records]);

  // 1. VOLUMEN SEMANAL DÍA A DÍA (L, M, X, J, V, S, D) - CSS PURO
  const weeklyDailyVolume = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const dayIndexFromMon = currentDay === 0 ? 6 : currentDay - 1; // 0 para Lun ... 6 para Dom

    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - dayIndexFromMon,
      0,
      0,
      0,
      0
    );

    const dayDefs = [
      { key: "L", label: "L", name: "Lunes", offset: 0 },
      { key: "M", label: "M", name: "Martes", offset: 1 },
      { key: "X", label: "X", name: "Miércoles", offset: 2 },
      { key: "J", label: "J", name: "Jueves", offset: 3 },
      { key: "V", label: "V", name: "Viernes", offset: 4 },
      { key: "S", label: "S", name: "Sábado", offset: 5 },
      { key: "D", label: "D", name: "Domingo", offset: 6 },
    ];

    // Mapear cada fecha 'YYYY-MM-DD' a sus series efectivas completadas
    const dateToEffectiveSets = new Map();
    (workouts || []).forEach((w) => {
      if (!w.date) return;
      const parsedD = parseDateSafe(w.date);
      if (!parsedD) return;
      const dStr = getLocalDateString(parsedD);

      let count = 0;
      (w.sets || []).forEach((s) => {
        if (s.set_type === "warmup" || s.set_type === "W") return;
        if (s.completed === false) return;
        count += 1;
      });

      dateToEffectiveSets.set(dStr, (dateToEffectiveSets.get(dStr) || 0) + count);
    });

    const days = dayDefs.map((def) => {
      const d = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + def.offset
      );
      const dateStr = getLocalDateString(d);
      const count = dateToEffectiveSets.get(dateStr) || 0;
      const isToday = def.offset === dayIndexFromMon;

      return {
        key: def.key,
        label: def.label,
        name: def.name,
        dateStr,
        count,
        isToday,
      };
    });

    const totalWeekSets = days.reduce((sum, d) => sum + d.count, 0);
    const maxSets = Math.max(...days.map((d) => d.count), 0);

    const daysWithHeights = days.map((d) => {
      let heightPct = 0;
      if (maxSets > 0 && d.count > 0) {
        // Altura mínima visual del 12% para que incluso 1 serie se aprecie claramente
        heightPct = Math.max(12, Math.round((d.count / maxSets) * 100));
      }
      return {
        ...d,
        heightPct,
      };
    });

    const sunday = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + 6
    );
    const weekRangeStr = `${monday.getDate()} ${monday.toLocaleDateString("es-ES", {
      month: "short",
    })} – ${sunday.getDate()} ${sunday.toLocaleDateString("es-ES", {
      month: "short",
    })}`;

    return {
      days: daysWithHeights,
      totalWeekSets,
      maxSets,
      weekRangeStr,
    };
  }, [workouts]);

  // 2. INDICADOR DE FATIGA DEL SISTEMA (CNS / ESTRÉS NEUROMUSCULAR)
  const systemFatigue = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    ).getTime();
    const sevenDaysAgo = endOfToday - 7 * 24 * 60 * 60 * 1000;

    let totalSets = 0;
    let failureSets = 0;

    (workouts || []).forEach((w) => {
      if (!w.date) return;
      const parsedD = parseDateSafe(w.date);
      if (!parsedD) return;
      const t = parsedD.getTime();
      if (t < sevenDaysAgo || t > endOfToday + 86400000) return;

      (w.sets || []).forEach((s) => {
        // Excluir series de calentamiento y no completadas
        if (s.set_type === "warmup" || s.set_type === "W") return;
        if (s.completed === false) return;

        totalSets += 1;

        // Series llevadas al fallo absoluto (RIR 0 o tipo failure)
        const isFailure =
          s.set_type === "failure" ||
          s.set_type === "F" ||
          s.rir === 0 ||
          s.rir === "0" ||
          s.rir_actual === 0;

        if (isFailure) {
          failureSets += 1;
        }
      });
    });

    const failurePct =
      totalSets > 0 ? Math.round((failureSets / totalSets) * 100) : 0;

    let statusLabel = "";
    let statusColor = "";
    let barColorClass = "";
    let badgeClass = "";
    let dotColorClass = "";
    let recommendation = "";

    if (failurePct < 15) {
      statusLabel = "Óptima (Recuperación alta)";
      statusColor = "#34D399";
      barColorClass = "bg-[#34D399]";
      badgeClass = "border border-[#34D399]/20 bg-[#34D399]/10 text-[#34D399]";
      dotColorClass = "bg-[#34D399]";
      recommendation =
        "Fatiga neuromuscular baja. El sistema nervioso está recuperado para tolerar sobrecarga progresiva y alto volumen.";
    } else if (failurePct <= 30) {
      statusLabel = "Moderada (Buen estímulo)";
      statusColor = "#FB923C";
      barColorClass = "bg-[#FB923C]";
      badgeClass = "border border-[#FB923C]/20 bg-[#FB923C]/10 text-[#FB923C]";
      dotColorClass = "bg-[#FB923C]";
      recommendation =
        "Estímulo hipertrófico óptimo. Mantén este porcentaje para maximizar adaptaciones mecánicas sin sobrecargar el SNC.";
    } else {
      statusLabel = "Alta (Riesgo de fatiga, considera descargar)";
      statusColor = "#EF4444";
      barColorClass = "bg-[#EF4444]";
      badgeClass = "border border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]";
      dotColorClass = "bg-[#EF4444]";
      recommendation =
        "Estrés neuromuscular elevado. Te sugerimos moderar la cercanía al fallo (RIR 2-3) o programar una semana de descarga (Deload).";
    }

    return {
      totalSets,
      failureSets,
      failurePct,
      statusLabel,
      statusColor,
      barColorClass,
      badgeClass,
      dotColorClass,
      recommendation,
    };
  }, [workouts]);

  // 3. TENDENCIA DE PESO CORPORAL (SVG PURO ESTILO APPLE HEALTH)
  const bodyweightData = useMemo(() => {
    if (!weightHistory || weightHistory.length === 0) {
      return {
        currentWeight: 85.2,
        trendText: "-0.5 kg este mes",
        trendColorClass: "text-[#34D399] bg-[#34D399]/10 border-[#34D399]/20",
        points: [],
        pathD: "",
        areaD: "",
        dateLabels: [],
        svgWidth: 400,
        svgHeight: 120,
        paddingTop: 16,
        paddingBottom: 22,
      };
    }

    const currentWeight = weightHistory[weightHistory.length - 1].weight;
    const firstWeight = weightHistory[0].weight;
    const diff = +(currentWeight - firstWeight).toFixed(1);

    let trendText = "";
    let trendColorClass = "";
    if (diff > 0) {
      trendText = `+${diff} kg este mes`;
      trendColorClass = "text-[#FB923C] bg-[#FB923C]/10 border-[#FB923C]/20";
    } else if (diff < 0) {
      trendText = `${diff} kg este mes`;
      trendColorClass = "text-[#34D399] bg-[#34D399]/10 border-[#34D399]/20";
    } else {
      trendText = "0.0 kg este mes";
      trendColorClass = "text-[#8E8E93] bg-white/5 border-white/10";
    }

    const svgWidth = 400;
    const svgHeight = 120;
    const paddingTop = 16;
    const paddingBottom = 22;
    const paddingLeft = 14;
    const paddingRight = 14;

    const weights = weightHistory.map((d) => d.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = maxW - minW || 1;
    const minY = minW - range * 0.18;
    const maxY = maxW + range * 0.18;
    const effectiveRange = maxY - minY;

    const n = weightHistory.length;
    const points = weightHistory.map((item, idx) => {
      const x =
        paddingLeft +
        (idx / (n - 1 || 1)) * (svgWidth - paddingLeft - paddingRight);
      const y =
        svgHeight -
        paddingBottom -
        ((item.weight - minY) / effectiveRange) *
          (svgHeight - paddingTop - paddingBottom);
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        weight: item.weight,
        date: item.date,
      };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      pathD += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const lastP = points[points.length - 1];
    const firstP = points[0];
    const areaD = `${pathD} L ${lastP.x} ${svgHeight} L ${firstP.x} ${svgHeight} Z`;

    const dateLabels = [];
    if (n <= 4) {
      weightHistory.forEach((d) => dateLabels.push(d.date));
    } else {
      const step = (n - 1) / 3;
      for (let i = 0; i < 4; i++) {
        const idx = Math.min(n - 1, Math.round(i * step));
        dateLabels.push(weightHistory[idx].date);
      }
    }

    return {
      currentWeight,
      trendText,
      trendColorClass,
      points,
      pathD,
      areaD,
      dateLabels,
      svgWidth,
      svgHeight,
      paddingTop,
      paddingBottom,
    };
  }, [weightHistory]);

  // Contador de series semanales efectivas (sin calentamiento) en los últimos 7 días por grupo muscular
  const weeklyEffectiveSetsByMuscle = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    ).getTime();
    const sevenDaysAgo = endOfToday - 7 * 24 * 60 * 60 * 1000;

    const muscleCounts = {
      Pecho: 0,
      Espalda: 0,
      Pierna: 0,
      Hombro: 0,
      Brazos: 0,
      Core: 0,
    };

    const targetMuscles = ["Pecho", "Espalda", "Pierna", "Hombro", "Brazos", "Core"];

    (workouts || []).forEach((w) => {
      if (!w.date) return;
      const parsedD = parseDateSafe(w.date);
      if (!parsedD) return;
      const t = parsedD.getTime();
      if (t < sevenDaysAgo || t > endOfToday + 86400000) return;

      const sets = w.sets || [];
      sets.forEach((s) => {
        // Excluir series de calentamiento
        if (s.set_type === "warmup" || s.set_type === "W") return;
        // Excluir series no completadas
        if (s.completed === false) return;

        const rec = s.exercise_id ? exerciseRecordMap.get(s.exercise_id) : null;
        const exerciseName = s.exercise_name || rec?.exercise_name || "";
        const muscleGroup =
          rec?.muscle_group ||
          rec?.muscle_group_name ||
          w.muscle_group_name ||
          "";

        const setObj = {
          exercise_name: exerciseName,
          muscle_group: muscleGroup,
          muscle_group_name: muscleGroup,
        };

        for (const m of targetMuscles) {
          if (matchMusclePill(setObj, m)) {
            muscleCounts[m] = (muscleCounts[m] || 0) + 1;
            break;
          }
        }
      });
    });

    const totalEffectiveSets = Object.values(muscleCounts).reduce(
      (a, b) => a + b,
      0
    );

    const items = targetMuscles.map((muscle) => {
      const count = muscleCounts[muscle] || 0;
      const target = 20;
      const isOptimal = count >= 10 && count <= 20;
      const isUnder = count < 10;
      const isOver = count > 20;
      const percentage = Math.min(100, Math.round((count / target) * 100));

      return {
        muscle,
        count,
        target,
        percentage,
        isOptimal,
        isUnder,
        isOver,
      };
    });

    return {
      items,
      totalEffectiveSets,
    };
  }, [workouts, exerciseRecordMap]);

  // Weekly consistency / tonnage data for chart
  const weeklyChartData = useMemo(() => {
    if (!analytics?.weekly_consistency || analytics.weekly_consistency.length === 0) {
      return [];
    }
    return analytics.weekly_consistency.map((item, idx) => ({
      name: `Sem ${idx + 1}`,
      tonelaje: Math.round(item.total_volume),
      sesiones: item.sessions_count,
    }));
  }, [analytics]);

  // Muscle tonnage distribution
  const muscleDistribution = useMemo(() => {
    if (!analytics?.muscle_distribution) return [];
    return analytics.muscle_distribution
      .filter((m) => m.volume > 0)
      .sort((a, b) => b.volume - a.volume);
  }, [analytics]);

  // Total volume this week
  const totalVolumeKg = analytics?.total_volume_kg || 0;

  // Filtered Exercises Evolution List
  const exercisesEvolution = useMemo(() => {
    const q = search.trim().toLowerCase();

    return records
      .filter((r) => {
        const name = (r.exercise_name || "").toLowerCase();
        const mg = (r.muscle_group || r.muscle_group_name || "").toLowerCase();
        const matchSearch = !q || name.includes(q) || mg.includes(q);

        let matchMuscle = true;
        if (selectedMuscle !== "Todos") {
          matchMuscle =
            mg.includes(selectedMuscle.toLowerCase()) ||
            name.includes(selectedMuscle.toLowerCase());
        }

        return matchSearch && matchMuscle;
      })
      .map((r) => {
        const curWeight = parseFloat(r.pr_weight) || 0;
        const curReps = parseInt(r.pr_reps, 10) || 0;

        const lastWeight =
          r.last_weight !== null && r.last_weight !== undefined
            ? parseFloat(r.last_weight)
            : curWeight;
        const lastReps =
          r.last_reps !== null && r.last_reps !== undefined
            ? parseInt(r.last_reps, 10)
            : curReps;

        // Calculate progression gain %
        let gainPct = 0;
        if (lastWeight > 0 && curWeight > lastWeight) {
          gainPct = +(((curWeight - lastWeight) / lastWeight) * 100).toFixed(1);
        } else if (r.previous_pr_weight && curWeight > r.previous_pr_weight) {
          gainPct = +(
            ((curWeight - r.previous_pr_weight) / r.previous_pr_weight) *
            100
          ).toFixed(1);
        }

        const rank = getStrengthRank(r.exercise_name, curWeight, curReps, userBw);

        return {
          id: r.exercise_id,
          name: r.exercise_name,
          muscleGroup: r.muscle_group || r.muscle_group_name || "General",
          prWeight: curWeight,
          prReps: curReps,
          lastWeight: lastWeight,
          lastReps: lastReps,
          gainPct,
          rank,
        };
      });
  }, [records, search, selectedMuscle, userBw]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[#FF5722]">
        <Loader2 size={34} className="animate-spin" />
        <p className="text-sm font-semibold text-[#8E8E93]">
          Cargando analíticas de hipertrofia...
        </p>
      </div>
    );
  }

  const activeModeLabel = PERIODIZATION_LABELS[periodizationMode];

  return (
    <div className="space-y-5 pb-20">
      <Header
        title="Progreso de Hipertrofia & Fuerza"
        subtitle="Dashboard analítico, fatiga del sistema y progresión de cargas"
      />

      {/* DASHBOARD ANALÍTICO PRINCIPAL (GRID GAP-4 PREMIUM FLAT OLED) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TARJETA 1: VOLUMEN SEMANAL (CSS PURO) */}
        <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Volumen Semanal</h2>
                <p className="text-sm text-[#8E8E93] mt-0.5">
                  Series efectivas completadas
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-[#FF5722] bg-[#FF5722]/10 border border-[#FF5722]/20 px-2.5 py-1 rounded-full inline-block">
                  {weeklyDailyVolume.totalWeekSets} series
                </span>
                <p className="text-[11px] text-[#8E8E93] mt-1 font-medium">
                  {weeklyDailyVolume.weekRangeStr}
                </p>
              </div>
            </div>
          </div>

          {/* Gráfico de barras Flexbox horizontal CSS Puro */}
          <div className="mt-6 flex items-end justify-between h-40 pt-2 pb-1 px-1">
            {weeklyDailyVolume.days.map((d) => (
              <div
                key={d.key}
                className="flex flex-col items-center gap-1.5 h-full justify-end flex-1 max-w-[44px]"
              >
                {/* Contador numérico sobre la barra */}
                <span
                  className={`text-[11px] font-semibold transition-opacity ${
                    d.count > 0 ? "text-white" : "text-transparent"
                  }`}
                  title={`${d.count} series (${d.name})`}
                >
                  {d.count}
                </span>

                {/* Track OLED y barra vertical con gradiente */}
                <div className="relative w-8 sm:w-10 h-28 bg-[#1C1C1E] rounded-t-md flex items-end overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-[#FF5722] to-[#7C4DFF] rounded-t-md transition-all duration-500 ease-out"
                    style={{ height: `${d.heightPct}%` }}
                  />
                </div>

                {/* Eje X: Letra del día (L, M, X, J, V, S, D) */}
                <div className="flex flex-col items-center">
                  <span
                    className={`text-xs font-medium ${
                      d.isToday ? "text-[#FF5722] font-bold" : "text-[#8E8E93]"
                    }`}
                  >
                    {d.label}
                  </span>
                  {d.isToday && (
                    <span className="w-1 h-1 rounded-full bg-[#FF5722] mt-0.5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TARJETA 2: WIDGET DE FATIGA DEL SISTEMA */}
        <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Fatiga del Sistema</h2>
                <p className="text-sm text-[#8E8E93] mt-0.5">
                  Estrés neuromuscular y series al fallo
                </p>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${systemFatigue.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${systemFatigue.dotColorClass}`} />
                <span>{systemFatigue.failureSets} al fallo</span>
              </div>
            </div>

            {/* Métrica primaria: Número grande y prominente */}
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
                {systemFatigue.failurePct}%
              </span>
              <span className="text-sm font-medium text-[#8E8E93]">
                de series al fallo
              </span>
            </div>

            {/* Estado dinámico */}
            <div className="mt-2.5">
              <span
                className={`inline-block text-xs font-semibold ${systemFatigue.badgeClass} px-3 py-1.5 rounded-2xl`}
              >
                {systemFatigue.statusLabel}
              </span>
            </div>
          </div>

          {/* Barra de progreso horizontal estática y umbrales */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8E8E93]">
              <span>Índice de fatiga neuromuscular</span>
              <span className="font-semibold text-white">
                {systemFatigue.failureSets} de {systemFatigue.totalSets} series (7d)
              </span>
            </div>

            {/* Barra horizontal estática */}
            <div className="relative h-3 w-full rounded-full bg-[#1C1C1E] border border-white/5 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${systemFatigue.barColorClass}`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(systemFatigue.failurePct > 0 ? 6 : 0, systemFatigue.failurePct)
                  )}%`,
                }}
              />
            </div>

            {/* Guía de umbrales */}
            <div className="flex items-center justify-between text-[10px] text-[#8E8E93] pt-0.5 font-medium">
              <span>0% Óptimo</span>
              <span className="text-[#34D399]">15%</span>
              <span className="text-[#FB923C]">30%</span>
              <span className="text-[#EF4444]">Límite crítico</span>
            </div>

            {/* Recomendación dinámica según rango */}
            <p className="text-xs text-[#8E8E93] leading-relaxed pt-1">
              {systemFatigue.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* TARJETA 3: PESO CORPORAL (BODYWEIGHT TREND - SVG PURO ESTILO APPLE HEALTH) */}
      <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 w-full space-y-4">
        {/* Cabecera y Dato Principal */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[#8E8E93] text-sm font-medium block">
              Peso Corporal
            </span>
            <div className="mt-1 flex items-baseline gap-2.5 flex-wrap">
              <span className="text-white font-semibold text-3xl tracking-tight">
                {bodyweightData.currentWeight.toFixed(1)} kg
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${bodyweightData.trendColorClass}`}
              >
                {bodyweightData.trendText}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsLoggingWeight((prev) => !prev);
              if (!isLoggingWeight) {
                setWeightInput(String(bodyweightData.currentWeight));
              }
            }}
            className="bg-[#1C1C1E] text-white rounded-full p-2 hover:bg-[#252528] active:scale-95 transition flex items-center justify-center border border-white/5"
            title="Registrar peso de hoy"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Input Rápido para Registrar Peso de Hoy */}
        {isLoggingWeight && (
          <div className="p-3.5 rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] animate-in fade-in slide-in-from-top-2 duration-150 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-white">
              <span>Registrar peso de hoy</span>
              <button
                type="button"
                onClick={() => setIsLoggingWeight(false)}
                className="text-[#8E8E93] hover:text-white p-0.5 text-xs"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveBodyweight} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="350"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="Ej: 85.2"
                  className="w-full min-h-[44px] rounded-xl border border-[#2C2C2E] bg-[#121212] px-3 pr-8 text-sm font-semibold text-white placeholder:text-[#8E8E93] outline-none focus:border-[#FF5722]"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8E8E93]">
                  kg
                </span>
              </div>
              <button
                type="submit"
                disabled={!weightInput || isSavingWeight}
                className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-90 active:scale-95 transition text-white font-medium text-xs flex items-center justify-center gap-1 flex-shrink-0 disabled:opacity-40"
              >
                {isSavingWeight ? (
                  <Loader2 size={14} className="animate-spin text-white" />
                ) : (
                  <Check size={14} strokeWidth={2.5} />
                )}
                <span>Guardar</span>
              </button>
            </form>
          </div>
        )}

        {/* Gráfico de Líneas en SVG Puro (Estilo Apple Health) */}
        <div className="w-full h-36 sm:h-40 pt-1 flex flex-col justify-between">
          <div className="relative w-full flex-1">
            <svg
              viewBox={`0 0 ${bodyweightData.svgWidth} ${bodyweightData.svgHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="gradientWeight" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FF5722" />
                  <stop offset="100%" stopColor="#7C4DFF" />
                </linearGradient>
                <linearGradient id="gradientWeightArea" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF5722" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#FF5722" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Guías horizontales sutiles de fondo */}
              <line
                x1="0"
                y1={bodyweightData.svgHeight - bodyweightData.paddingBottom}
                x2={bodyweightData.svgWidth}
                y2={bodyweightData.svgHeight - bodyweightData.paddingBottom}
                stroke="#2C2C2E"
                strokeDasharray="3 3"
              />
              <line
                x1="0"
                y1={bodyweightData.paddingTop}
                x2={bodyweightData.svgWidth}
                y2={bodyweightData.paddingTop}
                stroke="#2C2C2E"
                strokeDasharray="3 3"
              />

              {/* Área semi-transparente debajo de la línea */}
              {bodyweightData.areaD && (
                <path d={bodyweightData.areaD} fill="url(#gradientWeightArea)" />
              )}

              {/* Línea de tendencia con degradado #FF5722 a #7C4DFF */}
              {bodyweightData.pathD && (
                <path
                  d={bodyweightData.pathD}
                  fill="none"
                  stroke="url(#gradientWeight)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Puntos y marcador destacado del peso actual */}
              {bodyweightData.points.map((p, idx) => {
                const isLast = idx === bodyweightData.points.length - 1;
                return (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={isLast ? "4.5" : "3"}
                    fill={isLast ? "#FFFFFF" : "#121212"}
                    stroke={isLast ? "#7C4DFF" : "#FF5722"}
                    strokeWidth={isLast ? "2.5" : "2"}
                  />
                );
              })}
            </svg>
          </div>

          {/* Fechas distribuidas uniformemente debajo del gráfico */}
          <div className="flex justify-between items-center text-[#8E8E93] text-xs pt-2 px-1">
            {bodyweightData.dateLabels.map((label, idx) => (
              <span key={idx}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI BANNER (FLAT OLED) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#2C2C2E] bg-[#121212] p-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            Tonelaje Total
          </span>
          <p className="text-xl font-semibold text-white mt-1">
            {Math.round(totalVolumeKg).toLocaleString()} kg
          </p>
          <span className="text-[11px] text-[#8E8E93]">volumen acumulado</span>
        </div>

        <div className="rounded-2xl border border-[#2C2C2E] bg-[#121212] p-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            Sesiones Registradas
          </span>
          <p className="text-xl font-semibold text-white mt-1">
            {workouts.length}
          </p>
          <span className="text-[11px] text-[#34D399] font-medium">
            {cycleInfo.daysWithWorkouts} días esta semana
          </span>
        </div>

        <div className="rounded-2xl border border-[#2C2C2E] bg-[#121212] p-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            Modo de Ciclo
          </span>
          <p className="text-sm font-semibold text-white mt-1.5 flex items-center justify-center gap-1.5">
            <span>{activeModeLabel.icon}</span>
            <span>{activeModeLabel.shortName}</span>
          </p>
          <span className="text-[11px] text-[#FF5722] font-medium">
            {periodizationMode === "deload" ? "Descarga activa" : "Sobrecarga activa"}
          </span>
        </div>

        <div className="rounded-2xl border border-[#2C2C2E] bg-[#121212] p-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            Ejercicios Registrados
          </span>
          <p className="text-xl font-semibold text-white mt-1">
            {records.length}
          </p>
          <span className="text-[11px] text-[#8E8E93]">marcas y PRs</span>
        </div>
      </div>

      {/* SECCIÓN 1: CONTADOR DE SERIES SEMANALES EFECTIVAS */}
      <section className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2C2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF5722]/10 text-[#FF5722]">
              <Flame size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Series Semanales Efectivas por Músculo
              </h2>
              <p className="text-sm text-[#8E8E93] mt-0.5">
                Últimos 7 días (excluyendo calentamiento) • Rango óptimo: 10 a 20 series
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-3 py-1 text-xs font-semibold text-[#FF5722]">
              {weeklyEffectiveSetsByMuscle.totalEffectiveSets} series efectivas
            </span>
          </div>
        </div>

        {/* Barra de progreso por músculo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {weeklyEffectiveSetsByMuscle.items.map((item) => (
            <div
              key={item.muscle}
              className={`rounded-2xl border p-4 space-y-3 transition-all ${
                item.isOptimal
                  ? "border-[#FF5722]/40 bg-[#FF5722]/5"
                  : "border-[#2C2C2E] bg-[#1C1C1E]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{item.muscle}</span>
                  <span
                    className={`text-xs font-medium ${
                      item.isOptimal
                        ? "text-[#FF5722]"
                        : item.isOver
                        ? "text-amber-400"
                        : "text-[#8E8E93]"
                    }`}
                  >
                    [{item.count}/{item.target} series]
                  </span>
                </div>

                {item.isOptimal ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#FF5722]/30 bg-[#FF5722]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#FF5722]">
                    🔥 Rango Óptimo
                  </span>
                ) : item.isUnder ? (
                  <span className="inline-flex items-center rounded-full border border-[#2C2C2E] bg-[#121212] px-2 py-0.5 text-[11px] font-medium text-[#8E8E93]">
                    {item.count === 0 ? "0 series" : `Faltan ${10 - item.count}`}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                    ⚡ {item.count} series (Alto)
                  </span>
                )}
              </div>

              {/* Barra de progreso */}
              <div className="relative h-2.5 w-full rounded-full bg-[#121212] border border-white/5 overflow-hidden">
                {/* Visual marker at 50% for 10 series */}
                <div
                  className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/20 z-10"
                  title="Mínimo óptimo (10 series)"
                />
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.isOptimal
                      ? "bg-gradient-to-r from-[#FF5722] to-[#7C4DFF]"
                      : item.isOver
                      ? "bg-gradient-to-r from-[#FF5722] to-amber-500"
                      : item.count > 0
                      ? "bg-[#FF5722]/50"
                      : "bg-transparent"
                  }`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8E8E93] px-0.5">
                <span>0</span>
                <span className={item.count >= 10 ? "text-[#FF5722] font-semibold" : ""}>
                  10 mín (Óptimo)
                </span>
                <span className={item.count >= 20 ? "text-[#FF5722] font-semibold" : ""}>
                  20 máx
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 2: TONELAJE TOTAL POR GRUPO MUSCULAR SEMANA A SEMANA */}
      <section className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF5722]/10 text-[#FF5722]">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Tonelaje por Grupo Muscular Semana a Semana
              </h2>
              <p className="text-sm text-[#8E8E93] mt-0.5">
                Distribución de carga efectiva y volumen hipertrófico
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Volume Chart (if data exists) */}
        {weeklyChartData.length > 0 && (
          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" vertical={false} />
                <XAxis dataKey="name" stroke="#8E8E93" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8E8E93"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1C1C1E",
                    border: "1px solid #2C2C2E",
                    borderRadius: "16px",
                    fontSize: "12px",
                    color: "#FFFFFF",
                  }}
                  formatter={(value) => [`${value.toLocaleString()} kg`, "Tonelaje"]}
                />
                <Bar dataKey="tonelaje" fill="#FF5722" radius={[6, 6, 0, 0]}>
                  {weeklyChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === weeklyChartData.length - 1
                          ? "#FF5722"
                          : "#7C4DFF"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Muscle Group Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          {muscleDistribution.map((m) => (
            <div
              key={m.name}
              className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-white truncate">{m.name}</span>
                <span className="text-[#FF5722] font-semibold">{m.percentage}%</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {Math.round(m.volume).toLocaleString()}{" "}
                <span className="text-xs text-[#8E8E93] font-normal">kg</span>
              </p>
              <div className="h-1.5 w-full rounded-full bg-[#121212] overflow-hidden border border-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF5722] to-[#7C4DFF]"
                  style={{ width: `${Math.min(100, m.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 3: LISTA DE EJERCICIOS CON SU EVOLUCIÓN DIRECTA */}
      <section className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2C2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF5722]/10 text-[#FF5722]">
              <Dumbbell size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Evolución Directa por Ejercicio
              </h2>
              <p className="text-sm text-[#8E8E93] mt-0.5">
                Última carga registrada vs Récord Personal (PR) y Rango de Fuerza
              </p>
            </div>
          </div>
          <span className="text-xs text-[#8E8E93] font-medium">
            {exercisesEvolution.length} ejercicios encontrados
          </span>
        </div>

        {/* Filter & Search Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ejercicio o grupo muscular..."
              className="w-full min-h-[44px] rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] pl-10 pr-4 text-sm text-white placeholder:text-[#8E8E93] outline-none focus:border-[#FF5722] transition"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((mg) => (
              <button
                key={mg}
                type="button"
                onClick={() => setSelectedMuscle(mg)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  selectedMuscle === mg
                    ? "border border-[#FF5722] bg-[#FF5722]/15 text-white"
                    : "border border-[#2C2C2E] bg-[#1C1C1E] text-[#8E8E93] hover:border-white/20 hover:text-white"
                }`}
              >
                {mg}
              </button>
            ))}
          </div>
        </div>

        {/* Flat OLED Scannable List */}
        <div className="divide-y divide-[#2C2C2E] rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] overflow-hidden">
          {exercisesEvolution.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8E8E93] italic">
              No se encontraron ejercicios con los filtros seleccionados.
            </div>
          ) : (
            exercisesEvolution.map((ex) => (
              <div
                key={ex.id}
                className="p-3.5 sm:p-4 hover:bg-[#252528] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-white truncate">
                      {ex.name}
                    </span>
                    <span className="rounded-md bg-[#121212] px-2 py-0.5 text-[11px] font-medium text-[#FF8A65] border border-[#2C2C2E]">
                      {ex.muscleGroup}
                    </span>
                  </div>

                  {/* Evolución directa: "Último: 80kg x 10 ➔ PR: 85kg x 8 (+6.2%)" */}
                  <div className="flex items-center gap-2 text-xs text-[#8E8E93] flex-wrap">
                    <span>
                      Último:{" "}
                      <strong className="text-white font-medium">
                        {ex.lastWeight}kg × {ex.lastReps}
                      </strong>
                    </span>
                    <span className="text-[#FF5722]">➔</span>
                    <span>
                      PR:{" "}
                      <strong className="text-amber-300 font-semibold">
                        {ex.prWeight}kg × {ex.prReps}
                      </strong>
                    </span>
                    {ex.gainPct > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                        <ArrowUpRight size={11} />
                        +{ex.gainPct}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Flat OLED Strength Rank Badge (Zero shadow) */}
                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1.5 flex-shrink-0">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider"
                    style={{
                      borderColor: `${ex.rank.rankColor}40`,
                      backgroundColor: `${ex.rank.rankColor}12`,
                      color: ex.rank.rankColor,
                    }}
                  >
                    <span>{ex.rank.icon}</span>
                    <span>{ex.rank.rankName}</span>
                  </div>
                  <span className="text-[11px] text-[#8E8E93]">
                    {ex.rank.tier < 6 && ex.rank.nextRankName ? (
                      <>
                        Próximo:{" "}
                        <strong className="text-[#FF5722] font-semibold">
                          {ex.rank.nextRankTargetKg} kg
                        </strong>
                      </>
                    ) : (
                      <strong className="text-amber-300 font-semibold">Rango Máximo</strong>
                    )}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
