import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import ExerciseDiagram from "./ExerciseDiagram";

export const ANATOMICAL_MUSCLE_CARDS = [
  { id: null, label: "Todos los músculos", anatomyGroup: "Todos" },
  { id: "triceps", label: "Tríceps", anatomyGroup: "Tríceps" },
  { id: "columna", label: "Columna vertebral", anatomyGroup: "Columna vertebral" },
  { id: "biceps", label: "Bíceps", anatomyGroup: "Bíceps" },
  { id: "serrato", label: "Serrato anterior", anatomyGroup: "Serrato anterior" },
  { id: "aductores", label: "Aductores", anatomyGroup: "Aductores" },
  { id: "antebrazos", label: "Antebrazos", anatomyGroup: "Antebrazos" },
  { id: "hombro", label: "Deltoides", anatomyGroup: "Deltoides" },
  { id: "pierna", label: "Cuádriceps", anatomyGroup: "Cuádriceps" },
  { id: "espalda", label: "Lats", anatomyGroup: "Lats" },
  { id: "pecho", label: "Pecho", anatomyGroup: "Pecho" },
  { id: "core", label: "Abdominales", anatomyGroup: "Abdominales" },
  { id: "gluteos", label: "Glúteos", anatomyGroup: "Glúteos" },
  { id: "isquios", label: "Isquiotibiales", anatomyGroup: "Isquiotibiales" },
  { id: "gemelos", label: "Gemelos", anatomyGroup: "Gemelos" },
];

/**
 * MuscleFilterBottomSheet - Modal BottomSheet deslizable de Filtro Muscular (Grid 3 columnas)
 */
export function MuscleFilterBottomSheet({
  isOpen,
  onClose,
  muscleGroups = [],
  selectedMuscleFilter = null,
  onApplyFilter,
}) {
  const [draftSelection, setDraftSelection] = useState(selectedMuscleFilter);

  useEffect(() => {
    if (isOpen) {
      setDraftSelection(selectedMuscleFilter === "all" ? null : selectedMuscleFilter);
    }
  }, [isOpen, selectedMuscleFilter]);

  if (!isOpen) return null;

  // Mapear IDs de base de datos si coincide algún grupo, manteniendo las 15 tarjetas anatómicas completas
  const cards = ANATOMICAL_MUSCLE_CARDS.map((preset) => {
    if (preset.id === null) {
      return {
        key: "muscle-all",
        value: null,
        label: preset.label,
        anatomyGroup: preset.anatomyGroup,
      };
    }

    let matchedDbGroup = null;
    if (Array.isArray(muscleGroups) && muscleGroups.length > 0) {
      matchedDbGroup = muscleGroups.find((mg) => {
        const n = String(mg?.name || "").toLowerCase();
        if (preset.id === "pecho" && n.includes("pecho")) return true;
        if (preset.id === "espalda" && (n.includes("espalda") || n.includes("lats") || n.includes("dorsal"))) return true;
        if (preset.id === "hombro" && (n.includes("hombro") || n.includes("deltoide"))) return true;
        if (preset.id === "biceps" && (n.includes("bícep") || n.includes("bicep"))) return true;
        if (preset.id === "triceps" && (n.includes("trícep") || n.includes("tricep"))) return true;
        if (preset.id === "pierna" && (n.includes("pierna") || n.includes("cuádricep") || n.includes("cuadricep"))) return true;
        if (preset.id === "core" && (n.includes("core") || n.includes("abdom"))) return true;
        return false;
      });
    }

    return {
      key: `muscle-${preset.id}`,
      value: preset.id,
      dbId: matchedDbGroup?.id ?? null,
      label: preset.label,
      anatomyGroup: preset.anatomyGroup,
    };
  });

  const isCardSelected = (card) => {
    if (card.value === null) {
      return draftSelection === null || draftSelection === "all";
    }
    if (draftSelection === card.value) return true;
    if (card.dbId !== null && String(draftSelection) === String(card.dbId)) return true;
    return false;
  };

  const handleSelectMuscle = (value) => {
    setDraftSelection(value);
    if (onApplyFilter) {
      onApplyFilter(value);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Filtrar por grupo muscular"
    >
      <div
        className="w-full max-w-md md:max-w-xl rounded-t-3xl md:rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/10 shadow-2xl flex flex-col max-h-[88dvh] md:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 md:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Tirador superior gris */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 flex-shrink-0" />

        {/* Header con título "Filtro" a la izquierda y botón de cierre (X) circular a la derecha */}
        <div className="px-5 pt-1 pb-2 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            Filtro
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#161B26] text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Cerrar"
            aria-label="Cerrar filtro"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Título de categoría: Barra roja vertical + "Filtrar por grupo muscular" */}
        <div className="px-5 pt-1 pb-1 flex items-center flex-shrink-0">
          <span className="w-1 h-4 bg-red-600 rounded-full inline-block mr-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Filtrar por grupo muscular
          </h3>
        </div>

        {/* 2. Grilla 3 Columnas de Grupos Musculares */}
        <div className="grid grid-cols-3 gap-3 p-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {cards.map((card) => {
            const selected = isCardSelected(card);

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => handleSelectMuscle(card.value)}
                className={`rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                  selected
                    ? "bg-red-50 dark:bg-red-950/40 border-2 border-red-500 text-red-600 dark:text-red-400 font-bold shadow-xs"
                    : "bg-slate-50 dark:bg-[#080A0F] border border-slate-100 dark:border-white/[0.07] text-slate-700 dark:text-slate-300 font-medium hover:border-red-500/40"
                }`}
              >
                <div className="w-16 h-16 rounded-xl bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] flex items-center justify-center p-1 mb-2 overflow-hidden">
                  <ExerciseDiagram
                    muscleGroup={card.anatomyGroup}
                    exerciseName={card.label}
                    variant="muscle-card"
                  />
                </div>
                <span className="text-[11px] sm:text-xs leading-tight text-center line-clamp-2 w-full">
                  {card.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MuscleFilterBottomSheet;
