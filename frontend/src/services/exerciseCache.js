/**
 * Exercise & Muscle Groups Offline Cache Service for FitTracker
 * Políticas de caché local estricta para garantizar funcionamiento Offline-First
 * y prevenir duplicados al trabajar sin conexión.
 */

import { api } from "../api/client";
import fallbackCatalog from "./fallbackCatalog.json";

export const CACHE_KEYS = {
  MUSCLE_GROUPS: "fittracker_cached_muscle_groups",
  EXERCISES: "fittracker_cached_exercises",
  UPDATED_AT: "fittracker_cache_updated_at",
  IS_OFFLINE_MODE: "fittracker_is_using_offline_cache",
};

/**
 * Verifica si el dispositivo tiene conectividad a internet.
 */
export function isOnline() {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

/**
 * Obtiene los grupos musculares cacheados en localStorage.
 * Si no existen, devuelve el catálogo de respaldo embebido y lo almacena.
 */
export function getCachedMuscleGroups() {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.MUSCLE_GROUPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Error leyendo grupos musculares en caché:", err);
  }

  // Fallback con catálogo embebido oficial
  const fallback = fallbackCatalog.muscle_groups || [];
  setCachedMuscleGroups(fallback);
  return fallback;
}

/**
 * Guarda los grupos musculares en localStorage.
 */
export function setCachedMuscleGroups(groups) {
  try {
    if (Array.isArray(groups)) {
      localStorage.setItem(CACHE_KEYS.MUSCLE_GROUPS, JSON.stringify(groups));
    }
  } catch (err) {
    console.warn("Error guardando grupos musculares en caché:", err);
  }
}

/**
 * Obtiene los ejercicios cacheados en localStorage.
 * Si no existen, devuelve el catálogo de respaldo embebido y lo almacena.
 * @param {number|string|null} muscleGroupId - Filtro opcional por grupo muscular
 */
export function getCachedExercises(muscleGroupId = null) {
  let list = [];
  try {
    const raw = localStorage.getItem(CACHE_KEYS.EXERCISES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch (err) {
    console.warn("Error leyendo ejercicios en caché:", err);
  }

  if (list.length === 0) {
    list = fallbackCatalog.exercises || [];
    setCachedExercises(list);
  }

  if (muscleGroupId !== null && muscleGroupId !== undefined && muscleGroupId !== "") {
    const targetId = Number(muscleGroupId);
    return list.filter((e) => e && Number(e.muscle_group_id) === targetId);
  }

  return list;
}

/**
 * Guarda el catálogo completo de ejercicios en localStorage.
 */
export function setCachedExercises(exercises) {
  try {
    if (Array.isArray(exercises)) {
      localStorage.setItem(CACHE_KEYS.EXERCISES, JSON.stringify(exercises));
    }
  } catch (err) {
    console.warn("Error guardando ejercicios en caché:", err);
  }
}

/**
 * Registra o lee el timestamp de última actualización del catálogo.
 */
export function getCacheTimestamp() {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.UPDATED_AT);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export function setCacheTimestamp(ts = Date.now()) {
  try {
    localStorage.setItem(CACHE_KEYS.UPDATED_AT, String(ts));
  } catch {}
}

/**
 * Busca si un ejercicio ya existe en la caché por coincidencia exacta de nombre
 * (insensible a mayúsculas y espacios).
 */
export function findCachedExerciseByName(name) {
  if (!name || typeof name !== "string") return null;
  const clean = name.trim().toLowerCase();
  const all = getCachedExercises();
  return all.find((e) => (e?.name || "").trim().toLowerCase() === clean) || null;
}

/**
 * Agrega un ejercicio (real o temporal) a la caché local evitando duplicados.
 */
export function addCustomExerciseToCache(exercise) {
  if (!exercise || !exercise.name) return exercise;
  const all = getCachedExercises();
  const existingIdx = all.findIndex(
    (e) =>
      e.id === exercise.id ||
      (e?.name || "").trim().toLowerCase() === (exercise.name || "").trim().toLowerCase()
  );

  let updated;
  if (existingIdx !== -1) {
    // Actualizar existente
    all[existingIdx] = { ...all[existingIdx], ...exercise };
    updated = all;
  } else {
    // Añadir nuevo
    updated = [...all, exercise];
  }

  setCachedExercises(updated);
  return exercise;
}

/**
 * Reemplaza un ejercicio con ID temporal (temp_exercise_...) por el ejercicio final del servidor.
 */
export function replaceTempExerciseInCache(tempId, realExercise) {
  if (!tempId || !realExercise) return;
  const all = getCachedExercises();
  const updated = all.map((e) => {
    if (e.id === tempId) {
      return { ...e, ...realExercise, is_temp: false };
    }
    return e;
  });
  setCachedExercises(updated);
}

/**
 * Sincroniza el catálogo completo consumiendo GET /api/muscle-groups y GET /api/exercises.
 * Guarda en localStorage y registra el timestamp.
 * Si falla o !navigator.onLine, recupera de inmediato el catálogo local.
 *
 * @returns {Promise<{ muscleGroups: Array, exercises: Array, isFromCache: boolean }>}
 */
export async function syncCatalogCache() {
  if (!isOnline()) {
    return {
      muscleGroups: getCachedMuscleGroups(),
      exercises: getCachedExercises(),
      isFromCache: true,
    };
  }

  try {
    const [groupsRes, exercisesRes] = await Promise.all([
      api.get("/muscle-groups"),
      api.get("/exercises"),
    ]);

    const groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];
    const exercises = Array.isArray(exercisesRes.data) ? exercisesRes.data : [];

    if (groups.length > 0) {
      setCachedMuscleGroups(groups);
    }
    if (exercises.length > 0) {
      // Preservar ejercicios temporales que aún no se hayan sincronizado
      const cached = getCachedExercises();
      const pendingTemps = cached.filter((e) => String(e.id).startsWith("temp_exercise_"));
      const merged = [...exercises];
      pendingTemps.forEach((temp) => {
        const alreadyInServer = merged.some(
          (m) => (m.name || "").trim().toLowerCase() === (temp.name || "").trim().toLowerCase()
        );
        if (!alreadyInServer) {
          merged.push(temp);
        }
      });
      setCachedExercises(merged);
    }

    const now = Date.now();
    setCacheTimestamp(now);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fittracker:catalogCacheUpdated", {
          detail: { updatedAt: now, isFromCache: false },
        })
      );
    }

    return {
      muscleGroups: groups.length > 0 ? groups : getCachedMuscleGroups(),
      exercises: exercises.length > 0 ? exercises : getCachedExercises(),
      isFromCache: false,
    };
  } catch (err) {
    console.warn("Fallo sincronizando catálogo en red, usando fallback local inmediato:", err);
    return {
      muscleGroups: getCachedMuscleGroups(),
      exercises: getCachedExercises(),
      isFromCache: true,
    };
  }
}

