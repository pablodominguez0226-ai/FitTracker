/**
 * FitTracker Predefined Routines (Quick Start)
 * Catálogo estático exclusivo: Sistema Oficial Heavy Duty (Mike Mentzer) - 4 Días
 */

export const MENTZER_TECHNIQUES = [
  {
    id: "fallo_puro",
    label: "Fallo Puro",
    badge: "Fallo Puro",
    description:
      "Repeticiones ejecutadas con cadencia estricta 4-2-4 hasta la imposibilidad absoluta de completar otra repetición concéntrica.",
  },
  {
    id: "rest_pause",
    label: "Rest-Pause (+2 reps)",
    badge: "Rest-Pause",
    description:
      "Alcanzar el fallo positivo, pausar la carga 10-15s con respiraciones profundas y forzar 1 o 2 repeticiones máximas adicionales.",
  },
  {
    id: "repeticiones_negativas",
    label: "Repeticiones Negativas",
    badge: "Negativas",
    description:
      "Tras el fallo concéntrico, descenso excéntrico hiper-lento (6-10s) con asistencia o spotter en la subida.",
  },
];

export const PREDEFINED_ROUTINES = [];

/**
 * Calcula el estado de recuperación sistémica del Sistema Nervioso Central (SNC)
 * tras la última sesión Heavy Duty realizada por el usuario.
 * Mike Mentzer recomendaba entre 72h y 120h (3 a 5 días) de descanso absoluto.
 *
 * @param {Array} workouts - Lista de sesiones de entrenamiento históricas
 * @returns {object} Estado con días transcurridos, categoría y sugerencia automática
 */
export function getHeavyDutyRecoveryStatus(workouts = []) {
  const safeWorkouts = Array.isArray(workouts)
    ? workouts
    : workouts && typeof workouts === "object"
    ? Object.values(workouts)
    : [];

  if (safeWorkouts.length === 0) {
    return {
      hasHistory: false,
      lastDate: null,
      daysCompleted: null,
      hoursCompleted: null,
      status: "ready",
      statusLabel: "Listo para iniciar el ciclo",
      badgeClass: "bg-red-500/10 text-red-500 border-red-500/20",
      suggestion:
        "Iniciá tu ciclo Heavy Duty con el Día 1. Tras completarlo, programá de 72h a 120h (3 a 5 días) de descanso sistémico antes de la siguiente sesión.",
    };
  }

  // Filtrar sesiones Heavy Duty
  const hdWorkouts = safeWorkouts.filter((w) => {
    if (!w) return false;
    const notes = String(w.notes || "").toLowerCase();
    const sportType = String(w.sport_type || "").toLowerCase();
    const sets = Array.isArray(w.sets) ? w.sets : [];
    const hasHdSet = sets.some(
      (s) =>
        s?.set_type === "heavy_duty" ||
        s?.technique ||
        (s?.rest_effort && String(s.rest_effort).toLowerCase().includes("fallo"))
    );
    return (
      notes.includes("heavy duty") ||
      notes.includes("mentzer") ||
      sportType === "heavy_duty" ||
      hasHdSet
    );
  });

  if (hdWorkouts.length === 0) {
    return {
      hasHistory: false,
      lastDate: null,
      daysCompleted: null,
      hoursCompleted: null,
      status: "ready",
      statusLabel: "Listo para iniciar el ciclo",
      badgeClass: "bg-red-500/10 text-red-500 border-red-500/20",
      suggestion:
        "Iniciá tu ciclo Heavy Duty con el Día 1. Tras completarlo, programá de 72h a 120h (3 a 5 días) de descanso sistémico antes de la siguiente sesión.",
    };
  }

  // Ordenar cronológicamente descendente
  hdWorkouts.sort((a, b) => {
    const da = new Date(a.date || a.started_at || 0).getTime();
    const db = new Date(b.date || b.started_at || 0).getTime();
    return db - da;
  });

  const last = hdWorkouts[0];
  const lastDateStr = String(last.date || "").split("T")[0];
  const now = new Date();
  const lastDate = new Date(`${lastDateStr}T12:00:00`);
  const diffMs = Math.max(0, now.getTime() - lastDate.getTime());
  const hoursCompleted = Math.floor(diffMs / (1000 * 60 * 60));
  const daysCompleted = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let status = "resting";
  let statusLabel = "";
  let badgeClass = "";
  let suggestion = "";

  if (daysCompleted < 3) {
    status = "resting";
    statusLabel = "Recuperación en progreso (SNC)";
    badgeClass = "bg-red-500/10 text-red-400 border-red-400/20";
    const remaining = 3 - daysCompleted;
    suggestion = `Descanso post-Heavy Duty: ${daysCompleted} ${
      daysCompleted === 1 ? "día completado" : "días completados"
    }. Se recomiendan al menos 72h a 120h (3 a 5 días) de recuperación sistémica antes de la siguiente sesión. Faltan aprox. ${remaining} ${
      remaining === 1 ? "día" : "días"
    } para la ventana óptima de supercompensación.`;
  } else if (daysCompleted <= 5) {
    status = "optimal";
    statusLabel = "Ventana de supercompensación óptima (72h-120h)";
    badgeClass = "bg-red-500/10 text-red-500 border-red-500/20";
    suggestion = `Descanso post-Heavy Duty: ${daysCompleted} días completados. Tu Sistema Nervioso Central y depósitos de glucógeno están regenerados al 100%. Momento ideal para ejecutar la siguiente sesión al fallo absoluto.`;
  } else {
    status = "ready";
    statusLabel = "Recuperación completa alcanzada";
    badgeClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
    suggestion = `Descanso post-Heavy Duty: ${daysCompleted} días completados (> 120h). Recuperación total del organismo. Listo para reactivar el estímulo neuromuscular de alta intensidad.`;
  }

  return {
    hasHistory: true,
    lastDate: lastDateStr,
    lastSessionId: last.id,
    daysCompleted,
    hoursCompleted,
    status,
    statusLabel,
    badgeClass,
    suggestion,
  };
}

