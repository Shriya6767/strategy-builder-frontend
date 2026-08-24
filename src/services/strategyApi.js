/**
 * Strategy API Service
 * Handles all API calls related to strategy operations.
 * All requests go to the FastAPI backend at http://192.168.0.125:8000
 */

import { API_URL } from "./api";
import logger from '../utils/logger';

/**
 * Save strategy to backend
 * @param {Object} requestBody - Strategy data with structure { strategy: {...}, legs: [...], version: number }
 * @returns {Promise<Object>} - API response
 */
export const saveStrategy = async (requestBody) => {
  try {
    logger.request('[SAVE STRATEGY] Request', { 
      method: 'POST',
      url: `${API_URL}/save-strategy`,
      body: requestBody
    });

    const response = await fetch(`${API_URL}/save-strategy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined,
    });


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


    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
      logger.error('[API] Error response:', errorMessage);
      throw new Error(errorMessage);
    }

    if (data.status === 'error' || data.error) {
      const errorMessage = data.error || data.message || 'Unknown error';
      logger.error('[API] API returned error status:', errorMessage);
      throw new Error(errorMessage);
    }

    logger.response('[SAVE STRATEGY] Response', { 
      status: response.status,
      data: data
    });
    logger.success('Strategy saved successfully');
    return {
      success: true,
      data,
      strategy_id: data.strategy_id || data.id || null,
      strategy_name: data.strategy_name || null,
      version: data.version || null,
      message: data.message || 'Strategy saved successfully',
    };
  } catch (error) {
    logger.error('[API] ✗ Save strategy failed:', error.message);
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
  const savePayload = buildSaveStrategyPayload(config, version);
  
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

    const response = await fetch(`${API_URL}/delete-strategy?strategy_id=${strategyId}&strategy_name=${encodeURIComponent(strategyName)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });


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


    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
      logger.error('[API] Error response:', errorMessage);
      throw new Error(errorMessage);
    }

    if (!data.success) {
      const errorMessage = data.error || data.message || 'Unknown error';
      logger.error('[API] API returned error status:', errorMessage);
      throw new Error(errorMessage);
    }

    logger.success('Strategy deleted successfully');
    return {
      success: true,
      data,
      message: data.message || 'Strategy deleted successfully',
    };
  } catch (error) {
    logger.error('[API] ✗ Delete strategy failed:', error.message);
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


    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
      logger.error('[API] Error response:', errorMessage);
      throw new Error(errorMessage);
    }

    if (!data.success) {
      const errorMessage = data.error || data.message || 'Unknown error';
      logger.error('[API] API returned error status:', errorMessage);
      throw new Error(errorMessage);
    }

    logger.success('Backtests comparison fetched successfully');
    
    return {
      success: true,
      data: data.data || [],
      message: data.message || 'Backtests compared successfully',
    };
  } catch (error) {
    logger.error('[API] ✗ Compare backtests failed:', error.message);
    if (error instanceof TypeError) {
      throw new Error(`Network error - unable to reach the server at ${API_URL}`);
    }
    throw error;
  }
};

const getMappedStrikeCriteria = (strikeCriteria) => {
  if (!strikeCriteria) return 'strike_type';
  
  const lc = String(strikeCriteria).toLowerCase();
  
  if (lc === 'based on atm percent' || lc === 'based_on_atm_percent') {
    return 'atm percentage';
  }
  
  if (lc === 'based on premium range' || lc === 'based_on_premium_range') {
    return 'premium range';
  }
  
  return strikeCriteria;
};

