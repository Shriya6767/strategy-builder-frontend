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
    console.log('[API] 📊 Compare backtest data structure:', {
      success: data.success,
      dataType: typeof data.data,
      isArray: Array.isArray(data.data),
      dataLength: data.data?.length,
      firstItem: data.data?.[0]
    });
    
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

// ⭐ NEW: Helper to map strike_criteria from UI to backend format
const getMappedStrikeCriteria = (strikeCriteria) => {
  if (!strikeCriteria) return 'strike_type';
  
  const lc = String(strikeCriteria).toLowerCase();
  
  // Map "based on atm percent" → "atm percentage"
  if (lc === 'based on atm percent' || lc === 'based_on_atm_percent') {
    return 'atm percentage';
  }
  
  // Return as-is for other values
  return strikeCriteria;
};

export const buildSaveStrategyPayload = (config, version = null) => {
  const toNumber = (val) =>
    val === '' || val === null || val === undefined ? 0 : Number(val);
  
  // ⭐ NEW: Helper for decimal fields where we want to preserve actual values (including 0)
  // Only converts to 0 if truly empty/null/undefined
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

  // ✅ NEW: Map UI type values to backend format
  // Backend expects: POINTS, PERCENT, UNDERLYING_POINTS, UNDERLYING_PERCENT, MTM
  // UI sends: points, percentage, underlying_points, underlying_percentage, mtm
  const formatTypeForBackend = (typeValue) => {
    if (!typeValue) return 'POINTS';
    const lc = String(typeValue).toLowerCase();
    
    // Map percentage → PERCENT (remove "AGE")
    if (lc === 'percentage') return 'PERCENT';
    if (lc === 'underlying_percentage') return 'UNDERLYING_PERCENT';
    
    // Map others to uppercase with underscores
    if (lc === 'points') return 'POINTS';
    if (lc === 'underlying_points') return 'UNDERLYING_POINTS';
    if (lc === 'mtm') return 'MTM';
    
    // Fallback: convert to uppercase
    const result = String(typeValue).toUpperCase();
    console.log(`[formatTypeForBackend] Unmapped type value: "${typeValue}" → "${result}"`);
    return result;
  };

  // Helper to safely extract boolean from value (handles event objects)
  const toBoolean = (val) => {
    if (typeof val === 'boolean') return val;
    if (val && typeof val === 'object' && val.target && typeof val.target.checked === 'boolean') {
      return val.target.checked;
    }
    return !!val;
  };

  // Helper function to recursively build lazy leg structure
  const buildLazyLegObject = (lazyLegId, allLegs, processedIds = new Set()) => {
    // Prevent infinite recursion if a lazy leg references itself
    if (processedIds.has(lazyLegId)) {
      console.warn(`[buildSaveStrategyPayload] Circular reference detected for lazy leg ID: ${lazyLegId}`);
      return null;
    }
    
    // Extract just the ID number from lazyLegId (e.g., "lazy_leg_1786527130357" → 1786527130357)
    const idMatch = String(lazyLegId).match(/lazy_leg_(\d+)/);
    const numericId = idMatch ? parseInt(idMatch[1], 10) : null;
    
    // Find the lazy leg in config.legs by ID
    const lazyLeg = allLegs.find(l => l.id === numericId || l.id === lazyLegId);
    
    if (!lazyLeg) {
      console.warn(`[buildSaveStrategyPayload] Lazy leg not found: ${lazyLegId} (numeric: ${numericId})`);
      return null;
    }
    
    // Mark this ID as processed to prevent circular references
    processedIds.add(lazyLegId);
    processedIds.add(numericId);
    
    // Build the lazy leg object with same structure as main leg
    const legName = lazyLeg.customName || (lazyLeg.lazyLegNumber ? `lazy${lazyLeg.lazyLegNumber}` : null);
    console.log(`[buildLazyLegObject] Processing lazy leg ID ${lazyLegId}:`, {
      customName: lazyLeg.customName,
      lazyLegNumber: lazyLeg.lazyLegNumber,
      calculatedLegName: legName,
      strike_criteria: lazyLeg.strike_criteria,
      atm_percent_value: lazyLeg.atm_percent_value,
      multiplier_percentage: lazyLeg.multiplier_percentage,
      stop_loss_enabled: lazyLeg.stop_loss_enabled,
      stop_loss_value: lazyLeg.stop_loss_value,
      target_enabled: lazyLeg.target_enabled,
      trail_enabled: lazyLeg.trail_enabled
    });
    
    const lazyLegObject = {
      leg_name: legName, // ⭐ MUST be first field - shows which lazy leg was selected
      lot_size: toNumber(lazyLeg.lots),
      position_type: (lazyLeg.position || 'buy').toUpperCase(),
      option_type: (lazyLeg.option_type || 'call').toLowerCase(),
      expiry_type: lazyLeg.expiry || '0dte',
      strike_criteria: getMappedStrikeCriteria(lazyLeg.strike_criteria || 'based on points'),
      // ✅ FIX: For "atm percentage" strike criteria, send "ATM" instead of 0
      atm_strike: (getMappedStrikeCriteria(lazyLeg.strike_criteria) === 'atm percentage') ? 'ATM' : 0,
      // ✅ FIX: For lazy legs with "based on atm percent", use atm_percent_direction (+/-)
      strike_sign: (lazyLeg.strike_criteria === 'based on atm percent' || lazyLeg.strike_criteria === 'based_on_atm_percent')
                  ? (lazyLeg.atm_percent_direction || '')
                  : null,
      premium_value: (lazyLeg.strike_criteria === 'closest premium' || lazyLeg.strike_criteria === 'closest_premium')
                      ? toNumber(lazyLeg.strike_value)
                      : (lazyLeg.strike_criteria === 'premium range' || lazyLeg.strike_criteria === 'premium_range')
                      ? toNumber(lazyLeg.premium_tolerance)
                      : 0,
      lower_range: toNumber(lazyLeg.lower_range) || 0,
      upper_range: toNumber(lazyLeg.upper_range) || 0,
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
      // ⭐ FIX: Extract numeric ID from lazy_leg_{id} format
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
      // ⭐ FIX: Extract numeric ID from lazy_leg_{id} format
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
    
    // Check if this lazy leg has nested lazy legs (recursion)
    // Check both reentry_sl_mode and reentry_tgt_mode
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
    
    console.log(`[buildLazyLegObject] ✅ Final lazy leg object for ${lazyLegId}:`, JSON.stringify(lazyLegObject, null, 2));
    console.log(`[buildLazyLegObject] ✅ leg_name:`, lazyLegObject.leg_name);
    console.log(`[buildLazyLegObject] ✅ strike_sign:`, lazyLegObject.strike_sign);
    console.log(`[buildLazyLegObject] ✅ atm_percent_direction from source:`, lazyLeg.atm_percent_direction);
    console.log(`[buildLazyLegObject] ✅ multiplier_percentage:`, lazyLegObject.multiplier_percentage);
    
    return lazyLegObject;
  };

  const legsArray = (config.legs || [])
    .filter(leg => !leg.isLazyLeg && !leg.isSequentialLeg)  // ⭐ Filter out both lazy legs AND sequential legs
    .map((leg, iterationIndex) => {  // ⭐ Add iterationIndex parameter
    const processedLeg = {
      lot_size: toNumber(leg.lots),
      position_type: (leg.position || 'buy').toUpperCase(),
      option_type: (leg.option_type || 'call').toLowerCase(),  // ✅ MUST be lowercase for backend
      expiry_type: leg.expiry || '0dte',  // ✅ FIXED: Use leg.expiry directly (already '0dte' or '1dte')
    strike_criteria: getMappedStrikeCriteria(leg.strike_criteria),
    // ✅ FIX: For "atm percentage", always send "ATM"
    // For "based on points", format the strike type (ITM-1, OTM+2, etc.)
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
    // ✅ FIX: For "based on atm percent", use atm_percent_direction (+/-) instead of strike_type
    strike_sign: (leg.strike_criteria === 'based on atm percent' || leg.strike_criteria === 'based_on_atm_percent')
                ? (leg.atm_percent_direction || '')
                : getStrikeSign(leg.strike_type),
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
    target_type: formatTypeForBackend(leg.target_mode || 'points'),
    target_value: toNumber(leg.target_value),
    is_stoploss: leg.stop_loss_enabled || false,
    stoploss_type: formatTypeForBackend(leg.stop_loss_mode || 'points'),
    stoploss_value: toNumber(leg.stop_loss_value),
    is_trail_sl: leg.trail_enabled || false,
    trail_sl_type: formatTypeForBackend(leg.trail_mode || 'points'),
    instrument_moves: toNumber(leg.trail_value) || 0,          // ✅ First value (e.g., 10)
    stoploss_moves: toNumber(leg.trail_lock_value) || 0,       // ✅ FIXED: Second value (e.g., 5)
    is_reentry_sl: leg.reentry_sl_enabled || false,
    // ✅ FIX: If reentry_sl_mode is a lazy leg ID, set to 'LAZY_LEG', not the ID itself
    reentry_sl_type: leg.reentry_sl_mode?.startsWith('lazy_leg_') 
      ? 'LAZY_LEG' 
      : (leg.reentry_sl_mode || 're_asap').toUpperCase(),
    // ⭐ FIX: Extract numeric ID from lazy_leg_{id} format
    reentry_sl_value: (() => {
      if (!leg.reentry_sl_enabled) return 0;
      if (leg.reentry_sl_mode?.startsWith('lazy_leg_')) {
        const idMatch = String(leg.reentry_sl_mode).match(/lazy_leg_(\d+)/);
        return idMatch ? parseInt(idMatch[1], 10) : 0;
      }
      return toNumber(leg.reentry_sl_count) || 0;
    })(),
    is_reentry_target: leg.reentry_tgt_enabled || false,
    // ✅ FIX: If reentry_tgt_mode is a lazy leg ID, set to 'LAZY_LEG', not the ID itself
    reentry_target_type: leg.reentry_tgt_mode?.startsWith('lazy_leg_') 
      ? 'LAZY_LEG' 
      : (leg.reentry_tgt_mode || 're_asap').toUpperCase(),
    // ⭐ FIX: Extract numeric ID from lazy_leg_{id} format
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
    // ✅ FIX: Use actual range_direction value (High/Low), not hardcoded
    range_on: leg.range_enabled 
      ? (leg.range_direction || 'high').charAt(0).toUpperCase() + (leg.range_direction || 'high').slice(1).toLowerCase()
      : null,
  };
  
  // 🔍 DEBUG: Log the option_type and strike_sign being sent
  console.log(`[buildSaveStrategyPayload] Leg ${config.legs.indexOf(leg) + 1}:`, {
    position_type: processedLeg.position_type,
    option_type: processedLeg.option_type,
    raw_option_type: leg.option_type,
    strike_criteria: processedLeg.strike_criteria,
    strike_sign: processedLeg.strike_sign,
    atm_percent_direction: leg.atm_percent_direction,
    multiplier_percentage: processedLeg.multiplier_percentage
  });
  
  // ⭐ NEW: Handle lazy leg nesting
  // If reentry_sl_mode or reentry_tgt_mode references a lazy leg, build nested lazy_leg object
  if (leg.reentry_sl_mode?.startsWith('lazy_leg_')) {
    const lazyLegObject = buildLazyLegObject(leg.reentry_sl_mode, config.legs || []);
    if (lazyLegObject) {
      processedLeg.lazy_leg = lazyLegObject;
      // Change reentry_sl_type to LAZY_LEG and set value to 1 (indicating it has nested lazy_leg)
      processedLeg.reentry_sl_type = 'LAZY_LEG';
      processedLeg.reentry_sl_value = 1;
    }
  } else if (leg.reentry_tgt_mode?.startsWith('lazy_leg_')) {
    const lazyLegObject = buildLazyLegObject(leg.reentry_tgt_mode, config.legs || []);
    if (lazyLegObject) {
      processedLeg.lazy_leg = lazyLegObject;
      // Change reentry_target_type to LAZY_LEG and set value to 1 (indicating it has nested lazy_leg)
      processedLeg.reentry_target_type = 'LAZY_LEG';
      processedLeg.reentry_target_value = 1;
    }
  }
  
  
  // ⭐ NEW: Handle sequential legs - nest them under "sequential_leg" key
  if (config.strategy_type === 'sequential') {
    // Find the sequential leg that belongs to this main leg using iterationIndex
    // iterationIndex represents the position among ONLY main legs (0, 1, 2...)
    const allLegs = config.legs || [];
    const sequentialLeg = allLegs.find(l => l.isSequentialLeg && l.parentLegIndex === iterationIndex);
    
    if (sequentialLeg) {
      // Calculate leg name first
      const legName = sequentialLeg.customName || `SEQ#${sequentialLeg.sequentialLegNumber}`;
      
      console.log(`[SAVE] Found sequential leg "${legName}" for main leg at iteration index ${iterationIndex}`);
      
      // Build sequential leg object with the same structure as main leg
      const sequentialLegObject = {
        leg_name: legName,
        lot_size: toNumber(sequentialLeg.lots),
        position_type: (sequentialLeg.position || 'buy').toUpperCase(),
        option_type: (sequentialLeg.option_type || 'call').toLowerCase(),
        expiry_type: sequentialLeg.expiry || '0dte',
        strike_criteria: getMappedStrikeCriteria(sequentialLeg.strike_criteria || 'based on points'),
        // ✅ FIX: For "atm percentage", always send "ATM"
        atm_strike: (getMappedStrikeCriteria(sequentialLeg.strike_criteria) === 'atm percentage') ? 'ATM' : 0,
        // ✅ FIX: For sequential legs with "based on atm percent", use atm_percent_direction (+/-)
        strike_sign: (sequentialLeg.strike_criteria === 'based on atm percent' || sequentialLeg.strike_criteria === 'based_on_atm_percent')
                    ? (sequentialLeg.atm_percent_direction || '')
                    : null,
        premium_value: 0,
        lower_range: toNumber(sequentialLeg.lower_range),
        upper_range: toNumber(sequentialLeg.upper_range),
        multiplier_percentage: (() => {
          const inputVal = sequentialLeg.atm_percent_value;
          const result = toNumber(inputVal);
          console.log(`[SAVE] Sequential leg "${legName}" atm_percent_value: "${inputVal}" → ${result}`);
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
      
      console.log(`[buildSaveStrategyPayload] Added sequential leg "${sequentialLegObject.leg_name}" to main leg`);
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
    // ⭐ FIX: Convert 'combined' to 1 for BTST, otherwise send as-is
    dte_filter: (() => {
      const strategyType = (config.strategy_type || '').toLowerCase();
      const dteValue = config.dte_filter;
      
      // BTST + 'combined' → send as 1
      if (strategyType === 'btst' && (dteValue === 'combined' || dteValue === 'combine_dte')) {
        return 1;
      }
      
      // Otherwise send the value as-is (could be "0", "1", 0, 1, etc.)
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
    // ✅ FIX: Use overall_stop_loss_enabled (not is_strategy_sl)
    is_strategy_sl: config.overall_stop_loss_enabled || false,
    strategy_sl_type: formatTypeForBackend(config.overall_stop_loss_mode || 'mtm'),
    strategy_sl_value: toNumber(config.overall_stop_loss_value),
    // ✅ FIX: Use overall_target_enabled (not is_strategy_target)
    is_strategy_target: config.overall_target_enabled || false,
    strategy_target_type: formatTypeForBackend(config.overall_target_mode || 'mtm'),
    strategy_target_value: toNumber(config.overall_target_value),
    is_overall_reentry_sl: config.overall_reentry_sl_enabled || false,
    overall_reentry_sl_type: (config.overall_reentry_sl_mode || 're_asap').toUpperCase(),
    overall_reentry_sl_value: toNumber(config.overall_reentry_sl_count),
    is_overall_reentry_target: config.overall_reentry_tgt_enabled || false,
    overall_reentry_target_type: (config.overall_reentry_tgt_mode || 're_asap').toUpperCase(),
    overall_reentry_target_value: toNumber(config.overall_reentry_tgt_count),
    // ✅ FIX: Map lock_profit_* UI fields to backend field names
    is_overall_trail_sl: config.lock_profit_enabled || false,
    overall_trail_sl_type: formatTypeForBackend(config.lock_profit_mode || 'points'),
    overall_instrument_move: toNumber(config.lock_profit_value1),
    overall_stoploss_move: toNumber(config.lock_profit_value2),
    leg_count: legsArray.length,
  };

  // ⭐ NOTE: version will be added in App.jsx based on React Context
  // Do NOT add version here - it's conditionally added by the caller

  console.log('[buildSaveStrategyPayload] 🚀 Complete payload being returned:');
  console.log('[buildSaveStrategyPayload] Strategy name:', strategyObject.strategy_name);
  console.log('[buildSaveStrategyPayload] Legs array:', JSON.stringify(legsArray, null, 2));

  // ⭐ NEW: Build unselected_legs array according to README format
  // Find all lazy legs that are NOT assigned to any main leg
  const allLazyLegs = (config.legs || []).filter(leg => leg.isLazyLeg);
  const assignedLazyLegIds = new Set();
  
  // Collect all lazy leg IDs that are assigned to main legs
  (config.legs || [])
    .filter(leg => !leg.isLazyLeg) // Only check main legs
    .forEach(mainLeg => {
      // Check if reentry_sl_mode references a lazy leg
      if (mainLeg.reentry_sl_mode?.startsWith('lazy_leg_')) {
        const idMatch = String(mainLeg.reentry_sl_mode).match(/lazy_leg_(\d+)/);
        if (idMatch) {
          assignedLazyLegIds.add(parseInt(idMatch[1], 10));
        }
      }
      
      // Check if reentry_tgt_mode references a lazy leg  
      if (mainLeg.reentry_tgt_mode?.startsWith('lazy_leg_')) {
        const idMatch = String(mainLeg.reentry_tgt_mode).match(/lazy_leg_(\d+)/);
        if (idMatch) {
          assignedLazyLegIds.add(parseInt(idMatch[1], 10));
        }
      }
    });

  // Build unselected_legs array for lazy legs that are NOT assigned
  // ⭐ CRITICAL: Also track which lazy legs are NESTED inside unselected lazy legs
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
        // ✅ FIX: For unselected lazy legs with "based on atm percent", use atm_percent_direction (+/-)
        strike_sign: (lazyLeg.strike_criteria === 'based on atm percent' || lazyLeg.strike_criteria === 'based_on_atm_percent')
                    ? (lazyLeg.atm_percent_direction || '')
                    : null,
        premium_value: (lazyLeg.strike_criteria === 'closest premium' || lazyLeg.strike_criteria === 'closest_premium')
                        ? toNumber(lazyLeg.strike_value)
                        : (lazyLeg.strike_criteria === 'premium range' || lazyLeg.strike_criteria === 'premium_range')
                        ? toNumber(lazyLeg.premium_tolerance)
                        : 0,
        lower_range: toNumber(lazyLeg.lower_range) || 0,
        upper_range: toNumber(lazyLeg.upper_range) || 0,
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
        // ⭐ FIX: If reentry_sl_mode references a lazy leg, set to 'LAZY_LEG', not the ID
        reentry_sl_type: lazyLeg.reentry_sl_enabled 
          ? (lazyLeg.reentry_sl_mode?.startsWith('lazy_leg_') 
             ? 'LAZY_LEG' 
             : (lazyLeg.reentry_sl_mode || 're_asap').toUpperCase())
          : null,
        reentry_sl_value: toNumber(lazyLeg.reentry_sl_count) || 0,
        is_reentry_target: toBoolean(lazyLeg.reentry_tgt_enabled),
        // ⭐ FIX: If reentry_tgt_mode references a lazy leg, set to 'LAZY_LEG', not the ID
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
      
      // ⭐ NEW: Handle nested lazy legs inside unselected lazy legs (same as main legs)
      if (lazyLeg.reentry_sl_mode?.startsWith('lazy_leg_')) {
        const nestedLazyLeg = buildLazyLegObject(lazyLeg.reentry_sl_mode, config.legs || []);
        if (nestedLazyLeg) {
          unselectedLegObject.lazy_leg = nestedLazyLeg;
          unselectedLegObject.reentry_sl_type = 'LAZY_LEG';
          unselectedLegObject.reentry_sl_value = 1;
          
          // Track this nested lazy leg ID so we can filter it out from unselected_legs array
          const idMatch = String(lazyLeg.reentry_sl_mode).match(/lazy_leg_(\d+)/);
          if (idMatch) {
            nestedLazyLegIds.add(parseInt(idMatch[1], 10));
            console.log(`[buildSaveStrategyPayload] 📎 Nested lazy leg ${idMatch[1]} inside unselected lazy leg "${legName}"`);
          }
        }
      } else if (lazyLeg.reentry_tgt_mode?.startsWith('lazy_leg_')) {
        const nestedLazyLeg = buildLazyLegObject(lazyLeg.reentry_tgt_mode, config.legs || []);
        if (nestedLazyLeg) {
          unselectedLegObject.lazy_leg = nestedLazyLeg;
          unselectedLegObject.reentry_target_type = 'LAZY_LEG';
          unselectedLegObject.reentry_target_value = 1;
          
          // Track this nested lazy leg ID so we can filter it out from unselected_legs array
          const idMatch = String(lazyLeg.reentry_tgt_mode).match(/lazy_leg_(\d+)/);
          if (idMatch) {
            nestedLazyLegIds.add(parseInt(idMatch[1], 10));
            console.log(`[buildSaveStrategyPayload] 📎 Nested lazy leg ${idMatch[1]} inside unselected lazy leg "${legName}"`);
          }
        }
      }
      
      return unselectedLegObject;
    })
    // ⭐ CRITICAL: Filter out lazy legs that are nested inside other unselected lazy legs
    .filter(leg => {
      // Find the original lazyLeg object to get its ID
      const originalLazyLeg = allLazyLegs.find(l => 
        (l.customName || (l.lazyLegNumber ? `lazy${l.lazyLegNumber}` : null)) === leg.leg_name
      );
      
      if (originalLazyLeg && nestedLazyLegIds.has(originalLazyLeg.id)) {
        console.log(`[buildSaveStrategyPayload] 🚫 Filtering out nested lazy leg "${leg.leg_name}" from unselected_legs (already nested inside another)`);
        return false;
      }
      
      return true;
    });

  console.log('[buildSaveStrategyPayload] 📋 Assigned lazy leg IDs:', Array.from(assignedLazyLegIds));
  console.log('[buildSaveStrategyPayload] 📋 Nested lazy leg IDs (inside unselected):', Array.from(nestedLazyLegIds));
  console.log('[buildSaveStrategyPayload] 📋 All lazy legs count:', allLazyLegs.length);
  console.log('[buildSaveStrategyPayload] 📋 Unselected legs count (after filtering nested):', unselectedLegs.length);
  console.log('[buildSaveStrategyPayload] 📋 Unselected legs:', JSON.stringify(unselectedLegs, null, 2));

  console.log('[buildSaveStrategyPayload] 🚀 FINAL PAYLOAD STRUCTURE:');
  console.log('[buildSaveStrategyPayload] - strategy: ✅');
  console.log('[buildSaveStrategyPayload] - legs: ✅ (' + legsArray.length + ' main legs)');
  console.log('[buildSaveStrategyPayload] - unselected_legs: ✅ (' + unselectedLegs.length + ' unselected lazy legs)');

  // ⭐ NEW: Return the format specified in README.md
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
    console.log('[extractLegIdMapping] 🔍 Starting extraction...');
    console.log('[extractLegIdMapping] Full response object keys:', Object.keys(response));
    console.log('[extractLegIdMapping] response.data keys:', response.data ? Object.keys(response.data) : 'NO DATA');
    
    // Backend response structure: response.data.legs (FLAT array)
    const legs = response.data?.legs || response.legs || [];
    
    console.log('[extractLegIdMapping] Found legs array, length:', legs.length);
    console.log('[extractLegIdMapping] Full legs array:', JSON.stringify(legs, null, 2));
    
    if (legs.length === 0) {
      console.warn('[extractLegIdMapping] ⚠️ No legs found in response!');
      return mapping;
    }
    
    // Backend returns legs as FLAT array with is_lazy_leg flag
    legs.forEach((leg, index) => {
      console.log(`\n[extractLegIdMapping] ========== Processing leg ${index + 1}/${legs.length} ==========`);
      console.log('[extractLegIdMapping] 🔍 Examining leg:', {
        leg_id: leg.leg_id,
        is_lazy_leg: leg.is_lazy_leg,
        leg_name: leg.leg_name,
        position_type: leg.position_type,
        option_type: leg.option_type
      });
      
      // Only store mapping for LAZY LEGS (is_lazy_leg: true) with a name
      if (leg.is_lazy_leg === true) {
        const lazyLegName = leg.leg_name || leg.custom_name || leg.customName || leg.name;
        const legId = leg.leg_id || leg.legId || leg.id;
        
        if (lazyLegName && legId) {
          mapping[lazyLegName] = legId;
          console.log(`[extractLegIdMapping] ✅ Lazy Leg Mapped: "${lazyLegName}" → backend_leg_id=${legId}`);
        } else if (!lazyLegName) {
          console.warn('[extractLegIdMapping] ⚠️ Lazy leg missing name:', leg);
        } else if (!legId) {
          console.warn('[extractLegIdMapping] ⚠️ Lazy leg missing ID:', leg);
        }
      } else {
        console.log('[extractLegIdMapping] ⏭️ Skipping main leg (is_lazy_leg=false, leg_id=' + leg.leg_id + ')');
      }
    });
    
    console.log('\n[extractLegIdMapping] ========================================');
    console.log('[extractLegIdMapping] ✅ Final lazy leg name → ID mapping:', mapping);
    console.log('[extractLegIdMapping] Total lazy leg mappings:', Object.keys(mapping).length);
    console.log('[extractLegIdMapping] ========================================\n');
    
  } catch (error) {
    console.error('[extractLegIdMapping] ❌ Error extracting leg IDs:', error);
    console.error('[extractLegIdMapping] Error stack:', error.stack);
  }
  
  return mapping;
};

