import React, { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import {
  Check,
  Dumbbell,
  HelpCircle,
  Layers,
  Loader2,
  LogOut,
  ShieldCheck,
  Swords,
  TrendingUp,
  Trophy,
  User,
  X,
} from "lucide-react";
import "./index.css";
import Workouts from "./pages/Workouts.jsx";
import Records from "./pages/Records.jsx";
import Exercises from "./pages/Exercises.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import LiveBattle from "./pages/LiveBattle.jsx";
import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";
import ProfileModal from "./components/ProfileModal.jsx";
import SupportModal from "./components/SupportModal.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  getMe,
} from "./api/client";

export function AppShell() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return null;
      const saved = localStorage.getItem(AUTH_USER_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  });

  const [isCheckingAuth, setIsCheckingAuth] = useState(() => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const saved = localStorage.getItem(AUTH_USER_KEY);
      return Boolean(token && !saved);
    } catch {
      return false;
    }
  });

  const [experienceLevel, setExperienceLevel] = useState(
    currentUser?.experience_level || "intermedio"
  );
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const token = (() => {
      try {
        return localStorage.getItem(AUTH_TOKEN_KEY);
      } catch {
        return null;
      }
    })();

    if (!token) {
      setIsCheckingAuth(false);
      return;
    }

    // Verify token validity and refresh user data
    getMe()
      .then((user) => {
        if (!isMounted) return;
        if (user && typeof user === "object") {
          setCurrentUser(user);
          try {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
          } catch (e) {
            console.warn("Error guardando usuario en localStorage:", e);
          }
          if (user.experience_level) setExperienceLevel(user.experience_level);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Sesión no válida o expirada:", err);
        if (err.response?.status === 401) {
          handleLogout();
        }
      })
      .finally(() => {
        if (isMounted) setIsCheckingAuth(false);
      });

    const handleLevelEvt = (e) => {
      if (e?.detail) setExperienceLevel(e.detail);
    };

    const handleProfileEvt = (e) => {
      try {
        if (!e?.detail) return;
        let detail = e.detail;
        if (typeof detail === "string") {
          try {
            detail = JSON.parse(detail);
          } catch {
            return;
          }
        }
        if (detail && typeof detail === "object") {
          setCurrentUser((prev) => (prev ? { ...prev, ...detail } : { ...detail }));
          if (detail.experience_level) setExperienceLevel(detail.experience_level);
        }
      } catch (err) {
        console.warn("Error procesando fittracker:profileChanged en App:", err);
      }
    };

    const handleOpenProfile = () => {
      setIsProfileOpen(true);
    };
    const handleUnauthorized = () => {
      handleLogout();
    };

    window.addEventListener("fittracker:levelChanged", handleLevelEvt);
    window.addEventListener("fittracker:profileChanged", handleProfileEvt);
    window.addEventListener("fittracker:openProfile", handleOpenProfile);
    window.addEventListener("fittracker:unauthorized", handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener("fittracker:levelChanged", handleLevelEvt);
      window.removeEventListener("fittracker:profileChanged", handleProfileEvt);
      window.removeEventListener("fittracker:openProfile", handleOpenProfile);
      window.removeEventListener("fittracker:unauthorized", handleUnauthorized);
    };
  }, [currentUser?.id]);

  const handleLogout = () => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    } catch (e) {
      console.warn("Error eliminando sesión en logout:", e);
    }
    setCurrentUser(null);
  };

  // If initial auth check is running (e.g. token in localStorage without user data)
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#09060E] text-white flex flex-col items-center justify-center p-4 select-none">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#9333EA] to-[#A855F7] text-white shadow-neon animate-pulse mb-4">
          <Dumbbell size={28} />
        </div>
        <div className="flex items-center gap-2 text-[#A855F7]">
          <Loader2 size={20} className="animate-spin" />
          <p className="text-xs sm:text-sm font-bold tracking-wide text-[#A1A1AA]">
            Iniciando FitTracker OLED...
          </p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, render Login view directly
  if (!currentUser) {
    return (
      <Login
        onAuthenticated={(user) => {
          setCurrentUser(user);
          if (user?.experience_level) setExperienceLevel(user.experience_level);
        }}
      />
    );
  }

  const navItems = [
    { to: "/", label: "Entrenar", icon: Dumbbell },
    { to: "/battle", label: "Duelo 1v1", icon: Swords },
    { to: "/analytics", label: "Métricas", icon: TrendingUp },
    { to: "/records", label: "Récords", icon: Trophy },
    { to: "/exercises", label: "Ejercicios", icon: Layers },
    ...(currentUser?.role === "admin"
      ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#09060E] text-white flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#2D1B4E] bg-[#09060E]/95 backdrop-blur-md safe-top">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#9333EA] to-[#A855F7] text-white shadow-neon">
              <Dumbbell size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-wider text-white">
                  FIT<span className="text-[#A855F7]">TRACKER</span>
                </span>
                <span className="rounded-full border border-[#A855F7]/40 bg-[#9333EA]/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#C084FC]">
                  OLED GYM
                </span>
              </div>
              <span className="text-[10px] text-[#A1A1AA] hidden sm:block">
                Cargas &amp; Récords Mobile-First
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Nav */}
            <nav className="hidden sm:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                        isActive
                          ? "border border-[#A855F7]/50 bg-[#1C1433] text-white shadow-neon"
                          : "text-[#A1A1AA] hover:bg-[#140E24] hover:text-white"
                      }`
                    }
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User & Mi Perfil Físico Button */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[#2D1B4E] bg-[#140E24] px-2.5 py-1.5 text-xs text-white hover:border-[#A855F7] hover:bg-[#1C1433] transition active:scale-95"
              title="Mi Perfil Físico (Peso, Altura, Objetivo)"
            >
              <User size={13} className="text-[#A855F7]" />
              <span className="font-bold">{currentUser?.username ?? "Atleta"}</span>
              {currentUser?.bodyweight ? (
                <span className="rounded bg-[#0E0919] px-1.5 py-0.5 text-[10px] font-black text-emerald-400 border border-[#2D1B4E]">
                  {currentUser.bodyweight}kg
                </span>
              ) : null}
              {currentUser?.role === "admin" && (
                <span className="rounded border border-purple-500/40 bg-purple-500/20 px-1 py-0.2 text-[9px] font-black text-[#C084FC]">
                  ADMIN
                </span>
              )}
            </button>

            {/* Profile Level & Goal Button */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#2D1B4E] bg-[#140E24] px-2.5 py-1.5 text-xs font-bold text-[#C084FC] hover:border-[#A855F7] hover:bg-[#1C1433] transition active:scale-95"
              title="Mi Perfil Físico: Peso, Altura y Objetivo"
            >
              <span className="capitalize text-[11px] sm:text-xs">
                {(currentUser?.training_goal ?? "hipertrofia").replace("_", " ")}
              </span>
            </button>

            {/* Help / Support button */}
            <button
              type="button"
              onClick={() => setIsSupportOpen(true)}
              className="inline-flex items-center justify-center rounded-xl border border-[#2D1B4E] bg-[#140E24] p-2 text-xs font-bold text-[#A1A1AA] hover:border-[#A855F7] hover:text-white transition active:scale-95"
              title="Contactar al Administrador / Soporte"
            >
              <HelpCircle size={16} />
            </button>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-xl border border-[#2D1B4E] bg-[#140E24] p-2 text-xs font-bold text-[#71717A] hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 transition active:scale-95"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area protected by ErrorBoundary */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-3 pt-4 pb-28 sm:px-6 sm:pt-6 sm:pb-24">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Workouts />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/battle" element={<LiveBattle />} />
            <Route path="/duelo" element={<LiveBattle />} />
            <Route path="/analytics" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/records" element={<Records />} />
            <Route path="/history" element={<Records defaultTab="history" />} />
            <Route path="/exercises" element={<Exercises />} />
            {currentUser?.role === "admin" && (
              <Route path="/admin" element={<Admin currentUser={currentUser} />} />
            )}
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2D1B4E] bg-[#09060E]/95 backdrop-blur-xl safe-bottom sm:hidden">
        <div
          className={`grid gap-1 px-1.5 py-2 ${
            navItems.length >= 6
              ? "grid-cols-6"
              : navItems.length === 5
              ? "grid-cols-5"
              : "grid-cols-4"
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-bold transition active:scale-95 ${
                    isActive
                      ? "border border-[#A855F7]/40 bg-[#1C1433] text-[#C084FC] shadow-neon"
                      : "text-[#71717A] hover:text-[#A1A1AA]"
                  }`
                }
              >
                <Icon size={18} />
                <span className="text-center leading-tight tracking-tight truncate">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Profile / Experience Level Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentLevel={experienceLevel}
        onLevelChange={(lvl) => setExperienceLevel(lvl)}
        userProfile={currentUser}
      />

      {/* Support / Contact Admin Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        initialUsername={currentUser?.username ?? ""}
        initialEmail={currentUser?.email ?? ""}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
