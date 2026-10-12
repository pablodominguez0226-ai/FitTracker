/**
 * Offline Sync Queue for FitTracker Iron
 * Persiste operaciones pendientes en localStorage bajo la clave 'fittracker_pending_sync'
 * y sincroniza automáticamente en segundo plano cuando se restablece la conexión.
 */

import { api } from "../api/client";
import { showToast } from "../components/Toast";
import { replaceTempExerciseInCache } from "../services/exerciseCache";

export const SYNC_QUEUE_KEY = "fittracker_pending_sync";
const ACTIVE_SESSION_KEY = "fittracker_active_session";

export function getActiveSessionKey() {
  try {
    const raw = localStorage.getItem("fittracker_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        return `fittracker_active_session_${parsed.id}`;
      }
    }
  } catch {}
  return ACTIVE_SESSION_KEY;
}

let isProcessing = false;

/**
 * Verifica si el navegador cuenta con conexión a internet actualmente.
 */
export function isOnline() {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

/**
 * Obtiene la cola de sincronización desde localStorage bajo fittracker_pending_sync.
 */
export function getPendingQueue() {
  try {
    const raw =
      localStorage.getItem(SYNC_QUEUE_KEY) ||
      localStorage.getItem("fittracker_pending_sync_queue");
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Error leyendo fittracker_pending_sync:", err);
    return [];
  }
}

/**
 * Guarda las operaciones pendientes en localStorage bajo fittracker_pending_sync
 * y emite el evento global para actualizar la interfaz.
 */
export function savePendingQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    // Limpieza de clave anterior si existiera
    localStorage.removeItem("fittracker_pending_sync_queue");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fittracker:syncQueueChanged", {
          detail: { count: queue.length },
        })
      );
    }
  } catch (err) {
    console.warn("Error guardando fittracker_pending_sync:", err);
  }
}

/**
 * Encola una acción de sincronización offline.
 * @param {Object} action - { type, payload, tempId }
 */
export function enqueueSyncAction(action) {
  const queue = getPendingQueue();
  const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item = {
    id,
    type: action.type,
    payload: action.payload,
    tempId: action.tempId || null,
    createdAt: Date.now(),
  };

  // Optimización: Si se borra una serie que fue añadida offline y aún no se envió
  if (action.type === "DELETE_SET" && action.tempId) {
    const addIdx = queue.findIndex(
      (q) => q.type === "ADD_SET" && q.tempId === action.tempId
    );
    if (addIdx !== -1) {
      queue.splice(addIdx, 1);
      savePendingQueue(queue);
      return;
    }
  }

  // Optimización: Si se actualiza una serie pendiente, mezclar payload
  if (action.type === "UPDATE_SET") {
    const targetSetId = action.payload?.setId || action.tempId;
    const existingIdx = queue.findIndex(
      (q) =>
        q.type === "UPDATE_SET" &&
        (q.payload?.setId === targetSetId || (action.tempId && q.tempId === action.tempId))
    );
    if (existingIdx !== -1) {
      queue[existingIdx].payload = {
        ...queue[existingIdx].payload,
        ...action.payload,
      };
      savePendingQueue(queue);
      return;
    }
  }

  queue.push(item);
  savePendingQueue(queue);
}

/**
 * Actualiza los IDs temporales en el borrador de sesión activa guardado en localStorage.
 */
function updateActiveSessionTempId(tempId, realId) {
  try {
    const activeKey = getActiveSessionKey();
    const raw = localStorage.getItem(activeKey) || localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (draft.activeExercises) {
      let changed = false;
      draft.activeExercises.forEach((ex) => {
        if (ex.sets) {
          ex.sets.forEach((s) => {
            if (s.id === tempId) {
              s.id = realId;
              s.is_offline = false;
              changed = true;
            }
          });
        }
      });
      if (changed) {
        localStorage.setItem(activeKey, JSON.stringify(draft));
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("fittracker:setIdSynced", {
              detail: { tempId, realId },
            })
          );
        }
      }
    }
  } catch (err) {
    console.warn("Error actualizando tempId en draft activo:", err);
  }
}

