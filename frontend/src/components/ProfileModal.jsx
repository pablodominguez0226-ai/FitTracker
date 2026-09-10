import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Lightbulb,
  Loader2,
  Repeat,
  Ruler,
  Save,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  User,
  X,
  Zap,
} from "lucide-react";
import { getLevelExplanations, getProfile, updateProfile, updateUserProfile } from "../api/client";

// Static level definitions with complete explanations as requested
export const DEFAULT_LEVEL_EXPLANATIONS = {
  principiante: {
    id: "principiante",
    title: "Principiante",
    subtitle: "Construcción de hábitos, técnica sólida y fundamentos",
    badge: "Fundamentos",
    description:
      "Foco en dominar la biomecánica, aprender la terminología de cargas y construir adherencia sin riesgo de lesión.",
    color: "emerald",
    topics: ["Conceptos Básicos", "Técnica", "Series y Repeticiones", "Volumen", "PR (Récord Personal)"],
    explanations: [
      {
        id: "p_series_reps",
        topic: "conceptos_basicos",
        title: "Series y Repeticiones: Conceptos Clave",
        summary:
          "Una repetición es cada ejecución completa del movimiento. Una serie es el bloque de repeticiones seguidas antes de tomar una pausa.",
        details: [
          "Repetición (Rep): Es realizar la fase completa del ejercicio (subida y bajada controlada). Por ejemplo, 10 sentadillas seguidas equivalen a 10 repeticiones.",
          "Serie (Set): Es el conjunto de repeticiones continuas antes de descansar. Por ejemplo, '3 series de 10 reps' significa: 10 reps → descanso → 10 reps → descanso → 10 reps.",
          "Rango recomendado: Entre 8 y 12 repeticiones por serie proporciona el mejor equilibrio entre control motor, estimulación muscular y seguridad para tendones.",
        ],
        icon: "repeat",
      },
      {
        id: "p_tecnica",
        topic: "tecnica",
        title: "Técnica y Biomecánica: Prioridad Número Uno",
        summary:
          "El control postural y la cadencia excéntrica importan mucho más que los kilos que pongas en la barra o máquina.",
        details: [
          "Control excéntrico: Tardá de 2 a 3 segundos en bajar el peso. Esta fase enseña el patrón motor a tus neuronas y estimula la fibra muscular sin sacudidas.",
          "Rango de Movimiento Completo (ROM): Evitá repeticiones cortas. Realizar el recorrido completo fortalece articulaciones y maximiza la respuesta hipertrófica.",
          "Cero impulsos compensatorios: Si balanceás el torso o arquás la espalda baja para subir, el estímulo se escapa del músculo y aumenta el riesgo de lesión.",
          "Series de aproximación: Hacé 1 o 2 series livianas solo para lubricar las articulaciones antes de colocar tu peso de trabajo.",
        ],
        icon: "shield-check",
      },
      {
        id: "p_volumen",
        topic: "volumen",
        title: "¿Qué es el Volumen de Entrenamiento?",
        summary:
          "Es la cantidad total de trabajo muscular acumulado, calculado como Series × Repeticiones × Peso levantado (kg).",
        details: [
          "Fórmula del volumen: Si realizás 3 series de 10 reps con 20 kg, tu volumen total en ese ejercicio es 3 × 10 × 20 = 600 kg.",
          "Menos es más al comenzar: Como principiante, tu cuerpo responde rápido. Realizar entre 6 y 10 series semanales bien hechas por grupo muscular es suficiente para ver adaptaciones notables.",
          "Calidad sobre volumen basura: Agregar series de más cuando ya estás fatigado solo retrasa la recuperación sin aportar más crecimiento.",
        ],
        icon: "layers",
      },
      {
        id: "p_pr",
        topic: "pr",
        title: "¿Qué es un PR (Personal Record / Récord Personal)?",
        summary:
          "PR significa 'Personal Record': es la mejor marca histórica registrada en un ejercicio particular.",
        details: [
          "Qué mide un PR: Puede ser el peso máximo a 1 repetición, o tu mejor registro a un número determinado de reps (ej: 40 kg × 10 reps).",
          "No busques romperlo en cada sesión: En nivel principiante, tus récords personales subirán de forma natural cada 1 o 2 semanas gracias a la adaptación neuromuscular.",
          "Regla de oro: Un PR solo es válido si se realizó con la misma técnica impecable que una serie liviana. Nunca sacrifiques postura por un récord.",
        ],
        icon: "trophy",
      },
    ],
    recommendations: [
      "Descansá entre 90 y 120 segundos entre series de fuerza para comenzar la siguiente con energía renovada.",
      "Respetá al menos 48 horas de descanso antes de volver a solicitar de forma intensa el mismo grupo muscular.",
      "Anotá cada serie en FitTracker de inmediato mientras la sensación del peso sigue fresca.",
    ],
  },
  intermedio: {
    id: "intermedio",
    title: "Intermedio",
    subtitle: "Sobrecarga progresiva sistemática, hipertrofia y consistencia",
    badge: "Progresión",
    description:
      "Foco en optimizar el volumen semanal, programar incrementos de carga precisos y sostener la disciplina en el tiempo.",
    color: "purple",
    topics: ["Progresión", "Volumen", "Cargas", "Consistencia"],
    explanations: [
      {
        id: "i_progresion",
        topic: "progresion",
        title: "El Principio de Sobrecarga Progresiva",
        summary:
          "Para que el músculo siga creciendo cuando la adaptación inicial termina, debés desafiarlo con estímulos incrementalmente mayores.",
        details: [
          "Progresión doble: Fijá un rango objetivo (por ejemplo 8 a 12 reps). Mantené el mismo peso hasta completar 12 reps en todas tus series; recién entonces sumá 1.25kg a 2.5kg y volvé a la base de 8 reps.",
          "Proximidad al fallo (RIR 1-2): RIR significa 'Reps in Reserve'. Finalizá tus series efectivas sintiendo que podías hacer 1 o 2 repeticiones más con buena forma. Ir al fallo absoluto en cada serie solo acumula fatiga prematura.",
          "Múltiples formas de progresar: Sumar 1 rep extra, mejorar la cadencia o reducir 15 segundos el descanso también constituye sobrecarga progresiva.",
        ],
        icon: "trending-up",
      },
      {
        id: "i_volumen",
        topic: "volumen",
        title: "Volumen Óptimo de Hipertrofia",
        summary:
          "El rango de máxima respuesta muscular se sitúa entre 10 y 16 series efectivas semanales por grupo muscular.",
        details: [
          "Series efectivas: Solo cuentan las series con esfuerzo real (RIR 1-3). Las aproximaciones no se computan como volumen de hipertrofia.",
          "Frecuencia 2: Distribuir 12 series semanales en dos sesiones de 6 series (ej: Lunes y Jueves) genera mayor síntesis proteica acumulada que 12 series en un solo día.",
          "Monitoreo semanal: Usá la sección 'Consistencia Semanal' en FitTracker para asegurar que tu tonelaje se mantenga estable o en leve ascenso.",
        ],
        icon: "layers",
      },
      {
        id: "i_cargas",
        topic: "cargas",
        title: "Manejo de Cargas y Micro-Incrementos",
        summary:
          "Los saltos de peso deben ser sostenibles: las micro-cargas de 1.25 kg a 2.5 kg son el secreto del progreso continuo.",
        details: [
          "Básicos vs aislados: En ejercicios compuestos (sentadilla, press banca, peso muerto) progresá con 2.5 kg. En aislamiento (vuelos laterales, brazos) progresá primero en reps antes de subir peso.",
          "Carga consolidada: Cuando alcances el tope de repeticiones en todas tus series de trabajo con buena forma, el peso está consolidado para el siguiente escalón.",
          "Calentamiento piramidal: Hacé series cortas al 40%, 60% y 80% del peso de trabajo para activar el sistema nervioso sin gastar glucógeno.",
        ],
        icon: "dumbbell",
      },
      {
        id: "i_consistencia",
        topic: "consistencia",
        title: "Consistencia y Gestión del Esfuerzo",
        summary:
          "La adherencia al programa semana a semana vence a la intensidad esporádica desmedida.",
        details: [
          "Días de baja energía (Voluntad de Hierro): Entrenar con energía 1 o 2 sobre 5 es sumamente valioso. No busques récords: cumplí el volumen previsto, descansá generosamente y protegé la constancia.",
          "Regla del 85%: Cumplir con 3 o 4 sesiones semanales de forma ininterrumpida durante 6 meses transforma cualquier físico.",
          "Monitoreo de fatiga: Calibrá tu estado de ánimo y esfuerzo mental en FitTracker para prevenir acumulación de fatiga residual.",
        ],
        icon: "flame",
      },
    ],
    recommendations: [
      "Priorizá progresar en repeticiones antes de forzar más kilos en la barra.",
      "Descansá entre 2 y 3 minutos en movimientos compuestos pesados y 60-90 segundos en aislamiento.",
      "Si una carga no sube en 3 semanas, revisá si estás durmiendo 7-8h y consumiendo suficiente proteína.",
    ],
  },
  avanzado: {
    id: "avanzado",
    title: "Avanzado",
    subtitle: "Optimización neuromuscular, periodización, autorregulación y estancamientos",
    badge: "Alto Rendimiento",
    description:
      "Foco en análisis fino de fatiga del SNC, manejo de mesetas, periodización ondulante y técnica biomecánica de precisión.",
    color: "amber",
    topics: [
      "Análisis de Rendimiento",
      "Volumen y MRV",
      "PR & Peaking",
      "Progresión Ondulante",
      "Estancamientos",
      "Técnica Avanzada",
    ],
    explanations: [
      {
        id: "a_rendimiento",
        topic: "rendimiento",
        title: "Análisis de Rendimiento & Fatiga del SNC",
        summary:
          "Medición precisa de fatiga neuromuscular para autorregular el volumen antes de caer en sobreentrenamiento.",
        details: [
          "Monitoreo de RPE / RIR: Diferenciar con rigor si una serie fue RPE 8, 9 o 10. Fallar mecánicamente en ejercicios axiales genera fatiga sistémica que compromete los siguientes 4 días.",
          "Velocidad de ejecución (VBT): Una desaceleración involuntaria en la primera repetición con tu peso habitual es la señal directa de fatiga residual del sistema nervioso central.",
          "Retención en días bajos: Tu porcentaje de retención en días de energía ≤ 2 revela la solidez de tu fuerza base frente a días óptimos.",
        ],
        icon: "activity",
      },
      {
        id: "a_volumen",
        topic: "volumen",
        title: "Gestión de MEV, MAV y MRV",
        summary:
          "El volumen debe oscilar estratégicamente a lo largo de los mesociclos para romper barreras adaptativas.",
        details: [
          "MEV (Volumen Mínimo Efectivo): El piso necesario para sostener músculo (~6-8 series/semana por grupo). Se utiliza en semanas de descarga.",
          "MAV (Volumen Máximo Adaptativo): El punto dulce de máximo crecimiento (~12-20 series/semana según tolerancia y grupo muscular).",
          "MRV (Volumen Máximo Recuperable): El techo biológico donde el volumen extra deteriora la recuperación y frena adaptaciones.",
          "Estrategia de mesociclo: Comenzar cerca del MEV y sumar 1-2 series semanales hasta alcanzar el MRV, seguido de una descarga planificada.",
        ],
        icon: "layers",
      },
      {
        id: "a_pr",
        topic: "pr",
        title: "Estrategia de PRs & Peaking de Fuerza",
        summary:
          "Los récords a nivel avanzado se conquistan mediante fases de acumulación, intensificación y picos de rendimiento.",
        details: [
          "Diferenciación de PRs: Distinguí entre 1RM absoluto, PRs de repeticiones (ej: 5RM o 8RM) y PR de tonelaje global en la sesión.",
          "Peaking de fuerza: Reducir el volumen un 40-50% manteniendo la intensidad de carga durante 7 a 10 días disipa la fatiga y revela la verdadera capacidad del SNC.",
          "Potenciación Post-Activación (PAP): Una repetición pesada al 90% antes de las series de trabajo recluta unidades motoras de alto umbral.",
        ],
        icon: "trophy",
      },
      {
        id: "a_progresion",
        topic: "progresion",
        title: "Progresión No Lineal y Periodización Ondulante",
        summary:
          "La progresión lineal ya no es suficiente: la periodización ondulante diaria (DUP) evita mesetas adaptativas.",
        details: [
          "DUP (Daily Undulating Periodization): Trabajar el mismo músculo con diferentes rangos en la semana (ej: Día 1 = Fuerza a 4-6 reps; Día 2 = Hipertrofia a 8-12 reps; Día 3 = Bombeo a 15-20 reps).",
          "Variación sin cambiar de ejercicio: Conservá los movimientos madre para perfeccionar el patrón neuromuscular mientras alternás rangos de intensidad.",
          "Micro-cargas fraccionadas: Discos de 0.5 kg y 1.25 kg son indispensables para continuar elevando la curva de fuerza en básicos consolidados.",
        ],
        icon: "trending-up",
      },
      {
        id: "a_estancamientos",
        topic: "estancamientos",
        title: "Superación de Estancamientos y Mesetas",
        summary:
          "Protocolos basados en evidencia para destrabar estancamientos crónicos en cargas o repeticiones.",
        details: [
          "Descarga Activa Programada (Deload): Reducir al 50% las series de trabajo manteniendo el 85% de la carga habitual durante 1 semana para restaurar sensibilidad y tendones.",
          "Puntos de estancamiento (Sticking points): Emplear pausas isométricas de 2 segundos en el punto de máxima desventaja mecánica (ej: en el pecho en banca o en paralelo en sentadillas).",
          "Rotación de variantes: Si un ejercicio básico está estancado por más de 6 semanas, rotar a una variante similar (barra a mancuernas pesadas o déficit) por 4 semanas para reactivar adaptaciones sin interferencia neural.",
        ],
        icon: "zap",
      },
      {
        id: "a_tecnica_avanzada",
        topic: "tecnica_avanzada",
        title: "Técnica Biomecánica Avanzada y Autorregulación",
        summary:
          "Alineación personalizada según la anatomía individual y gestión inteligente de la fatiga articular.",
        details: [
          "Alineación de perfil de resistencia y curva de fuerza: Elegir implementos que apliquen máxima resistencia donde el músculo tiene mayor ventaja mecánica.",
          "Gestión de fatiga axial: Equilibrar movimientos que cargan la columna con variantes apoyadas en banco o poleas para sostener el volumen sin agotar el raquis.",
          "Autorregulación intrasesión: Si la primera serie efectiva se percibe a RPE 9 cuando estaba prevista a RPE 7, recortar 1 serie accesoria para priorizar calidad adaptativa.",
        ],
        icon: "target",
      },
    ],
    recommendations: [
      "Programá semanas de descarga activa cada 5 a 7 semanas de alta intensidad continua.",
      "Monitoreá de cerca el RPE y reservá el RPE 10 exclusivamente para tests programados.",
      "Combiná ejercicios con máxima tensión en estiramiento con perfiles de polea en acortamiento.",
    ],
  },
};

