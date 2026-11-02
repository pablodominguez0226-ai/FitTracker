import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Loader2,
  Search,
  TrendingUp,
} from "lucide-react";
import { getExerciseHistory, getExercises, getRecords } from "../api/client";

export default function ExerciseProgressCard({ defaultExerciseId = null, onSelectExercise }) {
  const [exercises, setExercises] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(defaultExerciseId);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [isOpenSelect, setIsOpenSelect] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Cargar catálogo de ejercicios disponibles
  useEffect(() => {
    let mounted = true;
    const loadExercisesCatalog = async () => {
      try {
        setLoadingList(true);
        const [exList, recs] = await Promise.all([
          getExercises().catch(() => []),
          getRecords().catch(() => []),
        ]);

        if (!mounted) return;

        const safeRecs = Array.isArray(recs)
          ? recs
          : recs && typeof recs === "object"
          ? Object.values(recs)
          : [];
        const recordsExIds = new Set(
          safeRecs.filter((r) => r && r.exercise_id).map((r) => r.exercise_id)
        );
        const safeExList = Array.isArray(exList)
          ? exList
          : exList && typeof exList === "object"
          ? Object.values(exList)
          : [];
        const cleanList = safeExList
          .filter((e) => e && e.is_active !== false)
          .sort((a, b) => {
            const aHasRec = recordsExIds.has(a.id);
            const bHasRec = recordsExIds.has(b.id);
            if (aHasRec && !bHasRec) return -1;
            if (!aHasRec && bHasRec) return 1;
            return (a?.name || "").localeCompare(b?.name || "");
          });

        setExercises(cleanList);

        // Elegir ejercicio por defecto: Press de banca plano o el primero con récords
        if (!selectedExerciseId && cleanList.length > 0) {
          const bench =
            cleanList.find((e) =>
              e?.name && e.name.toLowerCase().includes("press banca plano con barra")
            ) ||
            cleanList.find((e) =>
              e?.name && e.name.toLowerCase().includes("press banca")
            ) ||
            cleanList[0];

          if (bench?.id) {
            setSelectedExerciseId(bench.id);
          }
        }
      } catch (err) {
        console.error("Error cargando ejercicios para comparativa de fuerza:", err);
      } finally {
        if (mounted) setLoadingList(false);
      }
    };

    loadExercisesCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  // Cargar historial del ejercicio seleccionado
  useEffect(() => {
    if (!selectedExerciseId) return;
    let mounted = true;

    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const data = await getExerciseHistory(selectedExerciseId);
        if (mounted) {
          setHistoryData(data);
        }
      } catch (err) {
        console.error("Error cargando historial de ejercicio:", err);
        if (mounted) {
          setHistoryData(null);
        }
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    };

    fetchHistory();
    return () => {
      mounted = false;
    };
  }, [selectedExerciseId]);

  const selectedExercise = useMemo(() => {
    return exercises.find((e) => e.id === selectedExerciseId) || null;
  }, [exercises, selectedExerciseId]);

  const filteredExercises = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        (e?.name && e.name.toLowerCase().includes(q)) ||
        (e?.muscle_group_name && e.muscle_group_name.toLowerCase().includes(q))
    );
  }, [exercises, searchFilter]);

  // Comparativa directa de las últimas 2 sesiones (sin gráficos complejos ni 1RM teórico)
  const comparisonData = useMemo(() => {
    const sessions = historyData?.history || [];
    if (sessions.length === 0) {
      return { hasData: false };
    }

    const lastSession = sessions[sessions.length - 1];
    const prevSession = sessions.length >= 2 ? sessions[sessions.length - 2] : null;

    const lastWeight = Number(lastSession?.max_weight ?? historyData?.current_max_weight ?? 0);
    const prevWeight = prevSession ? Number(prevSession.max_weight ?? 0) : lastWeight;
    const diff = Math.round((lastWeight - prevWeight) * 10) / 10;

    let statusMessage = "⚪ Carga constante: Levantaste lo mismo que la sesión anterior.";
    let badgeClass = "border-slate-100 bg-slate-50 text-[#0F172A]";

    if (sessions.length >= 2) {
      if (diff > 0) {
        statusMessage = `🟢 Hubo crecimiento: +${diff} kg respecto a la semana pasada (o último mes).`;
        badgeClass = "border-red-500/30 bg-red-500/10 text-red-500";
      } else if (diff < 0) {
        statusMessage = `🔴 Bajó ${Math.abs(diff)} kg respecto a la anterior.`;
        badgeClass = "border-rose-500/30 bg-rose-500/10 text-rose-400";
      } else {
        statusMessage = "⚪ Carga constante: Levantaste lo mismo que la sesión anterior.";
        badgeClass = "border-slate-100 bg-slate-50 text-[#0F172A]";
      }
    }

    return {
      hasData: true,
      lastWeight,
      prevWeight,
      hasPrevious: Boolean(prevSession),
      statusMessage,
      badgeClass,
    };
  }, [historyData]);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 space-y-4 select-none">
      {/* Cabecera y Selector Desplegable */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex-shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Comparativa Directa
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">
              Evolución de Fuerza
            </h3>
          </div>
        </div>

        {/* Selector Desplegable de Ejercicio */}
        <div className="relative w-full sm:w-64">
          <button
            type="button"
            onClick={() => setIsOpenSelect((prev) => !prev)}
            className="w-full h-11 px-3.5 py-2 rounded-xl border border-slate-100 bg-slate-50 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between gap-2 hover:border-red-500/50 active:scale-[0.99] transition cursor-pointer"
          >
            <span className="truncate">
              {selectedExercise ? (selectedExercise?.name || "Press banca") : "Seleccionar ejercicio..."}
            </span>
            <ChevronDown
              size={15}
              className={`text-[#64748B] transition-transform ${isOpenSelect ? "rotate-180" : ""}`}
            />
          </button>

          {isOpenSelect && (
            <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-xl border border-slate-100 bg-white p-2 shadow-2xl space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full h-10 rounded-xl border border-slate-100 bg-[#F9FAFB] pl-8 pr-3 text-xs text-[#0F172A] placeholder:text-[#64748B] outline-none focus:border-red-500"
                  autoFocus
                />
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {filteredExercises.length > 0 ? (
                  filteredExercises.map((ex) => (
                    <button
                      key={ex?.id || Math.random()}
                      type="button"
                      onClick={() => {
                        setSelectedExerciseId(ex.id);
                        setIsOpenSelect(false);
                        setSearchFilter("");
                        if (onSelectExercise) onSelectExercise(ex.id);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between gap-2 ${
                        ex.id === selectedExerciseId
                          ? "bg-red-500/15 text-red-500 font-bold border border-red-500/30"
                          : "text-[#0F172A]/80 hover:bg-slate-50 hover:text-[#0F172A]"
                      }`}
                    >
                      <span className="truncate">{ex?.name || "Ejercicio"}</span>
                      {ex.muscle_group_name && (
                        <span className="text-[10px] text-[#64748B] flex-shrink-0">
                          {ex.muscle_group_name}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-[#64748B]">
                    No se encontraron ejercicios
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido ultra simple de comparativa directa */}
      {loadingHistory || loadingList ? (
        <div className="flex h-20 items-center justify-center text-red-500 gap-2 rounded-xl border border-slate-100 bg-[#F9FAFB]">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-xs text-[#64748B]">Cargando comparativa...</span>
        </div>
      ) : comparisonData.hasData ? (
        <div className="space-y-3">
          {/* Mensaje directo en una línea */}
          <div className={`rounded-xl border px-3.5 py-3 text-xs sm:text-sm font-semibold ${comparisonData.badgeClass}`}>
            {comparisonData.statusMessage}
          </div>

          {/* Datos concisos */}
          <div className="rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 py-3 text-xs sm:text-sm font-bold text-[#0F172A] flex items-center justify-between sm:justify-start gap-3">
            <span>
              Última marca: <strong className="text-red-500">{comparisonData.lastWeight} kg</strong>
            </span>
            <span className="text-[#64748B]">|</span>
            <span>
              Anterior: <strong className="text-[#0F172A]">{comparisonData.prevWeight} kg</strong>
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-4 text-center text-xs text-[#64748B]">
          Sin registros aún para <strong className="text-[#0F172A]">{selectedExercise?.name || "este ejercicio"}</strong>.
        </div>
      )}
    </div>
  );
}