/**
 * MOTOR BIOMÉTRICO DE RECUPERACIÓN (Recovery Tracker):
 * - Calcula el tiempo transcurrido desde el último estímulo de un grupo muscular: "Último estímulo de este grupo: hace [X] horas"
 * - Alerta de Recuperación Incompleta (< 96h): "🛡️ Aviso Mentzer: Músculo en fase de reparación. El crecimiento ocurre durante el descanso"
 * - Notificación de fin de semana: "Sábado y Domingo programados de descanso biológico"
 */
export function getMuscleRecoveryTracker({
  workouts = [],
  targetMuscle = null,
  allExercises = [],
  muscleGroups = [],
} = {}) {
  const dayOfWeek = new Date().getDay(); // 0 is Sunday, 6 is Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const weekendNotice = isWeekend
    ? "Sábado y Domingo programados de descanso biológico"
    : null;

  const safeWorkouts = Array.isArray(workouts)
    ? workouts
    : workouts && typeof workouts === "object"
    ? Object.values(workouts)
    : [];

  const safeAllExercises = Array.isArray(allExercises)
    ? allExercises
    : allExercises && typeof allExercises === "object"
    ? Object.values(allExercises)
    : [];

  const safeMuscleGroups = Array.isArray(muscleGroups)
    ? muscleGroups
    : muscleGroups && typeof muscleGroups === "object"
    ? Object.values(muscleGroups)
    : [];

  // Mapa ejercicio id -> muscle_group_name
  const exMuscleMap = new Map();
  safeAllExercises.forEach((ex) => {
    if (!ex) return;
    const mg = safeMuscleGroups.find((g) => g.id === ex.muscle_group_id);
    const mName = ex.muscle_group_name || mg?.name || "";
    exMuscleMap.set(ex.id, {
      muscleId: ex.muscle_group_id,
      muscleName: mName.toLowerCase().trim(),
    });
  });

  // Normalizar targetMuscle a lista de nombres en minúsculas
  let targetNames = [];
  if (Array.isArray(targetMuscle)) {
    targetNames = targetMuscle.map((m) => String(m || "").toLowerCase().trim()).filter(Boolean);
  } else if (typeof targetMuscle === "string" && targetMuscle.trim()) {
    targetNames = [targetMuscle.toLowerCase().trim()];
  } else if (typeof targetMuscle === "number") {
    const mg = safeMuscleGroups.find((g) => g.id === targetMuscle);
    if (mg?.name) targetNames = [mg.name.toLowerCase().trim()];
  } else if (targetMuscle && typeof targetMuscle === "object") {
    const name = targetMuscle.muscle_group_name || targetMuscle.muscle || "";
    if (name) targetNames = [name.toLowerCase().trim()];
  }

  let displayMuscleName = "este grupo muscular";
  if (targetNames.length > 0) {
    displayMuscleName = targetNames.map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(" & ");
  }

  // Buscar el estímulo más reciente para este grupo muscular
  let latestTimestamp = null;
  const now = Date.now();

  for (const w of safeWorkouts) {
    if (!w) continue;
    let wTime = null;
    if (w.completed_at) wTime = new Date(w.completed_at).getTime();
    else if (w.started_at) wTime = new Date(w.started_at).getTime();
    else if (w.date) {
      const dStr = String(w.date).split("T")[0];
      wTime = new Date(`${dStr}T12:00:00`).getTime();
    } else if (w.created_at) {
      wTime = new Date(w.created_at).getTime();
    }

    if (!wTime || isNaN(wTime)) continue;

    let trainedTarget = false;
    if (targetNames.length === 0) {
      trainedTarget = true;
    } else {
      const wMgName = String(w.muscle_group_name || "").toLowerCase().trim();
      if (wMgName && targetNames.some((t) => wMgName.includes(t) || t.includes(wMgName))) {
        trainedTarget = true;
      }

      if (!trainedTarget && Array.isArray(w.sets)) {
        for (const s of w.sets) {
          const exInfo = exMuscleMap.get(s.exercise_id);
          const sExName = String(s.exercise_name || "").toLowerCase();
          if (exInfo?.muscleName && targetNames.some((t) => exInfo.muscleName.includes(t) || t.includes(exInfo.muscleName))) {
            trainedTarget = true;
            break;
          }
          if (targetNames.some((t) => sExName.includes(t))) {
            trainedTarget = true;
            break;
          }
        }
      }

      if (!trainedTarget) {
        const text = `${w.notes || ""} ${w.routine_name || ""}`.toLowerCase();
        if (targetNames.some((t) => text.includes(t))) {
          trainedTarget = true;
        }
      }
    }

    if (trainedTarget) {
      if (latestTimestamp === null || wTime > latestTimestamp) {
        latestTimestamp = wTime;
      }
    }
  }

  let hoursElapsed = null;
  let isUnderRecovery = false;
  let stimulusLabel = "Último estímulo de este grupo: sin registro previo";

  if (latestTimestamp !== null) {
    const diffMs = Math.max(0, now - latestTimestamp);
    hoursElapsed = Math.floor(diffMs / (1000 * 60 * 60));
    stimulusLabel = `Último estímulo de este grupo: hace ${hoursElapsed} horas`;
    isUnderRecovery = hoursElapsed < 96;
  }

  const alertMessage = isUnderRecovery
    ? "🛡️ Músculo en recuperación: menos de 48h desde el último estímulo."
    : null;

  return {
    hoursElapsed,
    latestTimestamp,
    isUnderRecovery,
    displayMuscleName,
    stimulusLabel,
    alertMessage,
    weekendNotice,
    isWeekend,
  };
}

