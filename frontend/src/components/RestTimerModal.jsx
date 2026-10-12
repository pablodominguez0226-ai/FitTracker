import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X,
  Plus,
  Minus,
  Play,
  Pause,
  FastForward,
  CheckCircle2,
  Flame,
  Zap,
  Clock,
  Dumbbell,
  Sparkles,
} from "lucide-react";

/**
 * Web Audio API synthesizer for rest completion chime
 */
function playRestCompletionChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;

    chord.forEach((freq, idx) => {
      const noteStart = startTime + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.7);
    });
  } catch (err) {
    console.warn("Audio chime no disponible:", err);
  }
}

/**
 * Haptic feedback vibration
 */
function triggerHapticVibrate() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200, 100, 350]);
    } catch (e) {
      // ignore
    }
  }
}

export default function RestTimerModal({
  isOpen,
  onClose,
  setInfo,
  onSelectEffort,
}) {
  // Configuration state
  const [selectedEffort, setSelectedEffort] = useState("moderado");
  const [isExtendedHeavy, setIsExtendedHeavy] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(90);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [isRunning, setIsRunning] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // Absolute end time and status refs to survive screen lock and app switching
  const timerIntervalRef = useRef(null);
  const targetEndTimeRef = useRef(Date.now() + 90 * 1000);
  const isRunningRef = useRef(true);
  const pausedRemainingRef = useRef(null);
  const chimeTriggeredRef = useRef(false);

  // MM:SS format
  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [secondsLeft]);

  const clearTimerInterval = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Tick timer loop: Recalculates remaining time against absolute target timestamp
  const startTimerTick = useCallback(() => {
    clearTimerInterval();
    timerIntervalRef.current = setInterval(() => {
      if (!isRunningRef.current) return;
      const now = Date.now();
      const diffMs = targetEndTimeRef.current - now;
      const remaining = Math.max(0, Math.round(diffMs / 1000));

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearTimerInterval();
        setIsCompleted(true);
        setIsRunning(false);
        isRunningRef.current = false;
        try {
          localStorage.removeItem("fittracker_active_rest_timer");
        } catch (e) {}
        if (!chimeTriggeredRef.current) {
          chimeTriggeredRef.current = true;
          playRestCompletionChime();
          triggerHapticVibrate();
        }
      }
    }, 250);
  }, [clearTimerInterval]);

  // Recalculate remaining on screen unlock / browser focus / tab visibility
  useEffect(() => {
    if (!isOpen) return;
    const handleSyncRemaining = () => {
      if (!isRunningRef.current) return;
      const remaining = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearTimerInterval();
        setIsCompleted(true);
        setIsRunning(false);
        isRunningRef.current = false;
        try {
          localStorage.removeItem("fittracker_active_rest_timer");
        } catch (e) {}
        if (!chimeTriggeredRef.current) {
          chimeTriggeredRef.current = true;
          playRestCompletionChime();
          triggerHapticVibrate();
        }
      }
    };

    document.addEventListener("visibilitychange", handleSyncRemaining);
    window.addEventListener("focus", handleSyncRemaining);
    window.addEventListener("pageshow", handleSyncRemaining);

    return () => {
      document.removeEventListener("visibilitychange", handleSyncRemaining);
      window.removeEventListener("focus", handleSyncRemaining);
      window.removeEventListener("pageshow", handleSyncRemaining);
    };
  }, [isOpen, clearTimerInterval]);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (!isOpen) {
      clearTimerInterval();
      return;
    }
    clearTimerInterval();

    // Check if there was an active timer in localStorage
    let initialSec = 90;
    try {
      const raw = localStorage.getItem("fittracker_active_rest_timer");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.targetEndTime && saved.targetEndTime > Date.now()) {
          const rem = Math.max(0, Math.round((saved.targetEndTime - Date.now()) / 1000));
          if (rem > 0) {
            initialSec = rem;
            targetEndTimeRef.current = saved.targetEndTime;
            setTotalSeconds(saved.totalSeconds || 90);
            setSecondsLeft(rem);
            setSelectedEffort(saved.selectedEffort || "moderado");
            setIsRunning(true);
            isRunningRef.current = true;
            setIsCompleted(false);
            chimeTriggeredRef.current = false;
            startTimerTick();
            return;
          }
        }
      }
    } catch (e) {}

    setSelectedEffort("moderado");
    setIsExtendedHeavy(false);
    setTotalSeconds(90);
    setSecondsLeft(90);
    setIsRunning(true);
    isRunningRef.current = true;
    setIsCompleted(false);
    pausedRemainingRef.current = null;
    targetEndTimeRef.current = Date.now() + 90 * 1000;
    chimeTriggeredRef.current = false;

    try {
      localStorage.setItem(
        "fittracker_active_rest_timer",
        JSON.stringify({
          targetEndTime: targetEndTimeRef.current,
          totalSeconds: 90,
          selectedEffort: "moderado",
          isRunning: true,
        })
      );
    } catch (e) {}

    if (onSelectEffort) {
      onSelectEffort("moderado");
    }

    startTimerTick();

    return () => {
      clearTimerInterval();
    };
  }, [isOpen, setInfo?.setId, setInfo?.setIndex, clearTimerInterval, startTimerTick, onSelectEffort]);

  // Handle 1-tap quick effort selection
  const handleSelectEffort = (effortId, extendHeavy = null) => {
    let nextSec = 90;
    let nextExt = isExtendedHeavy;

    if (effortId === "pesado") {
      if (extendHeavy !== null) {
        nextExt = extendHeavy;
      } else if (selectedEffort === "pesado") {
        nextExt = !isExtendedHeavy;
      } else {
        nextExt = false;
      }
      setIsExtendedHeavy(nextExt);
      nextSec = nextExt ? 300 : 180;
    } else if (effortId === "moderado") {
      setIsExtendedHeavy(false);
      nextSec = 90;
    } else if (effortId === "liviano") {
      setIsExtendedHeavy(false);
      nextSec = 45;
    }

    setSelectedEffort(effortId);
    setTotalSeconds(nextSec);
    setSecondsLeft(nextSec);
    setIsRunning(true);
    isRunningRef.current = true;
    setIsCompleted(false);
    chimeTriggeredRef.current = false;
    pausedRemainingRef.current = null;
    targetEndTimeRef.current = Date.now() + nextSec * 1000;

    try {
      localStorage.setItem(
        "fittracker_active_rest_timer",
        JSON.stringify({
          targetEndTime: targetEndTimeRef.current,
          totalSeconds: nextSec,
          selectedEffort: effortId,
          isRunning: true,
        })
      );
    } catch (e) {}

    startTimerTick();

    if (onSelectEffort) {
      onSelectEffort(effortId);
    }
  };

  // Add 30s
  const handleAdd30 = () => {
    let nextLeft;
    if (isRunningRef.current) {
      targetEndTimeRef.current += 30 * 1000;
      nextLeft = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
    } else {
      const cur = pausedRemainingRef.current != null ? pausedRemainingRef.current : secondsLeft;
      nextLeft = cur + 30;
      pausedRemainingRef.current = nextLeft;
    }
    setSecondsLeft(nextLeft);
    setTotalSeconds((prevTot) => Math.max(prevTot, nextLeft));

    if (isCompleted) {
      setIsCompleted(false);
      setIsRunning(true);
      isRunningRef.current = true;
      chimeTriggeredRef.current = false;
      targetEndTimeRef.current = Date.now() + nextLeft * 1000;
      startTimerTick();
    }
  };

  // Subtract 30s
  const handleSub30 = () => {
    let nextLeft;
    if (isRunningRef.current) {
      targetEndTimeRef.current = Math.max(Date.now() + 5000, targetEndTimeRef.current - 30 * 1000);
      nextLeft = Math.max(5, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
    } else {
      const cur = pausedRemainingRef.current != null ? pausedRemainingRef.current : secondsLeft;
      nextLeft = Math.max(5, cur - 30);
      pausedRemainingRef.current = nextLeft;
    }
    setSecondsLeft(nextLeft);
  };

  // Play / Pause
  const togglePlayPause = () => {
    if (isRunningRef.current) {
      clearTimerInterval();
      const currentRem = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
      pausedRemainingRef.current = currentRem;
      setSecondsLeft(currentRem);
      setIsRunning(false);
      isRunningRef.current = false;
    } else {
      const rem = pausedRemainingRef.current != null ? pausedRemainingRef.current : secondsLeft;
      targetEndTimeRef.current = Date.now() + rem * 1000;
      setIsRunning(true);
      isRunningRef.current = true;
      pausedRemainingRef.current = null;
      startTimerTick();
    }
  };

  const handleClose = () => {
    try {
      localStorage.removeItem("fittracker_active_rest_timer");
    } catch (e) {}
    clearTimerInterval();
    onClose();
  };


  // Circular progress SVG
  const RADIUS = 108;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progressFraction = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressFraction);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#000000] flex flex-col justify-between text-white p-4 sm:p-6 overflow-y-auto select-none safe-top safe-bottom animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Temporizador de descanso en Focus Mode"
    >
      {/* Header: Exercise & Set Context + Close */}
      <div className="relative z-10 w-full max-w-lg mx-auto flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-3 truncate min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-[#FF5722]/10 border border-[#FF5722]/20 flex items-center justify-center text-[#FF5722] flex-shrink-0">
            <Dumbbell size={20} />
          </div>
          <div className="truncate min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate break-words">
              {setInfo?.exerciseName || "Descanso entre series"}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#8E8E93] truncate">
              {setInfo?.setNumber && (
                <span className="font-semibold text-white">
                  Serie {setInfo.setNumber}
                  {setInfo?.totalSets ? ` de ${setInfo.totalSets}` : ""}
                </span>
              )}
              {setInfo?.weight != null && setInfo?.reps != null && (
                <>
                  <span>•</span>
                  <span>
                    {setInfo.weight} kg × {setInfo.reps} reps
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="h-10 w-10 rounded-2xl bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white active:scale-95 transition flex-shrink-0 ml-2"
          title="Saltar / Cerrar descanso"
        >
          <X size={20} />
        </button>
      </div>

      {/* Quick Effort Selector (1-Tap Configuration) */}
      <div className="relative z-10 w-full max-w-lg mx-auto my-3 space-y-2">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* 🔥 Muy Pesado (3:00 / 5:00 min) */}
          <button
            type="button"
            onClick={() => handleSelectEffort("pesado")}
            className={`flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 active:scale-95 text-center min-h-[92px] sm:min-h-[100px] ${
              selectedEffort === "pesado"
                ? "border-orange-500 bg-orange-500/10"
                : "border-white/5 bg-[#1C1C1E] hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-1">
              <Flame size={16} className={selectedEffort === "pesado" ? "text-orange-400" : "text-[#8E8E93]"} />
              <span className="text-xs sm:text-sm font-semibold text-white">🔥 Pesado</span>
            </div>
            <span
              className={`text-[11px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded-lg ${
                selectedEffort === "pesado" ? "bg-orange-500/20 text-orange-400" : "bg-[#121212] text-[#8E8E93]"
              }`}
            >
              {selectedEffort === "pesado" && isExtendedHeavy ? "5:00 min" : "3:00 min"}
            </span>
            <span className="text-[9px] sm:text-[10px] text-[#8E8E93] truncate w-full">
              {selectedEffort === "pesado"
                ? isExtendedHeavy
                  ? "⚡ Tocar p/ 3:00"
                  : "⚡ Extender a 5:00"
                : "3:00 / 5:00 min"}
            </span>
          </button>

          {/* ⚡ Moderado (1:30 min) */}
          <button
            type="button"
            onClick={() => handleSelectEffort("moderado")}
            className={`flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 active:scale-95 text-center min-h-[92px] sm:min-h-[100px] ${
              selectedEffort === "moderado"
                ? "border-[#FF5722] bg-[#FF5722]/10"
                : "border-white/5 bg-[#1C1C1E] hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-1">
              <Zap size={16} className={selectedEffort === "moderado" ? "text-[#FF5722]" : "text-[#8E8E93]"} />
              <span className="text-xs sm:text-sm font-semibold text-white">⚡ Moderado</span>
            </div>
            <span
              className={`text-[11px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded-lg ${
                selectedEffort === "moderado" ? "bg-[#FF5722]/20 text-[#FF5722]" : "bg-[#121212] text-[#8E8E93]"
              }`}
            >
              1:30 min
            </span>
            <span className="text-[9px] sm:text-[10px] text-[#8E8E93] truncate w-full">
              Hipertrofia
            </span>
          </button>

          {/* ⏱️ Liviano / Rápido (0:45 min) */}
          <button
            type="button"
            onClick={() => handleSelectEffort("liviano")}
            className={`flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 active:scale-95 text-center min-h-[92px] sm:min-h-[100px] ${
              selectedEffort === "liviano"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-white/5 bg-[#1C1C1E] hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-1">
              <Clock size={16} className={selectedEffort === "liviano" ? "text-cyan-400" : "text-[#8E8E93]"} />
              <span className="text-xs sm:text-sm font-semibold text-white truncate">⏱️ Liviano</span>
            </div>
            <span
              className={`text-[11px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded-lg ${
                selectedEffort === "liviano" ? "bg-cyan-500/20 text-cyan-400" : "bg-[#121212] text-[#8E8E93]"
              }`}
            >
              0:45 min
            </span>
            <span className="text-[9px] sm:text-[10px] text-[#8E8E93] truncate w-full">
              Accesorios
            </span>
          </button>
        </div>
      </div>

      {/* Central Giant Countdown Clock (MM:SS) & Flat Progress Ring */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2">
        <div className="relative flex items-center justify-center w-[250px] h-[250px] sm:w-[280px] sm:h-[280px]">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
            <defs>
              <linearGradient id="modalRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF5722" />
                <stop offset="100%" stopColor="#7C4DFF" />
              </linearGradient>
            </defs>

            {/* Background Track Circle */}
            <circle
              cx="120"
              cy="120"
              r={RADIUS}
              stroke="#1C1C1E"
              strokeWidth="10"
              fill="transparent"
            />

            {/* Animated Flat Ring */}
            <circle
              cx="120"
              cy="120"
              r={RADIUS}
              stroke="url(#modalRingGrad)"
              strokeWidth="10"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-300 ease-linear"
            />
          </svg>

          {/* Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            {isCompleted ? (
              <div className="flex flex-col items-center justify-center">
                <CheckCircle2 size={46} className="text-[#34D399] mb-1" />
                <span className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                  ¡Listo!
                </span>
                <span className="text-[11px] font-medium text-[#34D399] mt-0.5">
                  Recuperación Óptima
                </span>
              </div>
            ) : (
              <>
                <span className="text-5xl sm:text-6xl font-semibold text-white tracking-tight tabular-nums">
                  {formattedTime}
                </span>

                <span className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-[#FF5722]">
                  {!isRunning ? "En Pausa" : "Descanso Activo"}
                </span>

                <span className="text-[11px] text-[#8E8E93] mt-0.5">
                  {selectedEffort === "pesado"
                    ? "Máxima fuerza & ATP"
                    : selectedEffort === "liviano"
                    ? "Densidad metabólica"
                    : "Hipertrofia miofibrilar"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Buttons: -30s, Play/Pause, +30s */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            type="button"
            onClick={handleSub30}
            className="h-11 px-4 rounded-2xl border border-white/10 bg-[#1C1C1E] text-xs font-semibold text-[#8E8E93] hover:text-white active:scale-90 transition flex items-center gap-1"
            title="Restar 30 segundos"
          >
            <Minus size={14} /> 30s
          </button>

          <button
            type="button"
            onClick={togglePlayPause}
            className="h-12 w-12 rounded-2xl border border-white/10 bg-[#1C1C1E] text-white flex items-center justify-center hover:border-[#FF5722] active:scale-90 transition"
            title={isRunning ? "Pausar descanso" : "Continuar descanso"}
          >
            {isRunning ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleAdd30}
            className="h-11 px-4 rounded-2xl border border-white/10 bg-[#1C1C1E] text-xs font-semibold text-white hover:border-[#FF5722] active:scale-90 transition flex items-center gap-1"
            title="Sumar 30 segundos"
          >
            <Plus size={14} /> 30s
          </button>
        </div>
      </div>

      {/* Bottom Actions: Saltar / Cerrar Descanso */}
      <div className="relative z-10 w-full max-w-lg mx-auto space-y-3 pt-2">
        {isCompleted ? (
          <div className="p-3.5 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
            <Sparkles size={24} className="text-[#34D399] flex-shrink-0" />
            <div className="text-left text-xs sm:text-sm">
              <p className="font-semibold text-white">¡Listo para la siguiente serie!</p>
              <p className="text-[#8E8E93] text-[11px]">
                Nivel de ATP restaurado para máxima tensión mecánica.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-[#8E8E93] max-w-xs mx-auto">
            El descanso adecuado garantiza mantener el volumen efectivo sin degradar la técnica.
          </p>
        )}

        <button
          type="button"
          onClick={handleClose}
          className={`w-full min-h-[52px] sm:min-h-[56px] rounded-2xl font-semibold tracking-wide text-base flex items-center justify-center gap-2.5 transition duration-150 active:scale-[0.98] ${
            isCompleted
              ? "bg-emerald-500 text-white hover:opacity-90"
              : "bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] text-white hover:opacity-90"
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 size={20} strokeWidth={2.5} />
              <span>Empezar Siguiente Serie</span>
            </>
          ) : (
            <>
              <FastForward size={20} />
              <span>Saltar descanso</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
