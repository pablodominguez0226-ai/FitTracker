import React from "react";
import ExerciseCatalogModal, {
  ExerciseList,
  ExerciseRow,
  ExerciseItem,
} from "./ExerciseCatalogModal";

export { ExerciseCatalogModal, ExerciseList, ExerciseRow, ExerciseItem };

/**
 * ExerciseSelectorModal - Punto de entrada unificado del Catálogo de Ejercicios
 * Mantiene compatibilidad total con Workouts.jsx, Bitacora.jsx y Routines.jsx
 * renderizando el nuevo diseño Bento Clean / Deep Minimal en paleta Roja (#EF4444 / #DC2626).
 */
export default function ExerciseSelectorModal({
  isOpen,
  onClose,
  title = "Agregar",
  initialMuscleId = null,
  allExercises = [],
  muscleGroups = [],
  recordsMap = {},
  onSelect,
  onSelectMultiple,
  onExerciseCreated,
}) {
  return (
    <ExerciseCatalogModal
      isOpen={isOpen}
      onClose={onClose}
      title={title ? "Agregar" : "Agregar"}
      initialMuscleId={initialMuscleId}
      allExercises={allExercises}
      muscleGroups={muscleGroups}
      recordsMap={recordsMap}
      onSelect={onSelect}
      onSelectMultiple={onSelectMultiple}
      onExerciseCreated={onExerciseCreated}
    />
  );
}
