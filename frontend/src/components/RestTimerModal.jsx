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
  if (!isOpen) return null;

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
  }, [clearTimerInterval]);

  // Initialize or reset when modal opens
  useEffect(() => {
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
  }, [setInfo?.setId, setInfo?.setIndex, clearTimerInterval, startTimerTick, onSelectEffort]);

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

  // MM:SS format
  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [secondsLeft]);

  // Circular progress SVG
  const RADIUS = 108;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progressFraction = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressFraction);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#09060E]/95 backdrop-blur-sm flex flex-col justify-between text-white p-4 sm:p-6 overflow-y-auto select-none safe-top safe-bottom animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Temporizador de descanso en Focus Mode"
    >
      {/* Background Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-[#A855F7]/15 blur-[90px]" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full bg-[#7E22CE]/10 blur-[80px]" />
      </div>

      {/* Header: Exercise & Set Context + Close */}
      <div className="relative z-10 w-full max-w-lg mx-auto flex items-center justify-between pb-2 border-b border-[#2D1B4E]/80">
        <div className="flex items-center gap-3 truncate min-w-0">
          <div className="h-10 w-10 rounded-xl bg-[#1C1433] border border-[#A855F7]/40 flex items-center justify-center text-[#C084FC] flex-shrink-0">
            <Dumbbell size={20} />
          </div>
          <div className="truncate min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white truncate break-words">
              {setInfo?.exerciseName || "Descanso entre series"}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#A1A1AA] truncate">
              {setInfo?.setNumber && (
                <span className="font-bold text-[#C084FC]">
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
          className="h-10 w-10 rounded-xl bg-[#140E24] border border-[#2D1B4E] flex items-center justify-center text-[#A1A1AA] hover:text-white hover:border-[#A855F7]/50 active:scale-95 transition flex-shrink-0 ml-2"
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
                ? "border-2 border-orange-500 bg-[#1C1433] shadow-[0_0_18px_rgba(249,115,22,0.35)] scale-[1.02]"
                : "border-[#2D1B4E] bg-[#140E24] hover:border-orange-500/40 hover:bg-[#1A122E]"
            }`}
          >
            <div className="flex items-center gap-1">
              <Flame size={16} className={selectedEffort === "pesado" ? "text-orange-400" : "text-[#71717A]"} />
              <span className="text-xs sm:text-sm font-extrabold text-white">🔥 Muy Pesado</span>
            </div>
            <span
              className={`text-[11px] sm:text-xs font-mono font-black px-2 py-0.5 rounded-md ${
                selectedEffort === "pesado" ? "bg-orange-500 text-white" : "bg-[#0E0919] text-[#A1A1AA]"
              }`}
            >
              {selectedEffort === "pesado" && isExtendedHeavy ? "5:00 min" : "3:00 min"}
            </span>
            <span className="text-[9px] sm:text-[10px] text-[#A1A1AA] truncate w-full">
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
                ? "border-2 border-[#A855F7] bg-[#1C1433] shadow-[0_0_18px_rgba(168,85,247,0.35)] scale-[1.02]"
                : "border-[#2D1B4E] bg-[#140E24] hover:border-[#A855F7]/40 hover:bg-[#1A122E]"
            }`}
          >
            <div className="flex items-center gap-1">
              <Zap size={16} className={selectedEffort === "moderado" ? "text-[#C084FC]" : "text-[#71717A]"} />
              <span className="text-xs sm:text-sm font-extrabold text-white">⚡ Moderado</span>
            </div>
            <span
              className={`text-[11px] sm:text-xs font-mono font-black px-2 py-0.5 rounded-md ${
                selectedEffort === "moderado" ? "bg-[#A855F7] text-white" : "bg-[#0E0919] text-[#A1A1AA]"
              }`}
            >
              1:30 min
            </span>
            <span className="text-[9px] sm:text-[10px] text-[#A1A1AA] truncate w-full">
              Hipertrofia
            </span>
          </button>

          {/* ⏱️ Liviano / Rápido (0:45 min) */}
          <button
            type="button"
            onClick={() => handleSelectEffort("liviano")}
            className={`flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 active:scale-95 text-center min-h-[92px] sm:min-h-[100px] ${
              selectedEffort === "liviano"
                ? "border-2 border-cyan-500 bg-[#1C1433] shadow-[0_0_18px_rgba(6,182,212,0.35)] scale-[1.02]"
                : "border-[#2D1B4E] bg-[#140E24] hover:border-cyan-500/40 hover:bg-[#1A122E]"
            }`}
          >
            <div className="flex items-center gap-1">
              <Clock size={16} className={selectedEffort === "liviano" ? "text-cyan-400" : "text-[#71717A]"} />
              <span className="text-xs sm:text-sm font-extrabold text-white truncate">⏱️ Liviano / Rápido</span>
            </div>
            <span
              className={`text-[11px] sm:text-xs font-mono font-black px-2 py-0.5 rounded-md ${
                selectedEffort === "liviano" ? "bg-cyan-500 text-white" : "bg-[#0E0919] text-[#A1A1AA]"
              }`}
            >
              0:45 min
            </span>
            <span className="text-[9px] sm:text-[10px] text-[#A1A1AA] truncate w-full">
              Accesorios
            </span>
          </button>
        </div>
      </div>

      {/* Central Giant Countdown Clock (MM:SS) & Neon Progress Ring */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2">
        <div className="relative flex items-center justify-center w-[250px] h-[250px] sm:w-[280px] sm:h-[280px]">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
            <defs>
              <filter id="modal-purple-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="modalRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#9333EA" />
              </linearGradient>
            </defs>

            {/* Background Track Circle */}
            <circle
              cx="120"
              cy="120"
              r={RADIUS}
              stroke="#1D1333"
              strokeWidth="12"
              fill="transparent"
            />

            {/* Animated Neon Purple Ring */}
            <circle
              cx="120"
              cy="120"
              r={RADIUS}
              stroke="url(#modalRingGrad)"
              strokeWidth="12"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              filter="url(#modal-purple-glow)"
              className="transition-all duration-300 ease-linear"
            />
          </svg>

          {/* Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            {isCompleted ? (
              <div className="flex flex-col items-center justify-center animate-bounce">
                <CheckCircle2 size={46} className="text-[#34D399] mb-1 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  ¡Listo!
                </span>
                <span className="text-[11px] font-bold text-[#34D399] mt-0.5">
                  Recuperación Óptima
                </span>
              </div>
            ) : (
              <>
                <span className="text-5xl sm:text-6xl font-mono font-black text-white tracking-tight drop-shadow-[0_0_24px_rgba(168,85,247,0.45)]">
                  {formattedTime}
                </span>

                <span className="mt-1.5 text-xs font-bold uppercase tracking-widest text-[#C084FC]">
                  {!isRunning ? "En Pausa" : "Descanso Activo"}
                </span>

                <span className="text-[11px] text-[#A1A1AA] mt-0.5">
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
            className="h-11 px-3.5 rounded-xl border border-[#2D1B4E] bg-[#140E24] text-xs font-bold text-[#A1A1AA] hover:text-white hover:border-[#A855F7]/40 active:scale-90 transition flex items-center gap-1"
            title="Restar 30 segundos"
          >
            <Minus size={14} /> 30s
          </button>

          <button
            type="button"
            onClick={togglePlayPause}
            className="h-12 w-12 rounded-xl border border-[#A855F7]/50 bg-[#1C1433] text-white flex items-center justify-center hover:bg-[#251A45] active:scale-90 transition shadow-neon"
            title={isRunning ? "Pausar descanso" : "Continuar descanso"}
          >
            {isRunning ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleAdd30}
            className="h-11 px-3.5 rounded-xl border border-[#A855F7]/60 bg-[#1C1433] text-xs font-black text-[#C084FC] hover:border-[#A855F7] active:scale-90 transition flex items-center gap-1 shadow-neon"
            title="Sumar 30 segundos"
          >
            <Plus size={14} /> 30s
          </button>
        </div>
      </div>

      {/* Bottom Actions: Saltar / Cerrar Descanso */}
      <div className="relative z-10 w-full max-w-lg mx-auto space-y-3 pt-2">
        {isCompleted ? (
          <div className="p-3.5 rounded-2xl border-2 border-[#34D399] bg-[#0E1F18] flex items-center gap-3 shadow-[0_0_24px_rgba(52,211,153,0.35)] animate-pulse">
            <Sparkles size={24} className="text-[#34D399] flex-shrink-0" />
            <div className="text-left text-xs sm:text-sm">
              <p className="font-extrabold text-white">¡Listo para la siguiente serie!</p>
              <p className="text-[#A1A1AA] text-[11px]">
                Nivel de ATP restaurado para máxima tensión mecánica.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-[#71717A] max-w-xs mx-auto">
            El descanso adecuado garantiza mantener el volumen efectivo sin degradar la técnica.
          </p>
        )}

        <button
          type="button"
          onClick={handleClose}
          className={`w-full min-h-[52px] sm:min-h-[56px] rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition duration-150 active:scale-[0.98] shadow-neon ${
            isCompleted
              ? "bg-gradient-to-r from-[#34D399] to-[#10B981] text-[#09060E] hover:from-[#10B981] hover:to-[#34D399] shadow-[0_0_24px_rgba(52,211,153,0.5)]"
              : "bg-gradient-to-r from-[#9333EA] via-[#8B2BE2] to-[#7E22CE] text-white hover:from-[#7E22CE] hover:to-[#9333EA]"
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 size={20} strokeWidth={3} />
              <span>¡A DARLE! Empezar Siguiente Serie</span>
            </>
          ) : (
            <>
              <FastForward size={20} />
              <span>Saltar / Cerrar descanso</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
