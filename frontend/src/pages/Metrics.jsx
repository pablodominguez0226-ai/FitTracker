import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Dumbbell,
  Filter,
  Flame,
  Layers,
  Loader2,
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
    window.addEventListener("fittracker:periodizationChanged", handleModeChange);
    return () => {
      window.removeEventListener(
        "fittracker:periodizationChanged",
        handleModeChange
      );
    };
  }, []);

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
        <p className="text-sm font-semibold text-[#A1A1AA]">
          Cargando métricas de hipertrofia...
        </p>
      </div>
    );
  }

  const activeModeLabel = PERIODIZATION_LABELS[periodizationMode];

  return (
    <div className="space-y-5 pb-20">
      <Header
        title="Progreso de Hipertrofia & Fuerza"
        subtitle="Tonelaje semanal por grupo muscular y evolución directa de cargas"
      />

      {/* Ultra Scannable KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-2xl border border-[#2A1B14] bg-[#121113] p-3 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            Tonelaje Total
          </span>
          <p className="text-xl font-black text-white mt-0.5">
            {Math.round(totalVolumeKg).toLocaleString()} kg
          </p>
          <span className="text-[10px] text-[#71717A]">volumen acumulado</span>
        </div>

        <div className="rounded-2xl border border-[#2A1B14] bg-[#121113] p-3 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            Sesiones Registradas
          </span>
          <p className="text-xl font-black text-white mt-0.5">
            {workouts.length}
          </p>
          <span className="text-[10px] text-emerald-400 font-bold">
            {cycleInfo.daysWithWorkouts} días esta semana
          </span>
        </div>

        <div className="rounded-2xl border border-[#2A1B14] bg-[#121113] p-3 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            Modo de Ciclo
          </span>
          <p className="text-sm font-black text-white mt-1 flex items-center justify-center gap-1">
            <span>{activeModeLabel.icon}</span>
            <span>{activeModeLabel.shortName}</span>
          </p>
          <span className="text-[10px] text-[#FF6D00] font-bold">
            {periodizationMode === "deload" ? "Descarga activa" : "Sobrecarga activa"}
          </span>
        </div>

        <div className="rounded-2xl border border-[#2A1B14] bg-[#121113] p-3 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            Ejercicios Registrados
          </span>
          <p className="text-xl font-black text-white mt-0.5">
            {records.length}
          </p>
          <span className="text-[10px] text-[#71717A]">marcas y PRs</span>
        </div>
      </div>

      {/* SECCIÓN 1: CONTADOR DE SERIES SEMANALES EFECTIVAS */}
      <section className="rounded-2xl border border-[#2A1B14] bg-[#181210] p-4 sm:p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A1B14] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FF5722]/40 bg-[#C84218]/15 text-[#FF5722]">
              <Flame size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Series Semanales Efectivas por Músculo
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Últimos 7 días (excluyendo calentamiento) • Rango óptimo de hipertrofia: 10 a 20 series
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-[#FF5722]/40 bg-[#FF5722]/10 px-2.5 py-1 text-xs font-black text-[#FF5722]">
              {weeklyEffectiveSetsByMuscle.totalEffectiveSets} series efectivas
            </span>
          </div>
        </div>

        {/* Barra de progreso por músculo: Pecho [14/20 series] | Espalda [16/20 series] | Pierna [12/20 series] */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {weeklyEffectiveSetsByMuscle.items.map((item) => (
            <div
              key={item.muscle}
              className={`rounded-xl border p-3.5 space-y-2.5 transition-all ${
                item.isOptimal
                  ? "border-[#FF5722]/70 bg-[#150F0D] shadow-[0_0_15px_rgba(255,87,34,0.15)]"
                  : "border-[#2A1B14] bg-[#121113]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{item.muscle}</span>
                  <span
                    className={`text-xs font-black ${
                      item.isOptimal
                        ? "text-[#FF5722]"
                        : item.isOver
                        ? "text-amber-400"
                        : "text-[#A1A1AA]"
                    }`}
                  >
                    [{item.count}/{item.target} series]
                  </span>
                </div>

                {item.isOptimal ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#FF5722]/60 bg-[#FF5722]/20 px-2 py-0.5 text-[10px] font-black text-[#FF5722] shadow-[0_0_8px_rgba(255,87,34,0.35)]">
                    🔥 Rango Óptimo
                  </span>
                ) : item.isUnder ? (
                  <span className="inline-flex items-center rounded-md border border-[#2A1B14] bg-[#050505] px-1.5 py-0.5 text-[10px] font-bold text-[#71717A]">
                    {item.count === 0 ? "0 series" : `Faltan ${10 - item.count}`}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md border border-amber-500/50 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-black text-amber-300">
                    ⚡ {item.count} series (Alto)
                  </span>
                )}
              </div>

              {/* Barra de progreso */}
              <div className="relative h-3 w-full rounded-full bg-[#050505] border border-[#2A1B14] overflow-hidden">
                {/* Visual marker at 50% for 10 series */}
                <div
                  className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-[#3F3F46]/70 z-10"
                  title="Mínimo óptimo (10 series)"
                />
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.isOptimal
                      ? "bg-gradient-to-r from-[#FF5722] via-[#FF6D00] to-[#FF5722] shadow-[0_0_12px_rgba(255,87,34,0.65)]"
                      : item.isOver
                      ? "bg-gradient-to-r from-[#FF5722] to-amber-500"
                      : item.count > 0
                      ? "bg-[#C84218]/60"
                      : "bg-transparent"
                  }`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#71717A] px-0.5">
                <span>0 series</span>
                <span className={item.count >= 10 ? "text-[#FF5722] font-black" : ""}>
                  10 mín (Óptimo)
                </span>
                <span className={item.count >= 20 ? "text-[#FF6D00] font-black" : ""}>
                  20 máx
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 2: TONELAJE TOTAL POR GRUPO MUSCULAR SEMANA A SEMANA */}
      <section className="rounded-2xl border border-[#2A1B14] bg-[#181210] p-4 sm:p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-[#2A1B14] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FF5722]/40 bg-[#C84218]/15 text-[#FF5722]">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Tonelaje por Grupo Muscular Semana a Semana
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Distribución de carga efectiva y volumen hipertrófico
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Volume Chart (if data exists) */}
        {weeklyChartData.length > 0 && (
          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A1B14" vertical={false} />
                <XAxis dataKey="name" stroke="#71717A" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#71717A"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121113",
                    border: "1px solid #FF5722",
                    borderRadius: "12px",
                    fontSize: "11px",
                  }}
                  formatter={(value) => [`${value.toLocaleString()} kg`, "Tonelaje"]}
                />
                <Bar dataKey="tonelaje" fill="#FF5722" radius={[6, 6, 0, 0]}>
                  {weeklyChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === weeklyChartData.length - 1
                          ? "#FF6D00"
                          : "#C84218"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Muscle Group Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {muscleDistribution.map((m) => (
            <div
              key={m.name}
              className="rounded-xl border border-[#2A1B14] bg-[#121113] p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white truncate">{m.name}</span>
                <span className="text-[#FF6D00] font-black">{m.percentage}%</span>
              </div>
              <p className="text-lg font-black text-white">
                {Math.round(m.volume).toLocaleString()} <span className="text-xs text-[#A1A1AA] font-normal">kg</span>
              </p>
              <div className="h-1.5 w-full rounded-full bg-[#050505] overflow-hidden border border-[#2A1B14]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF5722] to-[#FF6D00]"
                  style={{ width: `${Math.min(100, m.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 3: LISTA DE EJERCICIOS CON SU EVOLUCIÓN DIRECTA */}
      <section className="rounded-2xl border border-[#2A1B14] bg-[#181210] p-4 sm:p-5 shadow-card space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A1B14] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FF5722]/40 bg-[#C84218]/15 text-[#FF5722]">
              <Dumbbell size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Evolución Directa por Ejercicio
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Última carga registrada vs Récord Personal (PR) y Rango de Fuerza
              </p>
            </div>
          </div>
          <span className="text-xs text-[#71717A] font-bold">
            {exercisesEvolution.length} ejercicios encontrados
          </span>
        </div>

        {/* Filter & Search Bar */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ejercicio o grupo muscular..."
              className="iron-input pl-9 pr-3 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((mg) => (
              <button
                key={mg}
                type="button"
                onClick={() => setSelectedMuscle(mg)}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition active:scale-95 ${
                  selectedMuscle === mg
                    ? "bg-[#FF5722] text-white shadow-[0_0_10px_rgba(255,87,34,0.4)]"
                    : "border border-[#2A1B14] bg-[#121113] text-[#A1A1AA] hover:border-[#FF5722]/40 hover:text-white"
                }`}
              >
                {mg}
              </button>
            ))}
          </div>
        </div>

        {/* Concise Ultra Scannable List */}
        <div className="divide-y divide-[#2A1B14] rounded-xl border border-[#2A1B14] bg-[#121113] overflow-hidden">
          {exercisesEvolution.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#71717A] italic">
              No se encontraron ejercicios con los filtros seleccionados.
            </div>
          ) : (
            exercisesEvolution.map((ex) => {
              const isPrHigher = ex.prWeight > ex.lastWeight;
              return (
                <div
                  key={ex.id}
                  className="p-3 sm:p-3.5 hover:bg-[#1A1618] transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-sm text-white truncate">
                        {ex.name}
                      </span>
                      <span className="rounded bg-[#050505] px-1.5 py-0.2 text-[10px] font-bold text-[#FF6D00] border border-[#2A1B14]">
                        {ex.muscleGroup}
                      </span>
                    </div>

                    {/* Evolución directa: "Último: 80kg x 10 ➔ PR: 85kg x 8 (+6.2%)" */}
                    <div className="flex items-center gap-2 text-xs font-bold text-[#A1A1AA] flex-wrap">
                      <span>
                        Último:{" "}
                        <strong className="text-white">
                          {ex.lastWeight}kg × {ex.lastReps}
                        </strong>
                      </span>
                      <span className="text-[#FF5722]">➔</span>
                      <span>
                        PR:{" "}
                        <strong className="text-amber-300 font-black">
                          {ex.prWeight}kg × {ex.prReps}
                        </strong>
                      </span>
                      {ex.gainPct > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-black text-emerald-400">
                          <ArrowUpRight size={11} />
                          +{ex.gainPct}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Concise OLED Strength Rank Badge (Palette Neón #FF5722) */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 flex-shrink-0">
                    <div
                      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider"
                      style={{
                        borderColor: `${ex.rank.rankColor}70`,
                        backgroundColor: `${ex.rank.rankColor}15`,
                        color: ex.rank.rankColor,
                        boxShadow: `0 0 10px ${ex.rank.rankColor}20`,
                      }}
                    >
                      <span>{ex.rank.icon}</span>
                      <span>Rango actual: {ex.rank.rankName}</span>
                    </div>
                    <span className="text-[10px] text-[#A1A1AA] font-bold">
                      {ex.rank.tier < 6 && ex.rank.nextRankName ? (
                        <>
                          Próximo rango:{" "}
                          <strong className="text-[#FF5722]">
                            {ex.rank.nextRankTargetKg} kg
                          </strong>
                        </>
                      ) : (
                        <strong className="text-amber-300">Rango Máximo</strong>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
