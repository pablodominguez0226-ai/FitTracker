import React from "react";

/**
 * Mapa de normalización de nombres de ejercicios largos o verbosos
 * para evitar cortes abruptos y presentar títulos limpios en 1-2 líneas.
 */
const NORMALIZED_EXERCISE_NAMES = {
  "aperturas en banco con mancuernas": "Aperturas Banco Plano",
  "aperturas en banco plano con mancuernas": "Aperturas Banco Plano",
  "aperturas en banco inclinado con mancuernas": "Aperturas Banco Inclinado",
  "aperturas en máquina peck deck": "Peck Deck Máquina",
  "aperturas en maquina peck deck": "Peck Deck Máquina",
  "cruces en polea alta (haz inferior)": "Cruces Polea Alta",
  "cruces en polea alta": "Cruces Polea Alta",
  "cruces en polea baja (haz superior)": "Cruces Polea Baja",
  "cruces en polea baja": "Cruces Polea Baja",
  "cruces en polea media": "Cruces Polea Media",
  "press de banca plano con barra": "Press Banca Plano",
  "press de banca inclinado con barra": "Press Banca Inclinado",
  "press de banca declinado con barra": "Press Banca Declinado",
  "press inclinado con mancuernas": "Press Inclinado Mancuernas",
  "press plano con mancuernas": "Press Plano Mancuernas",
  "press de pecho en máquina convergente": "Press Pecho Máquina",
  "press de pecho en maquina convergente": "Press Pecho Máquina",
  "fondos en paralelas (énfasis pectoral)": "Fondos en Paralelas (Pecho)",
  "fondos en paralelas (énfasis tríceps)": "Fondos en Paralelas (Tríceps)",
  "flexiones de brazos (push-ups)": "Flexiones de Brazos",
  "pullover con mancuerna en banco transversal": "Pullover con Mancuerna",
  "dominadas pronas (pull-ups)": "Dominadas Pronas",
  "dominadas supinas (chin-ups)": "Dominadas Supinas",
  "jalón al pecho en polea alta (agarre prono)": "Jalón al Pecho Prono",
  "jalón al pecho con agarre neutro cerrado": "Jalón al Pecho Neutro",
  "remo con barra inclinado (pendlay / convencional)": "Remo con Barra",
  "remo con barra t apoyado en pecho": "Remo en Barra T",
  "remo unilateral con mancuerna (serrucho)": "Remo con Mancuerna",
  "remo sentado en polea baja (agarre estrecho)": "Remo en Polea Baja",
  "pull-over en polea alta con brazos rectos": "Pullover en Polea Alta",
  "encogimientos de hombros con mancuernas (trapecio)": "Encogimientos con Mancuernas",
  "encogimientos de hombros con barra": "Encogimientos con Barra",
  "sentadilla trasera con barra (back squat)": "Sentadilla con Barra",
  "sentadilla frontal con barra (front squat)": "Sentadilla Frontal",
  "sentadilla hack en máquina (hack squat)": "Sentadilla Hack Máquina",
  "sentadilla búlgara con mancuernas": "Sentadilla Búlgara",
  "sentadilla goblet con mancuerna o kettlebell": "Sentadilla Goblet",
  "prensa de piernas inclinada 45°": "Prensa de Piernas 45°",
  "zancadas / estocadas caminando con mancuernas": "Zancadas con Mancuernas",
  "extensiones de cuádriceps en máquina": "Extensión de Cuádriceps",
  "peso muerto convencional con barra": "Peso Muerto Convencional",
  "peso muerto sumo con barra": "Peso Muerto Sumo",
  "peso muerto rumano con barra (rdl)": "Peso Muerto Rumano",
  "peso muerto rumano con mancuernas": "Peso Muerto Rumano Mancuernas",
  "curl femoral tumbado en máquina": "Curl Femoral Tumbado",
  "curl femoral sentado en máquina": "Curl Femoral Sentado",
  "hip thrust (empuje de cadera) con barra": "Hip Thrust con Barra",
  "patada de glúteo en polea baja": "Patada de Glúteo en Polea",
  "abducción de cadera en máquina sentado": "Abducción de Cadera Máquina",
  "aducción de cadera en máquina sentado": "Aducción de Cadera Máquina",
  "hiperextensiones lumbares en banco 45°": "Hiperextensiones 45°",
  "elevación de talones de pie en máquina (gemelos)": "Gemelos de Pie en Máquina",
  "elevación de talones sentado en máquina (sóleo)": "Gemelos Sentado en Máquina",
  "press militar de pie con barra (overhead press)": "Press Militar con Barra",
  "press de hombros sentado con mancuernas": "Press Hombros Mancuernas",
  "press arnold sentado con mancuernas": "Press Arnold Mancuernas",
  "elevaciones laterales con mancuernas": "Elevaciones Laterales",
  "elevaciones laterales en polea baja unilateral": "Elevación Lateral en Polea",
  "elevaciones frontales con mancuernas": "Elevaciones Frontales",
  "pájaros para deltoides posterior con mancuernas": "Pájaros con Mancuernas",
  "aperturas inversas en máquina peck deck (deltoides posterior)": "Peck Deck Inverso",
  "face pull en polea alta con cuerda": "Face Pull en Polea",
  "curl de bíceps de pie con barra recta o z": "Curl Bíceps con Barra Z",
  "curl de bíceps alterno con mancuernas (supinación)": "Curl Alterno Mancuernas",
  "curl martillo con mancuernas (braquial y antebrazo)": "Curl Martillo Mancuernas",
  "curl predicador en banco scott con barra z": "Curl Predicador Barra Z",
  "curl de bíceps en banco inclinado con mancuernas": "Curl Bíceps Banco Inclinado",
  "curl concentrado sentado con mancuerna": "Curl Concentrado",
  "curl de bíceps en polea baja": "Curl Bíceps en Polea",
  "extensión de tríceps en polea alta con cuerda": "Extensión Tríceps con Cuerda",
  "extensión de tríceps en polea alta con barra recta/v": "Extensión Tríceps en Polea",
  "press francés tumbado con barra z (skullcrushers)": "Press Francés Barra Z",
  "press de banca con agarre cerrado para tríceps": "Press Banca Agarre Cerrado",
  "extensión de tríceps tras nuca con mancuerna": "Extensión Tríceps Tras Nuca",
  "patada de tríceps con mancuerna": "Patada de Tríceps",
  "curl de muñeca con barra (flexores de antebrazo)": "Curl de Muñeca con Barra",
  "curl de muñeca inverso (extensores de antebrazo)": "Curl de Muñeca Inverso",
  "crunch abdominal en polea alta (arrodillado)": "Crunch Abdominal en Polea",
  "elevación de piernas colgado en barra": "Elevación de Piernas Colgado",
  "rueda abdominal (ab wheel rollout)": "Rueda Abdominal (Ab Wheel)",
  "plancha abdominal isométrica (plank)": "Plancha Abdominal (Plank)",
  "giros rusos con peso (russian twists)": "Giros Rusos con Peso",
  "leñador en polea (woodchopper oblicuos)": "Leñador en Polea (Oblicuos)",
};

/**
 * Devuelve el nombre limpio y oficial del ejercicio.
 */
export function formatExerciseName(rawName) {
  if (!rawName) return "Ejercicio";
  return String(rawName).trim();
}

/**
 * Genera el slug estático para buscar o asociar ilustraciones en /exercises/<slug>.svg
 */
