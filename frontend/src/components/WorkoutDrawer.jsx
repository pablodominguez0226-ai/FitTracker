import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  X,
  Plus,
  Minus,
  Check,
  Scale,
  Clock,
  Trophy,
  Trash2,
  Sparkles,
  Zap,
  Flame,
  ArrowUpRight,
  ChevronDown,
  RotateCw,
  Camera,
} from "lucide-react";
import PlateCalculatorModal from "./PlateCalculatorModal";
import { calculateEstimated1RM, getExerciseEquipment } from "../utils/fitnessUtils";
import { getStrengthRank } from "../utils/strengthRanks";
import {
  getSmartPeriodizationSuggestion,
  getWeeklyPeriodizationMode,
} from "../utils/periodization";
import { getExerciseGuide, getExerciseGuidance } from "../api/client";
import ExerciseMediaModal from "./ExerciseMediaModal";
import { getCachedExercises } from "../services/exerciseCache";


const RIR_OPTIONS = [
  { value: 0, label: "RIR 0 (Fallo)", short: "Fallo" },
  { value: 1, label: "RIR 1", short: "RIR 1" },
  { value: 2, label: "RIR 2", short: "RIR 2" },
  { value: 3, label: "RIR 3+", short: "RIR 3+" },
];

const SET_TYPES = [
  { key: "normal", label: "Normal", badge: "N" },
  { key: "warmup", label: "Calentamiento (W)", badge: "W" },
  { key: "dropset", label: "Drop Set (D)", badge: "D" },
  { key: "failure", label: "Al Fallo (F)", badge: "F" },
];

const REP_PILLS = [6, 8, 10, 12, 15];

