import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  Dumbbell,
  HelpCircle,
  Home,
  Layers,
  Loader2,
  LogOut,
  Pill,
  Scale,
  ShieldCheck,
  Swords,
  TrendingUp,
  Trophy,
  User,
  Utensils,
  X,
} from "lucide-react";
import "./index.css";
import Dashboard from "./pages/Dashboard.jsx";
import Bitacora from "./pages/Bitacora.jsx";
import Nutrition from "./pages/Nutrition.jsx";
import Suplements from "./pages/Suplements.jsx";
import Workouts from "./pages/Workouts.jsx";
import Routines from "./pages/Routines.jsx";
import Records from "./pages/Records.jsx";
import Exercises from "./pages/Exercises.jsx";
import Metrics from "./pages/Metrics.jsx";
import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";
import Navbar from "./components/Navbar.jsx";
import CheckInModal from "./components/CheckInModal.jsx";
import ProfileModal from "./components/ProfileModal.jsx";
import SupportModal from "./components/SupportModal.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Toast, { showToast } from "./components/Toast.jsx";
import { WorkoutProvider } from "./context/WorkoutContext.jsx";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  getMe,
  getRecords,
} from "./api/client";
import { getUserGlobalStrengthRank } from "./utils/strengthRanks";
import { syncCatalogCache, isOnline } from "./services/exerciseCache";

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [userRecords, setUserRecords] = useState([]);
  const [rankUpToast, setRankUpToast] = useState(null);
  const [gymTimerText, setGymTimerText] = useState("");

  useEffect(() => {
    const checkTimer = () => {
      const userStartedKey = currentUser?.id
        ? `fittracker_session_started_at_${currentUser.id}`
        : "fittracker_session_started_at";
      const raw = localStorage.getItem(userStartedKey) || localStorage.getItem("fittracker_session_started_at");
      if (!raw) {
        setGymTimerText("");
        return;
      }
      const startedAt = parseInt(raw, 10);
      if (!startedAt || isNaN(startedAt)) {
        setGymTimerText("");
        return;
      }
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      setGymTimerText(`⏱️ ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    const handleTimerEvt = () => checkTimer();
    window.addEventListener("fittracker:sessionTimerChanged", handleTimerEvt);
    window.addEventListener("storage", handleTimerEvt);
    return () => {
      clearInterval(interval);
      window.removeEventListener("fittracker:sessionTimerChanged", handleTimerEvt);
      window.removeEventListener("storage", handleTimerEvt);
    };
  }, [currentUser?.id]);

  // Guarda la ruta solicitada antes de redirigir si no hay sesión activa
  useEffect(() => {
    if (!currentUser && !isCheckingAuth) {
      const path = location.pathname;
      if (path && path !== "/" && path !== "/login") {
        localStorage.setItem("fittracker_redirect", path + (location.search || ""));
      }
    }
  }, [currentUser, isCheckingAuth, location.pathname, location.search]);

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
        }
      } catch (err) {
        console.warn("Error procesando fittracker:profileChanged en App:", err);
      }
    };


    const handleOpenProfile = () => {
      setIsProfileOpen(true);
    };
    const handleOpenCheckIn = () => {
      setIsCheckInOpen(true);
    };
    const handleUnauthorized = () => {
      handleLogout();
    };
    const handleRequestLogout = () => {
      setIsLogoutConfirmOpen(true);
    };

    window.addEventListener("fittracker:profileChanged", handleProfileEvt);
    window.addEventListener("fittracker:openProfile", handleOpenProfile);
    window.addEventListener("fittracker:openCheckIn", handleOpenCheckIn);
    window.addEventListener("fittracker:unauthorized", handleUnauthorized);
    window.addEventListener("fittracker:requestLogout", handleRequestLogout);

    return () => {
      isMounted = false;
      window.removeEventListener("fittracker:profileChanged", handleProfileEvt);
      window.removeEventListener("fittracker:openProfile", handleOpenProfile);
      window.removeEventListener("fittracker:openCheckIn", handleOpenCheckIn);
      window.removeEventListener("fittracker:unauthorized", handleUnauthorized);
      window.removeEventListener("fittracker:requestLogout", handleRequestLogout);
    };
  }, [currentUser?.id]);
 
  // Load records for User Global Strength Rank calculation
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    const fetchUserRecords = () => {
      getRecords()
        .then((recs) => {
          if (isMounted) {
            const safeRecs = Array.isArray(recs)
              ? recs
              : recs && typeof recs === "object"
              ? Object.values(recs)
              : [];
            setUserRecords(safeRecs);
          }
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

  // Sincronización proactiva del catálogo de ejercicios al iniciar la app
  useEffect(() => {
    if (isOnline()) {
      syncCatalogCache().catch(() => {});
    }
  }, []);

  // Global Strength Rank (with safe fallback for bodyweight: currentUser?.bodyweight || 75)
  const globalRank = useMemo(() => {
    const bw = currentUser?.bodyweight || 75;
    return getUserGlobalStrengthRank(userRecords, bw);
  }, [userRecords, currentUser?.bodyweight]);

  const handleLogout = () => {
    try {
      const currentPath = window.location.pathname;
      if (currentPath && currentPath !== "/" && currentPath !== "/login") {
        localStorage.setItem("fittracker_redirect", currentPath);
      }
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);

      // Limpiar inmediatamente cualquier clave de sesión activa residual del navegador
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key && (
            key.startsWith("fittracker_active_session") ||
            key.startsWith("fittracker_session_started_at") ||
            key.startsWith("active_workout") ||
            key === "active_workout" ||
            key === "fittracker_active_battle_id" ||
            key === "fittracker_active_rest_timer"
          )
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
    } catch (e) {
      console.warn("Error eliminando sesión en logout:", e);
    }
    setCurrentUser(null);
    setGymTimerText("");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fittracker:sessionTimerChanged", { detail: null }));
      window.dispatchEvent(new CustomEvent("fittracker:logout"));
    }
  };

  const handleUserAuthenticated = (user) => {
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fittracker:login", { detail: user }));
    }

    const redirectPath = localStorage.getItem("fittracker_redirect");
    if (redirectPath) {
      localStorage.removeItem("fittracker_redirect");
      navigate(redirectPath, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  // If initial auth check is running (e.g. token in localStorage without user data)
  if (isCheckingAuth) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col items-center justify-center p-4 select-none">
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
      <>
        <Login onAuthenticated={handleUserAuthenticated} />
        <Toast />
      </>
    );
  }

  const isAdmin = Boolean(
    currentUser?.is_admin === true ||
    currentUser?.is_admin === 1 ||
    currentUser?.role === "admin"
  );

  const desktopNavItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/train", label: "Train (Bitácora)", icon: Dumbbell },
    { to: "/nutri", label: "Nutri", icon: Utensils },
    { to: "/suple", label: "Suple", icon: Pill },
    { to: "/metrics", label: "Métricas", icon: TrendingUp },
    { to: "/records", label: "Récords", icon: Trophy },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col w-full overflow-x-hidden">
      {/* Top Navbar with Clean Flat OLED Border */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-9 h-9 drop-shadow-none">
              <defs>
                {/* Definición del degradado para el borde */}
                <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF5722" />
                  <stop offset="100%" stopColor="#7C4DFF" />
                </linearGradient>
              </defs>
              
              {/* Fondo negro OLED con borde fino en degradado */}
              <rect x="0.5" y="0.5" width="99" height="99" rx="24" fill="#050505" stroke="url(#borderGradient)" strokeWidth="1.5" />
              
              {/* Pesita Inclinada en Naranja Ladrillo Sólido */}
              <g transform="rotate(-45 50 50)">
                <rect x="35" y="46" width="30" height="8" rx="2" fill="#FF5722" />
                <rect x="24" y="28" width="10" height="44" rx="3" fill="#FF5722" />
                <rect x="66" y="28" width="10" height="44" rx="3" fill="#FF5722" />
                <rect x="14" y="36" width="8" height="28" rx="2" fill="#FF5722" />
                <rect x="78" y="36" width="8" height="28" rx="2" fill="#FF5722" />
              </g>
            </svg>
            <span className="text-white font-bold tracking-tight text-xl">FitTracker</span>
          </div>

          <div className="flex items-center gap-2">
            {gymTimerText && (
              <NavLink
                to="/workouts"
                className="flex items-center gap-1.5 rounded-full border border-[#FF5722]/40 bg-[#1C1C1E] px-2.5 py-1 text-xs font-mono font-bold text-white shadow-sm hover:border-[#FF5722] transition"
                title="Sesión de gimnasio activa. Clic para volver a la sesión."
              >
                <span className="text-[#FF5722] animate-pulse">⏱️</span>
                <span>{gymTimerText.replace(/^⏱️\s*/, "")}</span>
              </NavLink>
            )}

            {/* Botón Destacado Admin Panel en Navbar para Administradores */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="flex items-center gap-1.5 bg-[#1C1C1E] border border-[#FF5722]/40 text-[#FF5722] text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#FF5722]/15 transition active:scale-95 cursor-pointer shadow-md shadow-[#FF5722]/10"
                title="Panel de Control de Administrador"
              >
                <span>🛡️</span>
                <span>Admin Panel</span>
              </button>
            )}

            {/* Desktop Nav: [ HOME | TRAIN | NUTRI | SUPLE | MÉTRICAS | RÉCORDS ] */}
            <nav className="hidden lg:flex items-center gap-1">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                          : "text-[#8E8E93] hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              {/* Botón Rápido Check-In Periódico */}
              <button
                type="button"
                onClick={() => setIsCheckInOpen(true)}
                className="flex items-center gap-1.5 rounded-2xl border border-white/5 bg-[#1C1C1E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2C2C2E] transition active:scale-95 cursor-pointer"
                title="Control Biométrico & Check-In Periódico"
              >
                <Scale size={14} className="text-[#FF5722]" />
                <span>Check-In</span>
              </button>

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
                borderColor: `${globalRank?.color || "#CD7F32"}40`,
                backgroundColor: `${globalRank?.color || "#CD7F32"}15`,
                color: globalRank?.color || "#CD7F32",
              }}
              title={`Rango Global de Fuerza: ${globalRank?.name || "Liga Bronce"} (${globalRank?.ratio || 0}× peso corporal)`}
            >
              <span className="text-sm leading-none">{globalRank?.icon || "🥉"}</span>
              <span className="truncate max-w-[70px] sm:max-w-none">{globalRank?.name || "Liga Bronce"}</span>
              {(globalRank?.ratio || 0) > 0 && (
                <span className="hidden md:inline rounded bg-black/40 px-1 py-0.2 text-[10px] font-semibold lowercase opacity-90">
                  {globalRank?.ratio}×
                </span>
              )}
            </button>

            {/* Logout button */}
            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl border border-white/5 bg-[#1C1C1E] p-2 text-xs font-semibold text-[#8E8E93] hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition active:scale-95 cursor-pointer"
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
      <main className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl flex-1 px-3 sm:px-6 pt-4 pb-32">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard currentUser={currentUser} />} />
            <Route path="/train" element={<Bitacora currentUser={currentUser} />} />
            <Route path="/bitacora" element={<Bitacora currentUser={currentUser} />} />
            <Route path="/workouts" element={<Workouts currentUser={currentUser} />} />
            <Route path="/routines" element={<Routines />} />
            <Route path="/nutri" element={<Nutrition currentUser={currentUser} />} />
            <Route path="/nutrition" element={<Nutrition currentUser={currentUser} />} />
            <Route path="/suple" element={<Suplements currentUser={currentUser} />} />
            <Route path="/supplements" element={<Suplements currentUser={currentUser} />} />
            <Route path="/metrics" element={<Metrics currentUser={currentUser} />} />
            <Route path="/analytics" element={<Metrics currentUser={currentUser} />} />
            <Route path="/dashboard" element={<Dashboard currentUser={currentUser} />} />
            <Route path="/records" element={<Records />} />
            <Route path="/history" element={<Records defaultTab="history" />} />
            <Route path="/exercises" element={<Exercises />} />
            {isAdmin && (
              <Route path="/admin" element={<Admin currentUser={currentUser} />} />
            )}
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation Bar: Flat OLED [ HOME | TRAIN (Bitácora) | NUTRI | SUPLE | PERFIL ] */}
      <div className="lg:hidden">
        <Navbar
          currentUser={currentUser}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      </div>

      {/* Periodic Check-Ins Modal */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        currentUser={currentUser}
        onCheckinSaved={(updatedBio) => {
          setCurrentUser((prev) => (prev ? { ...prev, ...updatedBio } : updatedBio));
          try {
            const saved = localStorage.getItem(AUTH_USER_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ ...parsed, ...updatedBio }));
            }
          } catch {}
        }}
      />

      {/* Profile Biometrics Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userProfile={currentUser}
        onRequestLogout={() => setIsLogoutConfirmOpen(true)}
        onOpenMasterPanel={() => {
          setIsProfileOpen(false);
          navigate("/admin");
        }}
      />


      {/* Support / Contact Admin Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        initialUsername={currentUser?.username ?? ""}
        initialEmail={currentUser?.email ?? ""}
      />

      {/* Modal de Confirmación de Cierre de Sesión */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#1C1C1E] p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 text-center space-y-4 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
              <LogOut size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">¿Cerrar sesión?</h3>
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Tendrás que ingresar tus credenciales para volver a entrar.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="bg-[#2C2C2E] text-white rounded-xl px-4 py-2.5 text-xs font-semibold hover:bg-[#3A3A3C] transition active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  handleLogout();
                }}
                className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-5 py-2.5 font-semibold text-xs transition active:scale-95 shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Global Toast */}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkoutProvider>
        <AppShell />
      </WorkoutProvider>
    </ErrorBoundary>
  );
}
