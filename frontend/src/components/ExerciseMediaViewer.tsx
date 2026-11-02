import React, { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import ExerciseDiagram, { resolveAnatomyKey } from "./ExerciseDiagram";
import exercisesMasterData from "../data/exercises_master.json";

export interface ExerciseMediaViewerProps {
  src?: string | null;
  slug?: string | null;
  alt?: string;
  exerciseName?: string;
  muscleGroup?: string;
  subgroup?: string;
  variant?: "hero" | "thumbnail" | "card";
  allowPauseOnTap?: boolean;
  showCaption?: boolean;
  blendMode?: "card" | "screen" | "multiply";
  className?: string;
}

interface MasterExerciseItem {
  id?: number;
  slug?: string;
  name?: string;
  muscleGroup?: string;
  subgroup?: string;
  mediaUrl?: string;
  image_url?: string;
}

const MASTER_LIST: MasterExerciseItem[] = Array.isArray(exercisesMasterData)
  ? (exercisesMasterData as MasterExerciseItem[])
  : [];

const MASTER_BY_NAME = new Map<string, MasterExerciseItem>();
const MASTER_BY_SLUG = new Map<string, MasterExerciseItem>();

MASTER_LIST.forEach((item) => {
  if (item?.name) {
    MASTER_BY_NAME.set(item.name.trim().toLowerCase(), item);
  }
  if (item?.slug) {
    MASTER_BY_SLUG.set(item.slug.trim().toLowerCase(), item);
  }
});

/**
 * Resuelve la URL canónica /media/<categoria>/<slug>.gif para cualquier ejercicio
 */
export function resolveExerciseMediaUrl(params: {
  src?: string | null;
  slug?: string | null;
  exerciseName?: string;
  muscleGroup?: string;
}): string {
  const rawSrc = typeof params.src === "string" ? params.src.trim() : "";
  const isLegacyDiagram = rawSrc.startsWith("/assets/diagrams/");

  if (rawSrc && !isLegacyDiagram) {
    return rawSrc;
  }

  const slugKey = (params.slug || "").trim().toLowerCase();
  if (slugKey && MASTER_BY_SLUG.has(slugKey)) {
    const match = MASTER_BY_SLUG.get(slugKey);
    if (match?.mediaUrl || match?.image_url) {
      return (match.mediaUrl || match.image_url) as string;
    }
  }

  const nameKey = (params.exerciseName || "").trim().toLowerCase();
  if (nameKey && MASTER_BY_NAME.has(nameKey)) {
    const match = MASTER_BY_NAME.get(nameKey);
    if (match?.mediaUrl || match?.image_url) {
      return (match.mediaUrl || match.image_url) as string;
    }
  }

  if (slugKey) {
    const cat = slugKey.startsWith("pecho-")
      ? "pecho"
      : slugKey.startsWith("espalda-")
      ? "espalda"
      : slugKey.startsWith("piernas-")
      ? "piernas"
      : "brazos";
    return `/media/${cat}/${slugKey}.gif`;
  }

  return "";
}

/**
 * Silueta SVG Anatómica Vectorial con el músculo objetivo titilando en rojo suave (`animate-pulse`)
 * Se utiliza como fallback automático cuando un GIF no está disponible o falla en `onError`.
 */
export function AnatomicalPulsingFallbackSvg({
  muscleGroup = "Pecho",
  exerciseName = "",
  variant = "hero",
}: {
  muscleGroup?: string;
  exerciseName?: string;
  variant?: "hero" | "thumbnail" | "card";
}) {
  const anatomyKey = resolveAnatomyKey(muscleGroup, exerciseName);
  const isThumb = variant === "thumbnail";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden select-none ${
        isThumb ? "w-full h-full" : "w-44 h-44 mx-auto"
      }`}
      title={exerciseName || muscleGroup}
    >
      {/* Silueta anatómica vectorial en escala de grises con músculo resaltado */}
      <div className="w-full h-full flex items-center justify-center">
        <ExerciseDiagram
          muscleGroup={muscleGroup}
          exerciseName={exerciseName}
          variant={isThumb ? "thumbnail" : "hero"}
        />
      </div>

      {/* Resplandor rojo suave titilante sobre la zona muscular activa */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none animate-pulse"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`pulse-red-${anatomyKey}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#DC2626" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle
          cx="50"
          cy={
            anatomyKey === "cuadriceps" ||
            anatomyKey === "isquiotibiales" ||
            anatomyKey === "pantorrillas" ||
            anatomyKey === "gluteos"
              ? "62"
              : "44"
          }
          r={isThumb ? "28" : "24"}
          fill={`url(#pulse-red-${anatomyKey})`}
        />
      </svg>
    </div>
  );
}

