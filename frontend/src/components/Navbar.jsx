import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Dumbbell, Home, Pill, User, Utensils } from "lucide-react";

/**
 * Navbar.jsx - Barra de Navegación Global Inferior (Móvil)
 * Filosofía Flat OLED:
 * - Fondo: #050505
 * - Contenedores: #121212
 * - Bordes: #2C2C2E
 * - Acentos degradados: #FF5722 a #7C4DFF
 * 5 accesos directos: [ HOME | TRAIN (Bitácora) | NUTRI | SUPLE | PERFIL ]
 */
export default function Navbar({ onOpenProfile, currentUser }) {
  const location = useLocation();

  const isTrainActive =
    location.pathname === "/train" ||
    location.pathname === "/bitacora" ||
    location.pathname === "/workouts";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-2xl border-t border-[#2C2C2E] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 select-none"
      role="navigation"
      aria-label="Navegación principal móvil"
    >
      <div className="mx-auto max-w-md md:max-w-xl grid grid-cols-5 items-center px-2 gap-1">
        {/* 1. HOME */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition duration-150 active:scale-95 group ${
              isActive
                ? "bg-[#121212] border border-[#2C2C2E] text-white shadow-sm"
                : "text-[#8E8E93] hover:text-white"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${
                  isActive
                    ? "bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white shadow-md shadow-[#FF5722]/20"
                    : "text-[#8E8E93] group-hover:text-white"
                }`}
              >
                <Home size={17} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight mt-1 truncate ${
                  isActive ? "text-white font-bold" : "text-[#8E8E93]"
                }`}
              >
                HOME
              </span>
            </>
          )}
        </NavLink>

        {/* 2. TRAIN (Bitácora) */}
        <NavLink
          to="/train"
          className={() =>
            `flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition duration-150 active:scale-95 group relative ${
              isTrainActive
                ? "bg-[#121212] border border-[#2C2C2E] text-white shadow-sm"
                : "text-[#8E8E93] hover:text-white"
            }`
          }
        >
          {() => (
            <>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-xl transition relative ${
                  isTrainActive
                    ? "bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white shadow-md shadow-[#FF5722]/20"
                    : "text-[#8E8E93] group-hover:text-white"
                }`}
              >
                <Dumbbell size={17} strokeWidth={isTrainActive ? 2.5 : 2} />
                <span className="absolute -top-1 -right-1 text-[9px]">⚡</span>
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight mt-1 truncate ${
                  isTrainActive ? "text-white font-bold" : "text-[#8E8E93]"
                }`}
              >
                TRAIN
              </span>
            </>
          )}
        </NavLink>

        {/* 3. NUTRI */}
        <NavLink
          to="/nutri"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition duration-150 active:scale-95 group ${
              isActive
                ? "bg-[#121212] border border-[#2C2C2E] text-white shadow-sm"
                : "text-[#8E8E93] hover:text-white"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${
                  isActive
                    ? "bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white shadow-md shadow-[#FF5722]/20"
                    : "text-[#8E8E93] group-hover:text-white"
                }`}
              >
                <Utensils size={17} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight mt-1 truncate ${
                  isActive ? "text-white font-bold" : "text-[#8E8E93]"
                }`}
              >
                NUTRI
              </span>
            </>
          )}
        </NavLink>

        {/* 4. SUPLE */}
        <NavLink
          to="/suple"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition duration-150 active:scale-95 group ${
              isActive
                ? "bg-[#121212] border border-[#2C2C2E] text-white shadow-sm"
                : "text-[#8E8E93] hover:text-white"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${
                  isActive
                    ? "bg-gradient-to-tr from-[#FF5722] to-[#7C4DFF] text-white shadow-md shadow-[#FF5722]/20"
                    : "text-[#8E8E93] group-hover:text-white"
                }`}
              >
                <Pill size={17} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight mt-1 truncate ${
                  isActive ? "text-white font-bold" : "text-[#8E8E93]"
                }`}
              >
                SUPLE
              </span>
            </>
          )}
        </NavLink>

        {/* 5. PERFIL */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition duration-150 active:scale-95 group hover:bg-white/5 cursor-pointer"
          title="Ver Perfil y Biometría"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#121212] border border-[#2C2C2E] text-[#8E8E93] group-hover:border-[#FF5722]/50 group-hover:text-white transition">
            <User size={17} />
          </div>
          <span className="text-[10px] font-semibold tracking-tight mt-1 text-[#8E8E93] group-hover:text-white truncate">
            PERFIL
          </span>
        </button>
      </div>
    </nav>
  );
}
