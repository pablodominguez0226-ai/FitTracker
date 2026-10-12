/**
 * Smart Weekly Periodization Engine (Overload vs Deload)
 * FitTracker - Minimalist Personal Hypertrophy & Strength
 */

export const PERIODIZATION_MODES = {
  OVERLOAD: "overload",
  DELOAD: "deload",
};

export const PERIODIZATION_LABELS = {
  overload: {
    id: "overload",
    name: "Fase de Sobrecarga",
    shortName: "Sobrecarga",
    icon: "⚡",
    color: "#FF5722",
  },
  deload: {
    id: "deload",
    name: "Recuperación Activa (Descarga)",
    shortName: "Descarga",
    icon: "🛡️",
    color: "#38BDF8",
  },
};

const STORAGE_KEY = "fittracker_periodization_mode";

export function getWeeklyPeriodizationMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) || PERIODIZATION_MODES.OVERLOAD;
  } catch {
    return PERIODIZATION_MODES.OVERLOAD;
  }
}

export function setWeeklyPeriodizationMode(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (e) {
    console.warn("Error guardando modo de periodización:", e);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fittracker:periodizationChanged", { detail: mode })
    );
  }
}

/**
 * Computes suggested weight, reps, RIR and concise badge text
 * based on active weekly mode and exercise.
 *
 * @param {object} params
 * @param {string} params.exerciseName
 * @param {number} params.previousWeight
 * @param {number} params.previousReps
 * @param {string} params.equipment
 * @param {string} params.mode
 */
export function getSmartPeriodizationSuggestion({
  exerciseName = "",
  previousWeight = 0,
  previousReps = 10,
  equipment = "Barra",
  mode = getWeeklyPeriodizationMode(),
}) {
  const prevW = Math.max(0, parseFloat(previousWeight) || 0);
  const prevR = Math.max(1, parseInt(previousReps, 10) || 10);

  const nameLower = (exerciseName || "").toLowerCase();
  const isBarbell =
    equipment === "Barra" ||
    nameLower.includes("barra") ||
    nameLower.includes("sentadilla") ||
    nameLower.includes("banca") ||
    nameLower.includes("peso muerto") ||
    nameLower.includes("militar");

  if (mode === PERIODIZATION_MODES.DELOAD) {
    // 70% del peso habitual (redondeado a múltiplos de 2.5 kg)
    const deloadWeight = prevW > 0 ? Math.round((prevW * 0.7) / 2.5) * 2.5 : 0;
    return {
      mode: PERIODIZATION_MODES.DELOAD,
      suggestedWeight: deloadWeight,
      suggestedReps: prevR,
      suggestedRir: 3, // RIR 3-4
      rirRange: "3-4",
      incrementKg: prevW > 0 ? -(prevW - deloadWeight).toFixed(1) : 0,
      badgeText: "Modo recuperación activa",
      targetText: "70% carga • RIR 3-4",
      color: "#38BDF8",
    };
  }

  // OVERLOAD MODE (Semana Dura)
  const increment = isBarbell ? 2.5 : 1.25;
  const suggestedWeight =
    prevW > 0 ? Math.round((prevW + increment) * 100) / 100 : (isBarbell ? 20.0 : 10.0);

  return {
    mode: PERIODIZATION_MODES.OVERLOAD,
    suggestedWeight,
    suggestedReps: prevR,
    suggestedRir: 1, // RIR 1-2
    rirRange: "1-2",
    incrementKg: increment,
    badgeText: "Objetivo: romper récord o +1 rep",
    targetText: `+${increment} kg • RIR 1-2`,
    color: "#FF5722",
  };
}

/**
 * Analyzes weekly workout cycles (last 7 days vs previous 7 days)
 * Determines completion of target reps and volume overload.
 */
export function analyzeWeeklyCycle(workouts = []) {
  if (!workouts || !Array.isArray(workouts) || workouts.length === 0) {
    return {
      daysWithWorkouts: 0,
      isWeekCompleted: false,
      completedRepsRate: 0,
      totalVolumeThisWeek: 0,
      previousWeekVolume: 0,
      recommendation: "Comenzá tu ciclo semanal registrando tus sesiones de sobrecarga.",
      shouldSuggestDeload: false,
    };
  }

  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ms7Days = 7 * 24 * 60 * 60 * 1000;
  const ms14Days = 14 * 24 * 60 * 60 * 1000;

  const thisWeekWorkouts = [];
  const lastWeekWorkouts = [];

  workouts.forEach((w) => {
    if (!w.date) return;
    const wDate = new Date(w.date).getTime();
    const diff = todayZero - wDate;
    if (diff >= 0 && diff < ms7Days) {
      thisWeekWorkouts.push(w);
    } else if (diff >= ms7Days && diff < ms14Days) {
      lastWeekWorkouts.push(w);
    }
  });

  const getWorkoutVolume = (wList) =>
    wList.reduce((acc, w) => {
      const sets = w.sets || [];
      return (
        acc +
        sets.reduce((sAcc, s) => {
          if (s.set_type === "warmup" || s.set_type === "W") return sAcc;
          return sAcc + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
        }, 0)
      );
    }, 0);

  const totalVolumeThisWeek = Math.round(getWorkoutVolume(thisWeekWorkouts));
  const previousWeekVolume = Math.round(getWorkoutVolume(lastWeekWorkouts));

  // Count unique workout dates in the last 7 days
  const uniqueDays = new Set(thisWeekWorkouts.map((w) => String(w.date).slice(0, 10))).size;

  // Calculate completed reps rate
  let totalSetsCount = 0;
  let completedSetsCount = 0;
  thisWeekWorkouts.forEach((w) => {
    (w.sets || []).forEach((s) => {
      totalSetsCount += 1;
      if (s.completed) completedSetsCount += 1;
    });
  });

  const completedRepsRate =
    totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 100;

  const isWeekCompleted = uniqueDays >= 4 || thisWeekWorkouts.length >= 4;
  const shouldSuggestDeload = isWeekCompleted && thisWeekWorkouts.length >= 5;

  let recommendation = "Foco en Sobrecarga Progresiva: +2.5kg en básicos o +1 repetición.";
  if (shouldSuggestDeload) {
    recommendation =
      "Completaste un ciclo semanal de alta exigencia. Podés activar Descarga (Deload) si sentís fatiga articular o acumulada.";
  } else if (isWeekCompleted) {
    recommendation = "Semana completada con éxito. Rangos de repeticiones consolidados.";
  }

  return {
    daysWithWorkouts: uniqueDays,
    isWeekCompleted,
    completedRepsRate,
    totalVolumeThisWeek,
    previousWeekVolume,
    recommendation,
    shouldSuggestDeload,
  };
}