/**
 * Adapta dinámicamente las rutinas predefinidas al perfil del usuario
 */
export function getProfileAdaptedRoutines(
  routines = PREDEFINED_ROUTINES,
  profile = null
) {
  const safeRoutines = Array.isArray(routines)
    ? routines
    : routines && typeof routines === "object"
    ? Object.values(routines)
    : [];

  return safeRoutines
    .map((r) => {
      if (!r) return null;
      const rExercises = Array.isArray(r.exercises)
        ? r.exercises
        : r.exercises && typeof r.exercises === "object"
        ? Object.values(r.exercises)
        : [];

      return {
        ...r,
        is_heavy_duty: false,
        is_recommended: true,
        recommended_badge: "🔥 Rutina Oficial",
        suggested_sets: r.suggested_sets || 3,
        suggested_reps: r.suggested_reps || "8-12 reps",
        rest_seconds: 90,
        rest_display: "90s descanso",
        exercises: rExercises.map((ex) => ({
          ...ex,
          is_heavy_duty: false,
          suggested_sets: ex?.target_sets || 3,
          suggested_reps: ex?.target_reps || "8-12",
          rest_seconds: 90,
        })),
      };
    })
    .filter(Boolean);
}

/**
 * Resuelve los ejercicios de una rutina predefinida contra el catálogo existente en la app.
 * Retorna objetos listos para inyectar en `activeExercises`.
 */
