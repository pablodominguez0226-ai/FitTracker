/**
 * Relative Strength Ranks & Levels Engine for FitTracker
 *
 * Computes 1RM, strength ratio (1RM / bodyweight), and movement-pattern-adapted
 * tiers from Iniciado up to Élite Supremo.
 */

export const BIOMECHANICAL_LEAGUES = [
  {
    tier: 1,
    id: "bronce",
    name: "Liga Bronce",
    minRatio: 0,
    maxRatio: 0.9,
    color: "#CD7F32",
    textColor: "text-amber-600",
    bgColor: "bg-amber-900/15",
    borderColor: "border-amber-800/40",
    icon: "🥉",
    badgeClass: "border border-amber-700/40 bg-amber-900/20 text-amber-300 font-bold",
  },
  {
    tier: 2,
    id: "plata",
    name: "Liga Plata",
    minRatio: 0.9,
    maxRatio: 1.2,
    color: "#CBD5E1",
    textColor: "text-slate-300",
    bgColor: "bg-slate-400/15",
    borderColor: "border-slate-400/40",
    icon: "🥈",
    badgeClass: "border border-slate-400/40 bg-slate-500/20 text-slate-200 font-bold",
  },
  {
    tier: 3,
    id: "oro",
    name: "Liga Oro",
    minRatio: 1.2,
    maxRatio: 1.5,
    color: "#F59E0B",
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-400/40",
    icon: "🥇",
    badgeClass: "border border-amber-400/40 bg-amber-500/20 text-amber-300 font-bold",
  },
  {
    tier: 4,
    id: "diamante",
    name: "Liga Diamante",
    minRatio: 1.5,
    maxRatio: 1.8,
    color: "#38BDF8",
    textColor: "text-sky-400",
    bgColor: "bg-sky-500/15",
    borderColor: "border-sky-400/40",
    icon: "💎",
    badgeClass: "border border-sky-400/40 bg-sky-500/20 text-sky-300 font-bold",
  },
  {
    tier: 5,
    id: "prime",
    name: "Liga Prime (Élite Natural)",
    shortName: "Liga Prime",
    minRatio: 1.8,
    maxRatio: Infinity,
    color: "#A855F7",
    textColor: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-400/50",
    icon: "👑",
    badgeClass: "border border-purple-400/50 bg-purple-500/25 text-purple-200 font-bold",
  },
];

export const STRENGTH_RANKS = BIOMECHANICAL_LEAGUES;

/**
 * Returns theoretical prime strength multiplier relative to bodyweight for each exercise.
 */
export function getExercisePrimeMultiplier(exerciseName = "") {
  const name = (exerciseName || "").toLowerCase();
  // Sentadillas / Tren inferior pesado
  if (name.includes("sentadilla") || name.includes("squat") || name.includes("hack") || name.includes("prensa")) {
    return 2.00;
  }
  // Peso Muerto
  if (name.includes("peso muerto") || name.includes("deadlift")) {
    return 2.30;
  }
  // Hip Thrust
  if (name.includes("hip thrust")) {
    return 2.50;
  }
  // Press Banca / Empuje pectoral
  if (name.includes("banca") || name.includes("bench") || name.includes("press plano") || name.includes("press declinado") || name.includes("press inclinado")) {
    return 1.50;
  }
  // Press Militar / Empuje vertical de hombros
  if (name.includes("militar") || name.includes("overhead") || name.includes("press de hombro") || name.includes("press hombro") || name.includes("arnold")) {
    return 0.90;
  }
  // Remos / Tracción horizontal
  if (name.includes("remo") || name.includes("row") || name.includes("seal row")) {
    return 1.35;
  }
  // Dominadas / Tracción vertical (carga añadida / lastre)
  if (name.includes("dominada") || name.includes("pull-up") || name.includes("chin-up")) {
    return 0.50;
  }
  // Jalón
  if (name.includes("jalón") || name.includes("jalon") || name.includes("pulldown")) {
    return 1.25;
  }
  // Fondos (lastre)
  if (name.includes("fondo") || name.includes("dip")) {
    return 0.60;
  }
  // Aislamiento
  if (name.includes("curl") || name.includes("martillo") || name.includes("lateral") || name.includes("pájaro") || name.includes("pajaro") || name.includes("francés") || name.includes("frances") || name.includes("tríceps") || name.includes("triceps") || name.includes("polea")) {
    return 0.50;
  }
  if (name.includes("press")) {
    return 1.40;
  }
  return 1.50;
}

