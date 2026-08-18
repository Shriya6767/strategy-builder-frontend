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

// Portfolio API functions
export const deletePortfolioAPI = async (portfolioId) => {
  try {
    const response = await fetch(`${API_URL}/delete-portfolio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ portfolio_id: portfolioId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.message || 'Failed to delete portfolio');
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error deleting portfolio:', error);
    throw error;
  }
};

export default api;
