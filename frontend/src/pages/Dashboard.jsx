import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Bot,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flame,
  Layers,
  Loader2,
  RefreshCw,
  Repeat,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  askAICoach,
  getAIWeeklyBriefing,
  getAnalyticsDashboard,
  getContextualTips,
  getLevelExplanations,
  getUserProfile,
} from "../api/client";
import Header from "../components/Header";
import { formatDateSafe, getLocalDateString, parseDateSafe } from "../utils/dateUtils";

// Custom dark tooltip for recharts
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1C1C1E]/95 p-3 text-xs text-white backdrop-blur-md">
        <p className="font-bold text-[#FF5722] mb-1">{label}</p>
        {payload.map((entry, index) => {
          const entryName = entry?.name || "";
          return (
            <p key={`item-${index}`} className="flex justify-between gap-4 font-medium">
              <span className="text-[#8E8E93]">{entryName}:</span>
              <span className="font-semibold text-white">
                {entryName.toLowerCase().includes("volumen")
                  ? `${Math.round(entry?.value || 0).toLocaleString()} kg`
                  : `${entry?.value || 0} sesiones`}
              </span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [tips, setTips] = useState([]);
  const [userLevel, setUserLevel] = useState("intermedio");
  const [aiBriefing, setAiBriefing] = useState(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState(null);
  const [askingAi, setAskingAi] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, tipsRes, aiRes, profRes] = await Promise.all([
        getAnalyticsDashboard(getLocalDateString()),
        getContextualTips().catch(() => []),
        getAIWeeklyBriefing().catch(() => null),
        getUserProfile().catch(() => null),
      ]);
      setData(dashRes);
      setTips(tipsRes);
      setAiBriefing(aiRes);
      if (profRes?.training_level || profRes?.level) {
        setUserLevel(profRes.training_level || profRes.level);
      }
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBriefing = async () => {
    try {
      setLoadingBriefing(true);
      const res = await getAIWeeklyBriefing();
      setAiBriefing(res);
    } catch (err) {
      console.error("Error actualizando briefing:", err);
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleAsk = async (queryToAsk) => {
    const q = (queryToAsk || aiQuestion).trim();
    if (!q) return;
    try {
      setAskingAi(true);
      const res = await askAICoach(q);
      setAiAnswer(res);
    } catch (err) {
      console.error("Error consultando al Coach IA:", err);
    } finally {
      setAskingAi(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);



  const formatDate = (val) =>
    formatDateSafe(val, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-[#FF5722]">
        <Loader2 size={36} className="animate-spin" />
        <p className="text-sm font-bold text-[#A1A1AA]">
          Analizando esfuerzo y sobrecarga progresiva...
        </p>
      </div>
    );
  }

  if (!data || data.total_workouts === 0) {
    return (
      <div className="space-y-6 pb-20">
        <Header
          title="Métricas &amp; Voluntad"
          subtitle="Análisis de sobrecarga progresiva, consistencia y esfuerzo real"
        />
        <div className="rounded-2xl border border-dashed border-[#2A1B14] bg-[#181210]/60 p-12 text-center">
          <Dumbbell size={40} className="mx-auto text-[#71717A]" />
          <h3 className="mt-3 text-base font-black text-white">
            Aún no hay entrenamientos suficientes para analizar
          </h3>
          <p className="mt-1 text-xs text-[#A1A1AA] max-w-sm mx-auto">
            Completá tus primeras sesiones desde "Entrenar Hoy". FitTracker cruzará tus cargas con tu estado del día para generar métricas de voluntad y rendimiento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      <Header
        title="Métricas &amp; Voluntad"
        subtitle="Los números miden tu entrenamiento; FitTracker entiende tu esfuerzo"
        rightElement={
          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] px-3.5 py-2 text-right">
              <span className="text-[10px] uppercase font-semibold text-[#8E8E93] block">
                Nivel Actual
              </span>
              <span className="text-base font-bold text-white capitalize">
                {userLevel}
              </span>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-right">
              <span className="text-[10px] uppercase font-semibold text-amber-400 block">
                Voluntad de Hierro
              </span>
              <span className="text-base font-bold text-amber-300">
                {data.willpower_sessions_count}
              </span>
            </div>
          </div>
        }
      />

      {/* 1. Tarjeta Hero: Métrica de Voluntad & Retención de Carga */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-[#1C1C1E] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <Brain size={15} className="text-amber-400" />
              <span>ÍNDICE DE DISCIPLINA &amp; VOLUNTAD</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              El <span className="text-amber-300">{data.willpower_percentage}%</span> de tus entrenamientos se construyeron en días difíciles
            </h2>
            <p className="text-xs text-[#8E8E93] leading-relaxed">
              Superaste la barrera mental en <strong className="text-white font-semibold">{data.willpower_sessions_count} de {data.total_workouts} sesiones</strong> (entrenando con energía baja o alta exigencia psicológica). La consistencia en estos días es la que consolida el progreso físico real.
            </p>
          </div>

          {/* KPI Circular / Tarjeta de Retención de Rendimiento */}
          <div className="rounded-2xl border border-white/5 bg-[#121212] p-4 min-w-[240px] text-center space-y-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block">
              Retención de Carga en Días Bajos
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-3xl sm:text-4xl font-bold text-white">
                {data.volume_comparison.retention_percentage}%
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93]">
              {data.volume_comparison.low_energy_avg_volume > 0 ? (
                <>
                  Promedio normal: <strong className="text-white font-semibold">{Math.round(data.volume_comparison.normal_avg_volume)} kg</strong>
                  <br />
                  Promedio con energía baja: <strong className="text-amber-300 font-semibold">{Math.round(data.volume_comparison.low_energy_avg_volume)} kg</strong>
                </>
              ) : (
                "Aún sin sesiones registradas con energía ≤ 2"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Resumen Rápido de Números Globales */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3.5 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] block">
            Tonelaje Movido
          </span>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-[#FF5722]">
            {Math.round(data.total_volume_kg).toLocaleString()} <span className="text-xs font-medium text-[#8E8E93]">kg</span>
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3.5 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] block">
            Series Totales
          </span>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-[#34D399]">
            {data.total_sets.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3.5 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] block">
            Repeticiones
          </span>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-white">
            {data.total_reps.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3.5 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] block">
            Sesiones de Voluntad
          </span>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-300">
            {data.willpower_sessions_count} <span className="text-xs font-medium text-[#8E8E93]">★</span>
          </p>
        </div>
      </div>

      {/* 2.8. Coach IA: Diagnóstico Semanal & Asistente Interactivo */}
      <div className="rounded-3xl border border-white/5 bg-[#1C1C1E] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white flex-shrink-0">
              <Bot size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Coach IA: Diagnóstico Semanal &amp; Sobrecarga
                </h3>
                <span className="rounded-lg border border-[#34D399]/30 bg-[#34D399]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#34D399]">
                  Inteligencia Biomecánica
                </span>
              </div>
              <p className="text-xs text-[#8E8E93]">
                Análisis integral de sobrecarga progresiva, volumen y fatiga basado en tus series reales.
              </p>
            </div>
          </div>


          <button
            type="button"
            onClick={handleRefreshBriefing}
            disabled={loadingBriefing}
            className="self-start sm:self-center inline-flex items-center gap-1.5 rounded-2xl border border-white/5 bg-[#121212] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/20 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loadingBriefing ? "animate-spin" : ""} />
            <span>Actualizar Diagnóstico</span>
          </button>
        </div>

        {aiBriefing && (
          <div className="space-y-4">
            {/* Headline & Summary */}
            <div className="rounded-2xl border border-white/5 bg-[#121212] p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Sparkles size={15} />
                <span>{aiBriefing.headline}</span>
              </div>
              <p className="text-xs text-[#D4D4D8] leading-relaxed">
                {aiBriefing.willpower_analysis}
              </p>
            </div>

            {/* Status Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-2xl border border-white/5 bg-[#121212] p-2.5">
                <span className="text-[10px] uppercase font-semibold text-[#8E8E93] block">Sesiones 7d</span>
                <span className="text-base font-bold text-white">{aiBriefing.total_workouts}</span>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#121212] p-2.5">
                <span className="text-[10px] uppercase font-semibold text-[#8E8E93] block">Volumen 7d</span>
                <span className="text-base font-bold text-[#34D399]">{Math.round(aiBriefing.total_volume_kg).toLocaleString()} kg</span>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#121212] p-2.5">
                <span className="text-[10px] uppercase font-semibold text-[#8E8E93] block">Voluntad de Hierro</span>
                <span className="text-base font-bold text-amber-300">{aiBriefing.willpower_sessions} sesiones</span>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#121212] p-2.5">
                <span className="text-[10px] uppercase font-semibold text-[#8E8E93] block">Recuperación</span>
                <span className="text-base font-bold text-[#FF5722]">{aiBriefing.recovery_status}</span>
              </div>
            </div>

            {/* Achievements & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiBriefing.achievements?.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-[#121212] p-3 space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-[#34D399] flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Hitos y Rendimiento Destacado
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[#8E8E93]">
                    {aiBriefing.achievements.map((ach, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#34D399] font-bold">✓</span>
                        <span className="text-white font-medium">{ach}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiBriefing.overload_recommendations?.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-[#121212] p-3 space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-[#FF5722] flex items-center gap-1.5">
                    <Target size={14} />
                    Estrategia de Sobrecarga Progresiva
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[#8E8E93]">
                    {aiBriefing.overload_recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#FF5722] font-semibold">→</span>
                        <span className="text-white font-medium">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interactive Q&A Bar */}
        <div className="pt-2 border-t border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E4E4E7] flex items-center gap-1.5">
              <Brain size={14} className="text-[#FF5722]" />
              Consultale al Coach IA
            </span>
            <span className="text-[10px] text-[#8E8E93]">
              Respuestas fundamentadas en tus series y fatiga
            </span>
          </div>

          {/* Quick Query Chips */}
          <div className="flex flex-wrap gap-1.5">
            {[
              "¿Cómo viene mi sobrecarga progresiva?",
              "¿El sistema detecta fatiga o necesidad de descarga?",
              "¿Qué grupo muscular tiene menor estímulo este mes?",
              "¿Cómo romper mi estancamiento actual?",
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setAiQuestion(chip);
                  handleAsk(chip);
                }}
                className="rounded-xl border border-white/5 bg-[#121212] px-2.5 py-1 text-[11px] font-medium text-[#8E8E93] hover:border-white/20 hover:text-white transition"
              >
                {chip}
              </button>
            ))}
          </div>



          {/* Input & Send Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Preguntale al Coach IA sobre tu entrenamiento..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              className="flex-1 min-h-[40px] rounded-2xl border border-white/10 bg-[#121212] px-3.5 py-2 text-xs text-white outline-none focus:border-[#FF5722]"
            />
            <button
              type="submit"
              disabled={askingAi || !aiQuestion.trim()}
              className="iron-btn-primary min-h-[40px] px-3.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {askingAi ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span className="hidden sm:inline">Preguntar</span>
            </button>
          </form>

          {/* AI Response Card */}
          {aiAnswer && (
            <div className="rounded-2xl border border-white/10 bg-[#121212] p-3.5 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#FF5722] flex items-center gap-1.5">
                  <Bot size={15} />
                  Respuesta del Coach ({aiAnswer.category})
                </span>
                <span className="text-[10px] text-[#8E8E93]">
                  {new Date(aiAnswer.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-white leading-relaxed">
                {aiAnswer.answer}
              </p>
              {aiAnswer.cited_data?.length > 0 && (
                <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-semibold uppercase text-[#8E8E93]">
                    Datos citados:
                  </span>
                  {aiAnswer.cited_data.map((c, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-white/5 bg-[#1C1C1E] px-2 py-0.5 text-[10px] text-amber-300 font-mono"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Consistencia Semanal (Últimas 8 Semanas - No Punitiva) */}
      <div className="rounded-3xl border border-white/5 bg-[#1C1C1E] p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 text-xs font-semibold text-[#FF5722]">
                <TrendingUp size={14} />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Consistencia Semanal &amp; Volumen de Carga
              </h3>
            </div>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              Evolución de las últimas 8 semanas (el descanso también es parte de la recuperación).
            </p>
          </div>
        </div>

        {/* Gráfico Recharts de Barras Semanales */}
        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.weekly_consistency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="week_label"
                stroke="#71717A"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717A"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${Math.round(val / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_volume" name="Volumen (kg)" radius={[6, 6, 0, 0]}>
                {data.weekly_consistency.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.sessions_count > 0 ? "#FF5722" : "#252528"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chips de resumen semanal rápido */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
          {data.weekly_consistency.map((w, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-2 text-center ${
                w.sessions_count > 0
                  ? "border-[#FF5722]/30 bg-[#FF5722]/10"
                  : "border-white/5 bg-[#121212]"
              }`}
            >
              <span className="text-[9px] uppercase font-semibold text-[#8E8E93] block truncate">
                {w.week_label}
              </span>
              <span className={`text-xs font-bold block mt-0.5 ${w.sessions_count > 0 ? "text-[#34D399]" : "text-[#52525B]"}`}>
                {w.sessions_count} {w.sessions_count === 1 ? "sesión" : "sesiones"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Distribución por Grupo Muscular & Días de la Semana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribución Muscular */}
        <div className="rounded-3xl border border-white/5 bg-[#1C1C1E] p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 text-xs font-semibold text-[#FF5722]">
              <Layers size={14} />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Distribución por Grupo Muscular
            </h3>
          </div>
          <p className="text-xs text-[#8E8E93]">
            Balance de estímulo acumulado según el volumen total movido.
          </p>

          <div className="space-y-2.5 pt-1">
            {data.muscle_distribution.length === 0 ? (
              <p className="text-xs text-[#8E8E93]">Sin datos musculares disponibles.</p>
            ) : (
              data.muscle_distribution.map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-white">{m?.name || "Músculo"}</span>
                    <span className="text-[#FF5722]">
                      {Math.round(m.volume).toLocaleString()} kg ({m.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#121212]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF5722] to-[#7C4DFF]"
                      style={{ width: `${Math.min(100, m.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Frecuencia por Día de la Semana */}
        <div className="rounded-3xl border border-white/5 bg-[#1C1C1E] p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 text-xs font-semibold text-[#FF5722]">
              <Calendar size={14} />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Patrón de Entrenamiento Semanal
            </h3>
          </div>
          <p className="text-xs text-[#8E8E93]">
            Tus días preferidos de asistencia al gimnasio.
          </p>

          <div className="grid grid-cols-7 gap-1.5 pt-4">
            {data.day_of_week_distribution.map((d, idx) => {
              const maxCount = Math.max(...data.day_of_week_distribution.map((x) => x.count), 1);
              const heightPct = Math.round((d.count / maxCount) * 100);
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-white">
                    {d.count}
                  </span>
                  <div className="h-24 w-full rounded-2xl bg-[#121212] flex items-end p-1">
                    <div
                      className={`w-full rounded-xl transition-all ${
                        d.count > 0 ? "bg-gradient-to-t from-[#FF5722] to-[#7C4DFF]" : "bg-transparent"
                      }`}
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold uppercase text-[#8E8E93]">
                    {d.day_name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Muro de Hitos de Voluntad de Hierro */}
      {data.recent_willpower_sessions.length > 0 && (
        <div className="rounded-3xl border border-amber-500/20 bg-[#1C1C1E] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Muro de Reconocimiento: Voluntad de Hierro
              </h3>
            </div>
            <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
              {data.willpower_sessions_count} Registradas
            </span>
          </div>
          <p className="text-xs text-[#8E8E93]">
            Sesiones donde te presentaste al gimnasio y rendiste a pesar de la baja energía o alta exigencia mental.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {data.recent_willpower_sessions.map((s, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/5 bg-[#121212] p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold capitalize text-white">
                    {formatDate(s.date)}
                  </span>
                  {s.muscle_group_name && (
                    <span className="rounded-lg border border-white/5 bg-[#1C1C1E] px-2 py-0.5 text-[10px] font-semibold text-[#FF5722]">
                      {s.muscle_group_name}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                  {s.readiness_energy && (
                    <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-amber-300 font-medium">
                      ⚡ Energía: {s.readiness_energy}/5
                    </span>
                  )}
                  {s.mental_effort && (
                    <span className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-purple-300 font-medium">
                      🧠 Esfuerzo: {s.mental_effort}/5
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#8E8E93] pt-1 border-t border-white/5 flex justify-between">
                  <span>{s.sets_count} series completadas</span>
                  <span className="font-semibold text-white">{Math.round(s.total_volume)} kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
