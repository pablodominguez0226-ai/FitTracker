import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Calendar,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Filter,
  Flame,
  Loader2,
  Medal,
  Scale,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  deleteWorkout,
  getMuscleGroups,
  getProfile,
  getRecords,
  getUserProfile,
  getWorkouts,
} from "../api/client";
import Header from "../components/Header";
import { formatDateSafe, parseDateSafe } from "../utils/dateUtils";
import {
  calculateEstimated1RM,
  getExerciseEquipment,
  getPrStatus,
  matchMusclePill,
} from "../utils/fitnessUtils";
import { getStrengthRank, STRENGTH_RANKS } from "../utils/strengthRanks";

const MUSCLE_PILLS = [
  "Todos",
  "Pecho",
  "Pierna",
  "Espalda",
  "Hombro",
  "Brazos",
  "Core",
];

const RANK_FILTER_OPTIONS = [
  { id: "all", label: "Todos los rangos", minTier: 0 },
  { id: "basico", label: "Básico+", minTier: 1, name: "Básico", color: "#94A3B8", icon: "🛡️" },
  { id: "guerrero", label: "Guerrero+", minTier: 2, name: "Guerrero", color: "#F59E0B", icon: "⚔️" },
  { id: "avanzado", label: "Avanzado+", minTier: 3, name: "Avanzado", color: "#CBD5E1", icon: "⚡" },
  { id: "maestro", label: "Maestro+", minTier: 4, name: "Maestro", color: "#FBBF24", icon: "👑" },
  { id: "elite", label: "Élite+", minTier: 5, name: "Élite", color: "#FF5722", icon: "🔥" },
  { id: "elite_supremo", label: "Élite Supremo", minTier: 6, name: "Élite Supremo", color: "#FF1744", icon: "💎" },
];

