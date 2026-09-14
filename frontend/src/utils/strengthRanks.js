/**
 * Relative Strength Ranks & Levels Engine for FitTracker
 *
 * Computes 1RM, strength ratio (1RM / bodyweight), and movement-pattern-adapted
 * tiers from Iniciado up to Élite Supremo.
 */

export const STRENGTH_RANKS = [
  {
    tier: 1,
    id: "basico",
    name: "Básico",
    color: "#94A3B8", // Slate
    textColor: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
    shadowColor: "rgba(148, 163, 184, 0.25)",
    icon: "🛡️",
    badgeClass: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  },
  {
    tier: 2,
    id: "guerrero",
    name: "Guerrero",
    color: "#F59E0B", // Amber
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-400/40",
    shadowColor: "rgba(245, 158, 11, 0.35)",
    icon: "⚔️",
    badgeClass: "border-amber-400/40 bg-amber-500/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]",
  },
  {
    tier: 3,
    id: "avanzado",
    name: "Avanzado",
    color: "#CBD5E1", // Silver
    textColor: "text-slate-200",
    bgColor: "bg-slate-300/15",
    borderColor: "border-slate-300/40",
    shadowColor: "rgba(203, 213, 225, 0.35)",
    icon: "⚡",
    badgeClass: "border-slate-300/50 bg-slate-300/15 text-slate-100 shadow-[0_0_10px_rgba(203,213,225,0.25)]",
  },
  {
    tier: 4,
    id: "maestro",
    name: "Maestro",
    color: "#FBBF24", // Gold
    textColor: "text-yellow-400",
    bgColor: "bg-yellow-400/15",
    borderColor: "border-yellow-400/50",
    shadowColor: "rgba(251, 191, 36, 0.4)",
    icon: "👑",
    badgeClass: "border-yellow-400/60 bg-yellow-400/20 text-yellow-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]",
  },
  {
    tier: 5,
    id: "elite",
    name: "Élite",
    color: "#FF5722", // Neon Brick
    textColor: "text-[#FF5722]",
    bgColor: "bg-[#FF5722]/15",
    borderColor: "border-[#FF5722]/60",
    shadowColor: "rgba(255, 87, 34, 0.45)",
    icon: "🔥",
    badgeClass: "border-[#FF5722]/70 bg-[#FF5722]/20 text-[#FF5722] shadow-[0_0_14px_rgba(255,87,34,0.45)] font-black",
  },
  {
    tier: 6,
    id: "elite_supremo",
    name: "Élite Supremo",
    color: "#FF1744", // Crimson Glow
    textColor: "text-[#FF1744]",
    bgColor: "bg-[#FF1744]/20",
    borderColor: "border-[#FF1744]/70",
    shadowColor: "rgba(255, 23, 68, 0.55)",
    icon: "💎",
    badgeClass: "border-[#FF1744] bg-[#FF1744]/25 text-[#FF1744] shadow-[0_0_18px_rgba(255,23,68,0.55)] font-black animate-pulse",
  },
];

/**
 * Movement pattern ratio thresholds: [Iniciado/Guerrero, Guerrero/Avanzado, Avanzado/Maestro, Maestro/Élite, Élite/Élite Supremo]
 */
const PATTERN_THRESHOLDS = {
  // Empuje: Base standard thresholds
  Empuje: [0.8, 1.2, 1.5, 1.8, 2.1],
  // Tracción: Back movements / compound pulling
  Tracción: [0.75, 1.15, 1.45, 1.75, 2.05],
  // Pierna: Lower body movements move significantly higher absolute and relative load
  Pierna: [1.05, 1.55, 1.95, 2.35, 2.75],
  // Aislamiento: Biceps, Triceps isolation, Deltoid raises, Core
  Aislamiento: [0.35, 0.55, 0.70, 0.85, 1.00],
  // Default fallback pattern
  General: [0.8, 1.2, 1.5, 1.8, 2.1],
};

/**
 * Detects movement pattern based on exercise name and optional muscle group
 * @param {string} exerciseName
 * @param {string} muscleGroup
 * @returns {"Empuje"|"Tracción"|"Pierna"|"Aislamiento"|"General"}
 */
