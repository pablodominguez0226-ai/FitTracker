import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export const THEME_STORAGE_KEY = "fittracker_theme";
const LEGACY_THEME_KEY = "theme";

const ThemeContext = createContext({
  theme: "system",
  resolvedTheme: "light",
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredTheme() {
  if (typeof window === "undefined") return "system";
  try {
    const saved =
      localStorage.getItem(THEME_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {}
  return "system";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Listen to OS color-scheme changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const isDark = resolvedTheme === "dark";

  // Sync DOM classes and localStorage
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;

    if (isDark) {
      root.classList.add("dark");
      body?.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      body?.classList.remove("dark");
      root.style.colorScheme = "light";
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", isDark ? "#05070B" : "#F8FAFC");
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(LEGACY_THEME_KEY, theme);
    } catch {}
  }, [theme, isDark]);

  const setTheme = (nextTheme) => {
    if (nextTheme === "light" || nextTheme === "dark" || nextTheme === "system") {
      setThemeState(nextTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const currentResolved = prev === "system" ? getSystemTheme() : prev;
      return currentResolved === "dark" ? "light" : "dark";
    });
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isDark,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Minimalist Theme Toggle Button or Segmented Control
 * variant="icon" -> Compact Bento icon button for Navbar/Header
 * variant="segmented" -> 3-way selector ('light' | 'dark' | 'system') for Profile/Settings
 */
export function ThemeToggle({ variant = "icon", className = "" }) {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();

  if (variant === "segmented") {
    const options = [
      { id: "light", label: "Claro", icon: Sun },
      { id: "dark", label: "Oscuro", icon: Moon },
      { id: "system", label: "Sistema", icon: Monitor },
    ];

    return (
      <div
        className={`grid grid-cols-3 gap-1.5 rounded-2xl border border-[#F1F5F9] dark:border-white/[0.07] bg-[#F8FAFC] dark:bg-[#05070B] p-1 ${className}`}
        role="group"
        aria-label="Selector de tema"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                active
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
              }`}
            >
              <Icon size={14} strokeWidth={2.25} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`w-10 h-10 rounded-2xl bg-[#FFFFFF] dark:bg-[#0E131F] border border-[#F1F5F9] dark:border-white/[0.07] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center shadow-bento transition active:scale-95 cursor-pointer ${className}`}
      title={
        isDark
          ? "Cambiar a Modo Claro"
          : "Cambiar a Modo Oscuro"
      }
      aria-label={
        isDark
          ? "Cambiar a Modo Claro"
          : "Cambiar a Modo Oscuro"
      }
    >
      {isDark ? (
        <Sun size={18} className="text-red-400 transition-transform duration-200" />
      ) : (
        <Moon size={18} className="text-[#0F172A] transition-transform duration-200" />
      )}
    </button>
  );
}