export const buildSaveStrategyPayload = (config, version = null) => {
  const toNumber = (val) =>
    val === '' || val === null || val === undefined ? 0 : Number(val);
  
  const toNumberOrZero = (val) => {
    if (val === '' || val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

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

  const formatTypeForBackend = (typeValue) => {
    if (!typeValue) return 'POINTS';
    const lc = String(typeValue).toLowerCase();
    
    if (lc === 'percentage') return 'PERCENT';
    if (lc === 'underlying_percentage') return 'UNDERLYING_PERCENT';
    
    if (lc === 'points') return 'POINTS';
    if (lc === 'underlying_points') return 'UNDERLYING_POINTS';
    if (lc === 'mtm') return 'MTM';
    
    const result = String(typeValue).toUpperCase();
    return result;
  };

  const toBoolean = (val) => {
    if (typeof val === 'boolean') return val;
    if (val && typeof val === 'object' && val.target && typeof val.target.checked === 'boolean') {
      return val.target.checked;
    }
    return !!val;
  };

  const buildLazyLegObject = (lazyLegId, allLegs, processedIds = new Set()) => {
    if (processedIds.has(lazyLegId)) {
      logger.error(`[buildSaveStrategyPayload] Circular reference detected for lazy leg ID: ${lazyLegId}`);
      return null;
    }
    
    const idMatch = String(lazyLegId).match(/lazy_leg_(\d+)/);
    const numericId = idMatch ? parseInt(idMatch[1], 10) : null;
    
    const lazyLeg = allLegs.find(l => l.id === numericId || l.id === lazyLegId);
    
    if (!lazyLeg) {
      logger.error(`[buildSaveStrategyPayload] Lazy leg not found: ${lazyLegId} (numeric: ${numericId})`);
      return null;
    }
    
    processedIds.add(lazyLegId);
    processedIds.add(numericId);
    
    const legName = lazyLeg.customName || (lazyLeg.lazyLegNumber ? `lazy${lazyLeg.lazyLegNumber}` : null);
    
    const lazyLegObject = {
      leg_name: legName,
      lot_size: toNumber(lazyLeg.lots),
      position_type: (lazyLeg.position || 'buy').toUpperCase(),
      option_type: (lazyLeg.option_type || 'call').toLowerCase(),
      expiry_type: lazyLeg.expiry || '0dte',
      strike_criteria: getMappedStrikeCriteria(lazyLeg.strike_criteria || 'based on points'),
      atm_strike: (getMappedStrikeCriteria(lazyLeg.strike_criteria) === 'atm percentage') ? 'ATM' : 0,
      strike_sign: (lazyLeg.strike_criteria === 'based on atm percent' || lazyLeg.strike_criteria === 'based_on_atm_percent')
                  ? (lazyLeg.atm_percent_direction || '')
                  : null,
      premium_value: (lazyLeg.strike_criteria === 'closest premium' || lazyLeg.strike_criteria === 'closest_premium')
                      ? toNumber(lazyLeg.closest_premium_value)
                      : (lazyLeg.strike_criteria === 'premium range' || lazyLeg.strike_criteria === 'premium_range')
                      ? toNumber(lazyLeg.premium_tolerance)
                      : 0,
      lower_range: (lazyLeg.strike_criteria === 'based on premium range' || lazyLeg.strike_criteria === 'based_on_premium_range' || lazyLeg.strike_criteria === 'premium range' || lazyLeg.strike_criteria === 'premium_range')
                    ? toNumber(lazyLeg.lower_range) || 0
                    : 0,
      upper_range: (lazyLeg.strike_criteria === 'based on premium range' || lazyLeg.strike_criteria === 'based_on_premium_range' || lazyLeg.strike_criteria === 'premium range' || lazyLeg.strike_criteria === 'premium_range')
                    ? toNumber(lazyLeg.upper_range) || 0
                    : 0,
      multiplier_percentage: toNumber(lazyLeg.atm_percent_value) || toNumber(lazyLeg.multiplier_percentage) || 0,
      is_target: toBoolean(lazyLeg.target_enabled),
      target_type: formatTypeForBackend(lazyLeg.target_mode || 'points'),
      target_value: toNumber(lazyLeg.target_value),
      is_stoploss: toBoolean(lazyLeg.stop_loss_enabled),
      stoploss_type: formatTypeForBackend(lazyLeg.stop_loss_mode || 'points'),
      stoploss_value: toNumber(lazyLeg.stop_loss_value),
      is_trail_sl: toBoolean(lazyLeg.trail_enabled),
      trail_sl_type: lazyLeg.trail_enabled ? formatTypeForBackend(lazyLeg.trail_mode || 'points') : null,
      instrument_moves: toNumber(lazyLeg.trail_value) || null,
      stoploss_moves: toNumber(lazyLeg.trail_lock_value) || null,
      is_reentry_sl: toBoolean(lazyLeg.reentry_sl_enabled),
      reentry_sl_type: lazyLeg.reentry_sl_enabled 
        ? (lazyLeg.reentry_sl_mode?.startsWith('lazy_leg_') ? 'LAZY_LEG' : (lazyLeg.reentry_sl_mode || 're_asap').toUpperCase())
        : null,
      reentry_sl_value: (() => {
        if (!lazyLeg.reentry_sl_enabled) return 0;
        if (lazyLeg.reentry_sl_mode?.startsWith('lazy_leg_')) {
          const idMatch = String(lazyLeg.reentry_sl_mode).match(/lazy_leg_(\d+)/);
          return idMatch ? parseInt(idMatch[1], 10) : 0;
        }
        return toNumber(lazyLeg.reentry_sl_count) || 0;
      })(),
      is_reentry_target: toBoolean(lazyLeg.reentry_tgt_enabled),
      reentry_target_type: lazyLeg.reentry_tgt_enabled 
        ? (lazyLeg.reentry_tgt_mode?.startsWith('lazy_leg_') ? 'LAZY_LEG' : (lazyLeg.reentry_tgt_mode || 're_asap').toUpperCase())
        : null,
      reentry_target_value: (() => {
        if (!lazyLeg.reentry_tgt_enabled) return 0;
        if (lazyLeg.reentry_tgt_mode?.startsWith('lazy_leg_')) {
          const idMatch = String(lazyLeg.reentry_tgt_mode).match(/lazy_leg_(\d+)/);
          return idMatch ? parseInt(idMatch[1], 10) : 0;
        }
        return toNumber(lazyLeg.reentry_tgt_count) || 0;
      })(),
      is_simple_momentum: toBoolean(lazyLeg.momentum_enabled),
      momentum_type: lazyLeg.momentum_enabled ? (lazyLeg.momentum_mode || lazyLeg.momentum_type || 'percent_down').toUpperCase() : null,
      momentum_value: toNumber(lazyLeg.momentum_value) || null,
    };
    
    if (lazyLeg.reentry_sl_mode?.startsWith('lazy_leg_')) {
      const nestedLazyLeg = buildLazyLegObject(lazyLeg.reentry_sl_mode, allLegs, new Set(processedIds));
      if (nestedLazyLeg) {
        lazyLegObject.lazy_leg = nestedLazyLeg;
      }
    } else if (lazyLeg.reentry_tgt_mode?.startsWith('lazy_leg_')) {
      const nestedLazyLeg = buildLazyLegObject(lazyLeg.reentry_tgt_mode, allLegs, new Set(processedIds));
      if (nestedLazyLeg) {
        lazyLegObject.lazy_leg = nestedLazyLeg;
      }
    }
    
    
    return lazyLegObject;
  };

  const legsArray = (config.legs || [])
    .filter(leg => !leg.isLazyLeg && !leg.isSequentialLeg)
    .map((leg, iterationIndex) => {
    const processedLeg = {
      lot_size: toNumber(leg.lots),
      position_type: (leg.position || 'buy').toUpperCase(),
      option_type: (leg.option_type || 'call').toLowerCase(),
      expiry_type: leg.expiry || '0dte',
    strike_criteria: getMappedStrikeCriteria(leg.strike_criteria),
    atm_strike: (() => {
      const mappedCriteria = getMappedStrikeCriteria(leg.strike_criteria);
      if (mappedCriteria === 'atm percentage') {
        return 'ATM';
      }
      if (leg.strike_criteria === 'based on points' || leg.strike_criteria === 'based_on_points') {
        return formatStrikeForBackend(leg.strike_type);
      }
      return null;
    })(),
    strike_sign: (leg.strike_criteria === 'based on atm percent' || leg.strike_criteria === 'based_on_atm_percent')
                ? (leg.atm_percent_direction || '')
                : getStrikeSign(leg.strike_type),
    premium_value: (leg.strike_criteria === 'closest premium' || leg.strike_criteria === 'closest_premium')
                    ? toNumber(leg.closest_premium_value)
                    : (leg.strike_criteria === 'premium range' || leg.strike_criteria === 'premium_range')
                    ? toNumber(leg.premium_tolerance)
                    : 0,
    lower_range: (leg.strike_criteria === 'based on premium range' || leg.strike_criteria === 'based_on_premium_range' || leg.strike_criteria === 'premium range' || leg.strike_criteria === 'premium_range')
                  ? toNumber(leg.lower_range) || 0
                  : 0,
    upper_range: (leg.strike_criteria === 'based on premium range' || leg.strike_criteria === 'based_on_premium_range' || leg.strike_criteria === 'premium range' || leg.strike_criteria === 'premium_range')
                  ? toNumber(leg.upper_range) || 0
                  : 0,
    multiplier_percentage: toNumber(leg.atm_percent_value) || toNumber(leg.multiplier_percentage) || 0,
    is_target: leg.target_enabled || false,
    target_type: formatTypeForBackend(leg.target_mode || 'points'),
    target_value: toNumber(leg.target_value),
    is_stoploss: leg.stop_loss_enabled || false,
    stoploss_type: formatTypeForBackend(leg.stop_loss_mode || 'points'),
    stoploss_value: toNumber(leg.stop_loss_value),
    is_trail_sl: leg.trail_enabled || false,
    trail_sl_type: formatTypeForBackend(leg.trail_mode || 'points'),
    instrument_moves: toNumber(leg.trail_value) || 0,
    stoploss_moves: toNumber(leg.trail_lock_value) || 0,
    is_reentry_sl: leg.reentry_sl_enabled || false,
    reentry_sl_type: leg.reentry_sl_mode?.startsWith('lazy_leg_') 
      ? 'LAZY_LEG' 
      : (leg.reentry_sl_mode || 're_asap').toUpperCase(),
    reentry_sl_value: (() => {
      if (!leg.reentry_sl_enabled) return 0;
      if (leg.reentry_sl_mode?.startsWith('lazy_leg_')) {
        const idMatch = String(leg.reentry_sl_mode).match(/lazy_leg_(\d+)/);
        return idMatch ? parseInt(idMatch[1], 10) : 0;
      }
      return toNumber(leg.reentry_sl_count) || 0;
    })(),
    is_reentry_target: leg.reentry_tgt_enabled || false,
    reentry_target_type: leg.reentry_tgt_mode?.startsWith('lazy_leg_') 
      ? 'LAZY_LEG' 
      : (leg.reentry_tgt_mode || 're_asap').toUpperCase(),
    reentry_target_value: (() => {
      if (!leg.reentry_tgt_enabled) return 0;
      if (leg.reentry_tgt_mode?.startsWith('lazy_leg_')) {
        const idMatch = String(leg.reentry_tgt_mode).match(/lazy_leg_(\d+)/);
        return idMatch ? parseInt(idMatch[1], 10) : 0;
      }
      return toNumber(leg.reentry_tgt_count) || 0;
    })(),
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
    range_on: leg.range_enabled 
      ? (leg.range_direction || 'high').charAt(0).toUpperCase() + (leg.range_direction || 'high').slice(1).toLowerCase()
      : null,
  };
  
  
  if (leg.reentry_sl_mode?.startsWith('lazy_leg_')) {
    const lazyLegObject = buildLazyLegObject(leg.reentry_sl_mode, config.legs || []);
    if (lazyLegObject) {
      processedLeg.lazy_leg = lazyLegObject;
      processedLeg.reentry_sl_type = 'LAZY_LEG';
      processedLeg.reentry_sl_value = 1;
    }
  } else if (leg.reentry_tgt_mode?.startsWith('lazy_leg_')) {
    const lazyLegObject = buildLazyLegObject(leg.reentry_tgt_mode, config.legs || []);
    if (lazyLegObject) {
      processedLeg.lazy_leg = lazyLegObject;
      processedLeg.reentry_target_type = 'LAZY_LEG';
      processedLeg.reentry_target_value = 1;
    }
  }
  
  
  if (config.strategy_type === 'sequential') {
    const allLegs = config.legs || [];
    const sequentialLeg = allLegs.find(l => l.isSequentialLeg && l.parentLegIndex === iterationIndex);
    
    if (sequentialLeg) {
      const legName = sequentialLeg.customName || `SEQ#${sequentialLeg.sequentialLegNumber}`;
      
      
      const sequentialLegObject = {
        leg_name: legName,
        lot_size: toNumber(sequentialLeg.lots),
        position_type: (sequentialLeg.position || 'buy').toUpperCase(),
        option_type: (sequentialLeg.option_type || 'call').toLowerCase(),
        expiry_type: sequentialLeg.expiry || '0dte',
        strike_criteria: getMappedStrikeCriteria(sequentialLeg.strike_criteria || 'based on points'),
        atm_strike: (getMappedStrikeCriteria(sequentialLeg.strike_criteria) === 'atm percentage') ? 'ATM' : 0,
        strike_sign: (sequentialLeg.strike_criteria === 'based on atm percent' || sequentialLeg.strike_criteria === 'based_on_atm_percent')
                    ? (sequentialLeg.atm_percent_direction || '')
                    : null,
        premium_value: 0,
        lower_range: toNumber(sequentialLeg.lower_range),
        upper_range: toNumber(sequentialLeg.upper_range),
        multiplier_percentage: (() => {
          const inputVal = sequentialLeg.atm_percent_value;
          const result = toNumber(inputVal);
          return result;
        })(),
        is_target: toBoolean(sequentialLeg.target_enabled),
        target_type: formatTypeForBackend(sequentialLeg.target_mode || 'points'),
        target_value: toNumber(sequentialLeg.target_value),
        is_stoploss: toBoolean(sequentialLeg.stop_loss_enabled),
        stoploss_type: formatTypeForBackend(sequentialLeg.stop_loss_mode || 'points'),
        stoploss_value: toNumber(sequentialLeg.stop_loss_value),
        is_trail_sl: toBoolean(sequentialLeg.trail_enabled),
        trail_sl_type: sequentialLeg.trail_enabled ? formatTypeForBackend(sequentialLeg.trail_mode || 'points') : null,
        instrument_moves: toNumber(sequentialLeg.trail_value),
        stoploss_moves: toNumber(sequentialLeg.trail_lock_value),
        is_reentry_sl: toBoolean(sequentialLeg.reentry_sl_enabled),
        reentry_sl_type: sequentialLeg.reentry_sl_enabled ? (sequentialLeg.reentry_sl_mode || 're_asap').toUpperCase() : null,
        reentry_sl_value: sequentialLeg.reentry_sl_enabled ? toNumber(sequentialLeg.reentry_sl_count) : 0,
        is_reentry_target: toBoolean(sequentialLeg.reentry_tgt_enabled),
        reentry_target_type: sequentialLeg.reentry_tgt_enabled ? (sequentialLeg.reentry_tgt_mode || 're_asap').toUpperCase() : null,
        reentry_target_value: sequentialLeg.reentry_tgt_enabled ? toNumber(sequentialLeg.reentry_tgt_count) : 0,
        is_simple_momentum: toBoolean(sequentialLeg.momentum_enabled),
        momentum_type: sequentialLeg.momentum_enabled ? (sequentialLeg.momentum_mode || 'percent_down').toUpperCase() : null,
        momentum_value: toNumber(sequentialLeg.momentum_value),
        is_range_breakout: toBoolean(sequentialLeg.range_enabled),
        range_breakout_type: sequentialLeg.range_enabled ? (sequentialLeg.range_instrument === 'instrument' ? 'Instrument' : 'Underlying') : null,
        range_end_time: sequentialLeg.range_enabled ? formatTime(sequentialLeg.range_time) : null,
        range_on: sequentialLeg.range_enabled ? (sequentialLeg.range_direction || 'high').charAt(0).toUpperCase() + (sequentialLeg.range_direction || 'high').slice(1).toLowerCase() : null,
      };
      
      processedLeg.sequential_leg = sequentialLegObject;
      
    }
  }
  return processedLeg;
});

  const strategyObject = {
    action: 'save',
    strategy_name: config.strategy_name || `strategy_${Date.now()}`,
    symbol: config.symbol,
    start_date: config.start_date,
    end_date: config.end_date,
    dte_filter: (() => {
      const strategyType = (config.strategy_type || '').toLowerCase();
      const dteValue = config.dte_filter;
      
      if (strategyType === 'btst' && (dteValue === 'combined' || dteValue === 'combine_dte')) {
        return 1;
      }
      
      return dteValue;
    })(),
    underlying_type: config.underlying_type || 'option',
    is_squareoff: config.square_off === 'complete',
    is_trail_sl_break_even: config.trail_to_be || false,
    trail_sl_break_even_type: 'POINTS',
    strategy_type: (config.strategy_type || 'intraday').toUpperCase(),
    entry_time: formatTime(config.entry_time),
    entry_delay: 0,
    exit_time: formatTime(config.exit_time),
    exit_delay: 0,
    is_strategy_sl: config.overall_stop_loss_enabled || false,
    strategy_sl_type: formatTypeForBackend(config.overall_stop_loss_mode || 'mtm'),
    strategy_sl_value: toNumber(config.overall_stop_loss_value),
    is_strategy_target: config.overall_target_enabled || false,
    strategy_target_type: formatTypeForBackend(config.overall_target_mode || 'mtm'),
    strategy_target_value: toNumber(config.overall_target_value),
    is_overall_reentry_sl: config.overall_reentry_sl_enabled || false,
    overall_reentry_sl_type: (config.overall_reentry_sl_mode || 're_asap').toUpperCase(),
    overall_reentry_sl_value: toNumber(config.overall_reentry_sl_count),
    is_overall_reentry_target: config.overall_reentry_tgt_enabled || false,
    overall_reentry_target_type: (config.overall_reentry_tgt_mode || 're_asap').toUpperCase(),
    overall_reentry_target_value: toNumber(config.overall_reentry_tgt_count),
    is_overall_trail_sl: config.lock_profit_enabled || false,
    overall_trail_sl_type: formatTypeForBackend(config.lock_profit_mode || 'points'),
    overall_instrument_move: toNumber(config.lock_profit_value1),
    overall_stoploss_move: toNumber(config.lock_profit_value2),
    leg_count: legsArray.length,
  };



  const allLazyLegs = (config.legs || []).filter(leg => leg.isLazyLeg);
  const assignedLazyLegIds = new Set();
  
  (config.legs || [])
    .filter(leg => !leg.isLazyLeg) // Only check main legs
    .forEach(mainLeg => {
      if (mainLeg.reentry_sl_mode?.startsWith('lazy_leg_')) {
        const idMatch = String(mainLeg.reentry_sl_mode).match(/lazy_leg_(\d+)/);
        if (idMatch) {
          assignedLazyLegIds.add(parseInt(idMatch[1], 10));
        }
      }
      
      if (mainLeg.reentry_tgt_mode?.startsWith('lazy_leg_')) {
        const idMatch = String(mainLeg.reentry_tgt_mode).match(/lazy_leg_(\d+)/);
        if (idMatch) {
          assignedLazyLegIds.add(parseInt(idMatch[1], 10));
        }
      }
    });

  const nestedLazyLegIds = new Set();
  
  const unselectedLegs = allLazyLegs
    .filter(lazyLeg => !assignedLazyLegIds.has(lazyLeg.id))
    .map(lazyLeg => {
      const legName = lazyLeg.customName || (lazyLeg.lazyLegNumber ? `lazy${lazyLeg.lazyLegNumber}` : null);
      
      const unselectedLegObject = {
        leg_name: legName,
        lot_size: toNumber(lazyLeg.lots),
        position_type: (lazyLeg.position || 'buy').toUpperCase(),
        option_type: (lazyLeg.option_type || 'call').toLowerCase(),
        expiry_type: lazyLeg.expiry || '0dte',
        strike_criteria: lazyLeg.strike_criteria || 'based on points',
        atm_strike: 0,  // Always 0 for lazy legs as per expected format
        strike_sign: (lazyLeg.strike_criteria === 'based on atm percent' || lazyLeg.strike_criteria === 'based_on_atm_percent')
                    ? (lazyLeg.atm_percent_direction || '')
                    : null,
        premium_value: (lazyLeg.strike_criteria === 'closest premium' || lazyLeg.strike_criteria === 'closest_premium')
                        ? toNumber(lazyLeg.closest_premium_value)
                        : (lazyLeg.strike_criteria === 'premium range' || lazyLeg.strike_criteria === 'premium_range')
                        ? toNumber(lazyLeg.premium_tolerance)
                        : 0,
        lower_range: (lazyLeg.strike_criteria === 'based on premium range' || lazyLeg.strike_criteria === 'based_on_premium_range' || lazyLeg.strike_criteria === 'premium range' || lazyLeg.strike_criteria === 'premium_range')
                      ? toNumber(lazyLeg.lower_range) || 0
                      : 0,
        upper_range: (lazyLeg.strike_criteria === 'based on premium range' || lazyLeg.strike_criteria === 'based_on_premium_range' || lazyLeg.strike_criteria === 'premium range' || lazyLeg.strike_criteria === 'premium_range')
                      ? toNumber(lazyLeg.upper_range) || 0
                      : 0,
        multiplier_percentage: toNumber(lazyLeg.atm_percent_value) || toNumber(lazyLeg.multiplier_percentage) || 0,
        is_target: toBoolean(lazyLeg.target_enabled),
        target_type: formatTypeForBackend(lazyLeg.target_mode || 'points'),
        target_value: toNumber(lazyLeg.target_value),
        is_stoploss: toBoolean(lazyLeg.stop_loss_enabled),
        stoploss_type: formatTypeForBackend(lazyLeg.stop_loss_mode || 'points'),
        stoploss_value: toNumber(lazyLeg.stop_loss_value),
        is_trail_sl: toBoolean(lazyLeg.trail_enabled),
        trail_sl_type: lazyLeg.trail_enabled ? formatTypeForBackend(lazyLeg.trail_mode || 'points') : null,
        instrument_moves: toNumber(lazyLeg.trail_value) || null,
        stoploss_moves: toNumber(lazyLeg.trail_lock_value) || null,
        is_reentry_sl: toBoolean(lazyLeg.reentry_sl_enabled),
        reentry_sl_type: lazyLeg.reentry_sl_enabled 
          ? (lazyLeg.reentry_sl_mode?.startsWith('lazy_leg_') 
             ? 'LAZY_LEG' 
             : (lazyLeg.reentry_sl_mode || 're_asap').toUpperCase())
          : null,
        reentry_sl_value: toNumber(lazyLeg.reentry_sl_count) || 0,
        is_reentry_target: toBoolean(lazyLeg.reentry_tgt_enabled),
        reentry_target_type: lazyLeg.reentry_tgt_enabled 
          ? (lazyLeg.reentry_tgt_mode?.startsWith('lazy_leg_') 
             ? 'LAZY_LEG' 
             : (lazyLeg.reentry_tgt_mode || 're_asap').toUpperCase())
          : null,
        reentry_target_value: toNumber(lazyLeg.reentry_tgt_count) || 0,
        is_simple_momentum: toBoolean(lazyLeg.momentum_enabled),
        momentum_type: lazyLeg.momentum_enabled ? (lazyLeg.momentum_mode || lazyLeg.momentum_type || 'percent_down').toUpperCase() : null,
        momentum_value: toNumber(lazyLeg.momentum_value) || null
      };
      
      if (lazyLeg.reentry_sl_mode?.startsWith('lazy_leg_')) {
        const nestedLazyLeg = buildLazyLegObject(lazyLeg.reentry_sl_mode, config.legs || []);
        if (nestedLazyLeg) {
          unselectedLegObject.lazy_leg = nestedLazyLeg;
          unselectedLegObject.reentry_sl_type = 'LAZY_LEG';
          unselectedLegObject.reentry_sl_value = 1;
          
          const idMatch = String(lazyLeg.reentry_sl_mode).match(/lazy_leg_(\d+)/);
          if (idMatch) {
            nestedLazyLegIds.add(parseInt(idMatch[1], 10));
          }
        }
      } else if (lazyLeg.reentry_tgt_mode?.startsWith('lazy_leg_')) {
        const nestedLazyLeg = buildLazyLegObject(lazyLeg.reentry_tgt_mode, config.legs || []);
        if (nestedLazyLeg) {
          unselectedLegObject.lazy_leg = nestedLazyLeg;
          unselectedLegObject.reentry_target_type = 'LAZY_LEG';
          unselectedLegObject.reentry_target_value = 1;
          
          const idMatch = String(lazyLeg.reentry_tgt_mode).match(/lazy_leg_(\d+)/);
          if (idMatch) {
            nestedLazyLegIds.add(parseInt(idMatch[1], 10));
          }
        }
      }
      
      return unselectedLegObject;
    })
    .filter(leg => {
      const originalLazyLeg = allLazyLegs.find(l => 
        (l.customName || (l.lazyLegNumber ? `lazy${l.lazyLegNumber}` : null)) === leg.leg_name
      );
      
      if (originalLazyLeg && nestedLazyLegIds.has(originalLazyLeg.id)) {
        return false;
      }
      
      return true;
    });



  return {
    strategy: strategyObject,
    legs: legsArray,
    unselected_legs: unselectedLegs
  };
};

/**
 * Extract leg ID mapping from backend response (FLAT array structure)
 * Backend returns legs as flat array with is_lazy_leg flag, not nested structure
 * 
 * @param {Object} response - Backend response from save-strategy or get-strategy API
 * @returns {Object} - Mapping of lazy_leg_name to backend leg_id
 * 
 * Example input:
 * {
 *   "legs": [
 *     { "leg_id": 285, "is_lazy_leg": false, "leg_name": "" },
 *     { "leg_id": 286, "is_lazy_leg": true, "leg_name": "lazy1" }
 *   ]
 * }
 * 
 * Example output:
 * { "lazy1": 286 }
 */
export const extractLegIdMapping = (response) => {
  const mapping = {};
  
  try {
    
    const legs = response.data?.legs || response.legs || [];
    
    
    if (legs.length === 0) {
      return mapping;
    }
    
    legs.forEach((leg, index) => {
      
      if (leg.is_lazy_leg === true) {
        const lazyLegName = leg.leg_name || leg.custom_name || leg.customName || leg.name;
        const legId = leg.leg_id || leg.legId || leg.id;
        
        if (lazyLegName && legId) {
          mapping[lazyLegName] = legId;
        } else if (!lazyLegName) {
        } else if (!legId) {
        }
      } else {
      }
    });
    
    
  } catch (error) {
    logger.error('[extractLegIdMapping] ❌ Error extracting leg IDs:', error);
    logger.error('[extractLegIdMapping] Error stack:', error.stack);
  }
  
  return mapping;
};

