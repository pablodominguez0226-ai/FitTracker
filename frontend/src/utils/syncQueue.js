/**
 * Offline Sync Queue for FitTracker
 * Persists pending API operations to localStorage and syncs automatically
 * when internet connection is restored (or on reconnection/online event).
 */

import {
  startWorkout,
  addWorkoutSet,
  updateWorkoutSet,
  deleteWorkoutSet,
  updateWorkoutReadiness,
  finishWorkout,
  deleteWorkout,
} from "../api/client";

const SYNC_QUEUE_KEY = "fittracker_pending_sync_queue";
const ACTIVE_SESSION_KEY = "fittracker_active_session";

let isProcessing = false;

/**
 * Check if the browser is currently online
 */
export function isOnline() {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

/**
 * Retrieve pending actions from localStorage
 */
export function getPendingQueue() {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Error leyendo pendingSyncQueue:", err);
    return [];
  }
}

/**
 * Save pending actions to localStorage and notify UI
 */
export function savePendingQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fittracker:syncQueueChanged", {
          detail: { count: queue.length },
        })
      );
    }
  } catch (err) {
    console.warn("Error guardando pendingSyncQueue:", err);
  }
}

/**
 * Enqueue a sync action to be processed
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

  // Optimization: If deleting a set that was added in this offline session and not yet pushed to server
  if (action.type === "DELETE_SET" && action.tempId) {
    const addIdx = queue.findIndex(
      (q) => q.type === "ADD_SET" && q.tempId === action.tempId
    );
    if (addIdx !== -1) {
      // Remove both the ADD and don't enqueue DELETE
      queue.splice(addIdx, 1);
      savePendingQueue(queue);
      return;
    }
  }

  // Optimization: If updating a set that already has a pending update, merge payload
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
 * Helper to update set IDs in localStorage active session when temporary set gets real ID
 */
function updateActiveSessionTempId(tempId, realId) {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (draft.activeExercises) {
      let changed = false;
      draft.activeExercises.forEach((ex) => {
        if (ex.sets) {
          ex.sets.forEach((s) => {
            if (s.id === tempId) {
              s.id = realId;
              changed = true;
            }
          });
        }
      });
      if (changed) {
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(draft));
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
 * Process all pending actions in the queue sequentially
 */
export async function processSyncQueue() {
  if (isProcessing) return;
  if (!isOnline()) return;

  const queue = getPendingQueue();
  if (queue.length === 0) return;

  isProcessing = true;
  const remaining = [...queue];

  try {
    while (remaining.length > 0) {
      const current = remaining[0];
      let success = false;

      try {
        switch (current.type) {
          case "START_WORKOUT": {
            const res = await startWorkout(current.payload);
            if (res && res.id) {
              // Update subsequent actions workoutSessionId if needed
              remaining.forEach((act) => {
                if (act.payload && act.payload.workoutSessionId === "active") {
                  act.payload.workoutSessionId = res.id;
                }
              });
            }
            success = true;
            break;
          }

          case "ADD_SET": {
            const { workoutSessionId, setData, tempId } = current.payload;
            const res = await addWorkoutSet(workoutSessionId, setData);
            if (res && res.id && tempId) {
              updateActiveSessionTempId(tempId, res.id);
              // Update any subsequent queued actions for this set
              remaining.forEach((act) => {
                if (act.type === "UPDATE_SET" && act.tempId === tempId) {
                  act.payload.setId = res.id;
                  act.tempId = null;
                }
                if (act.type === "DELETE_SET" && act.tempId === tempId) {
                  act.payload.setId = res.id;
                  act.tempId = null;
                }
              });
            }
            success = true;
            break;
          }

          case "UPDATE_SET": {
            const { setId, updateData } = current.payload;
            if (setId && !String(setId).startsWith("temp_")) {
              await updateWorkoutSet(setId, updateData);
            }
            success = true;
            break;
          }

          case "DELETE_SET": {
            const { setId } = current.payload;
            if (setId && !String(setId).startsWith("temp_")) {
              await deleteWorkoutSet(setId);
            }
            success = true;
            break;
          }

          case "UPDATE_READINESS": {
            const { workoutId, readinessData } = current.payload;
            if (workoutId) {
              await updateWorkoutReadiness(workoutId, readinessData);
            }
            success = true;
            break;
          }

          case "FINISH_WORKOUT": {
            const { workoutId, finishData } = current.payload;
            if (workoutId) {
              await finishWorkout(workoutId, finishData);
            }
            success = true;
            break;
          }

          case "DELETE_WORKOUT": {
            const { workoutId } = current.payload;
            if (workoutId) {
              await deleteWorkout(workoutId);
            }
            success = true;
            break;
          }

          default:
            success = true;
        }
      } catch (err) {
        // If error is 404 on delete/update, consider it already gone
        if (err.response && err.response.status === 404) {
          success = true;
        } else if (
          !err.response ||
          err.code === "ERR_NETWORK" ||
          err.message?.includes("Network") ||
          err.response?.status >= 500
        ) {
          // Network issue or temporary server failure: pause queue processing
          console.warn("Pausa de sincronización por error de red o servidor:", err.message);
          break;
        } else {
          // Client error (e.g. 400 validation): discard faulty action so queue doesn't lock up forever
          console.error("Acción rechazada por el servidor, descartando de cola:", current, err);
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fittracker:syncQueueCompleted", {
          detail: { remainingCount: remaining.length },
        })
      );
    }
  }
}

// Auto-listen to window online event
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("Conexión a internet reestablecida. Sincronizando datos pendientes...");
    processSyncQueue();
  });

  // Periodic retry check every 25s
  setInterval(() => {
    if (isOnline() && getPendingQueue().length > 0) {
      processSyncQueue();
    }
  }, 25000);
}
