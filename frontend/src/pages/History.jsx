import React, { useEffect, useState, useMemo } from "react";
import { Dumbbell, Loader2, Trash2, X } from "lucide-react";
import { deleteWorkout, getWorkouts } from "../api/client";
import Header from "../components/Header";
import { SessionHistoryRow } from "../components/HistoryModal";
import EditSessionModal from "../components/EditSessionModal";
import { showToast } from "../components/Toast";
import {
  getLocalDateString,
  formatSessionShortDayMonth,
} from "../utils/dateUtils";

/**
 * History.jsx / HistorialSesiones - Vista de Historial de Sesiones
 * - Clasificación automática binaria ("Tren Superior" / "Tren Inferior")
 * - Acciones de Editar (EditSessionModal) y Eliminar con confirmación
 */
export default function History() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingSession, setEditingSession] = useState(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getWorkouts();
      setWorkouts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando historial:", err);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    const handleRefresh = () => loadHistory();
    window.addEventListener("fittracker:workoutSaved", handleRefresh);
    window.addEventListener("fittracker:workoutFinished", handleRefresh);
    window.addEventListener("fittracker:workoutUpdated", handleRefresh);
    window.addEventListener("fittracker:workoutDeleted", handleRefresh);
    return () => {
      window.removeEventListener("fittracker:workoutSaved", handleRefresh);
      window.removeEventListener("fittracker:workoutFinished", handleRefresh);
      window.removeEventListener("fittracker:workoutUpdated", handleRefresh);
      window.removeEventListener("fittracker:workoutDeleted", handleRefresh);
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!sessionToDelete?.id || deletingId === sessionToDelete.id) return;
    const id = sessionToDelete.id;
    setDeletingId(id);
    setSessionToDelete(null);
    const backup = [...workouts];
    setWorkouts((prev) => (prev || []).filter((w) => w?.id !== id));

    try {
      await deleteWorkout(id);
      showToast("Entrenamiento eliminado correctamente", "info");
    } catch (err) {
      console.error("Error eliminando sesión de historial:", err);
      setWorkouts(backup);
      showToast("No se pudo eliminar el entrenamiento del servidor.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSessionUpdated = (updatedSession) => {
    if (!updatedSession?.id) {
      loadHistory();
      return;
    }
    setWorkouts((prev) => {
      const next = (prev || []).map((w) =>
        w.id === updatedSession.id ? updatedSession : w
      );
      return [...next].sort((a, b) => {
        const dA = String(a?.date || "");
        const dB = String(b?.date || "");
        if (dA !== dB) return dB.localeCompare(dA);
        return (b?.id || 0) - (a?.id || 0);
      });
    });
  };

  const filteredWorkouts = useMemo(() => {
    if (!selectedDate) return workouts;
    return (workouts || []).filter((w) => {
      if (!w?.date) return false;
      const dStr = String(w.date).split("T")[0];
      return dStr === selectedDate;
    });
  }, [workouts, selectedDate]);

  const handleSetToday = () => {
    setSelectedDate(getLocalDateString());
  };

  const handleClearDate = () => {
    setSelectedDate("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-red-500">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-xs font-semibold text-slate-400">
          Cargando historial...
        </p>
      </div>
    );
  }

  const deleteShortDate = sessionToDelete
    ? formatSessionShortDayMonth(sessionToDelete.date)
    : "";

  return (
    <div className="space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <Header
        title="Historial de Sesiones"
        subtitle="Listado cronológico de entrenamientos completados"
        rightElement={
          <div className="rounded-xl border border-white/10 bg-[#0E131F] px-3 py-1.5 text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Sesiones
            </span>
            <span className="text-base font-bold text-white">
              {(filteredWorkouts || []).length}
            </span>
          </div>
        }
      />

      {/* Selector Opcional de Días */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl border border-white/10 bg-[#0E131F]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleClearDate}
            className={`h-8 px-2.5 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer ${
              !selectedDate
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "border border-white/10 bg-white/5 text-slate-300 hover:text-white"
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={handleSetToday}
            className={`h-8 px-2.5 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer ${
              selectedDate === getLocalDateString()
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "border border-white/10 bg-white/5 text-slate-300 hover:text-white"
            }`}
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 px-2 rounded-lg border border-white/10 bg-[#161B26] text-xs font-medium text-white outline-none focus:border-red-500"
            title="Filtrar por fecha local"
          />
          {selectedDate && (
            <button
              type="button"
              onClick={handleClearDate}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white transition"
              title="Quitar filtro"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Lista de Sesiones */}
      {(filteredWorkouts || []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0E131F] p-8 text-center">
          <Dumbbell size={28} className="mx-auto text-slate-500" />
          <h3 className="mt-2 text-sm font-semibold text-white">
            No hay sesiones registradas
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {selectedDate
              ? "No se registraron entrenamientos en este día."
              : "Iniciá tu primer entrenamiento desde Entrenar."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredWorkouts.map((w) => (
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

      {/* Modal Breve de Confirmación de Eliminación */}
      {sessionToDelete && (
        <div
          className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setSessionToDelete(null)}
        >
          <div
            className="w-full max-w-xs md:max-w-sm rounded-2xl bg-[#0E131F] border border-white/10 p-5 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 md:my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-10 h-10 rounded-xl bg-red-950/40 border border-red-900/30 text-red-400 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {deleteShortDate
                  ? `¿Eliminar entrenamiento del ${deleteShortDate}?`
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
    </div>
  );
}

export { History as HistorialSesiones };
