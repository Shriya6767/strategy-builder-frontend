// eslint-disable-next-line unicode-bom
import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Info, Clock, ChevronRight, Settings, ChevronLeft, Copy, Save, Play, RefreshCw } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import StrikeDropdown from './StrikeDropdown';
import StrikeSelector from './StrikeSelector';
import DateInput from './DateInput';
import BacktestResults from './BacktestResults';
import CompareBacktestSidebar from './CompareBacktestSidebar';
import { API_URL } from '../services/api';
import { compareBacktests } from '../services/strategyApi';
import { useStrategy } from '../context/StrategyContext';  // ⭐ NEW: Import Context hook

  const StrategyBuilder = ({ onRunBacktest, isLoading, savedConfig, onConfigChange, onSaveStrategy, strategyId, onResetStrategyId, backtestResults, onClearResults, strategySavedInSession, saveCompletedCounter, onLoadVersion }) => {
  // ⭐ NEW: Get version from React Context
  const { version: contextVersion } = useStrategy();
  
  // Ref to prevent infinite loops when loading config
  const isLoadingConfigRef = useRef(false);

  // ? FIXED: Default config template
  const getDefaultConfig = () => {
    return ({
    symbol: 'SPXW',
    start_month: '',
    start_year: '',
    end_month: '',
    end_year: '',
    start_date: '',
    end_date: '',
    dte_filter: '0',
    instrument_index: 'SPXW',
    underlying_from: 'cash',
    underlying_type: 'cash',
    square_off: 'partial',
    is_squareoff: false,
    trail_to_be: false,
    trail_to_be_scope: 'all_legs', // 'all_legs' | 'sl_legs'
    is_trail_sl_break_even: false,
    trail_sl_break_even_type: 'na',
    strategy_type: 'intraday',
    sequential_position_type: 'BUY',
    sequential_main_leg: 'CALL',
    entry_time: '13:30',
    exit_time: '20:00',
    initial_capital: 50000,
    lot_size: 1,
    capital_mode: 'fixed', // 'fixed' or 'premium_based'
    legs: [],
    is_strategy_sl: false,
    strategy_sl_type: 'points',
    strategy_sl_value: 0,
    is_strategy_target: false,
    strategy_target_type: 'points',
    strategy_target_value: 0,
    overall_stop_loss_enabled: false,
    overall_stop_loss_mode: 'mtm',
    overall_stop_loss_value: '',  // Empty by default
    overall_target_enabled: false,
    overall_target_mode: 'mtm',
    overall_target_value: '',  // Empty by default
    lock_profit_enabled: false,
    lock_profit_mode: 'points',  // Default to points
    lock_profit_value: 0,
    lock_profit_value1: '',  // First input field
    lock_profit_value2: '',  // Second input field
    lock_profit_lock_value: 1,
    is_overall_reentry_sl: false,
    overall_reentry_sl_enabled: false,
    overall_reentry_sl_mode: 're_asap',
    overall_reentry_sl_type: 're_asap',
    overall_reentry_sl_count: '',  // Empty by default
    overall_reentry_sl_value: 0,
    overall_reentry_sl_cost_mode: 'same_capital',
    overall_reentry_sl_multiplier: 2,
    overall_reentry_sl_cost_value: 1.00,
    is_overall_reentry_target: false,
    overall_reentry_tgt_enabled: false,
    overall_reentry_tgt_mode: 're_asap',
    overall_reentry_target_type: 're_asap',
    overall_reentry_tgt_count: '',  // Empty by default
    overall_reentry_target_value: 0,
    overall_reentry_tgt_cost_mode: 'profit_percentage',
    overall_reentry_tgt_cost_value: 1.00,
    is_overall_trail_sl: false,
    overall_trail_sl_enabled: false,
    overall_trail_sl_type: 'points',
    overall_instrument_move: 0,
    overall_stoploss_move: 0,
    });
  };

  // ? FIXED: Initialize from savedConfig (from parent) or defaults
  // DO NOT use localStorage - it causes stale data issues
  const [config, setConfig] = useState(() => {
    const initial = (savedConfig && Object.keys(savedConfig).length > 0) ? savedConfig : getDefaultConfig();
    return initial;
  });

  // ? NEW: State for premium-based capital calculation (with persistence)
  // MUST be declared early to avoid "used before defined" error
  const [premiumBasedCapital, setPremiumBasedCapital] = useState(() => {
    // Try to restore from savedConfig
    if (savedConfig && savedConfig.premiumBasedCapital) {
      return savedConfig.premiumBasedCapital;
    }
    return null;
  });
  const [fetchingPremiums, setFetchingPremiums] = useState(false);
  
  // ? NEW: Refs for time input cursor control
  const entryTimeRef = useRef(null);
  const exitTimeRef = useRef(null);
  
  // Ref for Data Selection section (for scrolling on BTST validation)
  const dataSelectionRef = useRef(null);
  
  // ? NEW: Persist dataLoaded state across tab switches
  const [dataLoaded, setDataLoaded] = useState(() => {
    // Restore from savedConfig if available
    if (savedConfig && savedConfig.dataLoaded) {
      return savedConfig.dataLoaded;
    }
    return false;
  });
  const [loadingData, setLoadingData] = useState(false);
  const [dataStatus, setDataStatus] = useState(() => {
    if (savedConfig && savedConfig.dataLoaded) {
      return "Data loaded ?";
    }
    return "Click 'Load Data' to begin";
  });
  const [rowCount, setRowCount] = useState(0);  // Track row count dynamically

  // Response popup state
  const [responsePopup, setResponsePopup] = useState(null); // { type: 'success'|'error'|'info', title }
  
  // DTE Filter validation error state
  const [dteValidationError, setDteValidationError] = useState(null);
  
  // Validation messages for momentum/range mutual exclusivity
  const [legValidationErrors, setLegValidationErrors] = useState({});

  // ? NEW: Compare Backtest sidebar state
  const [compareSidebarOpen, setCompareSidebarOpen] = useState(false);
  const [compareData, setCompareData] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // ? NEW: Track original loaded config to detect changes
  const [originalConfig, setOriginalConfig] = useState(() => {
    // Store the initial savedConfig as the baseline for change detection
    if (savedConfig && Object.keys(savedConfig).length > 0) {
      const initial = JSON.parse(JSON.stringify(savedConfig));
      console.log('[StrategyBuilder] Initial originalConfig set from savedConfig:', initial);
      return initial;
    }
    console.log('[StrategyBuilder] No savedConfig on mount, originalConfig is null');
    return null;
  });

  // Auto-dismiss popup after 3 seconds
  useEffect(() => {
    if (!responsePopup) return;
    const t = setTimeout(() => setResponsePopup(null), 3000);
    return () => clearTimeout(t);
  }, [responsePopup]);

  // ? NEW: Track if user has made changes (separate from originalConfig comparison)
  const [userMadeChanges, setUserMadeChanges] = useState(false);
  
  // ? NEW: Track button enabled state explicitly to force re-renders
  const [isSaveButtonEnabled, setIsSaveButtonEnabled] = useState(false);

  // ? NEW: Function to check if config has changed from original
  const hasConfigChanged = () => {
    // If no original config exists (new strategy), allow saving if there are legs
    if (!originalConfig) {
      return config.legs.length > 0;
    }
    
    // If strategyId doesn't exist, this is a new unsaved strategy
    if (!strategyId || strategyId === -999 || strategyId === '-999') {
      return config.legs.length > 0;
    }
    
    // ? NEW: If user has made changes flag, always return true
    if (userMadeChanges) {
      return true;
    }
    
    // Deep comparison of config vs originalConfig
    // We need to compare all relevant fields
    try {
      const configToCompare = JSON.parse(JSON.stringify(config));
      const originalToCompare = JSON.parse(JSON.stringify(originalConfig));
      
      // Remove fields that shouldn't trigger change detection
      const fieldsToIgnore = ['currentLeg', 'premiumBasedCapital', 'dataLoaded'];
      fieldsToIgnore.forEach(field => {
        delete configToCompare[field];
        delete originalToCompare[field];
      });
      
      const configString = JSON.stringify(configToCompare);
      const originalString = JSON.stringify(originalToCompare);
      const hasChanged = configString !== originalString;
      
      console.log('🔍 [Change Detection] Deep comparison result:', {
        hasChanged,
        strategyId,
        userMadeChanges,
        configLegsCount: config.legs?.length || 0,
        originalLegsCount: originalConfig.legs?.length || 0,
      });
      
      // Debug: Log first difference if configs don't match
      if (hasChanged) {
        console.log('🟢 [Change Detection] ✅ DEEP COMPARISON DETECTED CHANGES - Button SHOULD BE ENABLED');
      } else {
        console.log('🔴 [Change Detection] ❌ NO CHANGES DETECTED - Button SHOULD BE DISABLED');
      }
      
      return hasChanged;
    } catch (error) {
      console.error('❌ [Change Detection] Error during comparison:', error);
      // On error, be conservative and allow saving if there are legs
      return config.legs.length > 0;
    }
  };

  // ? FIXED: Initialize currentLeg from savedConfig if available
  const [currentLeg, setCurrentLeg] = useState(() => {
    // Try to restore from savedConfig first
    if (savedConfig && savedConfig.currentLeg) {
      return savedConfig.currentLeg;
    }
    // Otherwise use defaults - ALL TOGGLES OFF, ALL VALUES EMPTY
    const strategyType = (savedConfig && savedConfig.strategy_type) || 'intraday';
    const dteFilter = (savedConfig && savedConfig.dte_filter) || '0';
    const defaultExpiry = dteFilter === '0' ? '0dte' : '1dte';
    
    return {
      segment: 'options',
      lots: '1',  // ? Default value is 1
      position: 'buy',
      option_type: 'call',
      expiry: defaultExpiry,  // Set based on DTE filter
      strike_criteria: 'based on points',  // ✅ Changed to "Based On Strike"
      strike_type: 'atm',
      strike_value: '',  // ? EMPTY by default
      premium_tolerance: '',  // ? EMPTY by default
      atm_percent_direction: '+',  // ? Default to '+'
      atm_percent_value: '',  // ? EMPTY by default
      lower_range: '',  // ? EMPTY by default
      upper_range: '',  // ? EMPTY by default
      closest_premium_value: '',  // ? EMPTY by default
      entry_time: '',  // Empty = use global time
      exit_time: '',   // Empty = use global time
      target_enabled: false,  // ? OFF by default
      target_mode: 'points',
      target_value: '',  // ? EMPTY by default
      stop_loss_enabled: false,  // ? OFF by default
      stop_loss_mode: strategyType === 'btst' ? 'btst_percent' : 'points',
      stop_loss_value: '',  // ? EMPTY by default
      trail_enabled: false,
      trail_mode: 'points',
      trail_value: '',
      momentum_enabled: false,  // ? OFF by default
      momentum_mode: 'percent_up',
      momentum_value: '',  // ? EMPTY by default
      range_enabled: false,
      range_instrument: 'underlying',
      range_time: '14:45',
      reentry_tgt_enabled: false,
      reentry_tgt_mode: 're_cost',
      reentry_tgt_count: '',  // ? EMPTY by default
      reentry_sl_enabled: false,
      reentry_sl_mode: 're_cost',
      reentry_sl_count: '',  // ? EMPTY by default
      trail_lock_value: '',
      range_breadth_enabled: false,
      range_breadth_comparison: 'gte',
      range_breadth_value: '',
      open_low_enabled: false,
      open_low_mode: 'points',
      open_low_value: '',
      open_high_enabled: false,
      open_high_mode: 'points',
      open_high_value: '',
      gap_filter_enabled: false,
      gap_filter_instrument: 'instrument',
      gap_filter_direction: 'gap_up',
      gap_filter_comparison: 'gte',
      gap_filter_value: '',
    };
  });

  // ? NEW: Time picker state variables
  // eslint-disable-next-line no-unused-vars
  const [tempHour, setTempHour] = useState('09');
  // eslint-disable-next-line no-unused-vars
  const [tempMinute, setTempMinute] = useState('30');
  // eslint-disable-next-line no-unused-vars
  const [timePickerTarget, setTimePickerTarget] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [timePickerModal, setTimePickerModal] = useState(false);

  // ? NEW: Range breakout modal state
  const [rangeBreakoutModal, setRangeBreakoutModal] = useState({
    isOpen: false,
    entryDte: 0,
    startTime: '09:17',
    endDte: 0,
    endTime: '09:45',
    entryOn: 'high',
    tracking: 'strike_price'
  });

  // ? NEW: Trail SL filter state
  const [trailSLFilter, setTrailSLFilter] = useState('all'); // 'all' or 'sl'

  // ? NEW: Time picker modal state variables
  // eslint-disable-next-line no-unused-vars
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [timePickerValue, setTimePickerValue] = useState('09:30');
  // eslint-disable-next-line no-unused-vars
  const handleTimePickerSelect = (time) => {
    setTimePickerValue(time);
    setTimePickerOpen(false);
  };

  // ? NEW: Time input mask handler - keeps colon (:) at fixed position
  const handleTimeInput = (value, field, inputRef) => {
    // Remove all non-numeric characters
    let numbers = value.replace(/[^\d]/g, '');
    
    // Limit to 4 digits max (HHMM)
    if (numbers.length > 4) {
      numbers = numbers.substring(0, 4);
    }
    
    // Build formatted time with colon always at position 2
    let formatted = '';
    let cursorPosition = 0;
    
    if (numbers.length === 0) {
      formatted = ':';
      cursorPosition = 0;
    } else if (numbers.length <= 2) {
      // Only hours entered, pad and add colon
      formatted = numbers.padEnd(2, '') + ':';
      cursorPosition = numbers.length;
      
      // If 2 digits entered, move cursor after colon
      if (numbers.length === 2) {
        cursorPosition = 3; // After ":"
      }
    } else {
      // Both hours and minutes
      const hours = numbers.substring(0, 2);
      const minutes = numbers.substring(2, 4);
      formatted = hours + ':' + minutes;
      cursorPosition = 3 + minutes.length; // After colon + minutes length
    }
    
    // ? NEW: Validate time range (13:30 - 20:00)
    if (formatted.length === 5) { // Full time entered (HH:MM)
      const [h, m] = formatted.split(':').map(Number);
      const timeInMinutes = h * 60 + m;
      const minTime = 13 * 60 + 30; // 13:30 = 810 minutes
      const maxTime = 21 * 60 + 0;  // 21:00 = 1260 minutes
      
      // If time is outside allowed range, don't update
      if (timeInMinutes < minTime || timeInMinutes > maxTime) {
        // Show error and reset to previous value or default
        console.warn(`⚠️ Time must be between 13:30 and 21:00. You entered: ${formatted}`);
        setResponsePopup({ type: 'error', title: 'Time must be between 13:30 and 21:00' });
        return; // Don't update the field
      }
    }
    
    handleChange(field, formatted);
    
    // Set cursor position after state updates
    setTimeout(() => {
      if (inputRef && inputRef.current) {
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  // ? FIXED: Restore from savedConfig when it changes (tab switch or after backtest)
  useEffect(() => {
    if (savedConfig && Object.keys(savedConfig).length > 0) {
      // Check if savedConfig is actually different from current config
      // If they're the same, this is just a sync-back from our own changes - skip it
      const currentConfigJson = JSON.stringify({...config, currentLeg: undefined, premiumBasedCapital: undefined, dataLoaded: undefined});
      const savedConfigJson = JSON.stringify({...savedConfig, currentLeg: undefined, premiumBasedCapital: undefined, dataLoaded: undefined});
      
      if (currentConfigJson === savedConfigJson && strategyId) {
        // This is a sync-back from our own changes - don't reset userMadeChanges
        console.log('[StrategyBuilder] Skipping savedConfig update - this is a sync-back from our own changes');
        return;
      }
      
      isLoadingConfigRef.current = true;
      
      // Merge savedConfig with current config to ensure all fields are updated
      const mergedConfig = {
        ...getDefaultConfig(), // Start with defaults to ensure all fields exist
        ...savedConfig, // Override with saved values
      };
      
      // Handle leg migration if needed
      if (mergedConfig.legs && mergedConfig.legs.length > 0) {
        const needsMigration = mergedConfig.legs.some(leg => !leg.entry_time || !leg.exit_time);
        const needsAtmPercentMigration = mergedConfig.legs.some(leg => 
          leg.atm_percent_direction === undefined || 
          leg.lower_range === undefined || 
          leg.upper_range === undefined
        );
        
        if (needsMigration || needsAtmPercentMigration) {
          mergedConfig.legs = mergedConfig.legs.map(leg => ({
            ...leg,
            strike_criteria: leg.strike_criteria,
            entry_time: leg.entry_time || mergedConfig.entry_time || '13:30',
            exit_time: leg.exit_time || mergedConfig.exit_time || '20:00',
            atm_percent_direction: leg.atm_percent_direction !== undefined ? leg.atm_percent_direction : '+',
            atm_percent_value: leg.atm_percent_value !== undefined ? leg.atm_percent_value : '',
            lower_range: leg.lower_range !== undefined ? leg.lower_range : '',
            upper_range: leg.upper_range !== undefined ? leg.upper_range : ''
          }));
        }
      }
      
      // Update all state
      setConfig(mergedConfig);
      setOriginalConfig(JSON.parse(JSON.stringify(mergedConfig)));
      // Reset userMadeChanges only when loading a new/different strategy
      setUserMadeChanges(false);
      
      // Restore currentLeg if available
      if (savedConfig.currentLeg) {
        setCurrentLeg(savedConfig.currentLeg);
      }
      
      // Restore dataLoaded state
      if (savedConfig.dataLoaded !== undefined) {
        setDataLoaded(savedConfig.dataLoaded);
        setDataStatus(savedConfig.dataLoaded ? "Data loaded ?" : "Click 'Load Data' to begin");
      }
      
      // Restore premiumBasedCapital
      if (savedConfig.premiumBasedCapital) {
        setPremiumBasedCapital(savedConfig.premiumBasedCapital);
      }
      
      // Reset flag after React finishes this render cycle
      requestAnimationFrame(() => {
        isLoadingConfigRef.current = false;
      });
    }
  }, [savedConfig]);

  // ? FIXED: Sync config AND currentLeg AND premiumBasedCapital AND dataLoaded to parent
  useEffect(() => {
    if (onConfigChange && !isLoadingConfigRef.current) {
      // Include currentLeg, premiumBasedCapital, and dataLoaded in the config we send to parent
      const configWithExtras = { 
        ...config, 
        currentLeg,
        premiumBasedCapital,  // ? Persist premium calculation
        dataLoaded  // ? NEW: Persist data loaded state
      };
      onConfigChange(configWithExtras);
      
      // ? NEW: Set userMadeChanges flag if this is an existing strategy being edited
      if (strategyId && strategyId !== -999 && strategyId !== '-999' && originalConfig) {
        console.log('[Change Detection] Config changed for existing strategy - setting userMadeChanges = true');
        setUserMadeChanges(true);
      }
    }
  }, [config, currentLeg, premiumBasedCapital, dataLoaded]); // ? Added dataLoaded to deps

  // ? NEW: Reset originalConfig after successful save (triggered by saveCompletedCounter)
  useEffect(() => {
    // When saveCompletedCounter increments, it means save was successful
    // Update originalConfig to reflect the newly saved state
    if (saveCompletedCounter > 0) {
      console.log('[StrategyBuilder] Save completed, resetting originalConfig to current config');
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      // ? NEW: Reset userMadeChanges flag after successful save
      setUserMadeChanges(false);
      console.log('[Change Detection] Save completed - reset userMadeChanges = false');
    }
  }, [saveCompletedCounter]);

  // ? NEW: Debug effect to monitor button state changes
  useEffect(() => {
    const buttonShouldBeEnabled = hasConfigChanged();
    console.log('🔵 [Button State] useEffect fired');
    console.log('🔵 [Button State] buttonShouldBeEnabled:', buttonShouldBeEnabled);
    console.log('🔵 [Button State] userMadeChanges:', userMadeChanges);
    console.log('🔵 [Button State] strategyId:', strategyId);
    setIsSaveButtonEnabled(buttonShouldBeEnabled); // Update state to force re-render
  }, [config, originalConfig, strategyId, userMadeChanges]);

  const months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  const years = ['2022', '2023', '2024', '2025'];

  const handleChange = (field, value) => {
    // ? NEW: Validate numeric fields in config
    const numericConfigFields = ['dte_filter', 'initial_capital', 'lot_size', 'strategy_sl_value', 
                                 'strategy_target_value', 'overall_stop_loss_value', 
                                 'overall_target_value', 'lock_profit_value1', 'lock_profit_value2',
                                 'overall_reentry_sl_count', 'overall_reentry_tgt_count',
                                 'overall_instrument_move', 'overall_stoploss_move'];
    
    let processedValue = value;
    
    // Validate numeric fields
    if (numericConfigFields.includes(field)) {
      // Allow empty string (user clearing field)
      if (value === '' || value === null || value === undefined) {
        processedValue = '';
      } else {
        const numValue = Number(value);
        // Check for negative values
        if (numValue < 0) {
          setResponsePopup({ type: 'error', title: `${field.replace(/_/g, ' ')} cannot be negative` });
          return; // Don't update
        }
        // Keep as string to preserve decimal input (like "0.5" while typing)
        processedValue = value;
      }
    }
    
    // ? NEW: Reset dataLoaded when date range changes
    if (field === 'start_date' || field === 'end_date') {
      if (dataLoaded) {
        console.log('[DATE CHANGED] Resetting Load Data button to blue state');
        setDataLoaded(false);
        setDataStatus("Click 'Load Data' to begin");
      }
    }
    
    // ? NEW: Clear trailing values when toggle is turned off
    if (field === 'lock_profit_enabled' && !value) {
      console.log('[TRAILING] Toggle turned OFF - clearing values');
      processedValue = false; // Set toggle to false
      // Will clear values below in newConfig
    }
    
    const newConfig = { ...config, [field]: processedValue };
    
    // ? NEW: Clear trailing values when toggle is turned off
    if (field === 'lock_profit_enabled' && !value) {
      newConfig.lock_profit_value1 = '';
      newConfig.lock_profit_value2 = '';
    }
    
    // ? NEW: When DTE Filter changes, update all leg expiry values
    if (field === 'dte_filter') {
      const newExpiry = value === '0' ? '0dte' : '1dte';
      console.log('[DTE FILTER CHANGED] Updating all legs to:', newExpiry);
      
      // Update all existing legs
      newConfig.legs = config.legs.map(leg => ({
        ...leg,
        expiry: newExpiry
      }));
      
      // Update current leg being built
      setCurrentLeg(prev => ({ ...prev, expiry: newExpiry }));
      
      // Reset dataLoaded to indicate data needs to be reloaded
      if (dataLoaded) {
        console.log('[DTE FILTER CHANGED] Resetting Load Data button to blue state');
        setDataLoaded(false);
        setDataStatus(null);
      }
    }
    
    // ? AUTO-SELECT STOP LOSS MODE based on strategy type
    if (field === 'strategy_type') {
      // Validate: BTST cannot be selected with 1DTE (dte_filter = 0)
      if (value === 'btst' && config.dte_filter === '0') {
        // Scroll to Data Selection section
        if (dataSelectionRef.current) {
          dataSelectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          });
        }
        
        // Show error message above DTE Filter
        setDteValidationError('Please select 1 DTE again and load data.');
        
        // Hide error after 5 seconds
        setTimeout(() => {
          setDteValidationError(null);
        }, 5000);
        
        // Don't change the strategy type
        return;
      }
      
      // Clear any DTE validation error when changing strategy type
      setDteValidationError(null);
      
      // Update all legs' stop_loss_mode based on strategy type
      if (value === 'btst') {
        // BTST: Use 'btst_percent' mode
        newConfig.legs = config.legs.map(leg => ({
          ...leg,
          stop_loss_mode: 'btst_percent'
        }));
        // Also update current leg being built
        setCurrentLeg(prev => ({ ...prev, stop_loss_mode: 'btst_percent' }));
      } else if (value === 'intraday' || value === 'sequential') {
        // Intraday/Sequential: Use 'points' mode
        newConfig.legs = config.legs.map(leg => ({
          ...leg,
          stop_loss_mode: 'points'
        }));
        // Also update current leg being built
        setCurrentLeg(prev => ({ ...prev, stop_loss_mode: 'points' }));
      }
    }
    
    setConfig(newConfig);
    
    // ? NEW: Mark that user made changes if this is an existing strategy
    if (strategyId && strategyId !== -999 && strategyId !== '-999' && originalConfig) {
      console.log('🟢 [TOP-LEVEL CHANGE] User changed field:', field, '- setting userMadeChanges = true');
      setUserMadeChanges(true);
    } else {
      console.log('🔵 [TOP-LEVEL CHANGE] New strategy - field change allowed but no userMadeChanges flag needed for field:', field);
    }
    // ? REMOVED: onConfigChange call - now handled by useEffect
  };

  // ? NEW: Fetch actual premium values from backend
  const fetchActualPremiums = async () => {
    if (config.capital_mode !== 'premium_based' || config.legs.length === 0) {
      setPremiumBasedCapital(null);
      return;
    }

    setFetchingPremiums(true);
    
    try {
      const start_date = `${config.start_year}-${config.start_month}-01`;
      const end_date = `${config.end_year}-${config.end_month}-28`;
      
      const response = await fetch(`${API_URL}/get-premium-values`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: config.symbol,
          start_date: start_date,
          end_date: end_date,
          dte_filter: config.dte_filter,
          entry_time: config.entry_time,
          legs: config.legs.map(leg => ({
            optionType: leg.option_type.toUpperCase(),
            strikeCriteria: leg.strike_criteria,
            strikeType: leg.strike_type,
            strikeValue: leg.strike_value,
            premiumTolerance: leg.premium_tolerance
          }))
        })
      });

      // Safe JSON parse
      const rawPremiumText = await response.text();
      let data;
      try {
        data = rawPremiumText ? JSON.parse(rawPremiumText) : {};
      } catch {
        throw new Error('Server returned invalid response for premium values');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch premium values');
      }

      // Calculate capital based on actual premiums
      const lotSize = config.lot_size || 100;
      const totalPremium = data.leg_premiums.reduce((sum, leg) => sum + leg.premium, 0);
      const totalLegs = data.leg_premiums.length;
      
      // Base capital: total premium   lot size
      const baseCapital = totalPremium * lotSize;
      
      // Apply 10x multiplier for margin safety
      const finalCapital = baseCapital * 10;
      
      setPremiumBasedCapital({
        totalLegs,
        totalPremium: totalPremium.toFixed(2),
        perLegPremiums: data.leg_premiums,
        baseCapital: baseCapital.toFixed(2),
        finalCapital: Math.round(finalCapital),
        lotSize,
        underlyingPrice: data.underlying_price,
        sampleDate: data.sample_date
      });

      console.log('[Premium-Based Capital] Calculated:', {
        totalPremium,
        baseCapital,
        finalCapital: Math.round(finalCapital),
        legs: data.leg_premiums
      });

    } catch (error) {
      console.error('[Premium-Based Capital] Error:', error);
      // Fallback to estimated calculation
      const lotSize = config.lot_size || 100;
      const estimatedPremium = 15;
      const totalLegs = config.legs.length;
      const baseCapital = estimatedPremium * lotSize * totalLegs;
      const finalCapital = baseCapital * 10;
      
      setPremiumBasedCapital({
        totalLegs,
        totalPremium: (estimatedPremium * totalLegs).toFixed(2),
        perLegPremiums: config.legs.map(leg => ({
          optionType: leg.option_type.toUpperCase(),
          premium: estimatedPremium,
          strike: 'N/A',
          method: 'fallback'
        })),
        baseCapital: baseCapital.toFixed(2),
        finalCapital: Math.round(finalCapital),
        lotSize,
        error: error.message
      });
    } finally {
      setFetchingPremiums(false);
    }
  };

  // ? NEW: Auto-fetch premiums when legs change or capital mode changes
  // Recalculate when date range changes OR legs change
  useEffect(() => {
    if (config.capital_mode === 'premium_based' && 
        config.legs.length > 0 && 
        dataLoaded) {
      console.log('[Premium] Date range or legs changed, recalculating premiums...');
      // Debounce the fetch to avoid too many requests
      const timer = setTimeout(() => {
        fetchActualPremiums();
      }, 500);
      return () => clearTimeout(timer);
    } else if (config.capital_mode !== 'premium_based') {
      setPremiumBasedCapital(null);
    }
  }, [
    config.legs.length, 
    config.capital_mode, 
    config.start_month,    // ? NEW: Recalculate when start month changes
    config.start_year,     // ? NEW: Recalculate when start year changes
    config.end_month,      // ? NEW: Recalculate when end month changes
    config.end_year,       // ? NEW: Recalculate when end year changes
    config.dte_filter,     // ? Recalculate when DTE changes
    dataLoaded
  ]); // ? Trigger on date changes

  // ? LEGACY: Keep for backward compatibility (returns calculated value or null)
  const calculatePremiumBasedCapital = () => {
    return premiumBasedCapital;
  };

  // Helper function to select all text on focus (makes it easy to replace default values)
  const handleNumberFocus = (e) => {
    // Select all text when clicking on the field
    setTimeout(() => e.target.select(), 0);
  };

  const handleLegChange = (field, value) => {
    // ? DEBUG: Log expiry changes
    if (field === 'expiry') {
      console.log('[HANDLE LEG CHANGE] Expiry changed to:', value);
    }
    
    // ? NEW: Input validation - prevent negative values for numeric fields
    const numericFields = ['lots', 'strike_value', 'premium_tolerance', 'lower_range', 'upper_range', 
                          'premium_value', 'target_value', 'stop_loss_value', 'trail_value', 
                          'trail_lock_value', 'momentum_value', 'reentry_tgt_count', 'reentry_sl_count'];
    
    if (numericFields.includes(field)) {
      // If empty string, allow it (user is clearing the field)
      if (value === '' || value === null || value === undefined) {
        setCurrentLeg(prev => ({ ...prev, [field]: '' }));
        return;
      }
      
      // Convert to number for validation only
      const numValue = Number(value);
      
      // Check if negative
      if (numValue < 0) {
        setResponsePopup({ type: 'error', title: `${field.replace(/_/g, ' ')} cannot be negative` });
        return; // Don't update the field
      }
      
      // Update with the original string value to preserve decimal input (e.g., "0." while typing "0.5")
      setCurrentLeg(prev => ({ ...prev, [field]: value }));
    } else {
      // Non-numeric fields - just set the value
      setCurrentLeg(prev => ({ ...prev, [field]: value }));
    }
  };


  // ? NEW: Helper function to update a leg inline and mark as changed
  const updateLegInPlace = (legIndex, updatedFields) => {
    const updated = [...config.legs];
    updated[legIndex] = { ...updated[legIndex], ...updatedFields };
    setConfig({ ...config, legs: updated });
    
    // ? CRITICAL: Mark that user made changes immediately
    if (strategyId && strategyId !== -999 && strategyId !== '-999' && originalConfig) {
      console.log('🟢 [LEG EDIT] User edited leg', legIndex, 'fields:', Object.keys(updatedFields), '- setting userMadeChanges = true');
      setUserMadeChanges(true);
    } else {
      console.log('🔵 [LEG EDIT] New strategy - leg edit allowed but no userMadeChanges flag needed');
    }
  };

  const addLeg = () => {
    // Validate: If Re-entry Target is enabled, Target must be enabled first
    if (currentLeg.reentry_tgt_enabled && !currentLeg.target_enabled) {
      setResponsePopup({ 
        type: 'error', 
        title: 'Target must be selected first before enabling Re-entry Target.' 
      });
      return;
    }
    
    // Validate: If Re-entry on SL is enabled, Stop Loss must be enabled first
    if (currentLeg.reentry_sl_enabled && !currentLeg.stop_loss_enabled) {
      setResponsePopup({ 
        type: 'error', 
        title: 'Stop Loss must be selected first before enabling Re-entry on SL.' 
      });
      return;
    }
    
    // Validate: If Trail SL is enabled, Stop Loss must be enabled first
    if (currentLeg.trail_enabled && !currentLeg.stop_loss_enabled) {
      setResponsePopup({ 
        type: 'error', 
        title: 'Stop Loss must be selected first before enabling Trail SL.' 
      });
      return;
    }
    
    // DEBUG: Log currentLeg state before adding to see all values
    console.log('[ADD LEG] Current leg state before adding:', {
      strike_criteria: currentLeg.strike_criteria,
      atm_percent_direction: currentLeg.atm_percent_direction,
      atm_percent_value: currentLeg.atm_percent_value,
      full_currentLeg: currentLeg
    });
    
    // ? NEW: Reset strategyId when adding leg to indicate unsaved changes
    if (strategyId && onResetStrategyId) {
      console.log('[ADD LEG] Resetting strategyId - strategy has unsaved changes');
      onResetStrategyId();
    }
    
    // Straddle grouping logic: CALL + PUT = same straddle ID
    let straddleId;
    
    // Check if we can pair this leg with an existing unpaired leg
    const currentOptionType = currentLeg.option_type.toUpperCase();
    const oppositeType = currentOptionType === 'CALL' ? 'PUT' : 'CALL';
    
    // Find the last leg with opposite type that doesn't have a pair
    const existingLegs = config.legs.filter(leg => !leg.isReentry);
    let foundPair = null;
    
    // Look for unpaired leg (a leg that doesn't have its opposite in the same straddle)
    for (let i = existingLegs.length - 1; i >= 0; i--) {
      const leg = existingLegs[i];
      if (leg.option_type.toUpperCase() === oppositeType) {
        // Check if this leg already has a pair
        const hasPair = existingLegs.some(l => 
          l.straddle_id === leg.straddle_id && 
          l.option_type.toUpperCase() !== leg.option_type.toUpperCase()
        );
        
        if (!hasPair) {
          foundPair = leg;
          break;
        }
      }
    }
    
    if (foundPair) {
      // Pair with existing leg
      straddleId = foundPair.straddle_id;
    } else {
      // Create new straddle ID
      const maxStraddleId = existingLegs.reduce((max, leg) => 
        Math.max(max, leg.straddle_id || 0), 0
      );
      straddleId = maxStraddleId + 1;
    }
    
    // ? DEBUG: Log re-entry values before adding
    // console.log('[ADD LEG] Re-entry values:', {
    //   reentry_tgt_enabled: currentLeg.reentry_tgt_enabled,
    //   reentry_tgt_mode: currentLeg.reentry_tgt_mode,
    //   reentry_tgt_count: currentLeg.reentry_tgt_count,
    //   reentry_sl_enabled: currentLeg.reentry_sl_enabled,
    //   reentry_sl_mode: currentLeg.reentry_sl_mode,
    //   reentry_sl_count: currentLeg.reentry_sl_count
    // });
    
    // ? ALWAYS save current entry/exit time to the leg (lock the time)
    const legWithTime = {
      ...currentLeg,
      id: Date.now(),
      straddle_id: straddleId,
      entry_time: currentLeg.entry_time || config.entry_time,  // Lock current time
      exit_time: currentLeg.exit_time || config.exit_time,     // Lock current time
      // Ensure ATM percent fields exist (for backward compatibility)
      atm_percent_direction: currentLeg.atm_percent_direction || '+',
      atm_percent_value: currentLeg.atm_percent_value || '',
      lower_range: currentLeg.lower_range || '',
      upper_range: currentLeg.upper_range || '',
      closest_premium_value: currentLeg.closest_premium_value || ''
    };
    
    // ? DEBUG: Log the expiry being saved
    console.log('[ADD LEG] Expiry being saved:', {
      expiry: legWithTime.expiry,
      currentLeg_expiry: currentLeg.expiry,
      fullLeg: legWithTime
    });
    
    // ? DEBUG: Log the complete leg being added
    // console.log('[ADD LEG] Complete leg:', legWithTime);
    
    const newConfig = {
      ...config,
      legs: [...config.legs, legWithTime]
    };
    setConfig(newConfig);
    
    // ? NEW: Clear premium calculation when legs change (will auto-recalculate)
    setPremiumBasedCapital(null);
  };


  const removeLeg = (id) => {
    const newConfig = {
      ...config,
      legs: config.legs.filter(leg => leg.id !== id)
    };
    setConfig(newConfig);
    
    // ? NEW: Clear premium calculation when legs change (will auto-recalculate)
    setPremiumBasedCapital(null);
  };

  const clearAllLegs = () => {
    const newConfig = { ...config, legs: [] };
    setConfig(newConfig);
    // ? REMOVED: onConfigChange call - now handled by useEffect
  };
  const handleSubmit = () => {
    // ? NEW: Check if user loaded a saved strategy and made changes without saving
    if (strategyId && strategyId !== -999 && strategyId !== '-999' && userMadeChanges) {
      console.log('[BACKTEST] Blocked - User made changes without saving');
      console.log('[BACKTEST] strategyId:', strategyId);
      console.log('[BACKTEST] userMadeChanges:', userMadeChanges);
      setResponsePopup({ 
        type: 'error', 
        title: 'Please save the changes first before running backtest' 
      });
      return;
    }
    
    console.log('[DEBUG] ========================================');
    console.log('[DEBUG] FULL CONFIG STATE AT BACKTEST TIME');
    console.log('[DEBUG] ========================================');
    console.log('[DEBUG] Start Date:', config.start_date);
    console.log('[DEBUG] End Date:', config.end_date);
    console.log('[DEBUG] Config.legs:', JSON.stringify(config.legs, null, 2));
    console.log('[DEBUG] Strategy ID:', strategyId || -999);
    console.log('[DEBUG] User Made Changes:', userMadeChanges);
    console.log('[DEBUG] ========================================');

    // Validate required fields
    if (!config.symbol) {
      alert('Please select a symbol');
      return;
    }
    
    if (!config.start_date || !config.end_date) {
      alert('Please select both start and end dates');
      return;
    }
    
    // Validate date format (should be yyyy-mm-dd)
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormatRegex.test(config.start_date) || !dateFormatRegex.test(config.end_date)) {
      console.error('[BACKTEST] Invalid date format:', {
        start_date: config.start_date,
        end_date: config.end_date
      });
      alert('Invalid date format. Please select dates from the calendar.');
      return;
    }
    
    // Validate date range
    if (new Date(config.end_date) < new Date(config.start_date)) {
      alert('End date must be after start date');
      return;
    }

    // ? NEW: Check if historical data is loaded BEFORE resetting it
    if (!dataLoaded) {
      alert('⚠️ Historical data not loaded!\n\nPlease click the "Load Data" button first to load historical data before running the backtest.');
      return;
    }
    
    if (!config.strategy_type) {
      alert('Please select a strategy type');
      return;
    }
    
    if (config.legs.length === 0) {
      alert('Please add at least one leg');
      return;
    }

    // ? REMOVED: Don't reset dataLoaded state after backtest
    // The button should remain green ("Loaded") until user changes dates
    // Only date changes (start_date/end_date) will reset the button to blue

    // Helper: convert empty/null/undefined to 0, else Number
    const toNumber = (val) => (val === '' || val === null || val === undefined) ? 0 : Number(val);

    // Helper: format time string to HH:MM:SS
    const formatTime = (time) => {
      if (!time) return '00:00:00';
      const parts = time.split(':');
      return `${(parts[0] || '00').padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}:00`;
    };

    // Helper: parse StrikeDropdown value (e.g. 'itm_3', 'atm', 'otm_2')
    // Returns { sign: '+'/'-'/'', strikes: number }
    const parseStrikeType = (strikeType) => {
      if (!strikeType || strikeType === 'atm') return { sign: '', strikes: 0 };
      const lc = strikeType.toLowerCase();
      if (lc.startsWith('itm_')) {
        const n = parseInt(lc.replace('itm_', ''), 10);
        return { sign: '-', strikes: isNaN(n) ? 1 : n };
      }
      if (lc.startsWith('otm_')) {
        const n = parseInt(lc.replace('otm_', ''), 10);
        return { sign: '+', strikes: isNaN(n) ? 1 : n };
      }
      return { sign: '', strikes: 0 };
    };

    // Helper: format strike type for backend (e.g. 'itm_3' → 'ITM-3', 'atm' → 'ATM')
    const formatStrikeTypeForBackend = (strikeType) => {
      if (!strikeType || strikeType === 'atm') return 'ATM';
      const lc = strikeType.toLowerCase();
      if (lc.startsWith('itm_')) {
        const n = parseInt(lc.replace('itm_', ''), 10);
        return `ITM-${isNaN(n) ? 1 : n}`;
      }
      if (lc.startsWith('otm_')) {
        const n = parseInt(lc.replace('otm_', ''), 10);
        return `OTM-${isNaN(n) ? 1 : n}`;
      }
      return 'ATM';
    };

    // Helper: map UI strike_criteria internal key → backend display string
    const strikeCriteriaMap = {
      'based on points': 'based on points',           // lowercase
      'closest premium': 'closest premium',           // lowercase
      'based on atm percent': 'atm percentage',       // Map to 'atm percentage' (backend name)
      'premium range': 'premium range',               // lowercase
      'based on premium range': 'premium range',      // Map to 'premium range' (without "based on")
      // Backward compatibility with old underscore format
      'based_on_points': 'based on points',
      'closest_premium': 'closest premium',
      'based_on_atm_percent': 'atm percentage',
      'premium_range': 'premium range',
    };

    // Helper: map UI type → backend type (stoploss, target, trail, etc.)
    // CRITICAL: Backend expects 'PERCENT', NOT 'PERCENTAGE'
    // UI stores 'points', 'percentage', 'percent', 'btst_percent' etc.
    const typeMap = {
      'points':                'POINTS',
      'percentage':            'PERCENT',
      'percent':               'PERCENT',
      'btst_percent':          'PERCENT',
      'mtm':                   'MTM',
      'underlying_points':     'UNDERLYING_POINTS',
      'underlying_percentage': 'UNDERLYING_PERCENT',
    };

    // Helper function: normalize any type string to backend format
    const normalizeType = (typeValue) => {
      if (!typeValue) return 'POINTS';
      const lower = typeValue.toLowerCase();
      return typeMap[lower] || typeValue.toUpperCase();
    };

    // Helper: map UI momentum mode → backend momentum_type
    const momentumModeMap = {
      'points':                       'POINTS_UP',
      'points_down':                  'POINTS_DOWN',
      'percentage':                   'PERCENT_UP',
      'percentage_down':              'PERCENT_DOWN',
      'underlying_points_up':         'UNDERLYING_POINTS_UP',
      'underlying_points_down':       'UNDERLYING_POINTS_DOWN',
      'underlying_percentage_up':     'UNDERLYING_PERCENT_UP',
      'underlying_percentage_down':   'UNDERLYING_PERCENT_DOWN',
      // Legacy support
      'percent_up':                   'PERCENT_UP',
      'percent_down':                 'PERCENT_DOWN',
    };

    // Helper function: normalize momentum type
    const normalizeMomentumType = (momentumMode) => {
      if (!momentumMode) return 'PERCENT_DOWN';
      const lower = momentumMode.toLowerCase();
      return momentumModeMap[lower] || momentumMode.toUpperCase();
    };

    // Helper: map UI reentry mode → backend reentry type
    const reentryModeMap = {
      're_asap':              'RE_ASAP',
      're_asap_reverse':      'RE_ASAP_REVERSE',
      're_momentum':          'RE_MOMENTUM',
      're_momentum_reverse':  'RE_MOMENTUM_REVERSE',
      're_cost':              'RE_COST',
      're_cost_reverse':      'RE_COST_REVERSE',
    };

    // Build legs array — every field from UI state, no hardcoded values
    const legsArray = config.legs.map((leg, idx) => {
      // DEBUG: Log expiry value for each leg
      console.log(`[LEG ${idx}] Expiry Config:`, {
        expiry_raw: leg.expiry,
        expiry_type: typeof leg.expiry,
        expiry_sent_to_backend: leg.expiry ? leg.expiry : '0dte'
      });
      
      // DEBUG: Log each leg's target configuration
      console.log(`[LEG ${idx}] Target Config:`, {
        target_enabled: leg.target_enabled,
        target_mode: leg.target_mode,
        target_value: leg.target_value,
      });
      
      // DEBUG: Log momentum configuration
      console.log(`[LEG ${idx}] Momentum Config:`, {
        momentum_enabled: leg.momentum_enabled,
        momentum_mode: leg.momentum_mode,
        momentum_type_mapped: normalizeMomentumType(leg.momentum_mode),
      });
      
      // DEBUG: Log strike type configuration
      console.log(`[LEG ${idx}] Strike Type Config:`, {
        strike_criteria_raw: leg.strike_criteria,
        strike_criteria_mapped: (strikeCriteriaMap[leg.strike_criteria] || leg.strike_criteria || 'closest premium').toLowerCase(),
        strike_type_ui: leg.strike_type,
        atm_strike_mapped: leg.strike_criteria === 'closest premium' ? 'ATM' : formatStrikeTypeForBackend(leg.strike_type),
      });
      
      // DEBUG: Log what ACTUALLY gets sent to backend for premium_value
      const actualPremiumValue = (leg.strike_criteria === 'closest premium' || leg.strike_criteria === 'closest_premium')
        ? toNumber(leg.strike_value)
        : ((leg.strike_criteria === 'premium range' || leg.strike_criteria === 'premium_range') ? toNumber(leg.premium_tolerance) : 0);
      
      console.log(`[LEG ${idx}] Premium Value Logic:`, {
        strike_criteria: leg.strike_criteria,
        premium_value_sent_to_backend: actualPremiumValue,
        note: (leg.strike_criteria === 'based on points' || leg.strike_criteria === 'based_on_points' || leg.strike_criteria === 'strike_type')
          ? 'premium_value is 0 (not relevant for this criteria)' 
          : 'premium_value is used'
      });
      
      // DEBUG: Log ATM percent fields for ALL legs to diagnose empty string issue
      const atmOperatorValue = (() => {
        const direction = leg.atm_percent_direction;
        if (direction === '+') return '+';
        if (direction === '-') return '-';
        return '+';
      })();
      console.log(`[LEG ${idx}] ATM Percent Debug:`, {
        strike_criteria: leg.strike_criteria,
        atm_percent_direction_raw: leg.atm_percent_direction,
        atm_percent_direction_type: typeof leg.atm_percent_direction,
        atm_percent_direction_is_empty_string: leg.atm_percent_direction === '',
        atm_percent_direction_is_undefined: leg.atm_percent_direction === undefined,
        atm_percent_direction_is_plus: leg.atm_percent_direction === '+',
        atm_percent_direction_is_minus: leg.atm_percent_direction === '-',
        percentage_atm_operator_will_send: atmOperatorValue,
        percentage_atm_value: toNumber(leg.atm_percent_value),
      });
      
      return {
      lot_size:             toNumber(leg.lots),
      position_type:        (leg.position || 'buy').toUpperCase(),
      option_type:          (leg.option_type || 'call').toLowerCase(),
      expiry_type:          leg.expiry ? leg.expiry : '0dte',  // Explicit check for truthy value
      strike_criteria:      (strikeCriteriaMap[leg.strike_criteria] || leg.strike_criteria || 'closest premium').toLowerCase(),
      // atm_strike: Populated for "based on points" and "atm percentage"; null for closest premium and premium range
      atm_strike:           (leg.strike_criteria === 'based on points' || leg.strike_criteria === 'based_on_points' ||
                             leg.strike_criteria === 'based on atm percent' || leg.strike_criteria === 'based_on_atm_percent' ||
                             leg.strike_criteria === 'atm percentage')
                            ? formatStrikeTypeForBackend(leg.strike_type)
                            : null,
      // strike_sign: For ATM%, use atm_percent_direction; otherwise use parseStrikeType
      strike_sign:          (leg.strike_criteria === 'based on atm percent' || 
                             leg.strike_criteria === 'based_on_atm_percent' ||
                             leg.strike_criteria === 'atm percentage')
                            ? (leg.atm_percent_direction === '-' ? '-' : '+')
                            : parseStrikeType(leg.strike_type).sign,
      // premium_value: the target premium amount
      // Only relevant for specific criteria:
      // - 'closest_premium' → use leg.strike_value (the "Nearest" input field)
      // - 'premium_range' → use leg.premium_tolerance (the tolerance field)
      // - 'strike_type' or 'based_on_points' → 0 (not used)
      premium_value:        (leg.strike_criteria === 'closest premium' || leg.strike_criteria === 'closest_premium')
                              ? toNumber(leg.strike_value)
                              : ((leg.strike_criteria === 'premium range' || leg.strike_criteria === 'premium_range') ? toNumber(leg.premium_tolerance) : 0),
      // ATM percent fields - send for ALL legs (backend needs it even if not used)
      lower_range:          toNumber(leg.lower_range),
      upper_range:          toNumber(leg.upper_range),
      // multiplier_percentage: For ATM%, use atm_percent_value; otherwise use leg.multiplier_percentage
      multiplier_percentage: (leg.strike_criteria === 'based on atm percent' || 
                             leg.strike_criteria === 'based_on_atm_percent' ||
                             leg.strike_criteria === 'atm percentage')
                            ? toNumber(leg.atm_percent_value)
                            : toNumber(leg.multiplier_percentage),
      is_target:            leg.target_enabled || false,
      target_type:          normalizeType(leg.target_mode),
      target_value:         toNumber(leg.target_value),
      is_stoploss:          leg.stop_loss_enabled || false,
      stoploss_type:        normalizeType(leg.stop_loss_mode),
      stoploss_value:       toNumber(leg.stop_loss_value),
      is_trail_sl:          leg.trail_enabled || false,
      trail_sl_type:        leg.trail_enabled ? normalizeType(leg.trail_mode) : null,
      instrument_moves:     leg.trail_enabled ? toNumber(leg.trail_value) : null,
      stoploss_moves:       leg.trail_enabled ? toNumber(leg.trail_lock_value) : null,  // Use trail_lock_value for stoploss_moves
      is_reentry_sl:        leg.reentry_sl_enabled || false,
      reentry_sl_type:      leg.reentry_sl_enabled ? (reentryModeMap[leg.reentry_sl_mode] || (leg.reentry_sl_mode ? leg.reentry_sl_mode.toUpperCase() : 'RE_ASAP')) : null,
      reentry_sl_value:     leg.reentry_sl_enabled ? toNumber(leg.reentry_sl_count) : 0,
      is_reentry_target:    leg.reentry_tgt_enabled || false,
      reentry_target_type:  leg.reentry_tgt_enabled ? (reentryModeMap[leg.reentry_tgt_mode] || (leg.reentry_tgt_mode ? leg.reentry_tgt_mode.toUpperCase() : 'RE_ASAP')) : null,
      reentry_target_value: leg.reentry_tgt_enabled ? toNumber(leg.reentry_tgt_count) : 0,
      is_simple_momentum:   leg.momentum_enabled || false,
      momentum_type:        normalizeMomentumType(leg.momentum_mode),
      momentum_value:       toNumber(leg.momentum_value),
      is_range_breakout:    leg.range_enabled || false,
      range_breakout_type:  leg.range_enabled ? (leg.range_instrument === 'instrument' ? 'Instrument' : 'Underlying') : null,
      range_end_time:       leg.range_enabled ? formatTime(leg.range_time) : null,
      range_on:             leg.range_enabled ? ((leg.range_direction || 'high').charAt(0).toUpperCase() + (leg.range_direction || 'high').slice(1)) : null,
    }});

    // Build strategy object — every field from UI state, no hardcoded values
    // ? IMPORTANT: strategy_id and strategy_name MUST be FIRST TWO parameters
    
    // ? DEBUG: Log strategyId being used
    console.log('[BACKTEST PAYLOAD] ========================================');
    console.log('[BACKTEST PAYLOAD] strategyId prop:', strategyId);
    console.log('[BACKTEST PAYLOAD] strategyId type:', typeof strategyId);
    console.log('[BACKTEST PAYLOAD] config.strategy_name:', config.strategy_name);
    console.log('[BACKTEST PAYLOAD] strategySavedInSession:', strategySavedInSession);
    console.log('[BACKTEST PAYLOAD] contextVersion (from React Context):', contextVersion);
    console.log('[BACKTEST PAYLOAD] version being used:', (strategyId && strategyId !== -999 && strategyId !== '-999') ? (contextVersion || 1) : 0);
    console.log('[BACKTEST PAYLOAD] ========================================');
    
    const strategyObject = {
      // ? FIRST PARAMETER: strategy_id (from saved strategy)
      strategy_id:                     strategyId || -999,  // Use strategyId if saved, otherwise -999 for unsaved
      // ? SECOND PARAMETER: strategy_name (from saved strategy)
      strategy_name:                   config.strategy_name || `strategy_${Date.now()}`,
      // ⭐ NEW: VERSION LOGIC - Use version from React Context
      // - If strategy NOT saved (strategyId is -999 or null) → version: 0
      // - If strategy WAS saved → use version from Context (backend increments it)
      version: (strategyId && strategyId !== -999 && strategyId !== '-999') ? (contextVersion || 1) : 0,
      action:                          'save',
      symbol:                          config.symbol,
      start_date:                      config.start_date,
      end_date:                        config.end_date,
      dte_filter:                      toNumber(config.dte_filter),
      underlying_type:                 config.underlying_from === 'futures' ? 'futures' : 'option',
      is_squareoff:                    config.square_off === 'complete',
      is_trail_sl_break_even:          config.trail_to_be || false,
      trail_sl_break_even_type:        config.trail_sl_break_even_type && config.trail_sl_break_even_type !== 'na' ? normalizeType(config.trail_sl_break_even_type) : 'POINTS',
      strategy_type:                   (config.strategy_type || 'intraday').toUpperCase(),
      entry_time:                      formatTime(config.entry_time),
      entry_delay:                     0,
      exit_time:                       formatTime(config.exit_time),
      exit_delay:                      0,
      is_strategy_sl:                  config.overall_stop_loss_enabled || false,
      strategy_sl_type:                normalizeType(config.overall_stop_loss_mode),
      strategy_sl_value:               toNumber(config.overall_stop_loss_value),
      is_strategy_target:              config.overall_target_enabled || false,
      strategy_target_type:            normalizeType(config.overall_target_mode),
      strategy_target_value:           toNumber(config.overall_target_value),
      is_overall_reentry_sl:           config.overall_reentry_sl_enabled || false,
      overall_reentry_sl_type:         config.overall_reentry_sl_enabled ? (reentryModeMap[config.overall_reentry_sl_mode] || (config.overall_reentry_sl_mode ? config.overall_reentry_sl_mode.toUpperCase() : 'RE_ASAP')) : null,
      overall_reentry_sl_value:        toNumber(config.overall_reentry_sl_count),
      is_overall_reentry_target:       config.overall_reentry_tgt_enabled || false,
      overall_reentry_target_type:     config.overall_reentry_tgt_enabled ? (reentryModeMap[config.overall_reentry_tgt_mode] || (config.overall_reentry_tgt_mode ? config.overall_reentry_tgt_mode.toUpperCase() : 'RE_ASAP')) : null,
      overall_reentry_target_value:    toNumber(config.overall_reentry_tgt_count),
      is_overall_trail_sl:             config.lock_profit_enabled || false,
      overall_trail_sl_type:           config.lock_profit_enabled ? normalizeType(config.lock_profit_mode) : 'POINTS',
      overall_instrument_move:         config.lock_profit_enabled ? toNumber(config.lock_profit_value1) : 0,
      overall_stoploss_move:           config.lock_profit_enabled ? toNumber(config.lock_profit_value2) : 0,
      leg_count:                       legsArray.length,
    };

    // Final payload
    const backtestPayload = {
      strategy: strategyObject,
      legs: legsArray,
    };

    console.log('═══════════════════════════════════════════════════════');
    console.log('📤 BACKTEST PAYLOAD - DETAILED BREAKDOWN');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✓ Version (sent to backend):', backtestPayload.strategy.version); // NEW: Log version parameter
    console.log('✓ Start Date (sent to backend):', backtestPayload.strategy.start_date);
    console.log('✓ End Date (sent to backend):', backtestPayload.strategy.end_date);
    console.log('✓ Symbol:', backtestPayload.strategy.symbol);
    console.log('✓ DTE Filter:', backtestPayload.strategy.dte_filter);
    console.log('✓ Strategy Type:', backtestPayload.strategy.strategy_type);
    console.log('✓ Legs Count:', backtestPayload.legs.length);
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 COMPLETE STRATEGY OBJECT:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(JSON.stringify(backtestPayload.strategy, null, 2));
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 COMPLETE LEGS ARRAY:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(JSON.stringify(backtestPayload.legs, null, 2));
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 ATM STRIKE VALUES IN LEGS:');
    console.log('═══════════════════════════════════════════════════════');
    backtestPayload.legs.forEach((leg, idx) => {
      console.log(`Leg ${idx + 1}:`, {
        strike_criteria: leg.strike_criteria,
        atm_strike: leg.atm_strike,
        strike_sign: leg.strike_sign,
        original_strike_type: config.legs[idx]?.strike_type
      });
    });
    console.log('═══════════════════════════════════════════════════════');
    console.log('✓ Full Backtest Payload:', JSON.stringify(backtestPayload, null, 2));
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('🔍 COPY THIS PAYLOAD TO COMPARE WITH POSTMAN:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(JSON.stringify(backtestPayload));
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('🔍 LOT SIZE VALUES IN PAYLOAD:');
    console.log('═══════════════════════════════════════════════════════');
    backtestPayload.legs.forEach((leg, idx) => {
      console.log(`Leg ${idx + 1} lot_size:`, leg.lot_size, `(type: ${typeof leg.lot_size})`);
    });
    console.log('═══════════════════════════════════════════════════════');

    // Send payload to API endpoint and handle the backtest
    sendBacktestRequest(backtestPayload);
  };

  // Send backtest request — delegates to App.jsx which owns the fetch lifecycle
  const sendBacktestRequest = async (payload) => {
    try {
      console.log('[BACKTEST] ========================================');
      console.log('[BACKTEST] BACKTEST REQUEST INITIATED');
      console.log('[BACKTEST] ========================================');
      console.log('[BACKTEST] Payload Structure:', {
        strategy_fields: Object.keys(payload.strategy).length,
        leg_count: payload.legs.length,
        leg_fields_per_leg: payload.legs.length > 0 ? Object.keys(payload.legs[0]).length : 0
      });

      // Validate payload structure
      const payloadValidation = validatePayload(payload);
      if (!payloadValidation.isValid) {
        console.error('[BACKTEST] PAYLOAD VALIDATION FAILED:');
        console.error('[BACKTEST] Missing Fields:', payloadValidation.missingFields);
        console.error('[BACKTEST] Invalid Types:', payloadValidation.invalidTypes);
        alert(`Payload Validation Error:\n${payloadValidation.missingFields.join('\n')}`);
        return;
      }

      console.log('[BACKTEST] ✓ Payload validation passed');
      console.log('[BACKTEST] Complete Payload:', JSON.stringify(payload, null, 2));
      
      // ? DEBUG: Log Range Breakout parameters specifically
      console.log('[RANGE BREAKOUT] Parameters in request:');
      payload.legs.forEach((leg, index) => {
        if (leg.is_range_breakout) {
          console.log(`  Leg ${index + 1}:`, {
            is_range_breakout: leg.is_range_breakout,
            range_breakout_type: leg.range_breakout_type,
            range_end_time: leg.range_end_time,
            range_on: leg.range_on
          });
        } else {
          console.log(`  Leg ${index + 1}: Range Breakout disabled`);
        }
      });

      // Delegate to App.jsx — it owns the fetch, loading screen, and result storage
      onRunBacktest(payload);

    } catch (error) {
      console.error('[BACKTEST] CRITICAL ERROR IN BACKTEST HANDLER');
      console.error('[BACKTEST] Error:', error.message);
      alert(`Backtest Error: ${error.message}`);
    }
  };

  // ? NEW: Validate payload structure against expected schema
  const validatePayload = (payload) => {
    const missingFields = [];
    const invalidTypes = [];
    
    // Required strategy fields
    const requiredStrategyFields = [
      'action', 'strategy_name', 'symbol', 'start_date', 'end_date',
      'dte_filter', 'underlying_type', 'is_squareoff', 'is_trail_sl_break_even',
      'strategy_type', 'entry_time', 'exit_time', 'leg_count'
    ];
    
    // Required leg fields
    const requiredLegFields = [
      'lot_size', 'position_type', 'option_type', 'expiry_type',
      'strike_criteria', 'atm_strike', 'strike_sign', 'premium_value',
      'is_target', 'target_type', 'target_value',
      'is_stoploss', 'stoploss_type', 'stoploss_value',
      'is_trail_sl', 'is_reentry_sl', 'is_reentry_target',
      'is_simple_momentum', 'is_range_breakout'
    ];
    
    // Validate strategy object
    if (!payload.strategy) {
      missingFields.push('strategy: object is missing');
      return { isValid: false, missingFields, invalidTypes };
    }
    
    for (const field of requiredStrategyFields) {
      if (!(field in payload.strategy)) {
        missingFields.push(`strategy.${field}`);
      }
    }
    
    // Validate type conversions
    if (typeof payload.strategy.dte_filter !== 'number') {
      invalidTypes.push(`strategy.dte_filter should be number, got ${typeof payload.strategy.dte_filter}`);
    }
    if (typeof payload.strategy.is_squareoff !== 'boolean') {
      invalidTypes.push(`strategy.is_squareoff should be boolean, got ${typeof payload.strategy.is_squareoff}`);
    }
    
    // Validate legs array
    if (!Array.isArray(payload.legs)) {
      missingFields.push('legs: array is missing or not an array');
      return { isValid: false, missingFields, invalidTypes };
    }
    
    if (payload.legs.length === 0) {
      missingFields.push('legs: array is empty, must have at least one leg');
      return { isValid: false, missingFields, invalidTypes };
    }
    
    // Validate each leg
    for (let i = 0; i < payload.legs.length; i++) {
      const leg = payload.legs[i];
      for (const field of requiredLegFields) {
        if (!(field in leg)) {
          missingFields.push(`legs[${i}].${field}`);
        }
      }
      
      // Validate leg type conversions
      if (typeof leg.lot_size !== 'number') {
        invalidTypes.push(`legs[${i}].lot_size should be number, got ${typeof leg.lot_size}`);
      }
      if (typeof leg.is_target !== 'boolean') {
        invalidTypes.push(`legs[${i}].is_target should be boolean, got ${typeof leg.is_target}`);
      }
    }
    
    const isValid = missingFields.length === 0 && invalidTypes.length === 0;
    
    console.log('[BACKTEST] Payload Validation:', {
      isValid,
      missingFieldsCount: missingFields.length,
      invalidTypesCount: invalidTypes.length
    });
    
    return { isValid, missingFields, invalidTypes };
  };

  // Download CSV Report
  const downloadCSV = async () => {
    try {
      const response = await fetch(`${API_URL}/backtest/export-csv`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download CSV');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from response header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'backtest_report.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV download error:', error);
      let errorMsg = error.message;
      if (errorMsg.includes('No backtest results')) {
        errorMsg = 'Please run a backtest first before downloading CSV.';
      } else if (errorMsg.includes('No trades found')) {
        errorMsg = 'No trades to export. Try running backtest with different settings.';
      }
      alert('CSV Download Failed:\n\n' + errorMsg);
    }
  };

  // Download Excel Report
  const downloadExcel = async () => {
    try {
      const response = await fetch(`${API_URL}/backtest/export-excel`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download Excel');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'backtest_report.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel download error:', error);
      let errorMsg = error.message;
      if (errorMsg.includes('No backtest results')) {
        errorMsg = 'Please run a backtest first before downloading Excel.';
      } else if (errorMsg.includes('No trades found')) {
        errorMsg = 'No trades to export. Try running backtest with different settings.';
      }
      alert('Excel Download Failed:\n\n' + errorMsg);
    }
  };

  // ? NEW: Handle Compare Backtest button click
  const handleCompareBacktest = async () => {
    console.log('[Compare] ===== COMPARE BACKTEST CLICKED =====');
    console.log('[Compare] Strategy ID:', strategyId);
    console.log('[Compare] Strategy Name:', config.strategy_name);
    
    // Validate we have necessary info
    if (!strategyId || strategyId === -999 || strategyId === '-999') {
      console.error('[Compare] Invalid strategy ID:', strategyId);
      alert('⚠️ Cannot compare backtest for unsaved strategy.\n\nPlease save the strategy first before comparing.');
      return;
    }
    
    if (!config.strategy_name) {
      console.error('[Compare] Missing strategy name');
      alert('⚠️ Strategy name is missing.\n\nPlease save the strategy with a name first.');
      return;
    }
    
    try {
      setLoadingCompare(true);
      console.log('[Compare] Making API call...');
      console.log('[Compare] Request params:', { 
        strategyId, 
        strategyName: config.strategy_name 
      });
      
      const result = await compareBacktests(strategyId, config.strategy_name);
      
      console.log('[Compare] ===== API RESPONSE =====');
      console.log('[Compare] Full result:', result);
      console.log('[Compare] result.success:', result.success);
      console.log('[Compare] result.data:', result.data);
      console.log('[Compare] result.data type:', typeof result.data);
      console.log('[Compare] result.data is array:', Array.isArray(result.data));
      console.log('[Compare] result.data length:', result.data?.length);
      
      if (result.data && Array.isArray(result.data)) {
        console.log('[Compare] First item in data:', result.data[0]);
      }
      
      if (result.success) {
        console.log('[Compare] Setting compareData to:', result.data);
        setCompareData(result.data);
        console.log('[Compare] Opening sidebar...');
        setCompareSidebarOpen(true);
        console.log('[Compare] Sidebar state set to open');
      } else {
        throw new Error(result.message || 'Failed to fetch comparison data');
      }
    } catch (error) {
      console.error('[Compare] ===== ERROR =====');
      console.error('[Compare] Error object:', error);
      console.error('[Compare] Error message:', error.message);
      console.error('[Compare] Error stack:', error.stack);
      alert(`Failed to load comparison data:\n\n${error.message}`);
    } finally {
      setLoadingCompare(false);
      console.log('[Compare] ===== COMPARE BACKTEST COMPLETE =====');
    }
  };

  // Load Data — sends request params to FastAPI POST /api/load-data
  // Load Data — POST to backend, show backend response message as toast
  const loadData = async () => {
    console.log('[Load Data] Button clicked');
    console.log('[Load Data] Current config:', {
      start_date: config.start_date,
      end_date: config.end_date,
      symbol: config.symbol,
      dte_filter: config.dte_filter
    });

    // ── Validate ──────────────────────────────────────────────────────────
    if (!config.start_date || !config.end_date) {
      const errorMsg = '⚠️ Please select both Start Date and End Date before loading data';
      console.error('[Load Data]', errorMsg);
      setDataStatus(errorMsg);
      setResponsePopup({ type: 'error', title: errorMsg });
      return;
    }
    if (new Date(config.end_date) < new Date(config.start_date)) {
      const errorMsg = '⚠️ End Date must be after Start Date';
      console.error('[Load Data]', errorMsg);
      setDataStatus(errorMsg);
      setResponsePopup({ type: 'error', title: errorMsg });
      return;
    }

    console.log('[Load Data] Validation passed, starting data load...');
    setLoadingData(true);
    setDataLoaded(false);

    // ── Request payload ───────────────────────────────────────────────────
    const requestPayload = {
      start_date: config.start_date,
      end_date:   config.end_date,
      dte_type:   config.dte_filter === '0' || config.dte_filter === 0 ? '0dte' : '1dte',
      symbol:     config.symbol,
    };

    console.log('════════════════════════════════════════════════════');
    console.log('📤 LOAD DATA — REQUEST');
    console.log('URL    :', `${API_URL}/load-data`);
    console.log('Method : POST');
    console.log('Body   :', JSON.stringify(requestPayload, null, 2));
    console.log('════════════════════════════════════════════════════');

    try {
      // ── Send to backend ─────────────────────────────────────────────────
      const response = await fetch(`${API_URL}/load-data`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify(requestPayload),
      });

      // ── Parse response ──────────────────────────────────────────────────
      const rawText = await response.text();
      let result;
      try {
        result = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Server returned invalid response (HTTP ${response.status})`);
      }

      console.log('════════════════════════════════════════════════════');
      console.log('📥 LOAD DATA — RESPONSE');
      console.log('HTTP Status :', response.status);
      console.log('Body        :', JSON.stringify(result, null, 2));
      console.log('════════════════════════════════════════════════════');

      // ── Error response from backend ─────────────────────────────────────
      if (!response.ok) {
        const detail = result.detail;
        let errMsg;
        if (Array.isArray(detail) && detail.length > 0) {
          errMsg = detail.map(d => d.msg).join('; ');
        } else if (detail && typeof detail === 'object') {
          errMsg = detail.message || detail.error || JSON.stringify(detail);
        } else {
          errMsg = result.message || result.error || `Error ${response.status}`;
        }
        setDataLoaded(false);
        setRowCount(0);
        setDataStatus(`✗ ${errMsg}`);
        setResponsePopup({ type: 'error', title: errMsg });
        return;
      }

      // ── Success response from backend ───────────────────────────────────
      if (result.success) {
        const data           = result.data || {};
        const actualRowCount = typeof data.rows === 'number'         ? data.rows
                             : typeof data.record_count === 'number' ? data.record_count
                             : 0;
        const backendMessage = data.message || result.message || 'Data loaded successfully';

        if (actualRowCount === 0) {
          setDataLoaded(false);
          setRowCount(0);
          setDataStatus('⚠️ No trading days found');
          setResponsePopup({ type: 'error', title: backendMessage });
        } else {
          setDataLoaded(true);
          setRowCount(actualRowCount);
          setDataStatus(`✓ ${backendMessage}`);
          setResponsePopup({ type: 'success', title: backendMessage });
        }
      } else {
        throw new Error(result.error || result.message || 'Load failed');
      }

    } catch (error) {
      const msg = error.name === 'TypeError'
        ? 'Cannot reach server'
        : error.message;
      setDataLoaded(false);
      setRowCount(0);
      setDataStatus(`✗ ${msg}`);
      setResponsePopup({ type: 'error', title: msg });
    } finally {
      setLoadingData(false);
    }
  };

  // ── end loadData ─────────────────────────────────────────────────────────

  return (

    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="mx-12">
        
        {/* Data Selection Card */}
        <div ref={dataSelectionRef} className="bg-white rounded-lg shadow-xl border border-white mb-8 w-full animate-fade-in">
          {/* Header */}
          <div className="px-8 py-4 border-b border-slate-100 bg-white">
            <h3 className="text-lg font-bold flex items-center gap-2 uppercase" style={{ color: '#4682b4' }}>
              <Calendar size={18} style={{ color: '#4682b4' }} />
              Data Selection
            </h3>
          </div>
          
          {/* DTE Validation Error Message */}
          {dteValidationError && (
            <div className="mx-8 mt-4 px-4 py-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-red-700 font-semibold text-sm">{dteValidationError}</span>
            </div>
          )}
          
          {/* Content */}
          <div className="px-10 py-10 w-full">
            {/* Flex Layout with uniform field widths and consistent spacing */}
            <div className="flex flex-nowrap items-end gap-17">
              {/* Symbol */}
              <div className="flex-shrink-0" style={{ width: '180px' }}>
                <label className="block text-base font-semibold text-slate-700 mb-2">Symbol</label>
                <select value={config.symbol} onChange={(e) => handleChange('symbol', e.target.value)} className="w-full px-6 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-lg font-medium hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <option value="SPXW">SPXW</option>
                </select>
              </div>

              {/* DTE Filter */}
              <div className="flex-shrink-0" style={{ width: '180px' }}>
                <label className="block text-base font-semibold text-slate-700 mb-2">DTE Filter</label>
                <select value={config.dte_filter} onChange={(e) => handleChange('dte_filter', e.target.value)} className="w-full px-6 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-lg font-medium hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <option value="0">0DTE</option>
                  <option value="1">1DTE</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="flex-shrink-0" style={{ width: '180px' }}>
                <label className="block text-base font-semibold text-slate-700 mb-2">Start Date</label>
                <DateInput
                  value={config.start_date} 
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="w-full px-6 py-3 border border-slate-300 rounded-2xl bg-white text-slate-700 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer overflow-hidden hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  placeholder="dd/mm/yyyy"
                />
              </div>

              {/* End Date */}
              <div className="flex-shrink-0" style={{ width: '180px' }}>
                <label className="block text-base font-semibold text-slate-700 mb-2">End Date</label>
                <DateInput
                  value={config.end_date} 
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className="w-full px-6 py-3 border border-slate-300 rounded-2xl bg-white text-slate-700 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer overflow-hidden hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  placeholder="dd/mm/yyyy"
                />
              </div>

              {/* Load Data Button */}
              <div className="flex flex-col gap-1 flex-shrink-0" style={{ width: '180px' }}>
              <button 
                onClick={loadData}
                disabled={loadingData}
                className={`w-full px-6 py-3 rounded-2xl font-bold text-lg transition-all duration-200 shadow-md border hover:shadow-xl hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-95 text-white ${
                  dataLoaded 
                    ? 'bg-green-600 hover:bg-green-700 border-green-700' 
                    : 'border-blue-700'
                } disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-md`}
                style={!dataLoaded ? { backgroundColor: '#4682b4' } : {}}
              >
                {loadingData ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : dataLoaded ? '✓ Loaded' : 'Load Data'}
              </button>
              </div>

            </div>

          </div>
        </div>

      {/* Instrument Settings - Full Width */}
      <div className="bg-white rounded-lg shadow-xl border border-white mb-8 animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          <h3 className="text-lg font-bold flex items-center gap-2 uppercase" style={{ color: '#4682b4' }}>
            <Info size={18} style={{ color: '#4682b4' }} />
            Instrument Settings
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-17">
            {/* Underlying From */}
            <div className="flex items-center gap-4">
              <label className="text-base font-semibold text-slate-700">Underlying From</label>
              <div className="flex gap-2">
                {['cash', 'futures'].map(type => (
                  <button 
                    key={type} 
                    onClick={() => handleChange('underlying_from', type)} 
                    className={`px-6 py-2 text-sm font-bold rounded-lg border hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 ${
                      config.underlying_from === type 
                        ? 'text-white border-blue-700' 
                        : 'bg-white text-slate-800 border-slate-300'
                    }`}
                    style={config.underlying_from === type ? { backgroundColor: '#4682b4' } : {}}
                  >
                    {type === 'cash' ? 'Cash' : 'Futures'}
                  </button>
                ))}
              </div>
            </div>

            {/* Square Off */}
            <div className="flex items-center gap-4">
              <label className="text-base font-semibold text-slate-700">Square Off</label>
              <div className="flex gap-2">
                {['partial', 'complete'].map(type => (
                  <button 
                    key={type} 
                    onClick={() => handleChange('square_off', type)} 
                    className={`px-6 py-2 text-sm font-bold rounded-lg border hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 ${
                      config.square_off === type 
                        ? 'text-white border-blue-700' 
                        : 'bg-white text-slate-800 border-slate-300'
                    }`}
                    style={config.square_off === type ? { backgroundColor: '#4682b4' } : {}}
                  >
                    {type === 'partial' ? 'Partial' : 'Complete'}
                  </button>
                ))}
              </div>
            </div>

            {/* Trail SL to Break-even - Inline without card */}
            <div className="flex items-center justify-between gap-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <label className="text-base font-semibold text-slate-700">Trail SL to Break Even</label>
                <Info size={18} className="text-blue-400" />
              </div>
              <ToggleSwitch 
                checked={config.trail_to_be || false}
                onChange={(e) => handleChange('trail_to_be', e.target.checked)}
                id="trailToBreakEven"
              />
            </div>

            {/* All Legs / SL Legs scope toggle - only relevant once Trail SL to Break Even is on */}
            {config.trail_to_be && (
              <div className="flex items-center justify-between gap-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-slate-700">Trail Scope</span>
                  <span className={`text-sm font-semibold transition-colors ${
                    (config.trail_to_be_scope || 'all_legs') === 'all_legs' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    All Legs
                  </span>
                  <ToggleSwitch
                    checked={(config.trail_to_be_scope || 'all_legs') === 'sl_legs'}
                    onChange={(e) => handleChange('trail_to_be_scope', e.target.checked ? 'sl_legs' : 'all_legs')}
                    id="trailToBreakEvenScope"
                  />
                  <span className={`text-sm font-semibold transition-colors ${
                    config.trail_to_be_scope === 'sl_legs' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    SL Legs
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Entry Settings - Full Width */}
      <div className="bg-white rounded-lg shadow-xl border border-white mb-8 animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          <h3 className="text-lg font-bold flex items-center gap-2 uppercase" style={{ color: '#4682b4' }}>
            <Clock size={18} style={{ color: '#4682b4' }} />
            Entry Settings
          </h3>
        </div>

        {/* Content - Full Width Layout */}
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-17">
            {/* Strategy Type - Dropdown Select */}
            <div className="flex items-center gap-6 relative">
              <label className="text-base font-semibold text-slate-700 whitespace-nowrap">Strategy Type</label>
              <select 
                value={config.strategy_type || 'intraday'}
                onChange={(e) => handleChange('strategy_type', e.target.value)}
                className="px-6 py-3 border border-slate-300 rounded-2xl bg-white text-slate-700 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer w-40 appearance-none pr-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234b5563' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center'
                }}
              >
                <option value="intraday">Intraday</option>
                <option value="btst">BTST</option>
                <option value="sequential">Sequential</option>
              </select>
            </div>

            {/* Entry Time */}
            {config.strategy_type !== 'sequential' && (
              <div className="flex items-center gap-6">
                <label className="text-base font-semibold text-slate-700 whitespace-nowrap">Entry Time (UTC)</label>
                <input 
                  ref={entryTimeRef}
                  type="text" 
                  value={config.entry_time} 
                  onChange={(e) => handleTimeInput(e.target.value, 'entry_time', entryTimeRef)} 
                  placeholder="13:30" 
                  className="px-4 py-3 text-lg border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent w-20 font-medium bg-white hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" 
                />
              </div>
            )}

            {/* Exit Time */}
            {config.strategy_type !== 'sequential' && (
              <div className="flex items-center gap-6">
                <label className="text-base font-semibold text-slate-700 whitespace-nowrap">Exit Time (UTC)</label>
                <input 
                  ref={exitTimeRef}
                  type="text" 
                  value={config.exit_time} 
                  onChange={(e) => handleTimeInput(e.target.value, 'exit_time', exitTimeRef)} 
                  placeholder="20:00" 
                  className="px-4 py-3 text-lg border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent w-20 font-medium bg-white hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LEG BUILDER - WITH MARGIN WRAPPER */}
      <div className="mx-0 px-0 w-full">
        {/* LEG BUILDER - MEDIUM SIZE CONTAINER */}
        <div className="w-full bg-white rounded-lg shadow-xl border border-white mb-8">
        <div className="px-6 py-6 bg-white rounded-t-lg">
          <h3 className="text-2xl font-bold mb-4 whitespace-nowrap overflow-visible" style={{ color: '#4682b4' }}>LEG BUILDER</h3>
          
          {/* Select Segments Section */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-300">
            <span className="text-base font-semibold text-slate-700">Select Segments</span>
            <button className="px-5 py-2 text-white rounded text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-95 transition-all duration-200" style={{ backgroundColor: '#4682b4' }}>
              Options
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Row 1: Total Lot / Expiry / Position / Option Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-17">
            {/* Total Lot */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700 mb-1">Total Lot</label>
              <input 
                type="number" 
                min="0"
                step="1"
                value={currentLeg.lots} 
                onChange={(e) => handleLegChange('lots', e.target.value)} 
                onFocus={handleNumberFocus}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
              />
            </div>

            {/* Expiry */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700 mb-1">Expiry</label>
              <select 
                value={currentLeg.expiry} 
                onChange={(e) => handleLegChange('expiry', e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="0dte">0DTE</option>
                <option value="1dte">1DTE</option>
              </select>
            </div>

            {/* Position */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700 mb-1">Position</label>
              <div className="flex gap-0.5 bg-gray-200 rounded-lg p-0.5">
                <button
                  onClick={() => handleLegChange('position', 'buy')}
                  className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                    currentLeg.position === 'buy'
                      ? 'text-white shadow-sm'
                      : 'bg-transparent text-gray-600'
                  }`}
                  style={currentLeg.position === 'buy' ? { backgroundColor: '#4682b4' } : {}}
                >
                  Buy
                </button>
                <button
                  onClick={() => handleLegChange('position', 'sell')}
                  className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                    currentLeg.position === 'sell'
                      ? 'text-white shadow-sm'
                      : 'bg-transparent text-gray-600'
                  }`}
                  style={currentLeg.position === 'sell' ? { backgroundColor: '#4682b4' } : {}}
                >
                  Sell
                </button>
              </div>
            </div>

            {/* Option Type */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700 mb-1">Option Type</label>
              <div className="flex gap-0.5 bg-gray-200 rounded-lg p-0.5">
                <button
                  onClick={() => handleLegChange('option_type', 'call')}
                  className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                    currentLeg.option_type === 'call'
                      ? 'text-white shadow-sm'
                      : 'bg-transparent text-gray-600'
                  }`}
                  style={currentLeg.option_type === 'call' ? { backgroundColor: '#4682b4' } : {}}
                >
                  Call
                </button>
                <button
                  onClick={() => handleLegChange('option_type', 'put')}
                  className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                    currentLeg.option_type === 'put'
                      ? 'text-white shadow-sm'
                      : 'bg-transparent text-gray-600'
                  }`}
                  style={currentLeg.option_type === 'put' ? { backgroundColor: '#4682b4' } : {}}
                >
                  Put
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Strike Criteria / Nearest (or ATM Strike) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-17">
            {/* Strike Criteria */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                Strike Criteria
                <Info size={12} className="text-slate-400" />
              </label>
              <select 
                value={currentLeg.strike_criteria} 
                onChange={(e) => handleLegChange('strike_criteria', e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-semibold text-gray-700 hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="based on points">Based On Strike</option>
                <option value="based on atm percent">Based On ATM %</option>
                <option value="based on premium range">Based On premium range</option>
                <option value="closest premium">Based On Closest Premium</option>
              </select>
            </div>

            {/* ATM Strike - Only show when Strike Criteria is "Based On Points" */}
            {currentLeg.strike_criteria === 'based on points' && (
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700 mb-1">ATM Strike</label>
              <StrikeSelector
                value={currentLeg.strike_type || 'atm'}
                onChange={(value) => handleLegChange('strike_type', value)}
              />
              <select
                style={{display: 'none'}}
                value={currentLeg.strike_type || 'atm'}
                onChange={(e) => handleLegChange('strike_type', e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="itm_20">ITM-20</option>
                <option value="itm_19">ITM-19</option>
                <option value="itm_18">ITM-18</option>
                <option value="itm_17">ITM-17</option>
                <option value="itm_16">ITM-16</option>
                <option value="itm_15">ITM-15</option>
                <option value="itm_14">ITM-14</option>
                <option value="itm_13">ITM-13</option>
                <option value="itm_12">ITM-12</option>
                <option value="itm_11">ITM-11</option>
                <option value="itm_10">ITM-10</option>
                <option value="itm_9">ITM-9</option>
                <option value="itm_8">ITM-8</option>
                <option value="itm_7">ITM-7</option>
                <option value="itm_6">ITM-6</option>
                <option value="itm_5">ITM-5</option>
                <option value="itm_4">ITM-4</option>
                <option value="itm_3">ITM-3</option>
                <option value="itm_2">ITM-2</option>
                <option value="itm_1">ITM-1</option>
                <option value="atm">ATM</option>
                <option value="otm_1">OTM-1</option>
                <option value="otm_2">OTM-2</option>
                <option value="otm_3">OTM-3</option>
                <option value="otm_4">OTM-4</option>
                <option value="otm_5">OTM-5</option>
                <option value="otm_6">OTM-6</option>
                <option value="otm_7">OTM-7</option>
                <option value="otm_8">OTM-8</option>
                <option value="otm_9">OTM-9</option>
                <option value="otm_10">OTM-10</option>
                  <option value="otm_11">OTM-11</option>
                  <option value="otm_12">OTM-12</option>
                  <option value="otm_13">OTM-13</option>
                  <option value="otm_14">OTM-14</option>
                  <option value="otm_15">OTM-15</option>
                  <option value="otm_16">OTM-16</option>
                  <option value="otm_17">OTM-17</option>
                  <option value="otm_18">OTM-18</option>
                  <option value="otm_19">OTM-19</option>
                  <option value="otm_20">OTM-20</option>
                    <option value="otm_2">OTM-2</option>
                    <option value="otm_3">OTM-3</option>
                    <option value="otm_4">OTM-4</option>
                    <option value="otm_5">OTM-5</option>
                    <option value="otm_6">OTM-6</option>
                    <option value="otm_7">OTM-7</option>
                    <option value="otm_8">OTM-8</option>
                    <option value="otm_9">OTM-9</option>
                    <option value="otm_10">OTM-10</option>
                    <option value="otm_11">OTM-11</option>
                    <option value="otm_12">OTM-12</option>
                    <option value="otm_13">OTM-13</option>
                    <option value="otm_14">OTM-14</option>
                    <option value="otm_15">OTM-15</option>
                    <option value="otm_16">OTM-16</option>
                    <option value="otm_17">OTM-17</option>
                    <option value="otm_18">OTM-18</option>
                    <option value="otm_19">OTM-19</option>
                    <option value="otm_20">OTM-20</option>
                  </select>
              </div>
            )}

            {/* ATM % - Only show when Strike Criteria is "Based On ATM %" */}
            {currentLeg.strike_criteria === 'based on atm percent' && (
              <div className="flex gap-2 items-end">
                <div className="flex flex-col" style={{ width: '30%' }}>
                  <label className="text-xs font-semibold text-slate-700 mb-1">ATM</label>
                  <select
                    value={currentLeg.atm_percent_direction || '+'}
                    onChange={(e) => handleLegChange('atm_percent_direction', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="+">+</option>
                    <option value="-">-</option>
                  </select>
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-xs font-semibold text-slate-700 mb-1">%</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={currentLeg.atm_percent_value ?? ''} 
                      onChange={(e) => handleLegChange('atm_percent_value', e.target.value)}
                      onFocus={handleNumberFocus}
                      className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder=""
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Nearest - Only show when Strike Criteria is "Based On Closest Premium" */}
            {currentLeg.strike_criteria === 'closest premium' && (
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-700 mb-1">Nearest</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={currentLeg.closest_premium_value ?? ''} 
                  onChange={(e) => handleLegChange('closest_premium_value', e.target.value)}
                  onFocus={handleNumberFocus}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder=""
                />
              </div>
            )}

            {/* Premium Range - Only show when Strike Criteria is "Based On premium range" */}
            {currentLeg.strike_criteria === 'based on premium range' && (
              <div className="flex gap-5">
                <div className="flex flex-col flex-1">
                  <label className="text-xs font-semibold text-slate-700 mb-1">Lower Range</label>
                  <input 
                    type="number" 
                    value={currentLeg.lower_range ?? ''} 
                    onChange={(e) => handleLegChange('lower_range', e.target.value)}
                    onFocus={handleNumberFocus}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder=""
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-xs font-semibold text-slate-700 mb-1">Upper Range</label>
                  <input 
                    type="number" 
                    value={currentLeg.upper_range ?? ''} 
                    onChange={(e) => handleLegChange('upper_range', e.target.value)}
                    onFocus={handleNumberFocus}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder=""
                    step="0.01"
                  />
                </div>
              </div>
            )}

            {/* Premium - Only show when Strike Criteria is "Premium >=" or "Premium <=" */}
            {(currentLeg.strike_criteria === 'premium_gte' || currentLeg.strike_criteria === 'premium_lte') && (
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-700 mb-1">Premium</label>
                <input 
                  type="number" 
                  value={currentLeg.premium_value ?? ''} 
                  onChange={(e) => handleLegChange('premium_value', e.target.value)}
                  onFocus={handleNumberFocus}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="0"
                  step="0.01"
                />
              </div>
            )}
          </div>

          {/* Add Leg Button */}
          <div className="flex justify-start mt-6">
            <button 
              onClick={addLeg} 
              className="px-5 py-2 text-white rounded text-base font-semibold hover:shadow-lg active:scale-95 transition-transform duration-75"
              style={{ backgroundColor: '#4682b4' }}
            >
              Add Leg
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>

      {/* ADDED LEGS - STRUCTURED LAYOUT MATCHING LEG BUILDER DESIGN */}
      {config.legs.length > 0 && (
        <div className="mx-12">
          {config.legs.map((leg, legIndex) => (
            <div key={leg.id} className="w-full bg-white rounded-lg shadow-xl border border-white overflow-hidden mb-8 animate-fade-in">
              {/* Header */}
              <div className="px-6 bg-white border-b border-gray-300" style={{ paddingTop: '25px', paddingBottom: '25px' }}>
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold uppercase" style={{ color: '#4682b4' }}>LEG#{legIndex + 1}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { const updated = [...config.legs]; updated.splice(legIndex + 1, 0, { ...leg, id: Date.now() }); setConfig({ ...config, legs: updated }); }}
                      className="p-1.5 bg-blue-50 text-blue-500 hover:bg-blue-100 hover:scale-125 active:scale-90 rounded transition-all duration-200"
                      title="Duplicate leg"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => removeLeg(leg.id)}
                      className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 hover:scale-125 active:scale-90 rounded transition-all duration-200"
                      title="Remove leg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-8" style={{ paddingLeft: '25px', paddingRight: '25px', paddingTop: '26px', paddingBottom: '26px' }}>
                {/* Row 1: Total Lot / Expiry / Position / Option Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-17">
                  {/* Total Lot */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 mb-1">Total Lot</label>
                    <input 
                      type="number" 
                      min="0"
                      step="1"
                      value={leg.lots} 
                      onChange={(e) => { 
                        const val = Number(e.target.value);
                        if (val < 0) {
                          setResponsePopup({ type: 'error', title: 'Total Lot cannot be negative' });
                          return;
                        }
                        updateLegInPlace(legIndex, { lots: val }); 
                      }} 
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      placeholder="1"
                    />
                  </div>

                  {/* Expiry */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 mb-1">Expiry</label>
                    <select 
                      value={leg.expiry} 
                      onChange={(e) => updateLegInPlace(legIndex, { expiry: e.target.value })} 
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="0dte">0DTE</option>
                      <option value="1dte">1DTE</option>
                    </select>
                  </div>

                  {/* Position */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 mb-1">Position</label>
                    <div className="flex gap-0.5 bg-gray-200 rounded-lg p-0.5">
                      <button
                        onClick={() => updateLegInPlace(legIndex, { position: 'buy' })}
                        className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                          leg.position === 'buy'
                            ? 'text-white shadow-sm'
                            : 'bg-transparent text-gray-600'
                        }`}
                        style={leg.position === 'buy' ? { backgroundColor: '#4682b4' } : {}}
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => updateLegInPlace(legIndex, { position: 'sell' })}
                        className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                          leg.position === 'sell'
                            ? 'text-white shadow-sm'
                            : 'bg-transparent text-gray-600'
                        }`}
                        style={leg.position === 'sell' ? { backgroundColor: '#4682b4' } : {}}
                      >
                        Sell
                      </button>
                    </div>
                  </div>

                  {/* Option Type */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 mb-1">Option Type</label>
                    <div className="flex gap-0.5 bg-gray-200 rounded-lg p-0.5">
                      <button
                        onClick={() => updateLegInPlace(legIndex, { option_type: 'call' })}
                        className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                          leg.option_type === 'call'
                            ? 'text-white shadow-sm'
                            : 'bg-transparent text-gray-600'
                        }`}
                        style={leg.option_type === 'call' ? { backgroundColor: '#4682b4' } : {}}
                      >
                        Call
                      </button>
                      <button
                        onClick={() => updateLegInPlace(legIndex, { option_type: 'put' })}
                        className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                          leg.option_type === 'put'
                            ? 'text-white shadow-sm'
                            : 'bg-transparent text-gray-600'
                        }`}
                        style={leg.option_type === 'put' ? { backgroundColor: '#4682b4' } : {}}
                      >
                        Put
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Strike Criteria / Nearest (or ATM Strike) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-17">
                  {/* Strike Criteria */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      Strike Criteria
                      <Info size={12} className="text-slate-400" />
                    </label>
                    <select 
                      value={leg.strike_criteria} 
                      onChange={(e) => updateLegInPlace(legIndex, { strike_criteria: e.target.value })} 
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-semibold text-gray-700 hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="based on points">Based On Strike</option>
                      <option value="based on atm percent">Based On ATM %</option>
                      <option value="based on premium range">Based On premium range</option>
                      <option value="closest premium">Based On Closest Premium</option>
                    </select>
                  </div>

                  {/* Nearest - Only show when Based On Closest Premium is selected */}
                  {leg.strike_criteria === 'closest premium' && (
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-700 mb-1">Nearest</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={leg.strike_value ?? ''} 
                        onChange={(e) => { 
                          const val = e.target.value;
                          if (val !== '' && Number(val) < 0) {
                            setResponsePopup({ type: 'error', title: 'Nearest value cannot be negative' });
                            return;
                          }
                          const updated = [...config.legs]; 
                          updated[legIndex] = {...leg, strike_value: val}; 
                          setConfig({...config, legs: updated}); 
                        }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {/* ATM Strike - Only show when Strike Criteria is "Based On Points" */}
                  {leg.strike_criteria === 'based on points' && (
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 mb-1">ATM Strike</label>
                    <StrikeSelector
                      value={leg.strike_type || 'atm'}
                      onChange={(value) => updateLegInPlace(legIndex, { strike_type: value })}
                    />
                    <select
                      style={{display: 'none'}}
                      value={leg.strike_type || 'atm'}
                      onChange={(e) => { const updated = [...config.legs]; updated[legIndex] = {...leg, strike_type: e.target.value}; setConfig({...config, legs: updated}); }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="itm_20">ITM-20</option>
                      <option value="itm_19">ITM-19</option>
                      <option value="itm_18">ITM-18</option>
                      <option value="itm_17">ITM-17</option>
                      <option value="itm_16">ITM-16</option>
                      <option value="itm_15">ITM-15</option>
                      <option value="itm_14">ITM-14</option>
                      <option value="itm_13">ITM-13</option>
                      <option value="itm_12">ITM-12</option>
                      <option value="itm_11">ITM-11</option>
                      <option value="itm_10">ITM-10</option>
                      <option value="itm_9">ITM-9</option>
                      <option value="itm_8">ITM-8</option>
                      <option value="itm_7">ITM-7</option>
                      <option value="itm_6">ITM-6</option>
                      <option value="itm_5">ITM-5</option>
                      <option value="itm_4">ITM-4</option>
                      <option value="itm_3">ITM-3</option>
                      <option value="itm_2">ITM-2</option>
                      <option value="itm_1">ITM-1</option>
                      <option value="atm">ATM</option>
                      <option value="otm_1">OTM-1</option>
                      <option value="otm_2">OTM-2</option>
                      <option value="otm_3">OTM-3</option>
                      <option value="otm_4">OTM-4</option>
                      <option value="otm_5">OTM-5</option>
                      <option value="otm_6">OTM-6</option>
                      <option value="otm_7">OTM-7</option>
                      <option value="otm_8">OTM-8</option>
                      <option value="otm_9">OTM-9</option>
                      <option value="otm_10">OTM-10</option>
                      <option value="otm_11">OTM-11</option>
                      <option value="otm_12">OTM-12</option>
                      <option value="otm_13">OTM-13</option>
                      <option value="otm_14">OTM-14</option>
                      <option value="otm_15">OTM-15</option>
                      <option value="otm_16">OTM-16</option>
                      <option value="otm_17">OTM-17</option>
                      <option value="otm_18">OTM-18</option>
                      <option value="otm_19">OTM-19</option>
                      <option value="otm_20">OTM-20</option>
                    </select>
                  </div>
                  )}

                  {/* ATM % - Only show when Strike Criteria is "Based On ATM %" */}
                  {leg.strike_criteria === 'based on atm percent' && (
                    <div className="flex gap-2 items-end">
                      <div className="flex flex-col" style={{ width: '30%' }}>
                        <label className="text-xs font-semibold text-slate-700 mb-1">ATM</label>
                        <select
                          value={leg.atm_percent_direction || '+'}
                          onChange={(e) => { const updated = [...config.legs]; updated[legIndex] = {...leg, atm_percent_direction: e.target.value}; setConfig({...config, legs: updated}); }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </select>
                      </div>
                      <div className="flex flex-col flex-1">
                        <label className="text-xs font-semibold text-slate-700 mb-1">%</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={leg.atm_percent_value ?? ''} 
                            onChange={(e) => { 
                              const val = e.target.value;
                              if (val !== '' && Number(val) < 0) {
                                setResponsePopup({ type: 'error', title: 'ATM % value cannot be negative' });
                                return;
                              }
                              const updated = [...config.legs]; 
                              updated[legIndex] = {...leg, atm_percent_value: val}; 
                              setConfig({...config, legs: updated}); 
                            }}
                            className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="0.00"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600">%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Premium Range - Only show when Strike Criteria is "Based On premium range" */}
                  {leg.strike_criteria === 'based on premium range' && (
                    <div className="flex gap-5">
                      <div className="flex flex-col flex-1">
                        <label className="text-xs font-semibold text-slate-700 mb-1">Lower Range</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          value={leg.lower_range ?? ''} 
                          onChange={(e) => { 
                            const val = e.target.value;
                            if (val !== '' && Number(val) < 0) {
                              setResponsePopup({ type: 'error', title: 'Lower Range cannot be negative' });
                              return;
                            }
                            const updated = [...config.legs]; 
                            updated[legIndex] = {...leg, lower_range: val}; 
                            setConfig({...config, legs: updated}); 
                          }}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex flex-col flex-1">
                        <label className="text-xs font-semibold text-slate-700 mb-1">Upper Range</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          value={leg.upper_range ?? ''} 
                          onChange={(e) => { 
                            const val = e.target.value;
                            if (val !== '' && Number(val) < 0) {
                              setResponsePopup({ type: 'error', title: 'Upper Range cannot be negative' });
                              return;
                            }
                            const updated = [...config.legs]; 
                            updated[legIndex] = {...leg, upper_range: val}; 
                            setConfig({...config, legs: updated}); 
                          }}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}

                  {/* Premium - Only show when Strike Criteria is "Premium >=" or "Premium <=" */}
                  {(leg.strike_criteria === 'premium_gte' || leg.strike_criteria === 'premium_lte') && (
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-700 mb-1">Premium</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={leg.premium_value ?? ''} 
                        onChange={(e) => { 
                          const val = e.target.value;
                          if (val !== '' && Number(val) < 0) {
                            setResponsePopup({ type: 'error', title: 'Premium cannot be negative' });
                            return;
                          }
                          const updated = [...config.legs]; 
                          updated[legIndex] = {...leg, premium_value: val}; 
                          setConfig({...config, legs: updated}); 
                        }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Target / Stop Loss / Trail SL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col space-y-2" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Target</label>
                    <ToggleSwitch 
                      checked={leg.target_enabled || false} 
                      onChange={(e) => updateLegInPlace(legIndex, { target_enabled: e.target.checked })}
                      id={`target-${legIndex}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select value={leg.target_mode || 'points'} onChange={(e) => updateLegInPlace(legIndex, { target_mode: e.target.value })} disabled={!leg.target_enabled} className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50">
                      <option value="points">Points</option>
                      <option value="percentage">Percentage</option>
                      <option value="underlying_points">Underlying Points</option>
                      <option value="underlying_percentage">Underlying Percentage</option>
                    </select>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={leg.target_value || ''} 
                      onChange={(e) => { 
                        const val = e.target.value;
                        if (val !== '' && Number(val) < 0) {
                          setResponsePopup({ type: 'error', title: 'Target value cannot be negative' });
                          return;
                        }
                        updateLegInPlace(legIndex, { target_value: val }); 
                      }} 
                      disabled={!leg.target_enabled} 
                      className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Stop Loss</label>
                    <ToggleSwitch 
                      checked={leg.stop_loss_enabled || false} 
                      onChange={(e) => updateLegInPlace(legIndex, { stop_loss_enabled: e.target.checked })}
                      id={`stopLoss-${legIndex}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select value={leg.stop_loss_mode || 'points'} onChange={(e) => updateLegInPlace(legIndex, { stop_loss_mode: e.target.value })} disabled={!leg.stop_loss_enabled} className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50">
                      <option value="points">Points</option>
                      <option value="percentage">Percentage</option>
                      <option value="underlying_points">Underlying Points</option>
                      <option value="underlying_percentage">Underlying Percentage</option>
                    </select>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={leg.stop_loss_value || ''} 
                      onChange={(e) => { 
                        const val = e.target.value;
                        if (val !== '' && Number(val) < 0) {
                          setResponsePopup({ type: 'error', title: 'Stop Loss value cannot be negative' });
                          return;
                        }
                        updateLegInPlace(legIndex, { stop_loss_value: val }); 
                      }} 
                      disabled={!leg.stop_loss_enabled} 
                      className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Trail SL</label>
                    <Info size={14} className="text-gray-400" />
                    <ToggleSwitch 
                      checked={leg.trail_enabled || false} 
                      onChange={(e) => {
                        // Validate: Stop Loss must be enabled first
                        if (e.target.checked && !leg.stop_loss_enabled) {
                          setResponsePopup({ 
                            type: 'error', 
                            title: `Leg #${legIndex + 1} Stop Loss must be selected first.` 
                          });
                          return;
                        }
                        updateLegInPlace(legIndex, { trail_enabled: e.target.checked });
                      }}
                      id={`trailSL-${legIndex}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select value={leg.trail_mode || 'points'} onChange={(e) => updateLegInPlace(legIndex, { trail_mode: e.target.value })} disabled={!leg.trail_enabled} className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50">
                      <option value="points">Points</option>
                      <option value="percentage">Percentage</option>
                    </select>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={leg.trail_value || ''} 
                      onChange={(e) => { 
                        const val = e.target.value;
                        if (val !== '' && Number(val) < 0) {
                          setResponsePopup({ type: 'error', title: 'Trail value cannot be negative' });
                          return;
                        }
                        const updated = [...config.legs]; 
                        updated[legIndex] = {...leg, trail_value: val}; 
                        setConfig({...config, legs: updated}); 
                      }} 
                      disabled={!leg.trail_enabled} 
                      className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50" 
                      placeholder="0.00" 
                    />
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={leg.trail_lock_value || ''} 
                      onChange={(e) => { 
                        const val = e.target.value;
                        if (val !== '' && Number(val) < 0) {
                          setResponsePopup({ type: 'error', title: 'Trail lock value cannot be negative' });
                          return;
                        }
                        const updated = [...config.legs]; 
                        updated[legIndex] = {...leg, trail_lock_value: val}; 
                        setConfig({...config, legs: updated}); 
                      }} 
                      disabled={!leg.trail_enabled} 
                      className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Re-Entry On Target / Re-Entry On SL / Simple Momentum */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                <div className="flex flex-col space-y-2" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Re-Entry On Target</label>
                    <ToggleSwitch 
                      checked={leg.reentry_tgt_enabled || false} 
                      onChange={(e) => {
                        // Validate: Target must be enabled first
                        if (e.target.checked && !leg.target_enabled) {
                          setResponsePopup({ 
                            type: 'error', 
                            title: `Leg #${legIndex + 1} Target must be selected first.` 
                          });
                          return;
                        }
                        updateLegInPlace(legIndex, { reentry_tgt_enabled: e.target.checked });
                      }}
                      id={`reentryTarget-${legIndex}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={leg.reentry_tgt_mode || 're_cost'} 
                      onChange={(e) => { const updated = [...config.legs]; updated[legIndex] = {...leg, reentry_tgt_mode: e.target.value}; setConfig({...config, legs: updated}); }} 
                      disabled={!leg.reentry_tgt_enabled} 
                      className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                    >
                      <option value="re_asap">RE ASAP</option>
                      <option value="re_asap_reverse">RE ASAP REV</option>
                      <option value="re_momentum" disabled={!leg.momentum_enabled}>RE MOMENTUM</option>
                      <option value="re_momentum_reverse" disabled={!leg.momentum_enabled}>RE MOMENTUM REV</option>
                      <option value="re_cost">RE COST</option>
                      <option value="re_cost_reverse">RE COST REV</option>
                    </select>
                    <input 
                      type="number" 
                      min="0"
                      step="1"
                      value={leg.reentry_tgt_count ?? '0'} 
                      onChange={(e) => { 
                        const val = e.target.value;
                        // Check for decimal values
                        if (val !== '' && val.includes('.')) {
                          setResponsePopup({ type: 'error', title: 'Re-Entry count must be a whole number' });
                          return;
                        }
                        if (val !== '' && Number(val) < 0) {
                          setResponsePopup({ type: 'error', title: 'Re-Entry count cannot be negative' });
                          return;
                        }
                        const updated = [...config.legs]; 
                        updated[legIndex] = {...leg, reentry_tgt_count: val}; 
                        setConfig({...config, legs: updated}); 
                      }} 
                      disabled={!leg.reentry_tgt_enabled} 
                      className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50" 
                      placeholder="1.00" 
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Re-Entry On SL</label>
                    <ToggleSwitch 
                      checked={leg.reentry_sl_enabled || false} 
                      onChange={(e) => {
                        // Validate: Stop Loss must be enabled first
                        if (e.target.checked && !leg.stop_loss_enabled) {
                          setResponsePopup({ 
                            type: 'error', 
                            title: `Leg #${legIndex + 1} Stop Loss must be selected first.` 
                          });
                          return;
                        }
                        updateLegInPlace(legIndex, { reentry_sl_enabled: e.target.checked });
                      }}
                      id={`reentrySL-${legIndex}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={leg.reentry_sl_mode || 're_cost'} 
                      onChange={(e) => { const updated = [...config.legs]; updated[legIndex] = {...leg, reentry_sl_mode: e.target.value}; setConfig({...config, legs: updated}); }} 
                      disabled={!leg.reentry_sl_enabled} 
                      className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                    >
                      <option value="re_asap">RE ASAP</option>
                      <option value="re_asap_reverse">RE ASAP REV</option>
                      <option value="re_momentum" disabled={!leg.momentum_enabled}>RE MOMENTUM</option>
                      <option value="re_momentum_reverse" disabled={!leg.momentum_enabled}>RE MOMENTUM REV</option>
                      <option value="re_cost">RE COST</option>
                      <option value="re_cost_reverse">RE COST REV</option>
                    </select>
                    <input 
                      type="number" 
                      min="0"
                      step="1"
                      value={leg.reentry_sl_count ?? '0'} 
                      onChange={(e) => { 
                        const val = e.target.value;
                        if (val !== '' && val.includes('.')) {
                          setResponsePopup({ type: 'error', title: 'Re-Entry count must be a whole number' });
                          return;
                        }
                        if (val !== '' && Number(val) < 0) {
                          setResponsePopup({ type: 'error', title: 'Re-Entry count cannot be negative' });
                          return;
                        }
                        const updated = [...config.legs]; 
                        updated[legIndex] = {...leg, reentry_sl_count: val}; 
                        setConfig({...config, legs: updated}); 
                      }} 
                      disabled={!leg.reentry_sl_enabled} 
                      className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50" 
                      placeholder="1.00" 
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2 relative" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Simple Momentum</label>
                    <Info size={14} className="text-gray-400" />
                    <ToggleSwitch 
                      checked={leg.momentum_enabled || false} 
                      onChange={(e) => { 
                        // Check if Range Break Out is already enabled
                        if (e.target.checked && leg.range_enabled) {
                          // Prevent enabling and show error message
                          setLegValidationErrors(prev => ({
                            ...prev,
                            [`momentum-${legIndex}`]: 'Please disable Range Break Out first.'
                          }));
                          // Auto-hide after 3 seconds
                          setTimeout(() => {
                            setLegValidationErrors(prev => {
                              const updated = {...prev};
                              delete updated[`momentum-${legIndex}`];
                              return updated;
                            });
                          }, 3000);
                          return;
                        }
                        // Clear error message if any
                        setLegValidationErrors(prev => {
                          const updated = {...prev};
                          delete updated[`momentum-${legIndex}`];
                          return updated;
                        });
                        
                        // If disabling momentum, reset re-entry modes if they're set to momentum options
                        const updated = [...config.legs];
                        const updatedLeg = {...leg, momentum_enabled: e.target.checked};
                        
                        if (!e.target.checked) {
                          // If turning OFF momentum and re-entry modes are set to momentum options, reset them
                          if (updatedLeg.reentry_tgt_mode === 're_momentum' || updatedLeg.reentry_tgt_mode === 're_momentum_reverse') {
                            updatedLeg.reentry_tgt_mode = 're_cost';
                          }
                          if (updatedLeg.reentry_sl_mode === 're_momentum' || updatedLeg.reentry_sl_mode === 're_momentum_reverse') {
                            updatedLeg.reentry_sl_mode = 're_cost';
                          }
                        }
                        
                        updated[legIndex] = updatedLeg;
                        setConfig({...config, legs: updated}); 
                      }}
                      id={`momentum-${legIndex}`}
                    />
                  </div>
                  {legValidationErrors[`momentum-${legIndex}`] && (
                    <div className="absolute left-6 top-8 bg-red-50 border border-red-300 text-red-600 text-xs px-3 py-2 rounded shadow-lg z-10 animate-fade-in">
                      {legValidationErrors[`momentum-${legIndex}`]}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <select value={leg.momentum_mode || 'percentage_down'} onChange={(e) => { const updated = [...config.legs]; updated[legIndex] = {...leg, momentum_mode: e.target.value}; setConfig({...config, legs: updated}); }} disabled={!leg.momentum_enabled} className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50">
                      <option value="points">Points ↑</option>
                      <option value="points_down">Points ↓</option>
                      <option value="percentage">Percent ↑</option>
                      <option value="percentage_down">Percent ↓</option>
                      <option value="underlying_points_up">Underlying Points ↑</option>
                      <option value="underlying_points_down">Underlying Points ↓</option>
                      <option value="underlying_percentage_up">Underlying Percent ↑</option>
                      <option value="underlying_percentage_down">Underlying Percent ↓</option>
                    </select>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={leg.momentum_value || ''} 
                      onChange={(e) => { 
                        const val = e.target.value;
                        if (val !== '' && Number(val) < 0) {
                          setResponsePopup({ type: 'error', title: 'Momentum value cannot be negative' });
                          return;
                        }
                        const updated = [...config.legs]; 
                        updated[legIndex] = {...leg, momentum_value: val}; 
                        setConfig({...config, legs: updated}); 
                      }} 
                      disabled={!leg.momentum_enabled} 
                      className="flex-1 min-w-0 px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Range Break Out - Single Line */}
              <div className="flex flex-col relative" style={{ paddingLeft: '25px', paddingRight: '25px' }}>
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mt-6">
                  <label className="text-sm font-semibold text-gray-700 min-w-fit">Range Break Out</label>
                  <Info size={14} className="text-gray-400" />
                  <ToggleSwitch 
                    checked={leg.range_enabled || false} 
                    onChange={(e) => { 
                      // Check if Simple Momentum is already enabled
                      if (e.target.checked && leg.momentum_enabled) {
                        // Prevent enabling and show error message
                        setLegValidationErrors(prev => ({
                          ...prev,
                          [`range-${legIndex}`]: 'Please disable Simple Momentum first.'
                        }));
                        // Auto-hide after 3 seconds
                        setTimeout(() => {
                          setLegValidationErrors(prev => {
                            const updated = {...prev};
                            delete updated[`range-${legIndex}`];
                            return updated;
                          });
                        }, 3000);
                        return;
                      }
                      // Clear error message if any
                      setLegValidationErrors(prev => {
                        const updated = {...prev};
                        delete updated[`range-${legIndex}`];
                        return updated;
                      });
                      // Enable/disable Range Break Out
                      const updated = [...config.legs]; 
                      updated[legIndex] = {...leg, range_enabled: e.target.checked}; 
                      setConfig({...config, legs: updated}); 
                    }}
                    id={`rangeBreakout-${legIndex}`}
                  />
                  
                  <select value={leg.range_instrument || 'underlying'} onChange={(e) => { const updated = [...config.legs]; updated[legIndex] = {...leg, range_instrument: e.target.value}; setConfig({...config, legs: updated}); }} disabled={!leg.range_enabled} className="px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 min-w-[140px]">
                    <option value="instrument">Instrument</option>
                    <option value="underlying">Underlying</option>
                  </select>
                  
                  <input type="text" value={leg.range_time || '14:45'} onChange={(e) => { const updated = [...config.legs]; updated[legIndex] = {...leg, range_time: e.target.value}; setConfig({...config, legs: updated}); }} disabled={!leg.range_enabled} placeholder="14:45" className="px-4 py-2.5 text-base border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 w-32" />
                  
                  <div className="flex gap-2">
                    <button onClick={() => { if(leg.range_enabled) { const updated = [...config.legs]; updated[legIndex] = {...leg, range_direction: 'high'}; setConfig({...config, legs: updated}); }}} disabled={!leg.range_enabled} className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all disabled:opacity-50 ${leg.range_direction === 'high' && leg.range_enabled ? 'text-white shadow-md border border-blue-600' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}`} style={leg.range_direction === 'high' && leg.range_enabled ? { backgroundColor: '#4682b4' } : {}}>High</button>
                    <button onClick={() => { if(leg.range_enabled) { const updated = [...config.legs]; updated[legIndex] = {...leg, range_direction: 'low'}; setConfig({...config, legs: updated}); }}} disabled={!leg.range_enabled} className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all disabled:opacity-50 ${leg.range_direction === 'low' && leg.range_enabled ? 'text-white shadow-md border border-blue-600' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}`} style={leg.range_direction === 'low' && leg.range_enabled ? { backgroundColor: '#4682b4' } : {}}>Low</button>
                  </div>
                </div>
                {legValidationErrors[`range-${legIndex}`] && (
                  <div className="absolute left-6 top-16 bg-red-50 border border-red-300 text-red-600 text-xs px-3 py-2 rounded shadow-lg z-10 animate-fade-in">
                    {legValidationErrors[`range-${legIndex}`]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OVERALL STRATEGY SETTINGS SECTION - REDESIGNED WITH COMPACT STYLE */}
      <div className="mx-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-10 py-10 mt-8 animate-fade-in">
          {/* Header */}
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 uppercase" style={{ color: '#4682b4' }}>
            Overall strategy settings
            <Info size={14} style={{ color: '#4682b4' }} />
          </h3>

          {/* Main Layout: 3 columns in row 1, with re-entry fields below */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Overall Stop Loss + Overall Re-entry on SL (stacked vertically) */}
            <div className="flex flex-col space-y-4">
              {/* Overall Stop Loss */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-700">Overall Stop Loss</label>
                  <ToggleSwitch 
                    checked={config.overall_stop_loss_enabled} 
                    onChange={(e) => handleChange('overall_stop_loss_enabled', e.target.checked)} 
                    id="overallStopLoss" 
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={config.overall_stop_loss_mode} 
                    onChange={(e) => handleChange('overall_stop_loss_mode', e.target.value)} 
                    disabled={!config.overall_stop_loss_enabled} 
                    className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  >
                    <option value="mtm">MTM</option>
                    <option value="percent">PERCENT</option>
                  </select>
                  <input 
                    type="number" 
                    min="0"
                    step="1"
                    value={config.overall_stop_loss_value} 
                    onChange={(e) => {
                      const val = e.target.value;
                      // Check for decimal values
                      if (val !== '' && val.includes('.')) {
                        setResponsePopup({ type: 'error', title: 'Overall Stop Loss must be a whole number' });
                        return;
                      }
                      if (val !== '' && Number(val) < 0) {
                        setResponsePopup({ type: 'error', title: 'Stop Loss value cannot be negative' });
                        return;
                      }
                      handleChange('overall_stop_loss_value', val);
                    }} 
                    disabled={!config.overall_stop_loss_enabled} 
                    className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50" 
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Overall Re-entry on SL - directly below Stop Loss */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">Overall Re-entry on SL</label>
                  <Info size={14} className="text-gray-400" />
                  <ToggleSwitch 
                    checked={config.overall_reentry_sl_enabled} 
                    onChange={(e) => handleChange('overall_reentry_sl_enabled', e.target.checked)} 
                    id="overallReentrySL" 
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={config.overall_reentry_sl_mode} 
                    onChange={(e) => handleChange('overall_reentry_sl_mode', e.target.value)} 
                    disabled={!config.overall_reentry_sl_enabled} 
                    className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  >
                    <option value="re_asap">RE ASAP</option>
                    <option value="re_asap_reverse">RE ASAP REV</option>
                    <option value="re_momentum">RE MOMENTUM</option>
                    <option value="re_momentum_reverse">RE MOMENTUM REV</option>
                  </select>
                  <input 
                    type="number" 
                    min="0"
                    step="1"
                    value={config.overall_reentry_sl_count} 
                    onChange={(e) => {
                      const val = e.target.value;
                      // Check for decimal values
                      if (val !== '' && val.includes('.')) {
                        setResponsePopup({ type: 'error', title: 'Re-entry count must be a whole number' });
                        return;
                      }
                      if (val !== '' && Number(val) < 0) {
                        setResponsePopup({ type: 'error', title: 'Re-entry count cannot be negative' });
                        return;
                      }
                      handleChange('overall_reentry_sl_count', val);
                    }} 
                    disabled={!config.overall_reentry_sl_enabled} 
                    className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50" 
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Overall Target + Overall Re-entry on Tgt (stacked vertically) */}
            <div className="flex flex-col space-y-4">
              {/* Overall Target */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-700">Overall Target</label>
                  <ToggleSwitch 
                    checked={config.overall_target_enabled} 
                    onChange={(e) => handleChange('overall_target_enabled', e.target.checked)} 
                    id="overallTarget" 
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={config.overall_target_mode} 
                    onChange={(e) => handleChange('overall_target_mode', e.target.value)} 
                    disabled={!config.overall_target_enabled} 
                    className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  >
                    <option value="mtm">MTM</option>
                    <option value="percent">PERCENT</option>
                  </select>
                  <input 
                    type="number" 
                    min="0"
                    step="1"
                    value={config.overall_target_value} 
                    onChange={(e) => {
                      const val = e.target.value;
                      // Check for decimal values
                      if (val !== '' && val.includes('.')) {
                        setResponsePopup({ type: 'error', title: 'Overall Target must be a whole number' });
                        return;
                      }
                      if (val !== '' && Number(val) < 0) {
                        setResponsePopup({ type: 'error', title: 'Target value cannot be negative' });
                        return;
                      }
                      handleChange('overall_target_value', val);
                    }} 
                    disabled={!config.overall_target_enabled} 
                    className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50" 
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Overall Re-entry on Tgt - directly below Target */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">Overall Re-entry on Tgt</label>
                  <Info size={14} className="text-gray-400" />
                  <ToggleSwitch 
                    checked={config.overall_reentry_tgt_enabled} 
                    onChange={(e) => handleChange('overall_reentry_tgt_enabled', e.target.checked)} 
                    id="overallReentryTgt" 
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={config.overall_reentry_tgt_mode} 
                    onChange={(e) => handleChange('overall_reentry_tgt_mode', e.target.value)} 
                    disabled={!config.overall_reentry_tgt_enabled} 
                    className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  >
                    <option value="re_asap">RE ASAP</option>
                    <option value="re_asap_reverse">RE ASAP REV</option>
                    <option value="re_momentum">RE MOMENTUM</option>
                    <option value="re_momentum_reverse">RE MOMENTUM REV</option>
                  </select>
                  <input 
                    type="number" 
                    min="0"
                    step="1"
                    value={config.overall_reentry_tgt_count} 
                    onChange={(e) => {
                      const val = e.target.value;
                      // Check for decimal values
                      if (val !== '' && val.includes('.')) {
                        setResponsePopup({ type: 'error', title: 'Re-entry count must be a whole number' });
                        return;
                      }
                      if (val !== '' && Number(val) < 0) {
                        setResponsePopup({ type: 'error', title: 'Re-entry count cannot be negative' });
                        return;
                      }
                      handleChange('overall_reentry_tgt_count', val);
                    }} 
                    disabled={!config.overall_reentry_tgt_enabled} 
                    className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50" 
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Column 3: Trailing Options */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">Trailing Options</label>
                <ToggleSwitch 
                  checked={config.lock_profit_enabled} 
                  onChange={(e) => handleChange('lock_profit_enabled', e.target.checked)} 
                  id="trailingOptions" 
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={config.lock_profit_mode} 
                  onChange={(e) => handleChange('lock_profit_mode', e.target.value)} 
                  disabled={!config.lock_profit_enabled} 
                  className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                >
                  <option value="points">Points</option>
                  <option value="percentage">Percentage</option>
                </select>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={config.lock_profit_value1 || ''} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '' && Number(val) < 0) {
                      setResponsePopup({ type: 'error', title: 'Trailing value cannot be negative' });
                      return;
                    }
                    handleChange('lock_profit_value1', val);
                  }} 
                  disabled={!config.lock_profit_enabled}
                  className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50" 
                  placeholder="0.00"
                />
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={config.lock_profit_value2 || ''} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '' && Number(val) < 0) {
                      setResponsePopup({ type: 'error', title: 'Trailing value cannot be negative' });
                      return;
                    }
                    handleChange('lock_profit_value2', val);
                  }} 
                  disabled={!config.lock_profit_enabled}
                  className="flex-1 min-w-0 px-3 py-3 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50" 
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backtest Results Section - Show inline after backtest completes */}
      {backtestResults && (
        <div className="mt-8 mb-32">
          <BacktestResults 
            results={backtestResults} 
            onSaveStrategy={onSaveStrategy}
            strategyId={strategyId}
            strategySavedInSession={strategySavedInSession}
            onClearResults={onClearResults}
          />
        </div>
      )}

      {/* FIXED BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-end gap-4">
            {/* Action Buttons - Aligned to Right with Same Width */}
            {(() => {
              return (
                <button 
                  onClick={() => {
                    console.log('[SAVE BUTTON] Clicked');
                    console.log('[SAVE BUTTON] isSaveButtonEnabled:', isSaveButtonEnabled);
                    console.log('[SAVE BUTTON] userMadeChanges:', userMadeChanges);
                    console.log('[SAVE BUTTON] strategyId:', strategyId);
                    
                    // Check if there are changes before saving
                    if (!isSaveButtonEnabled) {
                      console.log('[SAVE BUTTON] ❌ BLOCKED - No changes detected');
                      setResponsePopup({ 
                        type: 'error', 
                        title: 'Please make changes before saving the strategy' 
                      });
                      return;
                    }
                    
                    console.log('[SAVE BUTTON] ✅ ALLOWED - Changes detected, calling onSaveStrategy');
                    onSaveStrategy();
                  }}
                  className="flex items-center justify-center gap-2 w-44 p-4 border-2 rounded-lg hover:shadow-lg transition-all duration-200 font-medium save-strategy-btn"
                  style={{
                    borderColor: isSaveButtonEnabled ? '#2563eb' : '#9ca3af',
                    color: isSaveButtonEnabled ? '#2563eb' : '#9ca3af',
                    backgroundColor: 'transparent',
                    opacity: isSaveButtonEnabled ? 1 : 0.6,
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (isSaveButtonEnabled) {
                      e.currentTarget.style.backgroundColor = '#004687';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.borderColor = '#004687';
                    }
                  }}
                  onMouseDown={(e) => {
                    if (isSaveButtonEnabled) {
                      e.currentTarget.style.transform = 'scale(0.95)';
                    }
                  }}
                  onMouseUp={(e) => {
                    if (isSaveButtonEnabled) {
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isSaveButtonEnabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#2563eb';
                      e.currentTarget.style.borderColor = '#2563eb';
                      e.currentTarget.style.transform = 'scale(1)';
                    } else {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                  title={
                    !isSaveButtonEnabled 
                      ? 'No changes to save' 
                      : config.legs.length === 0 
                        ? 'Add at least one leg before saving' 
                        : 'Save this strategy'
                  }
                >
                  <Save size={16} />
                  Save Strategy
                </button>
              );
            })()}
            
            {/* Divider before Start Backtest */}
            <div className="h-10 w-px bg-gray-300"></div>
            
            <button 
              onClick={handleSubmit}
              disabled={isLoading || (strategyId && strategyId !== -999 && strategyId !== '-999' && userMadeChanges)}
              className="flex items-center justify-center gap-2 w-44 p-4 text-white rounded-lg hover:shadow-lg active:scale-95 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#005A9C' }}
              onMouseEnter={(e) => !isLoading && !(strategyId && strategyId !== -999 && strategyId !== '-999' && userMadeChanges) && (e.currentTarget.style.backgroundColor = '#004580')}
              onMouseLeave={(e) => !isLoading && !(strategyId && strategyId !== -999 && strategyId !== '-999' && userMadeChanges) && (e.currentTarget.style.backgroundColor = '#005A9C')}
              title={strategyId && strategyId !== -999 && strategyId !== '-999' && userMadeChanges ? 'Please save the changes first before running backtest' : ''}
            >
              <Play size={16} />
              Start Backtest
            </button>
            
            {/* Divider after Start Backtest - Only show when Compare button is visible */}
            {strategySavedInSession && (
              <div className="h-10 w-px bg-gray-300"></div>
            )}
            
            {/* Compare Button - ONLY visible after user saves strategy in current session */}
            {/* Hidden on page refresh, project restart, or when loading existing strategies */}
            {strategySavedInSession && (
              <button 
                onClick={handleCompareBacktest}
                disabled={loadingCompare}
                className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50 hover:shadow-lg active:scale-95 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                title="Compare this strategy with other backtests"
              >
                <RefreshCw size={15} className={loadingCompare ? 'animate-spin' : ''} />
                {loadingCompare ? 'Loading...' : 'Compare Backtest'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RANGE BREAKOUT MODAL */}
      {rangeBreakoutModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Range Breakout</h2>
              <button 
                onClick={() => setRangeBreakoutModal({ ...rangeBreakoutModal, isOpen: false })}
                className="text-gray-400 hover:text-gray-600 hover:scale-125 hover:rotate-90 active:scale-90 transition-all duration-200"
              >
                ?
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {/* Row 1: Entry DTE, Start Time, End DTE, End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <div>
                  <label className="block text-lg text-gray-600 mb-2">Entry DTE</label>
                  <select 
                    value={rangeBreakoutModal.entryDte} 
                    onChange={(e) => setRangeBreakoutModal({ ...rangeBreakoutModal, entryDte: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-black rounded text-lg hover:border-gray-600 hover:shadow-md focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                   >
                    {[0, 1, 2, 3, 4, 5].map(dte => (
                      <option key={dte} value={dte}>{dte}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-lg text-gray-600 mb-2">Start Time</label>
                  <input 
                    type="text" 
                    value={rangeBreakoutModal.startTime} 
                    onChange={(e) => setRangeBreakoutModal({ ...rangeBreakoutModal, startTime: e.target.value })}
                    placeholder="09:17"
                    className="w-full px-4 py-3 border border-black rounded text-lg hover:border-gray-600 hover:shadow-md focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-lg text-gray-600 mb-2">End DTE</label>
                  <select 
                    value={rangeBreakoutModal.endDte} 
                    onChange={(e) => setRangeBreakoutModal({ ...rangeBreakoutModal, endDte: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-black rounded text-lg hover:border-gray-600 hover:shadow-md focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    {[0, 1, 2, 3, 4, 5].map(dte => (
                      <option key={dte} value={dte}>{dte}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-lg text-gray-600 mb-2">End Time</label>
                  <input 
                    type="text" 
                    value={rangeBreakoutModal.endTime} 
                    onChange={(e) => setRangeBreakoutModal({ ...rangeBreakoutModal, endTime: e.target.value })}
                    placeholder="09:45"
                    className="w-full px-4 py-3 border border-black rounded text-lg hover:border-gray-600 hover:shadow-md focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Entry On and Tracking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className="block text-lg text-gray-600 mb-3">Entry on</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setRangeBreakoutModal({ ...rangeBreakoutModal, entryOn: 'high' })}
                      className={`px-6 py-3 rounded text-lg font-medium hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 ${
                        rangeBreakoutModal.entryOn === 'high'
                          ? 'bg-teal-100 text-teal-600 border border-teal-300'
                          : 'bg-white text-gray-700 border border-black'
                      }`}
                    >
                      High
                    </button>
                    <button 
                      onClick={() => setRangeBreakoutModal({ ...rangeBreakoutModal, entryOn: 'low' })}
                      className={`px-6 py-3 rounded text-lg font-medium hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 ${
                        rangeBreakoutModal.entryOn === 'low'
                          ? 'bg-teal-100 text-teal-600 border border-teal-300'
                          : 'bg-white text-gray-700 border border-black'
                      }`}
                    >
                      Low
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-lg text-gray-600 mb-3">Tracking</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setRangeBreakoutModal({ ...rangeBreakoutModal, tracking: 'strike_price' })}
                      className={`px-6 py-3 rounded text-lg font-medium hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 ${
                        rangeBreakoutModal.tracking === 'strike_price'
                          ? 'bg-teal-100 text-teal-600 border border-teal-300'
                          : 'bg-white text-gray-700 border border-black'
                      }`}
                    >
                      Strike Price
                    </button>
                    <button 
                      onClick={() => setRangeBreakoutModal({ ...rangeBreakoutModal, tracking: 'underlying' })}
                      className={`px-6 py-3 rounded text-lg font-medium hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 ${
                        rangeBreakoutModal.tracking === 'underlying'
                          ? 'bg-teal-100 text-teal-600 border border-teal-300'
                          : 'bg-white text-gray-700 border border-black'
                      }`}
                    >
                      Underlying
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-lg text-gray-700">
                  We will start by tracking the <strong>Selected Strike</strong> price between <strong>Entry DTE {rangeBreakoutModal.entryDte} {rangeBreakoutModal.startTime}:00</strong> and <strong>End DTE {rangeBreakoutModal.endDte} {rangeBreakoutModal.endTime}:59</strong>. We will take entry after <strong>{rangeBreakoutModal.endTime}:59</strong> once the <strong>{rangeBreakoutModal.entryOn === 'high' ? 'High' : 'Low'}</strong> price of the <strong>Selected Strike</strong> in the range is breached.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-6 mt-8">
              <button 
                onClick={() => setRangeBreakoutModal({ ...rangeBreakoutModal, isOpen: false })}
                className="px-6 py-2 border border-black rounded-2xl text-gray-700 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleLegChange('range_instrument', rangeBreakoutModal.tracking === 'strike_price' ? 'instrument' : 'custom');
                  handleLegChange('range_time', rangeBreakoutModal.endTime);
                  setRangeBreakoutModal({ ...rangeBreakoutModal, isOpen: false });
                }}
                className="px-6 py-2 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 font-medium transition-all duration-200"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TIME PICKER MODAL */}
      {timePickerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-96">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Select Time (13:30 - 20:00)</h2>
              <button
                onClick={() => setTimePickerModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:scale-125 hover:rotate-90 active:scale-90 text-2xl transition-all duration-200"
              >
                 
              </button>
            </div>

            {/* Hours and Minutes Input */}
            <div className="flex justify-center gap-6 mb-8">
              <div className="flex flex-col items-center">
                <label className="text-gray-600 font-medium mb-2">Hours</label>
                <input
                  type="number"
                  min="13"
                  max="21"
                  value={tempHour}
                  onChange={(e) => setTempHour(String(Math.min(21, Math.max(13, parseInt(e.target.value) || 13))))}
                  className="w-20 px-4 py-3 text-center text-xl border-2 border-blue-300 rounded-2xl font-semibold hover:border-blue-500 hover:shadow-md focus:ring-2 focus:ring-blue-500 transition-all duration-200"               />
              </div>
              <div className="flex items-end text-2xl font-bold text-gray-600 mb-2">:</div>
              <div className="flex flex-col items-center">
                <label className="text-gray-600 font-medium mb-2">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={tempMinute}
                  onChange={(e) => setTempMinute(String(Math.min(59, Math.max(0, parseInt(e.target.value) || 0))).padStart(2, '0'))}
                  className="w-20 px-4 py-3 text-center text-xl border-2 border-blue-300 rounded-2xl font-semibold hover:border-blue-500 hover:shadow-md focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
              </div>
            </div>

            {/* Quick Select Times - Updated to 13:30 - 20:00 range */}
            <div className="mb-8">
              <label className="text-gray-700 font-semibold text-lg mb-3 block">Quick Select</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {['13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '17:00', '18:00', '19:00', '19:30', '20:00'].map((time) => (
                  <button
                    key={time}
                    onClick={() => {
                      const [h, m] = time.split(':');
                      setTempHour(h);
                      setTempMinute(m);
                    }}
                    className="px-4 py-3 border-2 border-blue-400 text-blue-600 font-semibold rounded-2xl hover:bg-blue-50 hover:border-blue-600 hover:shadow-md hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-95 transition-all duration-200"
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Cancel and Select Buttons */}
            <div className="flex gap-6 justify-end">
              <button
                onClick={() => setTimePickerModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const timeValue = `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
                  
                  // ? NEW: Validate time is within 13:30 - 21:00 range
                  const [h, m] = timeValue.split(':').map(Number);
                  const timeInMinutes = h * 60 + m;
                  const minTime = 13 * 60 + 30; // 13:30 = 810 minutes
                  const maxTime = 21 * 60 + 0;  // 21:00 = 1260 minutes
                  
                  if (timeInMinutes < minTime || timeInMinutes > maxTime) {
                    console.warn(`⚠️ Time must be between 13:30 and 21:00. You selected: ${timeValue}`);
                    setResponsePopup({ type: 'error', title: 'Time must be between 13:30 and 21:00' });
                    return; // Don't proceed
                  }
                  
                  if (timePickerTarget === 'entry_time') {
                    handleLegChange('entry_time', timeValue);
                  } else if (timePickerTarget === 'exit_time') {
                    handleLegChange('exit_time', timeValue);
                  } else if (timePickerTarget === 'range_time') {
                    handleLegChange('range_time', timeValue);
                  }
                  setTimePickerModal(false);
                }}
                style={{ backgroundColor: '#1565A0' }}
                className="px-6 py-2 text-white font-semibold rounded-2xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-95 transition-all duration-200"
              >
                Select
              </button>
            </div>
          </div>
        </div> 

      )}

      {/* Calendar Modal - Removed */}

      {/* ── Simple toast — shows backend response message ── */}
      {responsePopup && (
        <div className="fixed top-6 right-6 z-[200]" style={{ pointerEvents: 'auto' }}>
          <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-semibold ${
            responsePopup.type === 'success' ? 'bg-green-600' : 
            responsePopup.type === 'info' ? 'bg-blue-600' : 'bg-red-600'
          }`}>
            {responsePopup.type === 'success'
              ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              : responsePopup.type === 'info'
              ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              : <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            }
            <span>{responsePopup.title}</span>
          </div>
        </div>
      )}

      {/* Keyframe for the dismiss progress bar */}

      {/* Compare Backtest Sidebar */}
      <CompareBacktestSidebar
        isOpen={compareSidebarOpen}
        onClose={() => setCompareSidebarOpen(false)}
        compareData={compareData}
        strategyName={config.strategy_name}
        strategyId={strategyId}
        onLoadVersion={onLoadVersion}
      />
    </div>
  );
};

export default StrategyBuilder;