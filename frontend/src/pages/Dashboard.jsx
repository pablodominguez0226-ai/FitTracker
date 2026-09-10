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
import { DEFAULT_LEVEL_EXPLANATIONS } from "../components/ProfileModal";
import Header from "../components/Header";
import { formatDateSafe, getLocalDateString, parseDateSafe } from "../utils/dateUtils";

// Custom dark tooltip for recharts
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-[#2D1B4E] bg-[#140E24]/95 p-3 shadow-neon text-xs text-white backdrop-blur-md">
        <p className="font-black text-[#C084FC] mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} className="flex justify-between gap-4 font-semibold">
            <span className="text-[#A1A1AA]">{entry.name}:</span>
            <span className="font-bold text-white">
              {entry.name.toLowerCase().includes("volumen")
                ? `${Math.round(entry.value).toLocaleString()} kg`
                : `${entry.value} sesiones`}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [tips, setTips] = useState([]);
  const [userLevel, setUserLevel] = useState("intermedio");
  const [levelExplanations, setLevelExplanations] = useState(DEFAULT_LEVEL_EXPLANATIONS);
  const [expandedExpId, setExpandedExpId] = useState(null);
  const [aiBriefing, setAiBriefing] = useState(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState(null);
  const [askingAi, setAskingAi] = useState(false);
  const [loading, setLoading] = useState(true);


  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, tipsRes, aiRes] = await Promise.all([
        getAnalyticsDashboard(getLocalDateString()),
        getContextualTips().catch(() => []),
        getAIWeeklyBriefing().catch(() => null),
      ]);
      setData(dashRes);
      setTips(tipsRes);
      setAiBriefing(aiRes);
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

    getUserProfile()
      .then((p) => {
        if (p && p.experience_level) setUserLevel(p.experience_level);
      })
      .catch(() => {});

    getLevelExplanations()
      .then((res) => {
        if (res && res.levels) setLevelExplanations(res.levels);
      })
      .catch(() => {});

    const handleLevelEvt = (e) => {
      if (e.detail) {
        setUserLevel(e.detail);
        loadDashboard();
      }
    };

    window.addEventListener("fittracker:levelChanged", handleLevelEvt);
    return () => window.removeEventListener("fittracker:levelChanged", handleLevelEvt);
  }, []);


  const formatDate = (val) =>
    formatDateSafe(val, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-[#A855F7]">
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
        <div className="rounded-2xl border border-dashed border-[#2D1B4E] bg-[#140E24]/60 p-12 text-center">
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
            <div className="rounded-xl border border-[#2D1B4E] bg-[#140E24] px-3.5 py-2 text-right">
              <span className="text-[10px] uppercase font-bold text-[#71717A] block">
                Sesiones Listas
              </span>
              <span className="text-base font-black text-[#34D399]">
                {data.total_workouts}
              </span>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-right">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">
                Voluntad de Hierro
              </span>
              <span className="text-base font-black text-amber-300">
                {data.willpower_sessions_count}
              </span>
            </div>
          </div>
        }
      />

      {/* 1. Tarjeta Hero: Métrica de Voluntad & Retención de Carga */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-[#1C1433] via-[#140E24] to-[#1C1226] p-4.5 sm:p-6 shadow-neonLg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
              <Brain size={15} className="text-amber-400 animate-pulse" />
              <span>ÍNDICE DE DISCIPLINA &amp; VOLUNTAD</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              El <span className="text-amber-300">{data.willpower_percentage}%</span> de tus entrenamientos se construyeron en días difíciles
            </h2>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Superaste la barrera mental en <strong className="text-white">{data.willpower_sessions_count} de {data.total_workouts} sesiones</strong> (entrenando con energía baja o alta exigencia psicológica). La consistencia en estos días es la que consolida el progreso físico real.
            </p>
          </div>

          {/* KPI Circular / Tarjeta de Retención de Rendimiento */}
          <div className="rounded-2xl border border-amber-500/30 bg-[#09060E]/80 p-4 min-w-[240px] text-center space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
              Retención de Carga en Días Bajos
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-white">
                {data.volume_comparison.retention_percentage}%
              </span>
            </div>
            <p className="text-[11px] text-[#A1A1AA]">
              {data.volume_comparison.low_energy_avg_volume > 0 ? (
                <>
                  Promedio normal: <strong className="text-white">{Math.round(data.volume_comparison.normal_avg_volume)} kg</strong>
                  <br />
                  Promedio con energía baja: <strong className="text-amber-300">{Math.round(data.volume_comparison.low_energy_avg_volume)} kg</strong>
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
        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5 shadow-card text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">
            Tonelaje Movido
          </span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#C084FC]">
            {Math.round(data.total_volume_kg).toLocaleString()} <span className="text-xs font-semibold text-[#A1A1AA]">kg</span>
          </p>
        </div>
        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5 shadow-card text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">
            Series Totales
          </span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#34D399]">
            {data.total_sets.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5 shadow-card text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">
            Repeticiones
          </span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-white">
            {data.total_reps.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5 shadow-card text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] block">
            Sesiones de Voluntad
          </span>
          <p className="mt-1 text-xl sm:text-2xl font-black text-amber-300">
            {data.willpower_sessions_count} <span className="text-xs font-semibold text-[#A1A1AA]">★</span>
          </p>
        </div>
      </div>

      {/* 2.5. Guía de Entrenamiento & Conceptos Clave según el Nivel */}
      {(() => {
        const currentExpObj =
          levelExplanations[userLevel] ||
          DEFAULT_LEVEL_EXPLANATIONS[userLevel] ||
          DEFAULT_LEVEL_EXPLANATIONS.intermedio;

        return (
          <div className="rounded-2xl border border-[#A855F7]/40 bg-gradient-to-br from-[#1C1433] via-[#140E24] to-[#0E0919] p-4 sm:p-5 shadow-neon space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D1B4E] pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#9333EA] to-[#A855F7] text-white shadow-sm">
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Guía del Atleta: {currentExpObj.title}
                    </h3>
                    <span className="rounded-md border border-[#34D399]/40 bg-[#34D399]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#34D399]">
                      {currentExpObj.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1AA]">
                    {currentExpObj.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("fittracker:openProfile"))}
                className="self-start sm:self-center inline-flex items-center gap-1.5 rounded-xl border border-[#2D1B4E] bg-[#140E24] px-3 py-1.5 text-xs font-bold text-[#C084FC] hover:border-[#A855F7] hover:bg-[#1C1433] transition active:scale-95"
              >
                <User size={13} className="text-[#A855F7]" />
                <span>Cambiar Nivel</span>
              </button>
            </div>

            {/* Conceptos clave explicados */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] block">
                Explicaciones Adaptadas a tu Perfil ({currentExpObj.title}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentExpObj.explanations?.map((item) => {
                  const isExpanded = expandedExpId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3 transition hover:border-[#A855F7]/40 space-y-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedExpId(isExpanded ? null : item.id)}
                        className="w-full text-left flex items-start justify-between gap-2"
                      >
                        <div>
                          <span className="text-[10px] font-black uppercase text-[#C084FC] tracking-wider block">
                            {item.topic.replace("_", " ")}
                          </span>
                          <h4 className="text-xs font-black text-white mt-0.5">{item.title}</h4>
                        </div>
                        <span className="text-[#71717A] hover:text-white p-0.5">
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </span>
                      </button>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed">
                        {item.summary}
                      </p>
                      {isExpanded && item.details && (
                        <div className="pt-2 border-t border-[#2D1B4E]/60 space-y-1.5 animate-in fade-in duration-150">
                          {item.details.map((d, dIdx) => (
                            <p key={dIdx} className="text-[11px] text-[#D4D4D8] leading-normal flex items-start gap-1.5">
                              <span className="text-[#A855F7] font-bold">•</span>
                              <span>{d}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tips contextuales del nivel */}
            {tips.length > 0 && (
              <div className="pt-2 border-t border-[#2D1B4E]/60 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] block flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  Consejos Rápidos del Coach para {currentExpObj.title}:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tips.slice(0, 4).map((tip, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#2D1B4E]/70 bg-[#140E24]/60 p-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-[#34D399]">
                          {tip.category}
                        </span>
                        <span className="text-[9px] text-[#71717A]">P{tip.priority}</span>
                      </div>
                      <h5 className="text-[11px] font-bold text-white">{tip.title}</h5>
                      <p className="text-[11px] text-[#A1A1AA] leading-snug">{tip.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}


      {/* 2.8. Coach IA: Diagnóstico Semanal & Asistente Interactivo (Fase 5) */}
      <div className="rounded-2xl border border-[#A855F7]/30 bg-gradient-to-br from-[#1C1433] via-[#140E24] to-[#0E0919] p-4 sm:p-5 shadow-neon space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2D1B4E]/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#9333EA] to-[#A855F7] text-white shadow-sm">
              <Bot size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Coach IA: Diagnóstico Semanal &amp; Sobrecarga
                </h3>
                <span className="rounded-md border border-[#34D399]/30 bg-[#34D399]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#34D399]">
                  {aiBriefing?.experience_level ? `Nivel ${aiBriefing.experience_level}` : "Inteligencia Activa"}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Análisis integral de sobrecarga progresiva, volumen y fatiga basado en tus series reales.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshBriefing}
            disabled={loadingBriefing}
            className="self-start sm:self-center inline-flex items-center gap-1.5 rounded-xl border border-[#2D1B4E] bg-[#140E24] px-3 py-1.5 text-xs font-bold text-[#C084FC] hover:border-[#A855F7] hover:bg-[#1C1433] transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loadingBriefing ? "animate-spin" : ""} />
            <span>Actualizar Diagnóstico</span>
          </button>
        </div>

        {aiBriefing && (
          <div className="space-y-4">
            {/* Headline & Summary */}
            <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919]/70 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                <Sparkles size={15} />
                <span>{aiBriefing.headline}</span>
              </div>
              <p className="text-xs text-[#D4D4D8] leading-relaxed">
                {aiBriefing.willpower_analysis}
              </p>
            </div>

            {/* Status Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-[#2D1B4E] bg-[#140E24] p-2.5">
                <span className="text-[10px] uppercase font-bold text-[#71717A] block">Sesiones 7d</span>
                <span className="text-base font-black text-white">{aiBriefing.total_workouts}</span>
              </div>
              <div className="rounded-xl border border-[#2D1B4E] bg-[#140E24] p-2.5">
                <span className="text-[10px] uppercase font-bold text-[#71717A] block">Volumen 7d</span>
                <span className="text-base font-black text-[#34D399]">{Math.round(aiBriefing.total_volume_kg).toLocaleString()} kg</span>
              </div>
              <div className="rounded-xl border border-[#2D1B4E] bg-[#140E24] p-2.5">
                <span className="text-[10px] uppercase font-bold text-[#71717A] block">Voluntad de Hierro</span>
                <span className="text-base font-black text-amber-300">{aiBriefing.willpower_sessions} sesiones</span>
              </div>
              <div className="rounded-xl border border-[#2D1B4E] bg-[#140E24] p-2.5">
                <span className="text-[10px] uppercase font-bold text-[#71717A] block">Recuperación</span>
                <span className="text-base font-black text-[#C084FC]">{aiBriefing.recovery_status}</span>
              </div>
            </div>

            {/* Achievements & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiBriefing.achievements?.length > 0 && (
                <div className="rounded-xl border border-[#2D1B4E] bg-[#140E24]/60 p-3 space-y-2">
                  <h4 className="text-xs font-black uppercase text-[#34D399] flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Hitos y Rendimiento Destacado
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[#A1A1AA]">
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
                <div className="rounded-xl border border-[#2D1B4E] bg-[#140E24]/60 p-3 space-y-2">
                  <h4 className="text-xs font-black uppercase text-[#C084FC] flex items-center gap-1.5">
                    <Target size={14} />
                    Estrategia de Sobrecarga Progresiva
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[#A1A1AA]">
                    {aiBriefing.overload_recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#C084FC] font-bold">→</span>
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
        <div className="pt-2 border-t border-[#2D1B4E]/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#E4E4E7] flex items-center gap-1.5">
              <Brain size={14} className="text-[#A855F7]" />
              Consultale al Coach IA
            </span>
            <span className="text-[10px] text-[#71717A]">
              Respuestas fundamentadas en tus series y fatiga
            </span>
          </div>

          {/* Quick Query Chips (Adapted by Level) */}
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const levelPrompts = {
                principiante: [
                  "¿Cómo mejorar mi técnica básica?",
                  "¿Qué es una serie y cuántas repeticiones hacer?",
                  "¿Cómo se calcula el volumen?",
                  "¿Qué es un PR y cuándo buscarlo?",
                ],
                intermedio: [
                  "¿Cómo viene mi sobrecarga progresiva?",
                  "¿Cuándo subir 1.25kg?",
                  "¿Cómo influye mi energía al rendir?",
                  "¿Qué músculo tiene menos volumen?",
                ],
                avanzado: [
                  "¿Debería programar una descarga activa?",
                  "¿Cómo romper mi estancamiento actual?",
                  "¿Cómo calcular si toqué mi MRV?",
                  "¿Cómo periodizar la fuerza máxima?",
                ],
              };
              const chips = levelPrompts[userLevel] || levelPrompts.intermedio;
              return chips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAiQuestion(chip);
                    handleAsk(chip);
                  }}
                  className="rounded-lg border border-[#2D1B4E] bg-[#0E0919] px-2.5 py-1 text-[11px] font-medium text-[#A1A1AA] hover:border-[#A855F7] hover:text-white transition"
                >
                  {chip}
                </button>
              ));
            })()}
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
              className="flex-1 min-h-[40px] rounded-xl border border-[#2D1B4E] bg-[#0E0919] px-3.5 py-2 text-xs text-white outline-none focus:border-[#A855F7]"
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
            <div className="rounded-xl border border-[#A855F7]/40 bg-[#0E0919] p-3.5 space-y-2 animate-in fade-in duration-200 shadow-neon">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#C084FC] flex items-center gap-1.5">
                  <Bot size={15} />
                  Respuesta del Coach ({aiAnswer.category})
                </span>
                <span className="text-[10px] text-[#71717A]">
                  {new Date(aiAnswer.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-white leading-relaxed">
                {aiAnswer.answer}
              </p>
              {aiAnswer.cited_data?.length > 0 && (
                <div className="pt-2 border-t border-[#2D1B4E]/60 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold uppercase text-[#71717A]">
                    Datos citados:
                  </span>
                  {aiAnswer.cited_data.map((c, i) => (
                    <span
                      key={i}
                      className="rounded-md border border-[#2D1B4E] bg-[#140E24] px-2 py-0.5 text-[10px] text-amber-300 font-mono"
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
      <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-4 sm:p-5 shadow-card space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#9333EA]/20 text-xs font-black text-[#C084FC]">
                <TrendingUp size={14} />
              </span>
              <h3 className="text-sm sm:text-base font-black text-white">
                Consistencia Semanal &amp; Volumen de Carga
              </h3>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
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
                    fill={entry.sessions_count > 0 ? "#A855F7" : "#2D1B4E"}
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
              className={`rounded-xl border p-2 text-center ${
                w.sessions_count > 0
                  ? "border-[#A855F7]/40 bg-[#1C1433]/70"
                  : "border-[#2D1B4E]/40 bg-[#0E0919]"
              }`}
            >
              <span className="text-[9px] uppercase font-bold text-[#71717A] block truncate">
                {w.week_label}
              </span>
              <span className={`text-xs font-black block mt-0.5 ${w.sessions_count > 0 ? "text-[#34D399]" : "text-[#52525B]"}`}>
                {w.sessions_count} {w.sessions_count === 1 ? "sesión" : "sesiones"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Distribución por Grupo Muscular & Días de la Semana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribución Muscular */}
        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-4 sm:p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#9333EA]/20 text-xs font-black text-[#C084FC]">
              <Layers size={14} />
            </span>
            <h3 className="text-sm sm:text-base font-black text-white">
              Distribución por Grupo Muscular
            </h3>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Balance de estímulo acumulado según el volumen total movido.
          </p>

          <div className="space-y-2.5 pt-1">
            {data.muscle_distribution.length === 0 ? (
              <p className="text-xs text-[#71717A]">Sin datos musculares disponibles.</p>
            ) : (
              data.muscle_distribution.map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-white">{m.name}</span>
                    <span className="text-[#C084FC]">
                      {Math.round(m.volume).toLocaleString()} kg ({m.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#0E0919]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#9333EA] to-[#A855F7]"
                      style={{ width: `${Math.min(100, m.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Frecuencia por Día de la Semana */}
        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-4 sm:p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#9333EA]/20 text-xs font-black text-[#C084FC]">
              <Calendar size={14} />
            </span>
            <h3 className="text-sm sm:text-base font-black text-white">
              Patrón de Entrenamiento Semanal
            </h3>
          </div>
          <p className="text-xs text-[#A1A1AA]">
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
                  <div className="h-24 w-full rounded-xl bg-[#0E0919] flex items-end p-1">
                    <div
                      className={`w-full rounded-lg transition-all ${
                        d.count > 0 ? "bg-gradient-to-t from-[#9333EA] to-[#A855F7]" : "bg-transparent"
                      }`}
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-[#71717A]">
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
        <div className="rounded-2xl border border-amber-500/30 bg-[#140E24] p-4 sm:p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="text-sm sm:text-base font-black text-white">
                Muro de Reconocimiento: Voluntad de Hierro
              </h3>
            </div>
            <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
              {data.willpower_sessions_count} Registradas
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Sesiones donde te presentaste al gimnasio y rendiste a pesar de la baja energía o alta exigencia mental.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {data.recent_willpower_sessions.map((s, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-[#1C1433] to-[#0E0919] p-3.5 space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black capitalize text-white">
                    {formatDate(s.date)}
                  </span>
                  {s.muscle_group_name && (
                    <span className="rounded-md border border-[#2D1B4E] bg-[#140E24] px-2 py-0.5 text-[10px] font-bold text-[#C084FC]">
                      {s.muscle_group_name}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                  {s.readiness_energy && (
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-300">
                      ⚡ Energía: {s.readiness_energy}/5
                    </span>
                  )}
                  {s.mental_effort && (
                    <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-purple-300">
                      🧠 Esfuerzo: {s.mental_effort}/5
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#A1A1AA] pt-1 border-t border-[#2D1B4E]/60 flex justify-between">
                  <span>{s.sets_count} series completadas</span>
                  <span className="font-bold text-white">{Math.round(s.total_volume)} kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