export function resolveRoutineExercises(
  routine,
  allExercises = [],
  muscleGroups = []
) {
  const routineExs = Array.isArray(routine?.exercises)
    ? routine.exercises
    : routine?.exercises && typeof routine.exercises === "object"
    ? Object.values(routine.exercises)
    : [];
  if (!routine || routineExs.length === 0) return [];

  const safeAllExercises = Array.isArray(allExercises)
    ? allExercises
    : allExercises && typeof allExercises === "object"
    ? Object.values(allExercises)
    : [];
  const safeMuscleGroups = Array.isArray(muscleGroups)
    ? muscleGroups
    : muscleGroups && typeof muscleGroups === "object"
    ? Object.values(muscleGroups)
    : [];

  return routineExs
    .map((template, idx) => {
      if (!template) return null;
      let matched = null;

      // 0. Si tiene exercise_id explícito de la BD:
      if (template.exercise_id && safeAllExercises.length > 0) {
        matched = safeAllExercises.find((ex) => ex && ex.id === template.exercise_id);
      }

      // 1. Intentar encontrar coincidencia en allExercises por términos o nombre
      if (!matched) {
        const templateName = template?.exercise_name || template?.name || "";
        const terms =
          template?.searchTerms ||
          template?.search_terms ||
          (templateName ? [templateName] : []);

        const termsList = Array.isArray(terms)
          ? terms
          : terms && typeof terms === "object"
          ? Object.values(terms)
          : [];

        if (termsList.length > 0 && safeAllExercises.length > 0) {
          for (const term of termsList) {
            if (!term || typeof term !== "string") continue;
            const cleanTerm = term.toLowerCase().trim();
            matched = safeAllExercises.find((ex) =>
              ex?.name?.toLowerCase().includes(cleanTerm)
            );
            if (matched) break;
          }
        }
      }

      const exName =
        matched?.name ||
        template?.exercise_name ||
        template?.name ||
        `Ejercicio #${idx + 1}`;
      const targetSets = template.target_sets || 1;
      const targetReps = template.target_reps || template.suggested_reps || "6-10";
      const restSeconds = 180;
      const cadence = "4-2-4";

      // 2. Si se encuentra el ejercicio en la BD, usar su id real y muscle_group_id
      if (matched) {
        return {
          exerciseId: matched?.id,
          exerciseName: matched?.name || exName,
          muscleGroupId: matched?.muscle_group_id,
          suggestedSets: targetSets,
          suggestedReps: targetReps,
          restSeconds: restSeconds,
          targetTempo: "4-2-4-0",
          cadence: cadence,
          isHeavyDuty: true,
          executionTips: matched?.execution_tips || template?.execution_tips || null,
          primaryMuscles: matched?.primary_muscles || template?.primary_muscles || null,
          sets: [],
        };
      }

      // 3. Fallback: buscar el id de grupo muscular por nombre
      const searchTarget = String(template?.muscle_group_name || template?.muscle || "").toLowerCase();
      const matchedMg = searchTarget
        ? safeMuscleGroups.find((g) => g?.name && g.name.toLowerCase().includes(searchTarget))
        : null;

      return {
        exerciseId: template?.exercise_id || `routine_${routine?.id || 'custom'}_${idx + 1}`,
        exerciseName: exName,
        muscleGroupId: matchedMg?.id || 1,
        suggestedSets: targetSets,
        suggestedReps: targetReps,
        restSeconds: restSeconds,
        targetTempo: "4-2-4-0",
        cadence: cadence,
        isHeavyDuty: true,
        executionTips: template.execution_tips || null,
        primaryMuscles: template.primary_muscles || null,
        sets: [],
      };
    })
    .filter(Boolean);
}
