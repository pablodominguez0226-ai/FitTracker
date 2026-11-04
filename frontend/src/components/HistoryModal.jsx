import React, { useEffect, useState, useCallback } from "react";
import { Dumbbell, Loader2, Pencil, Trash2, X, Layers } from "lucide-react";
import { deleteWorkout, getWorkoutHistory } from "../api/client";
import {
  formatSessionHistoryDate,
  formatSessionShortDayMonth,
} from "../utils/dateUtils";
import {
  classifySessionSplit,
  getSessionSplitBadgeClasses,
} from "../utils/fitnessUtils";
import EditSessionModal from "./EditSessionModal";
import { showToast } from "./Toast";

/**
 * SessionHistoryRow - Tarjeta compacta de fila en el Historial de Sesiones.
 * - Fecha a la izquierda: 📅 Vie, 30 Oct 2026 (text-xs font-semibold text-slate-300)
 * - Badge central: Tren Superior o Tren Inferior
 * - Métricas: Tonelaje total (8.035 kg) y series (14 series)
 * - Botones de acción a la derecha: Editar (Pencil) y Eliminar (Trash2)
 */
export function SessionHistoryRow({
  session,
  onEdit,
  onRequestDelete,
  isDeleting = false,
}) {
  if (!session) return null;

  const setsCount = Array.isArray(session.sets) ? session.sets.length : 0;
  const calculatedVol = (session.sets || []).reduce((acc, cur) => {
    if (cur?.completed === false) return acc;
    if (["warmup", "w"].includes(String(cur?.set_type || "").toLowerCase())) {
      return acc;
    }
    return (
      acc + (parseFloat(cur?.weight) || 0) * (parseInt(cur?.reps, 10) || 0)
    );
  }, 0);

  const totalVol =
    calculatedVol > 0
      ? calculatedVol
      : session.total_volume != null && Number(session.total_volume) > 0
      ? Number(session.total_volume)
      : 0;

  const splitLabel = classifySessionSplit(session);
  const badgeClasses = getSessionSplitBadgeClasses(splitLabel);
  const formattedDate = formatSessionHistoryDate(
    session.date,
    session.date_formatted
  );

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0E131F] hover:border-white/15 transition px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-xs overflow-x-auto no-scrollbar">
        {/* Fecha a la izquierda */}
        <div className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
          <span aria-hidden="true" className="text-xs leading-none">
            📅
          </span>
          <span className="text-xs font-semibold text-slate-300 capitalize">
            {formattedDate}
          </span>
        </div>

        {/* Badge central: Tren Superior / Tren Inferior */}
        <div className="flex-shrink-0">
          <span className={badgeClasses}>{splitLabel}</span>
        </div>

        {/* Métricas: Tonelaje total y series */}
        <div className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 text-xs">
          <span className="font-bold text-white">
            {Math.round(totalVol).toLocaleString("es-ES")} kg
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 font-medium">
            {setsCount} {setsCount === 1 ? "serie" : "series"}
          </span>
        </div>

        {/* Botones de Acción a la derecha (compactos) */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => onEdit && onEdit(session)}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-90 cursor-pointer"
            title="Editar entrenamiento"
            aria-label="Editar entrenamiento"
          >
            <Pencil size={13} />
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onRequestDelete && onRequestDelete(session)}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-950/30 border border-red-900/30 text-red-400 hover:text-red-300 hover:bg-red-950/60 transition active:scale-90 cursor-pointer disabled:opacity-50"
            title="Eliminar entrenamiento"
            aria-label="Eliminar entrenamiento"
          >
            {isDeleting ? (
              <Loader2 size={13} className="animate-spin text-red-400" />
            ) : (
              <Trash2 size={13} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * HistoryModal / SessionHistoryModal / HistorialSesiones
 * Ventana Modal de Historial de Sesiones con soporte de edición (PATCH) y eliminación (DELETE)
 * y clasificación automática binaria ("Tren Superior" / "Tren Inferior").
 */
export default function HistoryModal({
  isOpen,
  onClose,
  initialSessions = null,
  onSessionDeleted = null,
  onWorkoutDeleted = null,
  onSessionUpdated = null,
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [editingSession, setEditingSession] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWorkoutHistory();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar historial de sesiones:", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (Array.isArray(initialSessions) && initialSessions.length > 0) {
        setSessions(initialSessions);
      }
      fetchHistory();
    } else {
      setDeletingId(null);
      setSessionToDelete(null);
      setEditingSession(null);
    }
  }, [isOpen, fetchHistory]);

  // Listener para eventos de teclado (Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        if (editingSession) {
          setEditingSession(null);
        } else if (sessionToDelete) {
          setSessionToDelete(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, editingSession, sessionToDelete]);

  const handleConfirmDelete = async () => {
    if (!sessionToDelete?.id || deletingId === sessionToDelete.id) return;
    const sessionId = sessionToDelete.id;
    setDeletingId(sessionId);
    setSessionToDelete(null);
    const backupSessions = [...sessions];

    // Remover la fila del estado local de React inmediatamente
    setSessions((prev) => (prev || []).filter((s) => s.id !== sessionId));

    try {
      await deleteWorkout(sessionId);
      showToast("Entrenamiento eliminado correctamente", "info");
      if (onSessionDeleted) {
        onSessionDeleted(sessionId);
      }
      if (onWorkoutDeleted) {
        onWorkoutDeleted(sessionId);
      }
    } catch (err) {
      console.error("Error eliminando sesión:", err);
      setSessions(backupSessions);
      showToast(
        "No se pudo eliminar el entrenamiento del servidor. Inténtalo de nuevo.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSessionUpdated = (updatedSession) => {
    if (!updatedSession?.id) {
      fetchHistory();
      return;
    }
    setSessions((prev) => {
      const next = (prev || []).map((s) =>
        s.id === updatedSession.id ? updatedSession : s
      );
      return [...next].sort((a, b) => {
        const dA = String(a?.date || "");
        const dB = String(b?.date || "");
        if (dA !== dB) return dB.localeCompare(dA);
        return (b?.id || 0) - (a?.id || 0);
      });
    });
    if (onSessionUpdated) {
      onSessionUpdated(updatedSession);
    }
  };

  if (!isOpen) return null;

  const deleteShortDate = sessionToDelete
    ? formatSessionShortDayMonth(sessionToDelete.date)
    : "";

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150 select-none"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-[#0B0F19] border border-white/10 rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[88dvh] md:max-h-[85vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-white md:my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera Fija */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0E131F] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-950/40 text-red-400 border border-red-900/30 font-bold">
                <Layers size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Historial de Sesiones
                  </h3>
                  <span className="rounded-full border border-red-900/30 bg-red-950/40 px-2 py-0.5 text-[11px] font-bold text-red-400">
                    {sessions.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Listado cronológico de entrenamientos completados
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition cursor-pointer"
              title="Cerrar modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* Cuerpo Scrolleable */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2.5 custom-scrollbar min-h-[220px]">
            {loading && sessions.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-red-400">
                <Loader2 size={26} className="animate-spin" />
                <p className="text-xs font-semibold text-slate-400">
                  Cargando sesiones...
                </p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0E131F]/60 p-8 text-center">
                <Dumbbell size={32} className="mx-auto text-slate-500" />
                <h4 className="mt-2.5 text-sm font-semibold text-white">
                  No hay sesiones registradas
                </h4>
                <p className="mt-1 text-xs text-slate-400 max-w-xs">
                  Tus entrenamientos completados aparecerán aquí con su volumen,
                  series y fecha.
                </p>
              </div>
            ) : (
              sessions.map((s) => (
                <SessionHistoryRow
                  key={s.id}
                  session={s}
                  isDeleting={deletingId === s.id}
                  onEdit={(sess) => setEditingSession(sess)}
                  onRequestDelete={(sess) => setSessionToDelete(sess)}
                />
              ))
            )}
          </div>

          {/* Footer del Historial con safe-area-inset-bottom */}
          <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-white/10 bg-[#0E131F] flex gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl w-full active:scale-[0.98] transition cursor-pointer text-sm shadow-md shadow-red-600/20"
            >
              Cerrar Historial
            </button>
          </div>
        </div>
      </div>

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
    </>
  );
}

export { HistoryModal as SessionHistoryModal, HistoryModal as HistorialSesiones };
