import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Calendar,
  Check,
  ChevronLeft,
  Dumbbell,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  Scale,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ExerciseDiagram, { formatExerciseName } from "./ExerciseDiagram";
import ImageWithFallback from "./ImageWithFallback";
import ExerciseMediaViewer from "./ExerciseMediaViewer";
import exercisesMasterData from "../data/exercises_master.json";
import {
  getExerciseGuide,
  getExerciseHistory,
  getExercises,
  getWorkouts,
  updateExercise,
} from "../api/client";

const MASTER_BY_NAME = new Map(
  (exercisesMasterData || []).map((item) => [
    String(item.name || "").trim().toLowerCase(),
    item,
  ])
);

const MONTH_LABELS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];

const METRIC_CHIPS = [
  { id: "max_weight", label: "Peso máximo", unit: "kg" },
  { id: "volume", label: "Peso total", unit: "kg" },
  { id: "estimated_1rm", label: "1RM estimado", unit: "kg" },
];

/**
 * Construye pasos detallados y numerados de ejecución biomecánica para el ejercicio
 */
function buildExerciseSteps(exercise, guideData) {
  const name = exercise?.name || exercise?.exercise_name || "este ejercicio";
  const muscle =
    exercise?.muscle_group_name ||
    exercise?.muscle_group ||
    "el grupo muscular objetivo";

  const rawTips = exercise?.execution_tips || "";
  const lines = rawTips
    .split("\n")
    .map((l) => l.replace(/^[•\-\*\d\.]+\s*/, "").trim())
    .filter(Boolean);

  const guidePoints = Array.isArray(guideData?.key_points)
    ? guideData.key_points
        .map((p) => String(p).replace(/^[•\-\*]\s*/, "").trim())
        .filter(Boolean)
    : [];

  const steps = [];

  if (lines.length > 0) {
    lines.forEach((line) => steps.push(line));
  } else if (guidePoints.length > 0) {
    guidePoints.forEach((pt) => steps.push(pt));
  }

  if (steps.length === 0) {
    steps.push(
      `Posición inicial (Setup): Ajustá tu posición inicial a tu antropometría, estabilizá la columna en posición neutra y activá el core junto con la retracción escapular antes de despegar la carga.`
    );
    steps.push(
      `Fase concéntrica (Empuje / Tracción): Mové la carga de forma explosiva pero controlada focalizando la tensión mecánica en ${muscle.toLowerCase()}, evitando impulsos o balanceos compensatorios.`
    );
  }

  if (exercise?.key_cue && !steps.some((s) => s.includes(exercise.key_cue))) {
    steps.push(`Clave biomecánica: ${exercise.key_cue}`);
  } else if (steps.length < 3) {
    steps.push(
      `Punto de máxima contracción: Mantené una pausa isométrica consciente de 1 segundo en el pico del recorrido para maximizar el reclutamiento de fibras en ${muscle.toLowerCase()}.`
    );
  }

  const tempo = exercise?.target_tempo || guideData?.target_tempo || "3-0-1-0";
  steps.push(
    `Fase excéntrica y respiración: Descendé la carga de manera controlada respetando una cadencia ${tempo}. Inhalá profundamente durante la fase excéntrica (bajada) y exhalá al superar el punto de mayor dificultad.`
  );

  return steps;
}

/**
 * ExerciseDetailView - Vista/Modal de Detalle Técnico del Ejercicio
 * Incluye Cabecera, Card Principal de Demostración, Segmented Tabs (Gráficos, Historial, Pasos),
 * Gráfico Recharts y Bento Grid 2x2 de Estadísticas Clave en paleta Roja (#EF4444 / #DC2626).
 */
