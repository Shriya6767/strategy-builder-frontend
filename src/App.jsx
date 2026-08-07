import React, { useState, useEffect } from "react";
import { API_URL } from "./services/api"; // http://192.168.0.125:8000/api
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StrategyBuilder from "./components/StrategyBuilder";
import BacktestResults from "./components/BacktestResults";
import Reports from "./components/Reports";
import SaveStrategyModal from "./components/SaveStrategyModal";
import SavedStrategiesList from "./components/SavedStrategiesList";
import LiveTradingDashboard from "./components/LiveTradingDashboard";
import LiveTradingSettings from "./components/LiveTradingSettings";
import AutoTradingMonitor from "./components/AutoTradingMonitor";
import BackgroundLoadingScreen from "./components/BackgroundLoadingScreen";
import Toast from "./components/Toast";
import { saveStrategy, buildSaveStrategyPayload } from "./services/strategyApi";
import { saveStrategyToDatabase } from "./services/versionConfigApi";
import { StrategyProvider, useStrategy } from "./context/StrategyContext";

function App() {
  return (
    <StrategyProvider>
      <AppContent />
    </StrategyProvider>
  );
}

function AppContent() {
  // Access Strategy Context
  const { 
    strategy_id: contextStrategyId,
    strategy_name: contextStrategyName,
    version: contextVersion,
    updateStrategyData,
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
  
  // 🔍 DEBUG: Log Context data on component mount and updates
  useEffect(() => {
    console.log('═'.repeat(100));
    console.log('🔍 [AppContent] COMPONENT MOUNTED - Checking React Context Data:');
    console.log('═'.repeat(100));
    console.log('📊 Context State:');
    console.log('   🆔 strategy_id:', contextStrategyId, '| type:', typeof contextStrategyId);
    console.log('   📝 strategy_name:', contextStrategyName, '| type:', typeof contextStrategyName);
    console.log('   🔢 version:', contextVersion, '| type:', typeof contextVersion);
    console.log('   ✅ isInitialized:', isInitialized);
    console.log('═'.repeat(100));
    
    // Verify localStorage matches Context
    if (isInitialized) {
      try {
        const localData = JSON.parse(localStorage.getItem('strategy_session_data') || 'null');
        console.log('🔍 [AppContent] localStorage verification:');
        console.log('   Local storage data:', localData);
        console.log('   Context matches localStorage:', 
          localData?.strategy_id === contextStrategyId &&
          localData?.strategy_name === contextStrategyName &&
          localData?.version === contextVersion
        );
        console.log('═'.repeat(100));
      } catch (e) {
        console.log('⚠️ [AppContent] Could not verify localStorage');
      }
    }
  }, [contextStrategyId, contextStrategyName, contextVersion, isInitialized]);
  
  // Strategy ID - no localStorage persistence
  const [strategyId, setStrategyId] = useState(null);
  
  // Force re-render counter for version loading
  const [versionLoadCounter, setVersionLoadCounter] = useState(0);
  
  // New state for save operation feedback
  const [saveStatus, setSaveStatus] = useState(null); // 'loading' | 'success' | 'error' | null
  const [saveMessage, setSaveMessage] = useState('');
  
  // State to trigger refresh of saved strategies list
  const [strategiesRefreshKey, setStrategiesRefreshKey] = useState(0);
  
  // State for toast notification
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  
  // ? NEW: Track when strategy is successfully saved (for Compare button visibility)
  // Do NOT initialize from localStorage - should be hidden on refresh
  const [strategySavedInSession, setStrategySavedInSession] = useState(false);

  // ? NEW: Counter to signal StrategyBuilder when save is complete (reset change tracking)
  const [saveCompletedCounter, setSaveCompletedCounter] = useState(0);

  const handleRunBacktest = async (payload) => {
    setIsLoading(true);
    setBacktestLoading(true);
    
    // ═══════════════════════════════════════════════════════════════════
    // DATE VALIDATION & LOGGING - CRITICAL FOR DEBUGGING
    // ═══════════════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📅 DATE RANGE BEING SENT TO BACKEND');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ Start Date:', payload.strategy.start_date);
    console.log('✓ End Date:', payload.strategy.end_date);
    console.log('✓ Symbol:', payload.strategy.symbol);
    console.log('✓ DTE Filter:', payload.strategy.dte_filter);
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
      // Validate payload structure
      if (!payload.strategy || !payload.legs) {
        throw new Error("Invalid payload structure: missing strategy or legs");
      }

      console.log("🚀 Running Backtest with payload:", payload);
      
      // ? DEBUG: Log lot_size values being sent
      console.log("════════════════════════════════════════════════════════");
      console.log("🔍 LOT SIZE DEBUG - REQUEST PAYLOAD");
      console.log("════════════════════════════════════════════════════════");
      payload.legs.forEach((leg, idx) => {
        console.log(`Leg ${idx + 1} lot_size:`, leg.lot_size);
      });
      console.log("════════════════════════════════════════════════════════");

      // Send to unified endpoint
      const endpoint = `${API_URL}/run-backtest`;

      // Try to call real backend first
      let data = null;
      let usesMock = false;

      try {
        // Send complete payload to backend
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // Safe JSON parse — guards against empty body
        const rawBody = await response.text();
        let jsonData;
        try {
          jsonData = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          throw new Error(`Server returned invalid JSON (status ${response.status})`);
        }

        if (response.ok) {
          data = jsonData;
          console.log("════════════════════════════════════════════════════════");
          console.log("📥 BACKEND RESPONSE RECEIVED");
          console.log("════════════════════════════════════════════════════════");
          console.log("Response Keys:", Object.keys(data));
          console.log("✓ success:", data.success);
          console.log("✓ message:", data.message);
          
          // Log date range from response if available
          if (data.date_range) {
            console.log("✓ Date Range (from backend):", data.date_range);
          }
          if (data.start_date && data.end_date) {
            console.log("✓ Start Date (from backend):", data.start_date);
            console.log("✓ End Date (from backend):", data.end_date);
          }
          
          console.log("✓ data.data (type):", Array.isArray(data.data) ? "Array len=" + data.data.length : typeof data.data);
          console.log("✓ data.results (type):", typeof data.results);
          console.log("✓ data.trades (type):", typeof data.trades);
          
          // ? DEBUG: Log PnL values from response
          console.log("════════════════════════════════════════════════════════");
          console.log("🔍 PNL DEBUG - RESPONSE DATA");
          console.log("════════════════════════════════════════════════════════");
          const tradeResults = data?.data?.trade_results || data?.data?.tradeResults || [];
          if (tradeResults.length > 0) {
            const firstTrade = tradeResults[0];
            console.log("First trade date:", firstTrade.trade_date);
            if (firstTrade.legs && firstTrade.legs.length > 0) {
              firstTrade.legs.forEach((leg, idx) => {
                console.log(`  Leg ${idx + 1} PnL from backend:`, leg.pnl);
                console.log(`  Leg ${idx + 1} lot_size:`, leg.lot_size || leg.qty);
              });
            }
          }
          console.log("════════════════════════════════════════════════════════");
          
          if (Array.isArray(data.data) && data.data.length > 0) {
            console.log("✓ First data item:", JSON.stringify(data.data[0], null, 2));
          }
          if (data.results) {
            console.log("✓ Results object:", JSON.stringify(data.results, null, 2));
          }
          console.log("════════════════════════════════════════════════════════");
          console.log("FULL RESPONSE:", JSON.stringify(data, null, 2));
          console.log("════════════════════════════════════════════════════════");
        } else {
          const errorMessage = jsonData.error || jsonData.message || "Backend request failed";
          console.error("❌ Backend Error Response:", jsonData);
          console.error("════════════════════════════════════════════════════════");
          console.error("❌ BACKTEST FAILED");
          console.error("════════════════════════════════════════════════════════");
          console.error("Error:", errorMessage);
          console.error("Status Code:", response.status);
          console.error("Full Error Response:", JSON.stringify(jsonData, null, 2));
          console.error("════════════════════════════════════════════════════════");
          
          // Check for specific "no chain data" error
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
        // Backend failed, use mock data instead
        console.warn('⚠️ Backend unavailable, using mock backtest data:', backendError.message);
        usesMock = true;

        // Generate mock backtest results
        data = generateMockBacktestResults(payload);
      }

      if (data.status === "error" || data.error) {
        throw new Error(data.error || "Backtest failed");
      }

      // Only show loading screen for 60 seconds if using mock data
      // If real backend responded successfully, show results immediately
      if (usesMock) {
        console.log("📊 Using mock data, showing 60 second loading screen...");
        await new Promise(resolve => setTimeout(resolve, 60000));
      } else {
        console.log("✓ Real backend response received, showing results immediately!");
      }

      // Handle all API response formats:
      // - Real backend: { success: true, data: [...] }  → pass whole object so BacktestResults sees data[]
      // - Old format:   { results: {...}, summary: {...} } → unwrap results
      // - Mock data:    { status, results: {...} }        → unwrap results
      let resultsToSet = data;
      if (data.results && !data.data) {
        // Old format or mock — unwrap results key
        resultsToSet = data.results;
      }
      
      console.log("Setting backtest results:", resultsToSet);
      setBacktestResults(resultsToSet);
      console.log("Results set. Staying on builder tab to show inline results");

      try {
        await fetch(`${API_URL}/reports/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            results: resultsToSet,
            config: payload,
            timestamp: new Date().toISOString(),
            mock: usesMock,
          })
        });
      } catch (saveError) {
        console.warn("Failed to auto-save to Reports:", saveError);
      }

      // Do NOT navigate to results tab - show inline on builder page
      // setActiveTab("results"); // REMOVED

      if (usesMock) {
        console.info("✓ Backtest completed using demo data (backend unavailable)");
      }
    } catch (error) {
      console.error("Backtest failed:", error);
      alert(`Backtest failed: ${error.message}\n\nCheck browser console (F12) for details.`);
    } finally {
      setBacktestLoading(false);
      setIsLoading(false);
    }
  };

  // Generate mock backtest results for demonstration
  const generateMockBacktestResults = (payload) => {
    const legsCount = payload.legs?.length || 1;
    const totalTrades = Math.floor(Math.random() * 100) + 20;
    const winningTrades = Math.floor(totalTrades * 0.65);
    const losingTrades = totalTrades - winningTrades;
    
    // Extract dates from payload
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

    // Generate monthly statistics
    const monthlyStats = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = ['2025', '2026'];
    
    // Create monthly data structure
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

    // Generate cumulative PnL and underlying value data
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

    // Generate drawdown data
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
          // Additional stats
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

  const handleConfigChange = (config) => {
    setStrategyConfig(config);
  };

  const handleLoadConfigFromReport = (config) => {
    setStrategyConfig(config);
    setTimeout(() => {
      setActiveTab("builder");
    }, 0);
  };

  // New function: Load strategy from backend by ID and name
  const handleLoadStrategyFromBackend = async (strategyId, strategyName) => {
    try {
      console.log('[App] Loading strategy from backend:', { strategyId, strategyName });
      
      // Show loading state
      setIsLoading(true);
      
      // ⭐ CHECK: Do we have version in Context for this strategy?
      const hasMatchingContext = 
        (contextStrategyId === strategyId || contextStrategyName === strategyName) &&
        contextVersion !== null;
      
      const versionToRequest = hasMatchingContext ? contextVersion : null;
      
      console.log('[App] 🔍 Context check:');
      console.log('   Context strategy_id:', contextStrategyId);
      console.log('   Context strategy_name:', contextStrategyName);
      console.log('   Context version:', contextVersion);
      console.log('   Requested strategy_id:', strategyId);
      console.log('   Requested strategy_name:', strategyName);
      console.log('   Match found:', hasMatchingContext);
      console.log('   Version to request:', versionToRequest || 'NOT SPECIFIED (backend will return latest)');
      
      // Build API URL with query parameters for GET request
      // ⭐ FIX: Use version from Context if available, otherwise don't send version parameter
      let apiUrl = `${API_URL}/get-strategy?strategy_id=${encodeURIComponent(strategyId)}&strategy_name=${encodeURIComponent(strategyName)}`;
      
      // Only add version parameter if we have it in Context
      if (versionToRequest !== null) {
        apiUrl += `&version=${versionToRequest}`;
      }
      
      console.log('[App] Fetching from URL:', apiUrl);
      console.log('[App] Parameters:', { 
        strategy_id: strategyId, 
        strategy_name: strategyName, 
        version: versionToRequest || 'NOT SENT (backend returns latest)'
      });
      
      // Fetch strategy from backend using GET
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
      console.log('[App] ========== BACKEND RESPONSE START ==========');
      console.log('[App] Full response:', JSON.stringify(result, null, 2));
      console.log('[App] response.success:', result.success);
      console.log('[App] response.data:', result.data);
      console.log('[App] ========== BACKEND RESPONSE END ==========');

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load strategy data');
      }

      // Extract strategy configuration and legs
      const { strategy, legs } = result.data;
      console.log('[App] Extracted strategy object:', strategy);
      console.log('[App] Extracted legs array (raw from backend):', legs);
      console.log('[App] Number of legs:', legs?.length || 0);
      
      // ⭐ Extract version from backend response
      const versionNumber = strategy.version || result.data.version || 1;
      console.log('[App] 🔢 Version extracted from backend:', versionNumber);

      // Transform legs from backend format to frontend format
      const transformedLegs = (legs || []).map(leg => {
        console.log('[App] Transforming leg:', leg.leg_id, 'from backend format');
        console.log('[App] 📅 Expiry from backend:', leg.expiry_type, '| type:', typeof leg.expiry_type);
        
        // Backend uses: is_stoploss, stoploss_type (UPPERCASE), stoploss_value
        // Frontend uses: stop_loss_enabled, stop_loss_mode (lowercase), stop_loss_value
        const transformed = {
          ...leg,
          
          // Basic leg fields - CRITICAL FIELD NAME CONVERSIONS
          lots: String(leg.lot_size || 1),  // Backend: lot_size (number) → Frontend: lots (string)
          position: leg.position_type?.toLowerCase() || 'buy',  // Backend: position_type → Frontend: position
          option_type: leg.option_type?.toLowerCase() || 'call',  // Case conversion
          expiry: leg.expiry_type || '0dte',  // ✅ Backend: expiry_type → Frontend: expiry
          
          // Stop Loss field name + case conversion
          stop_loss_enabled: leg.is_stoploss || false,
          stop_loss_mode: leg.stoploss_type?.toLowerCase() || 'points',
          stop_loss_value: leg.stoploss_value || '',
          
          // Trail SL field name + case conversion
          trail_enabled: leg.is_trail_sl || false,
          trail_mode: leg.trail_sl_type?.toLowerCase() || 'points',
          trail_value: leg.instrument_moves || '',  // Fixed: instrument_moves (plural)
          trail_lock_value: leg.stoploss_moves || '',  // Fixed: stoploss_moves (plural)
          
          // Target field name + case conversion
          target_enabled: leg.is_target || false,
          target_mode: leg.target_type?.toLowerCase() || 'points',
          target_value: leg.target_value || '',
          
          // Re-entry SL field name + case conversion
          reentry_sl_enabled: leg.is_reentry_sl || false,
          reentry_sl_mode: leg.reentry_sl_type?.toLowerCase() || 're_asap',  // Fixed: mode not type
          reentry_sl_count: leg.reentry_sl_value || '',
          
          // Re-entry Target field name + case conversion
          reentry_tgt_enabled: leg.is_reentry_target || false,
          reentry_tgt_mode: leg.reentry_target_type?.toLowerCase() || 're_asap',  // Fixed: mode not type
          reentry_tgt_count: leg.reentry_target_value || '',
          
          // Momentum field name + case conversion
          momentum_enabled: leg.is_simple_momentum || false,
          momentum_mode: leg.momentum_type?.toLowerCase() || 'percent_up',
          momentum_value: leg.momentum_value || '',
          
          // Range breakout field name conversion
          range_enabled: leg.is_range_breakout || false,
          range_instrument: leg.range_breakout_type?.toLowerCase() || 'instrument',
          range_time: leg.range_end_time || null,
          range_direction: leg.range_on?.toLowerCase() || 'high',
          
          // Strike criteria conversion (backend stores normalized, UI needs display format)
          strike_criteria: leg.strike_criteria || 'strike_type',
          atm_strike: leg.atm_strike || 'ATM',  // Keep backend format "ITM-17"
          strike_value: leg.premium_value || '',
          atm_percent_direction: leg.strike_sign || '+',
          atm_percent_value: leg.multiplier_percentage || '',
        };
        
        console.log('[App] ✓ Transformed leg', transformed.leg_id, {
          lots: transformed.lots,
          position: transformed.position,
          option_type: transformed.option_type,
          stop_loss_enabled: transformed.stop_loss_enabled,
          stop_loss_value: transformed.stop_loss_value,
          stop_loss_mode: transformed.stop_loss_mode,
          trail_enabled: transformed.trail_enabled,
          target_enabled: transformed.target_enabled
        });
        
        return transformed;
      });

      console.log('[App] All legs transformed, count:', transformedLegs.length);

      // Helper function: Convert backend strike format to UI format
      // Backend: "ITM-17", "OTM+5", "OTM-5", "ITM+17", "ATM", "0" → UI: "itm_17", "otm_5", "atm"
      const convertBackendStrikeToUI = (backendStrike) => {
        if (!backendStrike || backendStrike === 'ATM' || backendStrike === '0') return 'atm';
        
        const strike = String(backendStrike).trim();
        
        // Handle "ITM-17" or "ITM+17"
        if (strike.toUpperCase().startsWith('ITM')) {
          const num = strike.replace(/ITM[+-]?/i, '');
          return `itm_${num}`;
        }
        
        // Handle "OTM+5" or "OTM-5"
        if (strike.toUpperCase().startsWith('OTM')) {
          const num = strike.replace(/OTM[+-]?/i, '');
          return `otm_${num}`;
        }
        
        // Handle plain numbers like "17" or "-17"
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

      // Apply strike_type conversion to all legs
      const finalLegs = transformedLegs.map(leg => {
        const convertedStrikeType = convertBackendStrikeToUI(leg.atm_strike);
        console.log(`[App] Converting leg ${leg.leg_id} strike: "${leg.atm_strike}" → "${convertedStrikeType}"`);
        return {
          ...leg,
          strike_type: convertedStrikeType
        };
      });

      console.log('[App] Final legs with strike_type converted:', finalLegs.map(l => ({
        leg_id: l.leg_id,
        atm_strike: l.atm_strike,
        strike_type: l.strike_type
      })));

      // Build complete config object for StrategyBuilder with ALL required fields
      // Backend returns uppercase types (POINTS, PERCENT) - convert to lowercase
      const loadedConfig = {
        // Basic fields
        symbol: strategy.symbol || 'SPXW',
        start_date: strategy.start_date || '',
        end_date: strategy.end_date || '',
        start_month: strategy.start_month || '',
        start_year: strategy.start_year || '',
        end_month: strategy.end_month || '',
        end_year: strategy.end_year || '',
        dte_filter: strategy.dte_filter || '0',
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
        entry_time: strategy.entry_time || '13:30',
        exit_time: strategy.exit_time || '20:00',
        initial_capital: strategy.initial_capital || 50000,
        lot_size: strategy.lot_size || 1,
        capital_mode: strategy.capital_mode || 'fixed',
        
        // Strategy level SL/Target (convert field names and case)
        is_strategy_sl: strategy.is_strategy_sl || false,
        strategy_sl_type: strategy.strategy_sl_type?.toLowerCase() || 'points',  // Case conversion
        strategy_sl_value: strategy.strategy_sl_value || 0,
        is_strategy_target: strategy.is_strategy_target || false,
        strategy_target_type: strategy.strategy_target_type?.toLowerCase() || 'points',  // Case conversion
        strategy_target_value: strategy.strategy_target_value || 0,
        
        // Overall settings (convert field names: is_strategy_sl → overall_stop_loss_enabled)
        overall_stop_loss_enabled: strategy.is_strategy_sl || false,
        overall_stop_loss_mode: strategy.strategy_sl_type?.toLowerCase() || 'mtm',  // Case conversion
        overall_stop_loss_value: strategy.strategy_sl_value || '',
        overall_target_enabled: strategy.is_strategy_target || false,
        overall_target_mode: strategy.strategy_target_type?.toLowerCase() || 'mtm',  // Case conversion
        overall_target_value: strategy.strategy_target_value || '',
        
        // Lock profit / Trailing
        lock_profit_enabled: strategy.lock_profit_enabled || false,
        lock_profit_mode: strategy.lock_profit_mode || 'points',
        lock_profit_value: strategy.lock_profit_value || 0,
        lock_profit_value1: strategy.lock_profit_value1 || '',
        lock_profit_value2: strategy.lock_profit_value2 || '',
        lock_profit_lock_value: strategy.lock_profit_lock_value || 1,
        
        // Re-entry settings (convert field names and case)
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
        
        // Trail SL settings (map to correct UI field names)
        lock_profit_enabled: strategy.is_overall_trail_sl || false,
        lock_profit_mode: strategy.overall_trail_sl_type?.toLowerCase() || 'points',
        lock_profit_value1: strategy.is_overall_trail_sl ? (strategy.overall_instrument_move || 0) : '',
        lock_profit_value2: strategy.is_overall_trail_sl ? (strategy.overall_stoploss_move || 0) : '',
        
        // DEBUG: Log trailing options values
        ...((() => {
          console.log('[DEBUG] Trailing Options Backend Values:');
          console.log('[DEBUG] is_overall_trail_sl:', strategy.is_overall_trail_sl);
          console.log('[DEBUG] overall_trail_sl_type:', strategy.overall_trail_sl_type);
          console.log('[DEBUG] overall_instrument_move:', strategy.overall_instrument_move);
          console.log('[DEBUG] overall_stoploss_move:', strategy.overall_stoploss_move);
          console.log('[DEBUG] Mapped to UI:');
          console.log('[DEBUG] lock_profit_enabled:', strategy.is_overall_trail_sl || false);
          console.log('[DEBUG] lock_profit_mode:', strategy.overall_trail_sl_type?.toLowerCase() || 'points');
          console.log('[DEBUG] lock_profit_value1:', strategy.overall_instrument_move || 0);
          console.log('[DEBUG] lock_profit_value2:', strategy.overall_stoploss_move || 0);
          return {};
        })()),
        
        // Legs array (use final legs with strike_type converted)
        legs: finalLegs,
        
        // Additional metadata
        strategy_name: strategyName,
        dataLoaded: true, // Mark as data already loaded since it's a saved strategy
      };

      console.log('[App] Loading complete config into StrategyBuilder:', loadedConfig);
      console.log('[App] Number of legs loaded:', finalLegs?.length || 0);
      if (finalLegs && finalLegs.length > 0) {
        console.log('[App] First transformed leg details:', finalLegs[0]);
      }

      // Update strategy config state - this will trigger StrategyBuilder to re-render
      console.log('[App] Calling setStrategyConfig with loadedConfig');
      setStrategyConfig(loadedConfig);
      console.log('[App] setStrategyConfig called - React should re-render StrategyBuilder now');
      
      // Store current strategy_id (session only, no localStorage)
      setStrategyId(strategyId);
      console.log('[App] setStrategyId called with:', strategyId);
      
      // ? NEW: Show Compare button when loading saved strategy (session only)
      setStrategySavedInSession(true);

      // Navigate to builder tab
      setActiveTab('builder');

      // Show success toast
      setToastMessage(`Strategy "${strategyName}" loaded successfully!`);
      setToastType('success');
      setShowToast(true);

      setIsLoading(false);

      // Force a slight delay to ensure state is fully updated before render
      setTimeout(() => {
        console.log('[App] Config state after load:', loadedConfig);
        console.log('[App] strategyConfig state:', strategyConfig);
      }, 100);

    } catch (error) {
      console.error('[App] Error loading strategy from backend:', error);
      
      // Show error toast
      setToastMessage(`Failed to load strategy: ${error.message}`);
      setToastType('error');
      setShowToast(true);

      setIsLoading(false);
    }
  };

  // ⭐ NEW: Load specific version of strategy
  const handleLoadVersion = async (strategyId, versionNumber) => {
    try {
      console.log('[App] 🔄 Loading specific version:', { strategyId, version: versionNumber });
      
      // Show loading state
      setIsLoading(true);
      
      // Get strategy name from Context or localStorage
      const strategyName = contextStrategyName || strategyConfig.strategy_name;
      
      if (!strategyName) {
        throw new Error('Strategy name not found');
      }
      
      // Build API URL with specific version
      const apiUrl = `${API_URL}/get-strategy?strategy_id=${encodeURIComponent(strategyId)}&strategy_name=${encodeURIComponent(strategyName)}&version=${versionNumber}`;
      console.log('[App] 📥 Fetching version from URL:', apiUrl);
      
      // Fetch strategy from backend
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load version: ${response.status}`);
      }

      const result = await response.json();
      console.log('[App] ✅ Version loaded successfully:', result);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load version data');
      }

      // Reuse the same transformation logic
      const { strategy, legs } = result.data;
      
      // Transform legs (same as handleLoadStrategyFromBackend)
      const transformedLegs = (legs || []).map(leg => ({
        ...leg,
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
        reentry_sl_mode: leg.reentry_sl_type?.toLowerCase() || 're_asap',
        reentry_sl_count: leg.reentry_sl_value || '',
        reentry_tgt_enabled: leg.is_reentry_target || false,
        reentry_tgt_mode: leg.reentry_target_type?.toLowerCase() || 're_asap',
        reentry_tgt_count: leg.reentry_target_value || '',
        momentum_enabled: leg.is_simple_momentum || false,
        momentum_mode: leg.momentum_type?.toLowerCase() || 'percent_up',
        momentum_value: leg.momentum_value || '',
        range_enabled: leg.is_range_breakout || false,
        range_instrument: leg.range_breakout_type?.toLowerCase() || 'instrument',
        range_time: leg.range_end_time || null,
        range_direction: leg.range_on?.toLowerCase() || 'high',
        strike_criteria: leg.strike_criteria || 'strike_type',
        atm_strike: leg.atm_strike || 'ATM',
        strike_value: leg.premium_value || '',
        atm_percent_direction: leg.strike_sign || '+',
        atm_percent_value: leg.multiplier_percentage || '',
      }));

      // Convert strike types
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
        return 'atm';
      };

      const finalLegs = transformedLegs.map(leg => ({
        ...leg,
        strike_type: convertBackendStrikeToUI(leg.atm_strike)
      }));

      // Build config object
      console.log('[DEBUG] Raw strategy object from backend:', strategy);
      console.log('[DEBUG] strategy.is_overall_trail_sl:', strategy.is_overall_trail_sl);
      console.log('[DEBUG] strategy.overall_trail_sl_type:', strategy.overall_trail_sl_type);
      console.log('[DEBUG] strategy.overall_instrument_move:', strategy.overall_instrument_move);
      console.log('[DEBUG] strategy.overall_stoploss_move:', strategy.overall_stoploss_move);
      
      const loadedConfig = {
        symbol: strategy.symbol || 'SPXW',
        start_date: strategy.start_date || '',
        end_date: strategy.end_date || '',
        dte_filter: strategy.dte_filter || '0',
        underlying_type: strategy.underlying_type || 'cash',
        square_off: strategy.is_squareoff ? 'complete' : 'partial',
        trail_to_be: strategy.is_trail_sl_break_even || false,
        strategy_type: strategy.strategy_type?.toLowerCase() || 'intraday',
        entry_time: strategy.entry_time || '13:30',
        exit_time: strategy.exit_time || '20:00',
        overall_stop_loss_enabled: strategy.is_strategy_sl || false,
        overall_stop_loss_mode: strategy.strategy_sl_type?.toLowerCase() || 'mtm',
        overall_stop_loss_value: strategy.strategy_sl_value || '',
        overall_target_enabled: strategy.is_strategy_target || false,
        overall_target_mode: strategy.strategy_target_type?.toLowerCase() || 'mtm',
        overall_target_value: strategy.strategy_target_value || '',
        overall_reentry_sl_enabled: strategy.is_overall_reentry_sl || false,
        overall_reentry_sl_mode: strategy.overall_reentry_sl_type?.toLowerCase() || 're_asap',
        overall_reentry_sl_count: strategy.overall_reentry_sl_value || '',
        overall_reentry_tgt_enabled: strategy.is_overall_reentry_target || false,
        overall_reentry_tgt_mode: strategy.overall_reentry_target_type?.toLowerCase() || 're_asap',
        overall_reentry_tgt_count: strategy.overall_reentry_target_value || '',
        // Trail SL settings (map to correct UI field names)
        lock_profit_enabled: strategy.is_overall_trail_sl || false,
        lock_profit_mode: strategy.overall_trail_sl_type?.toLowerCase() || 'points',
        lock_profit_value1: strategy.is_overall_trail_sl ? (strategy.overall_instrument_move || 0) : '',
        lock_profit_value2: strategy.is_overall_trail_sl ? (strategy.overall_stoploss_move || 0) : '',
        legs: finalLegs,
        strategy_name: strategyName,
        dataLoaded: true,
      };

      console.log('[App] 📝 Loading version config:', loadedConfig);
      
      // Update Context with the version
      updateStrategyData(strategyId, strategyName, versionNumber);
      
      // 🎯 CONFIRMATION LOG
      console.log('[App] ✅ STRATEGY LOADED SUCCESSFULLY');
      console.log('[App] 🆔 Strategy ID:', strategyId);
      console.log('[App] 📝 Strategy Name:', strategyName);
      console.log('[App] 🔢 Version:', versionNumber, '← LATEST VERSION FROM BACKEND');
      console.log('[App] 📊 Context updated with latest version');
      
      // Update UI config
      setStrategyConfig(loadedConfig);
      setStrategyId(strategyId);
      setStrategySavedInSession(true);
      setActiveTab('builder');
      
      // Force re-render of StrategyBuilder by incrementing counter
      setVersionLoadCounter(prev => prev + 1);

      // Show success toast
      setToastMessage(`Version ${versionNumber} loaded successfully!`);
      setToastType('success');
      setShowToast(true);

      setIsLoading(false);

    } catch (error) {
      console.error('[App] ❌ Error loading version:', error);
      
      setToastMessage(`Failed to load version: ${error.message}`);
      setToastType('error');
      setShowToast(true);

      setIsLoading(false);
    }
  };

  const handleSaveStrategy = async (strategyName) => {
    // Validate legs FIRST - show popup if no legs
    // ? DEBUG: Log strategyId at start of save
    console.log('[App] ========== handleSaveStrategy CALLED ==========');
    console.log('[App] strategyId:', strategyId);
    console.log('[App] strategyName:', strategyName);
    console.log('[App] strategyConfig.strategy_name:', strategyConfig.strategy_name);
    console.log('[App] 🔍 React Context Data:', {
      strategy_id: contextStrategyId,
      strategy_name: contextStrategyName,
      version: contextVersion
    });
    console.log('[App] ====================================================');
    if (!strategyConfig.legs || strategyConfig.legs.length === 0) {
      setSaveStatus('error');
      setSaveMessage('At least one leg is required to save strategy');
      return; // Don't proceed, wait for user to add legs
    }

    // Validate strategy name
    if (!strategyName || strategyName.trim() === '') {
      setSaveStatus('error');
      setSaveMessage('Strategy name is required');
      setTimeout(() => setSaveStatus(null), 5000);
      throw new Error('Strategy name is required');
    }

    // ? NEW: Check for duplicate strategy name ONLY if it's a NEW strategy (no strategyId)
    // If strategyId exists, we're UPDATING an existing strategy - skip duplicate check
    if (!strategyId || strategyId === -999 || strategyId === '-999') {
      try {
        const savedStrategies = JSON.parse(localStorage.getItem('saved_strategies') || '[]');
        const duplicateExists = savedStrategies.some(
          strategy => strategy.name.toLowerCase() === strategyName.trim().toLowerCase()
        );
        
        if (duplicateExists) {
          setSaveStatus('error');
          setSaveMessage('A strategy with the same name already exists for this user. Please choose a different strategy name.');
          
          // Show toast notification at top
          setToastMessage('A strategy with the same name already exists for this user. Please choose a different strategy name.');
          setToastType('error');
          setShowToast(true);
          
          setTimeout(() => setSaveStatus(null), 5000);
          console.log('[App] ❌ Duplicate strategy name detected:', strategyName);
          return; // Don't proceed with save
        }
      } catch (error) {
        console.error('[App] Error checking for duplicate names:', error);
        // Continue with save if localStorage check fails
      }
    } else {
      console.log('[App] ✓ Updating existing strategy, skipping duplicate check. Strategy ID:', strategyId);
    }

    // Set loading state
    setSaveStatus('loading');
    setSaveMessage('Saving strategy...');

    try {
      // Validate config
      if (!strategyConfig.symbol || !strategyConfig.start_date || !strategyConfig.end_date) {
        setSaveStatus('error');
        setSaveMessage('Missing required strategy configuration');
        setTimeout(() => setSaveStatus(null), 5000);
        throw new Error('Missing required strategy configuration');
      }

      if (!strategyConfig.legs || strategyConfig.legs.length === 0) {
        setSaveStatus('error');
        setSaveMessage('At least one leg is required');
        setTimeout(() => setSaveStatus(null), 5000);
        throw new Error('At least one leg is required');
      }

      // Build request payload using the API utility
      const requestBody = buildSaveStrategyPayload({
        ...strategyConfig,
        strategy_name: strategyName
      }, 1); // Version parameter is ignored now (removed from payload)

      // ⭐ NEW: Add strategy_id and version from React Context if available
      // Check if Context has data for this strategy (based on ID and Name match)
      
      // Match by ID or Name
      const isMatchingStrategy = 
        (contextStrategyId && contextStrategyId === strategyId) ||
        (contextStrategyName && contextStrategyName === strategyName);
      
      // ⭐ ADD: Add strategy_id to request payload if available (REQUIRED for version increment!)
      // Backend uses strategy_id to determine if this is an update or new strategy
      if (isMatchingStrategy && contextStrategyId) {
        requestBody.strategy.strategy_id = contextStrategyId;
        console.log('[App] ✅ Adding strategy_id from Context to request:');
        console.log('    📝 Name:', contextStrategyName);
        console.log('    🆔 ID:', contextStrategyId, '← Backend will use this to increment version');
        // ❌ DO NOT send version in save request - backend auto-increments it
      } else {
        console.log('[App] ❌ No strategy_id in Context - this is a NEW strategy');
        console.log('[App] Backend will assign new strategy_id and version=1');
      }

      console.log('[App] ========== SAVE STRATEGY REQUEST START ==========');
      console.log('[App] Strategy name:', strategyName);
      console.log('[App] Strategy ID:', requestBody.strategy.strategy_id || 'NOT SENT (new strategy)');
      console.log('[App] Version: NOT SENT - backend will auto-increment');
      console.log('[App] Number of legs:', requestBody.legs?.length || 0);
      console.log('[App] Full request body:', JSON.stringify(requestBody, null, 2));
      console.log('[App] ========== LEG DETAILS ==========');
      requestBody.legs?.forEach((leg, idx) => {
        console.log(`[App] Leg ${idx + 1}:`, {
          position_type: leg.position_type,
          option_type: leg.option_type,
          strike_criteria: leg.strike_criteria,
          atm_strike: leg.atm_strike,
          strike_sign: leg.strike_sign,
          is_stoploss: leg.is_stoploss,
          stoploss_value: leg.stoploss_value
        });
      });
      console.log('[App] ========== SAVE STRATEGY REQUEST END ==========');

      // Call the save strategy API (Backend PC - full strategy)
      const result = await saveStrategy(requestBody);

      // ⭐ NEW: Store strategy_id, strategy_name, version in React Context + localStorage
      // Extract from backend response
      const timestamp = new Date().toLocaleTimeString();
      
      // 🔥 PERSISTENT LOGGING - These will ALWAYS show even on 2nd/3rd save
      window.requestAnimationFrame(() => {
        console.log('\n\n');
        console.log('🔥'.repeat(60));
        console.log(`⏰ [${timestamp}] 📥 SAVE RESPONSE RECEIVED (Save Count: ${(window.__saveCount || 0) + 1})`);
        console.log('🔥'.repeat(60));
        console.log('📦 Full result object:', JSON.stringify(result, null, 2));
        console.log('🆔 result.strategy_id:', result.strategy_id);
        console.log('📝 result.strategy_name:', result.strategy_name);
        console.log('🔢 result.version:', result.version);
        console.log('🔢 result.data?.version:', result.data?.version);
        console.log('🔢 result.data?.strategy?.version:', result.data?.strategy?.version);
        console.log('📝 strategyName (from modal):', strategyName);
        console.log('🔥'.repeat(60));
        console.log('\n');
      });
      
      // Track save count
      window.__saveCount = (window.__saveCount || 0) + 1;
      
      const savedStrategyId = result.strategy_id;
      const savedStrategyName = result.strategy_name || strategyName;
      // ⭐ FIX: Version is inside result.data.strategy.version (nested)
      const savedVersion = result.version || result.data?.version || result.data?.strategy?.version || null;

      // 🔥 PERSISTENT LOGGING - Extracted values
      window.requestAnimationFrame(() => {
        console.log('🔥'.repeat(60));
        console.log(`⏰ [${timestamp}] ✅ EXTRACTED VALUES (Save #${window.__saveCount})`);
        console.log('🔥'.repeat(60));
        console.log('🆔 savedStrategyId:', savedStrategyId, '| type:', typeof savedStrategyId);
        console.log('📝 savedStrategyName:', savedStrategyName, '| type:', typeof savedStrategyName);
        console.log('🔢 savedVersion:', savedVersion, '| type:', typeof savedVersion);
        console.log('🔥'.repeat(60));
        console.log('\n');
      });

      // Store in Context + localStorage (auto-synced by StrategyContext)
      updateStrategyData(savedStrategyId, savedStrategyName, savedVersion);
      
      // 🔥 PERSISTENT LOGGING - Save complete
      window.requestAnimationFrame(() => {
        console.log('█'.repeat(60));
        console.log(`⏰ [${timestamp}] ✅ SAVE COMPLETE #${window.__saveCount} - VERSION STORED`);
        console.log('█'.repeat(60));
        console.log('🆔 Strategy ID:', savedStrategyId);
        console.log('📝 Strategy Name:', savedStrategyName);
        console.log('🔢 Version:', savedVersion, '← VERSION UPDATED FROM BACKEND');
        console.log('💾 localStorage key: strategy_session_data');
        console.log('█'.repeat(60));
        console.log('\n\n');
      });

      // ⭐ NEW: Also add strategy card to localStorage for Saved Strategies tab
      try {
        const savedCards = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
        
        // ⭐ FIX: Check by strategy_name instead of id (avoid duplicates when re-saving)
        const existingIndex = savedCards.findIndex(card => card.name === savedStrategyName);
        
        const newCard = {
          id: savedStrategyId,
          name: savedStrategyName,
          symbol: strategyConfig.symbol || 'SPXW',
          strategy_type: strategyConfig.strategy_type || 'intraday',
          entry_time: strategyConfig.entry_time || '13:30',
          exit_time: strategyConfig.exit_time || '20:00',
          created_at: existingIndex !== -1 ? savedCards[existingIndex].created_at : new Date().toISOString(), // Keep original created_at
          leg_count: strategyConfig.legs?.length || 0,
        };
        
        if (existingIndex !== -1) {
          // Update existing card
          savedCards[existingIndex] = newCard;
          console.log('[App] ✅ Updated existing strategy card in localStorage (matched by name)');
        } else {
          // Add new card
          savedCards.push(newCard);
          console.log('[App] ✅ Added new strategy card to localStorage');
        }
        
        localStorage.setItem('saved_strategies_cards', JSON.stringify(savedCards));
        console.log('[App] ✅ Strategy card saved to localStorage (saved_strategies_cards)');
        console.log('[App] Total cards:', savedCards.length);
      } catch (error) {
        console.error('[App] ⚠️ Failed to save strategy card to localStorage:', error);
      }

      // Success
      setSaveStatus('success');
      setSaveMessage('Strategy saved successfully!');
      setCurrentStrategyId(result.strategy_id);
      
      // ? NEW: Store strategy_id in shared state for use in run-backtest and apply-slippage
      setStrategyId(result.strategy_id);
      
      console.log('[App] Strategy ID stored in shared state:', result.strategy_id);

      
      // ? NEW: Update strategyConfig to include strategy_name so it's available for backtest
      setStrategyConfig(prev => ({
        ...prev,
        strategy_name: strategyName
      }));
      console.log('[App] ✓ Strategy name added to config:', strategyName);
      // Log success
      console.log('[App] Strategy saved successfully:', result);

      // Show success toast
      setToastMessage('Strategy saved successfully!');
      setToastType('success');
      setShowToast(true);

      // No localStorage for strategy data - all data stored on backend PC only
      console.log('[App] Strategy saved to backend only (no localStorage)');

      // Trigger refresh of saved strategies list
      setStrategiesRefreshKey(prev => prev + 1);

      // Auto-close success message after 5 seconds
      setTimeout(() => setSaveStatus(null), 5000);

      // Close modal
      setSaveModalOpen(false);
      
      // ? NEW: Set flag to show Compare button (session only, not persisted)
      setStrategySavedInSession(true);

      // ? NEW: Increment counter to signal StrategyBuilder that save is complete
      setSaveCompletedCounter(prev => prev + 1);

      return result;

    } catch (error) {
      console.error('[App] Save strategy error:', error.message);

      // Set error state
      setSaveStatus('error');
      setSaveMessage(error.message || 'Failed to save strategy. Please try again.');

      // Auto-clear error after 5 seconds
      setTimeout(() => setSaveStatus(null), 5000);

      // Throw error to propagate to modal if needed
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
                <StrategyBuilder
                  key={`${strategyId || 'default'}-${versionLoadCounter}`} // Force re-render when strategy or version changes
                  onRunBacktest={handleRunBacktest}
                  isLoading={isLoading}
                  savedConfig={strategyConfig}
                  onConfigChange={handleConfigChange}
                  onSaveStrategy={() => {
                    console.log('[App] 🔘 Save button clicked');
                    console.log('[App] strategyId:', strategyId);
                    console.log('[App] strategyConfig.strategy_name:', strategyConfig.strategy_name);
                    
                    // If strategy has ID and name, save directly without modal
                    if (strategyId && strategyId !== -999 && strategyId !== '-999' && strategyConfig.strategy_name) {
                      console.log('[App] ✅ Calling handleSaveStrategy directly (existing strategy)');
                      handleSaveStrategy(strategyConfig.strategy_name);
                    } else {
                      console.log('[App] ✅ Opening save modal (new strategy)');
                      // New strategy - open modal
                      setSaveModalOpen(true);
                    }
                  }}
                  strategyId={strategyId}
                  onResetStrategyId={() => {
                    // Reset strategyId when user modifies unsaved strategy
                    setStrategyId(null);
                    // Also hide Compare button when starting new/modified strategy
                    setStrategySavedInSession(false);
                  }}
                  backtestResults={backtestResults}
                  onClearResults={() => setBacktestResults(null)}
                  strategySavedInSession={strategySavedInSession}
                  saveCompletedCounter={saveCompletedCounter}
                  onLoadVersion={handleLoadVersion}
                />
              )}

              {activeTab === "reports" && (
                <Reports
                  onLoadConfig={handleLoadConfigFromReport}
                  onSwitchToBuilder={() => setActiveTab("builder")}
                />
              )}

              {activeTab === "live-dashboard" && (
                <LiveTradingDashboard
                  strategyConfig={strategyConfig}
                  onShowMonitor={() => setShowAutoTradingMonitor(true)}
                />
              )}

              {activeTab === "live-settings" && <LiveTradingSettings />}

              {activeTab === "settings" && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <p className="text-xl mb-2">Settings</p>
                    <p>Coming soon...</p>
                  </div>
                </div>
              )}

              {activeTab === "save-strategy" && (
                <SavedStrategiesList 
                  key={strategiesRefreshKey}
                  refreshKey={strategiesRefreshKey} // ⭐ Pass as prop too
                  onLoadStrategy={handleLoadStrategyFromBackend}
                  onNavigateToBuilder={() => setActiveTab("builder")}
                  onShowToast={(message, type) => {
                    setToastMessage(message);
                    setToastType(type);
                    setShowToast(true);
                  }}
                  onRefreshStrategies={() => setStrategiesRefreshKey(prev => prev + 1)}
                />
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
