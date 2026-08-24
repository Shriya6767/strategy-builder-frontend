import logger from '../utils/logger';
/**
 * Version Config API Service
 * Handles strategy_id and strategy_name storage in LOCAL PostgreSQL
 */

const LOCAL_API_URL = "http://localhost:8001/api";

/**
 * Save strategy ID and name to LOCAL database
 * @param {number} strategyId - Strategy ID
 * @param {string} strategyName - Strategy name
 * @returns {Promise<Object>} - API response
 */
export const saveStrategyToDatabase = async (strategyId, strategyName) => {
  try {
    
    const response = await fetch(`${LOCAL_API_URL}/version-config/save-strategy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strategy_id: strategyId,
        strategy_name: strategyName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to save strategy to LOCAL database');
    }

    return {
      success: true,
      data: data.data,
      message: data.message,
    };
  } catch (error) {
    logger.error('[VERSION_CONFIG] ✗ Failed to save to LOCAL database:', error.message);
    throw error;
  }
};

/**
 * Increment run count for a strategy
 * @param {number} strategyId - Strategy ID
 * @returns {Promise<Object>} - API response
 */
export const incrementRunCount = async (strategyId) => {
  try {
    
    const response = await fetch(`${LOCAL_API_URL}/version-config/increment-run-count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strategy_id: strategyId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to increment run count');
    }

    return {
      success: true,
      data: data.data,
      message: data.message,
    };
  } catch (error) {
    logger.error('[VERSION_CONFIG] ✗ Failed to increment run count:', error.message);
    throw error;
  }
};

/**
 * Get strategy by ID from LOCAL database
 * @param {number} strategyId - Strategy ID
 * @returns {Promise<Object>} - Strategy data
 */
export const getStrategyFromDatabase = async (strategyId) => {
  try {
    
    const response = await fetch(`${LOCAL_API_URL}/version-config/get-strategy/${strategyId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to retrieve strategy from LOCAL database');
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    logger.error('[VERSION_CONFIG] ✗ Failed to retrieve strategy:', error.message);
    throw error;
  }
};

/**
 * Get all strategies from LOCAL database
 * @returns {Promise<Array>} - List of strategies
 */
export const getAllStrategiesFromDatabase = async () => {
  try {
    
    const response = await fetch(`${LOCAL_API_URL}/version-config/get-all-strategies`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to retrieve strategies from LOCAL database');
    }

    return {
      success: true,
      data: data.data,
      count: data.count,
    };
  } catch (error) {
    logger.error('[VERSION_CONFIG] ✗ Failed to retrieve all strategies:', error.message);
    throw error;
  }
};

/**
 * Delete strategy from LOCAL database
 * @param {number} strategyId - Strategy ID
 * @returns {Promise<Object>} - API response
 */
export const deleteStrategyFromDatabase = async (strategyId) => {
  try {
    
    const response = await fetch(`${LOCAL_API_URL}/version-config/delete-strategy/${strategyId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to delete strategy from LOCAL database');
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    logger.error('[VERSION_CONFIG] ✗ Failed to delete strategy:', error.message);
    throw error;
  }
};
