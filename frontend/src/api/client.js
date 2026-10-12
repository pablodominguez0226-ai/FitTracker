import axios from "axios";
import { enqueueSyncAction } from "../utils/syncQueue";
import {
  fetchMuscleGroupsWithCache,
  fetchExercisesWithCache,
  findCachedExerciseByName,
  addCustomExerciseToCache,
} from "../services/exerciseCache";

export const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const AUTH_TOKEN_KEY = "fittracker_token";
export const AUTH_USER_KEY = "fittracker_user";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn("Error accediendo al token en localStorage:", e);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      } catch (e) {
        console.warn("Error limpiando credenciales tras 401:", e);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("fittracker:unauthorized"));
      }
    }
    return Promise.reject(error);
  }
);

export const getMuscleGroups = async () => {
  return await fetchMuscleGroupsWithCache();
};

export const createMuscleGroup = async (name) => {
  const res = await api.post("/muscle-groups", { name });
  return res.data;
};

export const updateMuscleGroup = async (id, name) => {
  const res = await api.put(`/muscle-groups/${id}`, { name });
  return res.data;
};

export const deleteMuscleGroup = async (id, force = false) => {
  const res = await api.delete(`/muscle-groups/${id}`, {
    params: force ? { force: true } : {},
  });
  return res.data;
};

export const getExercises = async (muscleGroupId = null) => {
  return await fetchExercisesWithCache(muscleGroupId);
};

export const createExercise = async (name, muscleGroupId) => {
  const cleanName = (name || "").trim();
  if (!cleanName) throw new Error("El nombre del ejercicio es obligatorio.");

  // Prevenir duplicados comprobando coincidencia exacta en el catálogo local
  const existing = findCachedExerciseByName(cleanName);
  if (existing) {
    return existing;
  }

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  if (isOffline) {
    const tempId = `temp_exercise_${Date.now()}`;
    const tempExercise = {
      id: tempId,
      name: cleanName,
      muscle_group_id: Number(muscleGroupId),
      is_temp: true,
      is_active: true,
    };
    addCustomExerciseToCache(tempExercise);
    enqueueSyncAction({
      type: "CREATE_EXERCISE",
      tempId,
      payload: {
        tempId,
        name: cleanName,
        muscle_group_id: Number(muscleGroupId),
      },
    });
    return tempExercise;
  }

  try {
    const res = await api.post("/exercises", {
      name: cleanName,
      muscle_group_id: Number(muscleGroupId),
    });
    addCustomExerciseToCache(res.data);
    return res.data;
  } catch (err) {
    if (
      !err.response ||
      err.code === "ERR_NETWORK" ||
      err.message?.includes("Network") ||
      (typeof navigator !== "undefined" && !navigator.onLine)
    ) {
      const tempId = `temp_exercise_${Date.now()}`;
      const tempExercise = {
        id: tempId,
        name: cleanName,
        muscle_group_id: Number(muscleGroupId),
        is_temp: true,
        is_active: true,
      };
      addCustomExerciseToCache(tempExercise);
      enqueueSyncAction({
        type: "CREATE_EXERCISE",
        tempId,
        payload: {
          tempId,
          name: cleanName,
          muscle_group_id: Number(muscleGroupId),
        },
      });
      return tempExercise;
    }
    throw err;
  }
};

export const deleteExercise = async (id) => {
  const res = await api.delete(`/exercises/${id}`);
  return res.data;
};

export const updateExercise = async (id, data) => {
  const res = await api.put(`/exercises/${id}`, data);
  return res.data;
};


export const saveWorkoutSession = async (workoutData) => {
  const res = await api.post("/workouts/session", workoutData);
  return res.data;
};

