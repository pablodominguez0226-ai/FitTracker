import React, { useState, useMemo, useEffect } from "react";
import { X, Search, Dumbbell, ChevronRight, Plus, Sparkles } from "lucide-react";
import { getExerciseEquipment } from "../utils/fitnessUtils";

export default function ExerciseSelectorModal({
  isOpen,
  onClose,
  title = "Seleccionar Ejercicio",
  subtitle = "",
  initialMuscleId = null,
  allExercises = [],
  muscleGroups = [],
  recordsMap = {},
  onSelect,
  onCreateCustom,
}) {
  const [selectedMuscleId, setSelectedMuscleId] = useState(initialMuscleId);
  const [searchQuery, setSearchQuery] = useState("");

  // Sincronizar selección inicial cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedMuscleId(initialMuscleId);
      setSearchQuery("");
    }
  }, [isOpen, initialMuscleId]);

  // Lista de ejercicios filtrados por grupo muscular y texto
  const filteredExercises = useMemo(() => {
    const list = Array.isArray(allExercises) ? allExercises : [];
    return list.filter((ex) => {
      if (!ex || !ex.name) return false;

      // Filtro por grupo muscular (si no es 'todos' / null)
      if (selectedMuscleId && ex.muscle_group_id !== selectedMuscleId) {
        return false;
      }

      // Filtro por texto de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = ex.name.toLowerCase().includes(query);
        const matchesEquip = getExerciseEquipment(ex.name, ex.id).toLowerCase().includes(query);
        return matchesName || matchesEquip;
      }

      return true;
    });
  }, [allExercises, selectedMuscleId, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-[#121212] border border-[#2C2C2E] rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90dvh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        
        {/* CABECERA */}
        <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between bg-[#121212] flex-shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#8E8E93] truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white transition active:scale-95 cursor-pointer flex-shrink-0"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* BUSCADOR RÁPIDO */}
        <div className="p-3.5 border-b border-[#2C2C2E]/60 bg-[#121212] flex-shrink-0">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]"
            />
            <input
              type="text"
              placeholder="🔍 Buscar por nombre o equipamiento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] pl-10 pr-9 text-xs sm:text-sm font-medium text-white placeholder:text-[#8E8E93] outline-none transition focus:border-[#FF5722]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8E8E93] hover:text-white p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* CHIPS DE FILTRO POR GRUPO MUSCULAR */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedMuscleId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 flex-shrink-0 ${
                selectedMuscleId === null
                  ? "bg-[#FF5722] text-white shadow-md shadow-[#FF5722]/20"
                  : "bg-[#1C1C1E] border border-[#2C2C2E] text-[#8E8E93] hover:text-white"
              }`}
            >
              Todos
            </button>
            {(muscleGroups || []).map((mg) => {
              const isSelected = selectedMuscleId === mg.id;
              return (
                <button
                  key={mg.id}
                  type="button"
                  onClick={() => setSelectedMuscleId(mg.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 flex-shrink-0 ${
                    isSelected
                      ? "bg-[#FF5722] text-white shadow-md shadow-[#FF5722]/20"
                      : "bg-[#1C1C1E] border border-[#2C2C2E] text-[#8E8E93] hover:text-white"
                  }`}
                >
                  {mg.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* LISTA DE EJERCICIOS */}
        <div className="p-3 space-y-2 overflow-y-auto overscroll-contain flex-1">
          {filteredExercises.length > 0 ? (
            filteredExercises.map((ex) => {
              const rec = recordsMap[ex.id];
              const equip = getExerciseEquipment(ex.name || "", ex.id);

              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    onSelect(ex);
                  }}
                  className="w-full text-left p-3.5 rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] hover:border-[#FF5722]/50 hover:bg-[#252528] transition flex items-center justify-between gap-3 active:scale-[0.98] cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">
                      {ex.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8E8E93]">
                      <span className="uppercase font-semibold text-[#8E8E93]">
                        {equip}
                      </span>
                      {rec?.pr_weight && (
                        <span>
                          • PR: <strong className="text-white">{rec.pr_weight}kg × {rec.pr_reps}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="rounded-xl bg-[#121212] border border-[#2C2C2E] text-[#FF5722] p-2 hover:bg-[#FF5722] hover:text-white transition">
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-3">
              <Dumbbell size={32} className="mx-auto text-[#8E8E93]" />
              <p className="text-xs sm:text-sm text-[#8E8E93]">
                No encontramos ejercicios con estos filtros.
              </p>
              {onCreateCustom && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateCustom();
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white font-semibold text-xs inline-flex items-center gap-1.5 active:scale-95 transition"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Crear Ejercicio Personalizado</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* PIE CON ACCIÓN RÁPIDA DE CREAR */}
        {onCreateCustom && filteredExercises.length > 0 && (
          <div className="p-3 border-t border-[#2C2C2E] bg-[#121212] flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateCustom();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#2C2C2E] hover:border-white/20 bg-[#1C1C1E] text-xs font-semibold text-[#8E8E93] hover:text-white flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Plus size={14} />
              <span>¿No está en la lista? Crear Ejercicio Personalizado</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
