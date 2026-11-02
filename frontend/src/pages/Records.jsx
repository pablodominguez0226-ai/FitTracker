import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Hourglass,
  Layers,
  Loader2,
  Scale,
  Share2,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { deleteWorkout, getRecords, getWorkouts } from "../api/client";
import EditSessionModal from "../components/EditSessionModal";
import HistoryModal, { SessionHistoryRow } from "../components/HistoryModal";
import { showToast } from "../components/Toast";
import {
  getLocalDateString,
  formatSessionShortDayMonth,
} from "../utils/dateUtils";

const SPANISH_MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAYS_HEADER = ["L", "M", "X", "J", "V", "S", "D"];

function toDateKey(year, monthZeroIndexed, day) {
  const m = String(monthZeroIndexed + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function getWorkoutVolumeKg(workout) {
  if (workout?.total_volume && Number(workout.total_volume) > 0) {
    return Number(workout.total_volume);
  }
  const sets = Array.isArray(workout?.sets) ? workout.sets : [];
  return sets.reduce(
    (acc, s) =>
      acc + (parseFloat(s?.weight) || 0) * (parseInt(s?.reps, 10) || 0),
    0
  );
}

function getWorkoutDurationHours(workout) {
  const sec = Number(workout?.duration_seconds || workout?.durationSeconds || 0);
  if (sec > 0) {
    return sec / 3600;
  }
  const setsCount = Array.isArray(workout?.sets) ? workout.sets.length : 0;
  if (setsCount > 0) {
    // Estimación estándar de 3 min por serie cuando no se grabó cronómetro
    return (setsCount * 3) / 60;
  }
  return 0.5;
}

export function TrainingRecordsScreen({ defaultTab = null }) {
  const todayStr = useMemo(() => getLocalDateString(), []);
  const initialDateParts = useMemo(() => {
    const parts = todayStr.split("-").map((n) => parseInt(n, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { year: parts[0], month: parts[1] - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [todayStr]);

  const [viewYear, setViewYear] = useState(initialDateParts.year);
  const [viewMonth, setViewMonth] = useState(initialDateParts.month);
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  const [records, setRecords] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPrModal, setShowPrModal] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(defaultTab === "history");
  const [deletingId, setDeletingId] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [editingSession, setEditingSession] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recs, wList] = await Promise.all([
        getRecords().catch(() => []),
        getWorkouts().catch(() => []),
      ]);
      setRecords(
        Array.isArray(recs)
          ? recs
          : recs && typeof recs === "object"
          ? Object.values(recs)
          : []
      );
      setWorkouts(
        Array.isArray(wList)
          ? wList
          : wList && typeof wList === "object"
          ? Object.values(wList)
          : []
      );
    } catch (err) {
      console.error("Error cargando registros de entrenamiento:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener("fittracker:recordUpdated", handleRefresh);
    window.addEventListener("fittracker:workoutSaved", handleRefresh);
    window.addEventListener("fittracker:workoutFinished", handleRefresh);
    window.addEventListener("fittracker:workoutUpdated", handleRefresh);
    window.addEventListener("fittracker:workoutDeleted", handleRefresh);
    return () => {
      window.removeEventListener("fittracker:recordUpdated", handleRefresh);
      window.removeEventListener("fittracker:workoutSaved", handleRefresh);
      window.removeEventListener("fittracker:workoutFinished", handleRefresh);
      window.removeEventListener("fittracker:workoutUpdated", handleRefresh);
      window.removeEventListener("fittracker:workoutDeleted", handleRefresh);
    };
  }, [loadData]);

  // Mapa de entrenamientos por fecha YYYY-MM-DD
  const workoutsByDate = useMemo(() => {
    const map = {};
    (workouts || []).forEach((w) => {
      if (!w?.date) return;
      const dStr = String(w.date).split("T")[0];
      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(w);
    });
    return map;
  }, [workouts]);

  // Construcción de la grilla mensual (Lunes = 0 ... Domingo = 6)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toDateKey(viewYear, viewMonth, day);
      const dayWorkouts = workoutsByDate[dateStr] || [];
      const hasWorkout = dayWorkouts.length > 0;
      const weekdayIdx = (startOffset + day - 1) % 7; // 0=L, 1=M, 2=X, 3=J, 4=V, 5=S, 6=D

      // Entrenamiento perdido: días pasados en días clave (L, X, V) del mes actual sin sesión
      const isPastDay = dateStr < todayStr;
      const isScheduledDay = weekdayIdx === 0 || weekdayIdx === 2 || weekdayIdx === 4;
      const isMissed =
        isPastDay &&
        !hasWorkout &&
        isScheduledDay &&
        Object.keys(workoutsByDate).length > 0;

      cells.push({
        day,
        dateStr,
        hasWorkout,
        isMissed,
        workoutsCount: dayWorkouts.length,
      });
    }

    return cells;
  }, [viewYear, viewMonth, workoutsByDate, todayStr]);

  // Navegación de meses
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setViewYear(initialDateParts.year);
    setViewMonth(initialDateParts.month);
    setSelectedDateStr(todayStr);
  };

  // Métricas del Resumen Mensual (mes visualizado)
  const monthlyMetrics = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    const monthWorkouts = (workouts || []).filter((w) =>
      String(w?.date || "").startsWith(prefix)
    );

    const count = monthWorkouts.length;
    const totalVol = monthWorkouts.reduce(
      (acc, w) => acc + getWorkoutVolumeKg(w),
      0
    );
    const totalHours = monthWorkouts.reduce(
      (acc, w) => acc + getWorkoutDurationHours(w),
      0
    );

    return {
      count,
      volumeKg: Math.round(totalVol),
      durationHours: count > 0 ? totalHours.toFixed(1) : "0.0",
      averagePct: "100%",
    };
  }, [workouts, viewYear, viewMonth]);

  // Métricas del Resumen Semanal (semana de la fecha seleccionada: Lunes a Domingo)
  const weeklyMetrics = useMemo(() => {
    const parts = (selectedDateStr || todayStr)
      .split("-")
      .map((n) => parseInt(n, 10));
    const refDate =
      parts.length === 3 && !isNaN(parts[0])
        ? new Date(parts[0], parts[1] - 1, parts[2])
        : new Date();

    const dayOfWeek = (refDate.getDay() + 6) % 7; // Lunes = 0
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() - dayOfWeek);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startKey = toDateKey(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate()
    );
    const endKey = toDateKey(
      sunday.getFullYear(),
      sunday.getMonth(),
      sunday.getDate()
    );

    const weekWorkouts = (workouts || []).filter((w) => {
      const dStr = String(w?.date || "").split("T")[0];
      return dStr >= startKey && dStr <= endKey;
    });

    const count = weekWorkouts.length;
    const totalVol = weekWorkouts.reduce(
      (acc, w) => acc + getWorkoutVolumeKg(w),
      0
    );
    const totalHours = weekWorkouts.reduce(
      (acc, w) => acc + getWorkoutDurationHours(w),
      0
    );

    return {
      count,
      volumeKg: Math.round(totalVol),
      durationHours: count > 0 ? totalHours.toFixed(1) : "0.0",
      averagePct: "100%",
    };
  }, [workouts, selectedDateStr, todayStr]);

  const selectedDayWorkouts = useMemo(
    () => workoutsByDate[selectedDateStr] || [],
    [workoutsByDate, selectedDateStr]
  );

  const handleShareRecords = async () => {
    const text = `📊 FiTracker - Registros de ${SPANISH_MONTHS[viewMonth]} ${viewYear}: ${monthlyMetrics.count} entrenamientos • ${monthlyMetrics.volumeKg} kg de volumen • ${monthlyMetrics.durationHours} h`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Registros de entrenamiento - FiTracker",
          text,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast("Resumen de entrenamiento copiado al portapapeles", "success");
      }
    } catch {}
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete?.id || deletingId === sessionToDelete.id) return;
    const workoutId = sessionToDelete.id;
    setDeletingId(workoutId);
    setSessionToDelete(null);
    const backup = [...workouts];
    setWorkouts((prev) => (prev || []).filter((w) => w?.id !== workoutId));
    try {
      await deleteWorkout(workoutId);
      showToast("Sesión eliminada de los registros", "info");
    } catch (err) {
      console.error("Error eliminando entrenamiento:", err);
      setWorkouts(backup);
      showToast("No se pudo eliminar la sesión", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSessionUpdated = (updatedSession) => {
    if (!updatedSession?.id) {
      loadData();
      return;
    }
    setWorkouts((prev) =>
      (prev || []).map((w) => (w.id === updatedSession.id ? updatedSession : w))
    );
    loadData();
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-red-600 dark:text-red-400">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Cargando registros de entrenamiento...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full pb-[calc(6rem+env(safe-area-inset-bottom))] select-none">
      {/* 1. Encabezado */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">
          Registros de entrenamiento
        </h1>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Botón de Historial de Sesiones */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#0E131F] border border-slate-200/70 dark:border-white/[0.07] text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Historial de Sesiones"
            aria-label="Historial de Sesiones"
          >
            <Layers size={18} strokeWidth={2.25} />
          </button>

          {/* Botón de compartir (flecha) */}
          <button
            type="button"
            onClick={handleShareRecords}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#0E131F] border border-slate-200/70 dark:border-white/[0.07] text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Compartir registros"
            aria-label="Compartir registros"
          >
            <Share2 size={18} strokeWidth={2.25} />
          </button>

          {/* Botón de estadísticas (icono de línea de tendencia) en gris pizarra/rojo suave */}
          <button
            type="button"
            onClick={() => setShowPrModal(true)}
            className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Ver récords y estadísticas"
            aria-label="Ver estadísticas"
          >
            <TrendingUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* 2. Calendario Mensual Interactivo */}
      <div className="rounded-3xl p-5 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm mb-6">
        {/* Navegación de mes: Selector superior "Mes Año >" a la izquierda con flechas "<" y ">" a la derecha */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handleResetToCurrentMonth}
            className="flex items-center gap-1 font-extrabold text-base text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
            title="Volver al mes actual"
          >
            <span>
              {SPANISH_MONTHS[viewMonth]} {viewYear}
            </span>
            <ChevronRight size={16} strokeWidth={2.5} className="text-slate-400" />
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-full bg-slate-50 dark:bg-[#161B26] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Mes anterior"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-full bg-slate-50 dark:bg-[#161B26] border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Mes siguiente"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Cabecera con días de la semana (L, M, X, J, V, S, D) */}
        <div className="grid grid-cols-7 text-center mb-2">
          {WEEKDAYS_HEADER.map((wd) => (
            <span
              key={wd}
              className="text-xs font-bold text-slate-400 dark:text-slate-500 py-1"
            >
              {wd}
            </span>
          ))}
        </div>

        {/* Grilla de números 7x5/6 */}
        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {calendarDays.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-10" />;
            }

            const isSelected = cell.dateStr === selectedDateStr;
            const isToday = cell.dateStr === todayStr;

            return (
              <div
                key={cell.dateStr}
                className="flex items-center justify-center"
              >
                <button
                  type="button"
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? "border-2 border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-extrabold"
                      : isToday
                      ? "border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-bold"
                      : "text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-[#161B26]"
                  }`}
                >
                  <span className="text-xs sm:text-sm leading-none">
                    {cell.day}
                  </span>

                  {/* Punto inferior indicador */}
                  {cell.hasWorkout ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1" />
                  ) : cell.isMissed ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1" />
                  ) : isSelected ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent mt-1" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Leyenda inferior */}
        <div className="flex items-center justify-start gap-6 pt-4 mt-3 border-t border-slate-100 dark:border-white/[0.07] text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>Entrenamiento</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            <span>Entrenamiento perdido</span>
          </div>
        </div>
      </div>

      {/* Sesiones registradas en el día seleccionado (si existen) */}
      {selectedDayWorkouts.length > 0 && (
        <div className="mb-6 space-y-2.5 animate-in fade-in duration-150">
          {selectedDayWorkouts.map((w) => (
            <SessionHistoryRow
              key={w.id}
              session={w}
              isDeleting={deletingId === w.id}
              onEdit={(sess) => setEditingSession(sess)}
              onRequestDelete={(sess) => setSessionToDelete(sess)}
            />
          ))}
        </div>
      )}

      {/* 3. Sección "Resumen mensual" */}
      <section className="mb-6">
        <div className="flex items-center mb-3">
          <span className="w-1 h-4 bg-red-600 rounded-full inline-block mr-2" />
          <h2 className="font-bold text-slate-900 dark:text-white text-base">
            Resumen mensual
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Entrenamiento */}
          <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Dumbbell size={19} strokeWidth={2.25} />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Entrenamiento
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {monthlyMetrics.count}{" "}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Veces
              </span>
            </p>
          </div>

          {/* Card 2: Volumen */}
          <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Scale size={19} strokeWidth={2.25} />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Volumen
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {monthlyMetrics.volumeKg}{" "}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                kg
              </span>
            </p>
          </div>

          {/* Card 3: Duración */}
          <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Hourglass size={19} strokeWidth={2.25} />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Duración
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {monthlyMetrics.durationHours}{" "}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                h
              </span>
            </p>
          </div>

          {/* Card 4: Promedio */}
          <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Activity size={19} strokeWidth={2.25} />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Promedio
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {monthlyMetrics.averagePct}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Sección "Resumen semanal" */}
      <section className="mb-4">
        <div className="flex items-center mb-3">
          <span className="w-1 h-4 bg-red-600 rounded-full inline-block mr-2" />
          <h2 className="font-bold text-slate-900 dark:text-white text-base">
            Resumen semanal
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Entrenamiento */}
          <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Dumbbell size={19} strokeWidth={2.25} />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Entrenamiento
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {weeklyMetrics.count}{" "}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Veces
              </span>
            </p>
          </div>

          {/* Card 2: Volumen */}
          <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Scale size={19} strokeWidth={2.25} />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Volumen
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {weeklyMetrics.volumeKg}{" "}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                kg
              </span>
            </p>
          </div>

          {/* Card 3: Duración */}
          <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Hourglass size={19} strokeWidth={2.25} />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Duración
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {weeklyMetrics.durationHours}{" "}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                h
              </span>
            </p>
          </div>

          {/* Card 4: Promedio */}
          <div className="rounded-3xl p-4 bg-white dark:bg-[#0E131F] border border-slate-100 dark:border-white/[0.07] shadow-sm flex flex-col justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Activity size={19} strokeWidth={2.25} />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Promedio
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {weeklyMetrics.averagePct}
            </p>
          </div>
        </div>
      </section>

      {/* Modal de Récords Personales (PRs) al pulsar el botón de línea de tendencia */}
      {showPrModal && (
        <div
          className="fixed inset-0 z-[75] flex items-end justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowPrModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white dark:bg-[#0E131F] border-t border-slate-100 dark:border-white/[0.07] p-5 max-h-[82dvh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.07]">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Récords Personales ({records.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#161B26] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 custom-scrollbar">
              {records.filter((r) => r?.pr_weight > 0).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                  <Trophy size={28} className="mx-auto mb-2 text-red-500" />
                  Aún no hay marcas máximas registradas.
                </div>
              ) : (
                records
                  .filter((r) => r?.pr_weight > 0)
                  .map((r) => (
                    <div
                      key={r.exercise_id || r.exercise_name}
                      className="rounded-2xl p-3.5 bg-slate-50 dark:bg-[#080A0F] border border-slate-100 dark:border-white/[0.07] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {r.exercise_name}
                        </p>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {r.muscle_group || "Fuerza"}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {r.pr_weight} kg × {r.pr_reps || 1}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Breve de Confirmación de Eliminación */}
      {sessionToDelete && (
        <div
          className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setSessionToDelete(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-[#0E131F] border border-white/10 p-5 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-10 h-10 rounded-xl bg-red-950/40 border border-red-900/30 text-red-400 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {sessionToDelete?.date
                  ? `¿Eliminar entrenamiento del ${formatSessionShortDayMonth(
                      sessionToDelete.date
                    )}?`
                  : "¿Eliminar este entrenamiento?"}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Se borrarán sus series registradas y se recalcularán tus
                métricas globales.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="flex-1 py-2 px-3 rounded-full text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 px-3 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition active:scale-95 cursor-pointer shadow-md shadow-red-600/25"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Sesión */}
      <EditSessionModal
        isOpen={Boolean(editingSession)}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onSessionUpdated={handleSessionUpdated}
      />

      {/* Modal de Historial de Sesiones */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        initialSessions={workouts}
        onSessionDeleted={() => loadData()}
        onSessionUpdated={() => loadData()}
      />
    </div>
  );
}

export default TrainingRecordsScreen;
