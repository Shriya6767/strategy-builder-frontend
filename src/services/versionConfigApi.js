/**
 * Version Config API Service
 * Handles strategy_id and strategy_name storage in LOCAL PostgreSQL
 */

// LOCAL backend URL (YOUR PC at localhost:8001, NOT backend PC at 192.168.0.125:8000!)
const LOCAL_API_URL = "http://localhost:8001/api";

/**
 * Save strategy ID and name to LOCAL database
 * @param {number} strategyId - Strategy ID
 * @param {string} strategyName - Strategy name
 * @returns {Promise<Object>} - API response
 */
export const saveStrategyToDatabase = async (strategyId, strategyName) => {
  try {
    console.log('[VERSION_CONFIG] Saving to LOCAL database:', { strategyId, strategyName });
    
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

    console.log('[VERSION_CONFIG] ✓ Strategy saved to LOCAL database:', data);
    return {
      success: true,
      data: data.data,
      message: data.message,
    };
  } catch (error) {
    console.error('[VERSION_CONFIG] ✗ Failed to save to LOCAL database:', error.message);
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
    console.log('[VERSION_CONFIG] Incrementing run count for strategy_id:', strategyId);
    
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

    console.log('[VERSION_CONFIG] ✓ Run count incremented:', data);
    return {
      success: true,
      data: data.data,
      message: data.message,
    };
  } catch (error) {
    console.error('[VERSION_CONFIG] ✗ Failed to increment run count:', error.message);
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
    console.log('[VERSION_CONFIG] Retrieving strategy_id:', strategyId);
    
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

    console.log('[VERSION_CONFIG] ✓ Strategy retrieved:', data);
    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('[VERSION_CONFIG] ✗ Failed to retrieve strategy:', error.message);
    throw error;
  }
};

/**
 * Get all strategies from LOCAL database
 * @returns {Promise<Array>} - List of strategies
 */
export const getAllStrategiesFromDatabase = async () => {
  try {
    console.log('[VERSION_CONFIG] Retrieving all strategies');
    
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

    console.log('[VERSION_CONFIG] ✓ Retrieved all strategies:', data);
    return {
      success: true,
      data: data.data,
      count: data.count,
    };
  } catch (error) {
    console.error('[VERSION_CONFIG] ✗ Failed to retrieve all strategies:', error.message);
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
    console.log('[VERSION_CONFIG] Deleting strategy_id:', strategyId);
    
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

    console.log('[VERSION_CONFIG] ✓ Strategy deleted:', data);
    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error('[VERSION_CONFIG] ✗ Failed to delete strategy:', error.message);
    throw error;
  }
};
