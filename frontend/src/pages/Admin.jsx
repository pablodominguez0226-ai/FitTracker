import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  HelpCircle,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import {
  getAdminSupportRequests,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminSupportRequest,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "../api/client";

export default function Admin({ currentUser }) {
  const [activeTab, setActiveTab] = useState("users"); // 'users' | 'support'
  const [users, setUsers] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'pending' | 'resolved'
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Password reset modal state
  const [targetUserForPassword, setTargetUserForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passFeedback, setPassFeedback] = useState("");

  // Support resolution state
  const [targetSupportReq, setTargetSupportReq] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setFeedbackMsg("");
    try {
      const [uData, sData] = await Promise.all([getAdminUsers(), getAdminSupportRequests()]);
      setUsers(uData);
      setSupportRequests(sData);
    } catch (err) {
      setFeedbackMsg("Error cargando información de administración.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      const updated = await updateAdminUserStatus(user.id, !user.is_active);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: updated.is_active } : u)));
    } catch (err) {
      alert(err.response?.data?.detail || "No se pudo actualizar el estado del usuario.");
    }
  };

  const handleToggleRole = async (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    if (user.id === currentUser?.id && nextRole !== "admin") {
      alert("No podés quitarte tus propios permisos de administrador.");
      return;
    }
    if (!window.confirm(`¿Confirmás cambiar el rol de '${user.username}' a '${nextRole}'?`)) return;

    try {
      const updated = await updateAdminUserRole(user.id, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: updated.role } : u)));
    } catch (err) {
      alert(err.response?.data?.detail || "No se pudo actualizar el rol.");
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!targetUserForPassword) return;
    if (newPassword.length < 6) {
      setPassFeedback("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setPassLoading(true);
    setPassFeedback("");
    try {
      const res = await resetAdminUserPassword(targetUserForPassword.id, newPassword);
      setPassFeedback(`✓ ${res.message}`);
      setTimeout(() => {
        setTargetUserForPassword(null);
        setNewPassword("");
        setPassFeedback("");
      }, 1500);
    } catch (err) {
      setPassFeedback(err.response?.data?.detail || "Error al actualizar contraseña.");
    } finally {
      setPassLoading(false);
    }
  };

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
    } catch (err) {
      alert(err.response?.data?.detail || "Error al actualizar la solicitud.");
    } finally {
      setSupportLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const filteredSupport = supportRequests.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  const pendingCount = supportRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2D1B4E] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9333EA]/20 border border-[#A855F7]/30 text-[#C084FC]">
              <ShieldCheck size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Panel de Administración
            </h1>
            <span className="rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-[#C084FC]">
              Pablo / Admin
            </span>
          </div>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Control de cuentas, restablecimiento de contraseñas y buzón de soporte
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2D1B4E] bg-[#140E24] px-3.5 py-2 text-xs font-bold text-[#D4D4D8] hover:border-[#A855F7] hover:text-white transition active:scale-95"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
            <span>Total Usuarios</span>
            <Users size={16} className="text-[#A855F7]" />
          </div>
          <p className="text-2xl font-black text-white">{users.length}</p>
        </div>

        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
            <span>Usuarios Activos</span>
            <UserCheck size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">
            {users.filter((u) => u.is_active).length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
            <span>Entrenamientos Totales</span>
            <Dumbbell size={16} className="text-[#C084FC]" />
          </div>
          <p className="text-2xl font-black text-white">
            {users.reduce((acc, u) => acc + (u.total_workouts || 0), 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-3.5">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
            <span>Buzón de Soporte</span>
            <HelpCircle size={16} className={pendingCount > 0 ? "text-amber-400" : "text-[#71717A]"} />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-white">{supportRequests.length}</p>
            {pendingCount > 0 && (
              <span className="text-xs font-bold text-amber-400 animate-pulse">
                ({pendingCount} pendientes)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2D1B4E] pb-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            activeTab === "users"
              ? "border border-[#A855F7]/40 bg-[#1C1433] text-white shadow-neon"
              : "text-[#A1A1AA] hover:text-white"
          }`}
        >
          <Users size={16} />
          Atletas y Usuarios ({users.length})
        </button>

        <button
          onClick={() => setActiveTab("support")}
          className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            activeTab === "support"
              ? "border border-[#A855F7]/40 bg-[#1C1433] text-white shadow-neon"
              : "text-[#A1A1AA] hover:text-white"
          }`}
        >
          <HelpCircle size={16} />
          Buzón de Soporte ({supportRequests.length})
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-black">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Users */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por usuario o email..."
              className="w-full rounded-2xl border border-[#2D1B4E] bg-[#140E24] pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:border-[#A855F7] focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-[#A855F7]/50"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-base">{u.username}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                        u.role === "admin"
                          ? "border border-purple-500/50 bg-purple-500/20 text-[#C084FC]"
                          : "border border-zinc-700 bg-zinc-800 text-[#A1A1AA]"
                      }`}
                    >
                      {u.role}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        u.is_active
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/15 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {u.is_active ? "Activo" : "Desactivado"}
                    </span>
                    <span className="text-[11px] text-[#A1A1AA] capitalize">
                      • Nivel: <strong className="text-white">{u.experience_level}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#71717A] flex-wrap">
                    {u.email ? (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {u.email}
                      </span>
                    ) : (
                      <span className="italic text-zinc-600">Sin email</span>
                    )}
                    <span className="flex items-center gap-1 text-[#A1A1AA]">
                      <Dumbbell size={12} className="text-[#A855F7]" />
                      {u.total_workouts} {u.total_workouts === 1 ? "sesión" : "sesiones"}
                    </span>
                    {u.last_workout_date && (
                      <span className="flex items-center gap-1 text-[#A1A1AA]">
                        <Calendar size={12} />
                        Último: {u.last_workout_date}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUserForPassword(u);
                      setNewPassword("");
                      setPassFeedback("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#2D1B4E] bg-[#09060E] px-3 py-1.5 text-xs font-bold text-[#C084FC] hover:border-[#A855F7] hover:bg-[#1C1433] transition active:scale-95"
                    title="Restablecer o asignar nueva contraseña al usuario"
                  >
                    <KeyRound size={13} />
                    Cambiar Clave
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(u)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                      u.is_active
                        ? "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                        : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    }`}
                  >
                    {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                    {u.is_active ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleRole(u)}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-[11px] font-bold text-[#D4D4D8] hover:bg-zinc-700 transition"
                    title="Cambiar entre Atleta y Administrador"
                  >
                    <Shield size={12} />
                    {u.role === "admin" ? "Bajar a User" : "Hacer Admin"}
                  </button>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-8 text-center text-sm text-[#71717A]">
                No se encontraron usuarios que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Support Requests */}
      {activeTab === "support" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#A1A1AA]">Filtrar:</span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                statusFilter === "all"
                  ? "bg-[#9333EA] text-white"
                  : "bg-[#140E24] text-[#A1A1AA] border border-[#2D1B4E]"
              }`}
            >
              Todos ({supportRequests.length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-black"
                  : "bg-[#140E24] text-[#A1A1AA] border border-[#2D1B4E]"
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("resolved")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                statusFilter === "resolved"
                  ? "bg-emerald-500 text-black"
                  : "bg-[#140E24] text-[#A1A1AA] border border-[#2D1B4E]"
              }`}
            >
              Resueltas ({supportRequests.length - pendingCount})
            </button>
          </div>

          <div className="space-y-3">
            {filteredSupport.map((req) => (
              <div
                key={req.id}
                className={`rounded-2xl border p-4.5 transition ${
                  req.status === "pending"
                    ? "border-amber-500/40 bg-[#140E24]"
                    : "border-[#2D1B4E] bg-[#140E24]/60 opacity-80"
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

                    <div className="flex items-center gap-3 text-xs text-[#A1A1AA] flex-wrap">
                      <span>
                        Usuario: <strong className="text-white">{req.username || "Anónimo"}</strong>
                      </span>
                      {req.email && (
                        <span>
                          Email: <strong className="text-[#C084FC]">{req.email}</strong>
                        </span>
                      )}
                      <span className="text-[11px] text-[#71717A]">
                        {req.created_at ? new Date(req.created_at).toLocaleString() : ""}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-start">
                    {/* Quick reset password shortcut if user exists */}
                    {req.username && (
                      <button
                        type="button"
                        onClick={() => {
                          const matched = users.find(
                            (u) => u.username?.toLowerCase() === req.username?.toLowerCase()
                          );
                          if (matched) {
                            setTargetUserForPassword(matched);
                            setNewPassword("");
                            setPassFeedback("");
                          } else {
                            alert(`No se encontró un usuario registrado con nombre '${req.username}'.`);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#2D1B4E] bg-[#09060E] px-2.5 py-1.5 text-xs font-bold text-[#C084FC] hover:border-[#A855F7] transition"
                        title="Restablecer la clave del usuario que envió la solicitud"
                      >
                        <KeyRound size={12} />
                        Clave
                      </button>
                    )}

                    {req.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetSupportReq(req);
                          setAdminNotes("");
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
                      >
                        <Check size={13} />
                        Resolver
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResolveSupport(req.id, "pending")}
                        className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-[#A1A1AA] hover:text-white"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                <div className="mt-3 rounded-xl bg-[#09060E] p-3 text-xs text-[#D4D4D8] border border-[#2D1B4E]/60 whitespace-pre-wrap">
                  {req.message}
                </div>

                {/* Admin notes if resolved */}
                {req.admin_notes && (
                  <div className="mt-2 text-[11px] text-emerald-300/80 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20">
                    <strong>Nota del admin:</strong> {req.admin_notes}
                  </div>
                )}
              </div>
            ))}

            {filteredSupport.length === 0 && (
              <div className="rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-8 text-center text-sm text-[#71717A]">
                No hay solicitudes de soporte para mostrar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {targetUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-5 sm:p-6 shadow-2xl text-white">
            <button
              onClick={() => setTargetUserForPassword(null)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9333EA]/20 border border-[#A855F7]/30 text-[#C084FC]">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Restablecer Contraseña</h3>
                <p className="text-xs text-[#A1A1AA]">
                  Usuario: <strong className="text-white">{targetUserForPassword.username}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                  Nueva Contraseña para el Usuario
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-[#2D1B4E] bg-[#09060E] px-3.5 py-2 text-sm text-white placeholder-[#71717A] focus:border-[#A855F7] focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const rand = Math.random().toString(36).slice(-8) + "9!";
                      setNewPassword(rand);
                    }}
                    className="px-3 py-2 text-xs font-bold bg-[#1C1433] border border-[#2D1B4E] hover:border-[#A855F7] rounded-xl text-[#C084FC] whitespace-nowrap"
                  >
                    Generar
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[#71717A]">
                  Podés ingresar una clave provisoria y compartirla con el usuario.
                </p>
              </div>

              {passFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold ${
                    passFeedback.startsWith("✓")
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/15 text-red-300 border border-red-500/30"
                  }`}
                >
                  {passFeedback}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetUserForPassword(null)}
                  className="px-4 py-2 text-xs font-bold text-[#A1A1AA] hover:text-white rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#9333EA] to-[#A855F7] text-white rounded-xl shadow-neon hover:opacity-95 disabled:opacity-50"
                >
                  {passLoading ? "Guardando..." : "Asignar Contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Support Modal */}
      {targetSupportReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-[#2D1B4E] bg-[#140E24] p-5 sm:p-6 shadow-2xl text-white">
            <button
              onClick={() => setTargetSupportReq(null)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-black text-white mb-2">Marcar Solicitud como Resuelta</h3>
            <p className="text-xs text-[#A1A1AA] mb-4">
              Solicitud de <strong>{targetSupportReq.username || "Anónimo"}</strong>: &quot;{targetSupportReq.subject}&quot;
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                  Nota u observación interna (opcional)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ej. Se restableció la clave provisoria y se notificó al usuario..."
                  className="w-full rounded-xl border border-[#2D1B4E] bg-[#09060E] p-3 text-xs text-white placeholder-[#71717A] focus:border-[#A855F7] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetSupportReq(null)}
                  className="px-4 py-2 text-xs font-bold text-[#A1A1AA] hover:text-white rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={supportLoading}
                  onClick={() => handleResolveSupport(targetSupportReq.id, "resolved")}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-neon disabled:opacity-50"
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
