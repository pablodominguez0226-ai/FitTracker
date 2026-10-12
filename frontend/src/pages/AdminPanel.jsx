import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Database,
  Dumbbell,
  Edit2,
  Flame,
  HelpCircle,
  KeyRound,
  Layers,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  approveAdminWorkoutSet,
  createAdminExercise,
  deleteAdminExercise,
  deleteAdminUser,
  deleteAdminWorkoutSet,
  getAdminFlaggedWorkouts,
  getAdminStats,
  getAdminSupportRequests,
  getAdminUsers,
  getExercises,
  getMuscleGroups,
  invalidateAdminWorkoutSet,
  resetAdminUserPassword,
  updateAdminSupportRequest,
  updateAdminUser,
} from "../api/client";
import { showToast } from "../components/Toast";

export default function AdminPanel({ currentUser }) {
  const [activeTab, setActiveTab] = useState("users"); // 'users' | 'exercises' | 'stats' | 'support' | 'moderation'
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Tab 1: Users state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all"); // 'all' | 'active' | 'admins'
  const [quickPasswordUserId, setQuickPasswordUserId] = useState(null);
  const [quickPasswordVal, setQuickPasswordVal] = useState("");
  const [quickPasswordLoading, setQuickPasswordLoading] = useState(false);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);

  // Delete user modal state
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  // Tab 2: Exercises state
  const [exercises, setExercises] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState("all");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscleId, setNewExerciseMuscleId] = useState("");
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [deletingExerciseId, setDeletingExerciseId] = useState(null);

  // Tab 3: Server Stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Tab 4: Support Requests state
  const [supportRequests, setSupportRequests] = useState([]);
  const [supportFilter, setSupportFilter] = useState("all");
  const [targetSupportReq, setTargetSupportReq] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);

  // Tab 5: Moderation & Anti-Cheat state
  const [flaggedWorkouts, setFlaggedWorkouts] = useState([]);
  const [flaggedLoading, setFlaggedLoading] = useState(false);
  const [moderationActionLoading, setModerationActionLoading] = useState(null);

  const loadAllData = async () => {
    setLoading(true);
    setFeedbackMsg("");
    try {
      const [uData, sData, statsData, exData, mgData, flaggedData] = await Promise.all([
        getAdminUsers().catch(() => []),
        getAdminSupportRequests().catch(() => []),
        getAdminStats().catch(() => null),
        getExercises().catch(() => []),
        getMuscleGroups().catch(() => []),
        getAdminFlaggedWorkouts().catch(() => []),
      ]);
      setUsers(uData || []);
      setSupportRequests(sData || []);
      setStats(statsData);
      setExercises(exData || []);
      setMuscleGroups(mgData || []);
      setFlaggedWorkouts(flaggedData || []);
      if (Array.isArray(mgData) && mgData.length > 0 && !newExerciseMuscleId && mgData[0]?.id) {
        setNewExerciseMuscleId(String(mgData[0].id));
      }
    } catch (err) {
      console.error("Error cargando datos del panel admin:", err);
      setFeedbackMsg("Error cargando información del Panel Master.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // --- ACTIONS: USER MANAGEMENT ---

  const handleQuickPasswordSubmit = async (userId) => {
    if (!quickPasswordVal || quickPasswordVal.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres", { variant: "error" });
      return;
    }
    setQuickPasswordLoading(true);
    try {
      const res = await resetAdminUserPassword(userId, quickPasswordVal);
      showToast(res.message || "✓ Contraseña actualizada", { variant: "emerald" });
      setQuickPasswordUserId(null);
      setQuickPasswordVal("");
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al actualizar contraseña", { variant: "error" });
    } finally {
      setQuickPasswordLoading(false);
    }
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setEditUsername(user.username || "");
    setEditEmail(user.email || "");
    setEditIsAdmin(Boolean(user.is_admin || user.role === "admin"));
    setEditIsActive(Boolean(user.is_active));
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    try {
      const payload = {
        username: editUsername.trim().toLowerCase(),
        email: editEmail.trim() || null,
        is_admin: editIsAdmin,
        is_active: editIsActive,
      };
      const updated = await updateAdminUser(editingUser.id, payload);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                username: updated.username,
                email: updated.email,
                is_admin: updated.is_admin,
                role: updated.role,
                is_active: updated.is_active,
              }
            : u
        )
      );
      showToast(`✓ Datos del usuario '${updated.username}' actualizados`, { variant: "emerald" });
      setEditingUser(null);
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al actualizar usuario", { variant: "error" });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!deletingUser) return;
    if (deletingUser.id === currentUser?.id) {
      showToast("No podés eliminar tu propia cuenta de administrador.", { variant: "error" });
      return;
    }
    setDeleteUserLoading(true);
    try {
      const res = await deleteAdminUser(deletingUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      showToast(res.message || "✓ Usuario eliminado con éxito", { variant: "emerald" });
      setDeletingUser(null);
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al eliminar usuario", { variant: "error" });
    } finally {
      setDeleteUserLoading(false);
    }
  };

  // --- ACTIONS: EXERCISE CATALOG ---

  const handleCreateExercise = async (e) => {
    e.preventDefault();
    const cleanName = newExerciseName.trim();
    if (!cleanName) {
      showToast("Ingresá un nombre para el ejercicio", { variant: "error" });
      return;
    }
    if (!newExerciseMuscleId) {
      showToast("Seleccioná un grupo muscular", { variant: "error" });
      return;
    }

    setCreatingExercise(true);
    try {
      const created = await createAdminExercise(cleanName, Number(newExerciseMuscleId));
      setExercises((prev) => [created, ...prev.filter((ex) => ex.id !== created.id)]);
      setNewExerciseName("");
      showToast(`✓ Ejercicio global '${created?.name || cleanName}' agregado al catálogo`, { variant: "emerald" });
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al crear ejercicio", { variant: "error" });
    } finally {
      setCreatingExercise(false);
    }
  };

  const handleDeleteExercise = async (exercise, force = false) => {
    if (!window.confirm(`¿Seguro que deseas quitar '${exercise?.name || "este ejercicio"}' del catálogo oficial?`)) return;
    setDeletingExerciseId(exercise.id);
    try {
      const res = await deleteAdminExercise(exercise.id, force);
      if (res.archived) {
        setExercises((prev) =>
          prev.map((ex) => (ex.id === exercise.id ? { ...ex, is_active: false } : ex))
        );
      } else {
        setExercises((prev) => prev.filter((ex) => ex.id !== exercise.id));
      }
      showToast(res.message || "✓ Ejercicio actualizado", { variant: "emerald" });
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al eliminar ejercicio", { variant: "error" });
    } finally {
      setDeletingExerciseId(null);
    }
  };

  // --- ACTIONS: SUPPORT REQUESTS ---

  const handleResolveSupport = async (reqId, newStatus) => {
    setSupportLoading(true);
    try {
      const updated = await updateAdminSupportRequest(reqId, {
        status: newStatus,
        admin_notes: adminNotes || null,
      });
      setSupportRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
      setTargetSupportReq(null);
      setAdminNotes("");
      showToast("✓ Solicitud de soporte actualizada", { variant: "emerald" });
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al actualizar soporte", { variant: "error" });
    } finally {
      setSupportLoading(false);
    }
  };

  // --- ACTIONS: MODERATION & ANTI-CHEAT ---

  const loadFlaggedWorkouts = async () => {
    setFlaggedLoading(true);
    try {
      const data = await getAdminFlaggedWorkouts();
      setFlaggedWorkouts(data || []);
    } catch (err) {
      console.error("Error cargando series sospechosas:", err);
      showToast(err.response?.data?.detail || "Error al cargar auditoría anti-cheat", { variant: "error" });
    } finally {
      setFlaggedLoading(false);
    }
  };

  const handleApproveSet = async (setId) => {
    setModerationActionLoading(setId);
    try {
      const res = await approveAdminWorkoutSet(setId);
      showToast(res.message || "✓ Serie aprobada y validada", { variant: "emerald" });
      await loadFlaggedWorkouts();
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al aprobar serie", { variant: "error" });
    } finally {
      setModerationActionLoading(null);
    }
  };

  const handleInvalidateSet = async (setId) => {
    setModerationActionLoading(setId);
    try {
      const res = await invalidateAdminWorkoutSet(setId);
      showToast(res.message || "✓ Serie anulada correctamente", { variant: "emerald" });
      await loadFlaggedWorkouts();
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al anular serie", { variant: "error" });
    } finally {
      setModerationActionLoading(null);
    }
  };

  const handleDeleteSet = async (setId) => {
    if (!window.confirm("¿Seguro que deseas eliminar definitivamente esta serie del sistema?")) return;
    setModerationActionLoading(setId);
    try {
      const res = await deleteAdminWorkoutSet(setId);
      showToast(res.message || "✓ Serie eliminada del sistema", { variant: "emerald" });
      await loadFlaggedWorkouts();
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al eliminar serie", { variant: "error" });
    } finally {
      setModerationActionLoading(null);
    }
  };

  // --- FILTERED LISTS ---

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchesSearch =
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if (userFilter === "active") return u.is_active;
    if (userFilter === "admins") return u.is_admin || u.role === "admin";
    return true;
  });

  const filteredExercises = exercises.filter((ex) => {
    const q = exerciseSearch.toLowerCase();
    const matchesSearch = ex?.name && ex.name.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (selectedMuscleGroupId !== "all") {
      return String(ex?.muscle_group_id) === String(selectedMuscleGroupId);
    }
    return true;
  });

  const pendingSupportCount = supportRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header Principal Flat OLED */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FF5722]/15 border border-[#FF5722]/40 text-[#FF5722] shadow-lg shadow-[#FF5722]/20">
              <Crown size={20} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Panel de Control Master
            </h1>
            <span className="rounded-full border border-[#FF5722] bg-[#1C1C1E] px-3 py-1 text-[11px] font-bold uppercase text-[#FF5722] shadow-md shadow-[#FF5722]/10">
              👑 Privilegios de Administrador
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8E8E93]">
            Gestión completa de usuarios, catálogo global de ejercicios y métricas del servidor
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#1C1C1E] px-4 py-2 text-xs font-semibold text-white hover:border-white/25 transition active:scale-95 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-[#FF5722]" : ""} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          {feedbackMsg}
        </div>
      )}

      {/* Tabs Selector Flat OLED */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeTab === "users"
              ? "border border-[#FF5722] bg-[#FF5722]/15 text-white shadow-lg shadow-[#FF5722]/10"
              : "text-[#8E8E93] hover:text-white bg-[#121212] border border-white/5"
          }`}
        >
          <Users size={15} className={activeTab === "users" ? "text-[#FF5722]" : ""} />
          <span>Gestión de Usuarios ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("exercises")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeTab === "exercises"
              ? "border border-[#FF5722] bg-[#FF5722]/15 text-white shadow-lg shadow-[#FF5722]/10"
              : "text-[#8E8E93] hover:text-white bg-[#121212] border border-white/5"
          }`}
        >
          <Dumbbell size={15} className={activeTab === "exercises" ? "text-[#FF5722]" : ""} />
          <span>Ejercicios Oficiales ({exercises.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeTab === "stats"
              ? "border border-[#FF5722] bg-[#FF5722]/15 text-white shadow-lg shadow-[#FF5722]/10"
              : "text-[#8E8E93] hover:text-white bg-[#121212] border border-white/5"
          }`}
        >
          <Activity size={15} className={activeTab === "stats" ? "text-[#FF5722]" : ""} />
          <span>Métricas del Servidor</span>
        </button>

        <button
          onClick={() => setActiveTab("support")}
          className={`relative flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeTab === "support"
              ? "border border-[#FF5722] bg-[#FF5722]/15 text-white shadow-lg shadow-[#FF5722]/10"
              : "text-[#8E8E93] hover:text-white bg-[#121212] border border-white/5"
          }`}
        >
          <HelpCircle size={15} className={activeTab === "support" ? "text-[#FF5722]" : ""} />
          <span>Buzón de Soporte</span>
          {pendingSupportCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-black">
              {pendingSupportCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("moderation");
            loadFlaggedWorkouts();
          }}
          className={`relative flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeTab === "moderation"
              ? "border border-[#FF5722] bg-[#FF5722]/15 text-white shadow-lg shadow-[#FF5722]/10"
              : "text-[#8E8E93] hover:text-white bg-[#121212] border border-white/5"
          }`}
        >
          <ShieldAlert size={15} className={activeTab === "moderation" ? "text-[#FF5722]" : ""} />
          <span>Moderación & Auditoría</span>
          {flaggedWorkouts.length > 0 && (
            <span className="ml-1 rounded-full bg-red-500/90 px-1.5 py-0.2 text-[10px] font-bold text-white">
              {flaggedWorkouts.length}
            </span>
          )}
        </button>
      </div>

      {/* ==========================================
          PESTAÑA 1: GESTIÓN DE USUARIOS
          ========================================== */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar atleta por nombre o email..."
                className="w-full rounded-2xl border border-white/10 bg-[#121212] pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:border-[#FF5722] focus:outline-none font-medium transition"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setUserFilter("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  userFilter === "all"
                    ? "bg-[#FF5722] text-white"
                    : "bg-[#1C1C1E] text-[#8E8E93] border border-white/5 hover:text-white"
                }`}
              >
                Todos ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setUserFilter("active")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  userFilter === "active"
                    ? "bg-emerald-600 text-white"
                    : "bg-[#1C1C1E] text-[#8E8E93] border border-white/5 hover:text-white"
                }`}
              >
                Activos ({users.filter((u) => u.is_active).length})
              </button>
              <button
                type="button"
                onClick={() => setUserFilter("admins")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  userFilter === "admins"
                    ? "bg-[#7C4DFF] text-white"
                    : "bg-[#1C1C1E] text-[#8E8E93] border border-white/5 hover:text-white"
                }`}
              >
                Admins ({users.filter((u) => u.is_admin || u.role === "admin").length})
              </button>
            </div>
          </div>

          {/* Tarjetas de Usuarios Flat OLED */}
          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const isAdmin = Boolean(u.is_admin || u.role === "admin");
              const isCurrent = u.id === currentUser?.id;
              const isQuickOpen = quickPasswordUserId === u.id;

              return (
                <div
                  key={u.id}
                  className="rounded-3xl border border-white/10 bg-[#121212] p-4 sm:p-5 transition hover:border-[#FF5722]/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-white text-base tracking-wide">
                          {u.username}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#8E8E93]">
                            (Vos)
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isAdmin
                              ? "border border-[#FF5722]/50 bg-[#FF5722]/15 text-[#FF5722]"
                              : "border border-zinc-700 bg-zinc-800 text-[#A1A1AA]"
                          }`}
                        >
                          {isAdmin ? "👑 Admin" : "Atleta"}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            u.is_active
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {u.is_active ? "Activo" : "Desactivado"}
                        </span>
                        <span className="text-[11px] text-[#8E8E93] capitalize">
                          • Nivel: <strong className="text-white">{u.experience_level}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[#8E8E93] flex-wrap">
                        {u.email ? (
                          <span className="flex items-center gap-1 text-[#C084FC]">
                            <Mail size={13} /> {u.email}
                          </span>
                        ) : (
                          <span className="italic text-zinc-600 flex items-center gap-1">
                            <Mail size={13} /> Sin email
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[#A1A1AA]">
                          <Dumbbell size={13} className="text-[#FF5722]" />
                          {u.total_workouts} {u.total_workouts === 1 ? "entrenamiento" : "entrenamientos"}
                        </span>
                        {u.last_workout_date && (
                          <span className="flex items-center gap-1 text-[#8E8E93]">
                            <Calendar size={13} />
                            Último: {u.last_workout_date}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones Rápidas: Cambiar Clave | Editar Datos | Eliminar */}
                    <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (isQuickOpen) {
                            setQuickPasswordUserId(null);
                          } else {
                            setQuickPasswordUserId(u.id);
                            setQuickPasswordVal("");
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                          isQuickOpen
                            ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
                            : "border-white/10 bg-[#1C1C1E] text-white hover:border-white/20"
                        }`}
                        title="Cambiar contraseña en un paso"
                      >
                        <KeyRound size={13} />
                        <span>Cambiar Clave</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditUser(u)}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#1C1C1E] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/20 transition active:scale-95 cursor-pointer"
                        title="Editar datos del usuario"
                      >
                        <Edit2 size={13} />
                        <span>Editar Datos</span>
                      </button>

                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() => setDeletingUser(u)}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title={isCurrent ? "No podés eliminar tu propia cuenta" : "Eliminar usuario y registros en cascada"}
                      >
                        <Trash2 size={13} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>

                  {/* Micro-input inline para Cambiar Clave */}
                  {isQuickOpen && (
                    <div className="mt-4 pt-3.5 border-t border-white/5 animate-fade-in">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={quickPasswordVal}
                          onChange={(e) => setQuickPasswordVal(e.target.value)}
                          placeholder="Ingresá nueva contraseña (mínimo 6 caracteres)..."
                          className="flex-1 rounded-xl border border-white/10 bg-[#050505] px-3.5 py-2 text-xs text-white placeholder-[#71717A] focus:border-[#FF5722] focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const gen = Math.random().toString(36).slice(-8) + "9!";
                            setQuickPasswordVal(gen);
                          }}
                          className="rounded-xl border border-white/10 bg-[#1C1C1E] px-3 py-2 text-xs font-semibold text-[#8E8E93] hover:text-white transition cursor-pointer"
                        >
                          Generar Clave
                        </button>
                        <button
                          type="button"
                          disabled={quickPasswordLoading || quickPasswordVal.length < 6}
                          onClick={() => handleQuickPasswordSubmit(u.id)}
                          className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
                        >
                          {quickPasswordLoading ? "Guardando..." : "Guardar Clave"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickPasswordUserId(null)}
                          className="rounded-xl px-2.5 py-2 text-xs text-[#8E8E93] hover:text-white transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-[#121212] p-8 text-center text-sm text-[#8E8E93]">
                No se encontraron atletas registrados con esos criterios.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          PESTAÑA 2: EJERCICIOS OFICIALES
          ========================================== */}
      {activeTab === "exercises" && (
        <div className="space-y-5">
          {/* Formulario Flat OLED: Crear Ejercicio Global */}
          <div className="rounded-3xl border border-white/10 bg-[#121212] p-5 space-y-3 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#FF5722]/20 text-[#FF5722]">
                <Plus size={16} />
              </span>
              <h3 className="font-bold text-white text-sm">
                Agregar Ejercicio al Catálogo Global
              </h3>
            </div>
            <p className="text-xs text-[#8E8E93]">
              Los ejercicios creados aquí serán visibles de inmediato para todos los atletas en el sistema.
            </p>

            <form onSubmit={handleCreateExercise} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Ej: Press Militar con Barra, Dominadas Supinas..."
                  className="w-full rounded-2xl border border-white/10 bg-[#1C1C1E] px-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:border-[#FF5722] focus:outline-none font-medium transition"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={newExerciseMuscleId}
                  onChange={(e) => setNewExerciseMuscleId(e.target.value)}
                  className="flex-1 rounded-2xl border border-white/10 bg-[#1C1C1E] px-3.5 py-2.5 text-sm text-white focus:border-[#FF5722] focus:outline-none font-medium transition"
                  required
                >
                  {(muscleGroups || []).map((mg) => (
                    <option key={mg?.id || Math.random()} value={mg?.id}>
                      {mg?.name || "Músculo"}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={creatingExercise || !newExerciseName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 active:scale-95 disabled:opacity-50 transition cursor-pointer whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>{creatingExercise ? "Creando..." : "Crear"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Filtros de Ejercicios */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Buscar ejercicio en catálogo..."
                className="w-full rounded-2xl border border-white/10 bg-[#121212] pl-10 pr-4 py-2 text-sm text-white placeholder-[#71717A] focus:border-[#FF5722] focus:outline-none font-medium transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedMuscleGroupId("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedMuscleGroupId === "all"
                    ? "bg-[#FF5722] text-white"
                    : "bg-[#1C1C1E] text-[#8E8E93] border border-white/5 hover:text-white"
                }`}
              >
                Todos ({exercises.length})
              </button>
              {(muscleGroups || []).map((mg) => {
                const count = (exercises || []).filter((ex) => ex?.muscle_group_id === mg?.id).length;
                return (
                  <button
                    key={mg?.id || Math.random()}
                    type="button"
                    onClick={() => setSelectedMuscleGroupId(String(mg?.id))}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      String(selectedMuscleGroupId) === String(mg?.id)
                        ? "bg-[#FF5722] text-white"
                        : "bg-[#1C1C1E] text-[#8E8E93] border border-white/5 hover:text-white"
                    }`}
                  >
                    {mg?.name || "Músculo"} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Ejercicios Oficiales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredExercises.map((ex) => (
              <div
                key={ex?.id || Math.random()}
                className="rounded-3xl border border-white/10 bg-[#121212] p-4 flex items-center justify-between gap-3 hover:border-[#FF5722]/40 transition"
              >
                <div className="space-y-1 min-w-0">
                  <h4 className="font-bold text-white text-sm truncate">{ex?.name || "Ejercicio"}</h4>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-[#FF5722] border border-[#FF5722]/20">
                      {ex.muscle_group_name || "Músculo"}
                    </span>
                    {!ex.is_active && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[9px] text-[#8E8E93]">
                        Archivado
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={deletingExerciseId === ex.id}
                  onClick={() => handleDeleteExercise(ex, false)}
                  className="rounded-2xl border border-red-500/25 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 transition active:scale-95 cursor-pointer flex-shrink-0"
                  title="Eliminar o archivar ejercicio de la lista global"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {filteredExercises.length === 0 && (
              <div className="col-span-full rounded-3xl border border-white/10 bg-[#121212] p-8 text-center text-sm text-[#8E8E93]">
                No hay ejercicios oficiales que coincidan con los filtros.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          PESTAÑA 3: MÉTRICAS DEL SERVIDOR
          ========================================== */}
      {activeTab === "stats" && (
        <div className="space-y-5">
          {/* Tarjetas Flat OLED de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Volumen Total */}
            <div className="rounded-3xl border border-white/10 bg-[#121212] p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-[#8E8E93] text-xs font-semibold">
                <span>Volumen Total Global</span>
                <span className="p-2 rounded-xl bg-[#FF5722]/15 text-[#FF5722]">
                  <Flame size={18} />
                </span>
              </div>
              <p className="text-3xl font-extrabold text-white tracking-tight">
                {stats?.total_weight_lifted
                  ? `${stats.total_weight_lifted.toLocaleString("es-AR")} kg`
                  : "0 kg"}
              </p>
              <p className="text-[11px] text-[#8E8E93]">
                Tonelaje total levantado en series efectivas completadas
              </p>
            </div>

            {/* Atletas y Usuarios */}
            <div className="rounded-3xl border border-white/10 bg-[#121212] p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-[#8E8E93] text-xs font-semibold">
                <span>Atletas en el Servidor</span>
                <span className="p-2 rounded-xl bg-purple-500/15 text-[#C084FC]">
                  <Users size={18} />
                </span>
              </div>
              <p className="text-3xl font-extrabold text-white tracking-tight">
                {stats?.total_users ?? users.length}
              </p>
              <p className="text-[11px] text-emerald-400 font-medium">
                {stats?.active_users ?? users.filter((u) => u.is_active).length} cuentas activas
              </p>
            </div>

            {/* Entrenamientos */}
            <div className="rounded-3xl border border-white/10 bg-[#121212] p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-[#8E8E93] text-xs font-semibold">
                <span>Sesiones Registradas</span>
                <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Dumbbell size={18} />
                </span>
              </div>
              <p className="text-3xl font-extrabold text-white tracking-tight">
                {stats?.total_workouts ?? 0}
              </p>
              <p className="text-[11px] text-[#8E8E93]">
                Total histórico de entrenamientos guardados
              </p>
            </div>

            {/* Series Totales */}
            <div className="rounded-3xl border border-white/10 bg-[#121212] p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-[#8E8E93] text-xs font-semibold">
                <span>Series Totales</span>
                <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Layers size={18} />
                </span>
              </div>
              <p className="text-3xl font-extrabold text-white tracking-tight">
                {stats?.total_sets ?? 0}
              </p>
              <p className="text-[11px] text-[#8E8E93]">
                Sets contabilizados en la base de datos
              </p>
            </div>
          </div>

          {/* Información del Motor de Base de Datos */}
          <div className="rounded-3xl border border-white/10 bg-[#121212] p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-[#FF5722]" />
              <h3 className="text-base font-bold text-white">Estado del Servidor &amp; Base de Datos</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3.5 space-y-1">
                <span className="text-[#8E8E93] font-semibold block">Motor DB</span>
                <span className="text-white font-bold text-sm">SQLite con WAL</span>
                <p className="text-[10px] text-[#8E8E93]">Sincronización segura y multiconexión concurrente</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3.5 space-y-1">
                <span className="text-[#8E8E93] font-semibold block">Seguridad &amp; Criptografía</span>
                <span className="text-emerald-400 font-bold text-sm">Bcrypt + JWT HS256</span>
                <p className="text-[10px] text-[#8E8E93]">Tokens con claim is_admin y sesiones encriptadas</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] p-3.5 space-y-1">
                <span className="text-[#8E8E93] font-semibold block">Catálogo Oficial</span>
                <span className="text-white font-bold text-sm">{exercises.length} ejercicios</span>
                <p className="text-[10px] text-[#8E8E93]">Organizados en {muscleGroups.length} grupos musculares</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          PESTAÑA 4: BUZÓN DE SOPORTE
          ========================================== */}
      {activeTab === "support" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8E8E93]">Filtrar:</span>
            <button
              onClick={() => setSupportFilter("all")}
              className={`rounded-xl px-3 py-1 text-xs font-bold cursor-pointer ${
                supportFilter === "all"
                  ? "bg-[#FF5722] text-white"
                  : "bg-[#1C1C1E] text-[#8E8E93] border border-white/5 hover:text-white"
              }`}
            >
              Todas ({supportRequests.length})
            </button>
            <button
              onClick={() => setSupportFilter("pending")}
              className={`rounded-xl px-3 py-1 text-xs font-bold cursor-pointer ${
                supportFilter === "pending"
                  ? "bg-amber-500 text-black"
                  : "bg-[#1C1C1E] text-[#8E8E93] border border-white/5 hover:text-white"
              }`}
            >
              Pendientes ({pendingSupportCount})
            </button>
            <button
              onClick={() => setSupportFilter("resolved")}
              className={`rounded-xl px-3 py-1 text-xs font-bold cursor-pointer ${
                supportFilter === "resolved"
                  ? "bg-emerald-500 text-black"
                  : "bg-[#1C1C1E] text-[#8E8E93] border border-white/5 hover:text-white"
              }`}
            >
              Resueltas ({supportRequests.length - pendingSupportCount})
            </button>
          </div>

          <div className="space-y-3">
            {supportRequests
              .filter((r) => (supportFilter === "all" ? true : r.status === supportFilter))
              .map((req) => (
                <div
                  key={req.id}
                  className={`rounded-3xl border p-4 sm:p-5 transition ${
                    req.status === "pending"
                      ? "border-amber-500/40 bg-[#121212]"
                      : "border-white/10 bg-[#121212]/70 opacity-80"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            req.status === "pending"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          }`}
                        >
                          {req.status === "pending" ? "Pendiente" : "Resuelta"}
                        </span>
                        <h3 className="font-bold text-white text-sm sm:text-base">{req.subject}</h3>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#8E8E93] flex-wrap">
                        <span>
                          Usuario: <strong className="text-white">{req.username || "Anónimo"}</strong>
                        </span>
                        {req.email && (
                          <span>
                            Email: <strong className="text-[#C084FC]">{req.email}</strong>
                          </span>
                        )}
                        <span className="text-[11px] text-[#71717A]">
                          {req.created_at ? new Date(req.created_at).toLocaleString("es-AR") : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start">
                      {req.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetSupportReq(req);
                            setAdminNotes("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition active:scale-95 cursor-pointer"
                        >
                          <Check size={13} />
                          <span>Resolver</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResolveSupport(req.id, "pending")}
                          className="inline-flex items-center gap-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-[#8E8E93] hover:text-white transition cursor-pointer"
                        >
                          <span>Reabrir</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-[#1C1C1E] p-3 text-xs text-white border border-white/5 whitespace-pre-wrap font-medium">
                    {req.message}
                  </div>

                  {req.admin_notes && (
                    <div className="mt-2 text-[11px] text-emerald-300 bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20">
                      <strong>Nota del Administrador:</strong> {req.admin_notes}
                    </div>
                  )}
                </div>
              ))}

            {supportRequests.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-[#121212] p-8 text-center text-sm text-[#8E8E93]">
                No hay solicitudes de soporte recibidas.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          PESTAÑA 5: MODERACIÓN ANTI-CHEAT & PUNTOS
          ========================================== */}
      {activeTab === "moderation" && (
        <div className="space-y-6">
          {/* SECCIÓN 1: AUDITORÍA DE CARGAS (ANTI-CHEAT) */}
          <div className="rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex-shrink-0">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Auditoría de Cargas (Anti-Cheat)
                    </h3>
                    <span className="rounded-full bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold">
                      {flaggedWorkouts.length} alertas
                    </span>
                  </div>
                  <p className="text-xs text-[#8E8E93] mt-0.5">
                    Detección de anomalías: saltos abruptos (&gt;15 kg) o cargas superiores a 2.5x peso corporal en básicos.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadFlaggedWorkouts}
                disabled={flaggedLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1C1C1E] border border-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:border-white/20 transition active:scale-95 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw size={13} className={flaggedLoading ? "animate-spin" : ""} />
                <span>Actualizar Alertas</span>
              </button>
            </div>

            {/* Listado de Series Sospechosas */}
            {flaggedLoading ? (
              <div className="flex items-center justify-center py-12 text-[#8E8E93]">
                <RefreshCw size={24} className="animate-spin text-[#FF5722]" />
              </div>
            ) : flaggedWorkouts.length > 0 ? (
              <div className="grid gap-3.5">
                {flaggedWorkouts.map((st) => (
                  <div
                    key={st.set_id}
                    className={`rounded-2xl border p-4 transition space-y-3 ${
                      !st.is_valid
                        ? "border-zinc-800 bg-[#141416]/60 opacity-75"
                        : "border-red-500/30 bg-[#181414] hover:border-red-500/50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-white font-bold text-xs">
                          {st.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {st.display_name}
                            </span>
                            <span className="text-xs text-[#8E8E93]">
                              (@{st.username})
                            </span>
                            <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.2 text-[10px] text-[#A1A1AA]">
                              BW: {st.bodyweight || 75} kg
                            </span>
                          </div>
                          <span className="text-[11px] text-[#71717A]">
                            Fecha sesión: {st.date} • Set #{st.set_id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {!st.is_valid ? (
                          <span className="rounded-full bg-red-500/20 text-red-300 border border-red-500/40 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                            <span>🚫</span> Anulada del Ranking
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle size={11} /> Sospecha Activa
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                      <div className="space-y-1">
                        <span className="text-[11px] text-[#8E8E93] uppercase tracking-wider font-semibold block">
                          Ejercicio & Carga Levantada
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-extrabold text-white">
                            {st.exercise_name}
                          </span>
                          {st.muscle_group_name && (
                            <span className="text-xs text-[#A1A1AA]">
                              ({st.muscle_group_name})
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-[#FF8A65]">
                          {st.weight} kg × {st.reps} reps
                          {st.bw_ratio && (
                            <span className="ml-2 text-xs font-medium text-amber-400/90">
                              ({st.bw_ratio}x BW)
                            </span>
                          )}
                        </div>
                        {st.previous_session_weight && (
                          <p className="text-[11px] text-[#8E8E93]">
                            Marca previa: <strong className="text-white">{st.previous_session_weight} kg</strong>
                            {st.weight_diff_kg && (
                              <span className="text-red-400 font-bold ml-1">
                                (+{st.weight_diff_kg} kg)
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Motivo de la Alerta */}
                      <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200 flex items-start gap-2 self-center">
                        <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-red-300">Motivo de Alerta:</strong>
                          <span>{st.flag_reason}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción de Moderación */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                      {!st.is_valid ? (
                        <button
                          type="button"
                          onClick={() => handleApproveSet(st.set_id)}
                          disabled={moderationActionLoading === st.set_id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 active:scale-95 transition cursor-pointer disabled:opacity-50"
                        >
                          <Check size={13} />
                          <span>{moderationActionLoading === st.set_id ? "Validando..." : "✓ Aprobar / Restaurar"}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApproveSet(st.set_id)}
                            disabled={moderationActionLoading === st.set_id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 active:scale-95 transition cursor-pointer disabled:opacity-50"
                          >
                            <Check size={13} />
                            <span>{moderationActionLoading === st.set_id ? "Aprobando..." : "✓ Aprobar"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInvalidateSet(st.set_id)}
                            disabled={moderationActionLoading === st.set_id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/20 border border-red-500/40 px-3.5 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30 active:scale-95 transition cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                            <span>{moderationActionLoading === st.set_id ? "Anulando..." : "🗑️ Anular Serie"}</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSet(st.set_id)}
                        disabled={moderationActionLoading === st.set_id}
                        className="inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-red-400 hover:border-red-500/30 active:scale-95 transition cursor-pointer disabled:opacity-50"
                        title="Eliminar permanentemente de la base de datos"
                      >
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center text-xs text-emerald-300 space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
                <p className="font-bold text-sm text-white">Auditoría Limpia</p>
                <p className="text-[#8E8E93]">No se detectaron marcas sospechosas ni saltos anómalos de peso en el sistema.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: EDITAR DATOS DEL USUARIO
          ========================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/15 bg-[#1C1C1E] p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 text-white shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-[#FF5722]" />
                <h3 className="text-base font-bold text-white">Editar Usuario</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-[#8E8E93] hover:text-white p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#121212] px-3.5 py-2.5 text-sm text-white focus:border-[#FF5722] focus:outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full rounded-2xl border border-white/10 bg-[#121212] px-3.5 py-2.5 text-sm text-white placeholder-[#71717A] focus:border-[#FF5722] focus:outline-none font-medium"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-[#121212] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Crown size={16} className={editIsAdmin ? "text-[#FF5722]" : "text-[#8E8E93]"} />
                    <span className="text-xs font-semibold text-white">Permisos de Administrador</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsAdmin}
                    onChange={(e) => setEditIsAdmin(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#FF5722]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-[#121212] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className={editIsActive ? "text-emerald-400" : "text-[#8E8E93]"} />
                    <span className="text-xs font-semibold text-white">Cuenta Activa</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#8E8E93] hover:text-white rounded-2xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white rounded-2xl hover:opacity-90 active:scale-95 disabled:opacity-50 transition cursor-pointer shadow-lg shadow-[#FF5722]/20"
                >
                  {editLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CONFIRMACIÓN DE ELIMINAR USUARIO
          ========================================== */}
      {deletingUser && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-red-500/30 bg-[#1C1C1E] p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 text-white text-center space-y-4 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Trash2 size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                ¿Eliminar al atleta &apos;{deletingUser.username}&apos;?
              </h3>
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Esta acción eliminará de forma permanente al usuario y todos sus entrenamientos, series y marcas en cascada.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-[#8E8E93] hover:text-white rounded-2xl bg-[#121212] border border-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteUserLoading}
                onClick={handleDeleteUserConfirm}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-2xl disabled:opacity-50 shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                {deleteUserLoading ? "Eliminando..." : "Confirmar Eliminación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: RESOLVER SOLICITUD DE SOPORTE
          ========================================== */}
      {targetSupportReq && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#1C1C1E] p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 text-white space-y-3 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Marcar Solicitud como Resuelta</h3>
              <button
                onClick={() => setTargetSupportReq(null)}
                className="text-[#8E8E93] hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-[#8E8E93]">
              Atleta: <strong>{targetSupportReq.username || "Anónimo"}</strong> — &quot;{targetSupportReq.subject}&quot;
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
                  Nota u observación interna (opcional)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ej: Se restableció la clave o se asistió al atleta..."
                  className="w-full rounded-2xl border border-white/10 bg-[#121212] p-3 text-xs text-white placeholder-[#71717A] focus:border-[#FF5722] focus:outline-none resize-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setTargetSupportReq(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#8E8E93] hover:text-white rounded-2xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={supportLoading}
                  onClick={() => handleResolveSupport(targetSupportReq.id, "resolved")}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl disabled:opacity-50"
                >
                  {supportLoading ? "Guardando..." : "Confirmar Resolución"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
