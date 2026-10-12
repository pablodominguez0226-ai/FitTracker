/**
 * Pure analytics engine for FitTracker post-workout evaluation.
 * Computes 1RM, volume tonnage, PRs broken, and classifies performance
 * into improvements, declines, and neutral compared against historical sessions.
 */

export function calculateEstimated1RM(weight, reps) {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps, 10) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  // Epley formula: w * (1 + r / 30)
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

export function analyzeWorkoutSession(currentSessionExercises = [], userHistory = {}) {
  let totalVolumeKg = 0;
  let totalSets = 0;
  const prsBroken = [];
  const improvements = [];
  const declines = [];
  const neutral = [];

  // Normalize currentSessionExercises: can be array of exercise groups [{ exerciseId, exerciseName, sets: [...] }]
  // or flat array of sets.
  let exercisesList = [];
  if (Array.isArray(currentSessionExercises) && currentSessionExercises.length > 0) {
    if (currentSessionExercises?.[0]?.sets !== undefined) {
      exercisesList = currentSessionExercises;
    } else {
      // Group flat sets by exercise_id
      const map = {};
      (currentSessionExercises || []).forEach((s) => {
        if (!s) return;
        const eid = s?.exercise_id || s?.exerciseId || "0";
        if (!map[eid]) {
          map[eid] = {
            exerciseId: eid,
            exerciseName: s?.exercise_name || s?.exerciseName || s?.name || `Ejercicio #${eid}`,
            sets: [],
          };
        }
        map[eid].sets.push(s);
      });
      exercisesList = Object.values(map);
    }
  }

  // Normalize records lookup
  let recordsMap = userHistory.recordsMap;
  if (!recordsMap || typeof recordsMap !== "object") {
    const ee = {};
    const m = userHistory.records;
    if (Array.isArray(m)) {
      m.forEach((pe) => {
        if (pe && pe.exercise_id) {
          ee[pe.exercise_id] = pe;
        }
      });
    } else if (m && typeof m === "object") {
      // Si m vino como objeto en vez de array
      Object.values(m).forEach((pe) => {
        if (pe && pe.exercise_id) {
          ee[pe.exercise_id] = pe;
        }
      });
    }
    recordsMap = ee;
  }

  // Analyze each exercise
  (Array.isArray(exercisesList) ? exercisesList : []).forEach((exItem) => {
    if (!exItem) return;
    const exerciseId = exItem?.exerciseId || exItem?.exercise_id;
    const exerciseName = exItem?.exerciseName || exItem?.name || `Ejercicio #${exerciseId}`;
    const sets = Array.isArray(exItem?.sets) ? exItem.sets : [];

    // Filter valid non-warmup sets
    const nonWarmupSets = sets.filter(
      (s) => (s?.set_type || "normal") !== "warmup" && (s?.set_type || "normal") !== "W"
    );
    const validSets = nonWarmupSets.length > 0 ? nonWarmupSets : sets;

    // Filter sets with actual load or reps
    const effectiveSets = validSets.filter((s) => {
      const w = parseFloat(s?.weight) || 0;
      const r = parseInt(s.reps, 10) || 0;
      return w > 0 || r > 0;
    });

    if (effectiveSets.length === 0) return;

    totalSets += effectiveSets.length;

    // 1. Tonnage for this exercise
    let exerciseVolume = 0;
    let todayMaxWeight = 0;
    let todayRepsAtMax = 0;
    let todayBest1RM = 0;

    effectiveSets.forEach((s) => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps, 10) || 0;
      exerciseVolume += w * r;

      if (w > todayMaxWeight) {
        todayMaxWeight = w;
        todayRepsAtMax = r;
      } else if (w === todayMaxWeight && r > todayRepsAtMax) {
        todayRepsAtMax = r;
      }

      const est1RM = calculateEstimated1RM(w, r);
      if (est1RM > todayBest1RM) {
        todayBest1RM = est1RM;
      }
    });

    totalVolumeKg += exerciseVolume;

    // 2. Lookup historical record & previous session
    const record =
      recordsMap[exerciseId] ||
      recordsMap[String(exerciseId)] ||
      userHistory[exerciseId]?.record;

    const prevSession =
      userHistory[exerciseId] ||
      userHistory[String(exerciseId)] ||
      userHistory.previous_history?.[exerciseId] ||
      userHistory.previous_history?.[String(exerciseId)] ||
      userHistory.previousSessions?.[exerciseId];

    // 3. Absolute Historical PR Check
    const absPrWeight = record?.pr_weight ? parseFloat(record.pr_weight) : 0;
    const absPr1RM = record?.best_estimated_1rm ? parseFloat(record.best_estimated_1rm) : 0;

    if (absPrWeight > 0 && todayMaxWeight > absPrWeight) {
      prsBroken.push({
        exerciseId,
        exerciseName,
        oldPr: absPrWeight,
        newPr: todayMaxWeight,
        reps: todayRepsAtMax,
        type: "weight",
        text: `PR Roto en ${exerciseName}: ${todayMaxWeight} kg × ${todayRepsAtMax}`,
      });
    } else if (absPr1RM > 0 && todayBest1RM > absPr1RM) {
      prsBroken.push({
        exerciseId,
        exerciseName,
        oldPr: absPr1RM,
        newPr: todayBest1RM,
        reps: todayRepsAtMax,
        type: "1rm",
        text: `PR Roto en ${exerciseName}: 1RM est. ${todayBest1RM} kg`,
      });
    }

    // 4. Comparison against previous session
    const prevWeight =
      prevSession?.prev_max_weight !== undefined
        ? parseFloat(prevSession.prev_max_weight)
        : prevSession?.sets?.[0]?.weight !== undefined
        ? parseFloat(prevSession?.sets?.[0]?.weight ?? 0)
        : record?.last_weight !== undefined
        ? parseFloat(record.last_weight)
        : null;

    const prevReps =
      prevSession?.prev_max_reps !== undefined
        ? parseInt(prevSession.prev_max_reps, 10)
        : prevSession?.sets?.[0]?.reps !== undefined
        ? parseInt(prevSession?.sets?.[0]?.reps ?? 0, 10)
        : record?.last_reps !== undefined
        ? parseInt(record.last_reps, 10)
        : null;

    const prev1RM =
      prevSession?.prev_max_1rm !== undefined
        ? parseFloat(prevSession.prev_max_1rm)
        : prevWeight && prevReps
        ? calculateEstimated1RM(prevWeight, prevReps)
        : record?.best_estimated_1rm !== undefined
        ? parseFloat(record.best_estimated_1rm)
        : null;

    if (prevWeight !== null && prevWeight > 0 && prevReps !== null && prevReps > 0) {
      const diffWeight = +(todayMaxWeight - prevWeight).toFixed(1);
      const diffReps = todayRepsAtMax - prevReps;

      // AVANCE
      if (diffWeight > 0) {
        improvements.push({
          exerciseId,
          exerciseName,
          diffWeight,
          type: "weight",
          text: `${exerciseName}: +${diffWeight} kg vs sesión anterior`,
        });
      } else if (diffWeight === 0 && diffReps > 0) {
        improvements.push({
          exerciseId,
          exerciseName,
          diffReps,
          type: "reps",
          text: `${exerciseName}: +${diffReps} rep${diffReps > 1 ? "s" : ""} vs sesión anterior`,
        });
      } else if (prev1RM && todayBest1RM > prev1RM && diffWeight >= 0) {
        const pct = Math.round(((todayBest1RM - prev1RM) / prev1RM) * 100);
        improvements.push({
          exerciseId,
          exerciseName,
          diff1RM: pct,
          type: "1rm",
          text: `${exerciseName}: +${pct}% de 1RM vs sesión anterior`,
        });
      }
      // MANTENIDO
      else if (diffWeight === 0 && diffReps === 0) {
        neutral.push({
          exerciseId,
          exerciseName,
          text: `${exerciseName}: ${todayMaxWeight} kg × ${todayRepsAtMax} (Cargas consolidadas)`,
        });
      }
      // BAJÓN
      else if (diffWeight < 0) {
        const absDiff = Math.abs(diffWeight);
        declines.push({
          exerciseId,
          exerciseName,
          diffWeight: absDiff,
          type: "weight",
          text: `${exerciseName}: -${absDiff} kg vs sesión anterior (revisar fatiga o descanso)`,
        });
      } else if (diffReps < 0) {
        const absDiff = Math.abs(diffReps);
        declines.push({
          exerciseId,
          exerciseName,
          diffReps: absDiff,
          type: "reps",
          text: `${exerciseName}: -${absDiff} rep${absDiff > 1 ? "s" : ""} vs semana pasada (revisar fatiga o descanso)`,
        });
      } else {
        neutral.push({
          exerciseId,
          exerciseName,
          text: `${exerciseName}: Cargas y volumen estables`,
        });
      }
    } else {
      // First session ever recorded
      neutral.push({
        exerciseId,
        exerciseName,
        text: `${exerciseName}: ${todayMaxWeight} kg × ${todayRepsAtMax} (Primer registro de referencia)`,
      });
    }
  });

  // 5. Generate smart single-line next session suggestion
  let nextSessionSuggestion =
    "Mantener sobrecarga progresiva y consolidar volumen en ejercicios principales.";

  if (declines.length > 0) {
    const decEx = declines?.[0]?.exerciseName || "ejercicio";
    nextSessionSuggestion = `Priorizar descanso y buscar recuperar repeticiones en ${decEx}.`;
  } else if (improvements.length > 0) {
    const impEx = improvements?.[0]?.exerciseName || "ejercicio";
    nextSessionSuggestion = `Mantener cargas en accesorios y buscar +1 rep en ${impEx}.`;
  } else if (prsBroken.length > 0) {
    const prEx = prsBroken?.[0]?.exerciseName || "ejercicio";
    nextSessionSuggestion = `Consolidar el nuevo récord alcanzado en ${prEx} para la próxima sesión.`;
  }

  return {
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets,
    prsBroken,
    improvements,
    declines,
    neutral,
    nextSessionSuggestion,
  };
}
