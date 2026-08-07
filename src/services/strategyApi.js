/**
 * Strategy API Service
 * Handles all API calls related to strategy operations.
 * All requests go to the FastAPI backend at http://192.168.0.125:8000
 */

import { API_URL } from "./api";

/**
 * Save strategy to backend
 * @param {Object} requestBody - Strategy data with structure { strategy: {...}, legs: [...], version: number }
 * @returns {Promise<Object>} - API response
 */
export const saveStrategy = async (requestBody) => {
  try {
    console.log('[API] Saving strategy...');
    console.log(`[API] Endpoint: POST ${API_URL}/save-strategy`);
    console.log('[API] Request body:', requestBody);

    const response = await fetch(`${API_URL}/save-strategy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined,
    });

    console.log('[API] Response status:', response.status);

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(
        `Expected JSON response, got ${contentType || 'unknown'}: ${text.substring(0, 100)}`
      );
    }

    console.log('[API] Response data:', data);

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
      console.error('[API] Error response:', errorMessage);
      throw new Error(errorMessage);
    }

    if (data.status === 'error' || data.error) {
      const errorMessage = data.error || data.message || 'Unknown error';
      console.error('[API] API returned error status:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('[API] ✓ Strategy saved successfully');
    return {
      success: true,
      data,
      strategy_id: data.strategy_id || data.id || null,
      strategy_name: data.strategy_name || null,  // ⭐ ADD: Extract strategy_name
      version: data.version || null,              // ⭐ ADD: Extract version
      message: data.message || 'Strategy saved successfully',
    };
  } catch (error) {
    console.error('[API] ✗ Save strategy failed:', error.message);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - backend took too long to respond');
    } else if (error instanceof TypeError) {
      throw new Error(`Network error - unable to reach the server at ${API_URL}`);
    }
    throw error;
  }
};

/**
 * Build run-backtest request payload.
 * Transforms frontend config to backend API format for backtesting.
 * @param {Object} config - Strategy configuration from StrategyBuilder
 * @param {number} version - Version number to send with the backtest request (default: 1)
 * @returns {Object} - Formatted request body for run-backtest API
 */
export const buildRunBacktestPayload = (config, version = 1) => {
  // Use the same payload structure as save strategy but for run-backtest
  const savePayload = buildSaveStrategyPayload(config, version);
  
  // Return the payload (version is already inside strategy object)
  return {
    strategy: savePayload.strategy,
    legs: savePayload.legs,
  };
};

/**
 * Delete strategy from backend
 * @param {string|number} strategyId - Strategy ID
 * @param {string} strategyName - Strategy name
 * @returns {Promise<Object>} - API response
 */
export const deleteStrategy = async (strategyId, strategyName) => {
  try {
    console.log('[API] Deleting strategy...');
    console.log(`[API] Strategy ID: ${strategyId}, Name: ${strategyName}`);

    const response = await fetch(`${API_URL}/delete-strategy?strategy_id=${strategyId}&strategy_name=${encodeURIComponent(strategyName)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('[API] Response status:', response.status);

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(
        `Expected JSON response, got ${contentType || 'unknown'}: ${text.substring(0, 100)}`
      );
    }

    console.log('[API] Response data:', data);

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
      console.error('[API] Error response:', errorMessage);
      throw new Error(errorMessage);
    }

    if (!data.success) {
      const errorMessage = data.error || data.message || 'Unknown error';
      console.error('[API] API returned error status:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('[API] ✓ Strategy deleted successfully');
    return {
      success: true,
      data,
      message: data.message || 'Strategy deleted successfully',
    };
  } catch (error) {
    console.error('[API] ✗ Delete strategy failed:', error.message);
    if (error instanceof TypeError) {
      throw new Error(`Network error - unable to reach the server at ${API_URL}`);
    }
    throw error;
  }
};

 
/**
 * Compare backtests for a strategy
 * @param {string|number} strategyId - Strategy ID
 * @param {string} strategyName - Strategy name
 * @returns {Promise<Object>} - API response with version comparison data
 */
export const compareBacktests = async (strategyId, strategyName) => {
  try {
    console.log('[API] Comparing backtests...');
    console.log(`[API] Strategy ID: ${strategyId}, Name: ${strategyName}`);

    const response = await fetch(`${API_URL}/compare-backtest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        strategy_id: strategyId,
        strategy_name: strategyName,
      }),
    });

    console.log('[API] Response status:', response.status);

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(
        `Expected JSON response, got ${contentType || 'unknown'}: ${text.substring(0, 100)}`
      );
    }

    console.log('[API] Response data:', data);

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
      console.error('[API] Error response:', errorMessage);
      throw new Error(errorMessage);
    }

    if (!data.success) {
      const errorMessage = data.error || data.message || 'Unknown error';
      console.error('[API] API returned error status:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('[API] ✓ Backtests comparison fetched successfully');
    return {
      success: true,
      data: data.data || [],
      message: data.message || 'Backtests compared successfully',
    };
  } catch (error) {
    console.error('[API] ✗ Compare backtests failed:', error.message);
    if (error instanceof TypeError) {
      throw new Error(`Network error - unable to reach the server at ${API_URL}`);
    }
    throw error;
  }
};

export const buildSaveStrategyPayload = (config, version = null) => {
  const toNumber = (val) =>
    val === '' || val === null || val === undefined ? 0 : Number(val);

  const formatTime = (time) => {
    if (!time) return '00:00:00';
    if (time.includes(':')) {
      const parts = time.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    }
    return '00:00:00';
  };

  const formatStrikeForBackend = (strikeType) => {
    if (!strikeType || strikeType === 'atm') return 'ATM';
    const lc = String(strikeType).toLowerCase();
    if (lc.startsWith('itm_')) {
      const n = parseInt(lc.replace('itm_', ''), 10);
      return `ITM-${isNaN(n) ? 1 : n}`;
    }
    if (lc.startsWith('otm_')) {
      const n = parseInt(lc.replace('otm_', ''), 10);
      return `OTM+${isNaN(n) ? 1 : n}`;
    }
    return 'ATM';
  };

  const getStrikeSign = (strikeType) => {
    if (!strikeType) return '';
    const lc = String(strikeType).toLowerCase();
    if (lc.includes('itm') || lc === 'ITM') return '-';
    if (lc.includes('otm') || lc === 'OTM') return '+';
    return '';
  };

  const legsArray = (config.legs || []).map((leg) => ({
    lot_size: toNumber(leg.lots),
    position_type: (leg.position || 'buy').toUpperCase(),
    option_type: (leg.option_type || 'call').toUpperCase(),
    expiry_type: leg.expiry || '0dte',  // ✅ FIXED: Use leg.expiry directly (already '0dte' or '1dte')
    strike_criteria: leg.strike_criteria || 'strike_type',
    // atm_strike: Only for "based on points" or "based on atm percent"
    atm_strike: (leg.strike_criteria === 'based on points' || 
                 leg.strike_criteria === 'based_on_points' ||
                 leg.strike_criteria === 'based on atm percent' ||
                 leg.strike_criteria === 'based_on_atm_percent')
                ? formatStrikeForBackend(leg.strike_type)
                : null,
    strike_sign: getStrikeSign(leg.strike_type),
    // premium_value: For "closest premium" use strike_value (Nearest field)
    //                For "premium range" use premium_tolerance
    premium_value: (leg.strike_criteria === 'closest premium' || leg.strike_criteria === 'closest_premium')
                    ? toNumber(leg.strike_value)
                    : (leg.strike_criteria === 'premium range' || leg.strike_criteria === 'premium_range')
                    ? toNumber(leg.premium_tolerance)
                    : 0,
    // ✅ FIX: Map the actual values from leg fields
    lower_range: toNumber(leg.lower_range) || 0,
    upper_range: toNumber(leg.upper_range) || 0,
    multiplier_percentage: toNumber(leg.atm_percent_value) || toNumber(leg.multiplier_percentage) || 0,
    is_target: leg.target_enabled || false,
    target_type: (leg.target_mode || 'points').toUpperCase(),
    target_value: toNumber(leg.target_value),
    is_stoploss: leg.stop_loss_enabled || false,
    stoploss_type: (leg.stop_loss_mode || 'points').toUpperCase(),
    stoploss_value: toNumber(leg.stop_loss_value),
    is_trail_sl: leg.trail_enabled || false,
    trail_sl_type: (leg.trail_mode || 'points').toUpperCase(),
    instrument_moves: toNumber(leg.trail_value) || 0,          // ✅ First value (e.g., 10)
    stoploss_moves: toNumber(leg.trail_lock_value) || 0,       // ✅ FIXED: Second value (e.g., 5)
    is_reentry_sl: leg.reentry_sl_enabled || false,
    reentry_sl_type: (leg.reentry_sl_mode || 're_asap').toUpperCase(),
    reentry_sl_value: toNumber(leg.reentry_sl_count),
    is_reentry_target: leg.reentry_tgt_enabled || false,
    reentry_target_type: (leg.reentry_tgt_mode || 're_asap').toUpperCase(),
    reentry_target_value: toNumber(leg.reentry_tgt_count),
    is_simple_momentum: leg.momentum_enabled || false,
    momentum_type: (leg.momentum_mode || 'percent_down').toUpperCase(),
    momentum_value: toNumber(leg.momentum_value),
    is_range_breakout: leg.range_enabled || false,
    range_breakout_type: leg.range_enabled
      ? leg.range_instrument === 'instrument'
        ? 'Instrument'
        : 'Underlying'
      : null,
    range_end_time: leg.range_enabled ? formatTime(leg.range_time) : null,
    // ✅ FIX: Use actual range_direction value (High/Low), not hardcoded
    range_on: leg.range_enabled 
      ? (leg.range_direction || 'high').charAt(0).toUpperCase() + (leg.range_direction || 'high').slice(1).toLowerCase()
      : null,
  }));

  const strategyObject = {
    action: 'save',
    strategy_name: config.strategy_name || `strategy_${Date.now()}`,
    symbol: config.symbol,
    start_date: config.start_date,
    end_date: config.end_date,
    dte_filter: toNumber(config.dte_filter),
    underlying_type: config.underlying_type || 'option',
    is_squareoff: config.square_off === 'complete',
    is_trail_sl_break_even: config.trail_to_be || false,
    trail_sl_break_even_type: 'POINTS',
    strategy_type: (config.strategy_type || 'intraday').toUpperCase(),
    entry_time: formatTime(config.entry_time),
    entry_delay: 0,
    exit_time: formatTime(config.exit_time),
    exit_delay: 0,
    // ✅ FIX: Use overall_stop_loss_enabled (not is_strategy_sl)
    is_strategy_sl: config.overall_stop_loss_enabled || false,
    strategy_sl_type: (config.overall_stop_loss_mode || 'mtm').toUpperCase(),
    strategy_sl_value: toNumber(config.overall_stop_loss_value),
    // ✅ FIX: Use overall_target_enabled (not is_strategy_target)
    is_strategy_target: config.overall_target_enabled || false,
    strategy_target_type: (config.overall_target_mode || 'mtm').toUpperCase(),
    strategy_target_value: toNumber(config.overall_target_value),
    is_overall_reentry_sl: config.overall_reentry_sl_enabled || false,
    overall_reentry_sl_type: (config.overall_reentry_sl_mode || 're_asap').toUpperCase(),
    overall_reentry_sl_value: toNumber(config.overall_reentry_sl_count),
    is_overall_reentry_target: config.overall_reentry_tgt_enabled || false,
    overall_reentry_target_type: (config.overall_reentry_tgt_mode || 're_asap').toUpperCase(),
    overall_reentry_target_value: toNumber(config.overall_reentry_tgt_count),
    // ✅ FIX: Map lock_profit_* UI fields to backend field names
    is_overall_trail_sl: config.lock_profit_enabled || false,
    overall_trail_sl_type: (config.lock_profit_mode || 'points').toUpperCase(),
    overall_instrument_move: toNumber(config.lock_profit_value1),
    overall_stoploss_move: toNumber(config.lock_profit_value2),
    leg_count: legsArray.length,
  };

  // ⭐ NOTE: version will be added in App.jsx based on React Context
  // Do NOT add version here - it's conditionally added by the caller

  return {
    strategy: strategyObject,
    legs: legsArray,
  };
};
