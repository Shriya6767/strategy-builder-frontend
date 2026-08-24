import { useState, useEffect, useRef, useCallback, memo } from 'react'; // Added memo for performance
import { Plus, Trash2, Calendar, DollarSign, Info, Clock, ChevronRight, Settings, ChevronLeft, Copy, Save, Play, RefreshCw, X } from 'lucide-react';
import ToggleSwitch, { ToggleSwitchStyles } from './ToggleSwitch';
import StrikeDropdown from './StrikeDropdown';
import LegCard from './LegCard';
import StrikeSelector from './StrikeSelector';
import DateSegmentInput from './DateSegmentInput'; // Segmented DD/MM/YYYY with single-click selection
import TimeSegmentInput from './TimeSegmentInput';
import BacktestResults from './BacktestResults';
import CompareBacktestSidebar from './CompareBacktestSidebar';
import SaveStrategyModal from './SaveStrategyModal';
import { API_URL } from '../services/api';
import { compareBacktests } from '../services/strategyApi';
import { useStrategy } from '../context/StrategyContext';
import logger from '../utils/logger';

  const StrategyBuilder = ({ onRunBacktest, isLoading, savedConfig, onConfigChange, onSaveStrategy, strategyId, onResetStrategyId, backtestResults, onClearResults, strategySavedInSession, saveCompletedCounter, backtestCompletedCounter, onLoadVersion }) => {
  const { version: contextVersion } = useStrategy();
  
  const isLoadingConfigRef = useRef(false);

  // Refs for keyboard navigation
  const symbolRef = useRef(null);
  const dteFilterRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const loadDataRef = useRef(null);
  
  // Refs for Entry Settings navigation
  const strategyTypeRef = useRef(null);
  const entryTimeRef = useRef(null);
  const exitTimeRef = useRef(null);

  // Keyboard navigation handler for Data Selection
  const handleFieldNavigation = useCallback((e, currentField) => {
    const fieldOrder = [symbolRef, dteFilterRef, startDateRef, endDateRef, loadDataRef];
    const currentIndex = fieldOrder.indexOf(currentField);

    if (e.key === 'ArrowRight' && currentIndex < fieldOrder.length - 1) {
      e.preventDefault();
      fieldOrder[currentIndex + 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      fieldOrder[currentIndex - 1].current?.focus();
    }
  }, []);
  
  // Keyboard navigation handler for Entry Settings
  const handleEntrySettingsNavigation = useCallback((e, currentField) => {
    const fieldOrder = [strategyTypeRef, entryTimeRef, exitTimeRef];
    const currentIndex = fieldOrder.indexOf(currentField);

    if (e.key === 'ArrowRight' && currentIndex < fieldOrder.length - 1) {
      e.preventDefault();
      fieldOrder[currentIndex + 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      fieldOrder[currentIndex - 1].current?.focus();
    }
  }, []);

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

  const createSequentialLeg = () => {
    const parentIndex = sequentialLegParentIndex;
    
    const mainLegs = config.legs.filter(l => !l.isLazyLeg && !l.isSequentialLeg);
    const parentMainLegPosition = mainLegs.findIndex((_, idx) => {
      const mainLegIndex = config.legs.findIndex(l => l === mainLegs[idx]);
      return mainLegIndex === parentIndex;
    });
    
    const sequentialLegNumber = parentMainLegPosition + 1; // LEG#1 → SEQ#1, LEG#2 → SEQ#2
    
    const displayName = sequentialLegConfig.customName.trim() 
      ? sequentialLegConfig.customName.trim() 
      : `SEQ#${sequentialLegNumber}`;
    
    const sequentialLeg = {
      id: Date.now(),
      isSequentialLeg: true,  // Mark as sequential leg
      sequentialLegNumber: sequentialLegNumber,  // For display purposes
      parentLegIndex: parentIndex,  // Store which main leg this belongs to
      customName: displayName,  // Store the custom or default name
      
      lots: sequentialLegConfig.lots || '1',
      expiry: sequentialLegConfig.expiry || '0dte',
      position: sequentialLegConfig.position || 'buy',
      option_type: sequentialLegConfig.option_type || 'call',
      
      strike_criteria: sequentialLegConfig.strike_criteria || 'based on points',
      strike_type: sequentialLegConfig.atm_strike || 'atm',
      atm_percent_direction: sequentialLegConfig.atm_percent_direction || '+',
      atm_percent_value: sequentialLegConfig.atm_percent_value || '',
      closest_premium_value: sequentialLegConfig.closest_premium_value || '',
      lower_range: sequentialLegConfig.lower_range || '',
      upper_range: sequentialLegConfig.upper_range || '',
      
      target_enabled: sequentialLegConfig.target_enabled || false,
      target_type: sequentialLegConfig.target_type || 'points',
      target_value: sequentialLegConfig.target_value || '0.00',
      stop_loss_enabled: sequentialLegConfig.stop_loss_enabled || false,
      stop_loss_type: sequentialLegConfig.stop_loss_type || 'points',
      stop_loss_value: sequentialLegConfig.stop_loss_value || '0.00',
      trail_enabled: sequentialLegConfig.trail_sl_enabled || false,
      trail_type: sequentialLegConfig.trail_sl_type || 'points',
      trail_value: sequentialLegConfig.trail_sl_value || '0.00',
      trail_lock_value: sequentialLegConfig.trail_sl_lock_value || '0.00',
      
      reentry_tgt_enabled: sequentialLegConfig.reentry_tgt_enabled || false,
      reentry_tgt_mode: sequentialLegConfig.reentry_tgt_mode || 're_cost',
      reentry_tgt_count: sequentialLegConfig.reentry_tgt_count || '0',
      reentry_sl_enabled: sequentialLegConfig.reentry_sl_enabled || false,
      reentry_sl_mode: sequentialLegConfig.reentry_sl_mode || 're_cost',
      reentry_sl_count: sequentialLegConfig.reentry_sl_count || '0',
      
      momentum_enabled: sequentialLegConfig.momentum_enabled || false,
      momentum_mode: sequentialLegConfig.momentum_type || 'points_up',
      momentum_value: sequentialLegConfig.momentum_value || '',
      
      range_enabled: sequentialLegConfig.range_breakout_enabled || false,
      range_instrument: sequentialLegConfig.range_instrument || 'underlying',
      range_time: sequentialLegConfig.range_time || '14:45',
      range_direction: sequentialLegConfig.range_direction || 'high',
      
      entry_time: config.entry_time,
      exit_time: config.exit_time,
      
      straddle_id: Date.now() % 10000
    };
    
    const updatedLegs = [...config.legs];
    updatedLegs.splice(parentIndex + 1, 0, sequentialLeg);
    
    const newConfig = {
      ...config,
      legs: updatedLegs
    };
    setConfig(newConfig);
    
    setShowSequentialLegModal(false);
    setSequentialLegParentIndex(null); // Reset parent index
    setSequentialLegConfig({
      customName: '',
      lots: '1',
      expiry: '0dte',
      position: 'buy',
      option_type: 'call',
      strike_criteria: 'based on points',
      atm_strike: 'atm',
      atm_percent_direction: '+',
      atm_percent_value: '',
      closest_premium_value: '',
      lower_range: '',
      upper_range: '',
      premium_value: '',
      target_enabled: false,
      target_type: 'points',
      target_value: '',
      stop_loss_enabled: false,
      stop_loss_type: 'points',
      stop_loss_value: '',
      trail_sl_enabled: false,
      trail_sl_type: 'points',
      trail_sl_value: '',
      trail_sl_lock_value: '',
      reentry_tgt_enabled: false,
      reentry_tgt_mode: 're_cost',
      reentry_tgt_count: '',
      reentry_sl_enabled: false,
      reentry_sl_mode: 're_cost',
      reentry_sl_count: '',
      momentum_enabled: false,
      momentum_type: 'points_up',
      momentum_value: '',
      range_breakout_enabled: false,
      range_instrument: 'underlying',
      range_time: '14:45',
      range_direction: 'high'
    });
  };

  const [config, setConfig] = useState(() => {
    const initial = (savedConfig && Object.keys(savedConfig).length > 0) ? savedConfig : getDefaultConfig();
    
    return initial;
  });

  const [premiumBasedCapital, setPremiumBasedCapital] = useState(() => {
    if (savedConfig && savedConfig.premiumBasedCapital) {
      return savedConfig.premiumBasedCapital;
    }
    return null;
  });
  const [fetchingPremiums, setFetchingPremiums] = useState(false);
  
  const [showLazyLegModal, setShowLazyLegModal] = useState(false);
  const [lazyLegContext, setLazyLegContext] = useState(null); // { legIndex, type: 'target' | 'sl' }
  const [lazyLegConfig, setLazyLegConfig] = useState({
    customName: '',  // NEW: Custom name for lazy leg
    lots: 1,
    expiry: '0dte',
    position: 'buy',
    option_type: 'call',
    strike_criteria: 'based on points',
    atm_strike: 'atm',
    atm_percent_direction: '+',
    atm_percent_value: '',
    closest_premium_value: '',
    lower_range: '',
    upper_range: '',
    premium_value: '',
    target_enabled: false,      // Default OFF but fields visible
    target_type: 'points',
    target_value: '0.00',
    stop_loss_enabled: false,   // Default OFF but fields visible
    stop_loss_type: 'points', 
    stop_loss_value: '0.00',
    trail_sl_enabled: false,    // Default OFF but fields visible
    trail_sl_type: 'points',
    trail_sl_value: '0.00',
    trail_sl_lock_value: '0.00',  // Added second Trail SL input
    reentry_tgt_enabled: false, // Default OFF but fields visible
    reentry_tgt_mode: 're_cost',
    reentry_tgt_count: '1.00',
    reentry_sl_enabled: false,  // Default OFF but fields visible
    reentry_sl_mode: 're_cost',
    reentry_sl_count: '1.00',
    momentum_enabled: false,    // Default OFF but fields visible
    momentum_type: 'points_up',
    momentum_value: '0.00',
    range_breakout_enabled: false, // Default OFF but fields visible
    range_instrument: 'underlying',
    range_time: '14.45',
    range_direction: 'high'
  });
  
  const [showSequentialLegModal, setShowSequentialLegModal] = useState(false);
  const [sequentialLegParentIndex, setSequentialLegParentIndex] = useState(null); // Track which leg is creating the sequential leg
  const [sequentialLegConfig, setSequentialLegConfig] = useState({
    customName: '',  // Custom name for sequential leg
    lots: '1',
    expiry: '0dte',
    position: 'buy',
    option_type: 'call',
    strike_criteria: 'based on points',
    atm_strike: 'atm',
    atm_percent_direction: '+',
    atm_percent_value: '',
    closest_premium_value: '',
    lower_range: '',
    upper_range: '',
    premium_value: '',
    target_enabled: false,
    target_type: 'points',
    target_value: '',
    stop_loss_enabled: false,
    stop_loss_type: 'points',
    stop_loss_value: '',
    trail_sl_enabled: false,
    trail_sl_type: 'points',
    trail_sl_value: '',
    trail_sl_lock_value: '',
    reentry_tgt_enabled: false,
    reentry_tgt_mode: 're_cost',
    reentry_tgt_count: '',
    reentry_sl_enabled: false,
    reentry_sl_mode: 're_cost',
    reentry_sl_count: '',
    momentum_enabled: false,
    momentum_type: 'points_up',
    momentum_value: '',
    range_breakout_enabled: false,
    range_instrument: 'underlying',
    range_time: '14:45',
    range_direction: 'high'
  });
  
  // (entryTimeRef / exitTimeRef removed -- no longer needed now that Entry
  // and Exit Time use the segmented TimeSegmentInput component, which
  // manages its own internal focus instead of a raw <input> DOM ref.)
  // Remembers the last COMPLETE, validated Entry/Exit time for each field.
  // Used to safely revert if the user leaves a field empty/incomplete,
  // so an invalid time can never silently reach Save or Run Backtest.
  const lastValidTimeRef = useRef({ entry_time: config.entry_time, exit_time: config.exit_time });
  
  const dataSelectionRef = useRef(null);
  
  const [lazyLegDropdownOpen, setLazyLegDropdownOpen] = useState({});
  const [lazyLegExistingExpanded, setLazyLegExistingExpanded] = useState({});
  const lazyLegDropdownRef = useRef({});
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(lazyLegDropdownOpen).forEach(key => {
        if (lazyLegDropdownOpen[key] && lazyLegDropdownRef.current[key]) {
          if (!lazyLegDropdownRef.current[key].contains(event.target)) {
            setLazyLegDropdownOpen(prev => ({ ...prev, [key]: false }));
          }
        }
      });
    };

    if (Object.values(lazyLegDropdownOpen).some(isOpen => isOpen)) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [lazyLegDropdownOpen]);
  
  const [dataLoaded, setDataLoaded] = useState(() => {
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

  const [responsePopup, setResponsePopup] = useState(null); // { type: 'success'|'error'|'info', title }
  
  const [dteValidationError, setDteValidationError] = useState(null);
  
  const [legValidationErrors, setLegValidationErrors] = useState({});

  const [compareSidebarOpen, setCompareSidebarOpen] = useState(false);
  const [compareData, setCompareData] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveAsNew, setSaveAsNew] = useState(false); // Track if saving as new strategy

  const [originalConfig, setOriginalConfig] = useState(() => {
    if (savedConfig && Object.keys(savedConfig).length > 0) {
      const initial = JSON.parse(JSON.stringify(savedConfig));
      return initial;
    }
    return null;
  });

  useEffect(() => {
    if (!responsePopup) return;
    const t = setTimeout(() => setResponsePopup(null), 3000);
    return () => clearTimeout(t);
  }, [responsePopup]);

  const [userMadeChanges, setUserMadeChanges] = useState(false);
  
  const [isSaveButtonEnabled, setIsSaveButtonEnabled] = useState(false);

  const hasConfigChanged = () => {
    if (!originalConfig) {
      return config.legs.length > 0;
    }
    
    if (!strategyId || strategyId === -999 || strategyId === '-999') {
      return config.legs.length > 0;
    }
    
    if (userMadeChanges) {
      return true;
    }
    
    try {
      const configToCompare = JSON.parse(JSON.stringify(config));
      const originalToCompare = JSON.parse(JSON.stringify(originalConfig));
      
      const fieldsToIgnore = ['currentLeg', 'premiumBasedCapital', 'dataLoaded'];
      fieldsToIgnore.forEach(field => {
        delete configToCompare[field];
        delete originalToCompare[field];
      });
      
      const configString = JSON.stringify(configToCompare);
      const originalString = JSON.stringify(originalToCompare);
      const hasChanged = configString !== originalString;
      
      return hasChanged;
    } catch (error) {
      logger.error('Error during comparison:', error);
      return config.legs.length > 0;
    }
  };

  const [currentLeg, setCurrentLeg] = useState(() => {
    if (savedConfig && savedConfig.currentLeg) {
      return savedConfig.currentLeg;
    }
    const strategyType = (savedConfig && savedConfig.strategy_type) || 'intraday';
    const dteFilter = (savedConfig && savedConfig.dte_filter) || '0';
    const defaultExpiry = (dteFilter === 'combined' || dteFilter === 'combine_dte') ? '1dte' : (dteFilter === '0' ? '0dte' : '1dte');
    
    return {
      segment: 'options',
      lots: '1',  // ? Default value is 1
      position: 'buy',
      option_type: 'call',
      expiry: defaultExpiry,  // Set based on DTE filter
      strike_criteria: 'based on points',
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
      stop_loss_mode: 'points',
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

  const [tempHour, setTempHour] = useState('09');
  const [tempMinute, setTempMinute] = useState('30');
  const [timePickerTarget, setTimePickerTarget] = useState(null);
  const [timePickerModal, setTimePickerModal] = useState(false);

  const [rangeBreakoutModal, setRangeBreakoutModal] = useState({
    isOpen: false,
    entryDte: 0,
    startTime: '09:17',
    endDte: 0,
    endTime: '09:45',
    entryOn: 'high',
    tracking: 'strike_price'
  });

  const [trailSLFilter, setTrailSLFilter] = useState('all'); // 'all' or 'sl'

  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerValue, setTimePickerValue] = useState('09:30');
  const handleTimePickerSelect = (time) => {
    setTimePickerValue(time);
    setTimePickerOpen(false);
  };

  // Commits a complete "HH:MM" value coming from the segmented time input
  // for Entry/Exit Time. Preserves the exact same cross-field rule as
  // before (Entry must be before Exit) -- only the interaction model
  // (segmented click/type/arrow-key editing vs. free-text typing) changed.
  // Returns true if the value was accepted, false if rejected (the
  // TimeSegmentInput component reverts its own display when rejected).
  const commitTime = (field, formatted) => {
    const [h, m] = formatted.split(':').map(Number);
    const timeInMinutes = h * 60 + m;

    // Validate time range: must be between 13:30 (810 minutes) and 21:00 (1260 minutes)
    const minTime = 13 * 60 + 30; // 13:30 = 810 minutes
    const maxTime = 21 * 60; // 21:00 = 1260 minutes

    if (timeInMinutes < minTime || timeInMinutes > maxTime) {
      setResponsePopup({ 
        type: 'error', 
        title: 'Invalid Time Range', 
        message: 'Please select a time between 13:30 and 21:00' 
      });
      return false;
    }

    const otherField = field === 'entry_time' ? 'exit_time' : 'entry_time';
    const otherValue = config[otherField];
    if (otherValue && otherValue.length === 5 && otherValue.includes(':')) {
      const [oh, om] = otherValue.split(':').map(Number);
      const otherInMinutes = oh * 60 + om;

      if (field === 'entry_time' && timeInMinutes >= otherInMinutes) {
        setResponsePopup({ type: 'error', title: 'Entry Time must be before Exit Time' });
        return false;
      }
      if (field === 'exit_time' && timeInMinutes <= otherInMinutes) {
        setResponsePopup({ type: 'error', title: 'Exit Time must be after Entry Time' });
        return false;
      }
    }

    lastValidTimeRef.current[field] = formatted;
    handleChange(field, formatted);
    return true;
  };

  useEffect(() => {
    if (savedConfig && Object.keys(savedConfig).length > 0) {
      const currentConfigJson = JSON.stringify({...config, currentLeg: undefined, premiumBasedCapital: undefined, dataLoaded: undefined});
      const savedConfigJson = JSON.stringify({...savedConfig, currentLeg: undefined, premiumBasedCapital: undefined, dataLoaded: undefined});
      
      if (currentConfigJson === savedConfigJson && strategyId) {
        return;
      }
      
      isLoadingConfigRef.current = true;
      
      const mergedConfig = {
        ...getDefaultConfig(), // Start with defaults to ensure all fields exist
        ...savedConfig, // Override with saved values
      };
      
      // Strip seconds from times (convert "HH:MM:SS" to "HH:MM" for TimeSegmentInput)
      if (mergedConfig.entry_time && mergedConfig.entry_time.includes(':')) {
        const parts = mergedConfig.entry_time.split(':');
        mergedConfig.entry_time = `${parts[0]}:${parts[1]}`;
      }
      if (mergedConfig.exit_time && mergedConfig.exit_time.includes(':')) {
        const parts = mergedConfig.exit_time.split(':');
        mergedConfig.exit_time = `${parts[0]}:${parts[1]}`;
      }
      
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
      
      setConfig(mergedConfig);
      // Keep the last-valid-time reference in sync with whatever strategy
      // was just loaded, so clearing a field later reverts to THIS
      // strategy's time, not a stale default from before.
      lastValidTimeRef.current = {
        entry_time: mergedConfig.entry_time,
        exit_time: mergedConfig.exit_time,
      };
      setOriginalConfig(JSON.parse(JSON.stringify(mergedConfig)));
      setUserMadeChanges(false);
      
      if (savedConfig.currentLeg) {
        setCurrentLeg(savedConfig.currentLeg);
      }
      
      if (savedConfig.dataLoaded !== undefined) {
        setDataLoaded(savedConfig.dataLoaded);
        setDataStatus(savedConfig.dataLoaded ? "Data loaded ?" : "Click 'Load Data' to begin");
      }
      
      if (savedConfig.premiumBasedCapital) {
        setPremiumBasedCapital(savedConfig.premiumBasedCapital);
      }
      
      requestAnimationFrame(() => {
        isLoadingConfigRef.current = false;
      });
    }
  }, [savedConfig]);

  // Ref that holds the debounce timer for pushing config changes up to the
  // parent (App.jsx). Declared once via useRef so the same timer instance
  // persists across renders instead of being recreated each time.
  const configChangeTimerRef = useRef(null);
  // Always holds the MOST RECENT config snapshot, even while a debounced
  // push is still pending -- used to flush on unmount so no edit is ever lost.
  const latestConfigWithExtrasRef = useRef(null);

  useEffect(() => {
    if (onConfigChange && !isLoadingConfigRef.current) {
      const configWithExtras = { 
        ...config, 
        currentLeg,
        premiumBasedCapital,  // ? Persist premium calculation
        dataLoaded  // ? NEW: Persist data loaded state
      };
      latestConfigWithExtrasRef.current = configWithExtras;

      // setUserMadeChanges stays IMMEDIATE (cheap boolean state set) so the
      // Save button reacts instantly. Only the expensive push to the parent
      // App.jsx (onConfigChange), which re-renders the whole app shell, is
      // debounced -- it now fires once ~200ms after the user pauses, instead
      // of on every single keystroke while typing (e.g. in Entry/Exit Time).
      if (strategyId && strategyId !== -999 && strategyId !== '-999' && originalConfig) {
        setUserMadeChanges(true);
      }

      if (configChangeTimerRef.current) {
        clearTimeout(configChangeTimerRef.current);
      }
      configChangeTimerRef.current = setTimeout(() => {
        onConfigChange(latestConfigWithExtrasRef.current);
        configChangeTimerRef.current = null;
      }, 200);
    }
  }, [config, currentLeg, premiumBasedCapital, dataLoaded]); // ? Added dataLoaded to deps

  // Flush any still-pending debounced update the moment this component
  // unmounts (e.g. user switches tabs right after typing), so the parent
  // App.jsx always ends up with the final edited value -- nothing is lost.
  useEffect(() => {
    return () => {
      if (configChangeTimerRef.current) {
        clearTimeout(configChangeTimerRef.current);
        if (onConfigChange && latestConfigWithExtrasRef.current) {
          onConfigChange(latestConfigWithExtrasRef.current);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (saveCompletedCounter > 0) {
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      setUserMadeChanges(false);
    }
  }, [saveCompletedCounter]);

  // REMOVED: Auto-refresh of compare data after backtest completion
  // Compare data will only be fetched when user clicks "Compare Backtest" button
  // useEffect(() => {
  //   if (backtestCompletedCounter > 0 && strategyId && config.strategy_name) {
  //     const refreshCompareData = async () => {
  //       try {
  //         console.log('[StrategyBuilder] Backtest completed, waiting 1 second before fetching compare data...');
  //         await new Promise(resolve => setTimeout(resolve, 1000));
  //         
  //         console.log('[StrategyBuilder] Fetching compare data for strategy:', strategyId, config.strategy_name);
  //         const result = await compareBacktests(strategyId, config.strategy_name);
  //         if (result.success && result.data) {
  //           setCompareData(result.data);
  //           console.log('[StrategyBuilder] Compare data refreshed after backtest:', result.data.length, 'versions');
  //           console.log('[StrategyBuilder] Latest version:', result.data[0]?.version, 'created at:', result.data[0]?.created_at);
  //         } else {
  //           console.warn('[StrategyBuilder] Compare data fetch returned no data or failed');
  //         }
  //       } catch (error) {
  //         console.error('[StrategyBuilder] Failed to refresh compare data after backtest:', error);
  //       }
  //     };
  //     refreshCompareData();
  //   }
  // }, [backtestCompletedCounter, strategyId, config.strategy_name]);

  useEffect(() => {
    const buttonShouldBeEnabled = hasConfigChanged();
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
    // Flip the "user made changes" flag immediately (synchronously) instead of
    // waiting for hasConfigChanged() to discover it later via an expensive
    // JSON.stringify(JSON.parse(...)) deep-clone comparison. This does not
    // change what the Save button does -- it only avoids doing a slow
    // comparison to arrive at an answer we already know for certain here.
    setUserMadeChanges(true);

    const numericConfigFields = ['dte_filter', 'initial_capital', 'lot_size', 'strategy_sl_value', 
                                 'strategy_target_value', 'overall_stop_loss_value', 
                                 'overall_target_value', 'lock_profit_value1', 'lock_profit_value2',
                                 'overall_reentry_sl_count', 'overall_reentry_tgt_count',
                                 'overall_instrument_move', 'overall_stoploss_move'];
    
    let processedValue = value;
    
    if (numericConfigFields.includes(field)) {
      if (value === '' || value === null || value === undefined) {
        processedValue = '';
      } else {
        const numValue = Number(value);
        if (numValue < 0) {
          setResponsePopup({ type: 'error', title: `${field.replace(/_/g, ' ')} cannot be negative` });
          return; // Don't update
        }
        processedValue = value;
      }
    }
    
    if (field === 'start_date' || field === 'end_date') {
      if (dataLoaded) {
        setDataLoaded(false);
        setDataStatus("Click 'Load Data' to begin");
      }
    }
    
    if (field === 'lock_profit_enabled' && !value) {
      processedValue = false; // Set toggle to false
    }
    
    const newConfig = { ...config, [field]: processedValue };
    
    if (field === 'lock_profit_enabled' && !value) {
      newConfig.lock_profit_value1 = '';
      newConfig.lock_profit_value2 = '';
    }
    
    if (field === 'dte_filter' && !isLoadingConfigRef.current) {
      let newExpiry;
      if (value === 'combined' || value === 'combine_dte') {
        newExpiry = '1dte';
      } else {
        newExpiry = value === '0' ? '0dte' : '1dte';
      }
      
      newConfig.legs = config.legs.map(leg => ({
        ...leg,
        expiry: newExpiry
      }));
      
      setCurrentLeg(prev => ({ ...prev, expiry: newExpiry }));
      
      if (dataLoaded) {
        setDataLoaded(false);
        setDataStatus(null);
      }
    }
    
    if (field === 'strategy_type') {
      const currentDTE = config.dte_filter;
      const isCombined = currentDTE === 'combined' || currentDTE === 'combine_dte';
      
      
      if (isCombined && dataLoaded && (value === 'intraday' || value === 'sequential')) {
        // Auto-scroll to Data Selection section
        if (dataSelectionRef.current) {
          dataSelectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          });
        }
        
        // Focus DTE Filter field after scroll
        setTimeout(() => {
          if (dteFilterRef.current) {
            dteFilterRef.current.focus();
          }
        }, 500); // Wait for scroll to complete
        
        setResponsePopup({ 
          type: 'error', 
          title: 'Data incompatible with strategy type',
          message: `Combined DTE data is already loaded. "${value.toUpperCase()}" strategy only works with 0DTE or 1DTE. Please change DTE Filter to 0DTE or 1DTE and reload data first.`
        });
        return; // Don't update the value
      }
      
      if (isCombined && !dataLoaded && (value === 'intraday' || value === 'sequential')) {
        // Auto-scroll to Data Selection section
        if (dataSelectionRef.current) {
          dataSelectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          });
        }
        
        // Focus DTE Filter field after scroll
        setTimeout(() => {
          if (dteFilterRef.current) {
            dteFilterRef.current.focus();
          }
        }, 500); // Wait for scroll to complete
        
        setResponsePopup({ 
          type: 'error', 
          title: 'Strategy type not compatible with Combined DTE',
          message: `Strategy type "${value.toUpperCase()}" only works with 0DTE or 1DTE data. Combined DTE only supports BTST. Please change DTE Filter to 0DTE or 1DTE first.`
        });
        return; // Don't update the value
      }
      
      if (!isCombined && dataLoaded && value === 'btst') {
        const loadedDTE = currentDTE === '0' ? '0DTE' : '1DTE';
        
        // Auto-scroll to Data Selection section
        if (dataSelectionRef.current) {
          dataSelectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          });
        }
        
        // Focus DTE Filter field after scroll
        setTimeout(() => {
          if (dteFilterRef.current) {
            dteFilterRef.current.focus();
          }
        }, 500); // Wait for scroll to complete
        
        setResponsePopup({ 
          type: 'error', 
          title: 'Data incompatible with strategy type',
          message: `${loadedDTE} data is already loaded. BTST strategy only works with Combined DTE. Please change DTE Filter to Combined and reload data first.`
        });
        return; // Don't update the value
      }
      
      if (!isCombined && !dataLoaded && value === 'btst') {
        // Auto-scroll to Data Selection section
        if (dataSelectionRef.current) {
          dataSelectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          });
        }
        
        // Focus DTE Filter field after scroll
        setTimeout(() => {
          if (dteFilterRef.current) {
            dteFilterRef.current.focus();
          }
        }, 500); // Wait for scroll to complete
        
        setResponsePopup({ 
          type: 'error', 
          title: 'Strategy type not compatible with single DTE',
          message: 'BTST strategy type only works with Combined DTE. Please change DTE Filter to Combined first, or select Intraday/Sequential strategy type.'
        });
        return; // Don't update the value
      }
    }
    
    if (field === 'strategy_type') {
      if (value === 'btst' && config.dte_filter === '0') {
        if (dataSelectionRef.current) {
          dataSelectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          });
        }
        
        setDteValidationError('Please select Combined (0DTE + 1DTE) and load data again.');
        
        setTimeout(() => {
          setDteValidationError(null);
        }, 5000);
        
        return;
      }
      
      setDteValidationError(null);
      
      if (value === 'btst') {
        const isCombined = config.dte_filter === 'combined' || config.dte_filter === 'combine_dte';
        
        if (!isCombined) {
          newConfig.dte_filter = 'combine_dte';
        } else {
        }
        
        if (!isLoadingConfigRef.current) {
          newConfig.legs = config.legs.map(leg => ({
            ...leg,
            expiry: '1dte'
          }));
          setCurrentLeg(prev => ({ 
            ...prev,
            expiry: '1dte'
          }));
        }
        
        if (dataLoaded && !isCombined) {
          setDataLoaded(false);
          setDataStatus(null);
        }
      } else if (value === 'intraday' || value === 'sequential') {
        newConfig.legs = config.legs.map(leg => ({
          ...leg,
          stop_loss_mode: 'points'
        }));
        setCurrentLeg(prev => ({ ...prev, stop_loss_mode: 'points' }));
        
        const isCombined = config.dte_filter === 'combined' || config.dte_filter === 'combine_dte';
        if (dataLoaded && isCombined) {
          setDataLoaded(false);
          setDataStatus(null);
        }
      }
    }
    
    setConfig(newConfig);
    
    if (strategyId && strategyId !== -999 && strategyId !== '-999' && originalConfig) {
      setUserMadeChanges(true);
    } else {
    }
  };

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

      const lotSize = config.lot_size || 100;
      const totalPremium = data.leg_premiums.reduce((sum, leg) => sum + leg.premium, 0);
      const totalLegs = data.leg_premiums.length;
      
      const baseCapital = totalPremium * lotSize;
      
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


    } catch (error) {
      logger.error('[Premium-Based Capital] Error:', error);
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

  useEffect(() => {
    if (config.capital_mode === 'premium_based' && 
        config.legs.length > 0 && 
        dataLoaded) {
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

  const calculatePremiumBasedCapital = () => {
    return premiumBasedCapital;
  };

  const handleNumberFocus = (e) => {
    setTimeout(() => e.target.select(), 0);
  };

  const handleLegChange = (field, value) => {
    if (field === 'expiry') {
    }
    
    const numericFields = ['lots', 'strike_value', 'premium_tolerance', 'lower_range', 'upper_range', 
                          'premium_value', 'target_value', 'stop_loss_value', 'trail_value', 
                          'trail_lock_value', 'momentum_value', 'reentry_tgt_count', 'reentry_sl_count'];
    
    if (numericFields.includes(field)) {
      if (value === '' || value === null || value === undefined) {
        setCurrentLeg(prev => ({ ...prev, [field]: '' }));
        return;
      }
      
      const numValue = Number(value);
      
      if (numValue < 0) {
        setResponsePopup({ type: 'error', title: `${field.replace(/_/g, ' ')} cannot be negative` });
        return; // Don't update the field
      }
      
      setCurrentLeg(prev => ({ ...prev, [field]: value }));
    } else {
      setCurrentLeg(prev => ({ ...prev, [field]: value }));
    }
  };


  // Memoized handler to update a single leg - stable reference prevents LegCard re-renders
  const updateLegInPlace = useCallback((legIndex, updatedFields) => {
    setConfig(prev => ({
      ...prev,
      legs: prev.legs.map((leg, i) => 
        i === legIndex ? { ...leg, ...updatedFields } : leg
      )
    }));
    
    if (strategyId && strategyId !== -999 && strategyId !== '-999' && originalConfig) {
      setUserMadeChanges(true);
    }
  }, [strategyId, originalConfig]); // Changed: wrapped in useCallback with functional setState

  const addLeg = () => {
    if (currentLeg.reentry_tgt_enabled && !currentLeg.target_enabled) {
      setResponsePopup({ 
        type: 'error', 
        title: 'Target must be selected first before enabling Re-entry Target.' 
      });
      return;
    }
    
    if (currentLeg.reentry_sl_enabled && !currentLeg.stop_loss_enabled) {
      setResponsePopup({ 
        type: 'error', 
        title: 'Stop Loss must be selected first before enabling Re-entry on SL.' 
      });
      return;
    }
    
    if (currentLeg.trail_enabled && !currentLeg.stop_loss_enabled) {
      setResponsePopup({ 
        type: 'error', 
        title: 'Stop Loss must be selected first before enabling Trail SL.' 
      });
      return;
    }
    
    
    if (strategyId && onResetStrategyId) {
      onResetStrategyId();
    }
    
    let straddleId;
    
    const currentOptionType = currentLeg.option_type.toUpperCase();
    const oppositeType = currentOptionType === 'CALL' ? 'PUT' : 'CALL';
    
    const existingLegs = config.legs.filter(leg => !leg.isReentry);
    let foundPair = null;
    
    for (let i = existingLegs.length - 1; i >= 0; i--) {
      const leg = existingLegs[i];
      if (leg.option_type.toUpperCase() === oppositeType) {
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
      straddleId = foundPair.straddle_id;
    } else {
      const maxStraddleId = existingLegs.reduce((max, leg) => 
        Math.max(max, leg.straddle_id || 0), 0
      );
      straddleId = maxStraddleId + 1;
    }
    
    
    const legWithTime = {
      ...currentLeg,
      id: Date.now(),
      straddle_id: straddleId,
      option_type: (currentLeg.option_type || 'call').toLowerCase(),  // call/put
      position: (currentLeg.position || 'buy').toLowerCase(),  // buy/sell
      entry_time: currentLeg.entry_time || config.entry_time,  // Lock current time
      exit_time: currentLeg.exit_time || config.exit_time,     // Lock current time
      atm_percent_direction: currentLeg.atm_percent_direction || '+',
      atm_percent_value: currentLeg.atm_percent_value || '',
      lower_range: currentLeg.lower_range || '',
      upper_range: currentLeg.upper_range || '',
      closest_premium_value: currentLeg.closest_premium_value || ''
    };
    
    
    
    const newConfig = {
      ...config,
      legs: [...config.legs, legWithTime]
    };
    setConfig(newConfig);
    
    setPremiumBasedCapital(null);
  };


  const createLazyLeg = () => {
    
    const existingLazyLegs = config.legs.filter(leg => leg.isLazyLeg);
    const lazyLegNumber = existingLazyLegs.length + 1;
    
    const displayName = lazyLegConfig.customName.trim() 
      ? lazyLegConfig.customName.trim() 
      : `lazy${lazyLegNumber}`;
    
    const lazyLeg = {
      id: Date.now(),
      isLazyLeg: true,  // Mark as lazy leg
      lazyLegNumber: lazyLegNumber,  // For display purposes
      customName: displayName,  // NEW: Store the custom or default name
      
      lots: lazyLegConfig.lots || 1,
      expiry: lazyLegConfig.expiry || '0dte',
      position: lazyLegConfig.position || 'buy',
      option_type: lazyLegConfig.option_type || 'call',
      
      strike_criteria: lazyLegConfig.strike_criteria || 'based on points',
      strike_type: lazyLegConfig.atm_strike || 'atm',
      atm_percent_direction: lazyLegConfig.atm_percent_direction || '+',
      atm_percent_value: lazyLegConfig.atm_percent_value || '',
      closest_premium_value: lazyLegConfig.closest_premium_value || '',
      lower_range: lazyLegConfig.lower_range || '',
      upper_range: lazyLegConfig.upper_range || '',
      
      target_enabled: lazyLegConfig.target_enabled || false,
      target_mode: lazyLegConfig.target_type || 'points',
      target_value: lazyLegConfig.target_value || '',
      
      stop_loss_enabled: lazyLegConfig.stop_loss_enabled || false,
      stop_loss_mode: lazyLegConfig.stop_loss_type || 'points',
      stop_loss_value: lazyLegConfig.stop_loss_value || '',
      
      trail_enabled: lazyLegConfig.trail_sl_enabled || false,
      trail_mode: lazyLegConfig.trail_sl_type || 'points',
      trail_value: lazyLegConfig.trail_sl_value || '',
      trail_lock_value: lazyLegConfig.trail_sl_lock_value || '',
      
      reentry_tgt_enabled: lazyLegConfig.reentry_tgt_enabled || false,
      reentry_tgt_mode: lazyLegConfig.reentry_tgt_mode || 're_cost',
      reentry_tgt_count: lazyLegConfig.reentry_tgt_count || '1.00',
      
      reentry_sl_enabled: lazyLegConfig.reentry_sl_enabled || false,
      reentry_sl_mode: lazyLegConfig.reentry_sl_mode || 're_cost',
      reentry_sl_count: lazyLegConfig.reentry_sl_count || '1.00',
      
      momentum_enabled: lazyLegConfig.momentum_enabled || false,
      momentum_type: lazyLegConfig.momentum_type || 'points_up',
      momentum_value: lazyLegConfig.momentum_value || '',
      
      range_breakout_enabled: lazyLegConfig.range_breakout_enabled || false,
      range_instrument: lazyLegConfig.range_instrument || 'underlying',
      range_time: lazyLegConfig.range_time || '',
      range_direction: lazyLegConfig.range_direction || 'high',
      
      entry_time: config.entry_time,
      exit_time: config.exit_time,
      
      straddle_id: Date.now() % 10000  // Simple ID for lazy legs
    };
    
    
    const updatedLegs = [...config.legs, lazyLeg];
    
    if (lazyLegContext && lazyLegContext.legIndex !== undefined) {
      const parentLegIndex = lazyLegContext.legIndex;
      const fieldToUpdate = lazyLegContext.type === 'target' ? 'reentry_tgt_mode' : 'reentry_sl_mode';
      
      updatedLegs[parentLegIndex] = {
        ...updatedLegs[parentLegIndex],
        [fieldToUpdate]: `lazy_leg_${lazyLeg.id}` // Store lazy leg ID
      };
      
    }
    
    const newConfig = {
      ...config,
      legs: updatedLegs
    };
    setConfig(newConfig);
    
    setShowLazyLegModal(false);
    setLazyLegContext(null);
    setLazyLegConfig({
      customName: '',
      lots: 1,
      expiry: '0dte',
      position: 'buy',
      option_type: 'call',
      strike_criteria: 'based on points',
      atm_strike: 'atm',
      atm_percent_direction: '+',
      atm_percent_value: '',
      closest_premium_value: '',
      lower_range: '',
      upper_range: '',
      premium_value: '',
      target_enabled: false,
      target_type: 'points',
      target_value: '0.00',
      stop_loss_enabled: false,
      stop_loss_type: 'points',
      stop_loss_value: '0.00',
      trail_sl_enabled: false,
      trail_sl_type: 'points',
      trail_sl_value: '0.00',
      trail_sl_lock_value: '0.00',
      reentry_tgt_enabled: false,
      reentry_tgt_mode: 're_cost',
      reentry_tgt_count: '1.00',
      reentry_sl_enabled: false,
      reentry_sl_mode: 're_cost',
      reentry_sl_count: '1.00',
      momentum_enabled: false,
      momentum_type: 'points_up',
      momentum_value: '0.00',
      range_breakout_enabled: false,
      range_instrument: 'underlying',
      range_time: '14.45',
      range_direction: 'high'
    });
    
  };

  // Memoized handler to remove a leg - stable reference prevents LegCard re-renders
  const removeLeg = useCallback((id) => {
    setConfig(prev => ({
      ...prev,
      legs: prev.legs.filter(leg => leg.id !== id)
    }));
    setPremiumBasedCapital(null);
  }, []); // Changed: wrapped in useCallback with functional setState

  // Memoized handler to duplicate a leg - stable reference prevents LegCard re-renders
  const duplicateLeg = useCallback((legIndex, leg) => {
    setConfig(prev => {
      const updated = [...prev.legs];
      let duplicatedLeg = { ...leg, id: Date.now() };

      if (leg.isLazyLeg) {
        const existingLazyLegs = updated.filter(l => l.isLazyLeg);
        duplicatedLeg.lazyLegNumber = existingLazyLegs.length + 1;
      }

      updated.splice(legIndex + 1, 0, duplicatedLeg);
      return { ...prev, legs: updated };
    });
  }, []); // Changed: wrapped in useCallback with functional setState

  const clearAllLegs = () => {
    const newConfig = { ...config, legs: [] };
    setConfig(newConfig);
  };
  const handleSubmit = async () => {
    // Variable to store updated strategy info after auto-save
    let updatedStrategyId = strategyId;
    let updatedStrategyName = config.strategy_name;
    let updatedVersion = contextVersion;

    // Auto-save strategy before backtest if it's a loaded/saved strategy with changes
    if (strategyId && strategyId !== -999 && strategyId !== '-999' && userMadeChanges && config.strategy_name) {
      try {
        // Show saving status
        setResponsePopup({ 
          type: 'info', 
          title: 'Saving changes before backtest...' 
        });

        // Pass the current config directly to save callback
        const saveResult = await onSaveStrategy(config);
        
        if (!saveResult) {
          // Save failed
          setResponsePopup({ 
            type: 'error', 
            title: 'Failed to save changes. Please try again.' 
          });
          logger.error('[BACKTEST] Auto-save failed: No result returned');
          return; // Don't proceed with backtest
        }

        // CRITICAL: Extract updated strategy info from save result
        updatedStrategyId = saveResult.strategy_id || saveResult.data?.strategy_id || strategyId;
        updatedStrategyName = saveResult.strategy_name || saveResult.data?.strategy_name || config.strategy_name;
        updatedVersion = saveResult.version || saveResult.data?.version || contextVersion || 1;
        
        console.log('[BACKTEST] Auto-save completed, updated values:', {
          strategy_id: updatedStrategyId,
          strategy_name: updatedStrategyName,
          version: updatedVersion
        });

        // REMOVED: Auto-refresh of compare data after save
        // Compare data will only be fetched when user clicks "Compare Backtest" button

        // Clear the popup before proceeding to backtest
        setResponsePopup(null);
      } catch (error) {
        // Save failed - show error and stop
        setResponsePopup({ 
          type: 'error', 
          title: 'Failed to save changes. Please try again.' 
        });
        logger.error('[BACKTEST] Auto-save failed:', error);
        return; // Don't proceed with backtest
      }
    }

    if (!config.symbol) {
      alert('Please select a symbol');
      return;
    }
    
    if (!config.start_date || !config.end_date) {
      alert('Please select both start and end dates');
      return;
    }
    
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormatRegex.test(config.start_date) || !dateFormatRegex.test(config.end_date)) {
      logger.error('[BACKTEST] Invalid date format:', {
        start_date: config.start_date,
        end_date: config.end_date
      });
      alert('Invalid date format. Please select dates from the calendar.');
      return;
    }
    
    if (new Date(config.end_date) < new Date(config.start_date)) {
      alert('End date must be after start date');
      return;
    }

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

    const timeFormatRegex = /^\d{2}:\d{2}$/;
    if (!config.entry_time || !timeFormatRegex.test(config.entry_time)) {
      alert('Please enter a valid Entry Time (HH:MM)');
      return;
    }
    if (!config.exit_time || !timeFormatRegex.test(config.exit_time)) {
      alert('Please enter a valid Exit Time (HH:MM)');
      return;
    }
    {
      const [eh, em] = config.entry_time.split(':').map(Number);
      const [xh, xm] = config.exit_time.split(':').map(Number);
      if (eh * 60 + em >= xh * 60 + xm) {
        alert('Entry Time must be before Exit Time');
        return;
      }
    }


    const toNumber = (val) => (val === '' || val === null || val === undefined) ? 0 : Number(val);

    const formatTime = (time) => {
      if (!time) return '00:00:00';
      const parts = time.split(':');
      return `${(parts[0] || '00').padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}:00`;
    };

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

    const strikeCriteriaMap = {
      'based on points': 'based on points',           // lowercase
      'closest premium': 'closest premium',           // lowercase
      'based on atm percent': 'atm percentage',       // Map to 'atm percentage' (backend name)
      'premium range': 'premium range',               // lowercase
      'based on premium range': 'premium range',      // Map to 'premium range' (without "based on")
      'based_on_points': 'based on points',
      'closest_premium': 'closest premium',
      'based_on_atm_percent': 'atm percentage',
      'premium_range': 'premium range',
    };
    
    const getMappedStrikeCriteria = (criteria) => {
      if (!criteria) return 'closest premium';
      const normalized = criteria.toLowerCase().trim();
      const mapped = strikeCriteriaMap[normalized] || criteria;
      return mapped;
    };

    const typeMap = {
      'points':                'POINTS',
      'percentage':            'PERCENT',
      'percent':               'PERCENT',
      'mtm':                   'MTM',
      'underlying_points':     'UNDERLYING_POINTS',
      'underlying_percentage': 'UNDERLYING_PERCENT',
    };

    const normalizeType = (typeValue) => {
      if (!typeValue) return 'POINTS';
      const lower = typeValue.toLowerCase();
      return typeMap[lower] || typeValue.toUpperCase();
    };

    const momentumModeMap = {
      'points':                       'POINTS_UP',
      'points_down':                  'POINTS_DOWN',
      'percentage':                   'PERCENT_UP',
      'percentage_down':              'PERCENT_DOWN',
      'underlying_points_up':         'UNDERLYING_POINTS_UP',
      'underlying_points_down':       'UNDERLYING_POINTS_DOWN',
      'underlying_percentage_up':     'UNDERLYING_PERCENT_UP',
      'underlying_percentage_down':   'UNDERLYING_PERCENT_DOWN',
      'percent_up':                   'PERCENT_UP',
      'percent_down':                 'PERCENT_DOWN',
    };

    const normalizeMomentumType = (momentumMode) => {
      if (!momentumMode) return 'PERCENT_DOWN';
      const lower = momentumMode.toLowerCase();
      return momentumModeMap[lower] || momentumMode.toUpperCase();
    };

    const reentryModeMap = {
      're_asap':              'RE_ASAP',
      're_asap_reverse':      'RE_ASAP_REVERSE',
      're_momentum':          'RE_MOMENTUM',
      're_momentum_reverse':  'RE_MOMENTUM_REVERSE',
      're_cost':              'RE_COST',
      're_cost_reverse':      'RE_COST_REVERSE',
    };

    const buildLegObject = (leg, idx, allLegs) => {
      
      
      
      
      const actualPremiumValue = (leg.strike_criteria === 'closest premium' || leg.strike_criteria === 'closest_premium')
        ? toNumber(leg.strike_value)
        : ((leg.strike_criteria === 'premium range' || leg.strike_criteria === 'premium_range') ? toNumber(leg.premium_tolerance) : 0);
      
      
      const atmOperatorValue = (() => {
        const direction = leg.atm_percent_direction;
        if (direction === '+') return '+';
        if (direction === '-') return '-';
        return '+';
      })();
      
      const legObject = {
        ...(leg.isLazyLeg && { leg_name: leg.customName || `lazy${leg.lazyLegNumber}` || null }),
        lot_size:             toNumber(leg.lots),
        position_type:        (leg.position || 'buy').toUpperCase(),
        option_type:          (leg.option_type || 'call').toLowerCase(),
        expiry_type:          leg.expiry ? leg.expiry : '0dte',
        strike_criteria:      getMappedStrikeCriteria(leg.strike_criteria).toLowerCase(),
        atm_strike:           (leg.strike_criteria === 'based on points' || leg.strike_criteria === 'based_on_points' ||
                               leg.strike_criteria === 'based on atm percent' || leg.strike_criteria === 'based_on_atm_percent' ||
                               leg.strike_criteria === 'atm percentage')
                              ? formatStrikeTypeForBackend(leg.strike_type)
                              : null,
        strike_sign:          (leg.strike_criteria === 'based on atm percent' || 
                               leg.strike_criteria === 'based_on_atm_percent' ||
                               leg.strike_criteria === 'atm percentage')
                              ? (leg.atm_percent_direction === '-' ? '-' : '+')
                              : parseStrikeType(leg.strike_type).sign,
        premium_value:        (leg.strike_criteria === 'closest premium' || leg.strike_criteria === 'closest_premium')
                                ? toNumber(leg.strike_value)
                                : ((leg.strike_criteria === 'premium range' || leg.strike_criteria === 'premium_range') ? toNumber(leg.premium_tolerance) : 0),
        lower_range:          toNumber(leg.lower_range),
        upper_range:          toNumber(leg.upper_range),
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
        stoploss_moves:       leg.trail_enabled ? toNumber(leg.trail_lock_value) : null,
        is_reentry_sl:        leg.reentry_sl_enabled || false,
        reentry_sl_type:      null,
        reentry_sl_value:     0,
        is_reentry_target:    leg.reentry_tgt_enabled || false,
        reentry_target_type:  null,
        reentry_target_value: 0,
        is_simple_momentum:   leg.momentum_enabled || false,
        momentum_type:        normalizeMomentumType(leg.momentum_mode),
        momentum_value:       toNumber(leg.momentum_value),
        ...(leg.isLazyLeg ? {} : {
          is_range_breakout:    leg.range_enabled || false,
          range_breakout_type:  leg.range_enabled ? (leg.range_instrument === 'instrument' ? 'Instrument' : 'Underlying') : null,
          range_end_time:       leg.range_enabled ? formatTime(leg.range_time) : null,
          range_on:             leg.range_enabled ? ((leg.range_direction || 'high').charAt(0).toUpperCase() + (leg.range_direction || 'high').slice(1)) : null,
        }),
      };

      if (leg.reentry_sl_enabled) {
        if (!leg.isSequentialLeg && leg.reentry_sl_mode && leg.reentry_sl_mode.startsWith('lazy_leg_')) {
          const lazyLegId = parseInt(leg.reentry_sl_mode.replace('lazy_leg_', ''));
          const referencedLazyLeg = allLegs.find(l => l.id === lazyLegId);
          
          if (referencedLazyLeg) {
            legObject.reentry_sl_type = 'LAZY_LEG';
            legObject.reentry_sl_value = 1;
            legObject.lazy_leg = buildLegObject(referencedLazyLeg, idx, allLegs);
            if (referencedLazyLeg.customName) {
              legObject.lazy_leg.leg_name = referencedLazyLeg.customName;
            }
          } else {
            legObject.reentry_sl_type = 'RE_ASAP';
            legObject.reentry_sl_value = toNumber(leg.reentry_sl_count);
          }
        } else {
          legObject.reentry_sl_type = reentryModeMap[leg.reentry_sl_mode] || (leg.reentry_sl_mode ? leg.reentry_sl_mode.toUpperCase() : 'RE_ASAP');
          legObject.reentry_sl_value = toNumber(leg.reentry_sl_count);
        }
      } else {
        legObject.reentry_sl_value = 0;
      }

      if (leg.reentry_tgt_enabled) {
        if (!leg.isSequentialLeg && leg.reentry_tgt_mode && leg.reentry_tgt_mode.startsWith('lazy_leg_')) {
          const lazyLegId = parseInt(leg.reentry_tgt_mode.replace('lazy_leg_', ''));
          const referencedLazyLeg = allLegs.find(l => l.id === lazyLegId);
          
          if (referencedLazyLeg) {
            legObject.reentry_target_type = 'LAZY_LEG';
            legObject.reentry_target_value = 1;
            if (!legObject.lazy_leg) {
              legObject.lazy_leg = buildLegObject(referencedLazyLeg, idx, allLegs);
              if (referencedLazyLeg.customName) {
                legObject.lazy_leg.leg_name = referencedLazyLeg.customName;
              }
            }
          } else {
            legObject.reentry_target_type = 'RE_ASAP';
            legObject.reentry_target_value = toNumber(leg.reentry_tgt_count);
          }
        } else {
          legObject.reentry_target_type = reentryModeMap[leg.reentry_tgt_mode] || (leg.reentry_tgt_mode ? leg.reentry_tgt_mode.toUpperCase() : 'RE_ASAP');
          legObject.reentry_target_value = toNumber(leg.reentry_tgt_count);
        }
      } else {
        legObject.reentry_target_value = 0;
      }

      return legObject;
    };

    const allLegs = config.legs;
    const mainLegs = allLegs.filter(leg => !leg.isLazyLeg && !leg.isSequentialLeg);
    
    const legsArray = mainLegs.map((leg, idx) => {
      const legObject = buildLegObject(leg, idx, allLegs);
      
      if (config.strategy_type === 'sequential') {
        const mainLegIndex = allLegs.findIndex(l => l.id === leg.id);
        const sequentialLeg = allLegs.find(l => l.isSequentialLeg && l.parentLegIndex === mainLegIndex);
        
        if (sequentialLeg) {
          const sequentialLegObject = buildLegObject(sequentialLeg, idx, allLegs);
          sequentialLegObject.leg_name = sequentialLeg.customName || `SEQ#${sequentialLeg.sequentialLegNumber}`;
          legObject.sequential_leg = sequentialLegObject;
        }
      }
      
      return legObject;
    });

    config.legs.forEach((leg, i) => {
    });

    
    
    const strategyObject = {
      strategy_id:                     updatedStrategyId || strategyId || -999,  // Use updated ID from save result
      strategy_name:                   updatedStrategyName || config.strategy_name || `strategy_${Date.now()}`,  // Use updated name from save result
      version:                         updatedVersion || contextVersion || 1,  // Use updated version from save result
      action:                          'save',
      symbol:                          config.symbol,
      start_date:                      config.start_date,
      end_date:                        config.end_date,
      dte_filter:                      (() => {
        if (config.strategy_type === 'btst') {
          if (config.dte_filter === 'combined' || config.dte_filter === 'combine_dte') {
            return 1;
          }
          return config.dte_filter ? toNumber(config.dte_filter) : 1;
        }
        return toNumber(config.dte_filter);
      })(),
      underlying_type:                 config.underlying_from === 'futures' ? 'futures' : 'cash',
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
      overall_reentry_sl_value:        config.overall_reentry_sl_enabled ? toNumber(config.overall_reentry_sl_count) : 0,
      is_overall_reentry_target:       config.overall_reentry_tgt_enabled || false,
      overall_reentry_target_type:     config.overall_reentry_tgt_enabled ? (reentryModeMap[config.overall_reentry_tgt_mode] || (config.overall_reentry_tgt_mode ? config.overall_reentry_tgt_mode.toUpperCase() : 'RE_ASAP')) : null,
      overall_reentry_target_value:    config.overall_reentry_tgt_enabled ? toNumber(config.overall_reentry_tgt_count) : 0,
      is_overall_trail_sl:             config.lock_profit_enabled || false,
      overall_trail_sl_type:           config.lock_profit_enabled ? normalizeType(config.lock_profit_mode) : 'POINTS',
      overall_instrument_move:         config.lock_profit_enabled ? toNumber(config.lock_profit_value1) : 0,
      overall_stoploss_move:           config.lock_profit_enabled ? toNumber(config.lock_profit_value2) : 0,
      leg_count:                       legsArray.length,
    };

    const backtestPayload = {
      strategy: strategyObject,
      legs: legsArray,
    };

    backtestPayload.legs.forEach((leg, idx) => {
    });
    backtestPayload.legs.forEach((leg, idx) => {
    });

    sendBacktestRequest(backtestPayload);
  };

  const sendBacktestRequest = async (payload) => {
    try {
      // Log the strategy info being sent to backend
      console.log('[BACKTEST] Sending payload with strategy info:', {
        strategy_id: payload.strategy.strategy_id,
        strategy_name: payload.strategy.strategy_name,
        version: payload.strategy.version
      });

      const payloadValidation = validatePayload(payload);
      if (!payloadValidation.isValid) {
        logger.error('[BACKTEST] PAYLOAD VALIDATION FAILED:');
        logger.error('[BACKTEST] Missing Fields:', payloadValidation.missingFields);
        logger.error('[BACKTEST] Invalid Types:', payloadValidation.invalidTypes);
        alert(`Payload Validation Error:\n${payloadValidation.missingFields.join('\n')}`);
        return;
      }

      
      payload.legs.forEach((leg, index) => {
        if (leg.is_range_breakout) {
        } else {
        }
      });

      onRunBacktest(payload);

    } catch (error) {
      logger.error('[BACKTEST] CRITICAL ERROR IN BACKTEST HANDLER');
      logger.error('[BACKTEST] Error:', error.message);
      alert(`Backtest Error: ${error.message}`);
    }
  };

  const validatePayload = (payload) => {
    const missingFields = [];
    const invalidTypes = [];
    
    const requiredStrategyFields = [
      'action', 'strategy_name', 'symbol', 'start_date', 'end_date',
      'dte_filter', 'underlying_type', 'is_squareoff', 'is_trail_sl_break_even',
      'strategy_type', 'entry_time', 'exit_time', 'leg_count'
    ];
    
    const requiredLegFields = [
      'lot_size', 'position_type', 'option_type', 'expiry_type',
      'strike_criteria', 'atm_strike', 'strike_sign', 'premium_value',
      'is_target', 'target_type', 'target_value',
      'is_stoploss', 'stoploss_type', 'stoploss_value',
      'is_trail_sl', 'is_reentry_sl', 'is_reentry_target',
      'is_simple_momentum', 'is_range_breakout'
    ];
    
    if (!payload.strategy) {
      missingFields.push('strategy: object is missing');
      return { isValid: false, missingFields, invalidTypes };
    }
    
    for (const field of requiredStrategyFields) {
      if (!(field in payload.strategy)) {
        missingFields.push(`strategy.${field}`);
      }
    }
    
    if (typeof payload.strategy.dte_filter !== 'number') {
      invalidTypes.push(`strategy.dte_filter should be number, got ${typeof payload.strategy.dte_filter}`);
    }
    if (typeof payload.strategy.is_squareoff !== 'boolean') {
      invalidTypes.push(`strategy.is_squareoff should be boolean, got ${typeof payload.strategy.is_squareoff}`);
    }
    
    if (!Array.isArray(payload.legs)) {
      missingFields.push('legs: array is missing or not an array');
      return { isValid: false, missingFields, invalidTypes };
    }
    
    if (payload.legs.length === 0) {
      missingFields.push('legs: array is empty, must have at least one leg');
      return { isValid: false, missingFields, invalidTypes };
    }
    
    for (let i = 0; i < payload.legs.length; i++) {
      const leg = payload.legs[i];
      for (const field of requiredLegFields) {
        if (!(field in leg)) {
          missingFields.push(`legs[${i}].${field}`);
        }
      }
      
      if (typeof leg.lot_size !== 'number') {
        invalidTypes.push(`legs[${i}].lot_size should be number, got ${typeof leg.lot_size}`);
      }
      if (typeof leg.is_target !== 'boolean') {
        invalidTypes.push(`legs[${i}].is_target should be boolean, got ${typeof leg.is_target}`);
      }
    }
    
    const isValid = missingFields.length === 0 && invalidTypes.length === 0;
    
    
    return { isValid, missingFields, invalidTypes };
  };

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
      logger.error('CSV download error:', error);
      let errorMsg = error.message;
      if (errorMsg.includes('No backtest results')) {
        errorMsg = 'Please run a backtest first before downloading CSV.';
      } else if (errorMsg.includes('No trades found')) {
        errorMsg = 'No trades to export. Try running backtest with different settings.';
      }
      alert('CSV Download Failed:\n\n' + errorMsg);
    }
  };

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
      logger.error('Excel download error:', error);
      let errorMsg = error.message;
      if (errorMsg.includes('No backtest results')) {
        errorMsg = 'Please run a backtest first before downloading Excel.';
      } else if (errorMsg.includes('No trades found')) {
        errorMsg = 'No trades to export. Try running backtest with different settings.';
      }
      alert('Excel Download Failed:\n\n' + errorMsg);
    }
  };

  const handleCompareBacktest = async () => {
    
    if (!strategyId || strategyId === -999 || strategyId === '-999') {
      logger.error('[Compare] Invalid strategy ID:', strategyId);
      alert('⚠️ Cannot compare backtest for unsaved strategy.\n\nPlease save the strategy first before comparing.');
      return;
    }
    
    if (!config.strategy_name) {
      logger.error('[Compare] Missing strategy name');
      alert('⚠️ Strategy name is missing.\n\nPlease save the strategy with a name first.');
      return;
    }
    
    try {
      setLoadingCompare(true);
      
      // REMOVED DELAY - Fetch immediately for instant response
      console.log('[Compare] Fetching compare data with:', { strategyId, strategyName: config.strategy_name });
      const result = await compareBacktests(strategyId, config.strategy_name);
      
      console.log('[Compare] ===== COMPARE API RESPONSE =====');
      console.log('[Compare] Success:', result.success);
      console.log('[Compare] Total versions returned:', result.data?.length || 0);
      console.log('[Compare] Full data:', JSON.stringify(result.data, null, 2));
      console.log('[Compare] =====================================');
      
      if (result.data && Array.isArray(result.data)) {
        console.log('[Compare] Versions detail:', result.data.map(v => ({ 
          version: v.version, 
          created_at: v.created_at,
          overall_mtm: v.overall_mtm,
          strategy_id: v.strategy_id,
          strategy_name: v.strategy_name
        })));
      }
      
      if (result.success) {
        if (!result.data || result.data.length === 0) {
          alert('⚠️ No backtest versions found.\n\nPlease run a backtest first to generate comparison data.');
          return;
        }
        setCompareData(result.data);
        setCompareSidebarOpen(true);
      } else {
        throw new Error(result.message || 'Failed to fetch comparison data');
      }
    } catch (error) {
      logger.error('[Compare] ===== ERROR =====');
      logger.error('[Compare] Error object:', error);
      logger.error('[Compare] Error message:', error.message);
      logger.error('[Compare] Error stack:', error.stack);
      alert(`Failed to load comparison data:\n\n${error.message}`);
    } finally {
      setLoadingCompare(false);
    }
  };

  // Function to scroll to parameters section after loading a version
  const handleScrollToParameters = () => {
    if (dataSelectionRef.current) {
      // Close the compare sidebar first
      setCompareSidebarOpen(false);
      
      // Small delay to ensure sidebar closes first, then scroll
      setTimeout(() => {
        dataSelectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 300);
    }
  };

  const loadData = async () => {

    if (!config.start_date || !config.end_date) {
      const errorMsg = '⚠️ Please select both Start Date and End Date before loading data';
      logger.error('[Load Data]', errorMsg);
      setDataStatus(errorMsg);
      setResponsePopup({ type: 'error', title: errorMsg });
      return;
    }
    if (new Date(config.end_date) < new Date(config.start_date)) {
      const errorMsg = '⚠️ End Date must be after Start Date';
      logger.error('[Load Data]', errorMsg);
      setDataStatus(errorMsg);
      setResponsePopup({ type: 'error', title: errorMsg });
      return;
    }

    setLoadingData(true);
    setDataLoaded(false);

    let dteType;
    if (config.dte_filter === 'combine_dte') {
      dteType = 'combined_dte';
    } else if (config.dte_filter === 'combined') {
      dteType = 'combined_dte';
    } else {
      dteType = config.dte_filter === '0' || config.dte_filter === 0 ? '0dte' : '1dte';
    }
    
    const requestPayload = {
      start_date: config.start_date,
      end_date:   config.end_date,
      dte_type:   dteType,
      symbol:     config.symbol,
    };


    try {
      const response = await fetch(`${API_URL}/load-data`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify(requestPayload),
      });

      const rawText = await response.text();
      let result;
      try {
        result = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Server returned invalid response (HTTP ${response.status})`);
      }


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
          
          // Auto-select BTST strategy type if Combined DTE is loaded
          const isCombinedDTE = config.dte_filter === 'combine_dte' || config.dte_filter === 'combined';
          if (isCombinedDTE && config.strategy_type !== 'btst') {
            setConfig(prev => ({ ...prev, strategy_type: 'btst' }));
            console.log('[Load Data] Combined DTE loaded - automatically changed Strategy Type to BTST');
          }
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


  return (

    <div className="min-h-screen bg-gray-50 pb-32">
      <ToggleSwitchStyles />
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
                <select 
                  ref={symbolRef}
                  value={config.symbol} 
                  onChange={(e) => handleChange('symbol', e.target.value)}
                  onKeyDown={(e) => handleFieldNavigation(e, symbolRef)}
                  className="w-full px-6 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-lg font-medium hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <option value="SPXW">SPXW</option>
                </select>
              </div>

              {/* DTE Filter */}
              <div className="flex-shrink-0" style={{ width: '180px' }}>
                <label className="block text-base font-semibold text-slate-700 mb-2">DTE Filter</label>
                <select 
                  ref={dteFilterRef}
                  value={config.dte_filter} 
                  onChange={(e) => {
                    const newDteFilter = e.target.value;
                    handleChange('dte_filter', newDteFilter);
                  }}
                  onKeyDown={(e) => handleFieldNavigation(e, dteFilterRef)}
                  className="w-full px-6 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-lg font-medium hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <option value="0">0DTE</option>
                  <option value="1">1DTE</option>
                  <option value="combine_dte">Combined DTE</option>
                </select>
              </div>

              {/* Start Date - Segmented DD/MM/YYYY with single-click */}
              <div className="flex-shrink-0" style={{ width: '180px' }}>
                <label className="block text-base font-semibold text-slate-700 mb-2">Start Date</label>
                <DateSegmentInput
                  ref={startDateRef}
                  value={config.start_date} 
                  onCommit={(newValue) => handleChange('start_date', newValue)}
                  onKeyDown={(e) => handleFieldNavigation(e, startDateRef)}
                  placeholder="Start Date"
                />
              </div>

              {/* End Date - Segmented DD/MM/YYYY with single-click */}
              <div className="flex-shrink-0" style={{ width: '180px' }}>
                <label className="block text-base font-semibold text-slate-700 mb-2">End Date</label>
                <DateSegmentInput
                  ref={endDateRef}
                  value={config.end_date} 
                  onCommit={(newValue) => handleChange('end_date', newValue)}
                  onKeyDown={(e) => handleFieldNavigation(e, endDateRef)}
                  placeholder="End Date"
                />
              </div>

              {/* Load Data Button */}
              <div className="flex flex-col gap-1 flex-shrink-0" style={{ width: '180px' }}>
              <button 
                ref={loadDataRef}
                onClick={loadData}
                onKeyDown={(e) => handleFieldNavigation(e, loadDataRef)}
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
                ref={strategyTypeRef}
                value={config.strategy_type || 'intraday'}
                onChange={(e) => handleChange('strategy_type', e.target.value)}
                onKeyDown={(e) => handleEntrySettingsNavigation(e, strategyTypeRef)}
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
            <div className="flex items-center gap-6">
              <label className="text-base font-semibold text-slate-700 whitespace-nowrap">Entry Time (UTC)</label>
              <TimeSegmentInput
                ref={entryTimeRef}
                value={config.entry_time}
                onCommit={(formatted) => commitTime('entry_time', formatted)}
                placeholder="Entry Time"
                onKeyDown={(e) => handleEntrySettingsNavigation(e, entryTimeRef)}
              />
            </div>

            {/* Exit Time */}
            <div className="flex items-center gap-6">
              <label className="text-base font-semibold text-slate-700 whitespace-nowrap">Exit Time (UTC)</label>
              <TimeSegmentInput
                ref={exitTimeRef}
                value={config.exit_time}
                onCommit={(formatted) => commitTime('exit_time', formatted)}
                placeholder="Exit Time"
                onKeyDown={(e) => handleEntrySettingsNavigation(e, exitTimeRef)}
              />
            </div>

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
                  <div className="relative flex items-center">
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={currentLeg.atm_percent_value ?? ''} 
                      onChange={(e) => handleLegChange('atm_percent_value', e.target.value)}
                      onFocus={handleNumberFocus}
                      className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="0"
                    />
                    <span className="absolute right-3 text-sm font-medium text-gray-600 pointer-events-none">%</span>
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

      {/* Lazy Leg Configuration Modal - EXACT REPLICA OF LEG BUILDER */}
      {showLazyLegModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Create New Lazy Leg</h2>
                <p className="text-xs text-gray-500 mt-1">Configure a lazy leg that will be created when re-entry condition is met</p>
              </div>
              <button
                onClick={() => {
                  setShowLazyLegModal(false);
                  setLazyLegContext(null);
                  setLazyLegConfig({
                    customName: '',
                    lots: 1,
                    expiry: '0dte',
                    position: 'buy',
                    option_type: 'call',
                    strike_criteria: 'based on points',
                    atm_strike: 'atm',
                    atm_percent_direction: '+',
                    atm_percent_value: '',
                    closest_premium_value: '',
                    lower_range: '',
                    upper_range: '',
                    premium_value: '',
                    target_enabled: false,
                    target_type: 'points',
                    target_value: '0.00',
                    stop_loss_enabled: false,
                    stop_loss_type: 'points',
                    stop_loss_value: '0.00',
                    trail_sl_enabled: false,
                    trail_sl_type: 'points',
                    trail_sl_value: '0.00',
                    trail_sl_lock_value: '0.00',
                    reentry_tgt_enabled: false,
                    reentry_tgt_mode: 're_cost',
                    reentry_tgt_count: '1.00',
                    reentry_sl_enabled: false,
                    reentry_sl_mode: 're_cost',
                    reentry_sl_count: '1.00',
                    momentum_enabled: false,
                    momentum_type: 'points_up',
                    momentum_value: '0.00',
                    range_breakout_enabled: false,
                    range_instrument: 'underlying',
                    range_time: '14.45',
                    range_direction: 'high'
                  });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body - Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Name Input Section */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Enter Leg Name</label>
                <input
                  type="text"
                  value={lazyLegConfig.customName}
                  onChange={(e) => setLazyLegConfig({...lazyLegConfig, customName: e.target.value})}
                  placeholder={`lazy${config.legs.filter(leg => leg.isLazyLeg).length + 1}`}
                  className="w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              
              {/* LEG BUILDER REPLICA - Exact same layout as in the main component */}
              <div className="w-full bg-white rounded-lg shadow-xl border border-white overflow-hidden animate-fade-in">
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
                        value={lazyLegConfig.lots} 
                        onChange={(e) => { 
                          const val = Number(e.target.value);
                          if (val < 0) {
                            setResponsePopup({ type: 'error', title: 'Total Lot cannot be negative' });
                            return;
                          }
                          setLazyLegConfig({...lazyLegConfig, lots: val}); 
                        }} 
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        placeholder="1"
                      />
                    </div>

                    {/* Expiry */}
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-700 mb-1">Expiry</label>
                      <select 
                        value={lazyLegConfig.expiry} 
                        onChange={(e) => setLazyLegConfig({...lazyLegConfig, expiry: e.target.value})} 
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
                          onClick={() => setLazyLegConfig({...lazyLegConfig, position: 'buy'})}
                          className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                            lazyLegConfig.position === 'buy'
                              ? 'text-white shadow-sm'
                              : 'bg-transparent text-gray-600'
                          }`}
                          style={lazyLegConfig.position === 'buy' ? { backgroundColor: '#4682b4' } : {}}
                        >
                          Buy
                        </button>
                        <button
                          onClick={() => setLazyLegConfig({...lazyLegConfig, position: 'sell'})}
                          className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                            lazyLegConfig.position === 'sell'
                              ? 'text-white shadow-sm'
                              : 'bg-transparent text-gray-600'
                          }`}
                          style={lazyLegConfig.position === 'sell' ? { backgroundColor: '#4682b4' } : {}}
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
                          onClick={() => setLazyLegConfig({...lazyLegConfig, option_type: 'call'})}
                          className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                            lazyLegConfig.option_type === 'call'
                              ? 'text-white shadow-sm'
                              : 'bg-transparent text-gray-600'
                          }`}
                          style={lazyLegConfig.option_type === 'call' ? { backgroundColor: '#4682b4' } : {}}
                        >
                          Call
                        </button>
                        <button
                          onClick={() => setLazyLegConfig({...lazyLegConfig, option_type: 'put'})}
                          className={`flex-1 px-3 py-2 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 ${
                            lazyLegConfig.option_type === 'put'
                              ? 'text-white shadow-sm'
                              : 'bg-transparent text-gray-600'
                          }`}
                          style={lazyLegConfig.option_type === 'put' ? { backgroundColor: '#4682b4' } : {}}
                        >
                          Put
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Strike Criteria / ATM Strike / Dynamic Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-17">
                    {/* Strike Criteria */}
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-700 mb-1">Strike Criteria</label>
                      <select 
                        value={lazyLegConfig.strike_criteria} 
                        onChange={(e) => setLazyLegConfig({...lazyLegConfig, strike_criteria: e.target.value})} 
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="based on points">Based On Strike</option>
                        <option value="based on atm percent">Based On ATM %</option>
                        <option value="based on premium range">Based On premium range</option>
                        <option value="closest premium">Based On Closest Premium</option>
                      </select>
                    </div>

                    {/* ATM Strike - Only show when Strike Criteria is "Based On Strike" */}
                    {lazyLegConfig.strike_criteria === 'based on points' && (
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-700 mb-1">ATM Strike</label>
                        <select 
                          value={lazyLegConfig.atm_strike} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, atm_strike: e.target.value})} 
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

                    {/* ATM Direction - Only show when Strike Criteria is "Based On ATM %" */}
                    {lazyLegConfig.strike_criteria === 'based on atm percent' && (
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-700 mb-1">ATM</label>
                        <select
                          value={lazyLegConfig.atm_percent_direction}
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, atm_percent_direction: e.target.value})}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </select>
                      </div>
                    )}

                    {/* ATM Percentage - Only show when Strike Criteria is "Based On ATM %" */}
                    {lazyLegConfig.strike_criteria === 'based on atm percent' && (
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-700 mb-1">%</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={lazyLegConfig.atm_percent_value} 
                            onChange={(e) => setLazyLegConfig({...lazyLegConfig, atm_percent_value: e.target.value})}
                            onFocus={handleNumberFocus}
                            className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="0.00"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600">%</span>
                        </div>
                      </div>
                    )}

                    {/* Lower Range - Only show when Strike Criteria is "Based On premium range" */}
                    {lazyLegConfig.strike_criteria === 'based on premium range' && (
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-700 mb-1">Lower Range</label>
                        <input 
                          type="number" 
                          value={lazyLegConfig.lower_range} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, lower_range: e.target.value})}
                          onFocus={handleNumberFocus}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    )}

                    {/* Upper Range - Only show when Strike Criteria is "Based On premium range" */}
                    {lazyLegConfig.strike_criteria === 'based on premium range' && (
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-700 mb-1">Upper Range</label>
                        <input 
                          type="number" 
                          value={lazyLegConfig.upper_range} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, upper_range: e.target.value})}
                          onFocus={handleNumberFocus}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    )}

                    {/* Nearest - Only show when Strike Criteria is "Based On Closest Premium" */}
                    {lazyLegConfig.strike_criteria === 'closest premium' && (
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-700 mb-1">Nearest</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          value={lazyLegConfig.closest_premium_value} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, closest_premium_value: e.target.value})}
                          onFocus={handleNumberFocus}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 3: Target / Stop Loss / Trail SL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-17">
                    {/* Target */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-xs font-semibold text-slate-700">Target</label>
                        <ToggleSwitch 
                          checked={lazyLegConfig.target_enabled} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, target_enabled: e.target.checked})} 
                        />
                      </div>
                      <div className="flex gap-2">
                        <select 
                          value={lazyLegConfig.target_type} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, target_type: e.target.value})} 
                          disabled={!lazyLegConfig.target_enabled}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        >
                          <option value="points">Points</option>
                          <option value="percentage">Percentage</option>
                          <option value="underlying_points">Underlying Points</option>
                          <option value="underlying_percentage">Underlying Percentage</option>
                        </select>
                        <input 
                          type="number" 
                          value={lazyLegConfig.target_value} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, target_value: e.target.value})}
                          onFocus={handleNumberFocus}
                          disabled={!lazyLegConfig.target_enabled}
                          className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* Stop Loss */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-xs font-semibold text-slate-700">Stop Loss</label>
                        <ToggleSwitch 
                          checked={lazyLegConfig.stop_loss_enabled} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, stop_loss_enabled: e.target.checked})} 
                        />
                      </div>
                      <div className="flex gap-2">
                        <select 
                          value={lazyLegConfig.stop_loss_type} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, stop_loss_type: e.target.value})} 
                          disabled={!lazyLegConfig.stop_loss_enabled}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        >
                          <option value="points">Points</option>
                          <option value="percentage">Percentage</option>
                          <option value="underlying_points">Underlying Points</option>
                          <option value="underlying_percentage">Underlying Percentage</option>
                        </select>
                        <input 
                          type="number" 
                          value={lazyLegConfig.stop_loss_value} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, stop_loss_value: e.target.value})}
                          onFocus={handleNumberFocus}
                          disabled={!lazyLegConfig.stop_loss_enabled}
                          className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* Trail SL */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-xs font-semibold text-slate-700">Trail SL</label>
                        <ToggleSwitch 
                          checked={lazyLegConfig.trail_sl_enabled} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, trail_sl_enabled: e.target.checked})} 
                        />
                      </div>
                      <div className="flex gap-1">
                        <select 
                          value={lazyLegConfig.trail_sl_type} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, trail_sl_type: e.target.value})} 
                          disabled={!lazyLegConfig.trail_sl_enabled}
                          className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        >
                          <option value="points">Points</option>
                          <option value="percentage">Percentage</option>
                        </select>
                        <input 
                          type="number" 
                          value={lazyLegConfig.trail_sl_value} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, trail_sl_value: e.target.value})}
                          onFocus={handleNumberFocus}
                          disabled={!lazyLegConfig.trail_sl_enabled}
                          className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                          placeholder="0.00"
                          step="0.01"
                        />
                        <input 
                          type="number" 
                          value={lazyLegConfig.trail_sl_lock_value} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, trail_sl_lock_value: e.target.value})}
                          onFocus={handleNumberFocus}
                          disabled={!lazyLegConfig.trail_sl_enabled}
                          className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Re-Entry Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-17">
                    {/* Re-Entry On Target */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-xs font-semibold text-slate-700">Re-Entry On Target</label>
                        <ToggleSwitch 
                          checked={lazyLegConfig.reentry_tgt_enabled} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, reentry_tgt_enabled: e.target.checked})} 
                        />
                      </div>
                      <div className="flex gap-2">
                        <select 
                          value={lazyLegConfig.reentry_tgt_mode} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, reentry_tgt_mode: e.target.value})} 
                          disabled={!lazyLegConfig.reentry_tgt_enabled}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        >
                          <option value="re_cost">RE COST</option>
                          <option value="re_asap">RE ASAP</option>
                          <option value="re_asap_rev">RE ASAP REV</option>
                          <option value="re_momentum">RE MOMENTUM</option>
                          <option value="re_momentum_rev">RE MOMENTUM REV</option>
                          <option value="re_cost_rev">RE COST REV</option>
                          <option value="lazy_leg">Lazy Leg</option>
                        </select>
                        <input 
                          type="number" 
                          value={lazyLegConfig.reentry_tgt_count} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, reentry_tgt_count: e.target.value})}
                          onFocus={handleNumberFocus}
                          disabled={!lazyLegConfig.reentry_tgt_enabled}
                          className="w-16 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                          placeholder="1.00"
                          min="1"
                        />
                      </div>
                    </div>

                    {/* Re-Entry On SL */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-xs font-semibold text-slate-700">Re-Entry On SL</label>
                        <ToggleSwitch 
                          checked={lazyLegConfig.reentry_sl_enabled} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, reentry_sl_enabled: e.target.checked})} 
                        />
                      </div>
                      <div className="flex gap-2">
                        <select 
                          value={lazyLegConfig.reentry_sl_mode} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, reentry_sl_mode: e.target.value})} 
                          disabled={!lazyLegConfig.reentry_sl_enabled}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        >
                          <option value="re_cost">RE COST</option>
                          <option value="re_asap">RE ASAP</option>
                          <option value="re_asap_rev">RE ASAP REV</option>
                          <option value="re_momentum">RE MOMENTUM</option>
                          <option value="re_momentum_rev">RE MOMENTUM REV</option>
                          <option value="re_cost_rev">RE COST REV</option>
                          <option value="lazy_leg">Lazy Leg</option>
                        </select>
                        <input 
                          type="number" 
                          value={lazyLegConfig.reentry_sl_count} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, reentry_sl_count: e.target.value})}
                          onFocus={handleNumberFocus}
                          disabled={!lazyLegConfig.reentry_sl_enabled}
                          className="w-16 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                          placeholder="1.00"
                          min="1"
                        />
                      </div>
                    </div>

                    {/* Simple Momentum */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-xs font-semibold text-slate-700">Simple Momentum</label>
                        <ToggleSwitch 
                          checked={lazyLegConfig.momentum_enabled} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, momentum_enabled: e.target.checked})} 
                        />
                      </div>
                      <div className="flex gap-2">
                        <select 
                          value={lazyLegConfig.momentum_type} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, momentum_type: e.target.value})} 
                          disabled={!lazyLegConfig.momentum_enabled}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        >
                          <option value="points_up">Points ↑</option>
                          <option value="points_down">Points ↓</option>
                          <option value="percent_up">Percent ↑</option>
                          <option value="percent_down">Percent ↓</option>
                          <option value="underlying_points_up">Underlying Points ↑</option>
                          <option value="underlying_points_down">Underlying Points ↓</option>
                          <option value="underlying_percent_up">Underlying Percent ↑</option>
                          <option value="underlying_percent_down">Underlying Percent ↓</option>
                        </select>
                        <input 
                          type="number" 
                          value={lazyLegConfig.momentum_value} 
                          onChange={(e) => setLazyLegConfig({...lazyLegConfig, momentum_value: e.target.value})}
                          onFocus={handleNumberFocus}
                          disabled={!lazyLegConfig.momentum_enabled}
                          className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                onClick={() => {
                  setShowLazyLegModal(false);
                  setLazyLegContext(null);
                }}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createLazyLeg}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sequential Leg Configuration Modal */}
      {showSequentialLegModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Create Sequential Leg for {sequentialLegParentIndex !== null ? `LEG#${sequentialLegParentIndex + 1}` : 'LEG'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">Configure a sequential leg that will be created when entry condition is met</p>
              </div>
              <button
                onClick={() => {
                  setShowSequentialLegModal(false);
                  setSequentialLegParentIndex(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body - Scrollable Content - FULL LEG BUILDER */}
            <div className="flex-1 overflow-y-auto">
              {/* Name Input Section - Matching Lazy Leg Style */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Enter Leg Name</label>
                <input
                  type="text"
                  value={sequentialLegConfig.customName}
                  onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, customName: e.target.value})}
                  placeholder="SEQ1"
                  className="w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              
              {/* LEG BUILDER REPLICA - Exact same layout as in the main component */}
              <div className="w-full bg-white rounded-lg shadow-xl border border-white overflow-hidden animate-fade-in">
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
                      value={sequentialLegConfig.lots}
                      onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, lots: e.target.value})}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  {/* Expiry */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 mb-1">Expiry</label>
                    <select
                      value={sequentialLegConfig.expiry}
                      onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, expiry: e.target.value})}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="0dte">0DTE</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {/* Position */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 mb-1">Position</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSequentialLegConfig({...sequentialLegConfig, position: 'buy'})}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          sequentialLegConfig.position === 'buy'
                            ? 'text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={sequentialLegConfig.position === 'buy' ? { backgroundColor: '#4682b4' } : {}}
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => setSequentialLegConfig({...sequentialLegConfig, position: 'sell'})}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          sequentialLegConfig.position === 'sell'
                            ? 'text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={sequentialLegConfig.position === 'sell' ? { backgroundColor: '#4682b4' } : {}}
                      >
                        Sell
                      </button>
                    </div>
                  </div>

                  {/* Option Type */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 mb-1">Option Type</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSequentialLegConfig({...sequentialLegConfig, option_type: 'call'})}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          sequentialLegConfig.option_type === 'call'
                            ? 'text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={sequentialLegConfig.option_type === 'call' ? { backgroundColor: '#4682b4' } : {}}
                      >
                        Call
                      </button>
                      <button
                        onClick={() => setSequentialLegConfig({...sequentialLegConfig, option_type: 'put'})}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          sequentialLegConfig.option_type === 'put'
                            ? 'text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={sequentialLegConfig.option_type === 'put' ? { backgroundColor: '#4682b4' } : {}}
                      >
                        Put
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Strike Criteria - ALL FIELDS IN ONE LINE (like intraday main leg) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-17">
                  {/* Strike Criteria */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 mb-1">Strike Criteria</label>
                    <select
                      value={sequentialLegConfig.strike_criteria}
                      onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, strike_criteria: e.target.value})}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="based on points">Based On Strike</option>
                      <option value="based on atm percent">Based On ATM %</option>
                      <option value="based on premium range">Based On premium range</option>
                      <option value="closest premium">Based On Closest Premium</option>
                    </select>
                  </div>

                  {/* ATM Strike - Only show when "Based On Strike" is selected */}
                  {sequentialLegConfig.strike_criteria === 'based on points' && (
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-700 mb-1">ATM Strike</label>
                      <select
                        value={sequentialLegConfig.atm_strike || 'atm'}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, atm_strike: e.target.value})}
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

                  {/* Nearest - Only show when Based On Closest Premium is selected */}
                  {sequentialLegConfig.strike_criteria === 'closest premium' && (
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-700 mb-1">Nearest</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={sequentialLegConfig.strike_value ?? ''} 
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, strike_value: e.target.value})}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {/* ATM % Fields - Only show when "Based On ATM %" is selected */}
                  {sequentialLegConfig.strike_criteria === 'based on atm percent' && (
                    <>
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-700 mb-1">ATM Strike</label>
                        <select
                          value={sequentialLegConfig.atm_percent_direction || '+'}
                          onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, atm_percent_direction: e.target.value})}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-700 mb-1">Multiplier (%)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={sequentialLegConfig.atm_percent_value ?? ''} 
                            onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, atm_percent_value: e.target.value})}
                            className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600">%</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Premium Range Fields - Only show when "Based On premium range" is selected */}
                  {sequentialLegConfig.strike_criteria === 'based on premium range' && (
                    <>
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-700 mb-1">Lower Range</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          value={sequentialLegConfig.lower_range ?? ''} 
                          onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, lower_range: e.target.value})}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-700 mb-1">Upper Range</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          value={sequentialLegConfig.upper_range ?? ''} 
                          onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, upper_range: e.target.value})}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="0"
                        />
                      </div>
                    </>
                  )}
                </div>


                {/* Row 3: Target / Stop Loss / Trail SL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-17">
                  {/* Target */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs font-semibold text-slate-700">Target</label>
                      <ToggleSwitch
                        checked={sequentialLegConfig.target_enabled || false}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, target_enabled: e.target.checked})}
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={sequentialLegConfig.target_type || 'points'}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, target_type: e.target.value})}
                        disabled={!sequentialLegConfig.target_enabled}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                      >
                        <option value="points">Points</option>
                        <option value="percentage">Percentage</option>
                        <option value="underlying_points">Underlying Points</option>
                        <option value="underlying_percentage">Underlying Percentage</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sequentialLegConfig.target_enabled ? (sequentialLegConfig.target_value || '') : ''}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, target_value: e.target.value})}
                        disabled={!sequentialLegConfig.target_enabled}
                        className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Stop Loss */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs font-semibold text-slate-700">Stop Loss</label>
                      <ToggleSwitch
                        checked={sequentialLegConfig.stop_loss_enabled || false}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, stop_loss_enabled: e.target.checked})}
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={sequentialLegConfig.stop_loss_type || 'points'}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, stop_loss_type: e.target.value})}
                        disabled={!sequentialLegConfig.stop_loss_enabled}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                      >
                        <option value="points">Points</option>
                        <option value="percentage">Percentage</option>
                        <option value="underlying_points">Underlying Points</option>
                        <option value="underlying_percentage">Underlying Percentage</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sequentialLegConfig.stop_loss_enabled ? (sequentialLegConfig.stop_loss_value || '') : ''}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, stop_loss_value: e.target.value})}
                        disabled={!sequentialLegConfig.stop_loss_enabled}
                        className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Trail SL */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs font-semibold text-slate-700">Trail SL</label>
                      <ToggleSwitch
                        checked={sequentialLegConfig.trail_sl_enabled || false}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, trail_sl_enabled: e.target.checked})}
                      />
                    </div>
                    <div className="flex gap-1">
                      <select
                        value={sequentialLegConfig.trail_sl_type || 'points'}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, trail_sl_type: e.target.value})}
                        disabled={!sequentialLegConfig.trail_sl_enabled}
                        className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                      >
                        <option value="points">Points</option>
                        <option value="percentage">Percentage</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sequentialLegConfig.trail_sl_enabled ? (sequentialLegConfig.trail_sl_value || '') : ''}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, trail_sl_value: e.target.value})}
                        disabled={!sequentialLegConfig.trail_sl_enabled}
                        className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        placeholder="0.00"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sequentialLegConfig.trail_sl_enabled ? (sequentialLegConfig.trail_sl_lock_value || '') : ''}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, trail_sl_lock_value: e.target.value})}
                        disabled={!sequentialLegConfig.trail_sl_enabled}
                        className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 4: Re-Entry On Target / Re-Entry On SL / Simple Momentum */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-17">
                  {/* Re-Entry On Target */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs font-semibold text-slate-700">Re-Entry On Target</label>
                      <ToggleSwitch
                        checked={sequentialLegConfig.reentry_tgt_enabled || false}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, reentry_tgt_enabled: e.target.checked})}
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={sequentialLegConfig.reentry_tgt_mode || 're_cost'}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, reentry_tgt_mode: e.target.value})}
                        disabled={!sequentialLegConfig.reentry_tgt_enabled}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                      >
                        <option value="re_cost">RE COST</option>
                        <option value="re_asap">RE ASAP</option>
                        <option value="re_asap_rev">RE ASAP REV</option>
                        <option value="re_momentum">RE MOMENTUM</option>
                        <option value="re_momentum_rev">RE MOMENTUM REV</option>
                        <option value="re_cost_rev">RE COST REV</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sequentialLegConfig.reentry_tgt_enabled ? (sequentialLegConfig.reentry_tgt_count || '') : ''}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, reentry_tgt_count: e.target.value})}
                        disabled={!sequentialLegConfig.reentry_tgt_enabled}
                        className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        placeholder="1.00"
                      />
                    </div>
                  </div>

                  {/* Re-Entry On SL */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs font-semibold text-slate-700">Re-Entry On SL</label>
                      <ToggleSwitch
                        checked={sequentialLegConfig.reentry_sl_enabled || false}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, reentry_sl_enabled: e.target.checked})}
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={sequentialLegConfig.reentry_sl_mode || 're_cost'}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, reentry_sl_mode: e.target.value})}
                        disabled={!sequentialLegConfig.reentry_sl_enabled}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                      >
                        <option value="re_cost">RE COST</option>
                        <option value="re_asap">RE ASAP</option>
                        <option value="re_asap_rev">RE ASAP REV</option>
                        <option value="re_momentum">RE MOMENTUM</option>
                        <option value="re_momentum_rev">RE MOMENTUM REV</option>
                        <option value="re_cost_rev">RE COST REV</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sequentialLegConfig.reentry_sl_enabled ? (sequentialLegConfig.reentry_sl_count || '') : ''}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, reentry_sl_count: e.target.value})}
                        disabled={!sequentialLegConfig.reentry_sl_enabled}
                        className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        placeholder="1.00"
                      />
                    </div>
                  </div>

                  {/* Simple Momentum */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs font-semibold text-slate-700">Simple Momentum</label>
                      <ToggleSwitch
                        checked={sequentialLegConfig.momentum_enabled || false}
                        onChange={(e) => {
                          if (e.target.checked && sequentialLegConfig.range_breakout_enabled) {
                            setResponsePopup({
                              type: 'error',
                              title: 'Please disable Range Break Out first.'
                            });
                            return;
                          }
                          setSequentialLegConfig({...sequentialLegConfig, momentum_enabled: e.target.checked});
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={sequentialLegConfig.momentum_type || 'points'}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, momentum_type: e.target.value})}
                        disabled={!sequentialLegConfig.momentum_enabled}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                      >
                        <option value="points">Points ↑</option>
                        <option value="points_down">Points ↓</option>
                        <option value="percentage">Percent ↑</option>
                        <option value="percentage_down">Percent ↓</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sequentialLegConfig.momentum_enabled ? (sequentialLegConfig.momentum_value || '') : ''}
                        onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, momentum_value: e.target.value})}
                        disabled={!sequentialLegConfig.momentum_enabled}
                        className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 5: Range Break Out (Full width like in the image) */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs font-semibold text-slate-700">Range Break Out</label>
                    <ToggleSwitch
                      checked={sequentialLegConfig.range_breakout_enabled || false}
                      onChange={(e) => {
                        if (e.target.checked && sequentialLegConfig.momentum_enabled) {
                          setResponsePopup({
                            type: 'error',
                            title: 'Please disable Simple Momentum first.'
                          });
                          return;
                        }
                        setSequentialLegConfig({...sequentialLegConfig, range_breakout_enabled: e.target.checked});
                      }}
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={sequentialLegConfig.range_instrument}
                      onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, range_instrument: e.target.value})}
                      disabled={!sequentialLegConfig.range_breakout_enabled}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                    >
                      <option value="instrument">Instrument</option>
                      <option value="underlying">Underlying</option>
                    </select>
                    <input
                      type="text"
                      value={sequentialLegConfig.range_time}
                      onChange={(e) => setSequentialLegConfig({...sequentialLegConfig, range_time: e.target.value})}
                      disabled={!sequentialLegConfig.range_breakout_enabled}
                      placeholder="14:45"
                      className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                    />
                    <button
                      onClick={() => setSequentialLegConfig({...sequentialLegConfig, range_direction: 'high'})}
                      disabled={!sequentialLegConfig.range_breakout_enabled}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        sequentialLegConfig.range_direction === 'high' && sequentialLegConfig.range_breakout_enabled
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={sequentialLegConfig.range_direction === 'high' && sequentialLegConfig.range_breakout_enabled ? { backgroundColor: '#4682b4' } : {}}
                    >
                      High
                    </button>
                    <button
                      onClick={() => setSequentialLegConfig({...sequentialLegConfig, range_direction: 'low'})}
                      disabled={!sequentialLegConfig.range_breakout_enabled}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        sequentialLegConfig.range_direction === 'low' && sequentialLegConfig.range_breakout_enabled
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={sequentialLegConfig.range_direction === 'low' && sequentialLegConfig.range_breakout_enabled ? { backgroundColor: '#4682b4' } : {}}
                    >
                      Low
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                onClick={() => {
                  setShowSequentialLegModal(false);
                  setSequentialLegParentIndex(null);
                }}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createSequentialLeg}
                className="px-6 py-2 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-sm"
                style={{ backgroundColor: '#4682b4' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

            {/* ADDED LEGS - STRUCTURED LAYOUT MATCHING LEG BUILDER DESIGN */}
      {config.legs.length > 0 && (() => {
        // Hoist sort outside map to avoid O(n² log n) - sort ONCE, not once per leg
        const sortedLegs = [...config.legs].sort((a, b) => {
          if (a.isLazyLeg && !b.isLazyLeg) return 1;
          if (!a.isLazyLeg && b.isLazyLeg) return -1;
          return 0;
        });

        return (
          <div className="mx-12">
            {sortedLegs.map((leg, displayIndex) => {
              const legIndex = config.legs.findIndex(l => l.id === leg.id);

              // Calculate main leg number using already-sorted array
              const mainLegNumber = sortedLegs
                .slice(0, displayIndex + 1)
                .filter(l => !l.isLazyLeg && !l.isSequentialLeg)
                .length;

              return (
                <LegCard
                  key={leg.id}
                  leg={leg}
                  legIndex={legIndex}
                  mainLegNumber={mainLegNumber}
                  allLegs={config.legs} // Changed: pass specific data instead of entire config
                  strategyType={config.strategy_type} // Changed: pass specific data instead of entire config
                  dteFilter={config.dte_filter} // Changed: pass specific data instead of entire config
                  updateLegInPlace={updateLegInPlace}
                  duplicateLeg={duplicateLeg} // Changed: added memoized duplicate handler
                  removeLeg={removeLeg}
                  setResponsePopup={setResponsePopup}
                  legValidationErrors={legValidationErrors}
                  setLegValidationErrors={setLegValidationErrors}
                  lazyLegDropdownOpen={lazyLegDropdownOpen}
                  setLazyLegDropdownOpen={setLazyLegDropdownOpen}
                  lazyLegExistingExpanded={lazyLegExistingExpanded}
                  setLazyLegExistingExpanded={setLazyLegExistingExpanded}
                  lazyLegDropdownRef={lazyLegDropdownRef}
                  setLazyLegConfig={setLazyLegConfig}
                  setLazyLegContext={setLazyLegContext}
                  setShowLazyLegModal={setShowLazyLegModal}
                  setSequentialLegParentIndex={setSequentialLegParentIndex}
                  setShowSequentialLegModal={setShowSequentialLegModal}
                />
              );
            })}
          </div>
        );
      })()}

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
                    
                    if (!isSaveButtonEnabled) {
                      setResponsePopup({ 
                        type: 'error', 
                        title: 'Please make changes before saving the strategy' 
                      });
                      return;
                    }
                    
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
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-44 p-4 text-white rounded-lg hover:shadow-lg active:scale-95 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#005A9C' }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#004580')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#005A9C')}
              title=""
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
        onScrollToParameters={handleScrollToParameters}
      />

    </div>
  );
};

// Wrap in memo to prevent unnecessary re-renders from parent
export default memo(StrategyBuilder);