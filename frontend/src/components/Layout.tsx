import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart,
  Calendar,
  Dumbbell,
  Home,
  Layers,
  ListFilter,
  LogOut,
  Scale,
  User,
  Utensils,
} from "lucide-react";
import FloatingBottomNav from "./FloatingBottomNav";
import { ThemeToggle } from "../context/ThemeContext";

interface LayoutProps {
  currentUser: any;
  globalRank?: {
    icon?: string;
    name?: string;
  };
  gymTimerText?: string;
  isAdmin?: boolean;
  onOpenCheckIn: () => void;
  onOpenProfile: () => void;
  onRequestLogout: () => void;
  children: React.ReactNode;
}

const DESKTOP_NAV_ITEMS = [
  {
    id: "home",
    label: "Inicio",
    to: "/",
    icon: Home,
    matchPaths: ["/", "/dashboard"],
  },
  {
    id: "plans",
    label: "Planes",
    to: "/train",
    icon: Calendar,
    matchPaths: ["/train", "/bitacora"],
  },
  {
    id: "routines",
    label: "Rutinas",
    to: "/routines",
    icon: Layers,
    matchPaths: ["/routines"],
  },
  {
    id: "exercises",
    label: "Ejercicios",
    to: "/exercises",
    icon: ListFilter,
    matchPaths: ["/exercises", "/ejercicios"],
  },
  {
    id: "records",
    label: "Registros",
    to: "/records",
    icon: BarChart,
    matchPaths: ["/records", "/registros", "/history", "/metrics", "/analytics"],
  },
  {
    id: "nutrition",
    label: "Nutrición",
    to: "/nutri",
    icon: Utensils,
    matchPaths: ["/nutri", "/nutrition", "/suple", "/supplements"],
  },
];

