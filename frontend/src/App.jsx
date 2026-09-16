import React, { useEffect, useMemo, useState } from "react";
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
import Metrics from "./pages/Metrics.jsx";
import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";
import ProfileModal from "./components/ProfileModal.jsx";
import SupportModal from "./components/SupportModal.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  getMe,
  getRecords,
} from "./api/client";
import { getUserGlobalStrengthRank } from "./utils/strengthRanks";

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
  const [userRecords, setUserRecords] = useState([]);
  const [rankUpToast, setRankUpToast] = useState(null);

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
 
  // Load records for User Global Strength Rank calculation
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    const fetchUserRecords = () => {
      getRecords()
        .then((recs) => {
          if (isMounted) setUserRecords(recs || []);
        })
        .catch(() => {});
    };

    fetchUserRecords();

    const handleRecordUpdated = () => fetchUserRecords();
    const handleWorkoutSaved = () => fetchUserRecords();
    const handleRankUp = (e) => {
      if (e?.detail) {
        setRankUpToast(e.detail);
        fetchUserRecords();
        setTimeout(() => setRankUpToast(null), 5000);
      }
    };

    window.addEventListener("fittracker:recordUpdated", handleRecordUpdated);
    window.addEventListener("fittracker:workoutSaved", handleWorkoutSaved);
    window.addEventListener("fittracker:rankUp", handleRankUp);

    return () => {
      isMounted = false;
      window.removeEventListener("fittracker:recordUpdated", handleRecordUpdated);
      window.removeEventListener("fittracker:workoutSaved", handleWorkoutSaved);
      window.removeEventListener("fittracker:rankUp", handleRankUp);
    };
  }, [currentUser?.id]);

  // Global Strength Rank (with safe fallback for bodyweight: currentUser?.bodyweight || 75)
  const globalRank = useMemo(() => {
    const bw = currentUser?.bodyweight || 75;
    return getUserGlobalStrengthRank(userRecords, bw);
  }, [userRecords, currentUser?.bodyweight]);

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
      <div className="min-h-[100dvh] bg-[#000000] text-white flex flex-col items-center justify-center p-4 select-none">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white animate-pulse mb-4">
          <Dumbbell size={28} />
        </div>
        <div className="flex items-center gap-2 text-[#FF5722]">
          <Loader2 size={20} className="animate-spin" />
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#8E8E93]">
            Iniciando FitTracker...
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
    { to: "/metrics", label: "Métricas", icon: TrendingUp },
    { to: "/records", label: "Récords", icon: Trophy },
    ...(currentUser?.role === "admin"
      ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="min-h-[100dvh] bg-[#000000] text-white flex flex-col w-full overflow-x-hidden">
      {/* Top Navbar with Clean Flat OLED Border */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#000000]/90 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white">
              <Dumbbell size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-white">
                  FIT<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5722] to-[#7C4DFF]">TRACKER</span>
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#8E8E93]">
                  OLED
                </span>
              </div>
              <span className="text-[10px] text-[#8E8E93] hidden sm:block">
                Hipertrofia &amp; Sobrecarga Progresiva
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Nav: [Entrenar | Métricas | Récords | Perfil (Peso)] */}
            <nav className="hidden sm:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                          : "text-[#8E8E93] hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              {/* Perfil (Peso) Button */}
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-1.5 rounded-2xl border border-white/5 bg-[#1C1C1E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2C2C2E] transition active:scale-95"
                title="Mi Perfil y Peso Corporal"
              >
                <User size={14} className="text-[#FF5722]" />
                <span>Perfil ({currentUser?.bodyweight || 75} kg)</span>
              </button>
            </nav>

            {/* Global Strength Rank OLED Chip */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border transition active:scale-95 cursor-pointer"
              style={{
                borderColor: `${globalRank.color}40`,
                backgroundColor: `${globalRank.color}15`,
                color: globalRank.color,
              }}
              title={`Rango Global de Fuerza: ${globalRank.name} (${globalRank.ratio}× peso corporal)`}
            >
              <span className="text-sm leading-none">{globalRank.icon}</span>
              <span className="truncate max-w-[70px] sm:max-w-none">{globalRank.name}</span>
              {globalRank.ratio > 0 && (
                <span className="hidden md:inline rounded bg-black/40 px-1 py-0.2 text-[10px] font-semibold lowercase opacity-90">
                  {globalRank.ratio}×
                </span>
              )}
            </button>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-2xl border border-white/5 bg-[#1C1C1E] p-2 text-xs font-semibold text-[#8E8E93] hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition active:scale-95"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
 
      {/* Micro-notificación de subida de rango */}
      {rankUpToast && (
        <div
          className="fixed top-16 sm:top-20 inset-x-4 max-w-md mx-auto z-50 rounded-3xl border border-white/10 bg-[#1C1C1E]/95 p-3.5 backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 flex items-center justify-between gap-3 select-none"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg flex-shrink-0"
              style={{
                backgroundColor: `${rankUpToast.rankColor || "#FF5722"}20`,
                border: `1px solid ${rankUpToast.rankColor || "#FF5722"}50`,
              }}
            >
              ⚡
            </div>
            <div>
              <div
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: rankUpToast.rankColor || "#FF5722" }}
              >
                ⚡ Subida de Rango
              </div>
              <p className="text-xs font-semibold text-white">
                Has alcanzado el rango{" "}
                <span
                  className="uppercase font-bold"
                  style={{ color: rankUpToast.rankColor || "#FF5722" }}
                >
                  {rankUpToast.rankName}
                </span>{" "}
                en {rankUpToast.exerciseName || "este ejercicio"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRankUpToast(null)}
            className="text-[#8E8E93] hover:text-white p-1 transition"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Content Area protected by ErrorBoundary */}
      <main className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl flex-1 px-3 sm:px-6 py-4">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Workouts />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/analytics" element={<Metrics />} />
            <Route path="/dashboard" element={<Metrics />} />
            <Route path="/records" element={<Records />} />
            <Route path="/history" element={<Records defaultTab="history" />} />
            <Route path="/exercises" element={<Exercises />} />
            {currentUser?.role === "admin" && (
              <Route path="/admin" element={<Admin currentUser={currentUser} />} />
            )}
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation Bar: [Entrenar | Métricas | Récords | Perfil (Peso)] */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2C2C2E] bg-[#000000]/95 backdrop-blur-xl bottom-nav-safe sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-4 gap-1 px-1.5 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-semibold transition active:scale-95 ${
                    isActive
                      ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                      : "text-[#8E8E93] hover:text-white"
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

          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-semibold text-[#8E8E93] hover:text-white transition active:scale-95"
            title="Mi Perfil y Peso Corporal"
          >
            <User size={18} className="text-[#FF5722]" />
            <span className="text-center leading-tight tracking-tight truncate">
              Perfil ({currentUser?.bodyweight || 75}kg)
            </span>
          </button>
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