/**
 * ExerciseMediaViewer - Componente estandarizado para renderizar el "Modelo Anatómico 3D Ilustrado"
 * (figura anatómica muscular en escala de grises con fibras detalladas y músculo activo en rojo).
 *
 * - En Modo Oscuro (OLED Deep Black) y Modo Claro:
 *   * `variant="hero"`: Encapsula el GIF en una tarjeta blanca estilizada
 *     `bg-white rounded-3xl p-4 flex items-center justify-center shadow-md max-w-xs mx-auto border border-slate-200/20`
 *     y permite pausar/reanudar la animación al tocar la pantalla.
 *   * `variant="thumbnail"`: Miniatura suave `w-11 h-11 rounded-xl bg-white p-0.5 object-contain shrink-0 border border-slate-200/10`.
 * - Incluye fallback SVG anatómico vectorial con músculo titilando en rojo suave si falla `onError`.
 */
export default function ExerciseMediaViewer({
  src,
  slug,
  alt = "Ejercicio",
  exerciseName = "",
  muscleGroup = "Pecho",
  subgroup = "",
  variant = "hero",
  allowPauseOnTap = true,
  showCaption = false,
  blendMode = "card",
  className = "",
}: ExerciseMediaViewerProps) {
  const [hasError, setHasError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [frozenDataUrl, setFrozenDataUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const resolvedSrc = resolveExerciseMediaUrl({
    src,
    slug,
    exerciseName: exerciseName || alt,
    muscleGroup: subgroup || muscleGroup,
  });

  useEffect(() => {
    setHasError(false);
    setIsPaused(false);
    setFrozenDataUrl(null);
  }, [resolvedSrc]);

  const shouldRenderGif = Boolean(resolvedSrc) && !hasError;
  const isVideo = resolvedSrc.endsWith(".mp4") || resolvedSrc.endsWith(".webm");

  const handleTogglePause = (e: React.MouseEvent) => {
    if (!allowPauseOnTap || variant === "thumbnail" || !shouldRenderGif) return;
    e.stopPropagation();

    if (!isPaused) {
      // Capturar el frame actual del GIF en un canvas para congelar la animación
      const imgEl = imgRef.current;
      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = imgEl.naturalWidth;
          canvas.height = imgEl.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imgEl, 0, 0);
            setFrozenDataUrl(canvas.toDataURL("image/png"));
          }
        } catch {
          // Ignorar errores de CORS si es una URL externa sin cabeceras
        }
      }
      setIsPaused(true);
    } else {
      setIsPaused(false);
      setFrozenDataUrl(null);
    }
  };

  const blendClass =
    blendMode === "screen"
      ? "mix-blend-screen"
      : blendMode === "multiply"
      ? "mix-blend-multiply"
      : "";

  // 1. Variante Miniatura (Catálogo / Modal de Rutina / Sesión Activa)
  if (variant === "thumbnail") {
    return (
      <div
        className={
          className ||
          "w-11 h-11 rounded-xl bg-white p-0.5 object-contain shrink-0 border border-slate-200/10 flex items-center justify-center overflow-hidden shadow-xs"
        }
      >
        {shouldRenderGif ? (
          isVideo ? (
            <video
              src={resolvedSrc}
              autoPlay
              loop
              muted
              playsInline
              onError={() => setHasError(true)}
              className={`w-full h-full object-contain rounded-lg ${blendClass}`}
            />
          ) : (
            <img
              src={resolvedSrc}
              alt={alt || exerciseName}
              onError={() => setHasError(true)}
              className={`w-full h-full object-contain rounded-lg ${blendClass}`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )
        ) : (
          <AnatomicalPulsingFallbackSvg
            muscleGroup={subgroup || muscleGroup}
            exerciseName={exerciseName || alt}
            variant="thumbnail"
          />
        )}
      </div>
    );
  }

  // 2. Variante Hero / Detalle del Ejercicio
  return (
    <div className="w-full flex flex-col items-center">
      <div
        onClick={handleTogglePause}
        role={allowPauseOnTap ? "button" : undefined}
        tabIndex={allowPauseOnTap ? 0 : undefined}
        aria-label={
          allowPauseOnTap
            ? isPaused
              ? "Reanudar demostración anatómica"
              : "Pausar demostración anatómica"
            : undefined
        }
        onKeyDown={(e) => {
          if (allowPauseOnTap && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleTogglePause(e as unknown as React.MouseEvent);
          }
        }}
        className={`relative bg-white rounded-3xl p-4 flex items-center justify-center shadow-md max-w-xs w-full mx-auto border border-slate-200/20 overflow-hidden transition ${
          allowPauseOnTap && shouldRenderGif ? "cursor-pointer active:scale-[0.99]" : ""
        }`}
      >
        {shouldRenderGif ? (
          isVideo ? (
            <video
              src={resolvedSrc}
              autoPlay={!isPaused}
              loop
              muted
              playsInline
              onError={() => setHasError(true)}
              className={`max-h-56 w-auto object-contain mx-auto select-none ${blendClass} ${className}`}
            />
          ) : (
            <img
              ref={imgRef}
              src={isPaused && frozenDataUrl ? frozenDataUrl : resolvedSrc}
              alt={alt || exerciseName}
              onError={() => setHasError(true)}
              className={`max-h-56 w-auto object-contain mx-auto select-none ${blendClass} ${className} ${
                isPaused && !frozenDataUrl ? "opacity-80" : ""
              }`}
              loading="eager"
              referrerPolicy="no-referrer"
            />
          )
        ) : (
          <div className="py-2 flex items-center justify-center">
            <AnatomicalPulsingFallbackSvg
              muscleGroup={subgroup || muscleGroup}
              exerciseName={exerciseName || alt}
              variant="hero"
            />
          </div>
        )}

        {/* Indicador interactivo de Pausa / Reproducción al tocar */}
        {allowPauseOnTap && shouldRenderGif && (
          <div
            className={`absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-opacity ${
              isPaused
                ? "bg-slate-900/85 text-white opacity-100 shadow-sm"
                : "bg-slate-900/60 text-white/90 opacity-0 hover:opacity-100"
            }`}
          >
            {isPaused ? (
              <>
                <Play size={10} fill="currentColor" />
                <span>Pausado</span>
              </>
            ) : (
              <>
                <Pause size={10} />
                <span>Toca para pausar</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Caption opcional con nombre destacado y badge de músculo principal en rojo */}
      {showCaption && (exerciseName || alt) && (
        <div className="mt-3 text-center">
          <h2 className="font-black text-xl text-slate-900 dark:text-white tracking-tight px-2 leading-snug">
            {exerciseName || alt}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {muscleGroup && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-950/40 text-red-400 border border-red-900/30">
                {muscleGroup}
              </span>
            )}
            {subgroup &&
              subgroup.toLowerCase() !== muscleGroup.toLowerCase() && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-950/40 text-red-400 border border-red-900/30">
                  {subgroup}
                </span>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
