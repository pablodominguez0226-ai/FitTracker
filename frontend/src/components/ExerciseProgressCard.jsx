import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Dumbbell,
  Loader2,
  Search,
  Sparkles,
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

        // Combinar ejercicios priorizando aquellos con récord / uso
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
        console.error("Error cargando ejercicios para curva de fuerza:", err);
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

  // Preparar puntos del gráfico SVG con las últimas 6 sesiones
  const chartPointsData = useMemo(() => {
    const rawSessions = historyData?.history || [];
    // Tomar las últimas 6 sesiones para claridad visual en mobile
    const sessions = rawSessions.slice(-6);

    if (sessions.length === 0) {
      return {
        hasData: false,
        sessions: [],
        svgPoints: [],
        pathD: "",
        areaD: "",
        minW: 0,
        maxW: 0,
      };
    }

    const weights = sessions.map((s) => s.max_weight);
    const minW = Math.max(0, Math.min(...weights) - 5);
    const maxW = Math.max(...weights) + 5;
    const range = maxW - minW || 1;

    const width = 320;
    const height = 120;
    const paddingTop = 20;
    const paddingBottom = 26;
    const usableHeight = height - paddingTop - paddingBottom;

    const svgPoints = sessions.map((s, idx) => {
      const x =
        sessions.length === 1
          ? width / 2
          : (idx / (sessions.length - 1)) * (width - 36) + 18;
      const y = height - paddingBottom - ((s.max_weight - minW) / range) * usableHeight;
      return {
        x,
        y,
        weight: s.max_weight,
        dateLabel: s.date_label,
        estimated1rm: s.estimated_1rm,
        reps: s.max_reps,
      };
    });

    let pathD = "";
    if (svgPoints.length === 1) {
      pathD = `M ${svgPoints[0].x - 25} ${svgPoints[0].y} L ${svgPoints[0].x + 25} ${svgPoints[0].y}`;
    } else {
      pathD = svgPoints.reduce(
        (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
        ""
      );
    }

    const areaD =
      svgPoints.length > 1
        ? `${pathD} L ${svgPoints[svgPoints.length - 1].x} ${height - paddingBottom} L ${svgPoints[0].x} ${height - paddingBottom} Z`
        : "";

    return {
      hasData: true,
      sessions,
      svgPoints,
      pathD,
      areaD,
      minW,
      maxW,
      width,
      height,
    };
  }, [historyData]);

  // Cálculos de progreso neto vs primera sesión registrada
  const progressBadge = useMemo(() => {
    if (!historyData || !historyData.history || historyData.history.length === 0) {
      return null;
    }
    const diffKg = historyData.net_progress_kg;
    const diffPct = historyData.net_progress_pct;

    if (historyData.history.length === 1) {
      return {
        text: `✨ Primera sesión registrada: ${historyData.current_max_weight} kg`,
        isPositive: true,
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      };
    }

    if (diffKg > 0) {
      return {
        text: `📈 Progreso neto: +${diffKg} kg (+${diffPct}%) vs primera sesión registrada`,
        isPositive: true,
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      };
    } else if (diffKg < 0) {
      return {
        text: `📉 Progreso neto: ${diffKg} kg (${diffPct}%) vs primera sesión registrada`,
        isPositive: false,
        className: "border-[#FF5722]/30 bg-[#FF5722]/10 text-[#FF8A65]",
      };
    } else {
      return {
        text: `⚖️ Progreso neto: 0.0 kg (0.0%) vs primera sesión registrada`,
        isPositive: true,
        className: "border-white/10 bg-[#1C1C1E] text-[#8E8E93]",
      };
    }
  }, [historyData]);

  return (
    <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 space-y-4 shadow-xl select-none">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white font-bold flex-shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Curva de Superación
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Evolución de Fuerza
            </h3>
          </div>
        </div>

        {/* Selector Desplegable de Ejercicio */}
        <div className="relative w-full sm:w-64">
          <button
            type="button"
            onClick={() => setIsOpenSelect((prev) => !prev)}
            className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] text-left text-xs font-semibold text-white flex items-center justify-between gap-2 hover:border-[#FF5722]/50 active:scale-[0.99] transition cursor-pointer"
          >
            <span className="truncate">
              {selectedExercise ? (selectedExercise?.name || "Ejercicio") : "Seleccionar ejercicio..."}
            </span>
            <ChevronDown
              size={15}
              className={`text-[#8E8E93] transition-transform ${isOpenSelect ? "rotate-180" : ""}`}
            />
          </button>

          {/* Menú Flotante de Búsqueda y Selección */}
          {isOpenSelect && (
            <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl border border-[#2C2C2E] bg-[#161618] p-2 shadow-2xl space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full min-h-[36px] rounded-xl border border-white/10 bg-[#121212] pl-8 pr-3 text-xs text-white placeholder:text-[#8E8E93] outline-none focus:border-[#FF5722]"
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
                          ? "bg-[#FF5722]/15 text-[#FF8A65] font-bold border border-[#FF5722]/30"
                          : "text-white/80 hover:bg-[#1C1C1E] hover:text-white"
                      }`}
                    >
                      <span className="truncate">{ex?.name || "Ejercicio"}</span>
                      {ex.muscle_group_name && (
                        <span className="text-[10px] text-[#8E8E93] flex-shrink-0">
                          {ex.muscle_group_name}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-[#8E8E93]">
                    No se encontraron ejercicios
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badge destacado de progreso neto */}
      {progressBadge && (
        <div className={`rounded-2xl border px-3.5 py-2.5 text-xs font-semibold ${progressBadge.className} flex items-center gap-2`}>
          <span>{progressBadge.text}</span>
        </div>
      )}

      {/* Gráfico SVG Minimalista con las últimas 6 sesiones */}
      <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-[#8E8E93]">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Dumbbell size={14} className="text-[#FF5722]" />
            {selectedExercise?.name || "Ejercicio"}
          </span>
          <span>Últimas 6 sesiones registradas</span>
        </div>

        {loadingHistory ? (
          <div className="flex h-36 items-center justify-center text-[#FF5722] gap-2">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-xs text-[#8E8E93]">Cargando evolución...</span>
          </div>
        ) : chartPointsData.hasData ? (
          <div className="space-y-2">
            <div className="w-full h-36 sm:h-40 relative">
              <svg
                viewBox={`0 0 ${chartPointsData.width} ${chartPointsData.height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="gradientProgressLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF5722" />
                    <stop offset="100%" stopColor="#7C4DFF" />
                  </linearGradient>
                  <linearGradient id="gradientProgressArea" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FF5722" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#FF5722" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Área bajo la curva */}
                {chartPointsData.areaD && (
                  <path d={chartPointsData.areaD} fill="url(#gradientProgressArea)" />
                )}

                {/* Línea principal */}
                {chartPointsData.pathD && (
                  <path
                    d={chartPointsData.pathD}
                    fill="none"
                    stroke="url(#gradientProgressLine)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Nodos con el peso levantado */}
                {chartPointsData.svgPoints.map((p, idx) => {
                  const isLast = idx === chartPointsData.svgPoints.length - 1;
                  return (
                    <g key={idx}>
                      {/* Texto con el peso máximo encima del nodo */}
                      <text
                        x={p.x}
                        y={Math.max(12, p.y - 9)}
                        textAnchor="middle"
                        fill={isLast ? "#FF8A65" : "#FFFFFF"}
                        fontSize="10"
                        fontWeight="700"
                      >
                        {p.weight}kg
                      </text>

                      {/* Círculo del punto */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isLast ? 5 : 3.5}
                        fill={isLast ? "#FF5722" : "#121212"}
                        stroke={isLast ? "#FFFFFF" : "#FF5722"}
                        strokeWidth={isLast ? 2.5 : 1.8}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Fechas en el eje inferior */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#8E8E93] pt-1 px-1 border-t border-white/5">
              {chartPointsData.svgPoints.map((p, idx) => (
                <span key={idx} className={idx === chartPointsData.svgPoints.length - 1 ? "text-white font-bold" : ""}>
                  {p.dateLabel}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-[#8E8E93] space-y-1">
            <p className="font-semibold text-white">Sin sesiones para este ejercicio</p>
            <p>Registrá tus series en la pestaña Entrenar para ver la curva de fuerza.</p>
          </div>
        )}
      </div>

      {/* Resumen rápido de la última marca y 1RM */}
      {historyData?.history && historyData.history.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">
              Primera Sesión
            </span>
            <span className="text-base font-extrabold text-white block mt-0.5">
              {historyData.first_max_weight} kg
            </span>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">
              Marca Actual
            </span>
            <span className="text-base font-extrabold text-[#FF8A65] block mt-0.5">
              {historyData.current_max_weight} kg
            </span>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">
              1RM Estimado
            </span>
            <span className="text-base font-extrabold text-[#7C4DFF] block mt-0.5">
              {Math.round(historyData.history[historyData.history.length - 1]?.estimated_1rm || 0)} kg
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
