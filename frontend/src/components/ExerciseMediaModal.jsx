import React from "react";
import ExerciseDetailView from "./ExerciseDetailView";

/**
 * ExerciseMediaModal - Envuelve ExerciseDetailView en un contenedor modal
 * para mantener compatibilidad con todos los puntos de entrada (Workouts, Logger, Drawer, Catálogo).
 */
export default function ExerciseMediaModal({
  isOpen,
  onClose,
  exercise,
  onExerciseUpdated,
}) {
  if (!isOpen || !exercise) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md md:max-w-2xl h-[92dvh] sm:h-[86dvh] md:h-[85vh] rounded-t-3xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B0F17] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 md:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <ExerciseDetailView
          exercise={exercise}
          onBack={onClose}
          onExerciseUpdated={onExerciseUpdated}
          isModal={true}
        />
      </div>
    </div>
  );
}