export const saveWorkout = async (workoutData) => {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  if (isOffline) {
    enqueueSyncAction({
      type: "SAVE_WORKOUT",
      payload: workoutData,
    });
    return {
      id: `offline_${Date.now()}`,
      ...workoutData,
      is_offline: true,
    };
  }

  try {
    const res = await api.post("/workouts/session", workoutData).catch(() => {
      return api.post("/workouts", workoutData);
    });
    return res.data;
  } catch (err) {
    if (
      !err.response ||
      err.code === "ERR_NETWORK" ||
      err.message?.includes("Network") ||
      (typeof navigator !== "undefined" && !navigator.onLine)
    ) {
      enqueueSyncAction({
        type: "SAVE_WORKOUT",
        payload: workoutData,
      });
      return {
        id: `offline_${Date.now()}`,
        ...workoutData,
        is_offline: true,
      };
    }
    throw err;
  }
};

export const getActiveWorkout = async () => {
  const res = await api.get("/workouts/active");
  return res.data;
};

export const getCycleStatus = async () => {
  const res = await api.get("/workouts/cycle-status").catch(() => {
    return api.get("/workout/cycle-status");
  });
  return res.data;
};


export const startWorkout = async (payload = {}) => {
  const res = await api.post("/workouts/start", payload);
  return res.data;
};

export const addWorkoutSet = async (workoutId, setData) => {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  if (isOffline) {
    const tempId = `temp_set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    enqueueSyncAction({
      type: "ADD_SET",
      tempId,
      payload: {
        workoutSessionId: workoutId,
        setData,
        tempId,
      },
    });
    return {
      id: tempId,
      ...setData,
      is_offline: true,
    };
  }

  try {
    const res = await api.post(`/workouts/${workoutId}/sets`, setData);
    return res.data;
  } catch (err) {
    if (
      !err.response ||
      err.code === "ERR_NETWORK" ||
      err.message?.includes("Network") ||
      (typeof navigator !== "undefined" && !navigator.onLine)
    ) {
      const tempId = `temp_set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      enqueueSyncAction({
        type: "ADD_SET",
        tempId,
        payload: {
          workoutSessionId: workoutId,
          setData,
          tempId,
        },
      });
      return {
        id: tempId,
        ...setData,
        is_offline: true,
      };
    }
    throw err;
  }
};

export const updateWorkoutSet = async (setId, updateData) => {
  const res = await api.patch(`/workouts/sets/${setId}`, updateData);
  return res.data;
};

export const deleteWorkoutSet = async (setId) => {
  const res = await api.delete(`/workouts/sets/${setId}`);
  return res.data;
};

export const updateWorkoutReadiness = async (workoutId, readinessData) => {
  const res = await api.patch(`/workouts/${workoutId}/readiness`, readinessData);
  return res.data;
};

export const updateWorkoutDate = async (workoutId, date) => {
  const res = await api.patch(`/workouts/${workoutId}/date`, { date });
  return res.data;
};

export const finishWorkout = async (workoutId, finishData = {}) => {
  const res = await api.post(`/workouts/${workoutId}/finish`, finishData);
  return res.data;
};

export const getProfile = async () => {
  const res = await api.get("/auth/profile");
  return res.data;
};

export const updateProfile = async (payload) => {
  const res = await api.put("/auth/profile", payload);
  if (res.data && typeof res.data === "object") {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          const updated = { ...parsed, ...res.data };
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.warn("Error actualizando usuario en caché:", e);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fittracker:profileChanged", { detail: res.data }));
    }

  }
  return res.data;
};

export const getUserProfile = async () => {
  const res = await api.get("/profile");
  return res.data;
};

export const updateUserProfile = async (experienceLevel) => {
  return updateProfile({ experience_level: experienceLevel });
};

export const getWorkouts = async (status = null) => {
  const res = await api.get("/workouts", {
    params: status ? { status } : {},
  });
  return res.data;
};

export const deleteWorkout = async (id) => {
  const res = await api.delete(`/workouts/${id}`);
  return res.data;
};

