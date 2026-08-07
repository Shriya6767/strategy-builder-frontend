import axios from "axios";

// ── Single place to change the backend URL ──────────────────────────────────
// All components import API_URL from here — never hardcode the host elsewhere.
export const BASE_URL = "http://192.168.0.125:8000";
export const API_URL  = `${BASE_URL}/api`;

// Axios instance (used by other components)
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized");
    } else if (error.response?.status === 404) {
      console.error("Resource not found");
    } else if (error.response?.status === 500) {
      console.error("Server error");
    }
    return Promise.reject(error);
  }
);

export default api;
