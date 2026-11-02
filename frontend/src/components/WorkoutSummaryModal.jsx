import React, { useMemo } from "react";
import {
  Trophy,
  Check,
  Clock,
  Dumbbell,
  Sparkles,
  CloudOff,
  Medal,
  Award,
  Zap,
} from "lucide-react";
import { formatDateLong } from "../utils/dateUtils";
import { getCachedExercises, getCachedMuscleGroups } from "../services/exerciseCache";

// 6 Grupos musculares mapeados en el Radar
const CANONICAL_MUSCLES = [
  { key: "Piernas", label: "Piernas" },
  { key: "Espalda", label: "Espalda" },
  { key: "Pecho", label: "Pecho" },
  { key: "Hombros", label: "Hombros" },
  { key: "Brazos", label: "Brazos" },
  { key: "Core", label: "Core" },
];

const MUSCLE_ID_TO_RADAR = {
  1: "Pecho",
  2: "Espalda",
  3: "Piernas",
  4: "Hombros",
  6: "Core",
  7: "Brazos", // Bíceps -> 100% Brazos
  8: "Brazos", // Tríceps -> 100% Brazos
};

function mapMuscleGroupNameToRadar(mgName = "") {
  const mg = String(mgName || "").trim().toLowerCase();
  if (!mg) return null;
  if (
    mg.includes("pierna") ||
    mg.includes("cuádriceps") ||
    mg.includes("cuadriceps") ||
    mg.includes("femoral") ||
    mg.includes("isquio") ||
    mg.includes("glúteo") ||
    mg.includes("gluteo") ||
    mg.includes("gemelo") ||
    mg.includes("abductor") ||
    mg.includes("aductor")
  ) {
    return "Piernas";
  }
  if (mg.includes("espalda") || mg.includes("dorsal") || mg.includes("trapecio")) {
    return "Espalda";
  }
  if (mg.includes("pecho") || mg.includes("pectoral")) {
    return "Pecho";
  }
  if (mg.includes("hombro") || mg.includes("deltoid")) {
    return "Hombros";
  }
  if (
    mg.includes("brazo") ||
    mg.includes("bíceps") ||
    mg.includes("biceps") ||
    mg.includes("bicep") ||
    mg.includes("tríceps") ||
    mg.includes("triceps") ||
    mg.includes("tricep") ||
    mg.includes("antebrazo")
  ) {
    return "Brazos";
  }
  if (mg.includes("core") || mg.includes("abdom") || mg.includes("lumbar") || mg.includes("oblicuo")) {
    return "Core";
  }
  return null;
}

function matchMuscleFallbackByName(name = "") {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return null;
  if (
    n.includes("tríceps") ||
    n.includes("triceps") ||
    n.includes("tricep") ||
    n.includes("francés") ||
    n.includes("frances") ||
    n.includes("pushdown") ||
    n.includes("patada") ||
    n.includes("katana") ||
    n.includes("bíceps") ||
    n.includes("biceps") ||
    n.includes("bicep") ||
    n.includes("curl") ||
    n.includes("martillo") ||
    n.includes("predicador") ||
    n.includes("zottman")
  ) {
    return "Brazos";
  }
  if (
    n.includes("pierna") ||
    n.includes("leg") ||
    n.includes("sentadilla") ||
    n.includes("squat") ||
    n.includes("prensa") ||
    n.includes("femoral") ||
    n.includes("isquio") ||
    n.includes("cuádriceps") ||
    n.includes("cuadriceps") ||
    n.includes("gemelo") ||
    n.includes("hack") ||
    n.includes("hip thrust") ||
    n.includes("aductor") ||
    n.includes("abductor") ||
    n.includes("búlgara") ||
    n.includes("bulgara")
  ) {
    return "Piernas";
  }
  if (
    n.includes("espalda") ||
    n.includes("back") ||
    n.includes("remo") ||
    n.includes("jalón") ||
    n.includes("jalon") ||
    n.includes("dominada") ||
    n.includes("pulldown") ||
    n.includes("dorsal") ||
    n.includes("pullover") ||
    n.includes("pull over")
  ) {
    return "Espalda";
  }
  if (
    n.includes("hombro") ||
    n.includes("shoulder") ||
    n.includes("militar") ||
    n.includes("deltoid") ||
    n.includes("vuelo lateral") ||
    n.includes("elevaciones laterales") ||
    n.includes("pájaro") ||
    n.includes("pajaro") ||
    n.includes("face pull")
  ) {
    return "Hombros";
  }
  if (
    n.includes("core") ||
    n.includes("abs") ||
    n.includes("abdom") ||
    n.includes("plancha") ||
    n.includes("crunch") ||
    n.includes("lumbar") ||
    n.includes("leñador") ||
    n.includes("pallof")
  ) {
    return "Core";
  }
  if (
    n.includes("pecho") ||
    n.includes("chest") ||
    n.includes("press banca") ||
    n.includes("press plano") ||
    n.includes("press inclinado") ||
    n.includes("press declinado") ||
    n.includes("aperturas") ||
    n.includes("cruces en polea") ||
    n.includes("pec")
  ) {
    return "Pecho";
  }
  return null;
}

