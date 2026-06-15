import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000
});

export const AUTH_TOKEN_KEY = "fittracker_access_token";
export const AUTH_USER_KEY = "fittracker_user";

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      window.dispatchEvent(new Event("fittracker:logout"));
    }
    if (error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent("fittracker:forbidden", {
        detail: "No tenés permisos para esta acción"
      }));
    }
    return Promise.reject(error);
  }
);

export const uploadBase = API_BASE.replace(/\/api$/, "");
