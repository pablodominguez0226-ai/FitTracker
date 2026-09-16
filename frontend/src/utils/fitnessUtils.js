import { parseDateSafe } from "./dateUtils";

/**
 * Computes estimated 1RM using the Epley formula:
 * 1RM = Weight * (1 + Reps / 30)
 * For 1 rep, 1RM is the exact weight lifted.
 * @param {number|string} weight
 * @param {number|string} reps
 * @returns {number}
 */
export function calculateEstimated1RM(weight, reps) {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps, 10) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return Math.round(w * 10) / 10;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

/**
 * Classifier for equipment filter chips: [Barra | Mancuerna | Polea | Máquina]
 * @param {string} name
 * @returns {"Barra"|"Mancuerna"|"Polea"|"Máquina"}
 */
export function getExerciseEquipment(name = "", exerciseId = null) {
  // 0. Check custom user-defined equipment mapping
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("fittracker_custom_exercise_equipment");
      if (stored) {
        const map = JSON.parse(stored);
        if (exerciseId && map[exerciseId]) {
          const val = map[exerciseId];
          return val === "Máquina / Peso Corporal" ? "Máquina" : val;
        }
        const trimmed = (name || "").toLowerCase().trim();
        if (trimmed && map[trimmed]) {
          const val = map[trimmed];
          return val === "Máquina / Peso Corporal" ? "Máquina" : val;
        }
      }
    } catch {}
  }

  const n = (name || "").toLowerCase().trim();

  // 1. Mancuerna
  if (
    n.includes("mancuerna") ||
    n.includes("manc.") ||
    n.includes("goblet") ||
    n.includes("zancada") ||
    n.includes("búlgara") ||
    n.includes("bulgara") ||
    n.includes("dumbbell") ||
    n.includes(" db ")
  ) {
    return "Mancuerna";
  }

  // 2. Máquina / Smith / Convergente / Peso Corporal / Libre guiado
  if (
    n.includes("máquina") ||
    n.includes("maquina") ||
    n.includes("convergente") ||
    n.includes("smith") ||
    n.includes("peck deck") ||
    n.includes("pec deck") ||
    n.includes("paralela") ||
    n.includes("fondos") ||
    n.includes("abductor") ||
    n.includes("aductor") ||
    n.includes("prensa de piernas") ||
    n.includes("remo en t") ||
    n.includes("remo t") ||
    n.includes("corporal") ||
    n.includes("peso corporal")
  ) {
    return "Máquina";
  }

  // 3. Polea / Cable
  if (
    n.includes("polea") ||
    n.includes("cable") ||
    n.includes("jalón") ||
    n.includes("jalon") ||
    n.includes("cruce") ||
    n.includes("cruces") ||
    n.includes("face pull") ||
    n.includes("leñador") ||
    n.includes("woodchopper") ||
    n.includes("overhead")
  ) {
    return "Polea";
  }

  // 4. Barra / Discos
  if (
    n.includes("barra") ||
    n.includes("barbell") ||
    n.includes("disco") ||
    n.includes("svend") ||
    n.includes("press banca") ||
    n.includes("peso muerto") ||
    n.includes("sentadilla") ||
    n.includes("squat") ||
    n.includes("hip thrust") ||
    n.includes("militar") ||
    n.includes("pendlay") ||
    n.includes("prensa inclinada") ||
    n.includes("lastrada")
  ) {
    return "Barra";
  }

  return "Máquina";
}

/**
 * Evaluates record recency:
 * - "🔥 Récord reciente" (<= 14 days)
 * - "⚠️ Meseta" (>= 40 days)
 * - "⚡ En consolidación" (between 15 and 39 days)
 * @param {string|Date} prDateVal
 * @returns {{ type: string, label: string, days: number, className: string }|null}
 */