function formatDurationHevy(seconds) {
  if (!seconds || seconds <= 0) return "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  if (m > 0) {
    return `${m}min`;
  }
  return `${s}s`;
}

export default function WorkoutSummaryModal({
  isOpen,
  onClose,
  date,
  summary,
  isOfflineSaved = false,
}) {
  const formattedDate = date ? formatDateLong(date) : "Hoy";

  const durationSeconds = summary?.duration_seconds ?? summary?.durationSeconds ?? 0;
  const totalVolumeKg = summary?.totalVolumeKg ?? summary?.total_volume ?? 0;
  const prsBroken = summary?.prsBroken ?? summary?.broken_records ?? [];
  const prCount = summary?.pr_count ?? prsBroken.length;
  const activeExercises = summary?.activeExercises ?? summary?.exercises ?? [];

  // Calcular distribución muscular real de la sesión de hoy según el muscle_group de la tabla exercises
  const muscleDistribution = useMemo(() => {
    const counts = {
      Piernas: 0,
      Espalda: 0,
      Pecho: 0,
      Hombros: 0,
      Brazos: 0,
      Core: 0,
    };
    const volumes = {
      Piernas: 0,
      Espalda: 0,
      Pecho: 0,
      Hombros: 0,
      Brazos: 0,
      Core: 0,
    };

    const cachedCatalog = getCachedExercises() || [];
    const catalogById = {};
    const catalogByName = {};
    cachedCatalog.forEach((cEx) => {
      if (cEx?.id) catalogById[cEx.id] = cEx;
      if (cEx?.name) catalogByName[String(cEx.name).trim().toLowerCase()] = cEx;
    });

    const cachedGroups = getCachedMuscleGroups() || [];
    const groupNameById = {};
    cachedGroups.forEach((g) => {
      if (g?.id && g?.name) groupNameById[g.id] = g.name;
    });

    const resolveExerciseRadarGroup = (ex) => {
      if (!ex) return null;
      const exId = ex.exerciseId ?? ex.exercise_id ?? ex.id;
      const exName = String(ex.exerciseName || ex.exercise_name || ex.name || "").trim();
      const catEx =
        (exId && catalogById[exId]) ||
        (exName && catalogByName[exName.toLowerCase()]) ||
        null;

      const mgId =
        ex.muscleGroupId ??
        ex.muscle_group_id ??
        catEx?.muscle_group_id ??
        null;

      const mgName =
        ex.muscleGroupName ||
        ex.muscle_group_name ||
        ex.muscle_group ||
        catEx?.muscle_group_name ||
        (mgId ? groupNameById[Number(mgId)] : "") ||
        "";

      // 1. Estrictamente por el nombre del muscle_group real de exercises
      const byMgName = mapMuscleGroupNameToRadar(mgName);
      if (byMgName) return byMgName;

      // 2. Por ID del muscle_group real de exercises
      if (mgId && MUSCLE_ID_TO_RADAR[Number(mgId)]) {
        return MUSCLE_ID_TO_RADAR[Number(mgId)];
      }

      // 3. Fallback por nombre de ejercicio (sin default a Pecho)
      return matchMuscleFallbackByName(exName);
    };

    const exList = Array.isArray(activeExercises) ? activeExercises : [];
    exList.forEach((ex) => {
      if (!ex) return;
      const muscleKey = resolveExerciseRadarGroup(ex);
      if (!muscleKey || !(muscleKey in counts)) return;

      const sets = Array.isArray(ex.sets) ? ex.sets : [];
      sets.forEach((s) => {
        if (s && s.completed !== false && !["warmup", "W"].includes(s.set_type || "normal")) {
          counts[muscleKey] = (counts[muscleKey] || 0) + 1;
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps, 10) || 0;
          volumes[muscleKey] = (volumes[muscleKey] || 0) + w * r;
        }
      });
    });

    const totalSetsCount = Object.values(counts).reduce((a, b) => a + b, 0);
    const totalVol = Object.values(volumes).reduce((a, b) => a + b, 0);
    const allTrainedHaveVolume =
      totalVol > 0 &&
      Object.keys(counts).every((k) => counts[k] === 0 || volumes[k] > 0);

    const items = CANONICAL_MUSCLES.map(({ key, label }) => {
      const setCount = counts[key] || 0;
      const vol = setCount > 0 ? volumes[key] || 0 : 0;
      let pct = 0;
      if (setCount === 0) {
        pct = 0;
      } else if (allTrainedHaveVolume && totalVol > 0) {
        pct = Math.round((vol / totalVol) * 100);
      } else if (totalSetsCount > 0) {
        pct = Math.round((setCount / totalSetsCount) * 100);
      }
      return {
        key,
        label,
        setCount,
        volume: vol,
        percentage: pct,
      };
    });

    // Músculo más entrenado
    const topMuscle = [...items].sort(
      (a, b) => b.percentage - a.percentage || b.volume - a.volume || b.setCount - a.setCount
    )[0];

    return {
      items,
      totalSetsCount,
      topMuscle: topMuscle?.setCount > 0 ? topMuscle : null,
    };
  }, [activeExercises]);

  // Generación geométrica del gráfico Radar SVG (Hexágono de 6 ejes)
  const radarGeometry = useMemo(() => {
    const size = 260;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 80;
    const totalAxes = CANONICAL_MUSCLES.length; // 6 ejes: [Piernas, Espalda, Pecho, Hombros, Brazos, Core]

    // Calcular coordenadas de un eje i (0 a 5) dado un radio r
    const getPoint = (i, r) => {
      const angle = (i * 2 * Math.PI) / totalAxes - Math.PI / 2;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    };

    // Anillos concéntricos de referencia (25%, 50%, 75%, 100%)
    const rings = [0.25, 0.5, 0.75, 1.0].map((factor) => {
      const points = [];
      for (let i = 0; i < totalAxes; i++) {
        const pt = getPoint(i, radius * factor);
        points.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
      }
      return points.join(" ");
    });

    // Líneas de ejes radiales
    const axisLines = [];
    const labelPoints = [];
    for (let i = 0; i < totalAxes; i++) {
      const outer = getPoint(i, radius);
      const labelPt = getPoint(i, radius + 22);
      axisLines.push({ x1: cx, y1: cy, x2: outer.x, y2: outer.y });
      labelPoints.push({
        ...labelPt,
        label: CANONICAL_MUSCLES[i].label,
        key: CANONICAL_MUSCLES[i].key,
      });
    }

    // Polígono de datos del usuario: si percentage === 0, el vértice queda estrictamente en 0 (centro)
    const maxPct = Math.max(...muscleDistribution.items.map((m) => m.percentage), 1);
    const dataPoints = muscleDistribution.items.map((m, i) => {
      const norm = m.percentage > 0 ? Math.max(0.2, m.percentage / maxPct) : 0;
      const pt = getPoint(i, radius * norm);
      return {
        ...pt,
        percentage: m.percentage,
        label: m.label,
        isActive: m.percentage > 0,
      };
    });

    const dataPolygonPoints = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    return {
      size,
      cx,
      cy,
      rings,
      axisLines,
      labelPoints,
      dataPoints,
      dataPolygonPoints,
    };
  }, [muscleDistribution]);

  if (!isOpen || !summary) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md sm:max-w-lg bg-white border border-slate-100 rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[88dvh] overflow-hidden shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        
        {/* Capa 1 - CABECERA FESTIVA FIJA */}
        <div className="p-4 border-b border-slate-100 bg-white text-center space-y-1.5 flex-shrink-0">
          {/* Badge Festivo Hevy */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-500 tracking-wide">
            <Sparkles size={13} className="text-red-500" />
            <span>¡Bien hecho!</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
            Entrenamiento completado
          </h2>

          <p className="text-xs text-[#64748B] capitalize font-medium">
            {formattedDate}
          </p>

          {isOfflineSaved && (
            <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-400/20 rounded-xl py-1 px-3 mt-1">
              <CloudOff size={12} />
              <span>Guardado localmente. Se sincronizará al conectar.</span>
            </div>
          )}
        </div>

        {/* Capa 2 - CUERPO SCROLLEABLE */}
        <div className="p-4 space-y-4 overflow-y-auto overscroll-contain flex-1">
          {/* 2. TARJETA DE MÉTRICAS CLAVE (3 COLUMNAS DESTACADAS) */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-[#F9FAFB] p-3 sm:p-4 text-center">
          {/* Columna 1: Duración */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-red-500">
              <Clock size={15} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Duración
            </span>
            <span className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
              {formatDurationHevy(durationSeconds)}
            </span>
          </div>

          {/* Columna 2: Volumen */}
          <div className="flex flex-col items-center justify-center space-y-1 border-x border-slate-100 px-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-red-500">
              <Dumbbell size={15} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Volumen
            </span>
            <span className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight truncate w-full">
              {Math.round(totalVolumeKg).toLocaleString("es-ES")} kg
            </span>
          </div>

          {/* Columna 3: Récords */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-red-500">
              <Trophy size={15} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Récords
            </span>
            <span className="text-sm sm:text-base font-bold text-red-500 tracking-tight flex items-center justify-center gap-0.5">
              <span>{prCount}</span>
              <span>🏅</span>
            </span>
          </div>
        </div>

        {/* 3. GRÁFICO DE DISTRIBUCIÓN MUSCULAR DE HOY (RADAR SVG) */}
        <div className="rounded-xl border border-slate-100 bg-[#F9FAFB] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Distribución Muscular
            </span>
            {muscleDistribution.topMuscle && (
              <span className="text-[11px] font-semibold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                {muscleDistribution.topMuscle.label} ({muscleDistribution.topMuscle.percentage}%)
              </span>
            )}
          </div>

          {/* Radar Chart SVG */}
          <div className="relative flex items-center justify-center py-1">
            <svg
              viewBox={`0 0 ${radarGeometry.size} ${radarGeometry.size}`}
              className="w-full max-w-[240px] h-auto overflow-visible"
            >
              <defs>
                <linearGradient id="hevyRadarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.15" />
                </linearGradient>
              </defs>

              {/* Anillos concéntricos de referencia */}
              {radarGeometry.rings.map((ringPoints, idx) => (
                <polygon
                  key={`ring-${idx}`}
                  points={ringPoints}
                  fill="none"
                  stroke="#26262B"
                  strokeWidth="1"
                  strokeDasharray={idx < 3 ? "2 2" : "none"}
                />
              ))}

              {/* Líneas radiales de ejes */}
              {radarGeometry.axisLines.map((axis, idx) => (
                <line
                  key={`axis-${idx}`}
                  x1={axis.x1}
                  y1={axis.y1}
                  x2={axis.x2}
                  y2={axis.y2}
                  stroke="#26262B"
                  strokeWidth="1"
                />
              ))}

              {/* Polígono de volumen/series de hoy */}
              {muscleDistribution.totalSetsCount > 0 && (
                <polygon
                  points={radarGeometry.dataPolygonPoints}
                  fill="url(#hevyRadarFill)"
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              )}

              {/* Puntos en los vértices activos */}
              {radarGeometry.dataPoints.map((pt, idx) => (
                <circle
                  key={`pt-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.isActive ? 4 : 2}
                  fill={pt.isActive ? "#EF4444" : "#8E8E93"}
                  stroke="#0B0B0E"
                  strokeWidth="1.5"
                />
              ))}

              {/* Etiquetas de los grupos musculares en el borde */}
              {radarGeometry.labelPoints.map((lbl, idx) => {
                const item = muscleDistribution.items.find((m) => m.key === lbl.key);
                const isTrained = (item?.setCount || 0) > 0;
                return (
                  <text
                    key={`lbl-${idx}`}
                    x={lbl.x}
                    y={lbl.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`text-[10px] font-bold tracking-tight transition-colors ${
                      isTrained ? "fill-white" : "fill-[#8E8E93]"
                    }`}
                  >
                    {lbl.label}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Barras de proporción rápida */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {muscleDistribution.items.map((m) => (
              <div
                key={m.key}
                className={`rounded-xl border p-2 text-center transition-all ${
                  m.percentage > 0
                    ? "border-red-500/30 bg-red-500/10 text-[#0F172A]"
                    : "border-slate-100 bg-white text-[#64748B]"
                }`}
              >
                <span className="text-[10px] font-semibold block truncate">
                  {m.label}
                </span>
                <span
                  className={`text-xs font-bold ${
                    m.percentage > 0 ? "text-red-500" : "text-[#64748B]"
                  }`}
                >
                  {m.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. RÉCORDS ROTOS HOY (SI HUBO PRs) */}
        {prsBroken && prsBroken.length > 0 && (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-400">
              <Medal size={14} />
              <span>Nuevos Récords Personales</span>
            </div>
            <div className="space-y-1.5 text-xs font-medium text-[#0F172A]">
              {prsBroken.map((pr, idx) => {
                const prText = typeof pr === "string" ? pr : pr.text || `${pr.exercise_name || "Ejercicio"}: ${pr.weight} kg × ${pr.reps} reps`;
                return (
                  <div key={`pr-${idx}`} className="flex items-start gap-2">
                    <span className="text-red-400">🏅</span>
                    <span className="leading-snug">
                      <strong className="text-[#0F172A] font-semibold">{prText}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>

        {/* Capa 3 - Pie de Acción Fijo / Anclado */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl tracking-wide active:scale-[0.98] transition flex items-center justify-center gap-2 select-none shadow-md shadow-red-500/20 cursor-pointer text-sm"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>Listo / Guardar</span>
          </button>
        </div>

      </div>
    </div>
  );
}