/**
 * Calculates theoretical prime target in kg directly as bodyweight * factor_biomecanico.
 */
export function calculatePrimeTarget(exerciseName = "", userBodyweight = 75, userHeight = 175) {
  const bw = userBodyweight && parseFloat(userBodyweight) > 0 ? parseFloat(userBodyweight) : 75;
  const multiplier = getExercisePrimeMultiplier(exerciseName);
  return Math.round(bw * multiplier * 2) / 2;
}

/**
 * Computes Biomechanical League, ratio, next league target and remaining kg.
 */
export function getBiomechanicalLeague(currentWeight = 0, userBodyweight = 75) {
  const bw = userBodyweight && parseFloat(userBodyweight) > 0 ? parseFloat(userBodyweight) : 75;
  const w = Math.max(0, parseFloat(currentWeight) || 0);
  const ratio = bw > 0 ? +(w / bw).toFixed(2) : 0;

  const bLeagues =
    Array.isArray(BIOMECHANICAL_LEAGUES) && BIOMECHANICAL_LEAGUES.length >= 5
      ? BIOMECHANICAL_LEAGUES
      : [
          { tier: 1, id: "bronce", name: "Liga Bronce", color: "#CD7F32", icon: "🥉", badgeClass: "" },
          { tier: 2, id: "plata", name: "Liga Plata", color: "#CBD5E1", icon: "🥈", badgeClass: "" },
          { tier: 3, id: "oro", name: "Liga Oro", color: "#F59E0B", icon: "🥇", badgeClass: "" },
          { tier: 4, id: "diamante", name: "Liga Diamante", color: "#38BDF8", icon: "💎", badgeClass: "" },
          { tier: 5, id: "prime", name: "Liga Prime (Élite Natural)", color: "#A855F7", icon: "👑", badgeClass: "" },
        ];

  let league;
  let nextLeague;
  let nextTargetKg;
  let kgToNext;
  let progressPct;

  if (ratio < 0.9) {
    league = bLeagues[0]; // Bronce
    nextLeague = bLeagues[1]; // Plata
    nextTargetKg = Math.round(0.9 * bw * 2) / 2;
    kgToNext = Math.max(0.5, +(nextTargetKg - w).toFixed(1));
    progressPct = Math.min(100, Math.max(0, Math.round((ratio / 0.9) * 100)));
  } else if (ratio < 1.2) {
    league = bLeagues[1]; // Plata
    nextLeague = bLeagues[2]; // Oro
    nextTargetKg = Math.round(1.2 * bw * 2) / 2;
    kgToNext = Math.max(0.5, +(nextTargetKg - w).toFixed(1));
    const span = 1.2 - 0.9;
    progressPct = Math.min(100, Math.max(0, Math.round(((ratio - 0.9) / span) * 100)));
  } else if (ratio < 1.5) {
    league = bLeagues[2]; // Oro
    nextLeague = bLeagues[3]; // Diamante
    nextTargetKg = Math.round(1.5 * bw * 2) / 2;
    kgToNext = Math.max(0.5, +(nextTargetKg - w).toFixed(1));
    const span = 1.5 - 1.2;
    progressPct = Math.min(100, Math.max(0, Math.round(((ratio - 1.2) / span) * 100)));
  } else if (ratio < 1.8) {
    league = bLeagues[3]; // Diamante
    nextLeague = bLeagues[4]; // Prime
    nextTargetKg = Math.round(1.8 * bw * 2) / 2;
    kgToNext = Math.max(0.5, +(nextTargetKg - w).toFixed(1));
    const span = 1.8 - 1.5;
    progressPct = Math.min(100, Math.max(0, Math.round(((ratio - 1.5) / span) * 100)));
  } else {
    league = bLeagues[4]; // Prime
    nextLeague = null;
    nextTargetKg = null;
    kgToNext = 0;
    progressPct = 100;
  }

  return {
    league: league || bLeagues[0],
    ratio,
    nextLeague,
    nextTargetKg,
    kgToNext,
    progressPct,
  };
}


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

  // 1. Aislamiento / Bíceps / Tríceps / Core (specific single-joint movements)
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

  // Identify Tier (1 to 5)
  let tier = 1;
  if (ratio >= (thresholds?.[3] ?? 1.8)) {
    tier = 5;
  } else if (ratio >= (thresholds?.[2] ?? 1.5)) {
    tier = 4;
  } else if (ratio >= (thresholds?.[1] ?? 1.2)) {
    tier = 3;
  } else if (ratio >= (thresholds?.[0] ?? 0.9)) {
    tier = 2;
  } else {
    tier = 1;
  }

  const currentRankInfo =
    STRENGTH_RANKS?.[tier - 1] ||
    STRENGTH_RANKS?.[0] || {
      tier: 1,
      id: "bronce",
      name: "Liga Bronce",
      color: "#CD7F32",
      icon: "🥉",
      badgeClass: "",
    };

  // Progression to next rank
  let nextRankName = null;
  let nextRankRatio = null;
  let nextRankTargetKg = null;
  let percentageToNext = 0;

  if (tier >= 5 || tier >= (STRENGTH_RANKS?.length || 5)) {
    // Top tier reached (Prime / Élite Natural)
    percentageToNext = 100;
  } else {
    const nextRankInfo = STRENGTH_RANKS?.[tier];
    nextRankName = nextRankInfo?.name ?? null;
    nextRankRatio = thresholds?.[tier - 1] ?? 1.8;

    const currentMinRatio = tier === 1 ? 0 : (thresholds?.[tier - 2] ?? 0);
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
    rankName: currentRankInfo?.name || "Liga Bronce",
    name: currentRankInfo?.name || "Liga Bronce",
    rankColor: currentRankInfo?.color || "#CD7F32",
    color: currentRankInfo?.color || "#CD7F32",
    ratio,
    nextRankTargetKg,
    percentageToNext,
    tier: currentRankInfo?.tier || 1,
    rankId: currentRankInfo?.id || "bronce",
    id: currentRankInfo?.id || "bronce",
    nextRankName,
    nextRankRatio,
    estimated1RM,
    pattern,
    icon: currentRankInfo?.icon || "🥉",
    badgeClass: currentRankInfo?.badgeClass || "",
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

  const defaultRank =
    STRENGTH_RANKS?.[0] || {
      tier: 1,
      id: "bronce",
      name: "Liga Bronce",
      color: "#CD7F32",
      icon: "🥉",
      badgeClass: "",
    };

  const safeRecords = Array.isArray(records)
    ? records
    : records && typeof records === "object"
    ? Object.values(records)
    : [];

  if (safeRecords.length === 0) {
    return {
      ...defaultRank,
      name: defaultRank?.name || "Liga Bronce",
      color: defaultRank?.color || "#CD7F32",
      icon: defaultRank?.icon || "🥉",
      ratio: 0,
      recordsEvaluated: 0,
      topLiftsCount: 0,
    };
  }

  const validRecords = safeRecords
    .filter((r) => {
      if (!r) return false;
      const w = parseFloat(r.pr_weight) || 0;
      const rm = parseFloat(r.best_estimated_1rm) || 0;
      return w > 0 || rm > 0;
    })
    .map((r) => {
      const curW = parseFloat(r?.pr_weight) || 0;
      const curR = parseInt(r?.pr_reps, 10) || 10;
      return getStrengthRank(r?.exercise_name || "", curW, curR, bw);
    });

  if (validRecords.length === 0) {
    return {
      ...defaultRank,
      name: defaultRank?.name || "Liga Bronce",
      color: defaultRank?.color || "#CD7F32",
      icon: defaultRank?.icon || "🥉",
      ratio: 0,
      recordsEvaluated: 0,
      topLiftsCount: 0,
    };
  }

  // Sort by tier descending, then by ratio descending
  validRecords.sort((a, b) => (b?.tier || 1) - (a?.tier || 1) || (b?.ratio || 0) - (a?.ratio || 0));

  // Take the top 3 best lifts (or all if fewer)
  const topLifts = validRecords.slice(0, 3);
  const maxTier = STRENGTH_RANKS?.length || 5;
  const avgTier = Math.min(
    maxTier,
    Math.max(
      1,
      Math.round(topLifts.reduce((s, item) => s + (item?.tier || 1), 0) / topLifts.length)
    )
  );
  const avgRatio = +(
    topLifts.reduce((s, item) => s + (item?.ratio || 0), 0) / topLifts.length
  ).toFixed(2);

  const matchedRank = STRENGTH_RANKS?.[avgTier - 1] || defaultRank;

  return {
    ...matchedRank,
    name: matchedRank?.name || "Liga Bronce",
    color: matchedRank?.color || "#CD7F32",
    icon: matchedRank?.icon || "🥉",
    ratio: avgRatio,
    recordsEvaluated: validRecords.length,
    topLiftsCount: topLifts.length,
  };
}
