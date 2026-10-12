import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Eye,
  Flame,
  Info,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import { showToast } from "../components/Toast";

// LOS 4 BLOQUES ESTRUCTURADOS DE 5 EJERCICIOS (SISTEMA HEAVY DUTY APP)
export const BITACORA_BLOCKS = [
  {
    id: "torso-a",
    key: "torso_a",
    name: "Torso A",
    subtitle: "Pecho & Espalda",
    muscles: ["Pecho", "Espalda"],
    gradient: "from-[#FF5722] to-[#FF8A65]",
    borderGlow: "border-[#FF5722]/30",
    bgBadge: "bg-[#FF5722]/10 text-[#FF5722] border-[#FF5722]/20",
    description: "Pre-agotamiento de torso superior: Aperturas seguidas de press, y pullover seguido de jalón y remo.",
    exercises: [
      {
        order: 1,
        name: "Aperturas en máquina Peck Deck",
        muscle: "Pecho",
        equipment: "Máquina",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Pre-agotamiento",
        cue: "Mantener codos flexionados fijos, pausa isométrica de 2s en contracción máxima.",
      },
      {
        order: 2,
        name: "Press inclinado con barra",
        muscle: "Pecho",
        equipment: "Barra",
        target_sets: 1,
        target_reps: "4-8",
        cadence: "4-2-4",
        tag: "Básico Pesado",
        cue: "Descenso controlado en 4 segundos hasta rozar el tercio superior del pecho.",
      },
      {
        order: 3,
        name: "Pullover en polea alta",
        muscle: "Espalda",
        equipment: "Polea",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Pre-agotamiento",
        cue: "Brazos casi rectos, flexión dorsal pura sin involucrar los tríceps.",
      },
      {
        order: 4,
        name: "Jalón al pecho agarre neutro/estrecho",
        muscle: "Espalda",
        equipment: "Polea",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Compuesto",
        cue: "Tirar con los codos pegados al cuerpo, apretar dorsales 2s abajo.",
      },
      {
        order: 5,
        name: "Remo con barra (prono/supino)",
        muscle: "Espalda",
        equipment: "Barra",
        target_sets: 1,
        target_reps: "6-8",
        cadence: "4-2-4",
        tag: "Densidad",
        cue: "Tronco a 45-70 grados, barra hacia la zona umbilical sin balanceo.",
      },
    ],
  },
  {
    id: "pierna-a",
    key: "pierna_a",
    name: "Pierna A",
    subtitle: "Cuádriceps & Gemelos",
    muscles: ["Cuádriceps", "Gemelos"],
    gradient: "from-[#FF7043] to-[#7C4DFF]",
    borderGlow: "border-[#FF7043]/30",
    bgBadge: "bg-[#FF7043]/10 text-[#FF7043] border-[#FF7043]/20",
    description: "Sobrecarga de cadena anterior: Aislamiento concéntrico de cuádriceps antes de prensas y sentadilla.",
    exercises: [
      {
        order: 1,
        name: "Extensión de cuádriceps en máquina",
        muscle: "Piernas",
        equipment: "Máquina",
        target_sets: 1,
        target_reps: "8-12",
        cadence: "4-2-4",
        tag: "Pre-agotamiento",
        cue: "Bloqueo arriba con contracción violenta sostenida de 2 segundos.",
      },
      {
        order: 2,
        name: "Prensa inclinada con discos",
        muscle: "Piernas",
        equipment: "Máquina",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Básico Pesado",
        cue: "Descenso profundo y controlado, no trabar rodillas al extender.",
      },
      {
        order: 3,
        name: "Sentadilla trasera con barra",
        muscle: "Piernas",
        equipment: "Barra",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Compuesto Central",
        cue: "Profundidad paralela o sub-paralela, presión en los talones.",
      },
      {
        order: 4,
        name: "Elevación de talones de pie en máquina",
        muscle: "Piernas",
        equipment: "Máquina",
        target_sets: 1,
        target_reps: "12-15",
        cadence: "4-2-4",
        tag: "Gemelos",
        cue: "Rango articular completo: estiramiento profundo abajo, pausa arriba.",
      },
      {
        order: 5,
        name: "Elevación de talones sentado",
        muscle: "Piernas",
        equipment: "Máquina",
        target_sets: 1,
        target_reps: "12-15",
        cadence: "4-2-4",
        tag: "Sóleo",
        cue: "Foco en el sóleo, cadencia hiper-lenta en el fondo del movimiento.",
      },
    ],
  },
  {
    id: "torso-b",
    key: "torso_b",
    name: "Torso B",
    subtitle: "Hombros & Brazos",
    muscles: ["Hombros", "Brazos"],
    gradient: "from-[#7C4DFF] to-[#B388FF]",
    borderGlow: "border-[#7C4DFF]/30",
    bgBadge: "bg-[#7C4DFF]/10 text-[#7C4DFF] border-[#7C4DFF]/20",
    description: "Especialización de deltoides y brazos: Lateral raises previas al press militar y trabajo directo de bíceps y tríceps.",
    exercises: [
      {
        order: 1,
        name: "Elevaciones laterales con mancuernas",
        muscle: "Hombros",
        equipment: "Mancuerna",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Pre-agotamiento",
        cue: "Elevar con los codos guiando el movimiento, sin impulso corporal.",
      },
      {
        order: 2,
        name: "Press militar de pie con barra",
        muscle: "Hombros",
        equipment: "Barra",
        target_sets: 1,
        target_reps: "4-8",
        cadence: "4-2-4",
        tag: "Básico Pesado",
        cue: "Core apretado, barra sube vertical rozando la nariz.",
      },
      {
        order: 3,
        name: "Pájaros para deltoides posterior con mancuernas",
        muscle: "Hombros",
        equipment: "Mancuerna",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Posterior",
        cue: "Tronco horizontal, abducción horizontal estricta.",
      },
      {
        order: 4,
        name: "Extensión en polea con barra (pushdown)",
        muscle: "Tríceps",
        equipment: "Polea",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Aislamiento Tríceps",
        cue: "Codos clavados a los costados, extensión completa y pausa 2s.",
      },
      {
        order: 5,
        name: "Curl con barra Z",
        muscle: "Bíceps",
        equipment: "Barra",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Bíceps Pico",
        cue: "Codos pegados, sin balancear la espalda baja.",
      },
    ],
  },
  {
    id: "pierna-b",
    key: "pierna_b",
    name: "Pierna B",
    subtitle: "Femoral & Glúteos",
    muscles: ["Femoral", "Glúteos"],
    gradient: "from-[#FF5722] to-[#7C4DFF]",
    borderGlow: "border-[#FF5722]/30",
    bgBadge: "bg-gradient-to-r from-[#FF5722]/20 to-[#7C4DFF]/20 text-white border-white/10",
    description: "Cadena posterior y glúteos: Curl femoral tumbado, bisagra pesada con peso muerto y consolidación.",
    exercises: [
      {
        order: 1,
        name: "Curl femoral acostado en máquina",
        muscle: "Piernas",
        equipment: "Máquina",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Pre-agotamiento",
        cue: "Caderas pegadas a la banca, talones tocan glúteos.",
      },
      {
        order: 2,
        name: "Peso muerto convencional con barra",
        muscle: "Espalda",
        equipment: "Barra",
        target_sets: 1,
        target_reps: "5-8",
        cadence: "4-2-4",
        tag: "Consolidación Masiva",
        cue: "Empuje de piernas en el suelo, extensión simultánea de cadera.",
      },
      {
        order: 3,
        name: "Prensa de piernas (pies altos)",
        muscle: "Piernas",
        equipment: "Máquina",
        target_sets: 1,
        target_reps: "6-10",
        cadence: "4-2-4",
        tag: "Femoral/Glúteo",
        cue: "Pies en la parte superior de la plataforma para reclutar isquios y glúteos.",
      },
      {
        order: 4,
        name: "Zancadas con mancuernas / Búlgaras",
        muscle: "Piernas",
        equipment: "Mancuerna",
        target_sets: 1,
        target_reps: "8-12",
        cadence: "4-2-4",
        tag: "Unilateral",
        cue: "Paso amplio para enfatizar glúteo y femoral, torso levemente inclinado.",
      },
      {
        order: 5,
        name: "Elevación de talones en prensa",
        muscle: "Piernas",
        equipment: "Máquina",
        target_sets: 1,
        target_reps: "12-15",
        cadence: "4-2-4",
        tag: "Gemelos",
        cue: "Extensión plantar completa en la placa de la prensa.",
      },
    ],
  },
];

