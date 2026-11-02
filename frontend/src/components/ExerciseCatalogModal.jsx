import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Filter,
  Search,
  X,
} from "lucide-react";
import { formatExerciseName, resolveAnatomyKey } from "./ExerciseDiagram";
import ImageWithFallback from "./ImageWithFallback";
import MuscleFilterSheet from "./MuscleFilterSheet";
import ExerciseDetailView from "./ExerciseDetailView";
import CreateExerciseModal from "./CreateExerciseModal";
import { getFrequentExercises } from "../api/client";
import exercisesMasterData from "../data/exercises_master.json";

export { ImageWithFallback };

const MAIN_MUSCLE_TABS = [
  { id: "all", label: "Todos" },
  { id: "Pecho", label: "Pecho" },
  { id: "Espalda", label: "Espalda" },
  { id: "Brazos", label: "Brazos" },
  { id: "Piernas", label: "Piernas" },
];

const MASTER_BY_NAME = new Map(
  (exercisesMasterData || []).map((item) => [
    String(item.name || "").trim().toLowerCase(),
    item,
  ])
);

/**
 * Formatea el nombre del grupo muscular principal ("Pecho", "Espalda", "Brazos", "Piernas")
 */
export function formatMuscleGroupDisplay(ex, muscleGroupsMap = {}) {
  const masterMatch = MASTER_BY_NAME.get(
    String(ex?.name || "").trim().toLowerCase()
  );
  const rawName =
    ex?.muscleGroup ||
    ex?.muscle_group_name ||
    muscleGroupsMap[ex?.muscle_group_id] ||
    ex?.muscle_group ||
    masterMatch?.muscleGroup ||
    ex?.target_muscle ||
    "General";
  const lower = String(rawName).trim().toLowerCase();
  if (lower === "core") return "Abdominales";
  if (
    lower === "hombro" ||
    lower === "hombros" ||
    lower === "biceps" ||
    lower === "bíceps" ||
    lower === "triceps" ||
    lower === "tríceps" ||
    lower === "brazo" ||
    lower === "brazos"
  ) {
    return "Brazos";
  }
  if (lower === "pierna" || lower === "piernas") return "Piernas";
  if (lower === "pecho") return "Pecho";
  if (lower === "espalda") return "Espalda";
  return rawName;
}

/**
 * Obtiene el subgrupo anatómico del ejercicio ("Pectoral Mayor", "Dorsal Ancho", "Hombros", "Bíceps", "Tríceps", "Cuádriceps", etc.)
 */
export function getExerciseSubgroup(ex) {
  const masterMatch = MASTER_BY_NAME.get(
    String(ex?.name || "").trim().toLowerCase()
  );
  return (
    ex?.subgroup ||
    masterMatch?.subgroup ||
    ex?.primary_muscles ||
    ex?.secondary_muscles ||
    ""
  );
}

/**
 * Obtiene la ruta multimedia estática (/media/...) del ejercicio
 */
export function getExerciseMediaUrl(ex) {
  const masterMatch = MASTER_BY_NAME.get(
    String(ex?.name || "").trim().toLowerCase()
  );
  return ex?.mediaUrl || ex?.image_url || masterMatch?.mediaUrl || "";
}

/**
 * ExerciseRow / ExerciseItem - Fila individual compacta del catálogo de ejercicios
 * - Checkbox circular a la izquierda
 * - Miniatura en w-10 h-10 rounded-xl bg-[#161B26] object-cover con ImageWithFallback
 * - Nombre directo y limpio en tipografía bold blanca (text-sm font-bold text-white)
 * - Badge del grupo muscular y subgrupo anatómico
 * - Al hacer clic en el ejercicio se abre ExerciseDetailView
 */