/**
 * Obtiene grupos musculares con política Offline-First inmediata:
 * Si hay red, consume la API y actualiza la caché.
 * Si falla o está offline, retorna inmediatamente la caché local.
 */
export async function fetchMuscleGroupsWithCache() {
  if (!isOnline()) {
    return getCachedMuscleGroups();
  }

  try {
    const res = await api.get("/muscle-groups");
    const data = Array.isArray(res.data) ? res.data : [];
    if (data.length > 0) {
      setCachedMuscleGroups(data);
    }
    return data.length > 0 ? data : getCachedMuscleGroups();
  } catch (err) {
    console.warn("Error en red al obtener grupos musculares, usando caché:", err);
    return getCachedMuscleGroups();
  }
}

/**
 * Obtiene ejercicios con política Offline-First inmediata:
 * Si hay red, consume la API y actualiza la caché.
 * Si falla o está offline, retorna inmediatamente la caché local.
 */
export async function fetchExercisesWithCache(muscleGroupId = null) {
  if (!isOnline()) {
    return getCachedExercises(muscleGroupId);
  }

  try {
    const params = muscleGroupId ? { muscle_group_id: muscleGroupId } : {};
    const res = await api.get("/exercises", { params });
    const data = Array.isArray(res.data) ? res.data : [];
    if (data.length > 0 && !muscleGroupId) {
      setCachedExercises(data);
    }
    return data.length > 0 ? data : getCachedExercises(muscleGroupId);
  } catch (err) {
    console.warn("Error en red al obtener ejercicios, usando caché:", err);
    return getCachedExercises(muscleGroupId);
  }
}

// Auto-sincronización al detectar reconexión a internet
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncCatalogCache();
  });

  // Si arranca online, sincronizar silenciosamente en segundo plano
  if (isOnline()) {
    setTimeout(() => {
      syncCatalogCache().catch(() => {});
    }, 1500);
  }
}