export function getExerciseSlug(rawName) {
  if (!rawName) return "general";
  return String(rawName)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Resuelve la categoría anatómica de músculo para MuscleFilterSheet y vistas generales.
 */
export function resolveAnatomyKey(muscleGroup = "", exerciseName = "") {
  const mg = String(muscleGroup || "").toLowerCase();
  const ex = String(exerciseName || "").toLowerCase();
  const combined = `${mg} ${ex}`;

  if (combined.includes("todo") || combined === "all") return "todo";
  if (
    combined.includes("pecho") ||
    combined.includes("pectoral") ||
    combined.includes("banca") ||
    combined.includes("aperturas") ||
    combined.includes("peck deck") ||
    combined.includes("cruces")
  ) {
    return "pecho";
  }
  if (combined.includes("trapecio") || combined.includes("encogimiento")) {
    return "trapecio";
  }
  if (combined.includes("cuello")) {
    return "cuello";
  }
  if (
    combined.includes("espalda") ||
    combined.includes("dorsal") ||
    combined.includes("dominada") ||
    combined.includes("jalón") ||
    combined.includes("jalon") ||
    combined.includes("remo")
  ) {
    return "espalda";
  }
  if (
    combined.includes("hombro") ||
    combined.includes("deltoide") ||
    combined.includes("militar") ||
    combined.includes("arnold") ||
    combined.includes("elevaciones laterales") ||
    combined.includes("face pull") ||
    combined.includes("pájaros") ||
    combined.includes("pajaros")
  ) {
    return "hombros";
  }
  if (
    combined.includes("bíceps") ||
    combined.includes("biceps") ||
    combined.includes("predicador") ||
    combined.includes("martillo") ||
    combined.includes("concentrado")
  ) {
    return "biceps";
  }
  if (
    combined.includes("tríceps") ||
    combined.includes("triceps") ||
    combined.includes("francés") ||
    combined.includes("frances") ||
    combined.includes("skull") ||
    combined.includes("fondos")
  ) {
    return "triceps";
  }
  if (combined.includes("antebrazo") || combined.includes("muñeca")) {
    return "antebrazo";
  }
  if (
    combined.includes("abdomen") ||
    combined.includes("abdominal") ||
    combined.includes("core") ||
    combined.includes("crunch") ||
    combined.includes("plancha") ||
    combined.includes("oblicuo") ||
    combined.includes("curva lateral") ||
    combined.includes("rueda abdominal")
  ) {
    return "abdomen";
  }
  if (
    combined.includes("glúteo") ||
    combined.includes("gluteo") ||
    combined.includes("cadera") ||
    combined.includes("hip thrust")
  ) {
    return "gluteos";
  }
  if (combined.includes("abductor") || combined.includes("abducción")) {
    return "abductores";
  }
  if (combined.includes("aductor") || combined.includes("aducción")) {
    return "aductores";
  }
  if (
    combined.includes("isquio") ||
    combined.includes("femoral") ||
    combined.includes("rumano")
  ) {
    return "isquiotibiales";
  }
  if (
    combined.includes("gemelo") ||
    combined.includes("pantorrilla") ||
    combined.includes("sóleo") ||
    combined.includes("soleo") ||
    combined.includes("talones")
  ) {
    return "pantorrillas";
  }
  if (
    combined.includes("cuádriceps") ||
    combined.includes("cuadriceps") ||
    combined.includes("pierna") ||
    combined.includes("sentadilla") ||
    combined.includes("prensa") ||
    combined.includes("zancada") ||
    combined.includes("estocada") ||
    combined.includes("búlgara") ||
    combined.includes("bulgara")
  ) {
    return "cuadriceps";
  }
  if (combined.includes("cardio") || combined.includes("cinta") || combined.includes("elíptica")) {
    return "cardio";
  }

  return "pecho";
}

/**
 * Resuelve la pose biomecánica de ejecución técnica específica del ejercicio
 * para mostrar al atleta realizando el movimiento real sobre el equipamiento.
 */
export function resolveExercisePoseKey(exerciseName = "", muscleGroup = "") {
  const ex = String(exerciseName || "").toLowerCase();
  const mg = String(muscleGroup || "").toLowerCase();

  // 1. Abdominales / Oblicuos / Lumbares 45°
  if (
    ex.includes("curva lateral") ||
    ex.includes("hiperextension") ||
    ex.includes("45°") ||
    ex.includes("lumbar") ||
    ex.includes("oblicuo") ||
    ex.includes("leñador")
  ) {
    if (ex.includes("prensa")) return "leg_press";
    return "side_bend_45";
  }
  if (ex.includes("plancha") || ex.includes("plank") || ex.includes("rueda abdominal") || ex.includes("ab wheel")) {
    return "plank_core";
  }
  if (ex.includes("elevación de piernas") || ex.includes("colgado")) {
    return "hanging_leg_raise";
  }
  if (ex.includes("crunch") || ex.includes("abdominal") || ex.includes("sit-up") || ex.includes("giros rusos")) {
    return "crunch_abs";
  }

  // 2. Pecho (Aperturas, Peck Deck, Cruces en Polea, Press Inclinado, Press Plano, Fondos/Flexiones)
  if (ex.includes("peck deck") || ex.includes("contractora") || ex.includes("mariposa")) {
    return "peck_deck_machine";
  }
  if (ex.includes("apertura") || ex.includes("fly") || ex.includes("pullover")) {
    if (ex.includes("inclinad")) return "incline_bench_press";
    return "dumbbell_fly_flat";
  }
  if (ex.includes("cruce") || (ex.includes("polea") && (mg.includes("pecho") || ex.includes("pecho") || ex.includes("haz")))) {
    return "cable_crossover";
  }
  if (ex.includes("inclinad") && (ex.includes("press") || ex.includes("banca") || ex.includes("mancuerna"))) {
    return "incline_bench_press";
  }
  if (ex.includes("flexion") || ex.includes("push-up")) {
    return "push_up";
  }
  if (ex.includes("fondo") || ex.includes("paralela") || ex.includes("dip")) {
    return "parallel_dips";
  }
  if (ex.includes("banca") || (ex.includes("press") && (mg.includes("pecho") || ex.includes("pecho") || ex.includes("plano") || ex.includes("declinado")))) {
    return "flat_bench_press";
  }

  // 3. Espalda (Dominadas, Jalón al pecho, Remo con barra, Remo en polea / mancuerna, Peso muerto)
  if (ex.includes("dominada") || ex.includes("pull-up") || ex.includes("chin-up")) {
    return "pull_up_bar";
  }
  if (ex.includes("jalón") || ex.includes("jalon") || ex.includes("polea alta")) {
    if (ex.includes("tríceps") || ex.includes("triceps") || ex.includes("cuerda")) {
      return "tricep_pushdown";
    }
    return "lat_pulldown";
  }
  if (ex.includes("remo") && (ex.includes("polea") || ex.includes("sentado") || ex.includes("máquina"))) {
    return "seated_cable_row";
  }
  if (ex.includes("remo") || ex.includes("serrucho") || ex.includes("pendlay") || ex.includes("barra t")) {
    return "barbell_row";
  }

  // 4. Piernas y Glúteos (Sentadilla, Prensa, Peso Muerto/RDL, Zancada/Búlgara, Extensión/Curl, Hip Thrust, Gemelos)
  if (ex.includes("prensa")) {
    return "leg_press";
  }
  if (ex.includes("peso muerto") || ex.includes("rumano") || ex.includes("rdl") || ex.includes("buenos días")) {
    return "romanian_deadlift";
  }
  if (ex.includes("hip thrust") || ex.includes("puente de glúteo") || ex.includes("empuje de cadera")) {
    return "hip_thrust";
  }
  if (ex.includes("zancada") || ex.includes("estocada") || ex.includes("búlgara") || ex.includes("bulgara")) {
    return "bulgarian_lunge";
  }
  if (ex.includes("extensión de cuádriceps") || ex.includes("extensiones de cuádriceps") || ex.includes("curl femoral")) {
    return "leg_extension_machine";
  }
  if (ex.includes("sentadilla") || ex.includes("squat") || ex.includes("hack")) {
    return "barbell_squat";
  }
  if (ex.includes("gemelo") || ex.includes("talones") || ex.includes("pantorrilla") || ex.includes("sóleo")) {
    return "calf_raise";
  }

  // 5. Hombros (Press Militar/Hombros, Elevaciones Laterales/Frontales/Pájaros, Encogimientos)
  if (ex.includes("elevaciones laterales") || ex.includes("elevación lateral") || ex.includes("pájaros") || ex.includes("pajaros") || ex.includes("elevaciones frontales")) {
    return "lateral_raise";
  }
  if (ex.includes("press militar") || ex.includes("overhead") || ex.includes("press de hombros") || ex.includes("arnold")) {
    return "overhead_press";
  }

  // 6. Brazos (Bíceps y Tríceps)
  if (ex.includes("francés") || ex.includes("frances") || ex.includes("skull")) {
    return "skullcrusher_bench";
  }
  if (ex.includes("tríceps") || ex.includes("triceps") || ex.includes("patada")) {
    return "tricep_pushdown";
  }
  if (ex.includes("predicador") || ex.includes("scott") || ex.includes("concentrado")) {
    return "preacher_curl";
  }
  if (ex.includes("curl") || ex.includes("bíceps") || ex.includes("biceps") || ex.includes("martillo")) {
    return "bicep_curl";
  }

  // Fallback según grupo muscular si el nombre es personalizado
  const anatomy = resolveAnatomyKey(muscleGroup, exerciseName);
  switch (anatomy) {
    case "pecho":
      return "dumbbell_fly_flat";
    case "espalda":
      return "lat_pulldown";
    case "hombros":
    case "trapecio":
      return "lateral_raise";
    case "biceps":
    case "antebrazo":
      return "bicep_curl";
    case "triceps":
      return "tricep_pushdown";
    case "abdomen":
      return "side_bend_45";
    case "gluteos":
      return "hip_thrust";
    case "isquiotibiales":
      return "romanian_deadlift";
    case "pantorrillas":
      return "calf_raise";
    case "cuadriceps":
    case "abductores":
    case "aductores":
      return "barbell_squat";
    default:
      return "flat_bench_press";
  }
}

/**
 * Ilustración técnica en ejecución de cada ejercicio (SVG vectorial transparente de alta precisión).
 * Muestra:
 * - Estructura de banco/polea/máquina/barra/mancuerna en tonos acero (#475569 / #94A3B8)
 * - Figura anatómica del atleta en postura real de ejecución (#CBD5E1 / #94A3B8)
 * - Músculo diana activado e iluminado en Rojo Deportivo (#EF4444 / #DC2626)
 */
function ExerciseExecutionIllustration({ poseKey, uid, isHero = false }) {
  const redFill = `url(#activeMuscle-${uid})`;
  const bodyFill = `url(#athleteSkin-${uid})`;
  const bodyShade = "#94A3B8";
  const equipDark = "#334155";
  const equipLight = "#64748B";
  const plateColor = "#1E293B";

  const renderPose = () => {
    switch (poseKey) {
      /* =====================================================================
         1. APERTURAS EN BANCO PLANO CON MANCUERNAS (Chest Flyes)
         ===================================================================== */
      case "dumbbell_fly_flat":
        return (
          <g>
            {/* Sombra de base */}
            <ellipse cx="120" cy="188" rx="88" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Banco plano horizontal (vista en perspectiva 3/4) */}
            <rect x="42" y="132" width="145" height="11" rx="5.5" fill={equipDark} stroke={equipLight} strokeWidth="1.5" />
            <rect x="58" y="143" width="10" height="42" rx="3" fill={equipLight} />
            <rect x="160" y="143" width="10" height="42" rx="3" fill={equipLight} />
            <rect x="48" y="181" width="30" height="6" rx="3" fill={equipDark} />
            <rect x="150" y="181" width="30" height="6" rx="3" fill={equipDark} />

            {/* Piernas flexionadas apoyadas en el suelo */}
            <path d="M150 126 L186 128 L198 176 L185 178 L175 139 L146 138 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <rect x="182" y="175" width="22" height="9" rx="4.5" fill="#1E293B" />

            {/* Torso tumbado sobre el banco */}
            <path d="M68 116 C92 110 132 112 154 122 L152 133 L68 132 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Cabeza apoyada */}
            <circle cx="54" cy="119" r="12" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* PECTORAL MAYOR Y DELTOIDES ANTERIOR RESALTADOS EN ROJO */}
            <path
              d="M74 112 C90 103 114 105 125 116 C114 126 88 127 74 124 Z"
              fill={redFill}
              filter={`url(#glow-${uid})`}
            />
            {/* Fibras anatómicas del pectoral */}
            <path d="M82 111 L115 116 M80 116 L114 120 M84 121 L110 123" stroke="#FCA5A5" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />

            {/* Brazo en arco abierto realizando apertura (Fly) */}
            <path
              d="M84 114 C78 90 82 70 96 56 L106 62 C95 74 92 92 96 114 Z"
              fill={bodyFill}
              stroke={bodyShade}
              strokeWidth="1.2"
            />
            {/* Bíceps/Deltoides sinergista activo */}
            <ellipse cx="86" cy="100" rx="6.5" ry="12" transform="rotate(-12 86 100)" fill={redFill} opacity="0.85" />

            {/* Brazo trasero en apertura */}
            <path
              d="M92 112 C104 88 118 72 134 62 L141 69 C127 78 114 93 104 114 Z"
              fill={bodyShade}
              opacity="0.7"
            />

            {/* Mancuerna 1 (primer plano) */}
            <g transform="translate(100, 54) rotate(-25)">
              <rect x="-14" y="-3" width="28" height="6" rx="2" fill="#94A3B8" />
              <rect x="-18" y="-10" width="7" height="20" rx="2.5" fill={plateColor} stroke="#EF4444" strokeWidth="1.2" />
              <rect x="11" y="-10" width="7" height="20" rx="2.5" fill={plateColor} stroke="#EF4444" strokeWidth="1.2" />
            </g>

            {/* Mancuerna 2 (segundo plano) */}
            <g transform="translate(138, 62) rotate(20)">
              <rect x="-12" y="-2.5" width="24" height="5" rx="2" fill="#94A3B8" />
              <rect x="-15" y="-8" width="6" height="16" rx="2" fill={plateColor} />
              <rect x="9" y="-8" width="6" height="16" rx="2" fill={plateColor} />
            </g>

            {/* Arco guía de movimiento biomecánico */}
            <path
              d="M66 78 C82 40 126 38 148 70"
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.8"
              strokeDasharray="4 4"
              opacity="0.75"
            />
          </g>
        );

      /* =====================================================================
         2. APERTURAS EN MÁQUINA PECK DECK (Butterfly / Pec Deck Machine)
         ===================================================================== */
      case "peck_deck_machine":
        return (
          <g>
            <ellipse cx="120" cy="192" rx="76" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Estructura de la máquina Peck Deck */}
            <rect x="108" y="20" width="24" height="168" rx="4" fill={equipDark} stroke={equipLight} strokeWidth="1.5" />
            <path d="M58 28 L182 28 L170 40 L70 40 Z" fill={equipLight} />
            {/* Brazos articulados superiores de la máquina */}
            <path d="M68 38 L68 108 M172 38 L172 108" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
            {/* Almohadillas verticales (pads) */}
            <rect x="60" y="72" width="14" height="40" rx="6" fill="#1E293B" stroke="#EF4444" strokeWidth="1.2" />
            <rect x="166" y="72" width="14" height="40" rx="6" fill="#1E293B" stroke="#EF4444" strokeWidth="1.2" />

            {/* Piernas del atleta sentado */}
            <path d="M98 134 L82 184 L96 186 L112 142 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M142 134 L158 184 L144 186 L128 142 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <rect x="92" y="132" width="56" height="10" rx="5" fill={equipDark} />

            {/* Torso erguido sentado */}
            <path d="M90 74 L150 74 L142 134 L98 134 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="120" cy="52" r="14" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* PECTORALES INTERNOS Y EXTERNOS ACTIVADOS EN ROJO */}
            <path d="M94 78 L119 78 L119 108 C104 110 95 102 94 92 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <path d="M146 78 L121 78 L121 108 C136 110 145 102 146 92 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <path d="M98 86 L117 88 M98 95 L117 95 M142 86 L123 88 M142 95 L123 95" stroke="#FCA5A5" strokeWidth="1.2" strokeLinecap="round" />

            {/* Brazos a 90° empujando los pads */}
            <path d="M92 78 L68 84 L68 102 L94 94 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M148 78 L172 84 L172 102 L146 94 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Deltoides anteriores activos */}
            <circle cx="91" cy="83" r="8" fill={redFill} />
            <circle cx="149" cy="83" r="8" fill={redFill} />
          </g>
        );

      /* =====================================================================
         3. CRUCES EN POLEA ALTA / BAJA (Cable Crossover)
         ===================================================================== */
      case "cable_crossover":
        return (
          <g>
            <ellipse cx="120" cy="192" rx="85" ry="7" fill="rgba(15,23,42,0.35)" />
            {/* Torres laterales de poleas */}
            <rect x="22" y="18" width="12" height="172" rx="3" fill={equipDark} stroke={equipLight} strokeWidth="1.2" />
            <rect x="206" y="18" width="12" height="172" rx="3" fill={equipDark} stroke={equipLight} strokeWidth="1.2" />
            <path d="M22 22 L218 22" stroke={equipLight} strokeWidth="6" strokeLinecap="round" />
            {/* Poleas superiores */}
            <circle cx="38" cy="30" r="6" fill="#EF4444" />
            <circle cx="202" cy="30" r="6" fill="#EF4444" />
            {/* Cables en tensión hacia las manos */}
            <line x1="38" y1="30" x2="98" y2="118" stroke="#94A3B8" strokeWidth="2.2" strokeDasharray="2 1" />
            <line x1="202" y1="30" x2="142" y2="118" stroke="#94A3B8" strokeWidth="2.2" strokeDasharray="2 1" />

            {/* Piernas en posición escalonada estable */}
            <path d="M104 128 L92 184 L106 184 L116 134 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M136 128 L148 184 L134 184 L124 134 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Torso ligeramente inclinado al frente */}
            <path d="M92 68 L148 68 L138 130 L102 130 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="120" cy="47" r="13" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* PECTORAL MAYOR COMPLETO E INFERIOR EN ROJO INTENSO */}
            <path d="M95 72 L119 72 L119 102 C105 105 96 96 95 85 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <path d="M145 72 L121 72 L121 102 C135 105 144 96 145 85 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <path d="M100 80 L117 84 M100 90 L117 92 M140 80 L123 84 M140 90 L123 92" stroke="#FCA5A5" strokeWidth="1.2" strokeLinecap="round" />

            {/* Brazos convergiendo hacia el centro inferior */}
            <path d="M92 74 L76 98 L96 120 L104 114 L89 96 L98 80 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M148 74 L164 98 L144 120 L136 114 L151 96 L142 80 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Estribos de polea en las manos */}
            <circle cx="99" cy="119" r="5" fill={equipDark} stroke="#EF4444" strokeWidth="2" />
            <circle cx="141" cy="119" r="5" fill={equipDark} stroke="#EF4444" strokeWidth="2" />
          </g>
        );

      /* =====================================================================
         4. PRESS DE BANCA PLANO CON BARRA (Flat Barbell Bench Press)
         ===================================================================== */
      case "flat_bench_press":
        return (
          <g>
            <ellipse cx="120" cy="188" rx="88" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Rack vertical de soporte */}
            <rect x="64" y="42" width="7" height="142" rx="3" fill={equipLight} />
            {/* Banco plano */}
            <rect x="38" y="132" width="150" height="11" rx="5.5" fill={equipDark} stroke={equipLight} strokeWidth="1.5" />
            <rect x="56" y="143" width="10" height="42" rx="3" fill={equipLight} />
            <rect x="162" y="143" width="10" height="42" rx="3" fill={equipLight} />

            {/* Piernas con drive en el suelo */}
            <path d="M150 126 L186 128 L198 178 L184 180 L175 139 L146 138 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Torso con arco fisiológico */}
            <path d="M68 116 C92 106 132 108 154 122 L152 133 L68 132 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="52" cy="119" r="12" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Pectoral, Deltoides Anterior y Tríceps iluminados */}
            <path d="M74 110 C92 101 116 104 126 116 C114 125 88 126 74 122 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            {/* Brazo empujando verticalmente la barra */}
            <path d="M84 116 L84 62 L98 62 L98 116 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <rect x="85" y="84" width="12" height="24" rx="5" fill={redFill} opacity="0.9" />

            {/* Barra Olímpica y Discos */}
            <line x1="48" y1="58" x2="136" y2="58" stroke="#E2E8F0" strokeWidth="4.5" strokeLinecap="round" />
            <rect x="76" y="36" width="10" height="44" rx="3" fill={plateColor} stroke="#EF4444" strokeWidth="1.5" />
            <rect x="64" y="41" width="7" height="34" rx="2.5" fill="#334155" />
          </g>
        );

      /* =====================================================================
         5. PRESS INCLINADO CON MANCUERNAS / BARRA (Incline Bench Press)
         ===================================================================== */
      case "incline_bench_press":
        return (
          <g>
            <ellipse cx="120" cy="190" rx="85" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Banco inclinado a 35° */}
            <path d="M52 78 L134 142" stroke={equipDark} strokeWidth="12" strokeLinecap="round" />
            <path d="M134 142 L176 134" stroke={equipDark} strokeWidth="11" strokeLinecap="round" />
            <rect x="82" y="114" width="9" height="72" rx="3" fill={equipLight} />
            <rect x="148" y="138" width="9" height="48" rx="3" fill={equipLight} />

            {/* Piernas */}
            <path d="M142 130 L182 126 L194 178 L180 180 L170 138 L138 140 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Torso apoyado en ángulo inclinado */}
            <path d="M72 80 L142 128 L132 139 L64 90 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="62" cy="68" r="12.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* HAZ CLAVICULAR (PECTORAL SUPERIOR) Y DELTOIDES ANTERIOR EN ROJO */}
            <path d="M76 80 C94 82 112 94 118 108 C104 114 84 102 74 92 Z" fill={redFill} filter={`url(#glow-${uid})`} />

            {/* Brazo empujando verticalmente */}
            <path d="M84 88 L88 38 L101 38 L98 92 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="88" cy="86" r="8" fill={redFill} />

            {/* Mancuerna superior */}
            <g transform="translate(94, 34)">
              <rect x="-16" y="-3" width="32" height="6" rx="2" fill="#CBD5E1" />
              <rect x="-20" y="-11" width="8" height="22" rx="2.5" fill={plateColor} stroke="#EF4444" strokeWidth="1.4" />
              <rect x="12" y="-11" width="8" height="22" rx="2.5" fill={plateColor} stroke="#EF4444" strokeWidth="1.4" />
            </g>
          </g>
        );

      /* =====================================================================
         6. CURVA LATERAL DE 45° / HIPEREXTENSIONES EN BANCO 45° (Reference Exact Match!)
         ===================================================================== */
      case "side_bend_45":
        return (
          <g>
            <ellipse cx="120" cy="190" rx="84" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Base del banco romano de 45° */}
            <path d="M44 184 L192 184" stroke={equipDark} strokeWidth="7" strokeLinecap="round" />
            {/* Columna principal inclinada a 45° */}
            <path d="M68 184 L142 98" stroke="#64748B" strokeWidth="9" strokeLinecap="round" />
            <path d="M148 184 L118 126" stroke={equipDark} strokeWidth="7" strokeLinecap="round" />
            {/* Rodillos inferiores de sujeción de tobillos */}
            <circle cx="62" cy="164" r="10" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
            <circle cx="78" cy="174" r="10" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
            {/* Almohadilla de soporte de cadera a 45° */}
            <rect x="122" y="88" width="34" height="16" rx="8" transform="rotate(35 139 96)" fill="#334155" stroke="#94A3B8" strokeWidth="1.5" />
            {/* Manubrios de agarre del banco */}
            <path d="M128 112 L106 116 L106 132" fill="none" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />

            {/* Piernas del atleta alineadas a 45° desde los rodillos hasta la cadera */}
            <path d="M68 164 L132 98 L144 108 L78 174 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Calzado deportivo */}
            <path d="M54 166 L72 158 L76 172 L58 178 Z" fill="#E2E8F0" stroke="#475569" strokeWidth="1.2" />

            {/* Torso extendido en diagonal con activación de oblicuos / abdomen / lumbar */}
            <path d="M128 96 L168 52 L184 68 L142 110 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* OBLICUOS Y PARED ABDOMINAL ILUMINADOS EN ROJO (igual a la captura de referencia) */}
            <path
              d="M134 94 C144 82 156 72 166 66 L174 76 C164 86 150 98 140 105 Z"
              fill={redFill}
              filter={`url(#glow-${uid})`}
            />
            <path d="M142 89 L162 74 M146 95 L166 80" stroke="#FCA5A5" strokeWidth="1.3" strokeLinecap="round" />

            {/* Cabeza y brazos con manos en la nuca (postura clásica de curva lateral 45°) */}
            <circle cx="182" cy="44" r="12" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path
              d="M168 56 L162 34 L180 38 M178 64 L202 58 L190 44"
              fill="none"
              stroke={bodyFill}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );

      /* =====================================================================
         7. JALÓN AL PECHO EN POLEA ALTA (Lat Pulldown)
         ===================================================================== */
      case "lat_pulldown":
        return (
          <g>
            <ellipse cx="120" cy="192" rx="76" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Torre de polea alta */}
            <rect x="44" y="16" width="12" height="174" rx="3" fill={equipDark} stroke={equipLight} strokeWidth="1.2" />
            <path d="M44 20 L144 20" stroke={equipLight} strokeWidth="6" strokeLinecap="round" />
            <line x1="126" y1="20" x2="126" y2="54" stroke="#94A3B8" strokeWidth="2.5" />
            {/* Barra larga de jalón */}
            <path d="M74 58 L88 52 L164 52 L178 58" fill="none" stroke="#E2E8F0" strokeWidth="4.5" strokeLinecap="round" />

            {/* Asiento y rodillos fijadores de muslos */}
            <rect x="96" y="138" width="54" height="10" rx="5" fill={equipDark} />
            <circle cx="102" cy="122" r="8" fill="#1E293B" stroke="#EF4444" strokeWidth="1.5" />

            {/* Piernas sentadas */}
            <path d="M104 136 L78 136 L78 184 L92 184 L92 148 L116 146 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Torso de espaldas / 3/4 mostrando dorsales anchos */}
            <path d="M94 74 L158 74 L144 138 L108 138 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="126" cy="54" r="12.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* DORSAL ANCHO (LATS) Y REDONDO MAYOR RESALTADOS EN ROJO */}
            <path d="M96 80 L122 82 L116 126 C104 118 96 100 96 80 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <path d="M156 80 L130 82 L136 126 C148 118 156 100 156 80 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <path d="M102 90 L118 98 M104 104 L117 110 M150 90 L134 98 M148 104 L135 110" stroke="#FCA5A5" strokeWidth="1.2" strokeLinecap="round" />

            {/* Brazos traccionando la barra hacia la clavícula */}
            <path d="M96 80 L76 84 L82 54 L92 56 L89 74 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M156 80 L176 84 L170 54 L160 56 L163 74 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
          </g>
        );

      /* =====================================================================
         8. DOMINADAS EN BARRA (Pull-Ups / Chin-Ups)
         ===================================================================== */
      case "pull_up_bar":
        return (
          <g>
            {/* Barra fija superior */}
            <rect x="44" y="22" width="152" height="7" rx="3.5" fill={equipLight} />
            <rect x="52" y="22" width="8" height="168" rx="3" fill={equipDark} />
            <rect x="180" y="22" width="8" height="168" rx="3" fill={equipDark} />

            {/* Piernas suspendidas */}
            <path d="M106 122 L102 178 L115 178 L119 124 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M134 122 L138 178 L125 178 L121 124 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Torso en V de espaldas */}
            <path d="M90 62 L150 62 L136 124 L104 124 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="120" cy="42" r="12.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* DORSALES Y TRAPECIO MEDIO/INFERIOR EN ROJO */}
            <path d="M92 66 L118 68 L114 114 C101 106 93 88 92 66 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <path d="M148 66 L122 68 L126 114 C139 106 147 88 148 66 Z" fill={redFill} filter={`url(#glow-${uid})`} />

            {/* Brazos flexionados elevando el cuerpo */}
            <path d="M92 68 L72 64 L80 26 L90 26 L84 56 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M148 68 L168 64 L160 26 L150 26 L156 56 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
          </g>
        );

      /* =====================================================================
         9. REMO CON BARRA INCLINADO (Bent-Over Barbell Row)
         ===================================================================== */
      case "barbell_row":
        return (
          <g>
            <ellipse cx="120" cy="188" rx="80" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Piernas semi-flexionadas en bisagra de cadera */}
            <path d="M78 106 L64 144 L74 182 L88 182 L80 144 L96 114 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Torso inclinado a 45° con columna neutra */}
            <path d="M78 102 L144 68 L154 86 L92 118 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="162" cy="64" r="12.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* DORSAL ANCHO, ROMBOIDES Y DELTOIDES POSTERIOR EN ROJO */}
            <path d="M88 96 L140 72 L146 86 L96 112 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <path d="M98 96 L134 79 M102 103 L138 85" stroke="#FCA5A5" strokeWidth="1.3" strokeLinecap="round" />

            {/* Brazo traccionando hacia la cadera */}
            <path d="M138 78 L116 58 L128 118 L140 118 L130 74 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Barra con discos grandes */}
            <circle cx="134" cy="124" r="22" fill={plateColor} stroke="#EF4444" strokeWidth="2" />
            <circle cx="134" cy="124" r="7" fill="#94A3B8" />
          </g>
        );

      /* =====================================================================
         10. REMO SENTADO EN POLEA BAJA (Seated Cable Row)
         ===================================================================== */
      case "seated_cable_row":
        return (
          <g>
            <ellipse cx="120" cy="190" rx="86" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Columna de polea frontal y banco horizontal */}
            <rect x="184" y="34" width="14" height="152" rx="3" fill={equipDark} stroke={equipLight} strokeWidth="1.2" />
            <rect x="44" y="148" width="144" height="9" rx="4" fill={equipDark} />
            {/* Cable horizontal hacia el abdomen */}
            <line x1="184" y1="112" x2="112" y2="112" stroke="#94A3B8" strokeWidth="2.5" />

            {/* Piernas apoyadas en plataforma frontal */}
            <path d="M88 138 L150 128 L178 142 L174 152 L146 140 L88 148 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Torso erguido */}
            <path d="M68 74 L98 74 L96 144 L68 144 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="84" cy="54" r="12.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* DORSAL Y ESPALDA MEDIA EN ROJO */}
            <path d="M68 78 L88 80 L88 132 L68 128 Z" fill={redFill} filter={`url(#glow-${uid})`} />

            {/* Brazo tirando del agarre V al abdomen */}
            <path d="M84 82 L64 106 L110 114 L110 104 L78 100 L92 84 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <polygon points="108,102 120,112 108,122" fill={equipLight} stroke="#EF4444" strokeWidth="1.5" />
          </g>
        );

      /* =====================================================================
         11. SENTADILLA CON BARRA (Barbell Back/Front Squat)
         ===================================================================== */
      case "barbell_squat":
        return (
          <g>
            <ellipse cx="120" cy="190" rx="80" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Rack de potencia */}
            <rect x="164" y="22" width="8" height="166" rx="3" fill={equipDark} stroke={equipLight} strokeWidth="1" />

            {/* Pantorrillas */}
            <path d="M118 134 L98 182 L112 184 L130 138 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Muslos en paralelo (CUÁDRICEPS Y GLÚTEOS EN ROJO) */}
            <path d="M74 122 L126 128 L122 142 L70 136 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M72 118 C92 114 114 118 126 128 L120 140 C102 138 80 136 70 132 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <circle cx="74" cy="128" r="11" fill={redFill} />

            {/* Torso firme inclinado ligeramente */}
            <path d="M70 124 L106 66 L124 76 L88 130 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="122" cy="52" r="12.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Barra Olímpica sobre trapecios */}
            <circle cx="106" cy="68" r="22" fill={plateColor} stroke="#EF4444" strokeWidth="2.2" />
            <circle cx="106" cy="68" r="7" fill="#CBD5E1" />
          </g>
        );

      /* =====================================================================
         12. PRENSA DE PIERNAS INCLINADA 45° (45° Leg Press)
         ===================================================================== */
      case "leg_press":
        return (
          <g>
            <ellipse cx="120" cy="190" rx="86" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Rieles inclinados a 45° de la prensa */}
            <line x1="48" y1="62" x2="156" y2="170" stroke={equipLight} strokeWidth="6" strokeLinecap="round" />
            {/* Respaldo inferior del asiento */}
            <path d="M142 172 L188 142" stroke={equipDark} strokeWidth="12" strokeLinecap="round" />
            {/* Plataforma móvil con discos */}
            <line x1="68" y1="108" x2="108" y2="62" stroke={equipDark} strokeWidth="9" strokeLinecap="round" />
            <circle cx="76" cy="66" r="18" fill={plateColor} stroke="#EF4444" strokeWidth="2" />

            {/* Torso recostado en el asiento inferior */}
            <path d="M140 162 L176 136 L184 148 L148 172 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="186" cy="126" r="11.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Piernas empujando la plataforma (CUÁDRICEPS Y GLÚTEOS EN ROJO) */}
            <path d="M90 92 L126 118 L146 164 L132 168 L114 128 L82 102 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M116 118 L146 158 L132 164 L108 126 Z" fill={redFill} filter={`url(#glow-${uid})`} />
          </g>
        );

      /* =====================================================================
         13. PESO MUERTO RUMANO / CONVENCIONAL (Romanian Deadlift)
         ===================================================================== */
      case "romanian_deadlift":
        return (
          <g>
            <ellipse cx="120" cy="188" rx="80" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Tibias verticales */}
            <path d="M88 134 L86 182 L100 182 L102 134 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Fémur e ISQUIOTIBIALES / GLÚTEOS EN ROJO */}
            <path d="M68 98 L100 136 L88 142 L56 106 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M58 98 C72 108 84 122 92 138 L82 142 C70 126 58 114 54 102 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <circle cx="64" cy="98" r="12" fill={redFill} />

            {/* Torso en bisagra horizontal */}
            <path d="M66 92 L142 74 L146 92 L70 108 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Erectores espinales activos */}
            <path d="M72 90 L134 76 L136 83 L74 97 Z" fill={redFill} opacity="0.85" />
            <circle cx="158" cy="74" r="12" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Brazos rectos sosteniendo la barra pegada a las tibias */}
            <path d="M132 86 L126 144 L138 144 L142 86 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="132" cy="148" r="24" fill={plateColor} stroke="#EF4444" strokeWidth="2.2" />
            <circle cx="132" cy="148" r="7" fill="#CBD5E1" />
          </g>
        );

      /* =====================================================================
         14. SENTADILLA BÚLGARA / ZANCADAS (Bulgarian Split Squat / Lunge)
         ===================================================================== */
      case "bulgarian_lunge":
        return (
          <g>
            <ellipse cx="120" cy="190" rx="84" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Banco trasero de apoyo */}
            <rect x="34" y="138" width="42" height="12" rx="5" fill={equipDark} stroke={equipLight} strokeWidth="1.2" />
            <rect x="48" y="150" width="10" height="36" rx="3" fill={equipLight} />

            {/* Pierna trasera apoyada en el banco */}
            <path d="M108 118 L86 154 L54 142 L58 132 L84 140 L98 114 Z" fill={bodyShade} opacity="0.8" />

            {/* Pierna delantera en flexión de 90° (CUÁDRICEPS Y GLÚTEO EN ROJO) */}
            <path d="M150 124 L152 182 L166 182 L164 124 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M106 116 L158 120 L156 134 L104 130 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <circle cx="106" cy="122" r="11" fill={redFill} />

            {/* Torso erguido */}
            <path d="M102 64 L126 64 L122 122 L100 122 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="114" cy="44" r="12.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Brazo sosteniendo mancuerna pesada */}
            <path d="M108 72 L108 132 L120 132 L120 72 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <g transform="translate(114, 136)">
              <rect x="-14" y="-6" width="28" height="12" rx="3" fill={plateColor} stroke="#EF4444" strokeWidth="1.5" />
            </g>
          </g>
        );

      /* =====================================================================
         15. HIP THRUST CON BARRA (Barbell Hip Thrust)
         ===================================================================== */
      case "hip_thrust":
        return (
          <g>
            <ellipse cx="120" cy="188" rx="88" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Banco de apoyo escapular */}
            <rect x="34" y="118" width="46" height="66" rx="8" fill={equipDark} stroke={equipLight} strokeWidth="1.5" />

            {/* Tibias a 90° */}
            <path d="M168 118 L170 182 L184 182 L182 118 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Muslos y GLÚTEO MAYOR EN MÁXIMA EXTENSIÓN ROJA */}
            <path d="M68 112 L176 114 L176 128 L68 128 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M106 112 C126 112 146 114 162 116 L160 130 C140 132 118 132 104 128 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <ellipse cx="118" cy="124" rx="18" ry="11" fill={redFill} />

            {/* Cabeza mirando al frente */}
            <circle cx="56" cy="96" r="12" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Barra Olímpica sobre la pelvis */}
            <circle cx="122" cy="104" r="22" fill={plateColor} stroke="#EF4444" strokeWidth="2.2" />
            <circle cx="122" cy="104" r="7" fill="#CBD5E1" />
          </g>
        );

      /* =====================================================================
         16. EXTENSIÓN DE CUÁDRICEPS / CURL FEMORAL EN MÁQUINA
         ===================================================================== */
      case "leg_extension_machine":
        return (
          <g>
            <ellipse cx="120" cy="190" rx="80" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Silla de máquina de cuádriceps */}
            <path d="M74 68 L84 134 L142 134" fill="none" stroke={equipDark} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="96" y="138" width="12" height="46" rx="3" fill={equipLight} />

            {/* Torso sentado */}
            <path d="M84 70 L110 70 L114 130 L88 130 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="96" cy="50" r="12.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* CUÁDRICEPS RESALTADO EN ROJO Y PIERNA EXTENDIDA */}
            <path d="M98 118 L152 116 L152 132 L98 132 Z" fill={redFill} filter={`url(#glow-${uid})`} />
            <path d="M148 116 L196 102 L200 114 L150 130 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Rodillo acolchado en el tobillo */}
            <circle cx="192" cy="116" r="9" fill="#1E293B" stroke="#EF4444" strokeWidth="2" />
          </g>
        );

      /* =====================================================================
         17. ELEVACIONES LATERALES CON MANCUERNAS (Lateral Raises)
         ===================================================================== */
      case "lateral_raise":
        return (
          <g>
            <ellipse cx="120" cy="192" rx="68" ry="7" fill="rgba(15,23,42,0.35)" />
            {/* Piernas de pie */}
            <path d="M104 126 L98 184 L112 184 L116 128 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M136 126 L142 184 L128 184 L124 128 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Torso atlético */}
            <path d="M94 68 L146 68 L136 128 L104 128 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="120" cy="46" r="13" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Brazos elevados horizontalmente (abducción 90°) */}
            <path d="M92 70 L38 78 L40 90 L94 84 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M148 70 L202 78 L200 90 L146 84 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* DELTOIDES LATERAL Y TRAPECIO SUPERIOR EN ROJO */}
            <ellipse cx="90" cy="74" rx="13" ry="10" fill={redFill} filter={`url(#glow-${uid})`} />
            <ellipse cx="150" cy="74" rx="13" ry="10" fill={redFill} filter={`url(#glow-${uid})`} />
            <path d="M102 62 L120 68 L138 62" fill="none" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />

            {/* Mancuernas en los extremos */}
            <rect x="24" y="72" width="16" height="22" rx="3" fill={plateColor} stroke="#EF4444" strokeWidth="1.5" />
            <rect x="200" y="72" width="16" height="22" rx="3" fill={plateColor} stroke="#EF4444" strokeWidth="1.5" />
          </g>
        );

      /* =====================================================================
         18. PRESS MILITAR / PRESS DE HOMBROS (Overhead Shoulder Press)
         ===================================================================== */
      case "overhead_press":
        return (
          <g>
            <ellipse cx="120" cy="192" rx="70" ry="7" fill="rgba(15,23,42,0.35)" />
            {/* Piernas */}
            <path d="M104 128 L98 184 L112 184 L116 130 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M136 128 L142 184 L128 184 L124 130 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Torso */}
            <path d="M92 72 L148 72 L136 130 L104 130 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="120" cy="50" r="13" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Brazos empujando sobre la cabeza */}
            <path d="M92 76 L72 64 L78 28 L90 30 L86 58 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M148 76 L168 64 L162 28 L150 30 L154 58 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* DELTOIDES ANTERIOR/MEDIO Y TRÍCEPS EN ROJO */}
            <circle cx="90" cy="74" r="12" fill={redFill} filter={`url(#glow-${uid})`} />
            <circle cx="150" cy="74" r="12" fill={redFill} filter={`url(#glow-${uid})`} />

            {/* Barra Olímpica sobre la cabeza */}
            <line x1="36" y1="26" x2="204" y2="26" stroke="#E2E8F0" strokeWidth="4.5" strokeLinecap="round" />
            <rect x="48" y="12" width="10" height="28" rx="3" fill={plateColor} stroke="#EF4444" strokeWidth="1.5" />
            <rect x="182" y="12" width="10" height="28" rx="3" fill={plateColor} stroke="#EF4444" strokeWidth="1.5" />
          </g>
        );

      /* =====================================================================
         19. CURL DE BÍCEPS CON BARRA Z / MANCUERNAS (Bicep Curl)
         ===================================================================== */
      case "bicep_curl":
      case "preacher_curl":
        return (
          <g>
            <ellipse cx="120" cy="192" rx="68" ry="7" fill="rgba(15,23,42,0.35)" />
            {/* Piernas */}
            <path d="M104 128 L100 184 L114 184 L118 130 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <path d="M126 128 L132 184 L146 184 L138 130 Z" fill={bodyShade} opacity="0.8" />

            {/* Torso de perfil 3/4 */}
            <path d="M98 66 L138 66 L132 130 L102 130 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="120" cy="44" r="13" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Brazo superior fijo y BÍCEPS BRAQUIAL EN ROJO INTENSO */}
            <path d="M108 70 L108 112 L124 112 L124 70 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <ellipse cx="121" cy="92" rx="10" ry="16" fill={redFill} filter={`url(#glow-${uid})`} />

            {/* Antebrazo flexionado hacia arriba */}
            <path d="M112 110 L152 82 L158 92 L120 118 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Braquiorradial activo */}
            <ellipse cx="134" cy="100" rx="9" ry="5" transform="rotate(-32 134 100)" fill={redFill} opacity="0.85" />

            {/* Mancuerna / Barra Z en la mano */}
            <circle cx="158" cy="84" r="14" fill={plateColor} stroke="#EF4444" strokeWidth="2" />
            <circle cx="158" cy="84" r="4.5" fill="#CBD5E1" />
          </g>
        );

      /* =====================================================================
         20. EXTENSIÓN DE TRÍCEPS EN POLEA ALTA (Tricep Rope/Bar Pushdown)
         ===================================================================== */
      case "tricep_pushdown":
      case "skullcrusher_bench":
      case "parallel_dips":
        return (
          <g>
            <ellipse cx="120" cy="192" rx="76" ry="7" fill="rgba(15,23,42,0.35)" />
            {/* Torre de polea */}
            <rect x="174" y="18" width="12" height="172" rx="3" fill={equipDark} stroke={equipLight} strokeWidth="1.2" />
            <path d="M138 22 L186 22" stroke={equipLight} strokeWidth="6" strokeLinecap="round" />
            <line x1="144" y1="22" x2="138" y2="118" stroke="#94A3B8" strokeWidth="2.5" />

            {/* Piernas */}
            <path d="M88 128 L82 184 L96 184 L102 130 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            {/* Torso ligeramente inclinado */}
            <path d="M84 66 L122 68 L112 130 L82 128 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="108" cy="46" r="12.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* TRÍCEPS BRAQUIAL (3 CABEZAS) RESALTADO EN ROJO */}
            <path d="M94 70 L112 72 L114 108 L96 108 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <ellipse cx="96" cy="90" rx="8.5" ry="15" fill={redFill} filter={`url(#glow-${uid})`} />

            {/* Antebrazo extendiendo la cuerda hacia abajo */}
            <path d="M98 104 L134 116 L130 126 L94 114 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="138" cy="122" r="6" fill={plateColor} stroke="#EF4444" strokeWidth="2" />
          </g>
        );

      /* =====================================================================
         21. CRUNCH ABDOMINAL / PLANCHA / RUEDA ABDOMINAL / ELEVACIÓN DE PIERNAS
         ===================================================================== */
      case "crunch_abs":
      case "plank_core":
      case "hanging_leg_raise":
      case "push_up":
      case "calf_raise":
      default:
        return (
          <g>
            <ellipse cx="120" cy="184" rx="92" ry="8" fill="rgba(15,23,42,0.35)" />
            {/* Colchoneta / Banco de suelo */}
            <rect x="28" y="168" width="184" height="9" rx="4.5" fill={equipDark} stroke={equipLight} strokeWidth="1.2" />

            {/* Piernas flexionadas */}
            <path d="M132 156 L162 114 L192 164 L178 168 L158 132 L138 166 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* Torso elevándose en contracción abdominal (Crunch) */}
            <path d="M66 122 C88 134 114 146 138 156 L130 168 C104 162 78 148 56 134 Z" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />
            <circle cx="52" cy="108" r="12.5" fill={bodyFill} stroke={bodyShade} strokeWidth="1.2" />

            {/* RECTO ABDOMINAL Y OBLICUOS ILUMINADOS EN ROJO */}
            <path
              d="M78 124 C96 132 116 140 132 150 L126 160 C108 152 88 142 72 132 Z"
              fill={redFill}
              filter={`url(#glow-${uid})`}
            />
            <path d="M88 130 L84 139 M102 137 L98 146 M116 144 L112 153" stroke="#FCA5A5" strokeWidth="1.4" strokeLinecap="round" />

            {/* Brazos hacia las sienes */}
            <path d="M66 122 L58 96 L78 106" fill="none" stroke={bodyFill} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 240 205"
      className="w-full h-full object-contain select-none"
      role="img"
      aria-label="Ilustración técnica de ejecución del ejercicio"
    >
      <defs>
        <linearGradient id={`athleteSkin-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="60%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id={`activeMuscle-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
        <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation={isHero ? "3.5" : "2"} floodColor="#EF4444" floodOpacity="0.45" />
        </filter>
      </defs>

      {renderPose()}
    </svg>
  );
}

