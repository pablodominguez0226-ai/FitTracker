import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Calendar, BarChart, Utensils } from "lucide-react";

const NAV_ITEMS = [
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
    matchPaths: ["/train", "/bitacora", "/workouts", "/routines", "/exercises"],
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

/**
 * FloatingBottomNav - Barra de navegación flotante estilo dock iOS ("Bento Minimalist Dual Theme")
 */
export default function FloatingBottomNav({ activeTab, onTabChange }) {
  const location = useLocation();

  const checkIsActive = (item) => {
    if (activeTab) {
      return activeTab === item.id;
    }
    if (item.to === "/") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return item.matchPaths.some(
      (path) => path !== "/" && location.pathname.startsWith(path)
    );
  };

  return (
    <nav
      className="fixed bottom-4 left-4 right-4 z-50 md:hidden max-w-md mx-auto bg-white/95 dark:bg-[#0A0E17]/90 backdrop-blur-xl rounded-full shadow-2xl border border-[#F1F5F9] dark:border-white/10 px-4 py-2 flex items-center justify-around select-none transition-colors duration-200"
      role="navigation"
      aria-label="Navegación principal móvil"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = checkIsActive(item);

        return (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.to === "/"}
            onClick={() => {
              if (onTabChange) onTabChange(item.id);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 transition-all duration-200 active:scale-95 ${
              isActive
                ? "bg-red-50 text-red-600 dark:bg-red-600/20 dark:text-red-500"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] bg-transparent"
            }`}
          >
            <Icon
              size={20}
              strokeWidth={isActive ? 2.5 : 2}
              className={
                isActive
                  ? "text-red-600 dark:text-red-500"
                  : "text-[#64748B] dark:text-[#94A3B8]"
              }
            />
            {isActive && (
              <span className="text-xs font-bold text-red-600 dark:text-red-500 tracking-tight">
                {item.label}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
