import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";

/**
 * Dispatches a global toast event to show a floating feedback message.
 * @param {string} message - Message text to display.
 * @param {Object} [options] - Configuration options.
 * @param {'red'|'orange'} [options.variant='red'] - Check icon accent color.
 * @param {number} [options.duration=3500] - Duration in milliseconds (default 3.5s).
 */
export const showToast = (message, options = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("fittracker:toast", {
      detail: {
        message,
        variant: options.variant || "red",
        duration: options.duration || 3500,
        id: Date.now() + Math.random(),
      },
    })
  );
};

export default function Toast() {
  const [currentToast, setCurrentToast] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let hideTimer = null;
    let removeTimer = null;

    const handleToast = (event) => {
      const detail = event?.detail;
      if (!detail || !detail.message) return;

      if (hideTimer) clearTimeout(hideTimer);
      if (removeTimer) clearTimeout(removeTimer);

      setCurrentToast(detail);

      // Trigger enter animation smoothly
      requestAnimationFrame(() => {
        setIsVisible(true);
      });

      const duration = detail.duration || 3500;

      hideTimer = setTimeout(() => {
        setIsVisible(false);
        removeTimer = setTimeout(() => {
          setCurrentToast(null);
        }, 300);
      }, duration);
    };

    window.addEventListener("fittracker:toast", handleToast);
    return () => {
      window.removeEventListener("fittracker:toast", handleToast);
      if (hideTimer) clearTimeout(hideTimer);
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, []);

  if (!currentToast) return null;

  return (
    <div
      className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[80] pointer-events-none select-none transition-all duration-300 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-3 scale-95"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 rounded-full px-4 py-2.5 shadow-lg flex items-center gap-3 max-w-[90vw] sm:max-w-md">
        <div className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 border bg-red-500/10 text-red-500 border-red-500/20">
          <Check size={15} strokeWidth={2.5} />
        </div>
        <span className="text-[#0F172A] font-semibold text-xs sm:text-sm leading-snug">
          {currentToast.message}
        </span>
      </div>
    </div>
  );
}
