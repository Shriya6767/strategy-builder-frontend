import axios from "axios";
import logger from '../utils/logger';

export const BASE_URL = "http://192.168.0.125:8000";
export const API_URL  = `${BASE_URL}/api`;

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
      logger.error("Unauthorized");
    } else if (error.response?.status === 404) {
      logger.error("Resource not found");
    } else if (error.response?.status === 500) {
      logger.error("Server error");
    }
    return Promise.reject(error);
  }
);

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
    logger.error('❌ Error deleting portfolio:', error);
    throw error;
  }
};

export default api;