export const getRecords = async (exerciseId = null, muscleGroupId = null) => {
  const params = {};
  if (exerciseId) params.exercise_id = exerciseId;
  if (muscleGroupId) params.muscle_group_id = muscleGroupId;
  try {
    const res = await api.get("/records", { params });
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data && Array.isArray(res.data.records)) {
      return res.data.records;
    }
    if (res.data && typeof res.data === "object") {
      return Object.values(res.data).filter((item) => item && typeof item === "object");
    }
    return [];
  } catch (err) {
    console.warn("Error obteniendo récords:", err);
    return [];
  }
};

export const getExercisePreviousSession = async (exerciseId, excludeSessionId = null) => {
  const params = {};
  if (excludeSessionId) params.exclude_session_id = excludeSessionId;
  try {
    const res = await api.get(`/exercises/${exerciseId}/previous-session`, { params });
    return res.data || null;
  } catch (err) {
    return null;
  }
};

export const getAnalyticsDashboard = async (today = null) => {
  const params = {};
  if (today) params.today = today;
  const res = await api.get("/analytics/dashboard", { params });
  return res.data;
};

export const getMuscleDistribution = async () => {
  const res = await api.get("/metrics/muscle-distribution");
  return res.data;
};

export const getExerciseHistory = async (exerciseId) => {
  const res = await api.get(`/metrics/exercise-history/${exerciseId}`);
  return res.data;
};

export const getProfileAnalytics = async () => {
  const res = await api.get("/profile/analytics");
  return res.data;
};

export const getContextualTips = async (params = {}) => {
  const res = await api.get("/tips/contextual", { params });
  return res.data;
};

export const getAIWeeklyBriefing = async () => {
  const res = await api.get("/ai/weekly-briefing");
  return res.data;
};

export const askAICoach = async (question) => {
  const res = await api.post("/ai/ask", { question });
  return res.data;
};

export const getLevelExplanations = async () => {
  const res = await api.get("/profile/explanations");
  return res.data;
};

export const getTrainingGuidelines = async (params = {}) => {
  const res = await api.get("/training-guidelines", { params });
  return res.data;
};

export const getSuggestedRoutines = async () => {
  const res = await api.get("/routines/suggested");
  return res.data;
};

export const getRoutines = async () => {
  const res = await api.get("/routines");
  return res.data;
};

export const createRoutine = async (routineData) => {
  const res = await api.post("/routines", routineData);
  return res.data;
};

export const updateRoutine = async (id, routineData) => {
  const res = await api.put(`/routines/${id}`, routineData);
  return res.data;
};

export const deleteRoutine = async (id) => {
  const res = await api.delete(`/routines/${id}`);
  return res.data;
};

export const updateRoutineExercises = async (routineId, exercises) => {
  const res = await api.put(`/routines/${routineId}/exercises`, { exercises });
  return res.data;
};

export const startWorkoutFromRoutine = async (routineId) => {
  const res = await api.post(`/workouts/start-from-routine/${routineId}`);
  return res.data;
};

export const getExerciseGuide = async (exerciseId) => {
  const res = await api.get(`/exercises/${exerciseId}/guide`);
  return res.data;
};

export const getExerciseGuidance = async (exerciseId) => {
  const res = await api.get(`/exercises/${exerciseId}/guidance`);
  return res.data;
};

export const registerUser = async (username, password, email = null) => {
  const res = await api.post("/auth/register", { username, password, email });
  return res.data;
};

export const loginUser = async (username, password) => {
  const res = await api.post("/auth/login", { username, password });
  return res.data;
};

export const getMe = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};

export const changePassword = async (current_password, new_password) => {
  const res = await api.post("/auth/change-password", {
    current_password,
    new_password,
  });
  return res.data;
};

export const forgotPassword = async (email) => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
};

export const resetPassword = async (token, new_password) => {
  const res = await api.post("/auth/reset-password", {
    token,
    new_password,
  });
  return res.data;
};