/**
 * Silueta anatómica del maniquí muscular (EXCLUSIVA para las tarjetas de filtro por grupo muscular
 * en MuscleFilterSheet.jsx donde se muestran los 15 grupos musculares).
 */
function AnatomicalMuscleFigure({ activeKey, uid }) {
  const isAll = activeKey === "todo";
  const isHot = (keys) => isAll || keys.includes(activeKey);

  const baseColor = "#64748B";
  const baseFill = "rgba(148, 163, 184, 0.25)";
  const hotFill = `url(#hotGrad-${uid})`;

  return (
    <svg
      viewBox="35 12 130 205"
      className="w-full h-full object-contain select-none"
      role="img"
      aria-label={`Diagrama muscular: ${activeKey}`}
    >
      <defs>
        <linearGradient id={`hotGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>

      <g stroke={baseColor} strokeWidth="1.2" fill={baseFill} strokeLinejoin="round">
        <circle cx="100" cy="27" r="10.5" />
        <rect
          x="95"
          y="37"
          width="10"
          height="7"
          rx="2"
          fill={isHot(["cuello"]) ? hotFill : baseFill}
          stroke={isHot(["cuello"]) ? "#DC2626" : baseColor}
        />
        <polygon
          points="95,41 81,46 92,48"
          fill={isHot(["trapecio", "espalda"]) ? hotFill : baseFill}
          stroke={isHot(["trapecio", "espalda"]) ? "#DC2626" : baseColor}
        />
        <polygon
          points="105,41 119,46 108,48"
          fill={isHot(["trapecio", "espalda"]) ? hotFill : baseFill}
          stroke={isHot(["trapecio", "espalda"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M81 46 C71 48 67 56 70 64 L81 61 Z"
          fill={isHot(["hombros"]) ? hotFill : baseFill}
          stroke={isHot(["hombros"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M119 46 C129 48 133 56 130 64 L119 61 Z"
          fill={isHot(["hombros"]) ? hotFill : baseFill}
          stroke={isHot(["hombros"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M81 47 L99 47 L99 68 C90 70 82 67 80 60 Z"
          fill={isHot(["pecho"]) ? hotFill : baseFill}
          stroke={isHot(["pecho"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M119 47 L101 47 L101 68 C110 70 118 67 120 60 Z"
          fill={isHot(["pecho"]) ? hotFill : baseFill}
          stroke={isHot(["pecho"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M80 61 L85 95 L79 88 L76 68 Z"
          fill={isHot(["espalda"]) ? hotFill : baseFill}
          stroke={isHot(["espalda"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M120 61 L115 95 L121 88 L124 68 Z"
          fill={isHot(["espalda"]) ? hotFill : baseFill}
          stroke={isHot(["espalda"]) ? "#DC2626" : baseColor}
        />
        <rect
          x="87"
          y="70"
          width="11"
          height="32"
          rx="3"
          fill={isHot(["abdomen", "cardio"]) ? hotFill : baseFill}
          stroke={isHot(["abdomen", "cardio"]) ? "#DC2626" : baseColor}
        />
        <rect
          x="102"
          y="70"
          width="11"
          height="32"
          rx="3"
          fill={isHot(["abdomen", "cardio"]) ? hotFill : baseFill}
          stroke={isHot(["abdomen", "cardio"]) ? "#DC2626" : baseColor}
        />
        <rect
          x="67"
          y="64"
          width="10"
          height="23"
          rx="5"
          transform="rotate(8 72 75)"
          fill={isHot(["biceps", "triceps"]) ? hotFill : baseFill}
          stroke={isHot(["biceps", "triceps"]) ? "#DC2626" : baseColor}
        />
        <rect
          x="123"
          y="64"
          width="10"
          height="23"
          rx="5"
          transform="rotate(-8 128 75)"
          fill={isHot(["biceps", "triceps"]) ? hotFill : baseFill}
          stroke={isHot(["biceps", "triceps"]) ? "#DC2626" : baseColor}
        />
        <rect
          x="62"
          y="88"
          width="9"
          height="24"
          rx="4"
          transform="rotate(10 66 100)"
          fill={isHot(["antebrazo"]) ? hotFill : baseFill}
          stroke={isHot(["antebrazo"]) ? "#DC2626" : baseColor}
        />
        <rect
          x="129"
          y="88"
          width="9"
          height="24"
          rx="4"
          transform="rotate(-10 134 100)"
          fill={isHot(["antebrazo"]) ? hotFill : baseFill}
          stroke={isHot(["antebrazo"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M84 103 L116 103 L120 116 L80 116 Z"
          fill={isHot(["gluteos", "abductores"]) ? hotFill : baseFill}
          stroke={isHot(["gluteos", "abductores"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M80 116 L97 116 L95 158 L81 158 Z"
          fill={isHot(["cuadriceps", "isquiotibiales", "aductores", "cardio"]) ? hotFill : baseFill}
          stroke={isHot(["cuadriceps", "isquiotibiales", "aductores", "cardio"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M103 116 L120 116 L119 158 L105 158 Z"
          fill={isHot(["cuadriceps", "isquiotibiales", "aductores", "cardio"]) ? hotFill : baseFill}
          stroke={isHot(["cuadriceps", "isquiotibiales", "aductores", "cardio"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M82 162 L94 162 L92 198 L84 198 Z"
          fill={isHot(["pantorrillas", "cardio"]) ? hotFill : baseFill}
          stroke={isHot(["pantorrillas", "cardio"]) ? "#DC2626" : baseColor}
        />
        <path
          d="M106 162 L118 162 L116 198 L108 198 Z"
          fill={isHot(["pantorrillas", "cardio"]) ? hotFill : baseFill}
          stroke={isHot(["pantorrillas", "cardio"]) ? "#DC2626" : baseColor}
        />
      </g>
    </svg>
  );
}

/**
 * Componente ExerciseDiagram
 * - variant="muscle-card": Silueta de grupo muscular para el modal de Filtro Muscular
 * - variant="thumbnail": Ilustración anatómica real del ejercicio en ejecución (para la fila del catálogo)
 * - variant="hero" / "full": Ilustración anatómica en alta resolución para ExerciseDetailView
 */
export default function ExerciseDiagram({
  muscleGroup = "Pecho",
  exerciseName = "",
  anatomyKey: explicitAnatomyKey = null,
  variant = "full",
}) {
  const activeKey =
    explicitAnatomyKey || resolveAnatomyKey(muscleGroup, exerciseName);
  const poseKey = resolveExercisePoseKey(exerciseName, muscleGroup);
  const uid = `${activeKey}-${poseKey}-${variant}`.replace(/[^a-z0-9-_]/gi, "");

  if (variant === "muscle-card") {
    return (
      <div className="w-full h-14 flex items-center justify-center overflow-hidden">
        <AnatomicalMuscleFigure activeKey={activeKey} uid={uid} />
      </div>
    );
  }

  if (variant === "thumbnail") {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <ExerciseExecutionIllustration poseKey={poseKey} uid={uid} isHero={false} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <ExerciseExecutionIllustration poseKey={poseKey} uid={uid} isHero={true} />
    </div>
  );
}
