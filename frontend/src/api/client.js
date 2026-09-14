import axios from "axios";

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
  const res = await api.get("/muscle-groups");
  return res.data;
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
  const res = await api.get("/exercises", {
    params: muscleGroupId ? { muscle_group_id: muscleGroupId } : {},
  });
  return res.data;
};

export const createExercise = async (name, muscleGroupId) => {
  const res = await api.post("/exercises", {
    name,
    muscle_group_id: muscleGroupId,
  });
  return res.data;
};

export const deleteExercise = async (id) => {
  const res = await api.delete(`/exercises/${id}`);
  return res.data;
};

export const saveWorkoutSession = async (workoutData) => {
  const res = await api.post("/workouts/session", workoutData);
  return res.data;
};

export const saveWorkout = async (workoutData) => {
  const res = await api.post("/workouts/session", workoutData).catch(() => {
    return api.post("/workouts", workoutData);
  });
  return res.data;
};

export const getActiveWorkout = async () => {
  const res = await api.get("/workouts/active");
  return res.data;
};

export const startWorkout = async (payload = {}) => {
  const res = await api.post("/workouts/start", payload);
  return res.data;
};

export const addWorkoutSet = async (workoutId, setData) => {
  const res = await api.post(`/workouts/${workoutId}/sets`, setData);
  return res.data;
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
      if (res.data.experience_level) {
        window.dispatchEvent(new CustomEvent("fittracker:levelChanged", { detail: res.data.experience_level }));
      }
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
  const res = await api.get("/records", { params });
  return res.data;
};

export const getExercisePreviousSession = async (exerciseId, excludeSessionId = null) => {
  const params = {};
  if (excludeSessionId) params.exclude_session_id = excludeSessionId;
  const res = await api.get(`/exercises/${exerciseId}/previous-session`, { params });
  return res.data;
};

export const getAnalyticsDashboard = async (today = null) => {
  const params = {};
  if (today) params.today = today;
  const res = await api.get("/analytics/dashboard", { params });
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

export const getAdminSupportRequests = async () => {
  const res = await api.get("/admin/support-requests");
  return res.data;
};

export const updateAdminSupportRequest = async (requestId, payload) => {
  const res = await api.patch(`/admin/support-requests/${requestId}`, payload);
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

