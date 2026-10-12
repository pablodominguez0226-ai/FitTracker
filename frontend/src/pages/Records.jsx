import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Loader2,
  Search,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { deleteWorkout, getRecords, getWorkouts } from "../api/client";
import Header from "../components/Header";
import { formatDateSafe } from "../utils/dateUtils";

const MUSCLE_PILLS = [
  "Todos",
  "Pecho",
  "Espalda",
  "Piernas",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Core",
];

const SPANISH_SHORT_MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function formatLastDate(dateVal) {
  if (!dateVal) return "";
  try {
    const raw = String(dateVal).split("T")[0];
    const parts = raw.split("-");
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const mIdx = parseInt(parts[1], 10) - 1;
      const month = SPANISH_SHORT_MONTHS[mIdx] || "";
      return `${day}/${month}`;
    }
  } catch {}
  return String(dateVal);
}

function matchMuscle(record, selectedGroup) {
  if (!selectedGroup || selectedGroup === "Todos") return true;
  const mg = (record?.muscle_group || record?.muscle_group_name || "").toLowerCase().trim();
  const sel = selectedGroup.toLowerCase().trim();
  if (mg.includes(sel)) return true;
  if (sel === "piernas" && mg.includes("pierna")) return true;
  if (sel === "hombros" && mg.includes("hombro")) return true;
  if (sel === "bíceps" && (mg.includes("bicep") || mg.includes("bícep"))) return true;
  if (sel === "tríceps" && (mg.includes("tricep") || mg.includes("trícep"))) return true;
  return false;
}

