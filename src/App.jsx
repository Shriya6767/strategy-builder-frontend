import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { API_URL } from "./services/api"; // http://192.168.0.125:8000/api
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import SaveStrategyModal from "./components/SaveStrategyModal";
import BackgroundLoadingScreen from "./components/BackgroundLoadingScreen";
import Toast from "./components/Toast";
import { saveStrategy, buildSaveStrategyPayload, extractLegIdMapping } from "./services/strategyApi";
import { saveStrategyToDatabase } from "./services/versionConfigApi";
import { StrategyProvider, useStrategy } from "./context/StrategyContext";
import { PortfolioProvider } from "./context/PortfolioContext";
import logger from './utils/logger';

// Lazy load heavy components (loaded only when needed)
const StrategyBuilder = lazy(() => import("./components/StrategyBuilder"));
const Reports = lazy(() => import("./components/Reports"));
const LiveTradingDashboard = lazy(() => import("./components/LiveTradingDashboard"));
const LiveTradingSettings = lazy(() => import("./components/LiveTradingSettings"));
const AutoTradingMonitor = lazy(() => import("./components/AutoTradingMonitor"));
const Portfolios = lazy(() => import("./components/Portfolios"));
const SavedStrategiesList = lazy(() => import("./components/SavedStrategiesList"));

// Keep BacktestResults non-lazy (used within StrategyBuilder, needs to be immediately available)
import BacktestResults from "./components/BacktestResults";

function App() {
  return (
    <StrategyProvider>
      <PortfolioProvider>
        <AppContent />
      </PortfolioProvider>
    </StrategyProvider>
  );
}

