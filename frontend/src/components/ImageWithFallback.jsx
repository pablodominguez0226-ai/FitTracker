import React from "react";
import ExerciseMediaViewer, {
  AnatomicalPulsingFallbackSvg,
  resolveExerciseMediaUrl,
} from "./ExerciseMediaViewer";

export { ExerciseMediaViewer, AnatomicalPulsingFallbackSvg, resolveExerciseMediaUrl };

/**
 * ImageWithFallback
 * Renderiza el modelo anatómico 3D ilustrado mediante ExerciseMediaViewer,
 * aplicando el diseño de tarjeta blanca estilizada en modo oscuro y miniatura
 * `w-11 h-11 rounded-xl bg-white p-0.5 object-contain shrink-0 border border-slate-200/10`,
 * con fallback automático a la silueta SVG anatómica con músculo titilando en rojo suave.
 */
export default function ImageWithFallback({
  src,
  slug,
  alt = "Ejercicio",
  muscleGroup = "Pecho",
  subgroup = "",
  exerciseName = "",
  variant = "thumbnail", // "thumbnail" | "hero"
  allowPauseOnTap = true,
  className = "",
}) {
  return (
    <ExerciseMediaViewer
      src={src}
      slug={slug}
      alt={alt}
      muscleGroup={muscleGroup}
      subgroup={subgroup}
      exerciseName={exerciseName || alt}
      variant={variant === "hero" ? "hero" : "thumbnail"}
      allowPauseOnTap={allowPauseOnTap}
      className={className}
    />
  );
}
