import React, { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { api } from "../api/client";
import Card from "../components/Card";
import Header from "../components/Header";

export default function Admin({ user }) {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (error) {
      setMessage(error.response?.data?.detail ?? "No se pudo cargar usuarios.");
    }
  }

  useEffect(() => {
    if (user?.role === "admin") {
      loadUsers();
    }
  }, [user?.role]);

  async function updateActive(targetUser, isActive) {
    const res = await api.patch(`/admin/users/${targetUser.id}/active`, { is_active: isActive });
    setUsers((current) => current.map((item) => (item.id === targetUser.id ? res.data : item)));
  }

  async function updateRole(targetUser, role) {
    const res = await api.patch(`/admin/users/${targetUser.id}/role`, { role });
    setUsers((current) => current.map((item) => (item.id === targetUser.id ? res.data : item)));
  }

  if (user?.role !== "admin") {
    return (
      <>
        <Header title="Admin" subtitle="Gestión básica de usuarios" />
        <Card>
          <div className="flex items-center gap-3 text-slate-300">
            <Shield size={22} className="text-blue-200" />
            <p>No tenés permisos para acceder a esta pantalla.</p>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Header title="Admin" subtitle="Usuarios, roles y estado de cuenta" />
      <div className="space-y-3">
        {users.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-black">{item.username}</h2>
                  <span className={`ft-chip ${item.is_active ? "text-emerald-200" : "text-red-200"}`}>
                    {item.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{item.email || "Sin email"}</p>
              </div>

              <select
                value={item.role}
                onChange={(event) => updateRole(item, event.target.value)}
                className="ft-select sm:w-36"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>

              <button
                type="button"
                onClick={() => updateActive(item, !item.is_active)}
                className={item.is_active ? "ft-button-danger" : "ft-button-ghost"}
              >
                {item.is_active ? "Desactivar" : "Activar"}
              </button>
            </div>
          </Card>
        ))}
        {!users.length ? <Card><p className="text-slate-300">No hay usuarios para mostrar.</p></Card> : null}
      </div>
      {message ? <p className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{message}</p> : null}
    </>
  );
}