export default function ExerciseDetailView({
  exercise: propExercise,
  onBack,
  onExerciseUpdated,
  isModal = false,
}) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [fetchedExercise, setFetchedExercise] = useState(null);
  const exercise = propExercise || location?.state?.exercise || fetchedExercise;

  const [activeTab, setActiveTab] = useState("charts"); // 'charts' | 'history' | 'steps'
  const [selectedMetric, setSelectedMetric] = useState("max_weight"); // 'max_weight' | 'volume' | 'estimated_1rm'
  const [historyData, setHistoryData] = useState([]);
  const [rawSetsHistory, setRawSetsHistory] = useState([]);
  const [guideData, setGuideData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  // Help / URL customization popover state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [isSavingUrl, setIsSavingUrl] = useState(false);

  // Si se accede mediante ruta /ejercicios/:id sin propExercise, buscar en el catálogo
  useEffect(() => {
    if (propExercise || location?.state?.exercise || !params?.id) return;
    let mounted = true;
    getExercises()
      .then((list) => {
        if (!mounted || !Array.isArray(list)) return;
        const found = list.find((ex) => String(ex.id) === String(params.id));
        if (found) setFetchedExercise(found);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [propExercise, location?.state?.exercise, params?.id]);

  const exerciseId =
    exercise?.id || exercise?.exercise_id || exercise?.exerciseId || params?.id;
  const rawExerciseName =
    exercise?.name ||
    exercise?.exercise_name ||
    exercise?.exerciseName ||
    "Ejercicio";
  const exerciseName = formatExerciseName(rawExerciseName);
  const masterMatch = MASTER_BY_NAME.get(
    String(rawExerciseName || "").trim().toLowerCase()
  );
  const muscleGroup =
    exercise?.muscleGroup ||
    exercise?.muscle_group_name ||
    exercise?.muscle_group ||
    masterMatch?.muscleGroup ||
    "General";
  const subgroup =
    exercise?.subgroup ||
    masterMatch?.subgroup ||
    exercise?.primary_muscles ||
    "";

  const handleBackNavigation = () => {
    if (typeof onBack === "function") {
      onBack();
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    const url =
      exercise?.mediaUrl ||
      exercise?.image_url ||
      masterMatch?.mediaUrl ||
      "";
    const isLegacyLocalSvg = url.startsWith("/assets/diagrams/");
    setCurrentImageUrl(isLegacyLocalSvg ? "" : url);
    setCustomUrl(isLegacyLocalSvg ? "" : url);
    setImgError(false);
    setIsHelpOpen(false);
  }, [exercise, masterMatch]);

  useEffect(() => {
    if (!exerciseId) return;
    let isMounted = true;
    setLoadingData(true);

    const numId = Number(exerciseId);
    const isNumericId = !isNaN(numId) && numId > 0;

    Promise.all([
      isNumericId
        ? getExerciseHistory(numId).catch(() => null)
        : Promise.resolve(null),
      isNumericId
        ? getExerciseGuide(numId).catch(() => null)
        : Promise.resolve(null),
      getWorkouts().catch(() => []),
    ])
      .then(([histRes, guideRes, workoutsList]) => {
        if (!isMounted) return;

        if (guideRes) {
          setGuideData(guideRes);
        }

        if (
          histRes &&
          Array.isArray(histRes.history) &&
          histRes.history.length > 0
        ) {
          setHistoryData(histRes.history);
        } else {
          setHistoryData([]);
        }

        // Extraer todas las series históricas de este ejercicio desde las sesiones del usuario
        const extractedSets = [];
        const safeWorkouts = Array.isArray(workoutsList) ? workoutsList : [];
        safeWorkouts.forEach((w) => {
          const wDate = w?.date || w?.workout_date || w?.created_at || "";
          const sets = Array.isArray(w?.sets) ? w.sets : [];
          const matchingSets = sets.filter(
            (st) =>
              String(st?.exercise_id) === String(exerciseId) ||
              (st?.exercise_name &&
                st.exercise_name.toLowerCase() === exerciseName.toLowerCase())
          );
          if (matchingSets.length > 0) {
            extractedSets.push({
              sessionId: w.id,
              date: wDate,
              sets: matchingSets.map((st, idx) => ({
                id: st.id || `${w.id}-${idx}`,
                setNumber: st.set_number || idx + 1,
                weight: Number(st.weight || 0),
                reps: Number(st.reps || 0),
                rpe: st.rpe || null,
                setType: st.set_type || "normal",
              })),
            });
          }
        });

        extractedSets.sort((a, b) =>
          String(b.date).localeCompare(String(a.date))
        );
        setRawSetsHistory(extractedSets);
      })
      .finally(() => {
        if (isMounted) setLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [exerciseId, exerciseName]);

  // Construir puntos mensuales para el gráfico (jul, ago, sept, oct)
  const chartModel = useMemo(() => {
    const defaultMonths = ["jul", "ago", "sept", "oct"];
    const monthBuckets = new Map();
    defaultMonths.forEach((m) => {
      monthBuckets.set(m, {
        month: m,
        max_weight: 0,
        volume: 0,
        estimated_1rm: 0,
      });
    });

    if (historyData.length > 0) {
      historyData.forEach((item) => {
        let monthKey = "oct";
        if (item.date) {
          const parts = String(item.date).split("-");
          if (parts.length >= 2) {
            const mIdx = parseInt(parts[1], 10) - 1;
            if (mIdx >= 0 && mIdx < 12) {
              monthKey = MONTH_LABELS_SHORT[mIdx];
            }
          }
        }
        const prev = monthBuckets.get(monthKey) || {
          month: monthKey,
          max_weight: 0,
          volume: 0,
          estimated_1rm: 0,
        };
        monthBuckets.set(monthKey, {
          month: monthKey,
          max_weight: Math.max(prev.max_weight, Number(item.max_weight || 0)),
          volume:
            Math.round((prev.volume + Number(item.volume || 0)) * 10) / 10,
          estimated_1rm:
            Math.round(
              Math.max(prev.estimated_1rm, Number(item.estimated_1rm || 0)) *
                10
            ) / 10,
        });
      });
    } else if (rawSetsHistory.length > 0) {
      rawSetsHistory.forEach((session) => {
        let monthKey = "oct";
        if (session.date) {
          const parts = String(session.date).split("T")[0].split("-");
          if (parts.length >= 2) {
            const mIdx = parseInt(parts[1], 10) - 1;
            if (mIdx >= 0 && mIdx < 12) {
              monthKey = MONTH_LABELS_SHORT[mIdx];
            }
          }
        }
        const prev = monthBuckets.get(monthKey) || {
          month: monthKey,
          max_weight: 0,
          volume: 0,
          estimated_1rm: 0,
        };
        let sessionMaxW = 0;
        let sessionVol = 0;
        let session1RM = 0;
        session.sets.forEach((st) => {
          const w = Number(st.weight || 0);
          const r = Number(st.reps || 0);
          if (w > sessionMaxW) sessionMaxW = w;
          sessionVol += w * r;
          const e1rm = r > 0 ? w * (1 + r / 30) : w;
          if (e1rm > session1RM) session1RM = e1rm;
        });

        monthBuckets.set(monthKey, {
          month: monthKey,
          max_weight: Math.max(
            prev.max_weight,
            Math.round(sessionMaxW * 10) / 10
          ),
          volume: Math.round((prev.volume + sessionVol) * 10) / 10,
          estimated_1rm: Math.max(
            prev.estimated_1rm,
            Math.round(session1RM * 10) / 10
          ),
        });
      });
    }

    const points = Array.from(monthBuckets.values()).slice(-4);
    const values = points.map((p) => Number(p[selectedMetric] || 0));
    const nonZero = values.filter((v) => v > 0);
    let deltaPct = 0;
    if (nonZero.length >= 2) {
      const first = nonZero[0];
      const last = nonZero[nonZero.length - 1];
      if (first > 0) {
        deltaPct = Math.round(((last - first) / first) * 100);
      }
    }

    return {
      points,
      deltaPct,
      deltaLabel: `Este mes ${deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}`,
    };
  }, [historyData, rawSetsHistory, selectedMetric]);

  // Estadísticas Bento 2x2
  const statsSummary = useMemo(() => {
    let totalReps = 0;
    let totalVolume = 0;
    let best1RM = 0;
    let sessionsCount = 0;

    if (rawSetsHistory.length > 0) {
      sessionsCount = rawSetsHistory.length;
      rawSetsHistory.forEach((s) => {
        s.sets.forEach((st) => {
          const w = Number(st.weight || 0);
          const r = Number(st.reps || 0);
          totalReps += r;
          totalVolume += w * r;
          const e1rm = r > 0 ? w * (1 + r / 30) : w;
          if (e1rm > best1RM) best1RM = e1rm;
        });
      });
    } else if (historyData.length > 0) {
      sessionsCount = historyData.length;
      historyData.forEach((h) => {
        totalReps += Number(h.max_reps || 0) * Number(h.sets_count || 1);
        totalVolume += Number(h.volume || 0);
        if (Number(h.estimated_1rm || 0) > best1RM) {
          best1RM = Number(h.estimated_1rm || 0);
        }
      });
    }

    // Frecuencia media semanal (basada en sesiones en las últimas 4 semanas)
    const avgFreq =
      sessionsCount > 0
        ? Math.max(0.5, Math.round((sessionsCount / 4) * 10) / 10)
        : 0;

    return {
      totalReps: Math.round(totalReps),
      totalVolume: Math.round(totalVolume),
      best1RM: Math.round(best1RM * 10) / 10,
      avgFrequency: avgFreq,
    };
  }, [rawSetsHistory, historyData]);

  const stepsList = useMemo(
    () => buildExerciseSteps(exercise, guideData),
    [exercise, guideData]
  );

  const activeMetricObj =
    METRIC_CHIPS.find((c) => c.id === selectedMetric) || METRIC_CHIPS[0];

  const handleSaveCustomUrl = async (e) => {
    e.preventDefault();
    if (!exerciseId) return;
    try {
      setIsSavingUrl(true);
      const trimmed = customUrl.trim();
      const updated = await updateExercise(exerciseId, {
        image_url: trimmed || null,
      });
      setCurrentImageUrl(trimmed);
      setImgError(false);
      setIsHelpOpen(false);
      if (onExerciseUpdated && updated) {
        onExerciseUpdated(updated);
      }
    } catch (err) {
      console.warn("No se pudo guardar URL personalizada:", err);
    } finally {
      setIsSavingUrl(false);
    }
  };

  return (
    <div
      className={`w-full flex flex-col bg-[#F8FAFC] dark:bg-[#05070B] text-slate-900 dark:text-white select-none ${
        isModal
          ? "h-full overflow-y-auto custom-scrollbar"
          : "min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom))]"
      }`}
    >
      {/* 1. Header: Botón regresar < a la izquierda, título "Detalles de ejercicios" centrado, y botón circular ? a la derecha */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3.5 bg-[#F8FAFC]/95 dark:bg-[#05070B]/95 backdrop-blur-md border-b border-slate-100 dark:border-white/[0.07]">
        <button
          type="button"
          onClick={handleBackNavigation}
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#161B26] transition active:scale-95 cursor-pointer"
          title="Volver"
          aria-label="Volver"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>

        <h2 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
          Detalles de ejercicios
        </h2>

        <button
          type="button"
          onClick={() => setIsHelpOpen((prev) => !prev)}
          className="w-9 h-9 rounded-full bg-red-50/70 dark:bg-[#0E131F] border border-red-200/60 dark:border-white/10 text-red-600 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition active:scale-95 cursor-pointer"
          title="Información biomecánica y multimedia"
          aria-label="Ayuda del ejercicio"
        >
          <HelpCircle size={18} strokeWidth={2.25} />
        </button>
      </header>

      {/* Panel desplegable de Ayuda / URL de Imagen */}
      {isHelpOpen && (
        <div className="mx-4 mt-3 rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/[0.07] p-4 shadow-md space-y-3 animate-in fade-in duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                Ficha Biomecánica
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Músculo principal:{" "}
                <strong className="text-slate-900 dark:text-white">
                  {exercise?.primary_muscles || muscleGroup}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsHelpOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
            >
              <X size={15} />
            </button>
          </div>

          <form
            onSubmit={handleSaveCustomUrl}
            className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/[0.07]"
          >
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <LinkIcon size={12} className="text-red-500" />
              <span>URL de imagen o GIF demostrativo (opcional)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 h-9 rounded-xl bg-slate-50 dark:bg-[#05070B] border border-slate-200 dark:border-white/[0.07] px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={isSavingUrl}
                className="h-9 px-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isSavingUrl ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                <span>Guardar</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cuerpo Principal */}
      <div className="px-4 pt-4 pb-8 space-y-5 max-w-md mx-auto w-full">
        {/* 2. Hero Card Anatómico / GIF Multimedia */}
        <section className="text-center">
          <div className="mb-3">
            <ExerciseMediaViewer
              src={currentImageUrl}
              slug={exercise?.slug || masterMatch?.slug}
              alt={rawExerciseName}
              muscleGroup={subgroup || muscleGroup}
              exerciseName={rawExerciseName}
              variant="hero"
              allowPauseOnTap={true}
            />
          </div>

          <h1 className="font-black text-xl text-slate-900 dark:text-white tracking-tight px-2 leading-snug">
            {rawExerciseName}
          </h1>

          {/* Badge del músculo y subgrupo en rojo suave */}
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-950/40 text-red-400 border border-red-900/30">
              {muscleGroup}
            </span>
            {subgroup && subgroup.toLowerCase() !== muscleGroup.toLowerCase() && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-950/40 text-red-400 border border-red-900/30">
                {subgroup}
              </span>
            )}
          </div>
        </section>

        {/* 3. Tabs Segmentadas (Rojo Deportivo): "Gráficos", "Historial", "Pasos" */}
        <div
          className="flex items-center justify-between rounded-full bg-slate-100 dark:bg-[#0E131F] border border-slate-200/70 dark:border-white/[0.07] p-1"
          role="tablist"
        >
          {[
            { id: "charts", label: "Gráficos" },
            { id: "history", label: "Historial" },
            { id: "steps", label: "Pasos" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 text-center text-xs sm:text-sm transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? "bg-red-600 text-white font-bold rounded-full py-2 px-6 shadow-md"
                    : "text-slate-400 font-medium py-2 px-4 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 4. Contenido de Métricas y Gráfico (Tab Gráficos) */}
        {activeTab === "charts" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Fila de sub-filtros en cápsula: "Peso máximo", "Peso total", "1RM estimado" */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {METRIC_CHIPS.map((chip) => {
                const isSelected = selectedMetric === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSelectedMetric(chip.id)}
                    className={`rounded-full px-4 py-2 text-xs whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/40 shadow-xs"
                        : "bg-white dark:bg-[#0E131F] text-slate-500 dark:text-slate-400 font-medium border border-slate-100 dark:border-white/[0.07] hover:border-red-200"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Tarjeta Gráfica de Progreso */}
            <div className="rounded-3xl p-5 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm mb-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeMetricObj.label}
                </h3>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                  {chartModel.deltaLabel}
                </span>
              </div>

              <div className="h-48 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartModel.points}
                    margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(148, 163, 184, 0.2)"
                    />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      domain={[
                        0,
                        (dataMax) => Math.max(10, Math.ceil((dataMax || 0) * 1.2)),
                      ]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0E131F",
                        borderColor: "rgba(255, 255, 255, 0.07)",
                        borderRadius: "16px",
                        color: "#F8FAFC",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                      formatter={(val) => [
                        `${val} ${activeMetricObj.unit}`,
                        activeMetricObj.label,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke="#EF4444"
                      strokeWidth={3}
                      dot={{
                        r: 4.5,
                        fill: "#EF4444",
                        stroke: "#FFFFFF",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 6,
                        fill: "#DC2626",
                        stroke: "#FFFFFF",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bento Grid 2x2 de Estadísticas Clave */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Icono mancuerna, título "Repeticiones totales", valor "0 Representa..." */}
              <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={19} strokeWidth={2.25} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                    Repeticiones totales
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {statsSummary.totalReps}{" "}
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Representa...
                  </span>
                </p>
              </div>

              {/* Card 2: Icono balanza, título "Peso total", valor "0 kg" */}
              <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                    <Scale size={19} strokeWidth={2.25} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                    Peso total
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {statsSummary.totalVolume}{" "}
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    kg
                  </span>
                </p>
              </div>

              {/* Card 3: Icono 1RM, título "1RM estimado", valor "0 kg" */}
              <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0 font-black text-[11px] tracking-tighter">
                    1RM
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                    1RM estimado
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {statsSummary.best1RM}{" "}
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    kg
                  </span>
                </p>
              </div>

              {/* Card 4: Icono pulso, título "Frecuencia media", valor "0.0 /semana" */}
              <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                    <Activity size={19} strokeWidth={2.25} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                    Frecuencia media
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {statsSummary.avgFrequency.toFixed(1)}{" "}
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    /semana
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pestaña 2: Historial */}
        {activeTab === "history" && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {loadingData ? (
              <div className="rounded-3xl p-8 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-red-600" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Cargando historial del ejercicio...
                </span>
              </div>
            ) : rawSetsHistory.length > 0 ? (
              rawSetsHistory.map((sessionItem) => {
                const cleanDate = String(sessionItem.date || "").split("T")[0];
                return (
                  <div
                    key={sessionItem.sessionId || cleanDate}
                    className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.07] pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <Calendar
                          size={14}
                          className="text-red-600 dark:text-red-400"
                        />
                        <span>{cleanDate || "Sesión registrada"}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/30 px-2.5 py-0.5 rounded-full">
                        {sessionItem.sets.length}{" "}
                        {sessionItem.sets.length === 1 ? "serie" : "series"}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {sessionItem.sets.map((st, idx) => (
                        <div
                          key={st.id || idx}
                          className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-[#080A0F] border border-slate-100 dark:border-white/[0.05]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-500 dark:text-slate-400">
                              Serie #{idx + 1}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {st.weight} kg × {st.reps} reps
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : historyData.length > 0 ? (
              historyData
                .slice()
                .reverse()
                .map((h, idx) => (
                  <div
                    key={h.session_id || idx}
                    className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {h.max_weight} kg × {h.max_reps} reps
                        </p>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {h.date_label || h.date} • {h.sets_count || 1} series
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/30 px-3 py-1 rounded-full">
                      1RM: {Math.round(h.estimated_1rm || 0)} kg
                    </span>
                  </div>
                ))
            ) : (
              <div className="rounded-3xl p-8 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                  <Activity size={22} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sin series registradas aún
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Cuando registres series de {exerciseName} en tus entrenamientos,
                  aparecerán aquí ordenadas cronológicamente.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pestaña 3: Pasos */}
        {activeTab === "steps" && (
          <div className="rounded-3xl p-5 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Técnica de ejecución paso a paso
              </h3>
            </div>

            <ol className="space-y-3.5">
              {stepsList.map((stepText, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3.5 rounded-2xl bg-slate-50 dark:bg-[#080A0F] border border-slate-100 dark:border-white/[0.07] p-3.5"
                >
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {stepText}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
