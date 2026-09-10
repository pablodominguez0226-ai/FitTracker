import React, { useEffect, useMemo, useState } from "react";
import {
  Brain,
  Calendar,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flame,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Trophy,
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
import { formatDateSafe } from "../utils/dateUtils";

export default function Records({ defaultTab = "records" }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'records' | 'history'
  const [records, setRecords] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [userLevel, setUserLevel] = useState("intermedio");
  const [userProfile, setUserProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recs, groups, wList, profile] = await Promise.all([
        getRecords(),
        getMuscleGroups(),
        getWorkouts(),
        getProfile().catch(() => getUserProfile().catch(() => null)),
      ]);
      setRecords(recs);
      setMuscleGroups(groups);
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
    // Optimistic UI update: immediate removal
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    try {
      await deleteWorkout(id);
      // Refresh records in background as deleting a workout might affect PRs
      const updatedRecs = await getRecords();
      setRecords(updatedRecs);
    } catch (err) {
      console.error(err);
      setWorkouts(backup);
      alert("No se pudo eliminar la sesión.");
    }
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchSearch = r.exercise_name.toLowerCase().includes(q);
      const matchGroup =
        selectedGroup === "all" || String(r.muscle_group_id) === String(selectedGroup);
      return matchSearch && matchGroup;
    });
  }, [records, search, selectedGroup]);

  const totalPRs = useMemo(() => {
    return records.filter((r) => r.pr_weight && r.pr_weight > 0).length;
  }, [records]);

  const formatDate = (val) =>
    formatDateSafe(val, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[#A855F7]">
        <Loader2 size={34} className="animate-spin" />
        <p className="text-sm font-semibold text-[#A1A1AA]">
          Cargando registros del gimnasio...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      <Header
        title="Mis Récords / Historial"
        subtitle="Monitoreá tus marcas máximas y revisá cada sesión realizada"
      />

      {/* Segmented Top Switcher (Mobile Ergonomic) */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-1.5 shadow-card">
        <button
          type="button"
          onClick={() => setActiveTab("records")}
          className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-extrabold transition active:scale-95 ${
            activeTab === "records"
              ? "bg-gradient-to-r from-[#9333EA] to-[#7E22CE] text-white shadow-neon"
              : "text-[#A1A1AA] hover:text-white hover:bg-[#1C1433]"
          }`}
        >
          <Trophy size={16} className={activeTab === "records" ? "text-white" : "text-[#C084FC]"} />
          <span>Récords PR ({totalPRs})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-extrabold transition active:scale-95 ${
            activeTab === "history"
              ? "bg-gradient-to-r from-[#9333EA] to-[#7E22CE] text-white shadow-neon"
              : "text-[#A1A1AA] hover:text-white hover:bg-[#1C1433]"
          }`}
        >
          <Calendar size={16} className={activeTab === "history" ? "text-white" : "text-[#A855F7]"} />
          <span>Historial ({workouts.length})</span>
        </button>
      </div>

      {/* TAB 1: PRs & BENCHMARKS */}
      {activeTab === "records" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Level PR Explanation Banner */}
          <div className="rounded-2xl border border-[#2D1B4E] bg-gradient-to-r from-[#1C1433] via-[#140E24] to-[#0E0919] p-4 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#9333EA]/20 text-xs font-black text-[#C084FC]">
                    <Trophy size={13} />
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    {userLevel === "principiante" && "Concepto de PR (Récord Personal) para Principiantes"}
                    {userLevel === "intermedio" && "Progresión & Consolidación de PRs (Nivel Intermedio)"}
                    {userLevel === "avanzado" && "Análisis de PRs, Peaking & Rendimiento Máximo (Nivel Avanzado)"}
                  </h3>
                  <span className="rounded-md border border-[#A855F7]/30 bg-[#9333EA]/15 px-2 py-0.5 text-[9px] font-black uppercase text-[#C084FC]">
                    {userLevel}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {userLevel === "principiante" &&
                    "Tu PR es tu récord histórico de carga o repeticiones. No necesitas intentar batirlo en cada entrenamiento: mientras mantengas la técnica estricta y descanses 90-120s, tus marcas progresarán naturalmente semana a semana."}
                  {userLevel === "intermedio" &&
                    "Para generar nuevos PRs, aplicá la progresión doble: primero alcanzá el tope de repeticiones (ej: 12 reps con RIR 1-2) y luego añadí micro-cargas (+1.25kg a 2.5kg). Consolidar la carga antes de subir evita estancamientos."}
                  {userLevel === "avanzado" &&
                    "Los PRs a nivel avanzado requieren periodización ondulante y picos de fuerza programados. Diferenciá entre PR absoluto de 1RM y PR de tonelaje acumulado, y utilizá semanas de descarga activa para disipar fatiga del SNC antes de nuevos récords."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("fittracker:openProfile"))}
                className="self-start sm:self-center flex-shrink-0 text-[11px] font-bold text-[#C084FC] hover:underline"
              >
                Ver guía de nivel →
              </button>
            </div>
          </div>

          {/* Filters: Search & Muscle Tabs */}
          <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5 sm:p-4 shadow-card space-y-3">

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]"
                size={18}
              />
              <input
                type="search"
                inputMode="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ejercicio (ej: Press Plano, Sentadilla, Curl)..."
                className="iron-input pl-10 text-sm"
              />
            </div>

            {/* Muscle pills */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setSelectedGroup("all")}
                className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                  selectedGroup === "all"
                    ? "bg-gradient-to-r from-[#9333EA] to-[#7E22CE] text-white shadow-neon"
                    : "border border-[#2D1B4E] bg-[#0E0919] text-[#A1A1AA] hover:border-[#A855F7]/40 hover:text-white"
                }`}
              >
                Todos ({records.length})
              </button>
              {muscleGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroup(String(g.id))}
                  className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                    selectedGroup === String(g.id)
                      ? "bg-gradient-to-r from-[#9333EA] to-[#7E22CE] text-white shadow-neon"
                      : "border border-[#2D1B4E] bg-[#0E0919] text-[#A1A1AA] hover:border-[#A855F7]/40 hover:text-white"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Records Cards List */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredRecords.map((r) => {
              const hasPr = r.pr_weight !== null && r.pr_weight > 0;
              const hasLast = r.last_weight !== null && r.last_weight > 0;

              return (
                <div
                  key={r.exercise_id}
                  className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-4 shadow-card transition hover:border-[#A855F7]/40 hover:bg-[#1C1433] sm:p-5"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-[#2D1B4E] pb-3 mb-3">
                    <div>
                      <h3 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                        {r.exercise_name}
                      </h3>
                      {r.muscle_group_name && (
                        <span className="mt-1 inline-block rounded-lg border border-[#2D1B4E] bg-[#0E0919] px-2 py-0.5 text-[10px] font-bold text-[#C084FC]">
                          {r.muscle_group_name}
                        </span>
                      )}
                    </div>

                    {hasPr && (
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#9333EA] to-[#7E22CE] text-white shadow-neon flex-shrink-0">
                        <Trophy size={18} />
                      </span>
                    )}
                  </div>

                  {/* Benchmarks grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* PR Column */}
                    <div className="rounded-xl border border-[#C084FC]/30 bg-[#C084FC]/[0.08] p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#C084FC]">
                        <Trophy size={13} />
                        <span>Récord (PR)</span>
                      </div>
                      <p className="mt-1 text-2xl font-black text-white">
                        {hasPr ? `${r.pr_weight} kg` : "--"}
                      </p>
                      {hasPr && (userProfile?.bodyweight ?? 70) ? (
                        <p className="text-[10px] font-black text-[#C084FC]">
                          {(r.pr_weight / (userProfile?.bodyweight ?? 70)).toFixed(2)}× tu peso
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[11px] font-semibold text-[#A1A1AA]">
                        {hasPr
                          ? `${r.pr_reps} reps · ${formatDate(r.pr_date)}`
                          : "Sin récord"}
                      </p>
                    </div>

                    {/* Last Weight Column */}
                    <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#A1A1AA]">
                        <Zap size={13} className="text-[#A855F7]" />
                        <span>Última Carga</span>
                      </div>
                      <p className="mt-1 text-2xl font-black text-white">
                        {hasLast ? `${r.last_weight} kg` : "--"}
                      </p>
                      {hasLast && (userProfile?.bodyweight ?? 70) ? (
                        <p className="text-[10px] font-black text-[#C084FC]">
                          {(r.last_weight / (userProfile?.bodyweight ?? 70)).toFixed(2)}× tu peso
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[11px] font-medium text-[#71717A]">
                        {hasLast
                          ? `${r.last_reps} reps · ${formatDate(r.last_date)}`
                          : "Sin entrenos"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRecords.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-[#2D1B4E] bg-[#140E24]/60 p-8 text-center sm:p-12">
                <Trophy size={36} className="mx-auto text-[#71717A]" />
                <h3 className="mt-3 text-base font-bold text-white">
                  Aún no hay marcas registradas
                </h3>
                <p className="mt-1 text-xs text-[#A1A1AA]">
                  Completá tu primer entrenamiento para generar récords personales automáticos.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WORKOUT SESSIONS HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {workouts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2D1B4E] bg-[#140E24]/60 p-10 text-center sm:p-12">
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
                    className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] overflow-hidden shadow-card transition hover:border-[#A855F7]/30"
                  >
                    <div
                      onClick={() =>
                        setExpandedWorkoutId(isExpanded ? null : w.id)
                      }
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 cursor-pointer hover:bg-[#1C1433]/70 transition select-none"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#9333EA] to-[#7E22CE] text-white shadow-neon flex-shrink-0">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black capitalize text-white">
                              {formatDate(w.date)}
                            </h3>
                            {w.muscle_group_name && (
                              <span className="rounded-md border border-[#2D1B4E] bg-[#0E0919] px-2 py-0.5 text-[10px] font-bold text-[#C084FC]">
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
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-[#0E0919] px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                  ⚡ {w.readiness_energy}/5
                                </span>
                              )}
                              {w.readiness_motivation && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-[#0E0919] px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
                                  🔥 {w.readiness_motivation}/5
                                </span>
                              )}
                              {w.mental_effort && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-[#0E0919] px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
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
                        <span className="text-[#A855F7] p-1">
                          {isExpanded ? (
                            <ChevronUp size={22} />
                          ) : (
                            <ChevronDown size={22} />
                          )}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#2D1B4E] bg-[#0E0919]/90 p-4 sm:p-5 space-y-3.5">
                        {isWillpowerDay && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center gap-2">
                            <Sparkles size={16} className="text-amber-400 flex-shrink-0" />
                            <span><strong>Sesión de Voluntad de Hierro:</strong> Superaste el entrenamiento en condiciones de alta exigencia mental o baja energía inicial.</span>
                          </div>
                        )}
                        {w.notes && (
                          <div className="rounded-xl border border-[#2D1B4E] bg-[#140E24] p-3 text-xs text-[#A1A1AA]">
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
                              className="rounded-xl border border-[#2D1B4E] bg-[#140E24] p-3.5 space-y-2"
                            >
                              <h4 className="text-sm font-bold text-white truncate">
                                {exName}
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {sets.map((s) => (
                                  <span
                                    key={s.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#2D1B4E] bg-[#0E0919] px-2.5 py-1 text-xs font-bold text-white"
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