export function ExerciseRow({
  exercise,
  muscleGroupLabel,
  isSelected,
  onToggleSelect,
  onOpenDetail,
}) {
  const displayName = formatExerciseName(exercise?.name);
  const subgroupLabel = getExerciseSubgroup(exercise);
  const mediaUrl = getExerciseMediaUrl(exercise);

  return (
    <div
      onClick={() =>
        onOpenDetail({
          ...exercise,
          muscleGroup: muscleGroupLabel,
          subgroup: subgroupLabel,
          mediaUrl,
        })
      }
      className={`flex items-center justify-between gap-3 rounded-2xl p-3 border transition-all cursor-pointer active:scale-[0.99] ${
        isSelected
          ? "bg-red-950/30 border-red-500/60"
          : "bg-[#0E131F] border-white/[0.07] hover:border-red-500/30"
      }`}
    >
      {/* Lado izquierdo: Checkbox circular + Miniatura w-10 h-10 + Textos */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox circular para seleccionar e incrementar contador */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(exercise);
          }}
          aria-pressed={isSelected}
          aria-label={`Seleccionar ${displayName}`}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
            isSelected
              ? "bg-red-600 border-red-600 text-white shadow-xs"
              : "bg-transparent border-slate-600 hover:border-red-500"
          }`}
        >
          {isSelected && <Check size={14} strokeWidth={3} />}
        </button>

        {/* Miniatura compacta en w-11 h-11 rounded-xl bg-white p-0.5 object-contain shrink-0 border border-slate-200/10 */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail({
              ...exercise,
              muscleGroup: muscleGroupLabel,
              subgroup: subgroupLabel,
              mediaUrl,
            });
          }}
          className="shrink-0"
        >
          <ImageWithFallback
            src={mediaUrl}
            slug={exercise?.slug}
            alt={displayName}
            muscleGroup={subgroupLabel || muscleGroupLabel}
            exerciseName={exercise?.name || ""}
            variant="thumbnail"
            className="w-11 h-11 rounded-xl bg-white p-0.5 object-contain shrink-0 border border-slate-200/10 overflow-hidden"
          />
        </div>

        {/* Área central: Nombre directo y limpio en bold blanca + Grupo muscular y Subgrupo */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail({
              ...exercise,
              muscleGroup: muscleGroupLabel,
              subgroup: subgroupLabel,
              mediaUrl,
            });
          }}
          className="min-w-0 flex-1"
        >
          <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
            {displayName}
          </h4>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-900/30">
              {muscleGroupLabel}
            </span>
            {subgroupLabel &&
              subgroupLabel.toLowerCase() !== muscleGroupLabel.toLowerCase() && (
                <span className="text-[11px] text-slate-400 font-medium truncate">
                  {subgroupLabel}
                </span>
              )}
          </div>
        </div>
      </div>

      {/* Lado derecho: Flecha chevron > hacia Detalles de ejercicios */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetail({
            ...exercise,
            muscleGroup: muscleGroupLabel,
            subgroup: subgroupLabel,
            mediaUrl,
          });
        }}
        className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition shrink-0 cursor-pointer"
        title="Ver detalles del ejercicio"
        aria-label={`Ver detalles de ${displayName}`}
      >
        <ChevronRight size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export const ExerciseItem = ExerciseRow;

/**
 * ExerciseList - Vista completa del Catálogo de Ejercicios con buscador,
 * barra superior de los 4 grupos principales (Todos, Pecho, Espalda, Brazos, Piernas),
 * sub-filtro opcional por subgrupo anatómico y vínculo a ExerciseDetailView.
 */
export function ExerciseList({
  title = "Agregar",
  initialMuscleId = null,
  allExercises = [],
  muscleGroups = [],
  recordsMap = {},
  onBack,
  onSelect,
  onSelectMultiple,
  onExerciseCreated,
  isStandalonePage = false,
}) {
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState(
    initialMuscleId || "all"
  );
  const [selectedSubgroup, setSelectedSubgroup] = useState("all");
  const [isMuscleSheetOpen, setIsMuscleSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [detailExercise, setDetailExercise] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [localCreated, setLocalCreated] = useState([]);
  const [frequentApiList, setFrequentApiList] = useState([]);

  useEffect(() => {
    setSelectedMuscleFilter(initialMuscleId || "all");
    setSelectedSubgroup("all");
  }, [initialMuscleId]);

  useEffect(() => {
    getFrequentExercises(60, 12)
      .then((list) => {
        if (Array.isArray(list)) setFrequentApiList(list);
      })
      .catch(() => {});
  }, []);

  const muscleGroupsMap = useMemo(() => {
    const map = {};
    (muscleGroups || []).forEach((g) => {
      if (g?.id) map[g.id] = g.name;
    });
    return map;
  }, [muscleGroups]);

  const combinedExercises = useMemo(() => {
    const base = Array.isArray(allExercises) ? allExercises : [];
    const merged = [...localCreated, ...base];
    const seen = new Set();
    return merged.filter((ex) => {
      if (!ex || !ex.id || seen.has(ex.id)) return false;
      seen.add(ex.id);
      return true;
    });
  }, [allExercises, localCreated]);

  // Normaliza el filtro principal a "all" | "Pecho" | "Espalda" | "Brazos" | "Piernas" o clave anatómica
  const activeMainMuscleGroup = useMemo(() => {
    if (!selectedMuscleFilter || selectedMuscleFilter === "all") return "all";
    if (
      typeof selectedMuscleFilter === "number" ||
      !isNaN(Number(selectedMuscleFilter))
    ) {
      const gName = muscleGroupsMap[Number(selectedMuscleFilter)] || "";
      const lower = gName.toLowerCase();
      if (lower.includes("pecho")) return "Pecho";
      if (lower.includes("espalda")) return "Espalda";
      if (
        lower.includes("brazo") ||
        lower.includes("hombro") ||
        lower.includes("bicep") ||
        lower.includes("bícep") ||
        lower.includes("tricep") ||
        lower.includes("trícep")
      ) {
        return "Brazos";
      }
      if (lower.includes("pierna")) return "Piernas";
      return gName || "all";
    }
    const s = String(selectedMuscleFilter).trim().toLowerCase();
    if (s === "pecho") return "Pecho";
    if (s === "espalda") return "Espalda";
    if (s === "brazos" || s === "brazo") return "Brazos";
    if (s === "piernas" || s === "pierna") return "Piernas";
    return selectedMuscleFilter;
  }, [selectedMuscleFilter, muscleGroupsMap]);

  // Subgrupos disponibles para el grupo muscular principal activo
  const availableSubgroups = useMemo(() => {
    if (activeMainMuscleGroup === "all") return [];
    const subs = new Set();
    combinedExercises.forEach((ex) => {
      const mGroup = formatMuscleGroupDisplay(ex, muscleGroupsMap);
      if (
        mGroup.toLowerCase() === String(activeMainMuscleGroup).toLowerCase()
      ) {
        const sub = getExerciseSubgroup(ex);
        if (sub) subs.add(sub);
      }
    });
    return Array.from(subs);
  }, [combinedExercises, activeMainMuscleGroup, muscleGroupsMap]);

  // Filtrado exclusivamente por Grupo Muscular Principal, Subgrupo anatómico y Búsqueda por texto
  const filteredExercises = useMemo(() => {
    return combinedExercises.filter((ex) => {
      if (!ex || !ex.name) return false;

      const exMainGroup = formatMuscleGroupDisplay(ex, muscleGroupsMap);
      const exSubgroup = getExerciseSubgroup(ex);

      // 1. Filtro muscular principal o anatómico
      if (selectedMuscleFilter !== null && selectedMuscleFilter !== "all") {
        const mainTabsLower = ["pecho", "espalda", "brazos", "piernas"];
        const activeLower = String(activeMainMuscleGroup).toLowerCase();

        if (mainTabsLower.includes(activeLower)) {
          if (exMainGroup.toLowerCase() !== activeLower) {
            return false;
          }
        } else {
          // Filtro anatómico desde MuscleFilterSheet (ej. hombro, biceps, triceps, cuadriceps, isquios, gluteos)
          const selKey = String(selectedMuscleFilter).toLowerCase();
          const exAnat = resolveAnatomyKey(
            exSubgroup || exMainGroup,
            ex.name
          );
          const subLower = exSubgroup.toLowerCase();
          const matchesSub =
            subLower.includes(selKey) ||
            exAnat === selKey ||
            (selKey === "isquios" && subLower.includes("isquio")) ||
            (selKey === "gluteos" && subLower.includes("glúteo")) ||
            (selKey === "cuadriceps" && subLower.includes("cuádriceps")) ||
            (selKey === "biceps" && subLower.includes("bíceps")) ||
            (selKey === "triceps" && subLower.includes("tríceps")) ||
            (selKey === "hombros" && subLower.includes("hombro"));
          if (!matchesSub) {
            return false;
          }
        }
      }

      // 2. Sub-filtro opcional por Subgrupo anatómico
      if (selectedSubgroup && selectedSubgroup !== "all") {
        if (exSubgroup.toLowerCase() !== selectedSubgroup.toLowerCase()) {
          return false;
        }
      }

      // 3. Búsqueda por texto (nombre, grupo muscular o subgrupo)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ex.name.toLowerCase().includes(q);
        const matchesMuscle = exMainGroup.toLowerCase().includes(q);
        const matchesSubgroup = exSubgroup.toLowerCase().includes(q);
        return matchesName || matchesMuscle || matchesSubgroup;
      }

      return true;
    });
  }, [
    combinedExercises,
    selectedMuscleFilter,
    activeMainMuscleGroup,
    selectedSubgroup,
    searchQuery,
    muscleGroupsMap,
  ]);

  // Ejercicios recomendados (frecuentes o destacados del filtro actual)
  const recommendedExercises = useMemo(() => {
    const freqIds = new Set((frequentApiList || []).map((f) => f.id));
    const fromUsage = filteredExercises.filter(
      (ex) =>
        freqIds.has(ex.id) ||
        (ex.usage_count_60d && ex.usage_count_60d > 0) ||
        Boolean(recordsMap && recordsMap[ex.id])
    );
    if (fromUsage.length > 0) {
      return fromUsage.slice(0, 5);
    }
    return filteredExercises.slice(0, 4);
  }, [filteredExercises, frequentApiList, recordsMap]);

  const toggleExerciseSelection = (exercise) => {
    if (!exercise?.id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(exercise.id)) {
        next.delete(exercise.id);
      } else {
        next.add(exercise.id);
      }
      return next;
    });
  };

  const selectedExercisesList = useMemo(
    () => combinedExercises.filter((ex) => selectedIds.has(ex.id)),
    [combinedExercises, selectedIds]
  );

  const handleConfirmAdd = () => {
    if (selectedExercisesList.length === 0) return;
    if (onSelectMultiple) {
      onSelectMultiple(selectedExercisesList);
    } else if (onSelect) {
      selectedExercisesList.forEach((ex) => onSelect(ex));
    }
    setSelectedIds(new Set());
  };

  // Si el usuario hizo clic en un ejercicio para ver sus detalles, renderizar ExerciseDetailView
  if (detailExercise) {
    return (
      <ExerciseDetailView
        exercise={detailExercise}
        onBack={() => setDetailExercise(null)}
        onExerciseUpdated={(updated) => {
          setDetailExercise(updated);
          setLocalCreated((prev) =>
            prev.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item
            )
          );
        }}
        isModal={!isStandalonePage}
      />
    );
  }

  return (
    <div
      className={`w-full flex flex-col bg-[#F8FAFC] dark:bg-[#05070B] text-slate-900 dark:text-white select-none relative ${
        isStandalonePage
          ? "min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom))]"
          : "h-full overflow-hidden"
      }`}
    >
      {/* 1. Encabezado y Acciones Rápidas */}
      <header className="flex items-center justify-between px-4 pt-3.5 pb-2.5 bg-[#F8FAFC] dark:bg-[#05070B] flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#161B26] transition active:scale-95 cursor-pointer"
          title="Volver"
          aria-label="Volver"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>

        <h2 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
          {title}
        </h2>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-slate-100 dark:bg-[#161B26] text-slate-800 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 font-semibold px-4 py-1.5 rounded-full text-sm transition active:scale-95 cursor-pointer"
        >
          Crear
        </button>
      </header>

      {/* Controles Superiores: Buscador por nombre + Selector directo de Grupos Musculares (Todos, Pecho, Espalda, Brazos, Piernas) */}
      <div className="px-4 pb-3 space-y-2.5 flex-shrink-0">
        {/* Control 1: Buscador por nombre (input con icono de lupa) */}
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ejercicios o subgrupo muscular..."
            className="w-full rounded-2xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/[0.07] pl-11 pr-9 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-red-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Control 2: Barra superior con los 4 grupos principales: Todos, Pecho, Espalda, Brazos, Piernas */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {MAIN_MUSCLE_TABS.map((tab) => {
            const isActive =
              (tab.id === "all" && activeMainMuscleGroup === "all") ||
              String(activeMainMuscleGroup).toLowerCase() ===
                tab.id.toLowerCase();
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedMuscleFilter(tab.id);
                  setSelectedSubgroup("all");
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                    : "bg-slate-100 dark:bg-[#0E131F] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.07] hover:border-red-500/40"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sub-filtro opcional por Subgrupo Anatómico cuando hay un grupo principal seleccionado */}
        {availableSubgroups.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <button
              type="button"
              onClick={() => setSelectedSubgroup("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedSubgroup === "all"
                  ? "bg-red-950/50 text-red-400 border border-red-800/50 font-bold"
                  : "bg-slate-100/70 dark:bg-[#161B26] text-slate-500 dark:text-slate-400 border border-transparent hover:text-white"
              }`}
            >
              Todos ({activeMainMuscleGroup})
            </button>
            {availableSubgroups.map((sub) => {
              const isSubActive =
                selectedSubgroup.toLowerCase() === sub.toLowerCase();
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() =>
                    setSelectedSubgroup(isSubActive ? "all" : sub)
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                    isSubActive
                      ? "bg-red-950/50 text-red-400 border border-red-800/50 font-bold"
                      : "bg-slate-100/70 dark:bg-[#161B26] text-slate-500 dark:text-slate-400 border border-transparent hover:text-white"
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Listado de Ejercicios Scrolleable */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-28 space-y-5 custom-scrollbar">
        {/* Sección 1: Ejercicios recomendados */}
        {recommendedExercises.length > 0 &&
          !searchQuery.trim() &&
          selectedSubgroup === "all" && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-1 h-4 bg-red-600 rounded-full inline-block mr-2" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Ejercicios recomendados
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {recommendedExercises.length} sugeridos
                </span>
              </div>

              <div className="space-y-2">
                {recommendedExercises.map((ex) => (
                  <ExerciseRow
                    key={`rec-${ex.id}`}
                    exercise={ex}
                    muscleGroupLabel={formatMuscleGroupDisplay(
                      ex,
                      muscleGroupsMap
                    )}
                    isSelected={selectedIds.has(ex.id)}
                    onToggleSelect={toggleExerciseSelection}
                    onOpenDetail={(item) => setDetailExercise(item)}
                  />
                ))}
              </div>
            </section>
          )}

        {/* Sección 2: Todos los ejercicios */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-1 h-4 bg-red-600 rounded-full inline-block mr-2" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                Todos los ejercicios
              </h3>
              <span className="ml-2 text-xs font-bold text-red-600 dark:text-red-400">
                ({filteredExercises.length})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsMuscleSheetOpen(true)}
              className="w-8 h-8 rounded-xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/[0.07] text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition cursor-pointer"
              title="Filtrar por grupo muscular"
              aria-label="Filtrar por grupo muscular"
            >
              <Filter size={15} />
            </button>
          </div>

          {filteredExercises.length > 0 ? (
            <div className="space-y-2">
              {filteredExercises.map((ex) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  muscleGroupLabel={formatMuscleGroupDisplay(
                    ex,
                    muscleGroupsMap
                  )}
                  isSelected={selectedIds.has(ex.id)}
                  onToggleSelect={toggleExerciseSelection}
                  onOpenDetail={(item) => setDetailExercise(item)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl p-8 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] text-center space-y-3">
              <Dumbbell size={32} className="mx-auto text-slate-400" />
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                No se encontraron ejercicios con los filtros seleccionados.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-full text-xs transition cursor-pointer"
              >
                Crear nuevo ejercicio
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Barra inferior fija flotante: Botón tipo píldora "Agregar X ejercicios" */}
      <div className="fixed sm:absolute bottom-0 inset-x-0 z-30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent dark:from-[#05070B] dark:via-[#05070B]/95 pointer-events-none max-w-md mx-auto">
        <button
          type="button"
          disabled={selectedIds.size === 0}
          onClick={handleConfirmAdd}
          className={`pointer-events-auto bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-full w-full shadow-lg shadow-red-600/25 transition-all active:scale-[0.99] cursor-pointer text-sm ${
            selectedIds.size === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {selectedIds.size === 1
            ? "Agregar 1 ejercicio"
            : `Agregar ${selectedIds.size} ejercicios`}
        </button>
      </div>

      {/* 3. Modal BottomSheet de Filtro Muscular */}
      <MuscleFilterSheet
        isOpen={isMuscleSheetOpen}
        onClose={() => setIsMuscleSheetOpen(false)}
        muscleGroups={muscleGroups}
        selectedMuscleFilter={selectedMuscleFilter}
        onApplyFilter={(val) => {
          setSelectedMuscleFilter(val || "all");
          setSelectedSubgroup("all");
        }}
      />

      {/* Modal para Crear Nuevo Ejercicio */}
      <CreateExerciseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onExerciseCreated={(newEx) => {
          setLocalCreated((prev) => [newEx, ...prev]);
          if (onExerciseCreated) {
            onExerciseCreated(newEx);
          }
          if (newEx?.id) {
            setSelectedIds((prev) => new Set([...prev, newEx.id]));
          }
        }}
        muscleGroups={muscleGroups}
        initialMuscleId={
          typeof selectedMuscleFilter === "number" ? selectedMuscleFilter : null
        }
      />
    </div>
  );
}

/**
 * ExerciseCatalogModal - Modal de pantalla completa / sheet para seleccionar ejercicios
 */
export default function ExerciseCatalogModal({
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
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md h-[94dvh] sm:h-[88dvh] rounded-t-3xl sm:rounded-3xl border border-slate-100 dark:border-white/[0.07] bg-[#F8FAFC] dark:bg-[#05070B] overflow-hidden shadow-2xl flex flex-col relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <ExerciseList
          title={title}
          initialMuscleId={initialMuscleId}
          allExercises={allExercises}
          muscleGroups={muscleGroups}
          recordsMap={recordsMap}
          onBack={onClose}
          onSelect={(ex) => {
            if (onSelect) onSelect(ex);
            onClose();
          }}
          onSelectMultiple={(exList) => {
            if (onSelectMultiple) {
              onSelectMultiple(exList);
            } else if (onSelect) {
              exList.forEach((ex) => onSelect(ex));
            }
            onClose();
          }}
          onExerciseCreated={onExerciseCreated}
          isStandalonePage={false}
        />
      </div>
    </div>
  );
}