export const submitSupportRequest = async ({ subject, message, username = null, email = null }) => {
  const res = await api.post("/auth/support-request", { subject, message, username, email });
  return res.data;
};

export const getAdminUsers = async () => {
  const res = await api.get("/admin/users");
  return res.data;
};

export const updateAdminUserStatus = async (userId, isActive) => {
  const res = await api.patch(`/admin/users/${userId}/status`, { is_active: isActive });
  return res.data;
};

export const updateAdminUserRole = async (userId, role) => {
  const res = await api.patch(`/admin/users/${userId}/role`, { role });
  return res.data;
};

export const resetAdminUserPassword = async (userId, newPassword) => {
  const res = await api.post(`/admin/users/${userId}/reset-password`, { new_password: newPassword });
  return res.data;
};

export const updateAdminUser = async (userId, payload) => {
  const res = await api.put(`/admin/users/${userId}`, payload);
  return res.data;
};

export const deleteAdminUser = async (userId) => {
  const res = await api.delete(`/admin/users/${userId}`);
  return res.data;
};

export const createAdminExercise = async (name, muscleGroupId) => {
  const res = await api.post("/admin/exercises", {
    name,
    muscle_group_id: muscleGroupId,
  });
  return res.data;
};

export const deleteAdminExercise = async (exerciseId, force = false) => {
  const res = await api.delete(`/admin/exercises/${exerciseId}`, {
    params: force ? { force: true } : {},
  });
  return res.data;
};

export const getAdminStats = async () => {
  const res = await api.get("/admin/stats");
  return res.data;
};

export const getAdminSupportRequests = async () => {
  const res = await api.get("/admin/support-requests");
  return res.data;
};

export const updateAdminSupportRequest = async (requestId, payload) => {
  const res = await api.patch(`/admin/support-requests/${requestId}`, payload);
  return res.data;
};

// --- ANTI-CHEAT & MODERATION (MODERACIÓN ANTI-CHEAT) ---
export const getAdminFlaggedWorkouts = async () => {
  const res = await api.get("/admin/flagged-workouts");
  return res.data;
};

export const invalidateAdminWorkoutSet = async (setId) => {
  const res = await api.put(`/admin/workouts/set/${setId}/invalidate`);
  return res.data;
};

export const approveAdminWorkoutSet = async (setId) => {
  const res = await api.put(`/admin/workouts/set/${setId}/approve`);
  return res.data;
};

export const deleteAdminWorkoutSet = async (setId) => {
  const res = await api.delete(`/admin/workouts/set/${setId}`);
  return res.data;
};

// --- LIVE BATTLE (DUELO EN VIVO 1 VS 1) ---
export const createBattle = async ({ exercise_id, user_name, bodyweight, target_rounds = 3 }) => {
  const res = await api.post("/battles", {
    exercise_id,
    user_name,
    bodyweight,
    target_rounds,
  });
  return res.data;
};

export const joinBattle = async ({ pin_code, user_name, bodyweight }) => {
  const res = await api.post("/battles/join", {
    pin_code,
    user_name,
    bodyweight,
  });
  return res.data;
};

export const getBattle = async (battleId) => {
  const res = await api.get(`/battles/${battleId}`);
  return res.data;
};

export const submitBattleRound = async (battleId, participantName, weightLifted, reps) => {
  const res = await api.post(
    `/battles/${battleId}/submit-round`,
    {
      weight_lifted: weightLifted,
      reps,
    },
    {
      params: { participant_name: participantName },
    }
  );
  return res.data;
};

export const validateBattleRound = async (battleId, roundId, reps = null) => {
  const res = await api.post(`/battles/${battleId}/validate-round`, {
    round_id: roundId,
    reps,
    is_validated: true,
  });
  return res.data;
};

export const finishBattle = async (battleId) => {
  const res = await api.post(`/battles/${battleId}/finish`);
  return res.data;
};

