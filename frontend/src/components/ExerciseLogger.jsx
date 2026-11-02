import React from "react";
import ActiveWorkoutSession from "./ActiveWorkoutSession";

export { ActiveWorkoutSession };

/**
 * ExerciseLogger - Punto de entrada compatible que renderiza ActiveWorkoutSession (Módulo 4)
 */
export default function ExerciseLogger({
  exercise,
  sets = [],
  onAddSet,
  onRemoveSet,
  onExitFocus,
  allAvailableExercises = [],
}) {
  const activeExercises = exercise
    ? [
        {
          exerciseId: exercise.id,
          exerciseName: exercise.name || "Ejercicio",
          muscleGroupId: exercise.muscle_group_id,
          muscleGroupName: exercise.muscle_group_name || null,
          sets: Array.isArray(sets) ? sets : [],
        },
      ]
    : [];

  return (
    <ActiveWorkoutSession
      activeExercises={activeExercises}
      allExercises={allAvailableExercises}
      onBack={onExitFocus}
      onDiscard={onExitFocus}
      onFinish={onExitFocus}
      onOpenAddExercise={onExitFocus}
      onAddSet={onAddSet}
      onRemoveSet={onRemoveSet}
    />
  );
}