/**
 * Actualiza los IDs de ejercicios temporales (temp_exercise_...) en el borrador de sesión activa.
 */
function updateActiveSessionExerciseId(tempId, realId) {
  try {
    const activeKey = getActiveSessionKey();
    const raw = localStorage.getItem(activeKey) || localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (Array.isArray(draft.activeExercises)) {
      let changed = false;
      draft.activeExercises.forEach((ex) => {
        if (ex.exerciseId === tempId || ex.id === tempId) {
          ex.exerciseId = realId;
          if (ex.id) ex.id = realId;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(activeKey, JSON.stringify(draft));
      }
    }
  } catch (err) {
    console.warn("Error actualizando exerciseId en draft activo:", err);
  }
}

/**
 * Procesa secuencialmente las acciones pendientes en la cola fittracker_pending_sync.
 */
export async function processSyncQueue() {
  if (isProcessing) return;
  if (!isOnline()) return;

  const queue = getPendingQueue();
  if (queue.length === 0) return;

  isProcessing = true;
  const remaining = [...queue];
  let syncedItemsCount = 0;

  try {
    while (remaining.length > 0) {
      const current = remaining[0];
      let success = false;

      try {
        switch (current.type) {
          case "CREATE_EXERCISE": {
            const { tempId, name, muscle_group_id } = current.payload;
            let realExercise = null;

            // Validar por coincidencia exacta de nombre antes de insertarlo en el servidor para evitar crear doble registro
            try {
              const listRes = await api.get("/exercises");
              const serverList = Array.isArray(listRes.data) ? listRes.data : [];
              const clean = (name || "").trim().toLowerCase();
              realExercise = serverList.find(
                (e) => (e?.name || "").trim().toLowerCase() === clean
              );
            } catch (checkErr) {
              console.warn("No se pudo verificar lista existente en servidor:", checkErr);
            }

            if (!realExercise) {
              // No existe aún en el servidor: crearlo
              const createRes = await api.post("/exercises", {
                name: (name || "").trim(),
                muscle_group_id: Number(muscle_group_id),
              });
              realExercise = createRes.data;
            }

            const realId = realExercise?.id;
            if (tempId && realId) {
              // Reemplazar en la caché local
              replaceTempExerciseInCache(tempId, realExercise);

              // Reemplazar en el borrador de sesión activa en localStorage
              updateActiveSessionExerciseId(tempId, realId);

              // Reemplazar en las siguientes acciones pendientes de la cola
              remaining.forEach((act) => {
                if (act.type === "ADD_SET" && act.payload?.setData?.exercise_id === tempId) {
                  act.payload.setData.exercise_id = realId;
                }
                if (act.type === "SAVE_WORKOUT" && Array.isArray(act.payload?.exercises)) {
                  act.payload.exercises.forEach((ex) => {
                    if (ex.exercise_id === tempId) ex.exercise_id = realId;
                    if (ex.id === tempId) ex.id = realId;
                  });
                }
              });

              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("fittracker:exerciseSynced", {
                    detail: { tempId, realId, exercise: realExercise },
                  })
                );
              }
            }

            success = true;
            syncedItemsCount++;
            break;
          }

          case "SAVE_WORKOUT": {
            // Guardar entrenamiento completo en POST /api/workouts
            await api.post("/workouts", current.payload);
            success = true;
            syncedItemsCount++;
            break;
          }

          case "START_WORKOUT": {
            const res = await api.post("/workouts/start", current.payload);
            if (res?.data?.id) {
              const newSessionId = res.data.id;
              remaining.forEach((act) => {
                if (act.payload && (act.payload.workoutSessionId === "active" || !act.payload.workoutSessionId)) {
                  act.payload.workoutSessionId = newSessionId;
                }
              });
            }
            success = true;
            syncedItemsCount++;
            break;
          }

          case "ADD_SET": {
            const { workoutSessionId, setData, tempId } = current.payload;
            let res;
            if (
              workoutSessionId &&
              workoutSessionId !== "active" &&
              !String(workoutSessionId).startsWith("temp_") &&
              !String(workoutSessionId).startsWith("offline_")
            ) {
              res = await api.post(`/workouts/${workoutSessionId}/sets`, setData);
            } else {
              // POST /api/workouts/sets resuelve o crea la sesión activa automáticamente
              res = await api.post("/workouts/sets", setData);
            }

            const realId = res?.data?.id;
            if (realId && tempId) {
              updateActiveSessionTempId(tempId, realId);
              remaining.forEach((act) => {
                if (act.type === "UPDATE_SET" && act.tempId === tempId) {
                  act.payload.setId = realId;
                  act.tempId = null;
                }
                if (act.type === "DELETE_SET" && act.tempId === tempId) {
                  act.payload.setId = realId;
                  act.tempId = null;
                }
              });
            }
            success = true;
            syncedItemsCount++;
            break;
          }

          case "UPDATE_SET": {
            const { setId, updateData } = current.payload;
            if (setId && !String(setId).startsWith("temp_")) {
              await api.patch(`/workouts/sets/${setId}`, updateData);
            }
            success = true;
            syncedItemsCount++;
            break;
          }

          case "DELETE_SET": {
            const { setId } = current.payload;
            if (setId && !String(setId).startsWith("temp_")) {
              await api.delete(`/workouts/sets/${setId}`);
            }
            success = true;
            syncedItemsCount++;
            break;
          }

          case "UPDATE_READINESS": {
            const { workoutId, readinessData } = current.payload;
            if (workoutId) {
              await api.patch(`/workouts/${workoutId}/readiness`, readinessData);
            }
            success = true;
            syncedItemsCount++;
            break;
          }

          case "FINISH_WORKOUT": {
            const { workoutId, finishData } = current.payload;
            if (workoutId && !String(workoutId).startsWith("offline_")) {
              await api.post(`/workouts/${workoutId}/finish`, finishData);
            } else {
              // Si no había sesión creada en servidor, guardar como entrenamiento nuevo
              await api.post("/workouts", finishData);
            }
            success = true;
            syncedItemsCount++;
            break;
          }

          case "DELETE_WORKOUT": {
            const { workoutId } = current.payload;
            if (workoutId && !String(workoutId).startsWith("offline_")) {
              await api.delete(`/workouts/${workoutId}`);
            }
            success = true;
            syncedItemsCount++;
            break;
          }

          default:
            success = true;
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Si el recurso ya no existe, marcar como exitoso para desatascar la cola
          success = true;
        } else if (
          !err.response ||
          err.code === "ERR_NETWORK" ||
          err.message?.includes("Network") ||
          err.response?.status >= 500
        ) {
          // Problema de red o caída del servidor: pausar para reintento
          console.warn("Pausa de sincronización offline por red/servidor:", err.message);
          break;
        } else {
          // Error 400 u otro error de validación del cliente: descartar acción errónea
          console.error("Acción descartada por validación del servidor:", current, err);
          success = true;
        }
      }

      if (success) {
        remaining.shift();
        savePendingQueue(remaining);
      } else {
        break;
      }
    }
  } finally {
    isProcessing = false;

    if (syncedItemsCount > 0) {
      // Mostrar toast sutil requerido al completar la sincronización
      showToast("✅ Entrenamientos sincronizados con el servidor", { variant: "emerald" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("fittracker:recordUpdated"));
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fittracker:syncQueueCompleted", {
          detail: { remainingCount: remaining.length, syncedCount: syncedItemsCount },
        })
      );
    }
  }
}

// Escuchador de reconexión automático
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("Conexión a red reestablecida. Sincronizando cola offline...");
    processSyncQueue();
  });

  // Reintento periódico cada 20 segundos
  setInterval(() => {
    if (isOnline() && getPendingQueue().length > 0) {
      processSyncQueue();
    }
  }, 20000);
}