export default function Records({ defaultTab = "records" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [records, setRecords] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedPill, setSelectedPill] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recs, wList] = await Promise.all([
        getRecords().catch(() => []),
        getWorkouts().catch(() => []),
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
    } catch (err) {
      console.error("Error cargando datos de récords/historial:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleRecordUpdated = () => loadData();
    const handleWorkoutSaved = () => loadData();

    window.addEventListener("fittracker:recordUpdated", handleRecordUpdated);
    window.addEventListener("fittracker:workoutSaved", handleWorkoutSaved);

    return () => {
      window.removeEventListener("fittracker:recordUpdated", handleRecordUpdated);
      window.removeEventListener("fittracker:workoutSaved", handleWorkoutSaved);
    };
  }, [loadData]);

  const filteredRecords = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const recsList = Array.isArray(records)
      ? records
      : records && typeof records === "object"
      ? Object.values(records)
      : [];

    return recsList
      .filter((r) => {
        if (!r) return false;
        const matchesName =
          !q ||
          (r.exercise_name || "").toLowerCase().includes(q) ||
          (r.muscle_group || "").toLowerCase().includes(q);
        const matchesGroup = matchMuscle(r, selectedPill);
        return matchesName && matchesGroup;
      })
      .sort((a, b) => (a.exercise_name || "").localeCompare(b.exercise_name || ""));
  }, [records, search, selectedPill]);

  const handleDeleteWorkout = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar esta sesión del historial?")) {
      return;
    }
    const backup = workouts;
    setWorkouts((prev) => (prev || []).filter((w) => w?.id !== id));
    try {
      await deleteWorkout(id);
      const updatedRecs = await getRecords();
      setRecords(
        Array.isArray(updatedRecs)
          ? updatedRecs
          : updatedRecs && typeof updatedRecs === "object"
          ? Object.values(updatedRecs)
          : []
      );
    } catch (err) {
      console.error("Error eliminando sesión:", err);
      setWorkouts(backup);
      alert("No se pudo eliminar la sesión.");
    }
  };

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
        <p className="text-sm font-semibold text-[#8E8E93]">Cargando Récords...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <Header
        title="Récords e Historial"
        subtitle="Tus mejores marcas personales y última sesión"
      />

      {/* Selector Récords / Historial */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#2C2C2E] bg-[#121212] p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("records")}
          className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer ${
            activeTab === "records"
              ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
              : "text-[#8E8E93] hover:text-white hover:bg-white/5"
          }`}
        >
          <Trophy
            size={16}
            className={activeTab === "records" ? "text-[#FF5722]" : "text-[#8E8E93]"}
          />
          <span>Récords ({(records || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer ${
            activeTab === "history"
              ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
              : "text-[#8E8E93] hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar
            size={16}
            className={activeTab === "history" ? "text-white" : "text-[#8E8E93]"}
          />
          <span>Historial ({(workouts || []).length})</span>
        </button>
      </div>

      {/* VISTA 1: RÉCORDS */}
      {activeTab === "records" && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Buscador Rápido por Nombre */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]"
              size={18}
            />
            <input
              type="search"
              inputMode="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ejercicio por nombre..."
              className="w-full min-h-[44px] rounded-2xl border border-[#2C2C2E] bg-[#121212] pl-10 pr-9 text-sm text-white placeholder:text-[#8E8E93] outline-none focus:border-[#FF5722]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtro Opcional por Grupo Muscular */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {MUSCLE_PILLS.map((pill) => {
              const isSelected = selectedPill === pill;
              return (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setSelectedPill(pill)}
                  className={`min-h-[34px] rounded-xl px-3 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-[#FF5722] text-white shadow-sm"
                      : "border border-[#2C2C2E] bg-[#121212] text-[#8E8E93] hover:border-white/20 hover:text-white"
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>

          {/* Tarjetas Limpias y Minimalistas de Ejercicio */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(filteredRecords || []).map((r) => (
              <div
                key={r?.exercise_id || r?.exercise_name}
                className="rounded-2xl border border-[#2C2C2E] bg-[#121212] p-4 flex flex-col justify-between gap-3 hover:border-[#FF5722]/40 transition shadow-sm"
              >
                {/* Cabecera de Tarjeta: Nombre en blanco nítido y Chip sutil de tendencia */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-white tracking-tight leading-snug break-words">
                      {r.exercise_name}
                    </h3>
                    {r.muscle_group && (
                      <span className="text-[11px] font-medium text-[#8E8E93] mt-0.5 block">
                        {r.muscle_group}
                      </span>
                    )}
                  </div>

                  {/* Chip sutil de tendencia */}
                  {r.improved ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 whitespace-nowrap flex-shrink-0">
                      <span>▲</span>
                      <span>
                        {r.diff_weight && r.diff_weight > 0
                          ? `+${r.diff_weight} kg`
                          : "Superado"}
                      </span>
                    </span>
                  ) : !r.pr_weight || r.pr_weight <= 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2C2C2E] bg-[#050505] px-2.5 py-0.5 text-xs font-medium text-[#8E8E93] whitespace-nowrap flex-shrink-0">
                      <span className="text-[7px]">●</span>
                      <span>Sin registros</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2C2C2E] bg-[#050505] px-2.5 py-0.5 text-xs font-medium text-[#8E8E93] whitespace-nowrap flex-shrink-0">
                      <span className="text-[7px]">●</span>
                      <span>Estable</span>
                    </span>
                  )}
                </div>

                {/* Métricas: Récord Máximo y Última Sesión */}
                <div className="space-y-2 pt-1 border-t border-[#2C2C2E]/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] block">
                      Récord Máximo
                    </span>
                    {r.pr_weight && r.pr_weight > 0 ? (
                      <p className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                        {r.pr_weight} kg × {r.pr_reps ?? 0} reps
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-[#8E8E93] tracking-tight mt-0.5">
                        Sin registros aún (-- kg)
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-[#8E8E93] flex items-center justify-between gap-1 pt-1 border-t border-[#2C2C2E]/30">
                    <span className="text-[#8E8E93]">Última sesión:</span>
                    <span className="text-slate-200 font-semibold text-right">
                      {r.last_weight !== null && r.last_weight !== undefined && r.last_weight > 0
                        ? `${r.last_weight} kg × ${r.last_reps || 0} reps${r.last_date ? ` el ${formatLastDate(r.last_date)}` : ""}`
                        : "--"}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filteredRecords.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-[#2C2C2E] bg-[#121212] p-8 text-center text-xs text-[#8E8E93]">
                {(records || []).length === 0
                  ? "Aún no registraste entrenamientos. Registrá tu primera sesión para ver tus récords."
                  : "No hay ejercicios que coincidan con el filtro o búsqueda."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: HISTORIAL DE ENTRENAMIENTOS */}
      {activeTab === "history" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {(workouts || []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2C2C2E] bg-[#121212] p-8 text-center">
              <Dumbbell size={32} className="mx-auto text-[#8E8E93]" />
              <p className="mt-2 text-xs text-[#8E8E93]">
                No hay sesiones guardadas en el historial.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(workouts || []).map((w) => {
                const isExpanded = expandedWorkoutId === w?.id;
                const grouped = {};
                (w?.sets || []).forEach((s) => {
                  const name =
                    s?.exercise_name ||
                    (s?.exercise_id ? `Ejercicio #${s.exercise_id}` : "Ejercicio");
                  if (!grouped[name]) grouped[name] = [];
                  grouped[name].push(s);
                });

                const totalVol = (w?.sets || []).reduce(
                  (acc, s) =>
                    acc + (parseFloat(s?.weight) || 0) * (parseInt(s?.reps, 10) || 0),
                  0
                );

                return (
                  <div
                    key={w?.id || Math.random()}
                    className="rounded-2xl border border-[#2C2C2E] bg-[#121212] overflow-hidden transition hover:border-[#FF5722]/30"
                  >
                    <div
                      onClick={() =>
                        setExpandedWorkoutId(isExpanded ? null : w?.id)
                      }
                      className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-white/5 transition select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white flex-shrink-0">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold capitalize text-white">
                              {formatDate(w?.date)}
                            </h3>
                            {w?.muscle_group_name && (
                              <span className="rounded-md border border-[#2C2C2E] bg-[#050505] px-2 py-0.5 text-[10px] font-semibold text-[#FF5722]">
                                {w.muscle_group_name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#8E8E93] mt-0.5">
                            {Object.keys(grouped).length} ejercicios · {(w?.sets || []).length} series · ~{Math.round(totalVol)} kg
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (w?.id) handleDeleteWorkout(w.id);
                          }}
                          className="text-[#8E8E93] hover:text-red-400 p-2 transition cursor-pointer"
                          title="Eliminar sesión"
                        >
                          <Trash2 size={16} />
                        </button>
                        <span className="text-[#FF5722]">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#2C2C2E] bg-[#050505] p-3.5 space-y-2.5">
                        {w?.notes && (
                          <div className="text-xs text-[#8E8E93] bg-[#121212] p-2.5 rounded-xl border border-[#2C2C2E]">
                            <span className="font-semibold text-white block">Notas:</span>
                            {w.notes}
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {Object.entries(grouped).map(([exName, sets]) => (
                            <div
                              key={exName}
                              className="rounded-xl border border-[#2C2C2E] bg-[#121212] p-2.5 space-y-1.5"
                            >
                              <h4 className="text-xs font-bold text-white truncate">
                                {exName}
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {(sets || []).map((s) => (
                                  <span
                                    key={s?.id || Math.random()}
                                    className="inline-flex items-center gap-1 rounded-md border border-[#2C2C2E] bg-[#050505] px-2 py-0.5 text-[11px] font-semibold text-white"
                                  >
                                    <span className="text-[#8E8E93]">#{s?.set_number}</span>
                                    <span>{s?.weight}kg × {s?.reps}</span>
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