export default function Records({ defaultTab = "records" }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'records' | 'history'
  const [records, setRecords] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [userLevel, setUserLevel] = useState("intermedio");
  const [userProfile, setUserProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedPill, setSelectedPill] = useState("Todos");
  const [selectedRankFilter, setSelectedRankFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent"); // 'recent' | 'weight' | '1rm' | 'gain' | 'name'
  const [loading, setLoading] = useState(true);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recs, groups, wList, profile] = await Promise.all([
        getRecords(),
        getMuscleGroups().catch(() => []),
        getWorkouts().catch(() => []),
        getProfile().catch(() => getUserProfile().catch(() => null)),
      ]);
      setRecords(recs || []);
      setMuscleGroups(groups || []);
      setWorkouts(wList || []);
      if (profile && typeof profile === "object") {
        setUserProfile((prev) => (prev ? { ...prev, ...profile } : profile));
        if (profile?.experience_level) setUserLevel(profile.experience_level);
      }
    } catch (err) {
      console.error("Error cargando datos de récords/historial:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleLevelEvt = (e) => {
      if (e?.detail) setUserLevel(e.detail);
    };
    const handleProfileEvt = (e) => {
      try {
        if (!e?.detail) return;
        let prof = e.detail;
        if (typeof prof === "string") {
          try {
            prof = JSON.parse(prof);
          } catch {
            return;
          }
        }
        if (prof && typeof prof === "object") {
          setUserProfile((prev) => (prev ? { ...prev, ...prof } : prof));
          if (prof?.experience_level) setUserLevel(prof.experience_level);
        }
      } catch (err) {
        console.warn("Error procesando fittracker:profileChanged en Records:", err);
      }
    };

    window.addEventListener("fittracker:levelChanged", handleLevelEvt);
    window.addEventListener("fittracker:profileChanged", handleProfileEvt);
    return () => {
      window.removeEventListener("fittracker:levelChanged", handleLevelEvt);
      window.removeEventListener("fittracker:profileChanged", handleProfileEvt);
    };
  }, []);

  const handleDeleteWorkout = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar esta sesión del historial?")) {
      return;
    }
    const backup = workouts;
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    try {
      await deleteWorkout(id);
      const updatedRecs = await getRecords();
      setRecords(updatedRecs || []);
    } catch (err) {
      console.error(err);
      setWorkouts(backup);
      alert("No se pudo eliminar la sesión.");
    }
  };

  // Hall of fame summary stats
  const stats = useMemo(() => {
    let recentCount = 0;
    let plateauCount = 0;
    let max1RM = 0;
    let bestExerciseName = "";

    records.forEach((r) => {
      const status = getPrStatus(r.pr_date);
      if (status?.type === "recent") recentCount += 1;
      if (status?.type === "plateau") plateauCount += 1;

      const cur1RM =
        parseFloat(r.best_estimated_1rm) ||
        calculateEstimated1RM(r.pr_weight, r.pr_reps);
      if (cur1RM > max1RM) {
        max1RM = cur1RM;
        bestExerciseName = r.exercise_name;
      }
    });

    return {
      total: records.length,
      recentCount,
      plateauCount,
      max1RM,
      bestExerciseName,
    };
  }, [records]);

  // Counts per muscle pill
  const pillCounts = useMemo(() => {
    const map = { Todos: records.length };
    MUSCLE_PILLS.forEach((pill) => {
      if (pill !== "Todos") {
        map[pill] = records.filter((r) => matchMusclePill(r, pill)).length;
      }
    });
    return map;
  }, [records]);

  // Counts per rank filter option
  const rankCounts = useMemo(() => {
    const bw = userProfile?.bodyweight || 75;
    const map = { all: records.length };
    RANK_FILTER_OPTIONS.forEach((opt) => {
      if (opt.id !== "all") {
        map[opt.id] = records.filter((r) => {
          const w = parseFloat(r.pr_weight) || 0;
          const reps = parseInt(r.pr_reps, 10) || 10;
          const rank = getStrengthRank(r.exercise_name, w, reps, bw);
          return rank.tier >= opt.minTier;
        }).length;
      }
    });
    return map;
  }, [records, userProfile?.bodyweight]);

  // Filtered & Sorted records
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    const bw = userProfile?.bodyweight || 75;
    const rankFilter = RANK_FILTER_OPTIONS.find((opt) => opt.id === selectedRankFilter);

    const filtered = records.filter((r) => {
      const matchSearch =
        !q ||
        (r.exercise_name || "").toLowerCase().includes(q) ||
        (r.muscle_group || r.muscle_group_name || "").toLowerCase().includes(q);

      const matchGroup = matchMusclePill(r, selectedPill);

      let matchRank = true;
      if (rankFilter && rankFilter.minTier > 0) {
        const w = parseFloat(r.pr_weight) || 0;
        const reps = parseInt(r.pr_reps, 10) || 10;
        const rRank = getStrengthRank(r.exercise_name, w, reps, bw);
        matchRank = rRank.tier >= rankFilter.minTier;
      }

      return matchSearch && matchGroup && matchRank;
    });

    return filtered.sort((a, b) => {
      const aWeight = parseFloat(a.pr_weight) || 0;
      const bWeight = parseFloat(b.pr_weight) || 0;
      const a1RM =
        parseFloat(a.best_estimated_1rm) ||
        calculateEstimated1RM(a.pr_weight, a.pr_reps);
      const b1RM =
        parseFloat(b.best_estimated_1rm) ||
        calculateEstimated1RM(b.pr_weight, b.pr_reps);

      if (sortBy === "weight") return bWeight - aWeight;
      if (sortBy === "1rm") return b1RM - a1RM;
      if (sortBy === "name") return (a.exercise_name || "").localeCompare(b.exercise_name || "");
      if (sortBy === "gain") {
        const aGain =
          a.previous_pr_weight && aWeight > a.previous_pr_weight
            ? ((aWeight - a.previous_pr_weight) / a.previous_pr_weight) * 100
            : 0;
        const bGain =
          b.previous_pr_weight && bWeight > b.previous_pr_weight
            ? ((bWeight - b.previous_pr_weight) / b.previous_pr_weight) * 100
            : 0;
        return bGain - aGain;
      }

      // Default: 'recent' (newest PR date first)
      const aDate = a.pr_date ? new Date(a.pr_date).getTime() : 0;
      const bDate = b.pr_date ? new Date(b.pr_date).getTime() : 0;
      return bDate - aDate;
    });
  }, [records, search, selectedPill, sortBy]);

  const formatDate = (val) =>
    formatDateSafe(val, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[#FF5722]">
        <Loader2 size={34} className="animate-spin" />
        <p className="text-sm font-semibold text-[#A1A1AA]">
          Cargando el Salón de la Fama...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      <Header
        title="Salón de la Fama & Récords"
        subtitle="Monitoreá tus marcas personales (PRs), 1RM estimados y progresión histórica"
      />

      {/* Segmented Switcher (Récords / Salón de la Fama vs Historial) */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#2A1B14] bg-[#181210] p-1.5 shadow-card">
        <button
          type="button"
          onClick={() => setActiveTab("records")}
          className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-extrabold transition active:scale-95 ${
            activeTab === "records"
              ? "bg-gradient-to-r from-[#C84218] to-[#7E22CE] text-white shadow-neon"
              : "text-[#A1A1AA] hover:text-white hover:bg-[#2A1B14]"
          }`}
        >
          <Trophy size={16} className={activeTab === "records" ? "text-amber-300" : "text-[#FF6D00]"} />
          <span>Salón de la Fama ({records.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-extrabold transition active:scale-95 ${
            activeTab === "history"
              ? "bg-gradient-to-r from-[#C84218] to-[#7E22CE] text-white shadow-neon"
              : "text-[#A1A1AA] hover:text-white hover:bg-[#2A1B14]"
          }`}
        >
          <Calendar size={16} className={activeTab === "history" ? "text-white" : "text-[#FF5722]"} />
          <span>Historial ({workouts.length})</span>
        </button>
      </div>

      {/* TAB 1: SALÓN DE LA FAMA (RÉCORDS) */}
      {activeTab === "records" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Hall of Fame Hero Stats Banner */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#2A1B14] via-[#181210] to-[#0A0612] p-4 sm:p-5 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A1B14] pb-3.5 mb-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/25 to-amber-600/20 border border-amber-400/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Trophy size={22} className="text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>Medallero Personal</span>
                    <span className="rounded-md border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                      PRs Activos
                    </span>
                  </h2>
                  <p className="text-xs text-[#A1A1AA]">
                    Tus máximas marcas registradas con sobrecarga progresiva y 1RM
                  </p>
                </div>
              </div>

              {stats.max1RM > 0 && (
                <div className="self-start sm:self-center flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs">
                  <Sparkles size={14} className="text-[#FF6D00]" />
                  <span className="text-[#A1A1AA]">Mayor 1RM:</span>
                  <strong className="text-white font-black">{stats.max1RM} kg</strong>
                  <span className="text-[#FF6D00] truncate max-w-[110px]">
                    ({stats.bestExerciseName})
                  </span>
                </div>
              )}
            </div>

            {/* Quick Metrics Counter */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-[#2A1B14] bg-[#121113] p-2.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Total Récords
                </span>
                <p className="text-xl font-black text-white mt-0.5">{stats.total}</p>
                <span className="text-[10px] text-[#71717A]">ejercicios dominados</span>
              </div>

              <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.08] p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
                  <Flame size={12} />
                  <span>Récords Recientes</span>
                </div>
                <p className="text-xl font-black text-amber-300 mt-0.5">
                  {stats.recentCount}
                </p>
                <span className="text-[10px] text-amber-200/70">últimos 14 días</span>
              </div>

              <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.08] p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-300">
                  <AlertTriangle size={12} />
                  <span>En Meseta</span>
                </div>
                <p className="text-xl font-black text-rose-300 mt-0.5">
                  {stats.plateauCount}
                </p>
                <span className="text-[10px] text-rose-200/70">&gt;40 días sin PR</span>
              </div>

              <div
                onClick={() => window.dispatchEvent(new CustomEvent("fittracker:openProfile"))}
                className="rounded-xl border border-[#2A1B14] bg-[#121113] p-2.5 text-center cursor-pointer hover:border-[#FF5722]/50 transition active:scale-95"
                title="Editar peso corporal para fuerza relativa"
              >
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#FF6D00]">
                  <Scale size={12} />
                  <span>Peso Corporal</span>
                </div>
                <p className="text-base font-black text-white mt-0.5">
                  {userProfile?.bodyweight ? `${userProfile.bodyweight} kg` : "75 kg"}
                </p>
                <span className="text-[10px] text-[#A1A1AA]">
                  base fuerza relativa
                </span>
              </div>
            </div>
          </div>

          {/* Controls: Real-Time Search Bar & Sorting */}
          <div className="rounded-2xl border border-[#2A1B14] bg-[#181210] p-3.5 sm:p-4 shadow-card space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]"
                  size={18}
                />
                <input
                  type="search"
                  inputMode="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar ejercicio en el Medallero (ej: Press Plano, Sentadilla, Curl)..."
                  className="iron-input pl-10 pr-9 text-sm"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                <span className="text-[11px] font-bold text-[#71717A]">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-[#2A1B14] bg-[#121113] px-2.5 py-2 text-xs font-bold text-white outline-none focus:border-[#FF5722]"
                >
                  <option value="recent">Más recientes (Fecha)</option>
                  <option value="weight">Mayor peso levantado (kg)</option>
                  <option value="1rm">Mayor 1RM estimado</option>
                  <option value="gain">Mayor ganancia neta (%)</option>
                  <option value="name">Nombre (A - Z)</option>
                </select>
              </div>
            </div>

            {/* Muscle Pills Selector: [Todos | Pecho | Pierna | Espalda | Hombro | Brazos | Core] */}
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-[#A1A1AA]">
                <Filter size={12} className="text-[#FF6D00]" />
                <span>Grupos Musculares:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {MUSCLE_PILLS.map((pill) => {
                  const isSelected = selectedPill === pill;
                  const count = pillCounts[pill] || 0;
                  return (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => setSelectedPill(pill)}
                      className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-gradient-to-r from-[#C84218] to-[#7E22CE] text-white shadow-neon"
                          : "border border-[#2A1B14] bg-[#121113] text-[#A1A1AA] hover:border-[#FF5722]/40 hover:text-white"
                      }`}
                    >
                      <span>{pill}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-[#2A1B14] text-[#71717A]"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rank Filter Pills: [Todos | Iniciado+ | Guerrero+ | Avanzado+ | Maestro+ | Élite+ | Élite Supremo] */}
            <div className="border-t border-[#2A1B14] pt-2.5">
              <div className="flex items-center justify-between gap-1.5 mb-1.5 text-[11px] font-bold text-[#A1A1AA]">
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-[#FF6D00]" />
                  <span>Filtro por Rango de Fuerza Relativa:</span>
                </div>
                {selectedRankFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedRankFilter("all")}
                    className="text-[10px] text-[#FF5722] hover:underline font-bold"
                  >
                    Ver todos ({records.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {RANK_FILTER_OPTIONS.map((opt) => {
                  const isSelected = selectedRankFilter === opt.id;
                  const count = rankCounts[opt.id] || 0;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedRankFilter(opt.id)}
                      className={`min-h-[36px] rounded-xl px-2.5 py-1 text-xs font-bold transition active:scale-95 flex items-center gap-1.5 border ${
                        isSelected
                          ? "text-white font-black"
                          : "border-[#2A1B14] bg-[#121113] text-[#A1A1AA] hover:border-[#FF5722]/40 hover:text-white"
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: opt.color || "#FF5722",
                              backgroundColor: `${opt.color || "#FF5722"}25`,
                              color: opt.color || "#ffffff",
                              boxShadow: `0 0 12px ${opt.color || "#FF5722"}35`,
                            }
                          : {}
                      }
                    >
                      {opt.icon && <span>{opt.icon}</span>}
                      <span>{opt.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-[#2A1B14] text-[#71717A]"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cards Grid: Salón de la Fama */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredRecords.map((r) => {
              const hasPr = r.pr_weight !== null && r.pr_weight > 0;
              const equipment = getExerciseEquipment(r.exercise_name);
              const status = getPrStatus(r.pr_date);

              const curWeight = parseFloat(r.pr_weight) || 0;
              const curReps = parseInt(r.pr_reps, 10) || 0;
              const prevWeight =
                r.previous_pr_weight !== null && r.previous_pr_weight !== undefined
                  ? parseFloat(r.previous_pr_weight)
                  : null;

              // Net gain calculation
              const hasPrevious = prevWeight !== null && prevWeight > 0;
              const netGainKg = hasPrevious ? +(curWeight - prevWeight).toFixed(1) : null;
              const netGainPct =
                hasPrevious && prevWeight > 0
                  ? Math.round((netGainKg / prevWeight) * 100)
                  : null;

              // 1RM Calculation (Epley formula)
              const est1RM =
                parseFloat(r.best_estimated_1rm) ||
                calculateEstimated1RM(curWeight, curReps);

              // Relative strength ratio and rank calculation (fallback safe to 75kg)
              const userBw = parseFloat(userProfile?.bodyweight) || 75;
              const relativeRatio =
                curWeight > 0 ? (curWeight / userBw).toFixed(2) : null;
              const strengthRank = getStrengthRank(
                r.exercise_name,
                curWeight,
                curReps,
                userBw
              );

              // Medal tier
              let medalIcon = "🥉";
              let medalLabel = "Bronce";
              let medalColor = "from-amber-700/20 to-amber-900/10 border-amber-700/40 text-amber-500";
              if (curWeight >= 100 || (relativeRatio && parseFloat(relativeRatio) >= 1.5)) {
                medalIcon = "🥇";
                medalLabel = "Oro";
                medalColor =
                  "from-amber-400/25 via-yellow-500/20 to-amber-500/25 border-amber-400/70 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]";
              } else if (
                curWeight >= 60 ||
                (relativeRatio && parseFloat(relativeRatio) >= 1.0)
              ) {
                medalIcon = "🥈";
                medalLabel = "Plata";
                medalColor = "from-slate-400/20 to-slate-600/10 border-slate-400/40 text-slate-300";
              }

              return (
                <div
                  key={r.exercise_id}
                  className="rounded-2xl border border-[#2A1B14] bg-[#181210] p-4 shadow-card transition-all duration-200 hover:border-[#FF5722]/50 hover:bg-[#2A1B14] sm:p-5 flex flex-col justify-between space-y-3.5"
                >
                  {/* Card Header: Equipment, Muscle, Status Badge & Medal */}
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-[#2A1B14] pb-3 mb-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Equipment Pill */}
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#2A1B14] bg-[#121113] px-2 py-0.5 text-[10px] font-black text-[#A1A1AA]">
                            {equipment === "Barra" && "🏋️"}
                            {equipment === "Mancuerna" && "⚡"}
                            {equipment === "Polea" && "⛓️"}
                            {equipment === "Máquina" && "⚙️"}
                            <span>{equipment}</span>
                          </span>

                          {/* Muscle Group Pill */}
                          {(r.muscle_group || r.muscle_group_name) && (
                            <span className="rounded-md border border-[#FF5722]/30 bg-[#C84218]/15 px-2 py-0.5 text-[10px] font-bold text-[#FF6D00]">
                              {r.muscle_group || r.muscle_group_name}
                            </span>
                          )}

                          {/* Strength Rank Badge with neon color */}
                          <span
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm transition"
                            style={{
                              borderColor: `${strengthRank.rankColor}70`,
                              backgroundColor: `${strengthRank.rankColor}18`,
                              color: strengthRank.rankColor,
                              boxShadow: `0 0 10px ${strengthRank.rankColor}25`,
                            }}
                            title={`Rango de Fuerza Relativa: ${strengthRank.rankName} (${strengthRank.ratio}× peso corporal)`}
                          >
                            <span>{strengthRank.icon}</span>
                            <span>{strengthRank.rankName}</span>
                            {strengthRank.ratio > 0 && (
                              <span className="opacity-90 font-bold">({strengthRank.ratio}×)</span>
                            )}
                          </span>

                          {/* Status Badge: 🔥 Récord reciente / ⚠️ Meseta */}
                          {status && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black ${status.className}`}
                            >
                              <span>{status.label}</span>
                              {status.type === "recent" && status.days === 0 && (
                                <span className="underline decoration-amber-400">¡Hoy!</span>
                              )}
                              {status.type === "plateau" && (
                                <span className="opacity-90">({status.days}d)</span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Exercise Name */}
                        <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate break-words">
                          {r.exercise_name}
                        </h3>
                      </div>

                      {/* Medal icon box */}
                      <div
                        className="flex h-10 w-10 flex-col items-center justify-center rounded-xl border bg-gradient-to-br flex-shrink-0"
                        style={{
                          borderColor: `${strengthRank.rankColor}60`,
                        }}
                        title={`Medalla de ${medalLabel} • Rango ${strengthRank.rankName}`}
                      >
                        <span className="text-lg leading-none">{medalIcon}</span>
                      </div>
                    </div>

                    {/* PR DESTACADO EN GRANDE (105 kg × 6 reps) */}
                    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] via-purple-500/[0.05] to-transparent p-3.5 text-center sm:text-left space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                          <Trophy size={13} className="text-amber-400" />
                          <span>Récord Actual Destacado</span>
                        </span>
                        <span className="text-[11px] font-bold text-[#71717A]">
                          {formatDate(r.pr_date)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-baseline gap-2 justify-center sm:justify-start">
                        <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                          {hasPr ? `${curWeight} kg × ${curReps} reps` : `${curReps} reps`}
                        </span>

                        {relativeRatio && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#FF5722]/40 bg-[#C84218]/20 px-2 py-0.5 text-xs font-black text-[#FF6D00]">
                            <Scale size={11} />
                            <span>{relativeRatio}× tu peso</span>
                          </span>
                        )}
                      </div>

                      {/* Concise OLED Strength Rank Badge: "Rango actual: [Nombre]" y "Próximo rango: X kg" */}
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-[#FF5722]/30 bg-[#050505] shadow-[0_0_12px_rgba(255,87,34,0.08)] text-xs mt-2">
                        <span className="font-semibold text-[#E4E4E7] flex items-center gap-1.5">
                          <span className="text-[#A1A1AA]">Rango actual:</span>
                          <strong
                            className="font-black uppercase tracking-wider"
                            style={{ color: strengthRank.rankColor || "#FF5722" }}
                          >
                            {strengthRank.rankName}
                          </strong>
                          {strengthRank.ratio > 0 && (
                            <span className="text-[10px] text-[#71717A] font-normal">
                              ({strengthRank.ratio}× BW)
                            </span>
                          )}
                        </span>

                        <span className="text-[11px] font-medium text-[#A1A1AA]">
                          {strengthRank.tier < 6 && strengthRank.nextRankTargetKg ? (
                            <>
                              Próximo rango:{" "}
                              <strong className="font-black text-[#FF5722]">
                                {strengthRank.nextRankTargetKg} kg
                              </strong>
                            </>
                          ) : (
                            <strong className="font-black text-amber-300">👑 Rango Máximo</strong>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* METRICAS AVANZADAS: 1RM, RECORD ANTERIOR Y GANANCIA NETA */}
                  <div className="space-y-2 border-t border-[#2A1B14]/80 pt-3 text-xs">
                    {/* 1RM CALCULADO */}
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#2A1B14] bg-[#121113] px-3 py-2">
                      <div className="flex items-center gap-1.5 text-[#A1A1AA] font-bold">
                        <Zap size={14} className="text-[#FF6D00]" />
                        <span>1RM Estimado:</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-white">
                          {est1RM > 0 ? `${est1RM} kg` : "--"}
                        </span>
                        <span className="text-[10px] text-[#71717A]">(Epley)</span>
                      </div>
                    </div>

                    {/* RECORD ANTERIOR PARA COMPARAR */}
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#2A1B14] bg-[#121113] px-3 py-2">
                      <div className="flex items-center gap-1.5 text-[#A1A1AA] font-medium">
                        <TrendingUp size={14} className="text-[#71717A]" />
                        <span>Récord Anterior:</span>
                      </div>
                      <div className="text-right">
                        {hasPrevious ? (
                          <span className="font-bold text-white">
                            Superó los {prevWeight} kg el{" "}
                            {formatDateSafe(r.previous_pr_date, {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        ) : (
                          <span className="text-[#71717A] italic text-[11px]">
                            Marca base inicial ({formatDateSafe(r.pr_date, { day: "numeric", month: "short" })})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* GANANCIA NETA (+X kg / +X%) */}
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#2A1B14] bg-[#121113] px-3 py-2">
                      <span className="text-[#A1A1AA] font-medium">Ganancia Neta:</span>
                      <div>
                        {hasPrevious && netGainKg !== null ? (
                          netGainKg > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#34D399]/40 bg-[#34D399]/15 px-2 py-0.5 text-xs font-black text-[#34D399] shadow-sm">
                              <ArrowUpRight size={13} />
                              <span>+{netGainKg} kg (+{netGainPct}%)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#FF6D00]/30 bg-[#FF6D00]/10 px-2 py-0.5 text-xs font-bold text-[#FF6D00]">
                              ✓ Carga consolidada ({curReps} reps)
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-[#2A1B14] px-2 py-0.5 text-[11px] font-bold text-[#FF6D00]">
                            ⭐ Marca inicial de partida
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Visual (Previous PR vs Current PR) */}
                    {hasPrevious && curWeight > 0 && prevWeight > 0 && (
                      <div className="pt-1">
                        <div className="flex justify-between text-[10px] text-[#71717A] mb-1">
                          <span>Anterior: {prevWeight} kg</span>
                          <span className="text-amber-300 font-black">Nuevo: {curWeight} kg</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#121113] overflow-hidden border border-[#2A1B14]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#C84218] via-amber-400 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(20, Math.round((prevWeight / curWeight) * 100))
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredRecords.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-[#2A1B14] bg-[#181210]/60 p-8 text-center sm:p-12 space-y-3">
                <Trophy size={42} className="mx-auto text-[#71717A]" />
                <h3 className="text-base font-bold text-white">
                  No hay récords que coincidan con la búsqueda
                </h3>
                <p className="max-w-md mx-auto text-xs text-[#A1A1AA]">
                  {records.length === 0
                    ? "Aún no registraste entrenamientos. Completá tu primera sesión para ingresar automáticamente en el Salón de la Fama."
                    : `No encontramos ningún ejercicio para el filtro "${selectedPill}" con "${search}". Probá seleccionar "Todos".`}
                </p>
                {selectedPill !== "Todos" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPill("Todos");
                      setSearch("");
                    }}
                    className="iron-btn-secondary text-xs"
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HISTORIAL DE ENTRENAMIENTOS (MANTENIDO Y OPTIMIZADO) */}
      {activeTab === "history" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {workouts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2A1B14] bg-[#181210]/60 p-10 text-center sm:p-12">
              <Dumbbell size={36} className="mx-auto text-[#71717A]" />
              <h3 className="mt-3 text-base font-bold text-white">
                No hay sesiones guardadas en el historial
              </h3>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Iniciá tu sesión en la pestaña "Entrenar Hoy" para comenzar tu registro.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workouts.map((w) => {
                const isExpanded = expandedWorkoutId === w.id;
                const grouped = {};
                (w.sets || []).forEach((s) => {
                  const name = s.exercise_name || `Ejercicio #${s.exercise_id}`;
                  if (!grouped[name]) grouped[name] = [];
                  grouped[name].push(s);
                });

                const totalVol = (w.sets || []).reduce(
                  (acc, s) => acc + (s.weight || 0) * (s.reps || 0),
                  0
                );
                const isWillpowerDay = Boolean(
                  (w.readiness_energy && w.readiness_energy <= 2) ||
                  (w.mental_effort && w.mental_effort >= 4)
                );

                return (
                  <div
                    key={w.id}
                    className="rounded-2xl border border-[#2A1B14] bg-[#181210] overflow-hidden shadow-card transition hover:border-[#FF5722]/30"
                  >
                    <div
                      onClick={() =>
                        setExpandedWorkoutId(isExpanded ? null : w.id)
                      }
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 cursor-pointer hover:bg-[#2A1B14]/70 transition select-none"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#C84218] to-[#7E22CE] text-white shadow-neon flex-shrink-0">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black capitalize text-white">
                              {formatDate(w.date)}
                            </h3>
                            {w.muscle_group_name && (
                              <span className="rounded-md border border-[#2A1B14] bg-[#121113] px-2 py-0.5 text-[10px] font-bold text-[#FF6D00]">
                                {w.muscle_group_name}
                              </span>
                            )}
                            {isWillpowerDay && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300 shadow-sm">
                                <Sparkles size={11} className="text-amber-400" />
                                <span>Voluntad de Hierro</span>
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[#A1A1AA]">
                            {Object.keys(grouped).length} ejercicios · {(w.sets || []).length} series · ~{Math.round(totalVol)} kg de volumen
                          </p>
                          {(w.readiness_energy || w.readiness_motivation || w.mental_effort) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {w.readiness_energy && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-[#121113] px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                  ⚡ {w.readiness_energy}/5
                                </span>
                              )}
                              {w.readiness_motivation && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-[#121113] px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
                                  🔥 {w.readiness_motivation}/5
                                </span>
                              )}
                              {w.mental_effort && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-[#121113] px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                                  🧠 {w.mental_effort}/5
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkout(w.id);
                          }}
                          className="text-[#71717A] hover:text-red-400 transition p-2 min-h-[44px] flex items-center justify-center"
                          title="Eliminar sesión"
                        >
                          <Trash2 size={18} />
                        </button>
                        <span className="text-[#FF5722] p-1">
                          {isExpanded ? (
                            <ChevronUp size={22} />
                          ) : (
                            <ChevronDown size={22} />
                          )}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#2A1B14] bg-[#121113]/90 p-4 sm:p-5 space-y-3.5">
                        {isWillpowerDay && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center gap-2">
                            <Sparkles size={16} className="text-amber-400 flex-shrink-0" />
                            <span><strong>Sesión de Voluntad de Hierro:</strong> Superaste el entrenamiento en condiciones de alta exigencia mental o baja energía inicial.</span>
                          </div>
                        )}
                        {w.notes && (
                          <div className="rounded-xl border border-[#2A1B14] bg-[#181210] p-3 text-xs text-[#A1A1AA]">
                            <span className="font-bold text-white block mb-0.5">
                              Notas de la sesión:
                            </span>
                            {w.notes}
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {Object.entries(grouped).map(([exName, sets]) => (
                            <div
                              key={exName}
                              className="rounded-xl border border-[#2A1B14] bg-[#181210] p-3.5 space-y-2"
                            >
                              <h4 className="text-sm font-bold text-white truncate">
                                {exName}
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {sets.map((s) => (
                                  <span
                                    key={s.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#2A1B14] bg-[#121113] px-2.5 py-1 text-xs font-bold text-white"
                                  >
                                    <span className="text-[#71717A]">
                                      #{s.set_number}
                                    </span>
                                    <span>
                                      {s.weight}kg × {s.reps}
                                    </span>
                                    {s.completed && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