function AppContent() {
  const { 
    strategy_id: contextStrategyId,
    strategy_name: contextStrategyName,
    version: contextVersion,
    updateStrategyData,
    getVersionByName,
    isInitialized
  } = useStrategy();
  
  const [activeTab, setActiveTab] = useState("builder");
  const [backtestResults, setBacktestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [strategyConfig, setStrategyConfig] = useState({});
  const [mainSidebarOpen, setMainSidebarOpen] = useState(true);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [currentStrategyId, setCurrentStrategyId] = useState(null);
  const [showAutoTradingMonitor, setShowAutoTradingMonitor] = useState(false);
  
  useEffect(() => {
    
    if (isInitialized) {
      try {
        const localData = JSON.parse(localStorage.getItem('strategy_session_data') || 'null');
      } catch (e) {
      }
    }
  }, [contextStrategyId, contextStrategyName, contextVersion, isInitialized]);
  
  const [strategyId, setStrategyId] = useState(null);
  
  const [versionLoadCounter, setVersionLoadCounter] = useState(0);
  
  const [saveStatus, setSaveStatus] = useState(null); // 'loading' | 'success' | 'error' | null
  const [saveMessage, setSaveMessage] = useState('');
  
  const [strategiesRefreshKey, setStrategiesRefreshKey] = useState(0);
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  
  const [strategySavedInSession, setStrategySavedInSession] = useState(false);

  const [saveCompletedCounter, setSaveCompletedCounter] = useState(0);
  const [backtestCompletedCounter, setBacktestCompletedCounter] = useState(0);

  const handleRunBacktest = async (payload) => {
    setIsLoading(true);
    setBacktestLoading(true);
    
    
    try {
      if (!payload.strategy || !payload.legs) {
        throw new Error("Invalid payload structure: missing strategy or legs");
      }

      const endpoint = `${API_URL}/run-backtest`;
      
      logger.request('[RUN BACKTEST] Request', { 
        method: 'POST',
        url: endpoint,
        body: payload
      });

      let data = null;
      let usesMock = false;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const rawBody = await response.text();
        let jsonData;
        try {
          jsonData = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          throw new Error(`Server returned invalid JSON (status ${response.status})`);
        }

        if (response.ok) {
          data = jsonData;
          
          logger.response('[RUN BACKTEST] Response', { 
            status: response.status,
            data: data
          });
          
          if (data.date_range) {
          }
          if (data.start_date && data.end_date) {
          }
          
          
          const tradeResults = data?.data?.trade_results || data?.data?.tradeResults || [];
          if (tradeResults.length > 0) {
            const firstTrade = tradeResults[0];
            if (firstTrade.legs && firstTrade.legs.length > 0) {
              firstTrade.legs.forEach((leg, idx) => {
              });
            }
          }
          
          if (Array.isArray(data.data) && data.data.length > 0) {
          }
          if (data.results) {
          }
        } else {
          const errorMessage = jsonData.error || jsonData.message || "Backend request failed";
          logger.error("❌ Backend Error Response:", jsonData);
          logger.error("════════════════════════════════════════════════════════");
          logger.error("❌ BACKTEST FAILED");
          logger.error("════════════════════════════════════════════════════════");
          logger.error("Error:", errorMessage);
          logger.error("Status Code:", response.status);
          logger.error("Full Error Response:", JSON.stringify(jsonData, null, 2));
          logger.error("════════════════════════════════════════════════════════");
          
          if (errorMessage.toLowerCase().includes('no chain data') || 
              errorMessage.toLowerCase().includes('no data found')) {
            throw new Error(
              `No trading data found for the selected date range.\n\n` +
              `Requested: ${payload.strategy.start_date} to ${payload.strategy.end_date}\n\n` +
              `Please verify:\n` +
              `1. The selected dates are correct\n` +
              `2. Data has been loaded for this date range\n` +
              `3. Click "Load Data" button before running backtest`
            );
          }
          
          throw new Error(errorMessage);
        }
      } catch (backendError) {
        usesMock = true;

        data = generateMockBacktestResults(payload);
      }

      if (data.status === "error" || data.error) {
        throw new Error(data.error || "Backtest failed");
      }

      // Removed 60-second artificial delay for mock results

      let resultsToSet = data;
      if (data.results && !data.data) {
        resultsToSet = data.results;
      }
      
      setBacktestResults(resultsToSet);
      
      // Increment counter to notify StrategyBuilder that backtest completed
      // This triggers compare data refresh in StrategyBuilder
      console.log('[App] Backtest completed, incrementing backtestCompletedCounter');
      setBacktestCompletedCounter(prev => prev + 1);

      if (usesMock) {
      }
    } catch (error) {
      logger.error("Backtest failed:", error);
      alert(`Backtest failed: ${error.message}\n\nCheck browser console (F12) for details.`);
    } finally {
      setBacktestLoading(false);
      setIsLoading(false);
    }
  };

  const generateMockBacktestResults = (payload) => {
    const legsCount = payload.legs?.length || 1;
    const totalTrades = Math.floor(Math.random() * 100) + 20;
    const winningTrades = Math.floor(totalTrades * 0.65);
    const losingTrades = totalTrades - winningTrades;
    
    const startDate = new Date(payload.strategy.start_date);
    const endDate = new Date(payload.strategy.end_date);
    const initialCapital = payload.strategy.initial_capital || 50000;
    
    const trades = [];
    for (let i = 0; i < totalTrades; i++) {
      const isWin = i < winningTrades;
      const pnl = isWin 
        ? Math.floor(Math.random() * 2000) + 500
        : -(Math.floor(Math.random() * 1000) + 200);
      
      trades.push({
        trade_id: i + 1,
        entry_date: new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())).toISOString().split('T')[0],
        entry_time: `${String(Math.floor(Math.random() * 6) + 9).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        entry_price: 100 + Math.random() * 50,
        exit_time: `${String(Math.floor(Math.random() * 6) + 14).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        exit_price: 100 + Math.random() * 50,
        quantity: payload.legs[0]?.lot_size || 100,
        pnl: pnl,
        return_percent: (pnl / initialCapital) * 100,
        win: isWin,
      });
    }

    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgWin = trades.filter(t => t.win).reduce((sum, t) => sum + t.pnl, 0) / winningTrades || 0;
    const avgLoss = trades.filter(t => !t.win).reduce((sum, t) => sum + t.pnl, 0) / losingTrades || 0;

    const monthlyStats = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = ['2025', '2026'];
    
    years.forEach(year => {
      if (!monthlyStats[year]) {
        monthlyStats[year] = {};
      }
      months.forEach(month => {
        const isWinMonth = Math.random() > 0.5;
        if (isWinMonth) {
          monthlyStats[year][month] = Math.floor(Math.random() * 15000) + 1000;
        } else {
          monthlyStats[year][month] = -(Math.floor(Math.random() * 2000) + 500);
        }
      });
    });

    const cumulativeData = [];
    let cumulativePnl = 0;
    let currentPrice = 25000;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      cumulativePnl += (Math.random() * 2000 - 500);
      currentPrice += (Math.random() * 500 - 200);
      
      cumulativeData.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
        timestamp: new Date(d).getTime(),
        cumulativePnl: Math.max(0, cumulativePnl),
        underlyingValue: Math.max(20000, currentPrice),
      });
    }

    const drawdownData = [];
    let peakValue = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      peakValue = Math.max(peakValue, cumulativePnl);
      const drawdown = peakValue - cumulativePnl;
      drawdownData.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
        timestamp: new Date(d).getTime(),
        drawdown: -Math.abs(drawdown),
      });
      cumulativePnl += (Math.random() * 2000 - 500);
    }

    return {
      status: "success",
      results: {
        trades: trades,
        monthly_stats: monthlyStats,
        cumulative_data: cumulativeData,
        drawdown_data: drawdownData,
        summary: {
          total_trades: totalTrades,
          winning_trades: winningTrades,
          losing_trades: losingTrades,
          win_rate: (winningTrades / totalTrades * 100).toFixed(2),
          total_pnl: totalPnl.toFixed(2),
          average_win: avgWin.toFixed(2),
          average_loss: avgLoss.toFixed(2),
          profit_factor: (Math.abs(avgWin / avgLoss) || 0).toFixed(2),
          max_drawdown: -(Math.floor(Math.random() * 5000) + 1000),
          sharpe_ratio: (Math.random() * 2 + 0.5).toFixed(2),
          total_return: ((totalPnl / initialCapital) * 100).toFixed(2),
          num_legs: legsCount,
          strategy_type: payload.strategy.strategy_type || 'INTRADAY',
          symbol: payload.strategy.symbol || 'SPXW',
          period: `${payload.strategy.start_date} - ${payload.strategy.end_date}`,
          overall_profit: 16467.75,
          no_of_trades: 223,
          avg_profit_per_trade: 73.85,
          win_percentage: 224,
          loss_percentage: 97.78,
          max_profit_single_trade: 7559.50,
          max_loss_single_trade: -65.00,
          max_drawdown_trade: -9425.00,
          days_in_max_drawdown: '240 (2025-11-06 to 2026-07-03)',
          avg_loss_losing_trades: -65.00,
          return_to_maxdd: 1.75,
          reward_to_risk: 94.27,
          expectancy_ratio: 1.14,
          max_win_streak: 1,
          max_loss_streak: 145,
          no_of_trades_in_max_dd: 144,
        }
      }
    };
  };

  const handleConfigChange = useCallback((config) => {
    setStrategyConfig(config);
  }, []);

  const handleLoadConfigFromReport = (config) => {
    setStrategyConfig(config);
    setTimeout(() => {
      setActiveTab("builder");
    }, 0);
  };

  const handleLoadStrategyFromBackend = async (strategyId, strategyName, specificVersion = null) => {
    try {
      
      setIsLoading(true);
      
      let versionToRequest = specificVersion; // Use specific version if provided
      
      // If no specific version provided, try to find the latest
      if (versionToRequest === null) {
        // Priority 1: Check if context has version for THIS specific strategy
        if ((contextStrategyId === strategyId || contextStrategyName === strategyName) && contextVersion !== null) {
          versionToRequest = contextVersion;
          logger.request('[GET STRATEGY] Version from context', { contextVersion, contextStrategyId, contextStrategyName });
        }
        
        // Priority 2: Check version map in localStorage for this strategy name
        if (versionToRequest === null && strategyName) {
          versionToRequest = getVersionByName(strategyName);
          logger.request('[GET STRATEGY] Version from VERSION_MAP', { strategyName, version: versionToRequest });
        }
        
        // Priority 3: Check strategy_session_data as last resort
        if (versionToRequest === null) {
          try {
            const storedData = JSON.parse(localStorage.getItem('strategy_session_data') || '{}');
            if (storedData.strategy_id === strategyId && storedData.version) {
              versionToRequest = storedData.version;
              logger.request('[GET STRATEGY] Version from strategy_session_data', { storedData });
            }
          } catch (e) {
            // localStorage read failed, continue without version
          }
        }
      }
      
      logger.request('[GET STRATEGY] Final version to request', { versionToRequest, strategyId, strategyName });
      
      let apiUrl = `${API_URL}/get-strategy?strategy_id=${encodeURIComponent(strategyId)}&strategy_name=${encodeURIComponent(strategyName)}`;
      
      if (versionToRequest !== null) {
        apiUrl += `&version=${versionToRequest}`;
      }
      
      logger.request('[GET STRATEGY] Request', { 
        method: 'GET',
        url: apiUrl,
        parameters: {
          strategy_id: strategyId,
          strategy_name: strategyName,
          version: versionToRequest
        }
      });
      
      const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load strategy: ${response.status}`);
      }

      const result = await response.json();
      
      logger.response('[GET STRATEGY] Response', { 
        status: response.status,
        data: result
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load strategy data');
      }

      const { strategy, legs, unselected_legs } = result.data;
      
      const formatTypeForUI = (backendType) => {
        if (!backendType) return 'points';
        const upper = String(backendType).toUpperCase();
        
        if (upper === 'PERCENT') return 'percentage';
        if (upper === 'UNDERLYING_PERCENT') return 'underlying_percentage';
        if (upper === 'POINTS') return 'points';
        if (upper === 'UNDERLYING_POINTS') return 'underlying_points';
        if (upper === 'MTM') return 'mtm';
        
        return String(backendType).toLowerCase();
      };
      
      const versionNumber = strategy.version || result.data.version || 1;

      updateStrategyData(strategyId, strategyName, versionNumber);
      logger.context('Strategy data stored', { strategyId, strategyName, version: versionNumber });

      
      const transformedLegs = (legs || []).filter(leg => leg.is_selected !== false).map(leg => {
        
        const transformed = {
          ...leg,
          
          id: leg.leg_id, // Frontend uses 'id' for leg identification
          isLazyLeg: leg.is_lazy_leg || false, // Mark if this is a lazy leg
          isSequentialLeg: leg.leg_name && leg.leg_name.startsWith('SEQ#'),
          sequentialLegNumber: leg.leg_name && leg.leg_name.startsWith('SEQ#') 
            ? parseInt(leg.leg_name.replace('SEQ#', '')) 
            : undefined,
          parentLegIndex: leg.parent_leg_index !== undefined ? leg.parent_leg_index : undefined,
          customName: leg.leg_name || '', // Lazy leg name or Sequential leg name
          is_selected: leg.is_selected, // Keep backend flag for reference
          
          lots: String(leg.lot_size || 1),  // Backend: lot_size (number) → Frontend: lots (string)
          position: leg.position_type?.toLowerCase() || 'buy',  // Backend: position_type → Frontend: position
          option_type: leg.option_type?.toLowerCase() || 'call',  // Case conversion
          expiry: leg.expiry_type || '0dte',
          
          stop_loss_enabled: leg.is_stoploss || false,
          stop_loss_mode: formatTypeForUI(leg.stoploss_type),
          stop_loss_value: leg.stoploss_value || '',
          
          trail_enabled: leg.is_trail_sl || false,
          trail_mode: formatTypeForUI(leg.trail_sl_type),
          trail_value: leg.instrument_moves || '',  // Fixed: instrument_moves (plural)
          trail_lock_value: leg.stoploss_moves || '',  // Fixed: stoploss_moves (plural)
          
          target_enabled: leg.is_target || false,
          target_mode: formatTypeForUI(leg.target_type),
          target_value: leg.target_value || '',
          
          reentry_sl_enabled: leg.is_reentry_sl || false,
          reentry_sl_mode: leg.reentry_sl_type?.toUpperCase() === 'LAZY_LEG' 
            ? 'LAZY_LEG' 
            : leg.reentry_sl_type?.toLowerCase() || 're_asap',
          reentry_sl_count: leg.reentry_sl_value || '',
          reentry_sl_lazy_leg_id: leg.reentry_sl_type?.toUpperCase() === 'LAZY_LEG' ? leg.reentry_sl_value : null, // Store the leg_id reference
          
          reentry_tgt_enabled: leg.is_reentry_target || false,
          reentry_tgt_mode: leg.reentry_target_type?.toUpperCase() === 'LAZY_LEG' 
            ? 'LAZY_LEG' 
            : leg.reentry_target_type?.toLowerCase() || 're_asap',
          reentry_tgt_count: leg.reentry_target_value || '',
          reentry_tgt_lazy_leg_id: leg.reentry_target_type?.toUpperCase() === 'LAZY_LEG' ? leg.reentry_target_value : null, // Store the leg_id reference
          
          momentum_enabled: leg.is_simple_momentum || false,
          momentum_mode: leg.momentum_type?.toLowerCase() || 'percent_up',
          momentum_value: leg.momentum_value || '',
          
          ...(!leg.is_lazy_leg && {
            range_enabled: leg.is_range_breakout || false,
            range_instrument: leg.range_breakout_type?.toLowerCase() || 'instrument',
            range_time: leg.range_end_time || null,
            range_direction: leg.range_on?.toLowerCase() || 'high',
          }),
          
          strike_criteria: leg.strike_criteria === 'atm percentage' 
            ? 'based on atm percent' 
            : leg.strike_criteria === 'premium range'
            ? 'based on premium range'
            : (leg.strike_criteria || 'strike_type'),
          atm_strike: leg.atm_strike || 'ATM',  // Keep backend format "ITM-17"
          strike_value: leg.premium_value || '',
          closest_premium_value: leg.premium_value || '',  // For "Based On Closest Premium"
          lower_range: leg.lower_range || '',  // For "Based On premium range"
          upper_range: leg.upper_range || '',  // For "Based On premium range"
          atm_percent_direction: leg.strike_sign || '+',
          atm_percent_value: leg.multiplier_percentage || '',
        };
        
        if (transformed.isSequentialLeg) {
        }
        
        if (transformed.isLazyLeg) {
        }
        
        
        return transformed;
      });

      // Build lazy leg ID map: leg_id → frontend id
      const lazyLegIdMap = {};
      transformedLegs.forEach(leg => {
        if (leg.isLazyLeg && leg.leg_id) {
          lazyLegIdMap[leg.leg_id] = leg.id;
        }
      });

      // Convert LAZY_LEG references to lazy_leg_${id} format
      transformedLegs.forEach(leg => {
        if (leg.reentry_sl_mode === 'LAZY_LEG' && leg.reentry_sl_lazy_leg_id) {
          const frontendLazyLegId = lazyLegIdMap[leg.reentry_sl_lazy_leg_id];
          if (frontendLazyLegId) {
            leg.reentry_sl_mode = `lazy_leg_${frontendLazyLegId}`;
          }
        }
        if (leg.reentry_tgt_mode === 'LAZY_LEG' && leg.reentry_tgt_lazy_leg_id) {
          const frontendLazyLegId = lazyLegIdMap[leg.reentry_tgt_lazy_leg_id];
          if (frontendLazyLegId) {
            leg.reentry_tgt_mode = `lazy_leg_${frontendLazyLegId}`;
          }
        }
      });

      
      const extractedLazyLegs = [];
      const extractedLazyLegIds = new Set(); // Track which lazy legs we've extracted
      
      const extractNestedLazyLeg = (parentLeg, originalParentLeg) => {
        if (originalParentLeg && originalParentLeg.lazy_leg) {
          const lazyLeg = originalParentLeg.lazy_leg;
          
          if (extractedLazyLegIds.has(lazyLeg.leg_id)) {
            return;
          }
          
          
          const transformedLazyLeg = {
            ...lazyLeg,
            id: lazyLeg.leg_id, // Frontend uses 'id'
            isLazyLeg: true,
            customName: lazyLeg.leg_name || '',
            is_selected: true, // Nested lazy legs are always selected
            
            lots: String(lazyLeg.lot_size || 1),
            position: lazyLeg.position_type?.toLowerCase() || 'buy',
            option_type: lazyLeg.option_type?.toLowerCase() || 'call',
            expiry: lazyLeg.expiry_type || '0dte',
            
            stop_loss_enabled: lazyLeg.is_stoploss || false,
            stop_loss_mode: formatTypeForUI(lazyLeg.stoploss_type),
            stop_loss_value: lazyLeg.stoploss_value || '',
            
            trail_enabled: lazyLeg.is_trail_sl || false,
            trail_mode: formatTypeForUI(lazyLeg.trail_sl_type),
            trail_value: lazyLeg.instrument_moves || '',
            trail_lock_value: lazyLeg.stoploss_moves || '',
            
            target_enabled: lazyLeg.is_target || false,
            target_mode: formatTypeForUI(lazyLeg.target_type),
            target_value: lazyLeg.target_value || '',
            
            reentry_sl_enabled: lazyLeg.is_reentry_sl || false,
            reentry_sl_mode: lazyLeg.reentry_sl_type?.toUpperCase() === 'LAZY_LEG' 
              ? 'LAZY_LEG'  // Will be converted to lazy_leg_${id} later if nested
              : lazyLeg.reentry_sl_type?.toLowerCase() || 're_asap',
            reentry_sl_count: lazyLeg.reentry_sl_value || '',
            
            reentry_tgt_enabled: lazyLeg.is_reentry_target || false,
            reentry_tgt_mode: lazyLeg.reentry_target_type?.toUpperCase() === 'LAZY_LEG'
              ? 'LAZY_LEG'  // Will be converted to lazy_leg_${id} later if nested
              : lazyLeg.reentry_target_type?.toLowerCase() || 're_asap',
            reentry_tgt_count: lazyLeg.reentry_target_value || '',
            
            momentum_enabled: lazyLeg.is_simple_momentum || false,
            momentum_mode: lazyLeg.momentum_type?.toLowerCase() || 'percent_up',
            momentum_value: lazyLeg.momentum_value || '',
            
            strike_criteria: lazyLeg.strike_criteria === 'atm percentage'
              ? 'based on atm percent'
              : lazyLeg.strike_criteria === 'premium range'
              ? 'based on premium range'
              : (lazyLeg.strike_criteria || 'strike_type'),
            atm_strike: lazyLeg.atm_strike || 'ATM',
            strike_value: lazyLeg.premium_value || '',
            closest_premium_value: lazyLeg.premium_value || '',  // For "Based On Closest Premium"
            lower_range: lazyLeg.lower_range || '',  // For "Based On premium range"
            upper_range: lazyLeg.upper_range || '',  // For "Based On premium range"
            atm_percent_direction: lazyLeg.strike_sign || '+',
            atm_percent_value: lazyLeg.multiplier_percentage || '',
          };
          
          extractedLazyLegs.push(transformedLazyLeg);
          extractedLazyLegIds.add(lazyLeg.leg_id);
          
          if (parentLeg.reentry_sl_mode === 'LAZY_LEG') {
            parentLeg.reentry_sl_mode = `lazy_leg_${transformedLazyLeg.id}`;
          }
          if (parentLeg.reentry_tgt_mode === 'LAZY_LEG') {
            parentLeg.reentry_tgt_mode = `lazy_leg_${transformedLazyLeg.id}`;
          }
          
          extractNestedLazyLeg(transformedLazyLeg, lazyLeg);
        }
      };
      
      (legs || []).forEach((originalLeg, index) => {
        if (transformedLegs[index]) {
          extractNestedLazyLeg(transformedLegs[index], originalLeg);
        }
      });
      
      if (extractedLazyLegs.length > 0) {
        transformedLegs.push(...extractedLazyLegs);
      }
      
      transformedLegs.forEach((leg, legIndex) => {
        if (leg.reentry_sl_enabled && leg.reentry_sl_mode === 'LAZY_LEG') {
          const linkedLegId = leg.reentry_sl_count || legs[legIndex]?.reentry_sl_value;
          if (linkedLegId) {
            leg.reentry_sl_mode = `lazy_leg_${linkedLegId}`;
          }
        }
        
        if (leg.reentry_tgt_enabled && leg.reentry_tgt_mode === 'LAZY_LEG') {
          const linkedLegId = leg.reentry_tgt_count || legs[legIndex]?.reentry_target_value;
          if (linkedLegId) {
            leg.reentry_tgt_mode = `lazy_leg_${linkedLegId}`;
          }
        }
      });
      
      const extractedSequentialLegs = [];
      
      const extractSequentialLeg = (parentLeg, originalParentLeg, parentIndex) => {
        if (originalParentLeg && originalParentLeg.sequential_leg) {
          const seqLeg = originalParentLeg.sequential_leg;
          
          
          const transformedSeqLeg = {
            ...seqLeg,
            id: seqLeg.leg_id || Date.now() + Math.random(), // Generate ID if not provided
            isSequentialLeg: true,
            customName: seqLeg.leg_name || '',
            sequentialLegNumber: seqLeg.leg_name && seqLeg.leg_name.startsWith('SEQ#')
              ? parseInt(seqLeg.leg_name.replace('SEQ#', ''))
              : undefined,
            parentLegIndex: parentIndex, // Link to parent main leg index
            
            lots: String(seqLeg.lot_size || 1),
            position: seqLeg.position_type?.toLowerCase() || 'buy',
            option_type: seqLeg.option_type?.toLowerCase() || 'call',
            expiry: seqLeg.expiry_type || '0dte',
            
            stop_loss_enabled: seqLeg.is_stoploss || false,
            stop_loss_mode: formatTypeForUI(seqLeg.stoploss_type),
            stop_loss_value: seqLeg.stoploss_value !== null && seqLeg.stoploss_value !== undefined 
              ? String(seqLeg.stoploss_value) 
              : '',
            
            trail_enabled: seqLeg.is_trail_sl || false,
            trail_mode: formatTypeForUI(seqLeg.trail_sl_type),
            trail_value: seqLeg.instrument_moves !== null && seqLeg.instrument_moves !== undefined 
              ? String(seqLeg.instrument_moves) 
              : '',
            trail_lock_value: seqLeg.stoploss_moves !== null && seqLeg.stoploss_moves !== undefined 
              ? String(seqLeg.stoploss_moves) 
              : '',
            
            target_enabled: seqLeg.is_target || false,
            target_mode: formatTypeForUI(seqLeg.target_type),
            target_value: seqLeg.target_value !== null && seqLeg.target_value !== undefined 
              ? String(seqLeg.target_value) 
              : '',
            
            reentry_sl_enabled: seqLeg.is_reentry_sl || false,
            reentry_sl_mode: seqLeg.reentry_sl_type?.toLowerCase() || 're_asap',
            reentry_sl_count: seqLeg.reentry_sl_value !== null && seqLeg.reentry_sl_value !== undefined 
              ? String(seqLeg.reentry_sl_value) 
              : '',
            
            reentry_tgt_enabled: seqLeg.is_reentry_target || false,
            reentry_tgt_mode: seqLeg.reentry_target_type?.toLowerCase() || 're_asap',
            reentry_tgt_count: seqLeg.reentry_target_value !== null && seqLeg.reentry_target_value !== undefined 
              ? String(seqLeg.reentry_target_value) 
              : '',
            
            momentum_enabled: seqLeg.is_simple_momentum || false,
            momentum_mode: seqLeg.momentum_type?.toLowerCase() || 'percent_up',
            momentum_value: seqLeg.momentum_value !== null && seqLeg.momentum_value !== undefined 
              ? String(seqLeg.momentum_value) 
              : '',
            
            range_enabled: seqLeg.is_range_breakout || false,
            range_instrument: seqLeg.range_breakout_type?.toLowerCase() || 'instrument',
            range_time: seqLeg.range_end_time || null,
            range_direction: seqLeg.range_on?.toLowerCase() || 'high',
            
            strike_criteria: seqLeg.strike_criteria === 'atm percentage'
              ? 'based on atm percent'
              : seqLeg.strike_criteria === 'premium range'
              ? 'based on premium range'
              : (seqLeg.strike_criteria || 'strike_type'),
            atm_strike: seqLeg.atm_strike || 'ATM',
            strike_value: seqLeg.premium_value !== null && seqLeg.premium_value !== undefined 
              ? String(seqLeg.premium_value) 
              : '',
            closest_premium_value: seqLeg.premium_value !== null && seqLeg.premium_value !== undefined 
              ? String(seqLeg.premium_value) 
              : '',  // For "Based On Closest Premium"
            lower_range: seqLeg.lower_range !== null && seqLeg.lower_range !== undefined 
              ? String(seqLeg.lower_range) 
              : '',  // For "Based On premium range"
            upper_range: seqLeg.upper_range !== null && seqLeg.upper_range !== undefined 
              ? String(seqLeg.upper_range) 
              : '',  // For "Based On premium range"
            atm_percent_direction: seqLeg.strike_sign || '+',
            atm_percent_value: (() => {
              const backendVal = seqLeg.multiplier_percentage;
              const result = backendVal !== null && backendVal !== undefined 
                ? String(backendVal) 
                : '';
              return result;
            })(),
          };
          
          extractedSequentialLegs.push(transformedSeqLeg);
        }
      };
      
      (legs || []).forEach((originalLeg, index) => {
        if (transformedLegs[index] && !transformedLegs[index].isLazyLeg) {
          extractSequentialLeg(transformedLegs[index], originalLeg, index);
        }
      });
      
      if (extractedSequentialLegs.length > 0) {
        transformedLegs.push(...extractedSequentialLegs);
      }
      
      
      const unselectedLazyLegs = (unselected_legs || []).map(leg => {
        
        const transformed = {
          ...leg,
          
          id: leg.leg_id,
          isLazyLeg: true, // All unselected legs are lazy legs
          customName: leg.leg_name || '',
          is_selected: false, // All unselected legs have is_selected = false
          
          lots: String(leg.lot_size || 1),
          position: leg.position_type?.toLowerCase() || 'buy',
          option_type: leg.option_type?.toLowerCase() || 'call',
          expiry: leg.expiry_type || '0dte',
          
          stop_loss_enabled: leg.is_stoploss || false,
          stop_loss_mode: leg.stoploss_type?.toLowerCase() || 'points',
          stop_loss_value: leg.stoploss_value || '',
          
          trail_enabled: leg.is_trail_sl || false,
          trail_mode: leg.trail_sl_type?.toLowerCase() || 'points',
          trail_value: leg.instrument_moves || '',
          trail_lock_value: leg.stoploss_moves || '',
          
          target_enabled: leg.is_target || false,
          target_mode: leg.target_type?.toLowerCase() || 'points',
          target_value: leg.target_value || '',
          
          reentry_sl_enabled: leg.is_reentry_sl || false,
          reentry_sl_mode: leg.reentry_sl_type?.toUpperCase() === 'LAZY_LEG' 
            ? 'LAZY_LEG' 
            : leg.reentry_sl_type?.toLowerCase() || 're_asap',
          reentry_sl_count: leg.reentry_sl_value || '',
          
          reentry_tgt_enabled: leg.is_reentry_target || false,
          reentry_tgt_mode: leg.reentry_target_type?.toUpperCase() === 'LAZY_LEG' 
            ? 'LAZY_LEG' 
            : leg.reentry_target_type?.toLowerCase() || 're_asap',
          reentry_tgt_count: leg.reentry_target_value || '',
          
          momentum_enabled: leg.is_simple_momentum || false,
          momentum_mode: leg.momentum_type?.toLowerCase() || 'percent_up',
          momentum_value: leg.momentum_value || '',
          
          ...(!leg.is_lazy_leg && {
            range_enabled: leg.is_range_breakout || false,
            range_instrument: leg.range_breakout_type?.toLowerCase() || 'instrument',
            range_time: leg.range_end_time || null,
            range_direction: leg.range_on?.toLowerCase() || 'high',
          }),
          
          strike_criteria: leg.strike_criteria || 'strike_type',
          atm_strike: leg.atm_strike || 'ATM',
          strike_value: leg.premium_value || '',
          atm_percent_direction: leg.strike_sign || '+',
          atm_percent_value: leg.multiplier_percentage || '',
        };
        
        return transformed;
      });
      
      
      
      const mainLegs = transformedLegs.filter(leg => !leg.isLazyLeg);
      const selectedLazyLegs = transformedLegs.filter(leg => leg.isLazyLeg && leg.is_selected);
      
      
      
      
      const allLazyLegNames = new Set();
      const uniqueSelectedLazyLegs = [];
      const seenSelectedNames = new Set();
      
      selectedLazyLegs.forEach(leg => {
        allLazyLegNames.add(leg.customName);
        
        if (!seenSelectedNames.has(leg.customName)) {
          uniqueSelectedLazyLegs.push(leg);
          seenSelectedNames.add(leg.customName);
        } else {
        }
      });
      
      
      const filteredUnselectedLazyLegs = unselectedLazyLegs.filter(leg => {
        const isDuplicate = allLazyLegNames.has(leg.customName);
        if (isDuplicate) {
          return false;
        }
        return true;
      });
      
      
      transformedLegs.push(...filteredUnselectedLazyLegs);
      
      
      for (let i = 0; i < transformedLegs.length; i++) {
        const currentLeg = transformedLegs[i];
        
        if (currentLeg.isLazyLeg) continue;
        
        const hasLazyLegInReentrySL = currentLeg.reentry_sl_type?.toUpperCase() === 'LAZY_LEG';
        const hasLazyLegInReentryTgt = currentLeg.reentry_target_type?.toUpperCase() === 'LAZY_LEG';
        
        if (!hasLazyLegInReentrySL && !hasLazyLegInReentryTgt) {
          continue;
        }
        
        const lazyLegCount = hasLazyLegInReentrySL ? (currentLeg.reentry_sl_count || 0) : 0;
        if (lazyLegCount === 0) {
        }
        
        const nextLeg = transformedLegs[i + 1];
        if (nextLeg && nextLeg.isLazyLeg && nextLeg.is_selected) {
          
          if (hasLazyLegInReentrySL) {
            currentLeg.reentry_sl_mode = `lazy_leg_${nextLeg.id}`;
          }
          
          if (hasLazyLegInReentryTgt) {
            currentLeg.reentry_tgt_mode = `lazy_leg_${nextLeg.id}`;
          }
        } else {
        }
      }
      
      // Build lazyLegNameToId map ONCE for efficiency (avoid O(n²))
      const lazyLegNameToId = {};
      transformedLegs.forEach(leg => {
        if (leg.isLazyLeg && leg.customName && !lazyLegNameToId[leg.customName]) {
          lazyLegNameToId[leg.customName] = leg.id;
        }
      });
      
      // Process lazy leg re-entry references efficiently (reuse map)
      transformedLegs.forEach((leg, index) => {
        if (!leg.isLazyLeg) return;
        
        const slType = leg.reentry_sl_type || '';
        const tgtType = leg.reentry_target_type || '';
        
        const hasNestedLazyLegInReentrySL = slType.toUpperCase() === 'LAZY_LEG';
        const hasNestedLazyLegInReentryTgt = tgtType.toUpperCase() === 'LAZY_LEG';
        
        if (!hasNestedLazyLegInReentrySL && !hasNestedLazyLegInReentryTgt) {
          return;
        }
        
        
        const hasNextLazyLeg = hasNestedLazyLegInReentrySL && (leg.reentry_sl_count > 0);
        
        if (hasNextLazyLeg) {
          const nextLeg = transformedLegs[index + 1];
          if (nextLeg && nextLeg.isLazyLeg && nextLeg.customName) {
            const targetLegId = lazyLegNameToId[nextLeg.customName];
            if (targetLegId) {
              leg.reentry_sl_mode = `lazy_leg_${targetLegId}`;
            }
          } else {
            
            const backendLegIndex = legs.findIndex(l => l.leg_id === leg.leg_id);
            
            if (backendLegIndex !== -1 && backendLegIndex + 1 < legs.length) {
              const backendNextLeg = legs[backendLegIndex + 1];
              
              if (backendNextLeg.is_lazy_leg && backendNextLeg.leg_name) {
                const targetLegId = lazyLegNameToId[backendNextLeg.leg_name];
                
                if (targetLegId) {
                  leg.reentry_sl_mode = `lazy_leg_${targetLegId}`;
                }
              }
            }
          }
        } else if (hasNestedLazyLegInReentrySL && (leg.reentry_sl_count === 0 || leg.reentry_sl_count === '' || leg.reentry_sl_count === '0')) {
          // Reuse existing map instead of rebuilding
          const allLazyLegNames = Object.keys(lazyLegNameToId);
          const otherLazyLegName = allLazyLegNames.find(name => name !== leg.customName);
          
          if (otherLazyLegName && lazyLegNameToId[otherLazyLegName]) {
            leg.reentry_sl_mode = `lazy_leg_${lazyLegNameToId[otherLazyLegName]}`;
          }
        }
        
        const hasNextLazyLegTgt = hasNestedLazyLegInReentryTgt && (leg.reentry_tgt_count > 0);
        if (hasNextLazyLegTgt) {
          const nextLeg = transformedLegs[index + 1];
          if (nextLeg && nextLeg.isLazyLeg) {
            leg.reentry_tgt_mode = `lazy_leg_${nextLeg.id}`;
          }
        } else if (hasNestedLazyLegInReentryTgt && leg.reentry_tgt_count === 0) {
          // Reuse existing map instead of rebuilding
          // Reuse existing map instead of rebuilding
          const allLazyLegNames = Object.keys(lazyLegNameToId);
          const otherLazyLegName = allLazyLegNames.find(name => name !== leg.customName);
          
          if (otherLazyLegName && lazyLegNameToId[otherLazyLegName]) {
            leg.reentry_tgt_mode = `lazy_leg_${lazyLegNameToId[otherLazyLegName]}`;
          }
        }
      });
      
      
      const linkedMainLegs = transformedLegs.filter(leg => !leg.isLazyLeg);
      
      const linkedSelectedLazyLegs = transformedLegs.filter(leg => leg.isLazyLeg && leg.is_selected);
      
      const seenNamesAfterLinking = new Set();
      const deduplicatedLinkedSelectedLazyLegs = linkedSelectedLazyLegs.filter(leg => {
        if (!seenNamesAfterLinking.has(leg.customName)) {
          seenNamesAfterLinking.add(leg.customName);
          return true;
        }
        return false;
      });
      
      const linkedUnselectedLazyLegs = transformedLegs.filter(leg => leg.isLazyLeg && !leg.is_selected);
      const filteredLinkedUnselectedLazyLegs = linkedUnselectedLazyLegs.filter(leg => {
        return !seenNamesAfterLinking.has(leg.customName);
      });
      
      const finalLegs = [
        ...linkedMainLegs,                           // Main legs (with linked lazy leg references)
        ...deduplicatedLinkedSelectedLazyLegs,       // Selected lazy legs (deduplicated, with nested linking)
        ...filteredLinkedUnselectedLazyLegs          // Unselected lazy legs (filtered)
      ];
      
      
      finalLegs.forEach(leg => {
        if (leg.isSequentialLeg) {
        } else if (!leg.isLazyLeg) {
          const reentryInfo = [];
          if (leg.reentry_sl_mode) reentryInfo.push(`SL→${leg.reentry_sl_mode}`);
          if (leg.reentry_tgt_mode) reentryInfo.push(`TGT→${leg.reentry_tgt_mode}`);
        } else {
          const nestedInfo = [];
          if (leg.reentry_sl_mode) nestedInfo.push(`SL→${leg.reentry_sl_mode}`);
          if (leg.reentry_tgt_mode) nestedInfo.push(`TGT→${leg.reentry_tgt_mode}`);
        }
      });

      const convertBackendStrikeToUI = (backendStrike) => {
        if (!backendStrike || backendStrike === 'ATM' || backendStrike === '0') return 'atm';
        
        const strike = String(backendStrike).trim();
        
        if (strike.toUpperCase().startsWith('ITM')) {
          const num = strike.replace(/ITM[+-]?/i, '');
          return `itm_${num}`;
        }
        
        if (strike.toUpperCase().startsWith('OTM')) {
          const num = strike.replace(/OTM[+-]?/i, '');
          return `otm_${num}`;
        }
        
        const numOnly = strike.replace(/[+-]/g, '');
        if (!isNaN(numOnly) && numOnly !== '0') {
          if (strike.includes('-')) {
            return `itm_${numOnly}`;
          } else if (strike.includes('+')) {
            return `otm_${numOnly}`;
          }
        }
        
        return 'atm';
      };

      const finalLegsWithStrike = finalLegs.map(leg => {
        const convertedStrikeType = convertBackendStrikeToUI(leg.atm_strike);
        return {
          ...leg,
          strike_type: convertedStrikeType
        };
      });


      const loadedConfig = {
        symbol: strategy.symbol || 'SPXW',
        start_date: strategy.start_date || '',
        end_date: strategy.end_date || '',
        start_month: strategy.start_month || '',
        start_year: strategy.start_year || '',
        end_month: strategy.end_month || '',
        end_year: strategy.end_year || '',
        dte_filter: (() => {
          const dteValue = strategy.dte_filter;
          const strategyType = strategy.strategy_type?.toLowerCase();
          
          
          if (strategyType === 'btst' && (dteValue === 1 || dteValue === '1')) {
            return 'combine_dte';
          }
          
          if (dteValue === 0 || dteValue === '0') return '0';
          if (dteValue === 1 || dteValue === '1') return '1';
          if (dteValue === 'combine_dte' || dteValue === 'combined') return 'combine_dte';
          return String(dteValue || '0'); // Default to '0' if undefined
        })(),
        instrument_index: strategy.instrument_index || 'SPXW',
        underlying_from: strategy.underlying_from || 'cash',
        underlying_type: strategy.underlying_type || 'cash',
        square_off: strategy.is_squareoff ? 'complete' : 'partial',  // Convert bool to string
        is_squareoff: strategy.is_squareoff || false,
        trail_to_be: strategy.is_trail_sl_break_even || false,  // Field name conversion
        trail_to_be_scope: strategy.trail_to_be_scope || 'all_legs',
        is_trail_sl_break_even: strategy.is_trail_sl_break_even || false,
        trail_sl_break_even_type: strategy.trail_sl_break_even_type?.toLowerCase() || 'na',  // Case conversion
        strategy_type: strategy.strategy_type?.toLowerCase() || 'intraday',  // Case conversion
        sequential_position_type: strategy.sequential_position_type || 'BUY',
        sequential_main_leg: strategy.sequential_main_leg || 'CALL',
        entry_time: strategy.entry_time ? strategy.entry_time.substring(0, 5) : '13:30', // Strip seconds: "HH:MM:SS" -> "HH:MM"
        exit_time: strategy.exit_time ? strategy.exit_time.substring(0, 5) : '20:00', // Strip seconds: "HH:MM:SS" -> "HH:MM"
        initial_capital: strategy.initial_capital || 50000,
        lot_size: strategy.lot_size || 1,
        capital_mode: strategy.capital_mode || 'fixed',
        
        is_strategy_sl: strategy.is_strategy_sl || false,
        strategy_sl_type: strategy.strategy_sl_type?.toLowerCase() || 'points',  // Case conversion
        strategy_sl_value: strategy.strategy_sl_value || 0,
        is_strategy_target: strategy.is_strategy_target || false,
        strategy_target_type: strategy.strategy_target_type?.toLowerCase() || 'points',  // Case conversion
        strategy_target_value: strategy.strategy_target_value || 0,
        
        overall_stop_loss_enabled: strategy.is_strategy_sl || false,
        overall_stop_loss_mode: strategy.strategy_sl_type?.toLowerCase() || 'mtm',  // Case conversion
        overall_stop_loss_value: strategy.strategy_sl_value || '',
        overall_target_enabled: strategy.is_strategy_target || false,
        overall_target_mode: strategy.strategy_target_type?.toLowerCase() || 'mtm',  // Case conversion
        overall_target_value: strategy.strategy_target_value || '',
        
        lock_profit_enabled: strategy.lock_profit_enabled || false,
        lock_profit_mode: strategy.lock_profit_mode || 'points',
        lock_profit_value: strategy.lock_profit_value || 0,
        lock_profit_value1: strategy.lock_profit_value1 || '',
        lock_profit_value2: strategy.lock_profit_value2 || '',
        lock_profit_lock_value: strategy.lock_profit_lock_value || 1,
        
        is_overall_reentry_sl: strategy.is_overall_reentry_sl || false,
        overall_reentry_sl_enabled: strategy.is_overall_reentry_sl || false,
        overall_reentry_sl_mode: strategy.overall_reentry_sl_type?.toLowerCase() || 're_asap',  // Case conversion
        overall_reentry_sl_type: strategy.overall_reentry_sl_type?.toLowerCase() || 're_asap',  // Case conversion
        overall_reentry_sl_count: strategy.overall_reentry_sl_value || '',
        overall_reentry_sl_value: strategy.overall_reentry_sl_value || 0,
        overall_reentry_sl_cost_mode: strategy.overall_reentry_sl_cost_mode || 'same_capital',
        overall_reentry_sl_multiplier: strategy.overall_reentry_sl_multiplier || 2,
        overall_reentry_sl_cost_value: strategy.overall_reentry_sl_cost_value || 1.00,
        
        is_overall_reentry_target: strategy.is_overall_reentry_target || false,
        overall_reentry_tgt_enabled: strategy.is_overall_reentry_target || false,
        overall_reentry_tgt_mode: strategy.overall_reentry_target_type?.toLowerCase() || 're_asap',  // Case conversion
        overall_reentry_target_type: strategy.overall_reentry_target_type?.toLowerCase() || 're_asap',  // Case conversion
        overall_reentry_tgt_count: strategy.overall_reentry_target_value || '',
        overall_reentry_target_value: strategy.overall_reentry_target_value || 0,
        overall_reentry_tgt_cost_mode: strategy.overall_reentry_tgt_cost_mode || 'profit_percentage',
        overall_reentry_tgt_cost_value: strategy.overall_reentry_tgt_cost_value || 1.00,
        
        lock_profit_enabled: strategy.is_overall_trail_sl || false,
        lock_profit_mode: strategy.overall_trail_sl_type?.toLowerCase() || 'points',
        lock_profit_value1: strategy.is_overall_trail_sl ? (strategy.overall_instrument_move || 0) : '',
        lock_profit_value2: strategy.is_overall_trail_sl ? (strategy.overall_stoploss_move || 0) : '',
        
        ...((() => {
          return {};
        })()),
        
        legs: finalLegsWithStrike,
        
        strategy_name: strategyName,
        dataLoaded: true, // Mark as data already loaded since it's a saved strategy
      };

      if (finalLegs && finalLegs.length > 0) {
      }

      setStrategyConfig(loadedConfig);
      
      setStrategyId(strategyId);
      
      setStrategySavedInSession(true);

      setActiveTab('builder');

      setToastMessage(`Strategy "${strategyName}" loaded successfully!`);
      setToastType('success');
      setShowToast(true);

      setIsLoading(false);

      setTimeout(() => {
      }, 100);

    } catch (error) {
      logger.error('[App] Error loading strategy from backend:', error);
      
      setToastMessage(`Failed to load strategy: ${error.message}`);
      setToastType('error');
      setShowToast(true);

      setIsLoading(false);
    }
  };

  const handleLoadVersion = async (strategyId, versionNumber) => {
    try {
      setIsLoading(true);
      
      const strategyName = contextStrategyName || strategyConfig.strategy_name;
      
      if (!strategyName) {
        throw new Error('Strategy name not found');
      }

      // Use the main strategy loading function which has proper transformation logic
      await handleLoadStrategyFromBackend(strategyId, strategyName, versionNumber);
      
      setIsLoading(false);
    } catch (error) {
      logger.error('[App] Error loading version:', error);
      setIsLoading(false);
      alert(`Failed to load version: ${error.message}`);
    }
  };

  // Memoized handlers to prevent StrategyBuilder re-renders
  const handleSaveStrategyCallback = useCallback(async (configOverride = null) => {
    // Use provided config override or fallback to strategyConfig
    const configToSave = configOverride || strategyConfig;
    
    if (strategyId && strategyId !== -999 && strategyId !== '-999' && configToSave.strategy_name) {
      return await handleSaveStrategy(configToSave.strategy_name, configToSave);
    } else {
      setSaveModalOpen(true);
      return null;
    }
  }, [strategyId, strategyConfig]);

  const handleResetStrategyId = useCallback(() => {
    setStrategyId(null);
    setStrategySavedInSession(false);
  }, []);

  const handleClearResults = useCallback(() => {
    setBacktestResults(null);
  }, []);

  const handleSaveStrategy = async (strategyName, configToSave = null) => {
    // Use provided config or fallback to strategyConfig
    const config = configToSave || strategyConfig;
    
    if (!config.legs || config.legs.length === 0) {
      setSaveStatus('error');
      setSaveMessage('At least one leg is required to save strategy');
      return; // Don't proceed, wait for user to add legs
    }

    if (!strategyName || strategyName.trim() === '') {
      setSaveStatus('error');
      setSaveMessage('Strategy name is required');
      setTimeout(() => setSaveStatus(null), 5000);
      throw new Error('Strategy name is required');
    }

    if (!strategyId || strategyId === -999 || strategyId === '-999') {
      try {
        const savedStrategies = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
        const duplicateExists = savedStrategies.some(
          strategy => strategy.name.toLowerCase() === strategyName.trim().toLowerCase()
        );
        
        if (duplicateExists) {
          setSaveStatus('error');
          setSaveMessage('A strategy with the same name already exists for this user. Please choose a different strategy name.');
          
          setToastMessage('A strategy with the same name already exists for this user. Please choose a different strategy name.');
          setToastType('error');
          setShowToast(true);
          
          setTimeout(() => setSaveStatus(null), 5000);
          return; // Don't proceed with save
        }
      } catch (error) {
        logger.error('[App] Error checking for duplicate names:', error);
      }
    } else {
    }

    setSaveStatus('loading');
    setSaveMessage('Saving strategy...');

    try {
      if (!config.symbol || !config.start_date || !config.end_date) {
        setSaveStatus('error');
        setSaveMessage('Missing required strategy configuration');
        setTimeout(() => setSaveStatus(null), 5000);
        throw new Error('Missing required strategy configuration');
      }

      if (!config.legs || config.legs.length === 0) {
        setSaveStatus('error');
        setSaveMessage('At least one leg is required');
        setTimeout(() => setSaveStatus(null), 5000);
        throw new Error('At least one leg is required');
      }

      const requestBody = buildSaveStrategyPayload({
        ...config,
        strategy_name: strategyName
      }, 1); // Version parameter is ignored now (removed from payload)

      // CRITICAL: Always pass strategy_id when updating an existing strategy
      // This ensures backend creates a new version instead of treating it as a new strategy
      if (strategyId && strategyId !== -999 && strategyId !== '-999') {
        requestBody.strategy.strategy_id = strategyId;
        console.log('[App] Updating existing strategy with ID:', strategyId);
      } else {
        console.log('[App] Creating new strategy');
      }

      logger.request('/save-strategy', requestBody);
      requestBody.legs?.forEach((leg, idx) => {
      });

      const result = await saveStrategy(requestBody);

      const timestamp = new Date().toLocaleTimeString();
      
      window.requestAnimationFrame(() => {
      });
      
      window.__saveCount = (window.__saveCount || 0) + 1;
      
      const savedStrategyId = result.strategy_id;
      const savedStrategyName = result.strategy_name || strategyName;
      const savedVersion = result.version || result.data?.version || result.data?.strategy?.version || null;

      window.requestAnimationFrame(() => {
      });

      updateStrategyData(savedStrategyId, savedStrategyName, savedVersion);
      
      setTimeout(() => {
        const storedData = JSON.parse(localStorage.getItem('strategy_session_data') || '{}');
      }, 500);
      
      window.requestAnimationFrame(() => {
      });

      try {
        const savedCards = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
        
        const existingIndex = savedCards.findIndex(card => card.name === savedStrategyName);
        
        const newCard = {
          id: savedStrategyId,
          name: savedStrategyName,
          version: result.version || contextVersion || 1,
          symbol: config.symbol || 'SPXW',
          strategy_type: config.strategy_type || 'intraday',
          entry_time: config.entry_time || '13:30',
          exit_time: config.exit_time || '20:00',
          start_date: config.start_date || null,
          end_date: config.end_date || null,
          created_at: existingIndex !== -1 ? savedCards[existingIndex].created_at : new Date().toISOString(), // Keep original created_at
          leg_count: config.legs?.length || 0,
        };
        
        if (existingIndex !== -1) {
          savedCards[existingIndex] = newCard;
        } else {
          savedCards.push(newCard);
        }
        
        localStorage.setItem('saved_strategies_cards', JSON.stringify(savedCards));
      } catch (error) {
        logger.error('[App] ⚠️ Failed to save strategy card to localStorage:', error);
      }

      setSaveStatus('success');
      setSaveMessage('Strategy saved successfully!');
      setCurrentStrategyId(result.strategy_id);
      
      setStrategyId(result.strategy_id);
      

      
      setStrategyConfig(prev => ({
        ...prev,
        strategy_name: strategyName
      }));

      setToastMessage('Strategy saved successfully!');
      setToastType('success');
      setShowToast(true);


      setStrategiesRefreshKey(prev => prev + 1);

      setTimeout(() => setSaveStatus(null), 5000);

      setSaveModalOpen(false);
      
      setStrategySavedInSession(true);

      setSaveCompletedCounter(prev => prev + 1);

      return result;

    } catch (error) {
      logger.error('[App] Save strategy error:', error.message);

      setSaveStatus('error');
      setSaveMessage(error.message || 'Failed to save strategy. Please try again.');

      setTimeout(() => setSaveStatus(null), 5000);

      throw error;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <BackgroundLoadingScreen isVisible={backtestLoading} duration={60} />
        
        {/* Toast Notification */}
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setShowToast(false)}
            duration={3000}
          />
        )}
        
        {showAutoTradingMonitor ? (
          <AutoTradingMonitor onBack={() => setShowAutoTradingMonitor(false)} />
        ) : (
          <>
          {mainSidebarOpen && (
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={(tab) => {
                setActiveTab(tab);
              }} 
              onToggleSidebar={() => setMainSidebarOpen(false)} 
            />
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />

            {!mainSidebarOpen && (
              <button
                onClick={() => setMainSidebarOpen(true)}
                className="fixed left-0 top-20 bg-blue-600 text-white rounded-full p-3 m-2 shadow-lg hover:bg-blue-700 transition-colors z-40"
                title="Show Sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
              {activeTab === "builder" && (
                <Suspense fallback={<BackgroundLoadingScreen />}>
                  <StrategyBuilder
                    key={`${strategyId || 'default'}-${versionLoadCounter}`} // Force re-render when strategy or version changes
                    onRunBacktest={handleRunBacktest}
                    isLoading={isLoading}
                    savedConfig={strategyConfig}
                    onConfigChange={handleConfigChange}
                    onSaveStrategy={handleSaveStrategyCallback}
                    strategyId={strategyId}
                    onResetStrategyId={handleResetStrategyId}
                    backtestResults={backtestResults}
                    onClearResults={handleClearResults}
                    strategySavedInSession={strategySavedInSession}
                    saveCompletedCounter={saveCompletedCounter}
                    backtestCompletedCounter={backtestCompletedCounter}
                    onLoadVersion={handleLoadVersion}
                  />
                </Suspense>
              )}

              {activeTab === "reports" && (
                <Suspense fallback={<BackgroundLoadingScreen />}>
                  <Reports
                    onLoadConfig={handleLoadConfigFromReport}
                    onSwitchToBuilder={() => setActiveTab("builder")}
                  />
                </Suspense>
              )}

              {activeTab === "live-dashboard" && (
                <Suspense fallback={<BackgroundLoadingScreen />}>
                  <LiveTradingDashboard
                    strategyConfig={strategyConfig}
                    onShowMonitor={() => setShowAutoTradingMonitor(true)}
                  />
                </Suspense>
              )}

              {activeTab === "portfolios" && (
                <Suspense fallback={<BackgroundLoadingScreen />}>
                  <Portfolios 
                    onShowToast={(message, type = 'success') => {
                      setToastMessage(message);
                      setToastType(type);
                      setShowToast(true);
                    }}
                  />
                </Suspense>
              )}

              {activeTab === "live-settings" && (
                <Suspense fallback={<BackgroundLoadingScreen />}>
                  <LiveTradingSettings />
                </Suspense>
              )}

              {activeTab === "settings" && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <p className="text-xl mb-2">Settings</p>
                    <p>Coming soon...</p>
                  </div>
                </div>
              )}

              {activeTab === "save-strategy" && (
                <Suspense fallback={<BackgroundLoadingScreen />}>
                  <SavedStrategiesList 
                    key={strategiesRefreshKey}
                    refreshKey={strategiesRefreshKey}
                    onLoadStrategy={handleLoadStrategyFromBackend}
                    onNavigateToBuilder={() => setActiveTab("builder")}
                    onShowToast={(message, type) => {
                      setToastMessage(message);
                      setToastType(type);
                      setShowToast(true);
                    }}
                    onRefreshStrategies={() => setStrategiesRefreshKey(prev => prev + 1)}
                  />
                </Suspense>
              )}
            </main>
          </div>

          <SaveStrategyModal
            isOpen={saveModalOpen}
            onClose={() => setSaveModalOpen(false)}
            onSave={handleSaveStrategy}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
          />
        </>
      )}
    </div>
  );
}

export default App;
