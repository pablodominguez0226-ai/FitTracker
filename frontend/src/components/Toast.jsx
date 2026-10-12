import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";

/**
 * Dispatches a global toast event to show a floating feedback message.
 * @param {string} message - Message text to display.
 * @param {Object} [options] - Configuration options.
 * @param {'emerald'|'orange'} [options.variant='emerald'] - Check icon accent color.
 * @param {number} [options.duration=3500] - Duration in milliseconds (default 3.5s).
 */
export const showToast = (message, options = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("fittracker:toast", {
      detail: {
        message,
        variant: options.variant || "emerald",
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

  const isOrange = currentToast.variant === "orange";

  return (
    <div
      className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[80] pointer-events-none select-none transition-all duration-300 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-3 scale-95"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="bg-[#1C1C1E] border border-white/15 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 max-w-[90vw] sm:max-w-md">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-xl flex-shrink-0 border ${
            isOrange
              ? "bg-[#FF5722]/20 text-[#FF5722] border-[#FF5722]/40"
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          }`}
        >
          <Check size={16} strokeWidth={2.5} />
        </div>
        <span className="text-white font-medium text-sm leading-snug">
          {currentToast.message}
        </span>
      </div>
    </div>
  );
}