export default function Bitacora({ currentUser }) {
  const navigate = useNavigate();
  const [selectedBlockForModal, setSelectedBlockForModal] = useState(null);

  // LANZAR EN MODO FOCO ⚡
  const handleLaunchFocusMode = (block) => {
    // Convertir el bloque en una rutina estructurada compatible con Workouts.jsx
    const routinePayload = {
      id: block.id,
      title: `${block.name} (${block.subtitle}) - Heavy Duty`,
      category: block.subtitle,
      system: "heavy_duty",
      is_heavy_duty: true,
      cadence: "4-2-4",
      exercises: block.exercises.map((e) => ({
        name: e.name,
        muscle: e.muscle,
        equipment: e.equipment,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        cadence: e.cadence,
        tag: e.tag,
      })),
    };

    showToast(`⚡ Lanzando ${block.name} en Modo Foco...`, "info");

    navigate("/workouts", {
      state: {
        loadRoutine: routinePayload,
        enterFocus: true,
      },
    });
  };

  // CARGAR RUTINA NORMAL EN BITÁCORA
  const handleLoadStandard = (block) => {
    const routinePayload = {
      id: block.id,
      title: `${block.name} (${block.subtitle}) - Heavy Duty`,
      category: block.subtitle,
      system: "heavy_duty",
      is_heavy_duty: true,
      cadence: "4-2-4",
      exercises: block.exercises.map((e) => ({
        name: e.name,
        muscle: e.muscle,
        equipment: e.equipment,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        cadence: e.cadence,
        tag: e.tag,
      })),
    };

    navigate("/workouts", {
      state: {
        loadRoutine: routinePayload,
        enterFocus: false,
      },
    });
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* CABECERA OLED */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2C2E] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white shadow-lg shadow-[#FF5722]/20">
            <Dumbbell size={18} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Bitácora Heavy Duty
            </h1>
            <p className="text-xs text-[#8E8E93]">
              Entrenamiento de alta intensidad dividido en 4 bloques de 5 ejercicios
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/workouts")}
          className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-[#2C2C2E] bg-[#121212] px-3.5 py-2 text-xs font-semibold text-[#8E8E93] hover:text-white hover:border-white/20 transition active:scale-95 cursor-pointer"
        >
          <Activity size={14} className="text-[#FF5722]" />
          <span>Bitácora Libre / Sesiones</span>
        </button>
      </div>

      {/* BANNER INFORMATIVO METODOLOGÍA MENTZER */}
      <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-4 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF5722]/15 text-[#FF5722] border border-[#FF5722]/30 flex-shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Cadencia 4-2-4 & 1 Serie al Fallo Puro
            </h4>
            <p className="text-[11px] text-[#8E8E93] leading-relaxed">
              Cada bloque consta de 5 ejercicios precisos. Ejecuta 1 serie efectiva al fallo muscular absoluto por ejercicio.
            </p>
          </div>
        </div>
      </div>

      {/* GRILLA DE LOS 4 BLOQUES ESTRUCTURADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BITACORA_BLOCKS.map((block) => (
          <div
            key={block.id}
            className={`rounded-3xl border ${block.borderGlow} bg-[#121212] p-5 space-y-4 shadow-xl hover:border-white/30 transition-all duration-200 flex flex-col justify-between`}
          >
            <div className="space-y-3">
              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${block.bgBadge}`}>
                    5 EJERCICIOS
                  </span>
                  <h3 className="text-xl font-black text-white mt-2">
                    {block.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#FF5722]">
                    {block.subtitle}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] text-white">
                  {block.name.includes("Torso") ? (
                    <Flame size={20} className="text-[#FF5722]" />
                  ) : (
                    <Zap size={20} className="text-[#7C4DFF]" />
                  )}
                </div>
              </div>

              <p className="text-xs text-[#8E8E93] leading-relaxed">
                {block.description}
              </p>

              {/* Lista compacta de los 5 ejercicios */}
              <div className="rounded-2xl bg-[#1C1C1E] p-3 border border-[#2C2C2E] space-y-1.5 text-xs">
                {block.exercises.map((ex) => (
                  <div key={ex.order} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-[#8E8E93] w-3">{ex.order}.</span>
                      <span className="font-medium text-white truncate">{ex.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#8E8E93] bg-black/40 px-1.5 py-0.5 rounded flex-shrink-0">
                      1x {ex.target_reps}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTONES DE ACCIÓN: [ Ver ejercicios ] e [ Icono de Rayo ⚡ Modo Foco ] */}
            <div className="grid grid-cols-5 gap-2 pt-2 border-t border-[#2C2C2E]/60">
              {/* Botón Ver ejercicios (4 columnas) */}
              <button
                type="button"
                onClick={() => setSelectedBlockForModal(block)}
                className="col-span-3 flex items-center justify-center gap-1.5 rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] py-2.5 px-3 text-xs font-bold text-white hover:bg-[#2C2C2E] transition active:scale-95 cursor-pointer"
              >
                <Eye size={15} />
                <span>Ver ejercicios</span>
              </button>

              {/* Icono de rayo ⚡ para lanzar la sesión en Modo Foco (2 columnas) */}
              <button
                type="button"
                onClick={() => handleLaunchFocusMode(block)}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] py-2.5 px-3 text-xs font-black text-white shadow-lg shadow-[#FF5722]/25 hover:opacity-95 transition active:scale-95 cursor-pointer group"
                title="Lanzar sesión en Modo Foco con cronómetro y cadencia 4-2-4"
              >
                <span className="text-sm group-hover:scale-125 transition-transform duration-150">⚡</span>
                <span className="truncate">Modo Foco</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* MODAL DETALLADO "VER EJERCICIOS" */}
      {/* ==================================================================== */}
      {selectedBlockForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto select-none">
          <div className="w-full max-w-lg rounded-3xl border border-[#2C2C2E] bg-[#121212] p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between gap-3 border-b border-[#2C2C2E] pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5722]">
                  BLOQUE ESTRUCTURADO
                </span>
                <h3 className="text-xl font-black text-white">
                  {selectedBlockForModal.name} — {selectedBlockForModal.subtitle}
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Cadencia: 4-2-4 estricto • 1 serie al fallo positivo por ejercicio
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBlockForModal(null)}
                className="text-[#8E8E93] hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {selectedBlockForModal.exercises.map((ex) => (
                <div
                  key={ex.order}
                  className="rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white text-[10px] font-bold">
                        {ex.order}
                      </span>
                      <h4 className="font-bold text-white text-xs sm:text-sm">{ex.name}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-[#FF5722] bg-[#FF5722]/10 border border-[#FF5722]/20 px-2 py-0.5 rounded-full flex-shrink-0">
                      {ex.tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-[#8E8E93] pl-7">
                    <span>Músculo: <b className="text-white">{ex.muscle}</b></span>
                    <span>Serie: <b className="text-[#FF5722]">1x {ex.target_reps}</b></span>
                    <span>Cadencia: <b className="text-white font-mono">{ex.cadence}</b></span>
                  </div>

                  {ex.cue && (
                    <p className="text-[11px] text-[#8E8E93] italic pl-7 leading-relaxed">
                      💡 {ex.cue}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2C2C2E]">
              <button
                type="button"
                onClick={() => setSelectedBlockForModal(null)}
                className="rounded-xl border border-[#2C2C2E] bg-[#1C1C1E] px-4 py-2.5 text-xs font-semibold text-[#8E8E93] hover:text-white"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const b = selectedBlockForModal;
                  setSelectedBlockForModal(null);
                  handleLaunchFocusMode(b);
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-[#FF5722]/20 hover:opacity-95 transition active:scale-95 cursor-pointer"
              >
                <span>⚡</span>
                <span>Lanzar en Modo Foco</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