export default function WorkoutDrawer({
  isOpen,
  onClose,
  exercise,
  activeExercise,
  record,
  previousSession,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onTriggerRestTimer,
  userProfile,
  onReplaceExercise,
  allAvailableExercises = [],
}) {
  // -------------------------------------------------------------
  // 1. ELEVACIÓN TOTAL DE HOOKS: ESTADOS (useState)
  // -------------------------------------------------------------
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("10");

  const [selectedRir, setSelectedRir] = useState(2);
  const [selectedType, setSelectedType] = useState("normal");
  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);
  const [rankUpNotification, setRankUpNotification] = useState(null);
  const [weeklyMode, setWeeklyMode] = useState(() => getWeeklyPeriodizationMode());
  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [showTechGuide, setShowTechGuide] = useState(false);
  const [techGuide, setTechGuide] = useState(null);
  const [guidanceData, setGuidanceData] = useState(null);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);

  // -------------------------------------------------------------
  // 2. ELEVACIÓN TOTAL DE HOOKS: MEMOS DE CÁLCULO (useMemo)
  // -------------------------------------------------------------
  const equipment = useMemo(() => {
    return getExerciseEquipment(activeExercise?.exerciseName || "");
  }, [activeExercise?.exerciseName]);

  const isBarbell = useMemo(() => {
    return equipment === "Barra";
  }, [equipment]);

  const userBw = useMemo(() => {
    return parseFloat(userProfile?.bodyweight) || 75;
  }, [userProfile?.bodyweight]);

  const maxWeightPrevio = useMemo(() => {
    return record?.pr_weight ? parseFloat(record.pr_weight) : 0;
  }, [record?.pr_weight]);

  const max1RMPrevio = useMemo(() => {
    if (record?.best_estimated_1rm) {
      return parseFloat(record.best_estimated_1rm);
    }
    if (maxWeightPrevio > 0 && record?.pr_reps) {
      return maxWeightPrevio * (1 + parseInt(record.pr_reps, 10) / 30);
    }
    return 0;
  }, [record?.best_estimated_1rm, record?.pr_reps, maxWeightPrevio]);

  const isWarmup = useMemo(() => {
    return selectedType === "warmup";
  }, [selectedType]);

  const curEst1RM = useMemo(() => {
    if (!isWarmup && weightInput > 0 && repsInput > 0) {
      return calculateEstimated1RM(weightInput, repsInput);
    }
    return 0;
  }, [isWarmup, weightInput, repsInput]);

  const isWeightPR = useMemo(() => {
    return (
      !isWarmup &&
      weightInput > 0 &&
      maxWeightPrevio > 0 &&
      weightInput > maxWeightPrevio
    );
  }, [isWarmup, weightInput, maxWeightPrevio]);

  const weightDiff = useMemo(() => {
    return isWeightPR ? +(weightInput - maxWeightPrevio).toFixed(1) : 0;
  }, [isWeightPR, weightInput, maxWeightPrevio]);

  const is1RMPR = useMemo(() => {
    return (
      !isWarmup &&
      curEst1RM > 0 &&
      max1RMPrevio > 0 &&
      curEst1RM > max1RMPrevio
    );
  }, [isWarmup, curEst1RM, max1RMPrevio]);

  const oneRmDiff = useMemo(() => {
    return is1RMPR ? +(curEst1RM - max1RMPrevio).toFixed(1) : 0;
  }, [is1RMPR, curEst1RM, max1RMPrevio]);

  const totalVolume = useMemo(() => {
    const rawSets = Array.isArray(activeExercise?.sets)
      ? activeExercise.sets
      : activeExercise?.sets && typeof activeExercise.sets === "object"
      ? Object.values(activeExercise.sets)
      : [];
    return (rawSets || []).reduce((sum, s) => {
      if (s?.set_type === "warmup" || s?.set_type === "W") return sum;
      return sum + (parseFloat(s?.weight) || 0) * (parseInt(s?.reps, 10) || 0);
    }, 0);
  }, [activeExercise?.sets]);

  const exerciseStrengthMetrics = useMemo(() => {
    const rawSets = Array.isArray(activeExercise?.sets)
      ? activeExercise.sets
      : activeExercise?.sets && typeof activeExercise.sets === "object"
      ? Object.values(activeExercise.sets)
      : [];
    const completedNonWarmup = (rawSets || []).filter(
      (s) => s && s.completed && s.set_type !== "warmup" && s.set_type !== "W"
    );

    let bestW = 0;
    let bestR = 10;
    let best1RM = 0;

    completedNonWarmup.forEach((s) => {
      if (!s) return;
      const sw = parseFloat(s.weight) || 0;
      const sr = parseInt(s.reps, 10) || 0;
      const s1rm = sw * (1 + sr / 30);
      if (s1rm > best1RM) {
        best1RM = s1rm;
        bestW = sw;
        bestR = sr;
      }
    });

    const baseWeight = record?.pr_weight ? parseFloat(record.pr_weight) : 0;
    const baseReps = record?.pr_reps ? parseInt(record.pr_reps, 10) : 10;
    const curEffectiveW = best1RM > max1RMPrevio ? bestW : baseWeight;
    const curEffectiveR = best1RM > max1RMPrevio ? bestR : baseReps;

    return { curEffectiveW, curEffectiveR };
  }, [activeExercise?.sets, record?.pr_weight, record?.pr_reps, max1RMPrevio]);

  const currentExerciseRank = useMemo(() => {
    if (!activeExercise?.exerciseName) {
      return { rankName: "Novato", rankColor: "#8E8E93", tier: 0, ratio: 0, icon: "Award" };
    }
    return getStrengthRank(
      activeExercise.exerciseName,
      exerciseStrengthMetrics.curEffectiveW,
      exerciseStrengthMetrics.curEffectiveR,
      userBw
    );
  }, [activeExercise?.exerciseName, exerciseStrengthMetrics, userBw]);

  const inputSetRank = useMemo(() => {
    if (!activeExercise?.exerciseName) {
      return { rankName: "Novato", rankColor: "#8E8E93", tier: 0, ratio: 0, icon: "Award" };
    }
    return getStrengthRank(
      activeExercise.exerciseName,
      weightInput,
      repsInput,
      userBw
    );
  }, [activeExercise?.exerciseName, weightInput, repsInput, userBw]);

  const periodizationSuggestion = useMemo(() => {
    if (!activeExercise?.exerciseName) return null;
    const prevSets = Array.isArray(previousSession?.sets)
      ? previousSession.sets
      : previousSession?.sets && typeof previousSession.sets === "object"
      ? Object.values(previousSession.sets)
      : [];
    const prevW =
      prevSets.length > 0 && prevSets?.[0]?.weight !== undefined
        ? parseFloat(prevSets?.[0]?.weight ?? 0)
        : record?.pr_weight
        ? parseFloat(record.pr_weight)
        : 0;
    const prevR =
      prevSets.length > 0 && prevSets?.[0]?.reps !== undefined
        ? parseInt(prevSets?.[0]?.reps ?? 10, 10)
        : record?.pr_reps
        ? parseInt(record.pr_reps, 10)
        : 10;
    return getSmartPeriodizationSuggestion({
      exerciseName: activeExercise.exerciseName,
      previousWeight: prevW,
      previousReps: prevR,
      equipment,
      mode: weeklyMode,
    });
  }, [activeExercise?.exerciseName, previousSession, record, equipment, weeklyMode]);

  const guideData = useMemo(() => {
    if (techGuide) return techGuide;
    if (!activeExercise) {
      return {
        target_tempo: "3-0-1-0",
        primary_muscles: "General",
        key_points: [],
        level_recommendation: "",
      };
    }

    const rawTips = activeExercise?.execution_tips || activeExercise?.executionTips || "";
    const tempo = activeExercise?.target_tempo || activeExercise?.targetTempo || "3-0-1-0 (3s bajada / 1s subida)";
    const muscles =
      activeExercise?.primary_muscles ||
      activeExercise?.primaryMuscles ||
      equipment;

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
  }, [techGuide, activeExercise, equipment]);

  const targetGoalData = useMemo(() => {
    if (guidanceData?.suggested_goal) {
      return guidanceData.suggested_goal;
    }
    const isDeload = weeklyMode === "deload";
    const baseW = maxWeightPrevio > 0 ? maxWeightPrevio : (parseFloat(weightInput) || 60);
    const suggestedW = isDeload
      ? Math.max(1, Math.round(baseW * 0.7 * 2) / 2)
      : baseW;
    const suggestedR = 10;
    return {
      suggested_weight: suggestedW,
      suggested_reps: suggestedR,
      is_deload: isDeload,
      type: isDeload ? "deload" : "free_load",
    };
  }, [guidanceData?.suggested_goal, weeklyMode, maxWeightPrevio, weightInput]);

  const substituteExercise = useMemo(() => {
    if (guidanceData?.substitute_exercise) {
      return guidanceData.substitute_exercise;
    }
    const curId = activeExercise?.exerciseId || exercise?.id;
    const pool =
      Array.isArray(allAvailableExercises) && allAvailableExercises.length > 0
        ? allAvailableExercises
        : getCachedExercises();
    const curEx = pool.find((e) => e?.id === curId);
    if (curEx?.replacement_id) {
      const rep = pool.find((e) => e?.id === curEx.replacement_id);
      if (rep) return rep;
    }
    if (curEx?.muscle_group_id) {
      const sameGroup = pool.find(
        (e) => e?.id !== curId && e?.muscle_group_id === curEx.muscle_group_id
      );
      if (sameGroup) return sameGroup;
    }
    return null;
  }, [
    guidanceData?.substitute_exercise,
    activeExercise?.exerciseId,
    exercise?.id,
    allAvailableExercises,
  ]);

  const exerciseImageUrl = useMemo(() => {
    return guidanceData?.image_url || exercise?.image_url || null;
  }, [guidanceData?.image_url, exercise?.image_url]);

  const exerciseKeyCue = useMemo(() => {
    return (
      guidanceData?.key_cue ||
      exercise?.key_cue ||
      "Retracción escapular activa y trayectoria controlada en todo el rango de movimiento."
    );
  }, [guidanceData?.key_cue, exercise?.key_cue]);

  // -------------------------------------------------------------
  // 3. ELEVACIÓN TOTAL DE HOOKS: EFECTOS (useEffect)
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    const exId = activeExercise?.exerciseId || exercise?.id;
    if (exId && typeof exId === "number") {
      getExerciseGuide(exId)
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
  }, [activeExercise?.exerciseId, exercise?.id]);

  useEffect(() => {
    let isMounted = true;
    const exId = activeExercise?.exerciseId || exercise?.id;
    if (exId && typeof exId === "number") {
      getExerciseGuidance(exId)
        .then((data) => {
          if (isMounted && data) setGuidanceData(data);
        })
        .catch(() => {
          if (isMounted) setGuidanceData(null);
        });
    } else {
      setGuidanceData(null);
    }
    return () => {
      isMounted = false;
    };
  }, [activeExercise?.exerciseId, exercise?.id]);

  useEffect(() => {
    const handlePeriodizationChange = (e) => {
      if (e?.detail) setWeeklyMode(e.detail);
      else setWeeklyMode(getWeeklyPeriodizationMode());
    };
    window.addEventListener("fittracker:periodizationChanged", handlePeriodizationChange);
    return () => {
      window.removeEventListener("fittracker:periodizationChanged", handlePeriodizationChange);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !activeExercise) return;

    const existingSets = Array.isArray(activeExercise.sets)
      ? activeExercise.sets
      : activeExercise?.sets && typeof activeExercise.sets === "object"
      ? Object.values(activeExercise.sets)
      : [];

    if (existingSets.length > 0) {
      const lastSet = existingSets[existingSets.length - 1];
      setWeightInput(lastSet.weight !== undefined && lastSet.weight > 0 ? String(lastSet.weight) : "");
      setRepsInput(lastSet.reps !== undefined && lastSet.reps > 0 ? String(lastSet.reps) : "10");
      setSelectedRir(lastSet.rir ?? 2);
      setSelectedType(lastSet.set_type ?? "normal");
      setSelectedAccessories(Array.isArray(lastSet.accessories) ? [...lastSet.accessories] : []);
    } else {
      const prevSets = Array.isArray(previousSession?.sets)
        ? previousSession.sets
        : previousSession?.sets && typeof previousSession.sets === "object"
        ? Object.values(previousSession.sets)
        : [];
      const prevW =
        prevSets.length > 0 && prevSets?.[0]?.weight !== undefined
          ? parseFloat(prevSets?.[0]?.weight ?? 0)
          : record?.pr_weight
          ? parseFloat(record.pr_weight)
          : 0;
      const prevR =
        prevSets.length > 0 && prevSets?.[0]?.reps !== undefined
          ? parseInt(prevSets?.[0]?.reps ?? 10, 10)
          : record?.pr_reps
          ? parseInt(record.pr_reps, 10)
          : 10;

      // Pre-cargar únicamente el último peso realizado como valor sugerido opcional, sin forzar incrementos ni defaults rígidos
      setWeightInput(prevW > 0 ? String(prevW) : "");
      setRepsInput(prevR > 0 ? String(prevR) : "10");
      setSelectedRir(2);
      setSelectedType("normal");
      setSelectedAccessories([]);
    }
  }, [isOpen, activeExercise?.exerciseId]);


  // -------------------------------------------------------------
  // 4. HANDLERS Y MÉTODOS DEL COMPONENTE
  // -------------------------------------------------------------
  const handleAdjustWeight = (delta) => {
    setWeightInput((prev) => {
      const cur = parseFloat(prev) || 0;
      return String(Math.max(0, Math.round((cur + delta) * 10) / 10));
    });
  };

  const handleAdjustReps = (delta) => {
    setRepsInput((prev) => {
      const cur = parseInt(prev, 10) || 0;
      return String(Math.max(1, cur + delta));
    });
  };

  const handleSaveSet = () => {
    if (!activeExercise) return;
    const safeSets = Array.isArray(activeExercise.sets)
      ? activeExercise.sets
      : activeExercise?.sets && typeof activeExercise.sets === "object"
      ? Object.values(activeExercise.sets)
      : [];
    const nextSetNumber = safeSets.length + 1;
    const saveWeight = parseFloat(weightInput) || 0;
    const saveReps = parseInt(repsInput, 10) || 0;

    // Check for Rank Up
    if (!isWarmup && inputSetRank.tier > currentExerciseRank.tier) {
      const rankUpData = {
        rankName: inputSetRank.rankName,
        rankColor: inputSetRank.rankColor,
        icon: inputSetRank.icon,
        tier: inputSetRank.tier,
        ratio: inputSetRank.ratio,
        exerciseName: activeExercise.exerciseName,
      };
      setRankUpNotification(rankUpData);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fittracker:rankUp", { detail: rankUpData })
        );
        window.dispatchEvent(new Event("fittracker:recordUpdated"));
      }

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([100, 50, 200]);
        } catch {}
      }

      setTimeout(() => {
        setRankUpNotification(null);
      }, 5000);
    }

    if (onAddSet) {
      onAddSet(activeExercise.exerciseId, {
        setNumber: nextSetNumber,
        weight: saveWeight,
        reps: saveReps,
        completed: true,
        rir: selectedRir,
        set_type: selectedType,
        accessories: selectedAccessories,
      });
    }

    // Automatically trigger floating rest timer
    if (onTriggerRestTimer) {
      onTriggerRestTimer({
        exerciseName: activeExercise.exerciseName,
        setNumber: nextSetNumber,
        weight: weightInput,
        reps: repsInput,
      });
    }
  };

  // -------------------------------------------------------------
  // 5. RETORNO CONDICIONAL (SOLO DESPUÉS DE TODOS LOS HOOKS)
  // -------------------------------------------------------------
  if (!isOpen || !activeExercise) {
    return null;
  }

  const safeExerciseSets = Array.isArray(activeExercise.sets)
    ? activeExercise.sets
    : activeExercise?.sets && typeof activeExercise.sets === "object"
    ? Object.values(activeExercise.sets)
    : [];

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-lg md:max-w-2xl bg-[#121212] border border-[#2C2C2E] rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[88dvh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
          {/* Capa 1 - Cabecera Fija */}
          <div className="p-4 border-b border-[#2C2C2E] bg-[#121212] flex items-start justify-between gap-2 flex-shrink-0">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-[#8E8E93]">
                  {equipment}
                </span>

                {record?.pr_weight ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#FF5722]">
                    <Trophy size={11} /> PR: {record.pr_weight}kg × {record.pr_reps}
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-[#8E8E93]">
                    Sin PR previo
                  </span>
                )}

                {totalVolume > 0 && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-[#8E8E93]">
                    Volumen: {Math.round(totalVolume).toLocaleString()} kg
                  </span>
                )}

                {/* Exercise Strength Rank Badge */}
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition"
                  style={{
                    borderColor: `${currentExerciseRank.rankColor}40`,
                    backgroundColor: `${currentExerciseRank.rankColor}15`,
                    color: currentExerciseRank.rankColor,
                  }}
                  title={`Rango actual en ${activeExercise.exerciseName}: ${currentExerciseRank.rankName} (${currentExerciseRank.ratio}× peso corporal)`}
                >
                  <span>{currentExerciseRank.icon}</span>
                  <span>{currentExerciseRank.rankName}</span>
                  {currentExerciseRank.ratio > 0 && (
                    <span className="opacity-90 font-bold">({currentExerciseRank.ratio}×)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-semibold tracking-tight text-white truncate break-words">
                  {activeExercise.exerciseName}
                </h2>

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

                {/* Botón sutil tipo chip: 💡 Técnica & Claves */}
                <button
                  type="button"
                  onClick={() => setShowTechGuide((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition active:scale-95 cursor-pointer select-none ${
                    showTechGuide
                      ? "border-[#FF5722] bg-[#FF5722]/15 text-[#FF8A65]"
                      : "border-white/10 bg-[#1C1C1E] text-[#8E8E93] hover:text-white hover:border-white/20"
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
              </div>

              {(() => {
                try {
                  const s = localStorage.getItem("fittracker_machine_settings");
                  const ms = s ? JSON.parse(s)[activeExercise?.exerciseId] : "";
                  if (!ms) return null;
                  return (
                    <div className="text-xs font-medium text-[#8E8E93] flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-[#FF5722]">⚙️</span>
                      <span>Ajustes de máquina: <strong className="text-white">{ms}</strong></span>
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}
            </div>

            {/* Close / Volver al Catálogo Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-2xl border border-white/5 bg-[#1C1C1E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#252528] transition active:scale-95 flex-shrink-0 cursor-pointer"
              title="Volver al Catálogo de Ejercicios"
            >
              <span>← Catálogo</span>
            </button>
          </div>

          {/* Capa 2 - Cuerpo Scrolleable */}
          <div className="p-4 space-y-4 overflow-y-auto overscroll-contain flex-1">
            {/* Indicador de Referencia / Carga Libre Autorregulada */}
            <div className="flex items-center justify-center pt-0.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold border border-white/10 bg-[#1C1C1E] text-[#8E8E93]">
                <span>⚡</span>
                <span>
                  Última carga:{" "}
                  <strong className="font-bold text-white">
                    {maxWeightPrevio > 0 ? `${maxWeightPrevio} kg` : "Carga inicial"}
                  </strong>
                </span>
                <span className="text-[10px] text-[#8E8E93] border-l border-white/10 pl-2 font-normal">
                  Carga libre autorregulada
                </span>
              </div>
            </div>
            {/* Ficha Técnica Desplegable */}
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

            {/* Micro-notificación de felicitación por subida de rango */}
            {rankUpNotification && (
              <div className="rounded-3xl border border-white/10 bg-[#121212] p-3.5 flex items-center justify-between gap-3 relative overflow-hidden select-none">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl flex-shrink-0"
                    style={{
                      backgroundColor: `${rankUpNotification.rankColor}20`,
                      border: `1px solid ${rankUpNotification.rankColor}50`,
                    }}
                  >
                    ⚡
                  </div>
                  <div>
                    <div
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: rankUpNotification.rankColor }}
                    >
                      ⚡ Subida de Rango
                    </div>
                    <p className="text-xs font-semibold text-white">
                      ¡Alcanzaste el rango{" "}
                      <span
                        className="uppercase font-bold"
                        style={{ color: rankUpNotification.rankColor }}
                      >
                        {rankUpNotification.rankName}
                      </span>{" "}
                      en {activeExercise.exerciseName}!
                    </p>
                    <p className="text-[11px] text-[#8E8E93] mt-0.5">
                      Rango relativo: <strong>{rankUpNotification.ratio}×</strong> peso corporal
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRankUpNotification(null)}
                  className="text-[#8E8E93] hover:text-white transition p-1"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Concise OLED Strength Rank Badge & Weekly Periodization Suggestion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border border-white/5 bg-[#121212] text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span className="text-[#8E8E93]">Rango actual:</span>
                  <strong
                    className="font-bold uppercase tracking-wider"
                    style={{ color: currentExerciseRank.rankColor || "#FF5722" }}
                  >
                    {currentExerciseRank.rankName}
                  </strong>
                  {currentExerciseRank.ratio > 0 && (
                    <span className="text-[10px] text-[#71717A] font-normal">
                      ({currentExerciseRank.ratio}× BW)
                    </span>
                  )}
                </span>

                <span className="text-[11px] font-medium text-[#A1A1AA]">
                  {currentExerciseRank.tier < 6 && currentExerciseRank.nextRankTargetKg ? (
                    <>
                      Próximo rango:{" "}
                      <strong className="font-black text-[#FF5722]">
                        {currentExerciseRank.nextRankTargetKg} kg
                      </strong>
                    </>
                  ) : (
                    <strong className="font-black text-amber-300">👑 Rango Máximo</strong>
                  )}
                </span>
              </div>

              {weeklyMode === "deload" && (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-sky-400/30 bg-sky-500/10 text-xs font-semibold text-sky-300">
                  <span className="flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>Semana de descarga técnica (RIR 3-4 sugerido)</span>
                  </span>
                </div>
              )}
            </div>

            {/* Compact Today's Sets Table */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-bold text-neutral-300">
                <span>Series registradas hoy:</span>
                <span className="text-[#FF8A65] font-black">
                  {safeExerciseSets.length} completadas
                </span>
              </div>

              {safeExerciseSets.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-[#141118] p-3 text-center text-xs text-neutral-200 italic">
                  {Array.isArray(previousSession?.sets) && previousSession.sets.length > 0
                    ? `Previo: ${previousSession?.sets?.[0]?.weight ?? 0} kg × ${previousSession?.sets?.[0]?.reps ?? 0} reps • Cargá tu primera serie`
                    : "HOY: Sin series registradas en este ejercicio hoy"}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar p-1 rounded-xl bg-[#050505] border border-white/10">
                  {safeExerciseSets.map((s, sIdx) => {
                    const isW = s?.set_type === "warmup" || s?.set_type === "W";
                    const isD = s?.set_type === "dropset" || s?.set_type === "D";
                    const isF = s?.set_type === "failure" || s?.set_type === "F";

                    return (
                      <div
                        key={s?.id || sIdx}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/5 bg-[#121212] px-2.5 py-1 text-xs font-semibold text-[#8E8E93]"
                      >
                        <span className="text-[#8E8E93]">S{s?.set_number || sIdx + 1}:</span>
                        <span className="text-white font-semibold">
                          {s?.weight}kg × {s?.reps}
                        </span>
                        {s?.is_offline && (
                          <span className="rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 text-[9px] font-semibold inline-flex items-center gap-1" title="Guardado local (offline)">
                            💾 Guardado local (offline)
                          </span>
                        )}
                        {s?.rir !== null && s?.rir !== undefined && (
                          <span className="text-[10px] text-[#FF5722] font-semibold">
                            RIR:{s.rir}
                          </span>
                        )}
                        {Array.isArray(s?.accessories) && s.accessories.length > 0 && (
                          <span className="rounded-md bg-white/5 border border-white/10 px-1 text-[9px] font-semibold text-[#8E8E93]" title={`Accesorios: ${s.accessories.join(', ')}`}>
                            {s.accessories.join(", ")}
                          </span>
                        )}
                        {isW && (
                          <span className="rounded-md bg-amber-500/15 text-amber-300 px-1 text-[9px] font-semibold">
                            W
                          </span>
                        )}
                        {isD && (
                          <span className="rounded-md bg-blue-500/15 text-blue-300 px-1 text-[9px] font-semibold">
                            D
                          </span>
                        )}
                        {isF && (
                          <span className="rounded-md bg-red-500/15 text-red-300 px-1 text-[9px] font-semibold">
                            F
                          </span>
                        )}
                        {onRemoveSet && (
                          <button
                            type="button"
                            onClick={() => onRemoveSet(activeExercise.exerciseId, sIdx)}
                            className="text-[#8E8E93] hover:text-red-400 transition ml-0.5"
                            title="Eliminar serie"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Real-time PR Alerts in Drawer */}
            {isWeightPR && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-300 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span>🏆</span>
                  <span>¡NUEVO PR DE PESO!</span>
                </div>
                <span className="text-white">
                  +{weightDiff} kg sobre anterior ({maxWeightPrevio}kg)
                </span>
              </div>
            )}

            {!isWeightPR && is1RMPR && (
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-2 text-purple-200 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>¡NUEVO PR DE 1RM ESTIMADO!</span>
                </div>
                <span className="text-white">
                  +{oneRmDiff} kg (1RM: {curEst1RM}kg)
                </span>
              </div>
            )}

            {/* Quick Input Controls for Weight and Reps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Peso (kg) with Steppers & Quick Jump */}
              <div className="rounded-2xl sm:rounded-3xl border border-white/5 bg-[#121212] p-3 space-y-2 text-center">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-[#8E8E93]">
                    Carga (kg)
                  </span>
                  {isBarbell && (
                    <button
                      type="button"
                      onClick={() => setIsPlateModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-[#8E8E93] hover:border-white/20 hover:text-white transition active:scale-95"
                      title="Abrir calculadora de discos"
                    >
                      <Scale size={12} />
                      <span>Discos</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(-5)}
                    className="oled-stepper-btn"
                    title="-5 kg"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(-2.5)}
                    className="oled-stepper-btn"
                    title="-2.5 kg"
                  >
                    -2.5
                  </button>

                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="w-20 sm:w-24 text-center px-2 py-2 text-2xl font-semibold text-white rounded-2xl border border-white/10 bg-[#1C1C1E] outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#8E8E93]">
                      kg
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(+2.5)}
                    className="oled-stepper-btn"
                    title="+2.5 kg"
                  >
                    +2.5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(+5)}
                    className="oled-stepper-btn"
                    title="+5 kg"
                  >
                    +5
                  </button>
                </div>

                <div className="flex justify-center gap-1 pt-1">
                  {[+1.25, +2.5, +5, +10].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleAdjustWeight(inc)}
                      className="rounded-xl border border-white/10 bg-[#1C1C1E] px-2 py-0.5 text-[10px] font-semibold text-[#8E8E93] hover:text-white active:scale-95 transition"
                    >
                      +{inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeticiones with Steppers & Quick Pills */}
              <div className="rounded-2xl sm:rounded-3xl border border-white/5 bg-[#121212] p-3 space-y-2 text-center">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-[#8E8E93]">
                    Repeticiones
                  </span>
                  {curEst1RM > 0 && repsInput > 1 && (
                    <span className="text-[10px] font-semibold text-[#FF5722]">
                      1RM: {curEst1RM}kg
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAdjustReps(-1)}
                    className="oled-stepper-btn"
                    title="-1 rep"
                  >
                    -1
                  </button>

                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={repsInput}
                      onChange={(e) => setRepsInput(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="1"
                      className="w-20 sm:w-24 text-center px-2 py-2 text-2xl font-semibold text-white rounded-2xl border border-white/10 bg-[#1C1C1E] outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#8E8E93]">
                      reps
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdjustReps(+1)}
                    className="oled-stepper-btn"
                    title="+1 rep"
                  >
                    +1
                  </button>
                </div>

                <div className="flex justify-center gap-1.5 pt-1">
                  {REP_PILLS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRepsInput(r)}
                      className={`rounded-xl px-2.5 py-0.5 text-[10px] font-semibold transition active:scale-95 ${
                        repsInput === r
                          ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                          : "border border-white/10 bg-[#1C1C1E] text-[#8E8E93] hover:text-white"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIR and Tipo de Serie Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl border border-white/5 bg-[#121212] p-2.5 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-[#8E8E93] block">
                  RIR (Repeticiones en Reserva):
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {RIR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedRir(opt.value)}
                      className={`rounded-xl py-1.5 text-[10px] font-semibold transition active:scale-95 ${
                        selectedRir === opt.value
                          ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                          : "border border-white/10 bg-[#1C1C1E] text-[#8E8E93] hover:text-white"
                      }`}
                    >
                      {opt.short}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#121212] p-2.5 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-[#8E8E93] block">
                  Tipo de Serie:
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {SET_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSelectedType(t.key)}
                      className={`rounded-xl py-1.5 text-[10px] font-semibold transition active:scale-95 ${
                        selectedType === t.key
                          ? t.key === "warmup"
                            ? "border border-amber-500 bg-amber-500/20 text-amber-300 font-semibold"
                            : t.key === "failure"
                            ? "border border-red-500 bg-red-500/20 text-red-300 font-semibold"
                            : "border border-[#FF5722] bg-[#FF5722]/10 text-white font-semibold"
                          : "border border-white/10 bg-[#1C1C1E] text-[#8E8E93] hover:text-white"
                      }`}
                      title={t.label}
                    >
                      {t.badge} ({t.key === "normal" ? "Norm" : t.key === "warmup" ? "Cal" : t.key === "dropset" ? "Drop" : "Fallo"})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Accessories Selector in Drawer: [Straps] [Cinturón] [Agarre Neutro] */}
            <div className="rounded-2xl border border-white/5 bg-[#121212] p-2.5 space-y-1.5">
              <span className="text-[10px] font-semibold uppercase text-[#8E8E93] block">
                Accesorios para esta serie:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {["Straps", "Cinturón", "Agarre Neutro"].map((acc) => {
                  const isSelected = selectedAccessories.includes(acc);
                  return (
                    <button
                      key={acc}
                      type="button"
                      onClick={() =>
                        setSelectedAccessories((prev) =>
                          prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
                        )
                      }
                      className={`rounded-xl py-2 text-xs font-semibold transition active:scale-95 text-center ${
                        isSelected
                          ? "border border-[#FF5722] bg-[#FF5722]/10 text-white"
                          : "border border-white/10 bg-[#1C1C1E] text-[#8E8E93] hover:text-white"
                      }`}
                    >
                      {isSelected ? "✓ " : ""}{acc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Capa 3 - Pie de Acción Fijo / Anclado */}
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#2C2C2E] bg-[#121212] flex-shrink-0">
            <button
              type="button"
              onClick={handleSaveSet}
              className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#7C4DFF] hover:opacity-95 p-3.5 text-sm sm:text-base font-semibold tracking-wide text-white active:scale-[0.98] transition flex items-center justify-center gap-2 select-none shadow-none cursor-pointer"
            >
              <Check size={20} strokeWidth={2.5} />
              <span>
                ✓ Guardar Serie #{ safeExerciseSets.length + 1 } (
                {weightInput}kg × {repsInput} reps)
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Barbell Plate Calculator Modal */}
      <PlateCalculatorModal
        isOpen={isPlateModalOpen}
        onClose={() => setIsPlateModalOpen(false)}
        initialWeight={weightInput}
        exerciseName={activeExercise?.exerciseName}
        onApplyWeight={(w) => setWeightInput(w)}
      />

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
                  <span className="capitalize">{substituteExercise.equipment_type || "Mismo grupo"}</span>
                  <span>•</span>
                  <span className="capitalize">{substituteExercise.mechanics_type || "Compuesto"}</span>
                </div>

                {substituteExercise.key_cue && (
                  <p className="text-[11px] text-neutral-300 italic border-l-2 border-amber-400/50 pl-2">
                    "{substituteExercise.key_cue}"
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onReplaceExercise) {
                        onReplaceExercise(activeExercise?.exerciseId || exercise?.id, substituteExercise);
                      }
                      setShowSubstituteModal(false);
                      if (onClose) onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#FF5722] text-white font-bold text-xs hover:opacity-95 active:scale-98 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check size={15} />
                    <span>Sustituir Ejercicio</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#171719] p-4 text-center text-xs text-[#8E8E93]">
                <p>No se encontró sustituto directo preconfigurado.</p>
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
          id: activeExercise?.exerciseId || exercise?.id,
          name: activeExercise?.exerciseName || exercise?.name,
          image_url: exerciseImageUrl,
          key_cue: exerciseKeyCue,
          equipment_type: equipment,
          mechanics_type: exercise?.mechanics_type,
          muscle_group_name: exercise?.muscle_group_name,
        }}
        onExerciseUpdated={(updated) => {
          if (exercise && updated) {
            exercise.image_url = updated.image_url;
          }
        }}
      />
    </>
  );

}
