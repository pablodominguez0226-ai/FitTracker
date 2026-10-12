import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  AUTH_TOKEN_KEY,
  getActiveWorkout,
  getExercises,
  getMuscleGroups,
  getRecords,
  getWorkouts,
} from "../api/client";
import { processSyncQueue, isOnline } from "../utils/syncQueue";

export function getActiveSessionStorageKey(userId) {
  return userId ? `fittracker_active_session_${userId}` : "fittracker_active_session";
}

export function getSessionStartedAtStorageKey(userId) {
  return userId ? `fittracker_session_started_at_${userId}` : "fittracker_session_started_at";
}

// Contexto global de entrenamientos y sesiones
const WorkoutContext = createContext(null);

export function WorkoutProvider({ children }) {
  // -------------------------------------------------------------
  // 1. ELEVACIÓN TOTAL DE HOOKS: ESTADOS (useState)
  // Inicialización defensiva para bases de datos vacías (0 registros)
  // -------------------------------------------------------------
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [records, setRecords] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // -------------------------------------------------------------
  // 2. REFERENCIAS (useRef)
  // -------------------------------------------------------------
  const isMountedRef = useRef(true);

  // Función para purgar claves residuales de sesión activa en localStorage
  const purgeResidualActiveSessionStorage = () => {
    try {
      const explicitKeys = [
        "fittracker_active_session",
        "active_workout_id",
        "active_workout",
        "active_workout_session",
        "fittracker_session_started_at",
      ];
      explicitKeys.forEach((k) => localStorage.removeItem(k));

      // Purgar también cualquier clave indexada por usuario en localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("fittracker_active_session") ||
            key.startsWith("fittracker_session_started_at") ||
            key.startsWith("active_workout"))
        ) {
          localStorage.removeItem(key);
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fittracker:sessionTimerChanged", { detail: null })
        );
        window.dispatchEvent(
          new CustomEvent("fittracker:activeSessionCleared")
        );
      }
    } catch (e) {
      console.warn("Error purgando almacenamiento residual de sesión activa:", e);
    }
  };

  const refreshWorkoutData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let active = null;
      try {
        active = await getActiveWorkout();
      } catch (err) {
        // Si el backend responde 404 o error al consultar sesión activa, tratar como null
        active = null;
      }

      const [wList, exList, mgList, recsList] = await Promise.all([
        getWorkouts().catch(() => []),
        getExercises().catch(() => []),
        getMuscleGroups().catch(() => []),
        getRecords().catch(() => []),
      ]);

      if (!isMountedRef.current) return;

      // Si el backend respondió 404 o null, purgar claves de sesión residuales
      if (!active || active.status !== "in_progress") {
        purgeResidualActiveSessionStorage();
        active = null;
      }

      const safeWorkouts = Array.isArray(wList)
        ? wList
        : wList && typeof wList === "object"
        ? Object.values(wList)
        : [];
      const safeExercises = Array.isArray(exList)
        ? exList
        : exList && typeof exList === "object"
        ? Object.values(exList)
        : [];
      const safeMuscleGroups = Array.isArray(mgList)
        ? mgList
        : mgList && typeof mgList === "object"
        ? Object.values(mgList)
        : [];
      const safeRecords = Array.isArray(recsList)
        ? recsList
        : recsList && typeof recsList === "object"
        ? Object.values(recsList)
        : [];

      setSessions(safeWorkouts);
      setHistory(safeWorkouts);
      setExercises(safeExercises);
      setMuscleGroups(safeMuscleGroups);
      setRecords(safeRecords);
      setActiveSession(active);
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error cargando WorkoutContext:", err);
        setError("Error al sincronizar datos de entrenamiento.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // -------------------------------------------------------------
  // 4. MEMOS (useMemo)
  // -------------------------------------------------------------
  const totalVolumeAllTime = useMemo(() => {
    return (sessions || []).reduce((acc, sess) => {
      const sets = Array.isArray(sess?.sets) ? sess.sets : [];
      const vol = sets.reduce((sum, s) => {
        const wt = parseFloat(s?.weight) || 0;
        const rp = parseInt(s?.reps, 10) || 0;
        return sum + wt * rp;
      }, 0);
      return acc + vol;
    }, 0);
  }, [sessions]);

  const recordsMap = useMemo(() => {
    const map = {};
    (records || []).forEach((r) => {
      if (r?.exercise_id) {
        map[r.exercise_id] = r;
      }
    });
    return map;
  }, [records]);

  // Context value memorizado
  const contextValue = useMemo(() => {
    return {
      sessions,
      setSessions,
      history,
      setHistory,
      exercises,
      setExercises,
      muscleGroups,
      setMuscleGroups,
      records,
      setRecords,
      recordsMap,
      activeSession,
      setActiveSession,
      loading,
      error,
      refreshWorkoutData,
      totalVolumeAllTime,
    };
  }, [
    sessions,
    history,
    exercises,
    muscleGroups,
    records,
    recordsMap,
    activeSession,
    loading,
    error,
    refreshWorkoutData,
    totalVolumeAllTime,
  ]);

  // -------------------------------------------------------------
  // 5. EFECTOS (useEffect)
  // -------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
    if (token) {
      refreshWorkoutData();
    } else {
      setLoading(false);
    }

    const handleDataChanged = () => {
      refreshWorkoutData();
    };

    const handleLogout = () => {
      setSessions([]);
      setHistory([]);
      setExercises([]);
      setMuscleGroups([]);
      setRecords([]);
      setActiveSession(null);
      setError(null);
      setLoading(false);
    };

    const handleLogin = () => {
      refreshWorkoutData();
    };

    const handleOnline = async () => {
      try {
        await processSyncQueue();
      } catch (err) {
        console.warn("Error sincronizando cola offline al recuperar conexión:", err);
      }
      refreshWorkoutData();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("fittracker:recordUpdated", handleDataChanged);
    window.addEventListener("fittracker:syncQueueChanged", handleDataChanged);
    window.addEventListener("fittracker:syncQueueCompleted", handleDataChanged);
    window.addEventListener("fittracker:logout", handleLogout);
    window.addEventListener("fittracker:login", handleLogin);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("fittracker:recordUpdated", handleDataChanged);
      window.removeEventListener("fittracker:syncQueueChanged", handleDataChanged);
      window.removeEventListener("fittracker:syncQueueCompleted", handleDataChanged);
      window.removeEventListener("fittracker:logout", handleLogout);
      window.removeEventListener("fittracker:login", handleLogin);
    };
  }, [refreshWorkoutData]);

  // Retorno seguro sin early returns que quiebren hooks
  return (
    <WorkoutContext.Provider value={contextValue}>
      {children}
    </WorkoutContext.Provider>
  );
}

// Hook de consumo seguro
export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    // Si se utiliza fuera de WorkoutProvider, retornar estructura defensiva segura
    return {
      sessions: [],
      setSessions: () => {},
      history: [],
      setHistory: () => {},
      exercises: [],
      setExercises: () => {},
      muscleGroups: [],
      setMuscleGroups: () => {},
      records: [],
      setRecords: () => {},
      recordsMap: {},
      activeSession: null,
      setActiveSession: () => {},
      loading: false,
      error: null,
      refreshWorkoutData: async () => {},
      totalVolumeAllTime: 0,
    };
  }
  return context;
}

export default WorkoutContext;
