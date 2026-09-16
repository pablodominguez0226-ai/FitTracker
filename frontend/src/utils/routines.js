/**
 * FitTracker Predefined Routines (Quick Start)
 * Catálogo estático de rutinas de hipertrofia y fuerza
 */

export const PREDEFINED_ROUTINES = [
  {
    id: "push-day",
    title: "Push Day (Empuje)",
    category: "Empuje",
    tag: "Pecho • Hombro • Tríceps",
    summary:
      "Press banca plano (Barra), Press inclinado (Mancuernas), Elevaciones laterales (Mancuernas), Extensión en polea (Tríceps)",
    exercises: [
      {
        name: "Press banca plano con barra",
        searchTerms: [
          "press banca plano con barra",
          "press plano con barra",
          "press banca plano",
          "press banca",
        ],
        muscle: "Pecho",
        equipment: "Barra",
      },
      {
        name: "Press inclinado con mancuernas",
        searchTerms: [
          "press inclinado con mancuernas",
          "press inclinado",
          "inclinado mancuernas",
        ],
        muscle: "Pecho",
        equipment: "Mancuerna",
      },
      {
        name: "Elevaciones laterales con mancuernas",
        searchTerms: [
          "elevaciones laterales con mancuernas",
          "elevaciones laterales",
          "vuelo lateral",
        ],
        muscle: "Hombro",
        equipment: "Mancuerna",
      },
      {
        name: "Extensión en polea con barra (pushdown)",
        searchTerms: [
          "extensión en polea con barra",
          "extensiones en polea alta",
          "tricep con polea",
          "extensión en polea",
          "pushdown",
        ],
        muscle: "Brazos",
        equipment: "Polea",
      },
    ],
  },
  {
    id: "pull-day",
    title: "Pull Day (Tracción)",
    category: "Tracción",
    tag: "Espalda • Bíceps • Deltoides",
    summary:
      "Jalón al pecho (Polea), Remo con barra, Face pull (Polea), Curl de bíceps (Mancuernas)",
    exercises: [
      {
        name: "Jalón al pecho prono en polea alta",
        searchTerms: [
          "jalón al pecho prono",
          "jalón al pecho",
          "jalon al pecho",
        ],
        muscle: "Espalda",
        equipment: "Polea",
      },
      {
        name: "Remo con barra (prono/supino)",
        searchTerms: [
          "remo con barra (prono/supino)",
          "remo con barra",
          "remo agarre recto",
        ],
        muscle: "Espalda",
        equipment: "Barra",
      },
      {
        name: "Face pulls en polea alta con cuerda",
        searchTerms: [
          "face pulls en polea alta",
          "face pulls",
          "face pull",
        ],
        muscle: "Hombro",
        equipment: "Polea",
      },
      {
        name: "Curl martillo con mancuernas",
        searchTerms: [
          "curl martillo con mancuernas",
          "curl inclinado con mancuernas",
          "bicep con mancuerna",
          "curl martillo",
          "bíceps martillo",
        ],
        muscle: "Brazos",
        equipment: "Mancuerna",
      },
    ],
  },
  {
    id: "leg-day",
    title: "Leg Day (Piernas)",
    category: "Piernas",
    tag: "Cuádriceps • Femoral • Gemelos",
    summary:
      "Sentadilla trasera (Barra), Prensa (Máquina), Curl femoral (Máquina), Elevación de talones",
    exercises: [
      {
        name: "Sentadilla trasera con barra (Back squat)",
        searchTerms: [
          "sentadilla trasera con barra",
          "sentadilla trasera",
          "sentadilla con barra",
          "sentadilla",
        ],
        muscle: "Pierna",
        equipment: "Barra",
      },
      {
        name: "Prensa de piernas inclinada",
        searchTerms: [
          "prensa de piernas inclinada",
          "prensa de piernas",
          "prensa inclinada",
          "prensa",
        ],
        muscle: "Pierna",
        equipment: "Máquina",
      },
      {
        name: "Curl femoral acostado en máquina",
        searchTerms: [
          "curl femoral acostado en máquina",
          "curl femoral sentado en máquina",
          "curl femoral",
          "isquios",
        ],
        muscle: "Pierna",
        equipment: "Máquina",
      },
      {
        name: "Elevación de talones en máquina",
        searchTerms: [
          "elevación de talones en máquina",
          "elevación de talones de pie",
          "elevación de talones",
          "gemelos",
        ],
        muscle: "Pierna",
        equipment: "Máquina",
      },
    ],
  },
  {
    id: "upper-body",
    title: "Upper Body (Torso)",
    category: "Torso",
    tag: "Pecho • Espalda • Hombros",
    summary:
      "Press banca, Remo con barra, Press militar, Jalón al pecho",
    exercises: [
      {
        name: "Press banca plano con barra",
        searchTerms: [
          "press banca plano con barra",
          "press banca",
          "press plano",
        ],
        muscle: "Pecho",
        equipment: "Barra",
      },
      {
        name: "Remo con barra (prono/supino)",
        searchTerms: [
          "remo con barra (prono/supino)",
          "remo con barra",
          "remo agarre recto",
        ],
        muscle: "Espalda",
        equipment: "Barra",
      },
      {
        name: "Press militar de pie con barra",
        searchTerms: [
          "press militar de pie con barra",
          "press militar con mancuernas",
          "press militar",
          "militar",
        ],
        muscle: "Hombro",
        equipment: "Barra",
      },
      {
        name: "Jalón al pecho prono en polea alta",
        searchTerms: [
          "jalón al pecho prono",
          "jalón al pecho",
          "jalon al pecho",
        ],
        muscle: "Espalda",
        equipment: "Polea",
      },
    ],
  },
];

/**
 * Resuelve los ejercicios de una rutina predefinida contra el catálogo existente en la app.
 * Retorna objetos listos para inyectar en `activeExercises`.
 *
 * @param {object} routine - Objeto de rutina predefinida
 * @param {Array} allExercises - Lista completa de ejercicios de la BD
 * @param {Array} muscleGroups - Lista de grupos musculares de la BD
 * @returns {Array} Lista de ejercicios en formato de sesión activa
 */
export function resolveRoutineExercises(
  routine,
  allExercises = [],
  muscleGroups = []
) {
  if (!routine || !Array.isArray(routine.exercises)) return [];

  return routine.exercises.map((template, idx) => {
    // 1. Intentar encontrar coincidencia en allExercises por términos de búsqueda
    let matched = null;

    if (Array.isArray(template.searchTerms) && allExercises.length > 0) {
      for (const term of template.searchTerms) {
        const cleanTerm = term.toLowerCase().trim();
        matched = allExercises.find((ex) =>
          ex.name.toLowerCase().includes(cleanTerm)
        );
        if (matched) break;
      }
    }

    // 2. Si se encuentra el ejercicio en la BD, usar su id real y muscle_group_id
    if (matched) {
      return {
        exerciseId: matched.id,
        exerciseName: matched.name,
        muscleGroupId: matched.muscle_group_id,
        sets: [],
      };
    }

    // 3. Fallback: buscar el id de grupo muscular por nombre
    const matchedMg = muscleGroups.find((g) =>
      g.name.toLowerCase().includes(template.muscle.toLowerCase())
    );

    return {
      exerciseId: `routine_${routine.id}_${idx + 1}`,
      exerciseName: template.name,
      muscleGroupId: matchedMg?.id || 1,
      sets: [],
    };
  });
}