function getTopicIcon(iconName) {
  switch (iconName) {
    case "repeat":
      return Repeat;
    case "shield-check":
      return ShieldCheck;
    case "layers":
      return Layers;
    case "trophy":
      return Trophy;
    case "trending-up":
      return TrendingUp;
    case "bar-chart-2":
      return Activity;
    case "dumbbell":
      return Dumbbell;
    case "flame":
      return Flame;
    case "activity":
      return Activity;
    case "zap":
      return Zap;
    case "target":
      return Target;
    default:
      return Lightbulb;
  }
}

export default function ProfileModal({
  isOpen,
  onClose,
  currentLevel = "intermedio",
  onLevelChange,
  userProfile = null,
}) {
  const [activeModalTab, setActiveModalTab] = useState("physical"); // "physical" | "guide"
  const [activeTabLevel, setActiveTabLevel] = useState(currentLevel);
  const [isUpdating, setIsUpdating] = useState(false);
  const [explanationsData, setExplanationsData] = useState(DEFAULT_LEVEL_EXPLANATIONS);
  const [expandedTopicId, setExpandedTopicId] = useState(null);

  // Physical profile state
  const [bodyweight, setBodyweight] = useState("");
  const [height, setHeight] = useState("");
  const [trainingGoal, setTrainingGoal] = useState("hipertrofia");
  const [isSavingPhysical, setIsSavingPhysical] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setActiveTabLevel(currentLevel);
  }, [currentLevel, isOpen]);

  useEffect(() => {
    if (userProfile) {
      if (userProfile?.bodyweight !== null && userProfile?.bodyweight !== undefined) {
        setBodyweight(String(userProfile?.bodyweight ?? 70));
      }
      if (userProfile?.height !== null && userProfile?.height !== undefined) {
        setHeight(String(userProfile?.height ?? 170));
      }
      if (userProfile?.training_goal) {
        setTrainingGoal(userProfile?.training_goal ?? "hipertrofia");
      }
      if (userProfile?.experience_level) {
        setActiveTabLevel(userProfile?.experience_level ?? "intermedio");
      }
    }
  }, [userProfile, isOpen]);

  useEffect(() => {
    if (isOpen) {
      getProfile()
        .then((profile) => {
          if (profile) {
            if (profile?.bodyweight !== null && profile?.bodyweight !== undefined) {
              setBodyweight(String(profile?.bodyweight ?? 70));
            }
            if (profile?.height !== null && profile?.height !== undefined) {
              setHeight(String(profile?.height ?? 170));
            }
            if (profile?.training_goal) {
              setTrainingGoal(profile?.training_goal ?? "hipertrofia");
            }
            if (profile?.experience_level) {
              setActiveTabLevel(profile?.experience_level ?? "intermedio");
            }
          }
        })
        .catch((err) => {
          console.warn("Error cargando perfil físico:", err);
        });

      getLevelExplanations()
        .then((res) => {
          if (res && res.levels) {
            setExplanationsData(res.levels);
          }
        })
        .catch(() => {
          // Use fallback data seamlessly
        });
    }
  }, [isOpen]);

  const bmiData = useMemo(() => {
    const bw = parseFloat(bodyweight);
    const h = parseFloat(height);
    if (!bw || !h || bw <= 0 || h <= 0) return null;
    const hM = h / 100;
    const val = bw / (hM * hM);
    const bmi = Math.round(val * 10) / 10;
    let label = "Saludable / Atlético";
    let color = "text-emerald-400";
    if (bmi < 18.5) {
      label = "Bajo peso";
      color = "text-amber-400";
    } else if (bmi < 25) {
      label = "Saludable / En Forma";
      color = "text-emerald-400";
    } else if (bmi < 30) {
      label = "Hipertrofia / Robusto";
      color = "text-[#C084FC]";
    } else {
      label = "Elevado";
      color = "text-rose-400";
    }
    return { bmi, label, color };
  }, [bodyweight, height]);

  const handleSavePhysicalProfile = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsSavingPhysical(true);
      const bw = bodyweight !== "" ? parseFloat(bodyweight) : null;
      const h = height !== "" ? parseFloat(height) : null;

      const updated = await updateProfile({
        bodyweight: bw,
        height: h,
        training_goal: trainingGoal,
        experience_level: activeTabLevel,
      });

      if (updated && updated.experience_level && onLevelChange) {
        onLevelChange(updated.experience_level);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error("Error guardando perfil físico:", err);
      alert(err.response?.data?.detail || "Error al guardar el perfil físico.");
    } finally {
      setIsSavingPhysical(false);
    }
  };

  const handleSelectLevel = async (lvl) => {
    if (lvl === activeTabLevel) return;
    try {
      setIsUpdating(true);
      const updated = await updateProfile({ experience_level: lvl });
      if (updated && updated.experience_level) {
        if (onLevelChange) onLevelChange(updated.experience_level);
        window.dispatchEvent(
          new CustomEvent("fittracker:levelChanged", { detail: updated.experience_level })
        );
      }
      setActiveTabLevel(lvl);
    } catch (err) {
      console.error("Error actualizando nivel:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  const currentLevelObj =
    explanationsData[activeTabLevel] ||
    DEFAULT_LEVEL_EXPLANATIONS[activeTabLevel] ||
    DEFAULT_LEVEL_EXPLANATIONS.intermedio;

  const goalsList = [
    {
      id: "hipertrofia",
      title: "Hipertrofia",
      badgeLabel: "⚡ Hipertrofia",
      repsRange: "8 a 12 reps",
      intensity: "65-80% 1RM",
      adviceBadge: "⚡ En rango de Hipertrofia óptimo",
      description: "Crecimiento muscular estético, volumen acumulado y RPE 7-9.",
      icon: Zap,
      borderActive: "border-[#A855F7] bg-[#9333EA]/20 text-white shadow-neon",
      borderInactive: "border-[#2D1B4E] bg-[#0E0919] hover:border-[#A855F7]/40",
      accentText: "text-[#C084FC]",
    },
    {
      id: "fuerza",
      title: "Fuerza Máxima",
      badgeLabel: "💥 Fuerza Pura",
      repsRange: "1 a 5 reps",
      intensity: ">85% 1RM",
      adviceBadge: "💥 Estímulo de Fuerza pura",
      description: "Alta tensión mecánica, adaptación del SNC y densidad neural.",
      icon: Flame,
      borderActive: "border-amber-500 bg-amber-500/20 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]",
      borderInactive: "border-[#2D1B4E] bg-[#0E0919] hover:border-amber-500/40",
      accentText: "text-amber-300",
    },
    {
      id: "potencia_rapidez",
      title: "Potencia y Rapidez",
      badgeLabel: "🚀 Potencia",
      repsRange: "3 a 6 reps",
      intensity: "40-60% 1RM",
      adviceBadge: "⚡ Estímulo de Potencia y Velocidad",
      description: "Cargas medias movidas a la máxima aceleración concéntrica posible.",
      icon: TrendingUp,
      borderActive: "border-cyan-500 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]",
      borderInactive: "border-[#2D1B4E] bg-[#0E0919] hover:border-cyan-500/40",
      accentText: "text-cyan-300",
    },
    {
      id: "definicion_adelgazar",
      title: "Definición / Adelgazar",
      badgeLabel: "🛡️ Protección",
      repsRange: "4 a 10 reps firmes",
      intensity: "Pesada en déficit",
      adviceBadge: "🛡️ Carga protectora de masa",
      description: "Mantenimiento estricto de cargas pesadas para retener masa en déficit calórico.",
      icon: ShieldCheck,
      borderActive: "border-emerald-500 bg-emerald-500/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]",
      borderInactive: "border-[#2D1B4E] bg-[#0E0919] hover:border-emerald-500/40",
      accentText: "text-emerald-300",
    },
  ];

  const levelsList = [
    {
      id: "principiante",
      title: "Principiante",
      badge: "Fundamentos",
      summary: "Técnica, series, repeticiones, volumen y PRs básicos.",
      colorClass: "from-emerald-600 to-teal-500",
      borderActive: "border-emerald-500",
      bgActive: "bg-emerald-500/15",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    },
    {
      id: "intermedio",
      title: "Intermedio",
      badge: "Progresión",
      summary: "Sobrecarga progresiva, volumen, cargas y consistencia.",
      colorClass: "from-purple-600 to-fuchsia-500",
      borderActive: "border-[#A855F7]",
      bgActive: "bg-[#1C1433]",
      badgeColor: "bg-[#9333EA]/20 text-[#C084FC] border-[#A855F7]/40",
    },
    {
      id: "avanzado",
      title: "Avanzado",
      badge: "Alto Rendimiento",
      summary: "Análisis de rendimiento, MRV, estancamientos, técnica y periodización.",
      colorClass: "from-amber-600 to-orange-500",
      borderActive: "border-amber-500",
      bgActive: "bg-amber-500/15",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border-2 border-[#A855F7]/40 bg-[#140E24] shadow-neonLg overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#2D1B4E] bg-[#0E0919] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#9333EA] to-[#A855F7] text-white shadow-neon flex-shrink-0">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Mi Perfil Físico &amp; Nivel
                </h2>
                <span className="rounded-md border border-[#A855F7]/40 bg-[#9333EA]/20 px-2 py-0.5 text-[9px] font-black uppercase text-[#C084FC]">
                  {goalsList.find((g) => g.id === trainingGoal)?.title || "Hipertrofia"}
                </span>
                {bodyweight && (
                  <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300">
                    {bodyweight} kg
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Personalizá tu peso, altura y objetivo para el Asesor Inteligente de Cargas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#71717A] hover:bg-[#1C1433] hover:text-white transition"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Tab Switcher */}
        <div className="flex border-b border-[#2D1B4E] bg-[#0E0919] px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveModalTab("physical")}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs sm:text-sm font-black transition ${
              activeModalTab === "physical"
                ? "border-[#A855F7] text-white shadow-[0_2px_10px_rgba(168,85,247,0.3)]"
                : "border-transparent text-[#71717A] hover:text-[#A1A1AA]"
            }`}
          >
            <Scale size={15} className={activeModalTab === "physical" ? "text-[#A855F7]" : ""} />
            <span>Mi Perfil Físico</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab("guide")}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs sm:text-sm font-black transition ${
              activeModalTab === "guide"
                ? "border-[#A855F7] text-white shadow-[0_2px_10px_rgba(168,85,247,0.3)]"
                : "border-transparent text-[#71717A] hover:text-[#A1A1AA]"
            }`}
          >
            <BookOpen size={15} className={activeModalTab === "guide" ? "text-[#A855F7]" : ""} />
            <span>Nivel &amp; Guía Educativa</span>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {activeModalTab === "physical" ? (
            /* TAB 1: MI PERFIL FÍSICO */
            <form onSubmit={handleSavePhysicalProfile} className="space-y-5">
              {saveSuccess && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in">
                  <Check size={16} className="text-emerald-400 flex-shrink-0" />
                  <span className="font-bold">¡Perfil físico guardado con éxito! El Asesor de Cargas y Ratios ya están activos.</span>
                </div>
              )}

              {/* Weight & Height Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Weight Input */}
                <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                      <Scale size={14} className="text-[#A855F7]" />
                      <span>Peso Corporal</span>
                    </label>
                    <span className="text-[10px] font-bold text-[#71717A]">Base Fuerza Relativa</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(bodyweight) || (userProfile?.bodyweight ?? 70);
                        setBodyweight(String(Math.max(20, Math.round((cur - 0.5) * 10) / 10)));
                      }}
                      className="oled-stepper-btn h-11 w-11 text-xs"
                      title="-0.5 kg"
                    >
                      -0.5
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="20"
                        max="350"
                        placeholder="ej: 75.0"
                        value={bodyweight}
                        onChange={(e) => setBodyweight(e.target.value)}
                        className="iron-input w-full text-center text-base font-black py-2 pr-9"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#71717A]">
                        kg
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(bodyweight) || (userProfile?.bodyweight ?? 70);
                        setBodyweight(String(Math.min(300, Math.round((cur + 0.5) * 10) / 10)));
                      }}
                      className="oled-stepper-btn h-11 w-11 text-xs"
                      title="+0.5 kg"
                    >
                      +0.5
                    </button>
                  </div>
                  <p className="text-[11px] text-[#71717A]">
                    Se usa para calcular: <strong>PR / Peso (ej: 80kg = 1.05× tu peso)</strong>.
                  </p>
                </div>

                {/* Height Input */}
                <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                      <Ruler size={14} className="text-[#A855F7]" />
                      <span>Altura</span>
                    </label>
                    <span className="text-[10px] font-bold text-[#71717A]">Índice Biométrico</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(height) || (userProfile?.height ?? 170);
                        setHeight(String(Math.max(50, Math.round(cur - 1))));
                      }}
                      className="oled-stepper-btn h-11 w-11 text-xs"
                      title="-1 cm"
                    >
                      -1
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="1"
                        min="50"
                        max="250"
                        placeholder="ej: 178"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="iron-input w-full text-center text-base font-black py-2 pr-9"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#71717A]">
                        cm
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(height) || (userProfile?.height ?? 170);
                        setHeight(String(Math.min(240, Math.round(cur + 1))));
                      }}
                      className="oled-stepper-btn h-11 w-11 text-xs"
                      title="+1 cm"
                    >
                      +1
                    </button>
                  </div>

                  {bmiData ? (
                    <p className="text-[11px] text-[#A1A1AA] flex items-center justify-between">
                      <span>IMC calculado: <strong className="text-white">{bmiData.bmi}</strong></span>
                      <span className={`font-black ${bmiData.color}`}>{bmiData.label}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#71717A]">
                      Ingresá peso y altura para calcular tu composición básica (IMC).
                    </p>
                  )}
                </div>
              </div>

              {/* Training Goal Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                    <Target size={14} className="text-[#A855F7]" />
                    <span>Objetivo de Entrenamiento</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#A855F7]">
                    Adapta las alertas del Asesor Inteligente
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {goalsList.map((g) => {
                    const isSelected = trainingGoal === g.id;
                    const Icon = g.icon;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setTrainingGoal(g.id)}
                        className={`relative rounded-xl border p-3.5 text-left transition flex flex-col justify-between gap-2.5 active:scale-[0.98] ${
                          isSelected ? g.borderActive : g.borderInactive
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#9333EA]/20 text-[#C084FC]">
                                <Icon size={15} />
                              </span>
                              <span className="text-sm font-black text-white">{g.title}</span>
                            </div>
                            {isSelected && (
                              <span className="flex items-center gap-1 rounded-full bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40 px-2 py-0.5 text-[9px] font-black uppercase">
                                <Check size={11} /> Activo
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-[10px] font-black">
                            <span className="rounded bg-[#1C1433] px-2 py-0.5 text-[#C084FC] border border-[#2D1B4E]">
                              {g.repsRange}
                            </span>
                            <span className="text-[#A1A1AA]">{g.intensity}</span>
                          </div>

                          <p className="mt-2 text-[11px] text-[#A1A1AA] leading-snug">
                            {g.description}
                          </p>
                        </div>

                        {/* Advisor preview pill */}
                        <div className="pt-2 border-t border-[#2D1B4E]/60 flex items-center justify-between text-[10px]">
                          <span className="text-[#71717A] font-bold">Mensaje en series:</span>
                          <span className={`font-black ${g.accentText}`}>{g.adviceBadge}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Experience Level Quick Selector inside Physical Tab */}
              <div className="rounded-xl border border-[#2D1B4E] bg-[#0E0919] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
                    Nivel de Experiencia
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("guide")}
                    className="text-[11px] font-bold text-[#C084FC] hover:underline"
                  >
                    Ver explicaciones detalladas →
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["principiante", "intermedio", "avanzado"].map((lvlKey) => {
                    const isSelected = activeTabLevel === lvlKey;
                    return (
                      <button
                        key={lvlKey}
                        type="button"
                        onClick={() => setActiveTabLevel(lvlKey)}
                        className={`rounded-xl py-2 px-2 text-xs font-black capitalize transition border text-center ${
                          isSelected
                            ? "border-[#A855F7] bg-[#9333EA]/20 text-white shadow-neon"
                            : "border-[#2D1B4E] bg-[#140E24] text-[#A1A1AA] hover:text-white hover:border-[#A855F7]/30"
                        }`}
                      >
                        {lvlKey}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save Physical Profile CTA Button */}
              <button
                type="submit"
                disabled={isSavingPhysical}
                className="iron-btn-primary w-full py-3 text-sm font-black flex items-center justify-center gap-2 shadow-neon active:scale-[0.99]"
              >
                {isSavingPhysical ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Guardando datos del perfil...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Guardar Mi Perfil Físico</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB 2: GUÍA EDUCATIVA & NIVEL */
            <div className="space-y-5">
              {/* Non-Blocking Notice Banner */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2.5 text-xs text-emerald-200">
                <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-bold">100% de funcionalidades desbloqueadas</strong>
                  <p className="text-[11px] text-emerald-200/90 mt-0.5 leading-relaxed">
                    El nivel de experiencia adapta las explicaciones educativas, consejos del Coach y sugerencias de sobrecarga.
                    <strong> No bloquea ninguna función de la aplicación:</strong> todos los ejercicios, métricas, récords y modos de entrenamiento están totalmente disponibles para todos los niveles.
                  </p>
                </div>
              </div>

              {/* Level Selector Buttons (3 cards) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
                    Seleccioná o modificá tu nivel
                  </label>
                  {isUpdating && (
                    <span className="flex items-center gap-1.5 text-[11px] text-[#A855F7] font-bold">
                      <Loader2 size={13} className="animate-spin" />
                      Guardando perfil...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {levelsList.map((lvl) => {
                    const isActive = activeTabLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => handleSelectLevel(lvl.id)}
                        disabled={isUpdating}
                        className={`relative rounded-xl border p-3.5 text-left transition flex flex-col justify-between gap-2.5 active:scale-[0.98] ${
                          isActive
                            ? `${lvl.borderActive} ${lvl.bgActive} shadow-neon`
                            : "border-[#2D1B4E] bg-[#0E0919] hover:border-[#A855F7]/30 hover:bg-[#140E24]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-sm font-black text-white">{lvl.title}</span>
                            {isActive && (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-black uppercase">
                                <Check size={11} /> Activo
                              </span>
                            )}
                          </div>
                          <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase ${lvl.badgeColor}`}>
                            {lvl.badge}
                          </span>
                          <p className="mt-2 text-[11px] text-[#A1A1AA] leading-snug">
                            {lvl.summary}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#2D1B4E]/60 flex items-center justify-between text-[10px] font-bold">
                          <span className={isActive ? "text-emerald-400" : "text-[#71717A]"}>
                            {isActive ? "Nivel activo" : "Clic para activar"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guide Explanations Section */}
              <div className="rounded-2xl border border-[#2D1B4E] bg-[#0E0919] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2D1B4E] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-[#A855F7]" />
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Guía &amp; Conceptos Clave: {currentLevelObj.title}
                  </h3>
                  <span className="rounded-md border border-[#A855F7]/40 bg-[#9333EA]/20 px-2 py-0.5 text-[10px] font-black uppercase text-[#C084FC]">
                    {currentLevelObj.badge}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  {currentLevelObj.description}
                </p>
              </div>

              {/* Quick tab switcher for previewing other levels */}
              <div className="flex items-center gap-1 self-start sm:self-center bg-[#140E24] p-1 rounded-xl border border-[#2D1B4E]">
                {["principiante", "intermedio", "avanzado"].map((lvlKey) => (
                  <button
                    key={lvlKey}
                    type="button"
                    onClick={() => setActiveTabLevel(lvlKey)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition ${
                      activeTabLevel === lvlKey
                        ? "bg-[#9333EA] text-white shadow-sm"
                        : "text-[#71717A] hover:text-white"
                    }`}
                  >
                    {lvlKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Explanations List for the Active Tab */}
            <div className="space-y-2.5">
              {currentLevelObj.explanations?.map((item) => {
                const IconComponent = getTopicIcon(item.icon);
                const isExpanded = expandedTopicId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#2D1B4E] bg-[#140E24] p-3.5 transition hover:border-[#A855F7]/40 space-y-2"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedTopicId(isExpanded ? null : item.id)}
                      className="w-full flex items-start justify-between gap-3 text-left"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#9333EA]/20 text-[#C084FC] flex-shrink-0 mt-0.5">
                          <IconComponent size={15} />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-black text-white">
                              {item.title}
                            </h4>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#71717A]">
                              {item.topic}
                            </span>
                          </div>
                          <p className="text-xs text-[#D4D4D8] mt-1 leading-relaxed">
                            {item.summary}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-lg p-1 text-[#71717A] hover:bg-[#1C1433] hover:text-white flex-shrink-0">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </button>

                    {/* Detailed expandable explanation */}
                    {isExpanded && item.details && (
                      <div className="pt-2 border-t border-[#2D1B4E]/80 pl-9 space-y-2 animate-in fade-in duration-150">
                        <ul className="space-y-2 text-xs text-[#A1A1AA]">
                          {item.details.map((detail, dIdx) => (
                            <li key={dIdx} className="flex items-start gap-2">
                              <span className="text-[#A855F7] font-bold mt-0.5">•</span>
                              <span className="leading-relaxed">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Level Practical Recommendations */}
            {currentLevelObj.recommendations?.length > 0 && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5 space-y-2">
                <h4 className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  Recomendaciones Clave para {currentLevelObj.title}
                </h4>
                <ul className="space-y-1.5 text-xs text-[#D4D4D8]">
                  {currentLevelObj.recommendations.map((rec, rIdx) => (
                    <li key={rIdx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick action to make the viewed tab active if different */}
            {activeTabLevel !== currentLevel && (
              <div className="pt-2 flex justify-between items-center bg-[#140E24] p-3 rounded-xl border border-[#2D1B4E]">
                <span className="text-xs text-[#A1A1AA]">
                  ¿Querés cambiar tu perfil a <strong>{currentLevelObj.title}</strong>?
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectLevel(activeTabLevel)}
                  disabled={isUpdating}
                  className="iron-btn-primary px-3 py-1.5 text-xs font-black flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Establecer como mi nivel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

        {/* Modal Footer */}
        <div className="border-t border-[#2D1B4E] bg-[#0E0919] p-4 sm:p-5 flex items-center justify-between">
          <div className="text-[11px] text-[#71717A]">
            Podés cambiar tu nivel en cualquier momento según tu evolución física.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#2D1B4E] bg-[#140E24] px-4 py-2 text-xs font-bold text-white hover:bg-[#1C1433] transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
