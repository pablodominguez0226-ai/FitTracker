import React, { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  Clock,
  Dumbbell,
  Pause,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import ExerciseDiagram, { formatExerciseName } from "./ExerciseDiagram";
import ExerciseDetailView from "./ExerciseDetailView";
import ExerciseMediaViewer from "./ExerciseMediaViewer";

function formatTimerClock(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Tarjeta Bento Individual de Ejercicio en Sesión Activa
 */
function ActiveExerciseBentoCard({
  exerciseItem,
  catalogExercise,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onRemoveExercise,
  onOpenDetail,
}) {
  const exerciseId = exerciseItem?.exerciseId || catalogExercise?.id;
  const exerciseName =
    exerciseItem?.exerciseName || catalogExercise?.name || "Ejercicio";
  const muscleGroup =
    exerciseItem?.muscleGroupName ||
    catalogExercise?.muscle_group_name ||
    "Abdominales";

  // Filas locales de series (garantizando al menos 1 fila visible como en el diseño de referencia)
  const [rows, setRows] = useState(() => {
    const incoming = Array.isArray(exerciseItem?.sets) ? exerciseItem.sets : [];
    if (incoming.length > 0) {
      return incoming.map((s, i) => ({
        id: s.id || `row_${i}`,
        setNumber: i + 1,
        weight:
          s.weight !== undefined && s.weight !== null ? String(s.weight) : "0",
        reps:
          s.reps !== undefined && s.reps !== null && Number(s.reps) > 0
            ? String(s.reps)
            : "",
        completed: Boolean(s.completed),
        persistedIndex: i,
      }));
    }
    return [
      {
        id: `draft_${Date.now()}_0`,
        setNumber: 1,
        weight: "0",
        reps: "",
        completed: false,
        persistedIndex: null,
      },
    ];
  });

  // Cronómetro de descanso por tarjeta ("1 min de descanso")
  const [restRemaining, setRestRemaining] = useState(0);

  useEffect(() => {
    const incoming = Array.isArray(exerciseItem?.sets) ? exerciseItem.sets : [];
    if (incoming.length > 0) {
      setRows((prev) => {
        const mapped = incoming.map((s, i) => ({
          id: s.id || `row_${i}`,
          setNumber: i + 1,
          weight:
            s.weight !== undefined && s.weight !== null
              ? String(s.weight)
              : "0",
          reps:
            s.reps !== undefined && s.reps !== null && Number(s.reps) > 0
              ? String(s.reps)
              : prev[i]?.reps ?? "",
          completed: Boolean(s.completed),
          persistedIndex: i,
        }));
        const extraDrafts = prev.slice(incoming.length).filter((r) => r.persistedIndex === null);
        return [...mapped, ...extraDrafts].map((r, idx) => ({
          ...r,
          setNumber: idx + 1,
        }));
      });
    }
  }, [exerciseItem?.sets]);

  useEffect(() => {
    if (restRemaining <= 0) return;
    const t = setInterval(() => {
      setRestRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [restRemaining]);

  const handleFieldChange = (rowIdx, field, value) => {
    setRows((prev) =>
      prev.map((r, idx) => (idx === rowIdx ? { ...r, [field]: value } : r))
    );
    const targetRow = rows[rowIdx];
    if (targetRow && targetRow.persistedIndex !== null && onUpdateSet) {
      const nextWeight =
        field === "weight"
          ? parseFloat(value) || 0
          : parseFloat(targetRow.weight) || 0;
      const nextReps =
        field === "reps"
          ? parseInt(value, 10) || 0
          : parseInt(targetRow.reps, 10) || 0;
      onUpdateSet(exerciseId, targetRow.persistedIndex, {
        weight: nextWeight,
        reps: nextReps,
        completed: targetRow.completed,
      });
    }
  };

  const handleToggleCheck = (rowIdx) => {
    const targetRow = rows[rowIdx];
    if (!targetRow) return;

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch {}
    }

    const numericWeight = parseFloat(targetRow.weight) || 0;
    const numericReps = parseInt(targetRow.reps, 10) || 10;

    if (!targetRow.completed) {
      setRows((prev) =>
        prev.map((r, idx) =>
          idx === rowIdx
            ? {
                ...r,
                weight: String(numericWeight),
                reps: String(numericReps),
                completed: true,
              }
            : r
        )
      );
      if (onAddSet && targetRow.persistedIndex === null) {
        onAddSet(exerciseId, {
          setNumber: rowIdx + 1,
          weight: numericWeight,
          reps: numericReps,
          completed: true,
        });
      } else if (onUpdateSet && targetRow.persistedIndex !== null) {
        onUpdateSet(exerciseId, targetRow.persistedIndex, {
          weight: numericWeight,
          reps: numericReps,
          completed: true,
        });
      }
    } else {
      if (targetRow.persistedIndex !== null && onRemoveSet && rows.length > 1) {
        onRemoveSet(exerciseId, targetRow.persistedIndex);
      } else {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === rowIdx ? { ...r, completed: false } : r
          )
        );
        if (onUpdateSet && targetRow.persistedIndex !== null) {
          onUpdateSet(exerciseId, targetRow.persistedIndex, {
            weight: numericWeight,
            reps: numericReps,
            completed: false,
          });
        }
      }
    }
  };

  const handleAddSerieRow = () => {
    const lastRow = rows[rows.length - 1];
    const nextWeight =
      lastRow?.weight !== undefined ? String(lastRow.weight) : "0";
    const nextReps = lastRow?.reps ? String(lastRow.reps) : "";
    const nextNum = rows.length + 1;

    const newRow = {
      id: `draft_${Date.now()}_${nextNum}`,
      setNumber: nextNum,
      weight: nextWeight,
      reps: nextReps,
      completed: false,
      persistedIndex: null,
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handleToggleRestTimer = () => {
    if (restRemaining > 0) {
      setRestRemaining(0);
    } else {
      setRestRemaining(60);
    }
  };

  const rawImgUrl = catalogExercise?.mediaUrl || catalogExercise?.image_url || "";

  return (
    <div className="rounded-3xl p-5 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm mb-4 transition-colors">
      {/* Fila Cabecera: Thumbnail anatómico a la izquierda, título en negrita, subtítulo de carga, botón tacho de basura a la derecha */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div
          onClick={() =>
            onOpenDetail &&
            onOpenDetail(
              catalogExercise || {
                id: exerciseId,
                name: exerciseName,
                muscle_group_name: muscleGroup,
              }
            )
          }
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
        >
          <ExerciseMediaViewer
            src={rawImgUrl}
            slug={catalogExercise?.slug}
            alt={exerciseName}
            muscleGroup={muscleGroup}
            exerciseName={exerciseName}
            variant="thumbnail"
          />

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition">
              {formatExerciseName(exerciseName)}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {muscleGroup && (
                <span className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  {muscleGroup}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemoveExercise && onRemoveExercise(exerciseId)}
          className="w-9 h-9 rounded-full text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition active:scale-90 cursor-pointer flex-shrink-0"
          title="Eliminar ejercicio de la sesión"
          aria-label={`Eliminar ${exerciseName}`}
        >
          <Trash2 size={17} />
        </button>
      </div>

      {/* Filas de Registro de Serie */}
      <div className="space-y-2.5">
        {rows.map((row, idx) => (
          <div
            key={row.id || idx}
            className="flex items-center justify-between gap-2"
          >
            {/* Badge circular de serie */}
            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
              {idx + 1}
            </span>

            {/* Input de Peso en píldora ("0 kg") */}
            <div className="bg-slate-100 dark:bg-[#161B26] border border-transparent dark:border-white/[0.05] rounded-xl px-4 py-2 font-bold text-sm flex-1 min-w-0 flex items-center justify-center gap-1">
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={row.weight}
                onChange={(e) =>
                  handleFieldChange(idx, "weight", e.target.value)
                }
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className="w-full bg-transparent text-center font-bold text-sm text-slate-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`Peso serie ${idx + 1}`}
              />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                kg
              </span>
            </div>

            {/* Separador x */}
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex-shrink-0">
              x
            </span>

            {/* Input de Repeticiones en píldora ("Representante" / "Reps") */}
            <div className="bg-slate-100 dark:bg-[#161B26] border border-transparent dark:border-white/[0.05] rounded-xl px-4 py-2 font-bold text-sm flex-1 min-w-0 flex items-center justify-center">
              <input
                type="number"
                step="1"
                inputMode="numeric"
                value={row.reps}
                onChange={(e) => handleFieldChange(idx, "reps", e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Representante"
                className="w-full bg-transparent text-center font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-semibold placeholder:text-xs outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`Repeticiones serie ${idx + 1}`}
              />
            </div>

            {/* Botón de confirmación Check ✓ en círculo gris/rojo suave */}
            <button
              type="button"
              onClick={() => handleToggleCheck(idx)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer flex-shrink-0 ${
                row.completed
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-[#161B26] text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400"
              }`}
              title={row.completed ? "Serie completada" : "Confirmar serie"}
              aria-label={`Confirmar serie ${idx + 1}`}
            >
              <Check size={15} strokeWidth={3} />
            </button>
          </div>
        ))}
      </div>

      {/* Fila de Acciones de Serie */}
      <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-slate-100 dark:border-white/[0.07]">
        {/* Botón "1 min de descanso" */}
        <button
          type="button"
          onClick={handleToggleRestTimer}
          className={`bg-slate-100 dark:bg-[#161B26] border border-transparent dark:border-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-2 rounded-full flex items-center gap-1 transition active:scale-95 cursor-pointer ${
            restRemaining > 0
              ? "ring-2 ring-red-500/50 text-red-600 dark:text-red-400 font-bold"
              : ""
          }`}
        >
          <Clock size={13} className="text-red-500" />
          <span>
            {restRemaining > 0
              ? `Descanso ${formatTimerClock(restRemaining)}`
              : "1 min de descanso"}
          </span>
        </button>

        {/* Botón "+ Añadir serie" */}
        <button
          type="button"
          onClick={handleAddSerieRow}
          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm transition active:scale-95 cursor-pointer"
        >
          + Añadir serie
        </button>
      </div>
    </div>
  );
}

/**
 * ActiveWorkoutSession - Logger de Entrenamiento en Vivo (Módulo 4)
 */
export default function ActiveWorkoutSession({
  activeExercises = [],
  allExercises = [],
  sessionStartedAt = null,
  onBack,
  onDiscard,
  onFinish,
  onOpenAddExercise,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onRemoveExercise,
  isSaving = false,
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    if (!sessionStartedAt) return 5;
    return Math.max(
      0,
      Math.floor((Date.now() - Number(sessionStartedAt)) / 1000)
    );
  });
  const [detailExercise, setDetailExercise] = useState(null);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const exercisesMap = React.useMemo(() => {
    const map = {};
    (allExercises || []).forEach((ex) => {
      if (ex?.id) map[ex.id] = ex;
    });
    return map;
  }, [allExercises]);

  if (detailExercise) {
    return (
      <div className="fixed inset-0 z-[75] bg-[#F8FAFC] dark:bg-[#05070B] overflow-y-auto">
        <ExerciseDetailView
          exercise={detailExercise}
          onBack={() => setDetailExercise(null)}
          isModal={false}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom))] select-none">
      {/* 1. Barra Superior de Control de Sesión */}
      <header className="sticky top-0 z-30 flex items-center justify-between py-3 mb-4 bg-[#F9FAFB]/95 dark:bg-[#05070B]/95 backdrop-blur-md border-b border-slate-100 dark:border-white/[0.07]">
        {/* Izquierda: Botón regresar < y Botón eliminar/descartar (tacho de basura rojo suave) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#161B26] transition active:scale-95 cursor-pointer"
            title="Regresar"
            aria-label="Regresar"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={onDiscard}
            className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Descartar entrenamiento"
            aria-label="Descartar entrenamiento"
          >
            <Trash2 size={17} strokeWidth={2.25} />
          </button>
        </div>

        {/* Píldora Central de Tiempo Activo */}
        <div className="rounded-full px-4 py-1.5 bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/[0.07] font-bold text-red-600 text-sm flex items-center gap-1.5 shadow-xs">
          <Clock size={14} strokeWidth={2.5} className="text-red-600" />
          <span className="font-mono tracking-tight">
            {formatTimerClock(elapsedSeconds)}
          </span>
        </div>

        {/* Derecha: Botón de finalización "Listo" */}
        <button
          type="button"
          disabled={isSaving}
          onClick={onFinish}
          className="font-bold text-red-600 hover:text-red-700 text-sm sm:text-base px-2 py-1 transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? "..." : "Listo"}
        </button>
      </header>

      {/* 2. Lista de Ejercicios en Sesión (Tarjetas Bento Independientes) */}
      <div>
        {activeExercises.length > 0 ? (
          activeExercises.map((item, idx) => (
            <ActiveExerciseBentoCard
              key={item.exerciseId || idx}
              exerciseItem={item}
              catalogExercise={exercisesMap[item.exerciseId]}
              onAddSet={onAddSet}
              onUpdateSet={onUpdateSet}
              onRemoveSet={onRemoveSet}
              onRemoveExercise={onRemoveExercise}
              onOpenDetail={(exObj) => setDetailExercise(exObj)}
            />
          ))
        ) : (
          <div className="rounded-3xl p-8 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm text-center space-y-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Dumbbell size={26} />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Sesión de entrenamiento en vivo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Pulsá el botón <strong>+ Agregar</strong> debajo para elegir tus
              ejercicios del catálogo y registrar tus series.
            </p>
            <button
              type="button"
              onClick={onOpenAddExercise}
              className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-3 rounded-full shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>+ Agregar ejercicios</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Barra Inferior Fija de Control */}
      <div className="fixed bottom-0 inset-x-0 z-[55] bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent dark:from-[#05070B] dark:via-[#05070B]/95 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] px-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {/* Botón Izquierdo: + Agregar ejercicio */}
          <button
            type="button"
            onClick={onOpenAddExercise}
            className="border-2 border-red-600 text-red-600 bg-white dark:bg-[#0E131F] font-bold rounded-full py-4 flex-1 text-center text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-sm"
          >
            + Agregar
          </button>

          {/* Botón Derecho: ⏸ Pausar temporizador / ▶ Reanudar */}
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full py-4 flex-1 shadow-md text-center text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            {isPaused ? (
              <>
                <Play size={15} fill="currentColor" />
                <span>▶ Reanudar</span>
              </>
            ) : (
              <>
                <Pause size={15} fill="currentColor" />
                <span>⏸ Pausar temporizador</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