export default function Layout({
  currentUser,
  globalRank,
  gymTimerText,
  isAdmin,
  onOpenCheckIn,
  onOpenProfile,
  onRequestLogout,
  children,
}: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isDesktopNavActive = (item: (typeof DESKTOP_NAV_ITEMS)[0]) => {
    if (item.to === "/") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return item.matchPaths.some(
      (path) => path !== "/" && location.pathname.startsWith(path)
    );
  };

  const isWorkoutOrCatalog =
    location.pathname.startsWith("/workouts") ||
    location.pathname.startsWith("/exercises") ||
    location.pathname.startsWith("/ejercicios");

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#F8FAFC] dark:bg-[#05070B] text-[#0F172A] dark:text-[#F8FAFC] overflow-x-hidden md:min-h-screen md:overflow-y-visible relative selection:bg-red-500 selection:text-white transition-colors duration-200">
      {/* Fondo ambiental sutil en PC (gradiente radial difuminado de baja intensidad) */}
      <div
        aria-hidden="true"
        className="hidden md:block pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_20%,rgba(239,68,68,0.06)_0%,transparent_75%)] z-0"
      />

      {/* Gradiente de luz superior en mobile */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 right-0 w-72 h-72 rounded-full bg-gradient-to-bl from-[#EF4444]/[0.06] dark:from-[#EF4444]/[0.08] via-slate-400/[0.04] dark:via-slate-900/[0.1] to-transparent blur-3xl z-0 md:hidden"
      />

      {/* ========================================================= */}
      {/* 1. BARRA DE NAVEGACIÓN SUPERIOR FIJA DE ESCRITORIO (md / lg) */}
      {/* ========================================================= */}
      <header className="hidden md:flex w-full sticky top-0 z-40 bg-[#F8FAFC]/90 dark:bg-[#05070B]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/5 px-8 py-4 shrink-0 transition-colors duration-200">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo y Rango Global */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs border border-red-100/60 dark:border-red-900/30 group-hover:scale-105 transition-transform">
              <Dumbbell size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[#0F172A] dark:text-[#F8FAFC] font-extrabold tracking-tight text-xl leading-none">
                  FiTracker
                </span>
                <span className="rounded-full border border-red-500/20 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  PRO
                </span>
              </div>
              <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mt-0.5 block">
                {globalRank?.icon || "🥉"} {globalRank?.name || "Liga Bronce"}
              </span>
            </div>
          </div>

          {/* Links de Navegación de Escritorio */}
          <nav
            aria-label="Navegación principal de escritorio"
            className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-[#0E131F]/90 p-1.5 rounded-full border border-slate-200/60 dark:border-white/[0.07] backdrop-blur-md shadow-xs"
          >
            {DESKTOP_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = isDesktopNavActive(item);

              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.to === "/"}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                      : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-slate-200/60 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Acciones Rápidas de Escritorio */}
          <div className="flex items-center gap-2">
            {gymTimerText && (
              <NavLink
                to="/workouts"
                className="flex items-center gap-1.5 rounded-full border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 px-3.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-950/70 shadow-xs"
                title="Sesión de gimnasio activa. Clic para volver a la sesión."
              >
                <span className="animate-pulse">⏱️</span>
                <span>{gymTimerText.replace(/^⏱️\s*/, "")}</span>
              </NavLink>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="flex items-center gap-1.5 bg-[#FFFFFF] dark:bg-[#0E131F] border border-[#F1F5F9] dark:border-white/[0.07] text-red-600 dark:text-red-400 text-xs font-bold px-3.5 py-2 rounded-full shadow-xs hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95 cursor-pointer"
                title="Panel de Control de Administrador"
              >
                <span>🛡️</span>
                <span>Admin</span>
              </button>
            )}

            <ThemeToggle variant="icon" />

            <button
              type="button"
              onClick={onOpenCheckIn}
              className="w-10 h-10 rounded-2xl bg-[#FFFFFF] dark:bg-[#0E131F] border border-[#F1F5F9] dark:border-white/[0.07] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer"
              title="Control Biométrico & Check-In Periódico"
              aria-label="Check-In"
            >
              <Scale size={18} />
            </button>

            <button
              type="button"
              onClick={onOpenProfile}
              className="h-10 px-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-transparent dark:border-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-2 text-xs font-bold transition active:scale-95 cursor-pointer"
              title={`Mi Perfil (${currentUser?.bodyweight || 75} kg)`}
            >
              <User size={16} />
              <span>{currentUser?.username || "Perfil"}</span>
            </button>

            <button
              type="button"
              onClick={onRequestLogout}
              className="w-10 h-10 rounded-2xl bg-[#FFFFFF] dark:bg-[#0E131F] border border-[#F1F5F9] dark:border-white/[0.07] text-[#64748B] dark:text-[#94A3B8] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. BARRA DE NAVEGACIÓN SUPERIOR MÓVIL (< 768px)           */}
      {/* ========================================================= */}
      <header className="flex md:hidden items-center justify-between px-4 pt-4 mb-4 shrink-0 relative z-20">
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs border border-red-100/60 dark:border-red-900/30">
            <Dumbbell size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[#0F172A] dark:text-[#F8FAFC] font-extrabold tracking-tight text-lg leading-none block">
              FiTracker
            </span>
            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
              {globalRank?.icon || "🥉"} {globalRank?.name || "Liga Bronce"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {gymTimerText && (
            <NavLink
              to="/workouts"
              className="flex items-center gap-1 rounded-full border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 text-xs font-mono font-bold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-950/70"
              title="Sesión de gimnasio activa. Clic para volver a la sesión."
            >
              <span className="animate-pulse">⏱️</span>
              <span>{gymTimerText.replace(/^⏱️\s*/, "")}</span>
            </NavLink>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#0E131F] border border-[#F1F5F9] dark:border-white/[0.07] text-red-600 dark:text-red-400 text-xs font-bold px-3 py-2 rounded-full shadow-xs hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95 cursor-pointer"
              title="Panel de Control de Administrador"
            >
              <span>🛡️</span>
              <span className="hidden xs:inline">Admin</span>
            </button>
          )}

          <ThemeToggle variant="icon" />

          <button
            type="button"
            onClick={onOpenCheckIn}
            className="w-10 h-10 rounded-2xl bg-[#FFFFFF] dark:bg-[#0E131F] border border-[#F1F5F9] dark:border-white/[0.07] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer"
            title="Control Biométrico & Check-In Periódico"
            aria-label="Check-In"
          >
            <Scale size={18} />
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-transparent dark:border-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center transition active:scale-95 cursor-pointer"
            title={`Mi Perfil (${currentUser?.bodyweight || 75} kg)`}
            aria-label="Perfil"
          >
            <User size={18} />
          </button>

          <button
            type="button"
            onClick={onRequestLogout}
            className="w-10 h-10 rounded-2xl bg-[#FFFFFF] dark:bg-[#0E131F] border border-[#F1F5F9] dark:border-white/[0.07] text-[#64748B] dark:text-[#94A3B8] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 3. CONTENIDO PRINCIPAL SCROLLEABLE Y RESPONSIVO            */}
      {/* ========================================================= */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pt-1 pb-32 md:pb-12 md:px-8 relative z-10 flex flex-col">
        {children}
      </main>

      {/* ========================================================= */}
      {/* 4. BARRA DE NAVEGACIÓN FLOTANTE INFERIOR (Solo Mobile)    */}
      {/* ========================================================= */}
      {!isWorkoutOrCatalog && (
        <div className="md:hidden">
          <FloatingBottomNav />
        </div>
      )}
    </div>
  );
}
