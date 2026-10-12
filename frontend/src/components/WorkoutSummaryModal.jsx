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

// 7 Grupos musculares canónicos estilo Hevy
const CANONICAL_MUSCLES = [
  { key: "Pecho", label: "Pecho" },
  { key: "Espalda", label: "Espalda" },
  { key: "Piernas", label: "Piernas" },
  { key: "Hombros", label: "Hombros" },
  { key: "Bíceps", label: "Bíceps" },
  { key: "Tríceps", label: "Tríceps" },
  { key: "Core", label: "Core" },
];

function matchMuscle(name = "") {
  const n = (name || "").toLowerCase();
  if (n.includes("pecho") || n.includes("chest") || n.includes("banca") || n.includes("pec")) return "Pecho";
  if (n.includes("espalda") || n.includes("back") || n.includes("remo") || n.includes("jalón") || n.includes("jalon") || n.includes("dominada") || n.includes("pulldown")) return "Espalda";
  if (n.includes("pierna") || n.includes("leg") || n.includes("sentadilla") || n.includes("squat") || n.includes("prensa") || n.includes("femoral") || n.includes("cuádriceps") || n.includes("cuadriceps") || n.includes("gemelo") || n.includes("hack") || n.includes("hip thrust")) return "Piernas";
  if (n.includes("hombro") || n.includes("shoulder") || n.includes("militar") || n.includes("deltoid") || n.includes("lateral") || n.includes("pájaro") || n.includes("pajaro") || n.includes("press militar")) return "Hombros";
  if (n.includes("tríceps") || n.includes("triceps") || n.includes("francés") || n.includes("frances") || n.includes("cuerda") || n.includes("fondos") || n.includes("pushdown") || n.includes("patada")) return "Tríceps";
  if (n.includes("bíceps") || n.includes("biceps") || n.includes("curl") || n.includes("martillo") || n.includes("predicador")) return "Bíceps";
  if (n.includes("core") || n.includes("abs") || n.includes("abdom") || n.includes("plancha") || n.includes("crunch")) return "Core";
  return "Pecho";
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

  // Calcular distribución muscular de la sesión de hoy
  const muscleDistribution = useMemo(() => {
    const counts = {
      Pecho: 0,
      Espalda: 0,
      Piernas: 0,
      Hombros: 0,
      Bíceps: 0,
      Tríceps: 0,
      Core: 0,
    };
    const volumes = {
      Pecho: 0,
      Espalda: 0,
      Piernas: 0,
      Hombros: 0,
      Bíceps: 0,
      Tríceps: 0,
      Core: 0,
    };

    const exList = Array.isArray(activeExercises) ? activeExercises : [];
    exList.forEach((ex) => {
      if (!ex) return;
      const muscleKey = matchMuscle(ex?.exerciseName || ex?.name || ex?.muscle_group_name || "");
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

    const items = CANONICAL_MUSCLES.map(({ key, label }) => {
      const setCount = counts[key] || 0;
      const vol = volumes[key] || 0;
      const pct = totalSetsCount > 0 ? Math.round((setCount / totalSetsCount) * 100) : 0;
      return {
        key,
        label,
        setCount,
        volume: vol,
        percentage: pct,
      };
    });

    // Músculo más entrenado
    const topMuscle = [...items].sort((a, b) => b.setCount - a.setCount)[0];

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
    const totalAxes = 6;

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

    // Polígono de datos del usuario
    const maxPct = Math.max(...muscleDistribution.items.map((m) => m.percentage), 1);
    const dataPoints = muscleDistribution.items.map((m, i) => {
      // Normalizar: mínimo 12% de radio para visualización si es > 0
      const norm = m.percentage > 0 ? Math.max(0.2, m.percentage / maxPct) : 0.05;
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#2C2C2E] bg-[#121212] flex flex-col max-h-[88dvh] overflow-hidden shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        
        {/* Capa 1 - CABECERA FESTIVA FIJA */}
        <div className="p-4 border-b border-[#2C2C2E] bg-[#121212] text-center space-y-1.5 flex-shrink-0">
          {/* Badge Festivo Hevy */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FF5722]/30 bg-gradient-to-r from-[#FF5722]/15 to-[#7C4DFF]/15 px-3 py-1 text-xs font-bold text-[#FF8A65] tracking-wide">
            <Sparkles size={13} className="text-[#FF5722]" />
            <span>¡Bien hecho!</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Entrenamiento completado
          </h2>

          <p className="text-xs text-[#8E8E93] capitalize font-medium">
            {formattedDate}
          </p>

          {isOfflineSaved && (
            <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl py-1 px-3 mt-1">
              <CloudOff size={12} />
              <span>Guardado localmente. Se sincronizará al conectar.</span>
            </div>
          )}
        </div>

        {/* Capa 2 - CUERPO SCROLLEABLE */}
        <div className="p-4 space-y-4 overflow-y-auto overscroll-contain flex-1">
          {/* 2. TARJETA DE MÉTRICAS CLAVE (3 COLUMNAS DESTACADAS) */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-3 sm:p-4 text-center">
          {/* Columna 1: Duración */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 text-[#FF5722]">
              <Clock size={15} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Duración
            </span>
            <span className="text-sm sm:text-base font-bold text-white tracking-tight">
              {formatDurationHevy(durationSeconds)}
            </span>
          </div>

          {/* Columna 2: Volumen */}
          <div className="flex flex-col items-center justify-center space-y-1 border-x border-white/5 px-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 text-[#FF8A65]">
              <Dumbbell size={15} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Volumen
            </span>
            <span className="text-sm sm:text-base font-bold text-white tracking-tight truncate w-full">
              {Math.round(totalVolumeKg).toLocaleString("es-ES")} kg
            </span>
          </div>

          {/* Columna 3: Récords */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 text-amber-400">
              <Trophy size={15} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Récords
            </span>
            <span className="text-sm sm:text-base font-bold text-amber-400 tracking-tight flex items-center justify-center gap-0.5">
              <span>{prCount}</span>
              <span>🏅</span>
            </span>
          </div>
        </div>

        {/* 3. GRÁFICO DE DISTRIBUCIÓN MUSCULAR DE HOY (RADAR SVG HEVY) */}
        <div className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
              Distribución Muscular
            </span>
            {muscleDistribution.topMuscle && (
              <span className="text-[11px] font-semibold text-[#FF5722] bg-[#FF5722]/10 border border-[#FF5722]/20 px-2 py-0.5 rounded-full">
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
                {/* Degradado mate #FF5722 a #7C4DFF */}
                <linearGradient id="hevyRadarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF5722" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#7C4DFF" stopOpacity="0.45" />
                </linearGradient>
                <linearGradient id="hevyRadarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF5722" />
                  <stop offset="100%" stopColor="#7C4DFF" />
                </linearGradient>
              </defs>

              {/* Anillos concéntricos de referencia */}
              {radarGeometry.rings.map((ringPoints, idx) => (
                <polygon
                  key={`ring-${idx}`}
                  points={ringPoints}
                  fill="none"
                  stroke="#2C2C2E"
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
                  stroke="#2C2C2E"
                  strokeWidth="1"
                />
              ))}

              {/* Polígono de volumen/series de hoy */}
              {muscleDistribution.totalSetsCount > 0 && (
                <polygon
                  points={radarGeometry.dataPolygonPoints}
                  fill="url(#hevyRadarFill)"
                  stroke="url(#hevyRadarStroke)"
                  strokeWidth="2.5"
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
                  fill={pt.isActive ? "#FF5722" : "#8E8E93"}
                  stroke="#121212"
                  strokeWidth="1.5"
                />
              ))}

              {/* Etiquetas de los 6 grupos musculares en el borde */}
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
                    ? "border-[#FF5722]/30 bg-[#FF5722]/5 text-white"
                    : "border-white/5 bg-[#121212] text-[#8E8E93]"
                }`}
              >
                <span className="text-[10px] font-semibold block truncate">
                  {m.label}
                </span>
                <span
                  className={`text-xs font-bold ${
                    m.percentage > 0 ? "text-[#FF5722]" : "text-[#8E8E93]"
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
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Medal size={14} />
              <span>Nuevos Récords Personales</span>
            </div>
            <div className="space-y-1.5 text-xs font-medium text-white">
              {prsBroken.map((pr, idx) => {
                const prText = typeof pr === "string" ? pr : pr.text || `${pr.exercise_name || "Ejercicio"}: ${pr.weight} kg × ${pr.reps} reps`;
                return (
                  <div key={`pr-${idx}`} className="flex items-start gap-2">
                    <span className="text-amber-400">🏅</span>
                    <span className="leading-snug">
                      <strong className="text-white font-semibold">{prText}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>

        {/* Capa 3 - Pie de Acción Fijo / Anclado */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#2C2C2E] bg-[#121212] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white font-bold text-sm sm:text-base tracking-wide hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2 select-none shadow-none cursor-pointer"
          >
            <Check size={20} strokeWidth={2.5} />
            <span>Listo / Guardar</span>
          </button>
        </div>

      </div>
    </div>
  );
}