export function getPrStatus(prDateVal) {
  if (!prDateVal) return null;
  const d = parseDateSafe(prDateVal);
  if (!d) return null;

  const now = new Date();
  // Normalize dates to local midnight for exact day delta
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const prZero = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.max(0, Math.floor((todayZero - prZero) / (1000 * 60 * 60 * 24)));

  if (diffDays <= 14) {
    return {
      type: "recent",
      label: "🔥 Récord reciente",
      days: diffDays,
      className:
        "border border-amber-500/30 bg-amber-500/10 text-amber-300 font-semibold",
    };
  }

  if (diffDays >= 40) {
    return {
      type: "plateau",
      label: "⚠️ Meseta",
      days: diffDays,
      className: "border-rose-500/50 bg-rose-500/15 text-rose-300 font-black",
    };
  }

  return {
    type: "active",
    label: "⚡ En consolidación",
    days: diffDays,
    className: "border-purple-500/40 bg-purple-500/10 text-[#C084FC] font-semibold",
  };
}

/**
 * Muscle group matching for pills:
 * [Todos | Pecho | Pierna | Espalda | Hombro | Brazos | Core]
 * @param {object} record
 * @param {string} pill
 * @returns {boolean}
 */
export function matchMusclePill(record, pill) {
  if (!pill || pill === "Todos") return true;
  const groupName = (record.muscle_group || record.muscle_group_name || "").toLowerCase();
  const exName = (record.exercise_name || "").toLowerCase();
  const text = `${groupName} ${exName}`;

  switch (pill) {
    case "Pecho":
      return (
        groupName.includes("pecho") ||
        text.includes("pecho") ||
        text.includes("banca") ||
        text.includes("chest") ||
        text.includes("inclinado") ||
        text.includes("declinado") ||
        text.includes("fondos en paralelas") ||
        text.includes("aperturas")
      );
    case "Pierna":
      return (
        groupName.includes("pierna") ||
        text.includes("pierna") ||
        text.includes("sentadilla") ||
        text.includes("cuádriceps") ||
        text.includes("cuadriceps") ||
        text.includes("femoral") ||
        text.includes("prensa") ||
        text.includes("hack") ||
        text.includes("isquio") ||
        text.includes("glúteo") ||
        text.includes("gluteo") ||
        text.includes("gemelo") ||
        text.includes("pantorrilla") ||
        text.includes("peso muerto") ||
        text.includes("hip thrust") ||
        text.includes("aduct") ||
        text.includes("abduct") ||
        text.includes("zancada")
      );
    case "Espalda":
      return (
        groupName.includes("espalda") ||
        text.includes("espalda") ||
        text.includes("dorsal") ||
        text.includes("jalón") ||
        text.includes("jalon") ||
        text.includes("remo") ||
        text.includes("dominada") ||
        text.includes("pull-up") ||
        text.includes("trapecio") ||
        text.includes("face pull")
      );
    case "Hombro":
      return (
        groupName.includes("hombro") ||
        text.includes("hombro") ||
        text.includes("deltoides") ||
        text.includes("press militar") ||
        text.includes("laterales") ||
        text.includes("arnold") ||
        text.includes("pájaro") ||
        text.includes("pajaro")
      );
    case "Brazos":
      return (
        groupName.includes("brazo") ||
        text.includes("brazo") ||
        text.includes("bíceps") ||
        text.includes("biceps") ||
        text.includes("tríceps") ||
        text.includes("triceps") ||
        text.includes("curl") ||
        text.includes("martillo") ||
        text.includes("francés") ||
        text.includes("frances") ||
        text.includes("antebrazo")
      );
    case "Core":
      return (
        groupName.includes("core") ||
        groupName.includes("abs") ||
        text.includes("core") ||
        text.includes("abs") ||
        text.includes("abdomen") ||
        text.includes("abdominal") ||
        text.includes("plancha") ||
        text.includes("crunch") ||
        text.includes("rueda") ||
        text.includes("leñador") ||
        text.includes("dead bug")
      );
    default:
      return true;
  }
}
