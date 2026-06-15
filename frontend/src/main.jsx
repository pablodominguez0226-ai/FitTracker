import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { Activity, BarChart3, Camera, Dumbbell, Home, ListChecks, LogOut, Ruler, Shield } from "lucide-react";
import "./index.css";
import { api, AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./api/client";
import Admin from "./pages/Admin.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Exercises from "./pages/Exercises.jsx";
import Login from "./pages/Login.jsx";
import Workouts from "./pages/Workouts.jsx";
import Measurements from "./pages/Measurements.jsx";
import Photos from "./pages/Photos.jsx";
import Records from "./pages/Records.jsx";
import Routines from "./pages/Routines.jsx";

function AppShell() {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [permissionMessage, setPermissionMessage] = useState("");
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(AUTH_USER_KEY);
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  });
  const nav = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/workouts", label: "Entrenar", icon: Dumbbell },
    { to: "/routines", label: "Rutinas", icon: ListChecks },
    { to: "/exercises", label: "Ejer.", icon: Activity },
    { to: "/measurements", label: "Medidas", icon: Ruler },
    { to: "/photos", label: "Fotos", icon: Camera },
    { to: "/records", label: "PRs", icon: BarChart3 },
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin", icon: Shield }] : [])
  ];

  function handleAuthenticated(authenticatedUser) {
    setToken(localStorage.getItem(AUTH_TOKEN_KEY));
    setUser(authenticatedUser);
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
    setPermissionMessage("");
  }

  useEffect(() => {
    function showForbidden(event) {
      setPermissionMessage(event.detail || "No tenés permisos para esta acción");
    }

    window.addEventListener("fittracker:logout", logout);
    window.addEventListener("fittracker:forbidden", showForbidden);
    return () => {
      window.removeEventListener("fittracker:logout", logout);
      window.removeEventListener("fittracker:forbidden", showForbidden);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    api.get("/auth/me").then((res) => {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.data));
      setUser(res.data);
    }).catch(() => {});
  }, [token]);

  if (!token) {
    return <Login onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-fitBg text-fitText">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(47,128,255,0.12),transparent_70%)]" />
      <main className="relative mx-auto max-w-4xl px-4 pb-28 pt-5 sm:px-6 sm:pb-32 sm:pt-6">
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={logout} className="ft-button-ghost px-3 py-2 text-xs">
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
        {permissionMessage ? (
          <div className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
            {permissionMessage}
          </div>
        ) : null}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/measurements" element={<Measurements />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/records" element={<Records />} />
          <Route path="/admin" element={<Admin user={user} />} />
        </Routes>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#070A12]/90 backdrop-blur-2xl safe-bottom">
        <div className="ft-scrollbar-hide mx-auto flex max-w-4xl gap-1 overflow-x-auto px-2 pt-2 sm:px-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex min-w-[4.45rem] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition sm:min-w-0 sm:text-[11px] ${isActive ? "bg-blue-500/12 text-blue-100" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"}`
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </React.StrictMode>
);
