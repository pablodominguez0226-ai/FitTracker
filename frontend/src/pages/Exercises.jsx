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

  const loadData = async () => {
    try {
      setLoading(true);
      const [groups, exList] = await Promise.all([
        getMuscleGroups(),
        getExercises(),
      ]);
      setMuscleGroups(groups);
      setExercises(exList);
      if (groups.length > 0 && !targetGroupId) {
        setTargetGroupId(String(groups[0].id));
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

  const handleCreateExercise = async (e) => {
    e.preventDefault();
    const name = newExName.trim();
    if (!name || !targetGroupId) return;

    try {
      const created = await createExercise(name, Number(targetGroupId));
      setExercises((prev) => [...prev, created]);
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
    setEditingGroupName(group.name);
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

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchSearch = ex.name.toLowerCase().includes(q);
      const matchGroup =
        selectedGroupId === "all" || String(ex.muscle_group_id) === String(selectedGroupId);
      return matchSearch && matchGroup;
    });
  }, [exercises, search, selectedGroupId]);

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
      <div className="flex items-center gap-2 rounded-2xl border border-[#2A1B14] bg-[#181210] p-1.5 shadow-card">
        <button
          type="button"
          onClick={() => setActiveTab("exercises")}
          className={`flex-1 min-h-[42px] rounded-xl text-xs font-black transition active:scale-95 ${
            activeTab === "exercises"
              ? "bg-gradient-to-r from-[#C84218] to-[#7E22CE] text-white shadow-neon"
              : "text-[#A1A1AA] hover:text-white"
          }`}
        >
          Ejercicios ({exercises.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("groups")}
          className={`flex-1 min-h-[42px] rounded-xl text-xs font-black transition active:scale-95 ${
            activeTab === "groups"
              ? "bg-gradient-to-r from-[#C84218] to-[#7E22CE] text-white shadow-neon"
              : "text-[#A1A1AA] hover:text-white"
          }`}
        >
          Grupos Musculares ({muscleGroups.length})
        </button>
      </div>

      {activeTab === "exercises" ? (
        <>
          {/* Catálogo Oficial Banner */}
          <div className="rounded-2xl border border-[#2A1B14] bg-[#181210] p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6D00]">
                ★ Catálogo Oficial de Gimnasio
              </h3>
              <p className="mt-0.5 text-xs text-[#A1A1AA]">
                80 ejercicios oficiales estructurados por grupo muscular (20 en Pecho y Pierna, 10 en los demás).
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-black text-[#34D399] bg-[#34D399]/10 px-3 py-1.5 rounded-xl border border-[#34D399]/30">
              <Sparkles size={14} />
              <span>{exercises.length} Ejercicios Oficiales</span>
            </div>
          </div>

          {/* 2. Filters & Search */}
          <div className="rounded-2xl border border-[#2A1B14] bg-[#181210] p-4 shadow-card space-y-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center justify-between">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]"
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
                className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                  selectedGroupId === "all"
                    ? "bg-gradient-to-r from-[#C84218] to-[#7E22CE] text-white shadow-neon"
                    : "border border-[#2A1B14] bg-[#121113] text-[#A1A1AA] hover:border-[#FF5722]/40 hover:text-white"
                }`}
              >
                Todos ({exercises.length})
              </button>
              {muscleGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupId(String(g.id))}
                  className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                    selectedGroupId === String(g.id)
                      ? "bg-gradient-to-r from-[#C84218] to-[#7E22CE] text-white shadow-neon"
                      : "border border-[#2A1B14] bg-[#121113] text-[#A1A1AA] hover:border-[#FF5722]/40 hover:text-white"
                  }`}
                >
                  <span className="truncate break-words max-w-[120px] inline-block">{g.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Exercises List */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {filteredExercises.map((ex) => (
              <div
                key={ex.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#2A1B14] bg-[#181210] p-4 shadow-card hover:border-[#FF5722]/40 hover:bg-[#2A1B14] transition"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-white truncate break-words">
                    {ex.name}
                  </h4>
                  <span className="mt-0.5 inline-block text-[11px] font-bold text-[#FF6D00] truncate break-words">
                    {ex.muscle_group_name || "Músculo"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteExercise(ex.id, ex.name)}
                  title="Eliminar ejercicio"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#71717A] hover:text-red-400 active:scale-90 transition flex-shrink-0"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            {filteredExercises.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-[#2A1B14] bg-[#181210]/60 p-8 text-center sm:p-12">
                <Layers size={36} className="mx-auto text-[#71717A]" />
                <h3 className="mt-3 text-base font-bold text-white">
                  No hay ejercicios con este filtro
                </h3>
                <p className="mt-1 text-xs text-[#A1A1AA]">
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
          <div className="rounded-2xl border border-[#2A1B14] bg-[#181210] p-4 shadow-card sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-black text-white">
                  Grupos Musculares
                </h3>
                <p className="text-xs text-[#A1A1AA]">
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
                className="mt-3 flex items-center gap-2 rounded-xl border border-[#FF5722]/50 bg-[#121113] p-3 shadow-neon"
              >
                <input
                  type="text"
                  placeholder="Nombre del grupo (ej: Glúteos, Trapecios)..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  className="min-h-[44px] flex-1 rounded-xl border border-[#2A1B14] bg-[#181210] px-3.5 py-2 text-sm text-white outline-none focus:border-[#FF5722]"
                />
                <button type="submit" className="iron-btn-primary min-h-[44px] px-4 text-xs font-bold">
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
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#2A1B14] bg-[#181210] p-4 shadow-card hover:border-[#FF5722]/40 hover:bg-[#2A1B14] transition"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-black text-white truncate break-words">
                    {group.name}
                  </h4>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                    <span className="rounded-md border border-[#2A1B14] bg-[#121113] px-2 py-0.5 text-[11px] font-bold text-[#FF6D00]">
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
                    className="h-10 w-10 rounded-xl border border-[#2A1B14] bg-[#121113] flex items-center justify-center text-[#A1A1AA] hover:border-[#FF5722] hover:text-[#FF6D00] active:scale-95 transition"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingGroup(group)}
                    title="Eliminar grupo muscular"
                    className="h-10 w-10 rounded-xl border border-[#2A1B14] bg-[#121113] flex items-center justify-center text-[#71717A] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 active:scale-95 transition"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#FF5722]/50 bg-[#181210] p-5 shadow-neon space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#2A1B14] pb-3">
              <div className="flex items-center gap-2 text-white font-black">
                <Pencil size={18} className="text-[#FF5722]" />
                <span>Editar Grupo Muscular</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="text-[#71717A] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditGroup} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#A1A1AA] block mb-1.5">
                  Nombre del grupo muscular
                </label>
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  autoFocus
                  className="iron-input w-full text-sm font-bold"
                  placeholder="Nuevo nombre..."
                />
                <p className="mt-1 text-[11px] text-[#71717A]">
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
                  className="iron-btn-primary min-h-[44px] px-5 text-xs font-bold"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/85 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-red-500/50 bg-[#181210] p-5 shadow-[0_0_30px_rgba(239,68,68,0.25)] space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-red-400">
              <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  ¿Eliminar grupo muscular?
                </h3>
                <span className="text-xs text-red-300 font-bold truncate break-words block">
                  "{deletingGroup.name}"
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#2A1B14] bg-[#121113] p-3 text-xs text-[#A1A1AA] space-y-1.5">
              <p>
                Este grupo contiene{" "}
                <strong className="text-white">
                  {deletingGroup.exercise_count || 0} ejercicios
                </strong>
                .
              </p>
              <p className="text-[11px] text-[#71717A]">
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
                className="min-h-[44px] px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-2 active:scale-95 transition shadow-lg shadow-red-600/30"
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
    </div>
  );
}
