import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  X,
  Flame,
  CheckCircle2,
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
      const noteStart = startTime + idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.65);
    });
  } catch (err) {
    console.warn("Audio chime no disponible:", err);
  }
}

/**
 * Trigger mobile vibration pattern: [200, 100, 200]
 */
function triggerRestVibration() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {
      console.warn("Vibración no soportada:", e);
    }
  }
}

const RESET_OPTIONS = [
  { label: "60s", seconds: 60 },
  { label: "90s", seconds: 90 },
  { label: "2m", seconds: 120 },
  { label: "3m", seconds: 180 },
];

export default function FloatingRestTimer({
  isOpen,
  onClose,
  initialSeconds = 90,
  exerciseName = "",
  setNumber = null,
}) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const timerIntervalRef = useRef(null);
  const targetEndTimeRef = useRef(Date.now() + initialSeconds * 1000);
  const isRunningRef = useRef(true);
  const pausedRemainingRef = useRef(null);
  const finishTriggeredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    clearTimer();
    timerIntervalRef.current = setInterval(() => {
      if (!isRunningRef.current) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearTimer();
        setIsRunning(false);
        isRunningRef.current = false;
        setIsFinished(true);

        if (!finishTriggeredRef.current) {
          finishTriggeredRef.current = true;
          triggerRestVibration();
          playRestCompletionChime();
        }
      }
    }, 250);
  }, [clearTimer]);

  // Reset timer whenever it opens or initialSeconds changes
  useEffect(() => {
    if (isOpen) {
      const secs = initialSeconds || 90;
      setTotalSeconds(secs);
      setSecondsLeft(secs);
      setIsRunning(true);
      isRunningRef.current = true;
      setIsFinished(false);
      finishTriggeredRef.current = false;
      targetEndTimeRef.current = Date.now() + secs * 1000;
      startCountdown();
    } else {
      clearTimer();
    }
    return () => clearTimer();
  }, [isOpen, initialSeconds, startCountdown, clearTimer]);

  if (!isOpen) return null;

  const handleTogglePause = () => {
    if (isRunning) {
      // Pause
      clearTimer();
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
      pausedRemainingRef.current = remaining;
      setIsRunning(false);
      isRunningRef.current = false;
    } else {
      // Resume
      const secs = pausedRemainingRef.current ?? secondsLeft;
      targetEndTimeRef.current = Date.now() + secs * 1000;
      setIsRunning(true);
      isRunningRef.current = true;
      startCountdown();
    }
  };

  const handleResetTo = (secs) => {
    clearTimer();
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setIsRunning(true);
    isRunningRef.current = true;
    setIsFinished(false);
    finishTriggeredRef.current = false;
    pausedRemainingRef.current = null;
    targetEndTimeRef.current = Date.now() + secs * 1000;
    startCountdown();
  };

  const handleAdjustSeconds = (delta) => {
    const current = isRunning
      ? Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000))
      : secondsLeft;
    const next = Math.max(5, current + delta);
    setSecondsLeft(next);
    if (next > totalSeconds) {
      setTotalSeconds(next);
    }
    targetEndTimeRef.current = Date.now() + next * 1000;
    if (!isRunning) {
      pausedRemainingRef.current = next;
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progressPct = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0;

  return (
    <div className="fixed z-50 left-1/2 -translate-x-1/2 bottom-[72px] sm:bottom-6 w-[calc(100%-1.25rem)] max-w-md animate-in slide-in-from-bottom-5 duration-200">
      <div className="rounded-2xl border-2 border-[#FF5722]/50 bg-[#121113]/95 p-3.5 shadow-2xl backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(255,87,34,0.25)]">
        {/* Header line: Info & Close */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF5722]/20 text-[#FF6D00]">
              <Clock size={14} className={isRunning ? "animate-spin" : ""} style={{ animationDuration: "4s" }} />
            </span>
            <span className="text-xs font-black text-white truncate">
              {exerciseName ? `Descanso • ${exerciseName}` : "Descanso entre series"}
            </span>
            {setNumber && (
              <span className="rounded bg-[#2A1B14] px-1.5 py-0.5 text-[10px] font-bold text-[#FF6D00]">
                S#{setNumber}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#71717A] hover:bg-[#2A1B14] hover:text-white transition"
            title="Cerrar temporizador"
          >
            <X size={15} />
          </button>
        </div>

        {/* Center: Big Countdown and Quick Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl sm:text-4xl font-black tracking-tight tabular-nums ${
                isFinished
                  ? "text-[#34D399] animate-bounce"
                  : secondsLeft <= 10
                  ? "text-red-400 animate-pulse"
                  : "text-white neon-text"
              }`}
            >
              {timeFormatted}
            </span>
            {isFinished ? (
              <span className="text-[11px] font-black uppercase text-[#34D399] flex items-center gap-1">
                <CheckCircle2 size={12} /> ¡A entrenar!
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase text-[#71717A]">
                {isRunning ? "en curso" : "pausado"}
              </span>
            )}
          </div>

          {/* Steppers & Play/Pause */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleAdjustSeconds(-15)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A1B14] bg-[#050505] text-[11px] font-bold text-[#A1A1AA] hover:border-[#FF5722] hover:text-white active:scale-95 transition"
              title="-15 segundos"
            >
              -15s
            </button>

            <button
              type="button"
              onClick={handleTogglePause}
              className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-[#050505] transition active:scale-90 shadow-md ${
                isRunning
                  ? "bg-[#FF5722] hover:bg-[#FF6D00] shadow-[0_0_12px_rgba(255,87,34,0.4)]"
                  : "bg-[#34D399] hover:bg-[#10B981] shadow-[0_0_12px_rgba(52,211,153,0.4)]"
              }`}
              title={isRunning ? "Pausar" : "Reanudar"}
            >
              {isRunning ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleAdjustSeconds(+15)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A1B14] bg-[#050505] text-[11px] font-bold text-[#A1A1AA] hover:border-[#FF5722] hover:text-white active:scale-95 transition"
              title="+15 segundos"
            >
              +15s
            </button>
          </div>
        </div>

        {/* Progress Bar (OLED Neon Brick) */}
        <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#050505] border border-[#2A1B14] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isFinished
                ? "bg-[#34D399]"
                : secondsLeft <= 10
                ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]"
                : "bg-gradient-to-r from-[#FF5722] to-[#FF6D00] shadow-[0_0_10px_rgba(255,87,34,0.6)]"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Quick Reset Pills: [60s | 90s | 2m | 3m] */}
        <div className="mt-2.5 flex items-center justify-between gap-1.5 pt-1 border-t border-[#2A1B14]">
          <span className="text-[10px] font-bold text-[#71717A] flex items-center gap-1">
            <RotateCcw size={10} />
            <span>Reiniciar:</span>
          </span>
          <div className="flex items-center gap-1">
            {RESET_OPTIONS.map((opt) => (
              <button
                key={opt.seconds}
                type="button"
                onClick={() => handleResetTo(opt.seconds)}
                className={`rounded-lg px-2 py-1 text-[10px] font-black transition active:scale-95 ${
                  totalSeconds === opt.seconds && !isFinished
                    ? "border border-[#FF5722] bg-[#FF5722]/20 text-[#FF6D00]"
                    : "border border-[#2A1B14] bg-[#050505] text-[#A1A1AA] hover:border-[#FF5722]/50 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
