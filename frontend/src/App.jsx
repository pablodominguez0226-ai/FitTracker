import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Dumbbell,
  Loader2,
  LogOut,
  Scale,
  User,
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
import ExerciseDetailView from "./components/ExerciseDetailView.jsx";
import Metrics from "./pages/Metrics.jsx";
import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";
import FloatingBottomNav from "./components/FloatingBottomNav.jsx";
import Layout from "./components/Layout.jsx";
import CheckInModal from "./components/CheckInModal.jsx";
import ProfileModal from "./components/ProfileModal.jsx";
import SupportModal from "./components/SupportModal.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Toast from "./components/Toast.jsx";
import { WorkoutProvider } from "./context/WorkoutContext.jsx";
import { ThemeProvider, ThemeToggle } from "./context/ThemeContext.jsx";
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
      return parsed && typeof parsed === "object"
        ? { weeklyGoalDays: parsed.weeklyGoalDays ?? parsed.weekly_goal_days ?? 4, ...parsed }
        : null;
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
          const userWithDefaults = {
            weeklyGoalDays: user.weeklyGoalDays ?? user.weekly_goal_days ?? 4,
            ...user,
          };
          setCurrentUser(userWithDefaults);
          try {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userWithDefaults));
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
    window.addEventListener("fittracker:workoutUpdated", handleWorkoutSaved);
    window.addEventListener("fittracker:workoutDeleted", handleWorkoutSaved);
    window.addEventListener("fittracker:rankUp", handleRankUp);

    return () => {
      isMounted = false;
      window.removeEventListener("fittracker:recordUpdated", handleRecordUpdated);
      window.removeEventListener("fittracker:workoutSaved", handleWorkoutSaved);
      window.removeEventListener("fittracker:workoutUpdated", handleWorkoutSaved);
      window.removeEventListener("fittracker:workoutDeleted", handleWorkoutSaved);
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
      <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#05070B] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col items-center justify-center p-4 select-none transition-colors duration-200 md:bg-[#020408]">
        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center animate-pulse mb-4 shadow-bento">
          <Dumbbell size={24} />
        </div>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <Loader2 size={18} className="animate-spin" />
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#64748B] dark:text-[#94A3B8]">
            Iniciando FiTracker...
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

  return (
    <Layout
      currentUser={currentUser}
      globalRank={globalRank}
      gymTimerText={gymTimerText}
      isAdmin={isAdmin}
      onOpenCheckIn={() => setIsCheckInOpen(true)}
      onOpenProfile={() => setIsProfileOpen(true)}
      onRequestLogout={() => setIsLogoutConfirmOpen(true)}
    >
      {/* Micro-notificación de subida de rango */}
      {rankUpToast && (
        <div className="fixed top-6 inset-x-4 max-w-md mx-auto z-50 rounded-3xl border border-[#F1F5F9] dark:border-white/[0.07] bg-[#FFFFFF]/95 dark:bg-[#0E131F]/95 p-4 backdrop-blur-md shadow-lg animate-in slide-in-from-top-4 duration-300 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-lg flex-shrink-0">
              ⚡
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                ⚡ Subida de Rango
              </div>
              <p className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Has alcanzado el rango{" "}
                <span className="uppercase font-extrabold text-red-600 dark:text-red-400">
                  {rankUpToast.rankName}
                </span>{" "}
                en {rankUpToast.exerciseName || "este ejercicio"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRankUpToast(null)}
            className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] p-1 transition"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Contenido scrolleable interno */}
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
          <Route path="/registros" element={<Records />} />
          <Route path="/history" element={<Records defaultTab="history" />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/ejercicios" element={<Exercises />} />
          <Route path="/exercises/:id" element={<ExerciseDetailView />} />
          <Route path="/ejercicios/:id" element={<ExerciseDetailView />} />
          {isAdmin && (
            <Route path="/admin" element={<Admin currentUser={currentUser} />} />
          )}
        </Routes>
      </ErrorBoundary>

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
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto select-none animate-in fade-in duration-150">
          <div className="w-full max-w-sm md:max-w-md rounded-t-3xl sm:rounded-2xl border border-[#F1F5F9] dark:border-white/10 bg-[#FFFFFF] dark:bg-[#0E131F] p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 text-center space-y-4 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 md:my-auto">
            <div className="mx-auto w-10 h-10 rounded-2xl flex items-center justify-center bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <LogOut size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">¿Cerrar sesión?</h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                Tendrás que ingresar tus credenciales para volver a entrar.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="h-11 px-5 text-sm font-semibold rounded-full border border-[#F1F5F9] dark:border-white/[0.07] bg-[#F8FAFC] dark:bg-[#05070B] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#161B26] transition active:scale-95 cursor-pointer flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  handleLogout();
                }}
                className="h-11 px-5 text-sm font-bold rounded-full bg-red-600 hover:bg-red-700 active:bg-[#B91C1C] text-white transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer flex-1"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Global Toast */}
      <Toast />
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WorkoutProvider>
          <AppShell />
        </WorkoutProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