export const saveBattleToWorkout = async (battleId, userName) => {
  const res = await api.post(`/battles/${battleId}/save-to-workout`, null, {
    params: { user_name: userName },
  });
  return res.data;
};

// ====================================================================
// SUPLEMENTOS, QUÍMICA & ANÁLISIS
// ====================================================================

export const getSupplements = async (dateStr = null) => {
  const res = await api.get("/supplements", {
    params: dateStr ? { date_str: dateStr } : {},
  });
  return res.data;
};

export const createSupplement = async (payload) => {
  const res = await api.post("/supplements", payload);
  return res.data;
};

export const updateSupplement = async (id, payload) => {
  const res = await api.put(`/supplements/${id}`, payload);
  return res.data;
};

export const deleteSupplement = async (id) => {
  const res = await api.delete(`/supplements/${id}`);
  return res.data;
};

export const toggleSupplementToday = async (id, payload = {}) => {
  const res = await api.post(`/supplements/${id}/toggle-today`, payload);
  return res.data;
};

export const getTodaySupplementChecklist = async (dateStr = null) => {
  const res = await api.get("/supplements/today/checklist", {
    params: dateStr ? { date_str: dateStr } : {},
  });
  return res.data;
};

export const getChemistryCompounds = async () => {
  const res = await api.get("/supplements/chemistry");
  return res.data;
};

export const createChemistryCompound = async (payload) => {
  const res = await api.post("/supplements/chemistry", payload);
  return res.data;
};

export const updateChemistryCompound = async (id, payload) => {
  const res = await api.put(`/supplements/chemistry/${id}`, payload);
  return res.data;
};

export const deleteChemistryCompound = async (id) => {
  const res = await api.delete(`/supplements/chemistry/${id}`);
  return res.data;
};

export const getLabAnalyses = async () => {
  const res = await api.get("/supplements/analyses");
  return res.data;
};

export const createLabAnalysis = async (payload) => {
  const res = await api.post("/supplements/analyses", payload);
  return res.data;
};

export const updateLabAnalysis = async (id, payload) => {
  const res = await api.put(`/supplements/analyses/${id}`, payload);
  return res.data;
};

export const deleteLabAnalysis = async (id) => {
  const res = await api.delete(`/supplements/analyses/${id}`);
  return res.data;
};

// ====================================================================
// NUTRICIÓN & MACROS
// ====================================================================

export const calculateMacros = async (payload) => {
  const res = await api.post("/nutrition/calculate-macros", payload);
  return res.data;
};

export const getTodayNutrition = async (dateStr = null) => {
  const res = await api.get("/nutrition/today", {
    params: dateStr ? { date_str: dateStr } : {},
  });
  return res.data;
};

export const updateTodayNutrition = async (payload, dateStr = null) => {
  const res = await api.post("/nutrition/today", payload, {
    params: dateStr ? { date_str: dateStr } : {},
  });
  return res.data;
};

export const getNutritionPlan = async () => {
  const res = await api.get("/nutrition/plan");
  return res.data;
};

export const updateNutritionPlan = async (payload) => {
  const res = await api.post("/nutrition/plan", payload);
  return res.data;
};

export const uploadDietPdf = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/nutrition/upload-pdf", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ====================================================================
// CHECK-INS PERIÓDICOS
// ====================================================================

export const getCheckins = async () => {
  const res = await api.get("/checkins");
  return res.data;
};

export const createCheckin = async (payload) => {
  const res = await api.post("/checkins", payload);
  return res.data;
};

export const deleteCheckin = async (id) => {
  const res = await api.delete(`/checkins/${id}`);
  return res.data;
};

export const getCheckinStatus = async () => {
  const res = await api.get("/checkins/status");
  return res.data;
};

export const updateCheckinFrequency = async (frequency) => {
  const res = await api.post("/checkins/frequency", { frequency });
  return res.data;
};