export function detectMovementPattern(exerciseName = "", muscleGroup = "") {
  const name = (exerciseName || "").toLowerCase();
  const mg = (muscleGroup || "").toLowerCase();
  const text = `${name} ${mg}`;

  // 1. Aislamiento / Brazos / Core (specific single-joint movements)
  if (
    text.includes("curl") ||
    text.includes("martillo") ||
    text.includes("francés") ||
    text.includes("frances") ||
    text.includes("tríceps cuerda") ||
    text.includes("triceps cuerda") ||
    text.includes("patada de tríceps") ||
    text.includes("laterales") ||
    text.includes("pájaro") ||
    text.includes("pajaro") ||
    text.includes("elevaciones") ||
    text.includes("plancha") ||
    text.includes("crunch") ||
    text.includes("abdomen") ||
    text.includes("abdominal") ||
    text.includes("antebrazo")
  ) {
    return "Aislamiento";
  }

  // 2. Pierna (Squat, Deadlift, Leg Press, Lunges, etc.)
  if (
    text.includes("sentadilla") ||
    text.includes("squat") ||
    text.includes("peso muerto") ||
    text.includes("deadlift") ||
    text.includes("prensa") ||
    text.includes("hack") ||
    text.includes("hip thrust") ||
    text.includes("cuádriceps") ||
    text.includes("cuadriceps") ||
    text.includes("femoral") ||
    text.includes("isquio") ||
    text.includes("glúteo") ||
    text.includes("gluteo") ||
    text.includes("gemelo") ||
    text.includes("pantorrilla") ||
    text.includes("zancada") ||
    text.includes("lunge") ||
    text.includes("leg extension") ||
    text.includes("leg curl") ||
    text.includes("pierna")
  ) {
    return "Pierna";
  }

  // 3. Tracción (Pull-ups, Rows, Lat Pulldowns, Face Pulls)
  if (
    text.includes("dominada") ||
    text.includes("pull-up") ||
    text.includes("chin-up") ||
    text.includes("jalón") ||
    text.includes("jalon") ||
    text.includes("pulldown") ||
    text.includes("remo") ||
    text.includes("row") ||
    text.includes("dorsal") ||
    text.includes("trapecio") ||
    text.includes("face pull") ||
    text.includes("pullover") ||
    text.includes("espalda")
  ) {
    return "Tracción";
  }

  // 4. Empuje (Bench Press, Military Press, Dips, Push-ups)
  if (
    text.includes("press") ||
    text.includes("banca") ||
    text.includes("bench") ||
    text.includes("militar") ||
    text.includes("overhead") ||
    text.includes("pecho") ||
    text.includes("chest") ||
    text.includes("fondos") ||
    text.includes("dips") ||
    text.includes("flexiones") ||
    text.includes("push-up") ||
    text.includes("hombro") ||
    text.includes("aperturas") ||
    text.includes("cruces")
  ) {
    return "Empuje";
  }

  return "General";
}

/**
 * Computes the strength rank and progression data for an exercise performance.
 * Pure function: getStrengthRank(exerciseName, weight, reps, userBodyweight = 75)
 *
 * @param {string} exerciseName
 * @param {number|string} weight
 * @param {number|string} reps
 * @param {number|string} userBodyweight
 * @returns {{
 *   rankName: string,
 *   rankColor: string,
 *   ratio: number,
 *   nextRankTargetKg: number|null,
 *   percentageToNext: number,
 *   tier: number,
 *   rankId: string,
 *   nextRankName: string|null,
 *   nextRankRatio: number|null,
 *   estimated1RM: number,
 *   pattern: string,
 *   icon: string,
 *   badgeClass: string
 * }}
 */
