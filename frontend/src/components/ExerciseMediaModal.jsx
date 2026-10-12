import React, { useState, useEffect } from "react";
import { X, Camera, Link as LinkIcon, Check, Loader2, Sparkles, RefreshCw } from "lucide-react";
import ExerciseDiagram from "./ExerciseDiagram";
import { updateExercise } from "../api/client";

/**
 * ExerciseMediaModal - Modal visual defensivo con fallback SVG anatómico,
 * soporte de referrerPolicy="no-referrer" y edición rápida de URL de imagen/gif.
 */
export default function ExerciseMediaModal({
  isOpen,
  onClose,
  exercise,
  onExerciseUpdated,
}) {
  const [imgError, setImgError] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState("");

  useEffect(() => {
    if (exercise) {
      const url = exercise.image_url || "";
      setCurrentImageUrl(url);
      setCustomUrl(url);
      setImgError(false);
      setIsEditing(false);
      setSaveSuccess(false);
    }
  }, [exercise, exercise?.image_url]);

  if (!isOpen || !exercise) return null;

  const handleSaveUrl = async (e) => {
    e.preventDefault();
    if (!exercise?.id) return;

    try {
      setIsSaving(true);
      const trimmed = customUrl.trim();
      const updated = await updateExercise(exercise.id, { image_url: trimmed || null });
      setCurrentImageUrl(trimmed);
      setImgError(false);
      setSaveSuccess(true);
      setIsEditing(false);

      if (onExerciseUpdated) {
        onExerciseUpdated(updated);
      }

      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err) {
      console.error("Error actualizando URL de imagen del ejercicio:", err);
      alert("No se pudo actualizar la imagen del ejercicio.");
    } finally {
      setIsSaving(false);
    }
  };

  const exerciseName = exercise?.name || exercise?.exercise_name || exercise?.exerciseName || "Ejercicio";
  const muscleGroup = exercise?.muscle_group_name || exercise?.muscle_group || exercise?.muscleGroup || "";
  const keyCue =
    exercise?.key_cue ||
    exercise?.keyCue ||
    (exercise?.execution_tips ? exercise.execution_tips.split("\n")[0].replace(/^[•\-\*]\s*/, "") : null) ||
    "Retracción escapular activa y trayectoria controlada en todo el rango.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0F0F11] p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-[#FF5722] flex-shrink-0" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider truncate">
                Biomecánica &amp; Esquema
              </h3>
            </div>
            <h2 className="text-base font-bold text-white mt-1 truncate">
              {exerciseName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[#FF5722] bg-[#FF5722]/10 px-2 py-0.5 rounded-md border border-[#FF5722]/20">
                {muscleGroup || "Músculo"}
              </span>
              <span className="text-[10px] text-[#8E8E93]">
                {exercise?.equipment_type || "barra"} • {exercise?.mechanics_type || "compuesto"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#8E8E93] hover:text-white p-1 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer flex-shrink-0"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Visualizador Inteligente (Imagen Externa con Fallback a Diagrama Anatómico Local) */}
        <div className="relative rounded-2xl border border-white/10 bg-[#0A0A0C] overflow-hidden flex items-center justify-center min-h-[180px] max-h-[230px]">
          {currentImageUrl && !imgError ? (
            <img
              src={currentImageUrl}
              alt={exerciseName}
              onError={() => {
                console.warn(`No se pudo cargar la imagen para ${exerciseName}: ${currentImageUrl}. Activando fallback SVG.`);
                setImgError(true);
              }}
              className="w-full h-full max-h-[220px] object-contain p-2"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <ExerciseDiagram
              muscleGroup={muscleGroup}
              exerciseName={exerciseName}
              className="border-0 bg-transparent min-h-[180px] max-h-[220px]"
            />
          )}

          {imgError && currentImageUrl && (
            <div className="absolute top-2 right-2 rounded-lg bg-black/80 px-2 py-0.5 text-[9px] text-amber-400 border border-amber-500/20 backdrop-blur-md">
              Diagrama anatómico (enlace externo no disponible)
            </div>
          )}
        </div>

        {/* Clave Técnica de 1 Línea (key_cue) */}
        <div className="rounded-2xl border border-[#FF5722]/25 bg-gradient-to-r from-[#FF5722]/10 to-[#7C4DFF]/10 p-3 flex items-start gap-2.5">
          <span className="text-sm flex-shrink-0">⚡</span>
          <div className="text-xs text-neutral-200 leading-snug">
            <strong className="text-white font-semibold">Clave técnica: </strong>
            <span>{keyCue}</span>
          </div>
        </div>

        {/* Sección de Edición de URL Personalizada */}
        <div className="rounded-2xl border border-white/5 bg-[#141417] p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 text-[#8E8E93] hover:text-white transition font-medium cursor-pointer"
            >
              <LinkIcon size={13} className="text-[#FF5722]" />
              <span>Personalizar imagen o GIF</span>
            </button>
            {currentImageUrl && (
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <Check size={11} /> URL vinculada
              </span>
            )}
          </div>

          {isEditing && (
            <form onSubmit={handleSaveUrl} className="space-y-2 pt-1 animate-in fade-in duration-150">
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://... (pegar enlace directo a imagen o gif)"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A0A0C] px-3 py-2 text-xs text-white placeholder-[#636366] outline-none focus:border-[#FF5722] transition"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCustomUrl(currentImageUrl);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#8E8E93] hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white text-xs font-semibold hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Guardar URL</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {saveSuccess && (
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 pt-0.5">
              <Check size={12} />
              <span>Imagen actualizada exitosamente</span>
            </div>
          )}
        </div>

        {/* Botón de Cierre */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-white/10 bg-[#1C1C1E] text-white text-xs font-semibold hover:bg-white/10 transition cursor-pointer"
        >
          Entendido / Cerrar
        </button>
      </div>
    </div>
  );
}
