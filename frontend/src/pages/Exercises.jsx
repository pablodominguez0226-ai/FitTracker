import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Dumbbell,
  Flame,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  Camera,
} from "lucide-react";
import {
  createExercise,
  createMuscleGroup,
  deleteExercise,
  deleteMuscleGroup,
  getExercises,
  getMuscleGroups,
  updateMuscleGroup,
} from "../api/client";
import Header from "../components/Header";
import ExerciseMediaModal from "../components/ExerciseMediaModal";
import { isOnline } from "../services/exerciseCache";


export default function Exercises() {
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("exercises"); // 'exercises' | 'groups'

  // New exercise form
  const [newExName, setNewExName] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");

  // New muscle group form
  const [newGroupName, setNewGroupName] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  // Edit muscle group state
  const [editingGroup, setEditingGroup] = useState(null); // { id, name }
  const [editingGroupName, setEditingGroupName] = useState("");

  // Delete confirmation modal state
  const [deletingGroup, setDeletingGroup] = useState(null); // { id, name, exercise_count }
  const [isDeleting, setIsDeleting] = useState(false);

  // Exercise Media & Diagram Modal state
  const [selectedMediaExercise, setSelectedMediaExercise] = useState(null);


  const loadData = async () => {
    try {
      setLoading(true);
      const [groups, exList] = await Promise.all([
        getMuscleGroups(),
        getExercises(),
      ]);
      const safeGroups = Array.isArray(groups) ? groups : [];
      const safeExList = Array.isArray(exList) ? exList : [];
      setMuscleGroups(safeGroups);
      setExercises(safeExList);
      if (safeGroups.length > 0 && !targetGroupId && safeGroups[0]?.id) {
        setTargetGroupId(String(safeGroups[0].id));
      }
    } catch (err) {
      console.error("Error cargando ejercicios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredExercises = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return (exercises || []).filter((ex) => {
      if (!ex) return false;
      const matchSearch = (ex?.name || "").toLowerCase().includes(q);
      const matchGroup =
        selectedGroupId === "all" || String(ex.muscle_group_id) === String(selectedGroupId);
      return matchSearch && matchGroup;
    });
  }, [exercises, search, selectedGroupId]);

  const handleCreateExercise = async (e) => {
    e.preventDefault();
    const name = newExName.trim();
    if (!name || !targetGroupId) return;

    try {
      const created = await createExercise(name, Number(targetGroupId));
      setExercises((prev) => {
        const filtered = (prev || []).filter((e) => e.id !== created.id);
        return [...filtered, created];
      });
      setNewExName("");
      const groups = await getMuscleGroups();
      setMuscleGroups(groups);
    } catch (err) {
      console.error(err);
      alert("No se pudo crear el ejercicio.");
    }
  };

  const handleDeleteExercise = async (id, name) => {
    if (!window.confirm(`¿Seguro que querés eliminar el ejercicio "${name}"?`)) {
      return;
    }
    try {
      await deleteExercise(id);
      setExercises((prev) => prev.filter((e) => e.id !== id));
      const groups = await getMuscleGroups();
      setMuscleGroups(groups);
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el ejercicio.");
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;

    try {
      const created = await createMuscleGroup(name);
      setMuscleGroups((prev) => [...prev, created]);
      setNewGroupName("");
      setIsAddingGroup(false);
      setTargetGroupId(String(created.id));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "No se pudo crear el grupo muscular.");
    }
  };

  const handleStartEditGroup = (group) => {
    setEditingGroup(group);
    setEditingGroupName(group?.name || "");
  };

  const handleSaveEditGroup = async (e) => {
    e.preventDefault();
    if (!editingGroup || !editingGroupName.trim()) return;

    try {
      const updated = await updateMuscleGroup(editingGroup.id, editingGroupName.trim());
      setMuscleGroups((prev) =>
        prev.map((g) => (g.id === updated.id ? { ...g, name: updated.name } : g))
      );
      // Also update exercise names locally
      setExercises((prev) =>
        prev.map((ex) =>
          ex.muscle_group_id === updated.id
            ? { ...ex, muscle_group_name: updated.name }
            : ex
        )
      );
      setEditingGroup(null);
      setEditingGroupName("");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al actualizar el grupo muscular.");
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (!deletingGroup) return;
    try {
      setIsDeleting(true);
      await deleteMuscleGroup(deletingGroup.id, true);
      setMuscleGroups((prev) => prev.filter((g) => g.id !== deletingGroup.id));
      setExercises((prev) => prev.filter((ex) => ex.muscle_group_id !== deletingGroup.id));
      if (selectedGroupId === String(deletingGroup.id)) {
        setSelectedGroupId("all");
      }
      setDeletingGroup(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail?.message || "Error al eliminar el grupo muscular.");
    } finally {
      setIsDeleting(false);
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[#FF5722]">
        <Loader2 size={34} className="animate-spin" />
        <p className="text-sm font-semibold text-[#A1A1AA]">Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md sm:max-w-4xl mx-auto space-y-5 pb-24 px-1 sm:px-0">
      <Header
        title="Músculos / Ejercicios"
        subtitle="Administrá tu repertorio de ejercicios y grupos musculares"
      />

      {/* View Switcher: Ejercicios vs Grupos Musculares */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#1C1C1E] p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("exercises")}
          className={`flex-1 min-h-[42px] rounded-xl text-xs font-semibold transition active:scale-95 ${
            activeTab === "exercises"
              ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
              : "text-[#8E8E93] hover:text-white"
          }`}
        >
          Ejercicios ({exercises.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("groups")}
          className={`flex-1 min-h-[42px] rounded-xl text-xs font-semibold transition active:scale-95 ${
            activeTab === "groups"
              ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
              : "text-[#8E8E93] hover:text-white"
          }`}
        >
          Grupos Musculares ({muscleGroups.length})
        </button>
      </div>

      {activeTab === "exercises" ? (
        <>
          {/* Catálogo Oficial Banner */}
          <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF5722]">
                ★ Catálogo de Ejercicios
              </h3>
              <p className="mt-0.5 text-xs text-[#8E8E93]">
                Catálogo biomecánico completo para hipertrofia y fuerza.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isOnline() && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30">
                  <span>📶</span>
                  <span>Modo sin conexión (Catálogo local activo)</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold text-[#34D399] bg-[#34D399]/10 px-3 py-1.5 rounded-xl border border-[#34D399]/20">
                <Sparkles size={14} />
                <span>{exercises.length} Ejercicios</span>
              </div>
            </div>
          </div>

          {/* 2. Filters & Search */}
          <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-4 space-y-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center justify-between">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]"
                  size={18}
                />
                <input
                  type="search"
                  inputMode="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="iron-input pl-10 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("groups");
                  setIsAddingGroup(true);
                }}
                className="iron-btn-secondary min-h-[44px] py-2 text-xs self-end sm:self-auto"
              >
                <Plus size={15} />
                <span>+ Gestionar Grupos</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedGroupId("all")}
                className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  selectedGroupId === "all"
                    ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                    : "border border-white/5 bg-[#121212] text-[#8E8E93] hover:border-white/20 hover:text-white"
                }`}
              >
                Todos ({exercises.length})
              </button>
              {muscleGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupId(String(g.id))}
                  className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                    selectedGroupId === String(g.id)
                      ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                      : "border border-white/5 bg-[#121212] text-[#8E8E93] hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="truncate break-words max-w-[120px] inline-block">{g?.name || "Músculo"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Exercises List */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {filteredExercises.map((ex) => (
              <div
                key={ex?.id || Math.random()}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#1C1C1E] p-4 hover:border-white/10 hover:bg-[#252528] transition"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-white truncate break-words">
                    {ex?.name || "Ejercicio"}
                  </h4>
                  <span className="mt-0.5 inline-block text-[11px] font-medium text-[#FF5722] truncate break-words">
                    {ex?.muscle_group_name || "Músculo"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedMediaExercise(ex)}
                    title="Ver biomecánica & imagen / gif"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8E8E93] hover:text-[#FF5722] active:scale-90 transition flex-shrink-0"
                  >
                    <Camera size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteExercise(ex?.id, ex?.name || "Ejercicio")}
                    title="Eliminar ejercicio"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8E8E93] hover:text-red-400 active:scale-90 transition flex-shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

              </div>
            ))}

            {filteredExercises.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-[#1C1C1E]/60 p-8 text-center sm:p-12">
                <Layers size={36} className="mx-auto text-[#8E8E93]" />
                <h3 className="mt-3 text-base font-semibold text-white">
                  No hay ejercicios con este filtro
                </h3>
                <p className="mt-1 text-xs text-[#8E8E93]">
                  Creá tus propios ejercicios utilizando el formulario superior.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* GRUPOS MUSCULARES VIEW */
        <div className="space-y-4">
          {/* Top Add Group Card */}
          <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Grupos Musculares
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Editá sus nombres o eliminá grupos con confirmación segura.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingGroup(!isAddingGroup)}
                className="iron-btn-primary min-h-[40px] px-3.5 text-xs"
              >
                <Plus size={16} />
                <span>+ Nuevo Grupo</span>
              </button>
            </div>

            {isAddingGroup && (
              <form
                onSubmit={handleCreateGroup}
                className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-[#121212] p-3"
              >
                <input
                  type="text"
                  placeholder="Nombre del grupo (ej: Glúteos, Trapecios)..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  className="min-h-[44px] flex-1 rounded-xl border border-white/5 bg-[#1C1C1E] px-3.5 py-2 text-sm text-white outline-none focus:border-[#FF5722]"
                />
                <button type="submit" className="iron-btn-primary min-h-[44px] px-4 text-xs font-semibold">
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingGroup(false)}
                  className="iron-btn-ghost min-h-[44px] px-2.5 text-xs"
                >
                  Cancelar
                </button>
              </form>
            )}
          </div>

          {/* Muscle Groups Cards Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {muscleGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#1C1C1E] p-4 hover:border-white/10 hover:bg-[#252528] transition"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-semibold text-white truncate break-words">
                    {group?.name || "Músculo"}
                  </h4>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8E8E93]">
                    <span className="rounded-md border border-white/5 bg-[#121212] px-2 py-0.5 text-[11px] font-semibold text-[#FF5722]">
                      {group.exercise_count || 0} {group.exercise_count === 1 ? "ejercicio" : "ejercicios"}
                    </span>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEditGroup(group)}
                    title="Editar nombre del grupo muscular"
                    className="h-10 w-10 rounded-xl border border-white/5 bg-[#121212] flex items-center justify-center text-[#8E8E93] hover:border-white/20 hover:text-white active:scale-95 transition"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingGroup(group)}
                    title="Eliminar grupo muscular"
                    className="h-10 w-10 rounded-xl border border-white/5 bg-[#121212] flex items-center justify-center text-[#8E8E93] hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 active:scale-95 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Muscle Group Modal */}
      {editingGroup && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#1C1C1E] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Pencil size={18} className="text-[#FF5722]" />
                <span>Editar Grupo Muscular</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="text-[#8E8E93] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditGroup} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#8E8E93] block mb-1.5">
                  Nombre del grupo muscular
                </label>
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  autoFocus
                  className="iron-input w-full text-sm font-semibold"
                  placeholder="Nuevo nombre..."
                />
                <p className="mt-1 text-[11px] text-[#8E8E93]">
                  Los ejercicios y registros vinculados a este grupo se mantendrán intactos.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="iron-btn-ghost min-h-[44px] px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!editingGroupName.trim()}
                  className="iron-btn-primary min-h-[44px] px-5 text-xs font-semibold"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Muscle Group Confirmation Modal */}
      {deletingGroup && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-red-500/30 bg-[#1C1C1E] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="h-10 w-10 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  ¿Eliminar grupo muscular?
                </h3>
                <span className="text-xs text-red-300 font-medium truncate break-words block">
                  "{deletingGroup?.name || "este grupo"}"
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#121212] p-3 text-xs text-[#8E8E93] space-y-1.5">
              <p>
                Este grupo contiene{" "}
                <strong className="text-white font-semibold">
                  {deletingGroup.exercise_count || 0} ejercicios
                </strong>
                .
              </p>
              <p className="text-[11px] text-[#8E8E93]">
                Al confirmar, se eliminarán el grupo y sus ejercicios asociados de tu catálogo. El historial de entrenamientos pasados se mantendrá seguro e intacto.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingGroup(null)}
                disabled={isDeleting}
                className="iron-btn-ghost min-h-[44px] px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGroup}
                disabled={isDeleting}
                className="min-h-[44px] px-5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 active:scale-95 transition"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Sí, eliminar grupo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Media & Diagram Modal */}
      <ExerciseMediaModal
        isOpen={Boolean(selectedMediaExercise)}
        onClose={() => setSelectedMediaExercise(null)}
        exercise={selectedMediaExercise}
        onExerciseUpdated={(updated) => {
          setExercises((prev) =>
            prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
          );
          setSelectedMediaExercise(updated);
        }}
      />
    </div>
  );
}