export function getStrengthRank(
  exerciseName = "",
  weight = 0,
  reps = 0,
  userBodyweight = 75
) {
  // Safe bodyweight fallback (defaults to 75kg if missing, non-positive or invalid)
  const bw =
    userBodyweight && parseFloat(userBodyweight) > 0
      ? parseFloat(userBodyweight)
      : 75;

  const w = Math.max(0, parseFloat(weight) || 0);
  const r = Math.max(0, parseInt(reps, 10) || 0);

  // 1RM estimation: Epley formula w * (1 + r / 30)
  let estimated1RM = 0;
  if (w > 0 && r > 0) {
    estimated1RM = r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10;
  }

  // Ratio relative to bodyweight
  const ratio = bw > 0 ? +(estimated1RM / bw).toFixed(2) : 0;

  // Movement pattern & thresholds
  const pattern = detectMovementPattern(exerciseName);
  const thresholds = PATTERN_THRESHOLDS[pattern] || PATTERN_THRESHOLDS.General;

  // Identify Tier (1 to 6)
  let tier = 1;
  if (ratio >= thresholds[4]) {
    tier = 6;
  } else if (ratio >= thresholds[3]) {
    tier = 5;
  } else if (ratio >= thresholds[2]) {
    tier = 4;
  } else if (ratio >= thresholds[1]) {
    tier = 3;
  } else if (ratio >= thresholds[0]) {
    tier = 2;
  } else {
    tier = 1;
  }

  const currentRankInfo = STRENGTH_RANKS[tier - 1];

  // Progression to next rank
  let nextRankName = null;
  let nextRankRatio = null;
  let nextRankTargetKg = null;
  let percentageToNext = 0;

  if (tier === 6) {
    // Top tier reached
    percentageToNext = 100;
  } else {
    const nextRankInfo = STRENGTH_RANKS[tier];
    nextRankName = nextRankInfo.name;
    nextRankRatio = thresholds[tier - 1];

    const currentMinRatio = tier === 1 ? 0 : thresholds[tier - 2];
    const span = nextRankRatio - currentMinRatio;

    if (span > 0) {
      const rawPct = ((ratio - currentMinRatio) / span) * 100;
      percentageToNext = Math.min(100, Math.max(0, Math.round(rawPct)));
    }

    // Calculate required load (kg) at current reps (or baseline 10 reps if 0) to hit next rank
    const effectiveReps = r > 0 ? r : 10;
    const target1RM = nextRankRatio * bw;
    const targetW = target1RM / (1 + effectiveReps / 30);
    // Round to nearest 0.5 kg for practical gym plates
    nextRankTargetKg = Math.round(targetW * 2) / 2;
  }

  return {
    rankName: currentRankInfo.name,
    rankColor: currentRankInfo.color,
    ratio,
    nextRankTargetKg,
    percentageToNext,
    tier: currentRankInfo.tier,
    rankId: currentRankInfo.id,
    nextRankName,
    nextRankRatio,
    estimated1RM,
    pattern,
    icon: currentRankInfo.icon,
    badgeClass: currentRankInfo.badgeClass,
  };
}

/**
 * Calculates user's Global Strength Rank from their overall PR records.
 * Takes the composite average tier of top lifts.
 *
 * @param {Array} records
 * @param {number|string} userBodyweight
 * @returns {object}
 */
export function getUserGlobalStrengthRank(records = [], userBodyweight = 75) {
  const bw =
    userBodyweight && parseFloat(userBodyweight) > 0
      ? parseFloat(userBodyweight)
      : 75;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return {
      ...STRENGTH_RANKS[0],
      ratio: 0,
      recordsEvaluated: 0,
      topLiftsCount: 0,
    };
  }

  const validRecords = records
    .filter((r) => {
      const w = parseFloat(r.pr_weight) || 0;
      const rm = parseFloat(r.best_estimated_1rm) || 0;
      return w > 0 || rm > 0;
    })
    .map((r) => {
      const curW = parseFloat(r.pr_weight) || 0;
      const curR = parseInt(r.pr_reps, 10) || 10;
      return getStrengthRank(r.exercise_name, curW, curR, bw);
    });

  if (validRecords.length === 0) {
    return {
      ...STRENGTH_RANKS[0],
      ratio: 0,
      recordsEvaluated: 0,
      topLiftsCount: 0,
    };
  }

  // Sort by tier descending, then by ratio descending
  validRecords.sort((a, b) => b.tier - a.tier || b.ratio - a.ratio);

  // Take the top 3 best lifts (or all if fewer)
  const topLifts = validRecords.slice(0, 3);
  const avgTier = Math.min(
    6,
    Math.max(
      1,
      Math.round(topLifts.reduce((s, item) => s + item.tier, 0) / topLifts.length)
    )
  );
  const avgRatio = +(
    topLifts.reduce((s, item) => s + item.ratio, 0) / topLifts.length
  ).toFixed(2);

  const matchedRank = STRENGTH_RANKS[avgTier - 1];

  return {
    ...matchedRank,
    ratio: avgRatio,
    recordsEvaluated: validRecords.length,
    topLiftsCount: topLifts.length,
  };
}
