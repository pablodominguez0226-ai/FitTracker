import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Plus,
  Minus,
  Check,
  Trash2,
  ChevronRight,
  ChevronDown,
  Clock,
  Sparkles,
  ArrowRightLeft,
  RotateCw,
  Camera,
  Image,
  Flame,
  Shield,
  Zap,
} from "lucide-react";
import { getExerciseEquipment } from "../utils/fitnessUtils";
import {
  PERIODIZATION_MODES,
  getWeeklyPeriodizationMode,
  getSmartPeriodizationSuggestion,
} from "../utils/periodization";
import { getExerciseGuide, getExerciseGuidance } from "../api/client";
import { MENTZER_TECHNIQUES } from "../utils/routines";
import ExerciseMediaModal from "./ExerciseMediaModal";


export default function ExerciseLogger({
  exercise,
  equipment: propEquipment,
  sets = [],
  onAddSet,
  onRemoveSet,
  onExitFocus,
  onReplaceExercise,
  // Biserie / Superserie props
  secondExercise = null,
  secondSets = [],
  activeSlot = "A", // "A" | "B"
  onSwitchSlot,
  onSelectSecondExercise,
  onRemoveSecondExercise,
  allAvailableExercises = [],
  muscleGroups = [],
  recordsMap = {},
  periodizationMode: propPeriodizationMode,
  isHeavyDuty: propIsHeavyDuty = false,
}) {
  // -------------------------------------------------------------
  // 1. ELEVACIÓN TOTAL DE HOOKS: ESTADOS (useState)
  // -------------------------------------------------------------
  const isSlotB = activeSlot === "B" && Boolean(secondExercise);
  const currentEx = isSlotB ? secondExercise : exercise;

  const [currentExerciseSets, setCurrentExerciseSets] = useState(() => {
    const initial = isSlotB ? secondSets : sets;
    return Array.isArray(initial) ? initial : [];
  });

  const isHdDetected = Boolean(
    propIsHeavyDuty ||
    currentEx?.isHeavyDuty ||
    currentEx?.is_heavy_duty ||
    currentEx?.cadence === "4-2-4" ||
    (currentEx?.routine_name && currentEx.routine_name.toLowerCase().includes("heavy duty"))
  );

  const [isHeavyDutyMode, setIsHeavyDutyMode] = useState(isHdDetected);
  const [heavyDutySetType, setHeavyDutySetType] = useState("heavy_duty"); // "warmup" | "heavy_duty"
  const [selectedTechnique, setSelectedTechnique] = useState("Fallo Puro");

  const [showTechGuide, setShowTechGuide] = useState(false);
  const [techGuide, setTechGuide] = useState(null);
  const [guidanceData, setGuidanceData] = useState(null);
  const [loadingGuidance, setLoadingGuidance] = useState(false);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState(10);
  const [isSupersetPickerOpen, setIsSupersetPickerOpen] = useState(false);
  const [supersetMuscleFilter, setSupersetMuscleFilter] = useState(null);

  // -------------------------------------------------------------
  // 2. ELEVACIÓN TOTAL DE HOOKS: MEMOS (useMemo)
  // -------------------------------------------------------------
  const currentEquipment = useMemo(() => {
    return (
      (isSlotB ? getExerciseEquipment(secondExercise?.name) : propEquipment) ||
      getExerciseEquipment(currentEx?.name) ||
      "Máquina"
    );
  }, [isSlotB, secondExercise?.name, propEquipment, currentEx?.name]);

  const activeMode = useMemo(() => {
    return propPeriodizationMode || getWeeklyPeriodizationMode();
  }, [propPeriodizationMode]);

  const historicalRecord = useMemo(() => {
    return (currentEx?.id && recordsMap) ? recordsMap[currentEx.id] : null;
  }, [currentEx?.id, recordsMap]);

  const prevHistoricalWeight = useMemo(() => {
    return historicalRecord?.last_weight || historicalRecord?.pr_weight || 0;
  }, [historicalRecord]);

  const prevHistoricalReps = useMemo(() => {
    return historicalRecord?.last_reps || historicalRecord?.pr_reps || 10;
  }, [historicalRecord]);

  const smartSuggestion = useMemo(() => {
    return getSmartPeriodizationSuggestion({
      exerciseName: currentEx?.name || "",
      previousWeight: prevHistoricalWeight,
      previousReps: prevHistoricalReps,
      equipment: currentEquipment,
      mode: activeMode,
    });
  }, [currentEx?.name, prevHistoricalWeight, prevHistoricalReps, currentEquipment, activeMode]);

  const targetGoalData = useMemo(() => {
    if (guidanceData?.suggested_goal) {
      return guidanceData.suggested_goal;
    }
    const isDeload = activeMode === PERIODIZATION_MODES.DELOAD;
    const baseW = prevHistoricalWeight > 0 ? prevHistoricalWeight : (parseFloat(weight) || 20);
    // Libertad total: precarga la marca previa sin imponer subidas forzadas
    const suggestedW = isDeload
      ? Math.max(1, Math.round(baseW * 0.7 * 2) / 2)
      : baseW;
    const suggestedR = prevHistoricalReps || 10;
    return {
      suggested_weight: suggestedW,
      suggested_reps: suggestedR,
      is_deload: isDeload,
      type: isDeload ? "deload" : "reference",
    };
  }, [guidanceData?.suggested_goal, activeMode, prevHistoricalWeight, prevHistoricalReps, weight]);

  const substituteExercise = useMemo(() => {
    if (guidanceData?.substitute_exercise) {
      return guidanceData.substitute_exercise;
    }
    if (currentEx?.replacement_id) {
      const match = (allAvailableExercises || []).find((e) => e.id === currentEx.replacement_id);
      if (match) return match;
    }
    if (currentEx?.muscle_group_id) {
      const match = (allAvailableExercises || []).find(
        (e) => e.muscle_group_id === currentEx.muscle_group_id && e.id !== currentEx.id
      );
      if (match) return match;
    }
    return null;
  }, [guidanceData?.substitute_exercise, currentEx?.replacement_id, currentEx?.muscle_group_id, currentEx?.id, allAvailableExercises]);

  const exerciseImageUrl = useMemo(() => {
    return guidanceData?.image_url || currentEx?.image_url || null;
  }, [guidanceData?.image_url, currentEx?.image_url]);

  const exerciseKeyCue = useMemo(() => {
    return (
      guidanceData?.key_cue ||
      currentEx?.key_cue ||
      (currentEx?.execution_tips ? currentEx.execution_tips.slice(0, 80) : "Retracción escapular activa y trayectoria vertical controlada.")
    );
  }, [guidanceData?.key_cue, currentEx?.key_cue, currentEx?.execution_tips]);

  const guideData = useMemo(() => {
    if (techGuide) return techGuide;

    const rawTips = currentEx?.execution_tips || currentEx?.executionTips || "";
    const tempo = currentEx?.target_tempo || currentEx?.targetTempo || "3-0-1-0 (3s bajada / 1s subida)";
    const muscles =
      currentEx?.primary_muscles ||
      currentEx?.primaryMuscles ||
      (currentEx?.muscle_group_name ? `${currentEx.muscle_group_name}, estabilizadores sinergistas` : currentEquipment);

    const parsedLines = (rawTips || "")
      .split("\n")
      .map((l) => l.trim().replace(/^[•\-\*]\s*/, ""))
      .filter(Boolean);

    return {
      target_tempo: tempo,
      primary_muscles: muscles,
      key_points:
        parsedLines.length > 0
          ? parsedLines
          : [
              "Setup: Base firme, retracción escapular o apoyo lumbar neutro antes de iniciar.",
              "Ejecución: Descenso excéntrico de 3s estricto sin rebotes articulares ni inercias.",
              "Respiración: Inhalar diafragmático en la bajada; exhalar superando el punto de estancamiento.",
            ],
      level_recommendation:
        "Mantené cadencia controlada (3s bajando) y rango completo para maximizar el estímulo mecánico.",
    };
  }, [techGuide, currentEx, currentEquipment]);

  // -------------------------------------------------------------
  // 3. ELEVACIÓN TOTAL DE HOOKS: EFECTOS (useEffect)
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    if (currentEx?.id && typeof currentEx.id === "number") {
      getExerciseGuide(currentEx.id)
        .then((data) => {
          if (isMounted && data) setTechGuide(data);
        })
        .catch(() => {
          if (isMounted) setTechGuide(null);
        });
    } else {
      setTechGuide(null);
    }
    return () => {
      isMounted = false;
    };
  }, [currentEx?.id]);

  useEffect(() => {
    let isMounted = true;
    if (currentEx?.id && typeof currentEx.id === "number") {
      setLoadingGuidance(true);
      getExerciseGuidance(currentEx.id)
        .then((data) => {
          if (isMounted && data) {
            setGuidanceData(data);
          }
        })
        .catch((err) => {
          console.warn("Error cargando guidance para ejercicio:", err);
        })
        .finally(() => {
          if (isMounted) setLoadingGuidance(false);
        });
    } else {
      setGuidanceData(null);
    }
    return () => {
      isMounted = false;
    };
  }, [currentEx?.id]);

  useEffect(() => {
    const incoming = isSlotB ? secondSets : sets;
    setCurrentExerciseSets(Array.isArray(incoming) ? incoming : []);
  }, [sets, secondSets, isSlotB, currentEx?.id]);

  useEffect(() => {
    if (currentExerciseSets && currentExerciseSets.length > 0) {
      const prev = currentExerciseSets[currentExerciseSets.length - 1];
      setWeight(prev?.weight !== undefined && prev?.weight !== null ? String(prev.weight) : "");
      setReps(prev?.reps !== undefined && prev?.reps !== null ? String(prev.reps) : "10");
    } else {
      const lastWeight = prevHistoricalWeight > 0 ? String(prevHistoricalWeight) : "";
      const lastReps = prevHistoricalReps > 0 ? String(prevHistoricalReps) : "10";
      setWeight(lastWeight);
      setReps(lastReps);
    }
  }, [activeSlot, currentEx?.id]);

  useEffect(() => {
    if (isHdDetected) {
      setIsHeavyDutyMode(true);
    }
  }, [isHdDetected, currentEx?.id]);

  useEffect(() => {
    const handleSyncComplete = () => {
      setCurrentExerciseSets((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.map((s) => ({ ...s, is_offline: false }));
      });
    };
    window.addEventListener("fittracker:syncQueueCompleted", handleSyncComplete);
    return () => {
      window.removeEventListener("fittracker:syncQueueCompleted", handleSyncComplete);
    };
  }, []);

  // -------------------------------------------------------------
  // 4. HANDLERS Y MÉTODOS DEL COMPONENTE
  // -------------------------------------------------------------
  const adjustWeight = (delta) => {
    setWeight((prev) => {
      const current = parseFloat(prev) || 0;
      const next = Math.max(0, +(current + delta).toFixed(1));
      return String(next);
    });
  };

  const adjustReps = (delta) => {
    setReps((prev) => {
      const current = parseInt(prev, 10) || 0;
      const next = Math.max(1, current + delta);
      return String(next);
    });
  };

  const handleRegisterSet = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (e) {}
    }

    const currentWeight = parseFloat(weight) || 0;
    const currentReps = parseInt(reps, 10) || 1;
    const nextSetNumber = (currentExerciseSets || []).length + 1;
    const isOfflineNow = typeof navigator !== "undefined" && !navigator.onLine;

    const resolvedSetType = isHeavyDutyMode
      ? heavyDutySetType === "warmup"
        ? "warmup"
        : "heavy_duty"
      : "normal";
    const resolvedTechnique =
      isHeavyDutyMode && heavyDutySetType === "heavy_duty"
        ? selectedTechnique
        : null;

    const newSet = {
      id: `temp_set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      setNumber: nextSetNumber,
      weight: currentWeight,
      reps: currentReps,
      completed: true,
      slot: activeSlot,
      is_offline: isOfflineNow,
      set_type: resolvedSetType,
      technique: resolvedTechnique,
      rest_effort: resolvedTechnique,
      cadence: isHeavyDutyMode ? "4-2-4" : null,
    };

    setCurrentExerciseSets((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return [...arr, newSet];
    });

    if (onAddSet && currentEx?.id) {
      onAddSet(currentEx.id, newSet);
    }

    // Si se registró aproximación, conmutar automáticamente al set Heavy Duty
    if (isHeavyDutyMode && heavyDutySetType === "warmup") {
      setHeavyDutySetType("heavy_duty");
    }

    setWeight(currentWeight);
    setReps(currentReps);
  };

  const handleRemoveLocalSet = (idx) => {
    setCurrentExerciseSets((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, setNumber: i + 1 }));
    });
    if (onRemoveSet && currentEx?.id) {
      onRemoveSet(currentEx.id, idx);
    }
  };

  const lastSet =
    (currentExerciseSets || []).length > 0
      ? currentExerciseSets[currentExerciseSets.length - 1]
      : null;

  return (
    <div className="fixed inset-0 z-[60] min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Capa 1 - Top Header Fijo con iOS Safe Area Top */}
      <div className="w-full border-b border-[#2C2C2E] bg-[#121212] flex-shrink-0">
        <header className="w-full max-w-md md:max-w-xl mx-auto flex items-start justify-between gap-3 px-4 py-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                {currentEquipment}
              </span>
              {secondExercise && (
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7C4DFF]">
                    ⚡ Biserie Activa
                  </span>
                  <button
                    type="button"
                    onClick={onRemoveSecondExercise}
                    className="rounded-full border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 active:scale-95 transition"
                    title="Quitar Biserie"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white leading-tight break-words">
                {currentEx?.name || "Ejercicio"}
              </h1>

              {/* Botón 🔄 Alternativa rápida (Máquina ocupada) */}
              <button
                type="button"
                onClick={() => setShowSubstituteModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-95 transition cursor-pointer"
                title="Máquina ocupada: Buscar alternativa biomecánica equivalente"
              >
                <RotateCw size={12} className="text-amber-400 flex-shrink-0" />
                <span>Alternativa rápida</span>
              </button>

              {/* Botón discreto Diagrama Visual Técnico (Foto / Esquema) */}
              <button
                type="button"
                onClick={() => setShowDiagramModal(true)}
                className="inline-flex items-center justify-center h-7 w-7 rounded-xl border border-white/10 bg-[#1C1C1E] text-neutral-300 hover:text-white hover:border-[#FF5722]/50 active:scale-95 transition cursor-pointer"
                title="Ver diagrama visual anatómico y clave técnica de 1 línea"
              >
                <Camera size={14} className="text-[#FF8A65]" />
              </button>

              <button
                type="button"
                onClick={() => setShowTechGuide((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition active:scale-95 cursor-pointer select-none ${
                  showTechGuide
                    ? "border-[#FF5722] bg-[#FF5722]/15 text-[#FF8A65]"
                    : "border-white/10 bg-[#18181B] text-[#8E8E93] hover:text-white hover:border-white/20"
                }`}
                title="Ver Técnica, Tempo y Músculos del Ejercicio"
              >
                <span>💡</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${
                    showTechGuide ? "rotate-180 text-[#FF5722]" : ""
                  }`}
                />
              </button>

              {/* Botón / Toggle Modo Heavy Duty (Mike Mentzer) */}
              <button
                type="button"
                onClick={() => setIsHeavyDutyMode((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition active:scale-95 cursor-pointer select-none ${
                  isHeavyDutyMode
                    ? "border-[#FF5722] bg-gradient-to-r from-[#FF5722]/20 to-[#7C4DFF]/20 text-white shadow-sm"
                    : "border-white/10 bg-[#18181B] text-[#8E8E93] hover:text-white hover:border-white/20"
                }`}
                title="Modo Heavy Duty (Mike Mentzer: Alta Intensidad & 1 Serie al Fallo)"
              >
                <Flame size={12} className={isHeavyDutyMode ? "text-[#FF8A65]" : "text-[#8E8E93]"} />
                <span>{isHeavyDutyMode ? "Heavy Duty" : "Heavy Duty Off"}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onExitFocus}
            className="flex items-center gap-1.5 rounded-2xl border border-white/5 bg-[#1C1C1E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2C2C2E] transition active:scale-95 flex-shrink-0 cursor-pointer"
            title="Volver a la selección de ejercicios"
          >
            <span>← Catálogo</span>
          </button>
        </header>
      </div>

      {/* Capa 2 - Cuerpo Scrolleable */}
      <div className="w-full max-w-md md:max-w-xl mx-auto flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3.5">
        {/* Indicador de Referencia / Descarga: Chip compacto sin forzar incrementos */}
        <div className="flex items-center justify-center pt-0.5">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold border shadow-sm ${
              targetGoalData?.is_deload
                ? "bg-sky-500/15 border-sky-400/30 text-sky-300"
                : "bg-gradient-to-r from-[#FF5722]/20 to-[#7C4DFF]/20 border-[#FF5722]/35 text-white"
            }`}
          >
            <span>🎯</span>
            <span>
              {prevHistoricalWeight > 0 ? (
                <>
                  Previo: <strong className="font-black text-white">{targetGoalData?.suggested_weight} kg</strong> ×{" "}
                  <strong className="font-black text-white">{targetGoalData?.suggested_reps} reps</strong>
                </>
              ) : (
                <>
                  Sugerido: <strong className="font-black text-white">{targetGoalData?.suggested_weight} kg</strong> ×{" "}
                  <strong className="font-black text-white">{targetGoalData?.suggested_reps} reps</strong>
                </>
              )}
            </span>
            {targetGoalData?.is_deload && (
              <span className="text-[10px] text-sky-400 font-semibold uppercase bg-sky-500/20 px-1.5 py-0.2 rounded">
                -30% Descarga
              </span>
            )}
          </div>
        </div>

        {/* Chip indicador de Cadencia Técnica Heavy Duty: Mentzer */}
        {isHeavyDutyMode && (
          <div className="flex items-center justify-center pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border border-[#FF5722]/40 bg-gradient-to-r from-[#FF5722]/15 to-[#7C4DFF]/15 text-white shadow-sm">
              <span>⏱️ Cadencia Mentzer: 4s excéntrica | 2s pausa isométrica | 4s concéntrica</span>
            </div>
          </div>
        )}
        {showTechGuide && (
          <div className="bg-[#18181B] border border-white/10 rounded-2xl p-4 mt-2 mb-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-[#FF5722]/20 to-[#7C4DFF]/20 border border-[#FF5722]/30 text-xs font-semibold text-white">
                <Clock size={12} className="text-[#FF8A65]" />
                <span>Tempo: {guideData.target_tempo || "3s bajada / 1s subida"}</span>
              </div>

              <button
                type="button"
                onClick={() => setShowTechGuide(false)}
                className="text-[#8E8E93] hover:text-white text-xs p-1 transition"
                title="Cerrar Ficha Técnica"
              >
                <X size={15} />
              </button>
            </div>

            {guideData.primary_muscles && (
              <div className="text-xs">
                <span className="text-[#8E8E93] font-medium">🎯 Músculo principal: </span>
                <span className="text-white font-semibold">{guideData.primary_muscles}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8E93]">
                Puntos Clave de Técnica:
              </div>
              <ul className="space-y-1 text-xs text-[#C4C4C6]">
                {(guideData.key_points || []).map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-[#FF5722] mt-0.5 font-bold">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Soporte para alternar 2 ejercicios (Biserie / Superserie) */}
        {secondExercise ? (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#1C1C1E] border border-white/5">
            <button
              type="button"
              onClick={() => onSwitchSlot && onSwitchSlot("A")}
              className={`py-2.5 px-3 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 truncate active:scale-95 ${
                activeSlot === "A"
                  ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                  : "text-[#8E8E93] hover:text-white"
              }`}
            >
              <span className="truncate">A: {exercise?.name || "Ejercicio A"}</span>
              <span className="text-[10px] opacity-90 rounded bg-white/10 px-1 py-0.2 font-semibold">
                {activeSlot === "A" ? (currentExerciseSets || []).length : (sets || []).length}S
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchSlot && onSwitchSlot("B")}
              className={`py-2.5 px-3 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 truncate active:scale-95 ${
                activeSlot === "B"
                  ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                  : "text-[#8E8E93] hover:text-white"
              }`}
            >
              <span className="truncate">B: {secondExercise?.name || "Ejercicio B"}</span>
              <span className="text-[10px] opacity-90 rounded bg-white/10 px-1 py-0.2 font-semibold">
                {activeSlot === "B" ? (currentExerciseSets || []).length : (secondSets || []).length}S
              </span>
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsSupersetPickerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8E8E93] hover:text-white transition active:scale-95"
            >
              <ArrowRightLeft size={13} className="text-[#FF5722]" />
              <span>+ Alternar con otro ejercicio (Biserie)</span>
            </button>
          </div>
        )}

        {/* Historial inmediato dinámico de series */}
        <div className="rounded-2xl border border-white/5 bg-[#1C1C1E] px-3.5 py-2.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-white">
          <span className="text-[#8E8E93] text-[10px] font-semibold uppercase tracking-wider flex-shrink-0">
            Hoy:
          </span>
          {(currentExerciseSets || []).length === 0 ? (
            <span className="text-[#8E8E93] italic text-xs">
              {isHeavyDutyMode
                ? "Sin series aún — Comenzá con Aproximación o Serie Heavy Duty"
                : "Sin series registradas aún — Iniciá con la Serie 1"}
            </span>
          ) : (
            <div className="flex items-center gap-2 text-white">
              {(currentExerciseSets || []).map((s, idx) => (
                <div
                  key={s?.id || idx}
                  className="inline-flex items-center gap-1.5 text-white font-semibold"
                >
                  {idx > 0 && (
                    <span className="text-white/15 font-normal mr-1">|</span>
                  )}
                  {s?.set_type === "warmup" ? (
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                      Aprox:
                    </span>
                  ) : s?.set_type === "heavy_duty" ? (
                    <span className="rounded-md border border-[#FF5722]/40 bg-gradient-to-r from-[#FF5722]/20 to-[#7C4DFF]/20 px-1.5 py-0.5 text-[10px] font-black text-white">
                      🔥 HD:
                    </span>
                  ) : (
                    <span className="text-[#FF5722] font-bold">
                      S{s?.setNumber || idx + 1}:
                    </span>
                  )}
                  <span className="text-white font-semibold">
                    {s?.weight}kg × {s?.reps}
                  </span>
                  {(s?.technique || s?.rest_effort) && s?.set_type === "heavy_duty" && (
                    <span className="text-[10px] text-neutral-300 bg-white/10 px-1.5 py-0.2 rounded font-medium">
                      {s.technique || s.rest_effort}
                    </span>
                  )}
                  {s?.is_offline && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 font-medium inline-flex items-center gap-1">
                      💾 Guardado local (offline)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveLocalSet(idx)}
                    className="text-[#8E8E93] hover:text-red-400 p-0.5 ml-0.5 text-[11px] transition"
                    title="Eliminar esta serie"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODO HEAVY DUTY: ESTRUCTURA DE SERIES SIMPLIFICADA & TÉCNICAS AVANZADAS */}
        {isHeavyDutyMode ? (
          <div className="space-y-3 pt-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#8E8E93]">
                <span className="uppercase tracking-wide text-[11px] text-white">
                  Estructura de Series Heavy Duty
                </span>
                <span className="text-[10px] text-[#FF5722] font-bold">
                  1 Serie Efectiva al Fallo Absoluto
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Fila 1: Serie de Aproximación (Calentamiento - No fatiga) */}
                <button
                  type="button"
                  onClick={() => setHeavyDutySetType("warmup")}
                  className={`p-3 rounded-2xl border text-left transition active:scale-[0.98] cursor-pointer flex items-center justify-between ${
                    heavyDutySetType === "warmup"
                      ? "border-amber-500/60 bg-amber-500/15 text-white shadow-md shadow-amber-500/10"
                      : "border-white/5 bg-[#1C1C1E] text-[#8E8E93] hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-amber-400">
                        Serie de Aproximación (Calentamiento - No fatiga)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-tight">
                      Fila 1: Activación neuromuscular sin acumular fatiga
                    </p>
                  </div>
                  {heavyDutySetType === "warmup" && (
                    <Check size={18} className="text-amber-400 flex-shrink-0" />
                  )}
                </button>

                {/* Fila 2: 🔥 SERIE HEAVY DUTY (100% al fallo muscular) */}
                <button
                  type="button"
                  onClick={() => setHeavyDutySetType("heavy_duty")}
                  className={`p-3 rounded-2xl border text-left transition active:scale-[0.98] cursor-pointer flex items-center justify-between ${
                    heavyDutySetType === "heavy_duty"
                      ? "border-[#FF5722] bg-gradient-to-r from-[#FF5722]/25 to-[#7C4DFF]/25 text-white shadow-md shadow-[#FF5722]/20"
                      : "border-white/5 bg-[#1C1C1E] text-[#8E8E93] hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-white">
                        🔥 SERIE HEAVY DUTY (100% al fallo muscular)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#C4C4C6] mt-0.5 leading-tight">
                      Fila 2: Intensidad máxima y fallo concéntrico total
                    </p>
                  </div>
                  {heavyDutySetType === "heavy_duty" && (
                    <Check size={18} className="text-[#FF5722] flex-shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Selector rápido de técnica de intensidad al completar la serie efectiva */}
            {heavyDutySetType === "heavy_duty" && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-semibold text-[#8E8E93]">
                  <span className="uppercase tracking-wide text-[11px] text-white">
                    Técnica de Intensidad Mentzer
                  </span>
                  <span className="text-[10px] text-[#FF5722]">
                    Selecciona método al fallo
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {MENTZER_TECHNIQUES.map((tech) => {
                    const isSelected = selectedTechnique === tech.label;
                    return (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => setSelectedTechnique(tech.label)}
                        className={`p-2.5 rounded-2xl border text-left transition active:scale-[0.97] cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-[#FF5722] bg-[#FF5722]/20 text-white shadow-sm font-semibold"
                            : "border-white/5 bg-[#1C1C1E] text-[#8E8E93] hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span className="text-xs font-bold truncate">
                            {tech.label}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                              isSelected
                                ? "bg-[#FF5722]/30 text-white"
                                : "bg-white/5 text-[#8E8E93]"
                            }`}
                          >
                            {tech.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8E8E93] mt-1 line-clamp-2 leading-tight">
                          {tech.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 pt-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#8E8E93]">
              SERIE {(currentExerciseSets || []).length + 1}
            </span>

            {activeMode === PERIODIZATION_MODES.DELOAD ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-400">
                <span>🛡️</span>
                <span>Modo recuperación activa</span>
                <span className="text-[10px] text-[#8E8E93] font-normal">• RIR 3-4</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#1C1C1E] px-3 py-1 text-xs font-semibold text-[#8E8E93]">
                <span>⚡</span>
                <span>Carga libre autorregulada</span>
              </div>
            )}
          </div>
        )}

        {/* Controles de Carga y Reps */}
        <div className="rounded-2xl sm:rounded-3xl border border-white/5 bg-[#1C1C1E] p-4 sm:p-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#8E8E93]">
              <span className="tracking-wide">PESO (KG)</span>
              <span className="text-[11px] text-[#8E8E93] font-normal">
                {lastSet
                  ? `Previo: ${lastSet.weight} kg`
                  : prevHistoricalWeight > 0
                  ? `Previo: ${prevHistoricalWeight} kg`
                  : "Carga inicial"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 items-center">
              <button
                type="button"
                onClick={() => adjustWeight(-2.5)}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-[#121212] text-sm font-semibold text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                -2.5 kg
              </button>

              <div className="relative col-span-1">
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="w-full min-h-[52px] text-center text-white font-semibold text-2xl tracking-tight rounded-2xl border border-white/10 bg-[#121212] outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <button
                type="button"
                onClick={() => adjustWeight(2.5)}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-[#121212] text-sm font-semibold text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                +2.5 kg
              </button>

              <button
                type="button"
                onClick={() => adjustWeight(5)}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-[#121212] text-sm font-semibold text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                +5 kg
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[#8E8E93]">
              <span className="tracking-wide">REPETICIONES</span>
              <span className="text-[11px] text-[#8E8E93] font-normal">
                {lastSet ? `Previo: ${lastSet.reps} reps` : "Meta estándar"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <button
                type="button"
                onClick={() => adjustReps(-1)}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-[#121212] text-base font-semibold text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                -1
              </button>

              <div className="relative">
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="1"
                  className="w-full min-h-[52px] text-center text-white font-semibold text-2xl tracking-tight rounded-2xl border border-white/10 bg-[#121212] outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <button
                type="button"
                onClick={() => adjustReps(1)}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-[#121212] text-base font-semibold text-white hover:border-[#FF5722] active:scale-95 transition select-none flex items-center justify-center"
              >
                +1
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {(isHeavyDutyMode ? [6, 8, 10] : [8, 10, 12]).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setReps(num)}
                  className={`min-h-[44px] rounded-2xl border text-xs font-semibold transition active:scale-95 flex items-center justify-center ${
                    parseInt(reps, 10) === num
                      ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                      : "border border-white/10 bg-[#121212] text-[#8E8E93] hover:border-white/20 hover:text-white"
                  }`}
                >
                  {num} reps
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Capa 3 - Pie de Acción Fijo / Anclado */}
      <div className="w-full border-t border-[#2C2C2E] bg-[#121212] flex-shrink-0">
        <div className="w-full max-w-md md:max-w-xl mx-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
          <button
            type="button"
            onClick={handleRegisterSet}
            className={`w-full min-h-[52px] rounded-2xl font-semibold text-sm sm:text-base tracking-wide active:scale-[0.98] transition flex items-center justify-center gap-2 select-none shadow-none cursor-pointer ${
              isHeavyDutyMode && heavyDutySetType === "warmup"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-white"
                : "bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-95 text-white"
            }`}
          >
            {isHeavyDutyMode && heavyDutySetType === "heavy_duty" ? (
              <Flame size={20} className="fill-white/30" />
            ) : isHeavyDutyMode && heavyDutySetType === "warmup" ? (
              <Shield size={18} />
            ) : (
              <Check size={20} strokeWidth={2.5} />
            )}
            <span>
              {isHeavyDutyMode
                ? heavyDutySetType === "heavy_duty"
                  ? `🔥 REGISTRAR SERIE HEAVY DUTY (${selectedTechnique.toUpperCase()})`
                  : "🛡️ REGISTRAR APROXIMACIÓN (NO FATIGA)"
                : "✓ REGISTRAR SERIE"}
            </span>
          </button>

          <div className="flex items-center justify-center text-xs">
            <button
              type="button"
              onClick={onExitFocus}
              className="inline-flex items-center gap-2 text-[#8E8E93] hover:text-white py-1 px-3 rounded-xl border border-white/5 bg-[#1C1C1E] font-medium transition active:scale-95 cursor-pointer"
            >
              <span>← Volver al Catálogo de Ejercicios</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Selección de Ejercicio B (Biserie / Superserie) */}
      {isSupersetPickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[85dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[#2C2C2E] bg-[#121212] p-5 space-y-3 animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-white">
                  Alternar con otro ejercicio
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  Selecciona el Ejercicio B para tu superserie
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSupersetPickerOpen(false)}
                className="p-1.5 text-[#8E8E93] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {(muscleGroups || []).length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSupersetMuscleFilter(null)}
                  className={`rounded-full px-3 py-1 font-semibold whitespace-nowrap transition ${
                    supersetMuscleFilter === null
                      ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                      : "border border-white/10 bg-[#121212] text-[#8E8E93] hover:text-white"
                  }`}
                >
                  Todos
                </button>
                {(muscleGroups || []).map((g) => (
                  <button
                    key={g?.id || Math.random()}
                    type="button"
                    onClick={() => setSupersetMuscleFilter(g?.id)}
                    className={`rounded-full px-3 py-1 font-semibold whitespace-nowrap transition ${
                      supersetMuscleFilter === g?.id
                        ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                        : "border border-white/10 bg-[#121212] text-[#8E8E93] hover:text-white"
                    }`}
                  >
                    {g?.name || "Músculo"}
                  </button>
                ))}
              </div>
            )}

            <div className="overflow-y-auto space-y-1.5 max-h-60 pr-1">
              {(allAvailableExercises || [])
                .filter((ex) => ex?.id !== exercise?.id)
                .filter((ex) =>
                  supersetMuscleFilter
                    ? ex?.muscle_group_id === supersetMuscleFilter
                    : true
                )
                .map((ex) => (
                  <button
                    key={ex?.id || Math.random()}
                    type="button"
                    onClick={() => {
                      if (onSelectSecondExercise) onSelectSecondExercise(ex);
                      setIsSupersetPickerOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-2xl border border-white/5 bg-[#121212] hover:border-white/20 hover:bg-[#252528] transition flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{ex?.name || "Ejercicio"}</p>
                      <span className="text-[10px] text-[#8E8E93] uppercase font-medium">
                        {getExerciseEquipment(ex?.name || "")}
                      </span>
                    </div>
                    <span className="text-xs text-[#FF5722] font-semibold">
                      + Vincular
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL / POPOVER: ALTERNATIVA RÁPIDA (MÁQUINA OCUPADA) */}
      {showSubstituteModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-amber-500/30 bg-[#0F0F10] p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <RotateCw size={17} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Alternativa Rápida
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSubstituteModal(false)}
                className="text-[#8E8E93] hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-[#8E8E93]">
              ¿Máquina ocupada? Sustituto biomecánico equivalente para el mismo grupo muscular:
            </div>

            {substituteExercise ? (
              <div className="rounded-2xl border border-white/10 bg-[#171719] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{substituteExercise?.name || "Ejercicio equivalente"}</span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Equivalente
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E93]">
                  <span className="capitalize">{substituteExercise?.equipment_type || "Mismo grupo"}</span>
                  <span>•</span>
                  <span className="capitalize">{substituteExercise?.mechanics_type || "Compuesto"}</span>
                </div>

                {substituteExercise?.key_cue && (
                  <p className="text-[11px] text-neutral-300 italic border-l-2 border-amber-400/50 pl-2">
                    "{substituteExercise.key_cue}"
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onReplaceExercise) {
                        onReplaceExercise(currentEx?.id, substituteExercise);
                      }
                      setShowSubstituteModal(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#FF5722] text-white font-bold text-xs hover:opacity-95 active:scale-98 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check size={15} />
                    <span>Sustituir Ejercicio</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#171719] p-4 space-y-2 text-center text-xs text-[#8E8E93]">
                <p>Opciones equivalentes de tu catálogo:</p>
                <div className="max-h-48 overflow-y-auto space-y-1 pt-2 custom-scrollbar text-left">
                  {(allAvailableExercises || [])
                    .filter((e) => e?.muscle_group_id === currentEx?.muscle_group_id && e?.id !== currentEx?.id)
                    .slice(0, 6)
                    .map((alt) => (
                      <button
                        key={alt?.id || Math.random()}
                        type="button"
                        onClick={() => {
                          if (onReplaceExercise) {
                            onReplaceExercise(currentEx?.id, alt);
                          }
                          setShowSubstituteModal(false);
                        }}
                        className="w-full p-2.5 rounded-xl border border-white/5 bg-[#121212] hover:border-amber-400/40 text-xs font-semibold text-white flex items-center justify-between cursor-pointer"
                      >
                        <span>{alt?.name || "Alternativa"}</span>
                        <span className="text-[10px] text-[#8E8E93]">{alt?.equipment_type || "Alternativa"}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DEFENSIVO: DIAGRAMA VISUAL TÉCNICO (IMAGEN / ESQUEMA SVG + KEY CUE + EDICIÓN URL) */}
      <ExerciseMediaModal
        isOpen={showDiagramModal}
        onClose={() => setShowDiagramModal(false)}
        exercise={{
          id: currentEx?.id,
          name: currentEx?.name,
          image_url: exerciseImageUrl,
          key_cue: exerciseKeyCue,
          equipment_type: currentEquipment,
          mechanics_type: currentEx?.mechanics_type,
          muscle_group_name: currentEx?.muscle_group_name,
        }}
        onExerciseUpdated={(updated) => {
          if (currentEx && updated) {
            currentEx.image_url = updated.image_url;
          }
        }}
      />
    </div>
  );

}
