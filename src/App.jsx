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
import Portfolios from "./components/Portfolios";
import BackgroundLoadingScreen from "./components/BackgroundLoadingScreen";
import Toast from "./components/Toast";
import { saveStrategy, buildSaveStrategyPayload, extractLegIdMapping } from "./services/strategyApi";
import { saveStrategyToDatabase } from "./services/versionConfigApi";
import { StrategyProvider, useStrategy } from "./context/StrategyContext";
import { PortfolioProvider } from "./context/PortfolioContext";

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
      // Only send: strategy_id, strategy_name, version
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

      // Extract strategy configuration, legs, and unselected_legs
      const { strategy, legs, unselected_legs } = result.data;
      console.log('[App] Extracted strategy object:', strategy);
      console.log('[App] Extracted legs array (raw from backend):', legs);
      console.log('[App] Extracted unselected_legs array (raw from backend):', unselected_legs);
      console.log('[App] Number of legs:', legs?.length || 0);
      console.log('[App] Number of unselected_legs:', unselected_legs?.length || 0);
      
      // ⭐ Helper function to convert backend type format to UI format
      const formatTypeForUI = (backendType) => {
        if (!backendType) return 'points';
        const upper = String(backendType).toUpperCase();
        
        // Map backend format to UI format
        if (upper === 'PERCENT') return 'percentage';
        if (upper === 'UNDERLYING_PERCENT') return 'underlying_percentage';
        if (upper === 'POINTS') return 'points';
        if (upper === 'UNDERLYING_POINTS') return 'underlying_points';
        if (upper === 'MTM') return 'mtm';
        
        // Fallback: lowercase
        return String(backendType).toLowerCase();
      };
      
      // ⭐ Extract version from backend response
      const versionNumber = strategy.version || result.data.version || 1;
      console.log('[App] 🔢 Version extracted from backend:', versionNumber);

      // Store strategy data in Context (will auto-sync to localStorage)
      updateStrategyData(strategyId, strategyName, versionNumber);
      console.log('[App] ✅ Strategy data stored in Context');

      // ⭐ NEW: Handle flat structure according to README2.md format
      // Backend returns:
      // - legs: flat array with is_lazy_leg=true/false and is_selected=true/false
      // - unselected_legs: same legs that have is_selected=false (duplicated)
      console.log('[App] 🔄 Processing new flat structure from backend...');
      
      // Transform all legs from backend format to frontend format
      // ⭐ FIX: Only include legs with is_selected = true from the main legs array
      // Unselected legs will be added separately from unselected_legs array
      const transformedLegs = (legs || []).filter(leg => leg.is_selected !== false).map(leg => {
        console.log('[App] Transforming leg:', leg.leg_id, 'from backend format');
        console.log('[App] 📅 Expiry from backend:', leg.expiry_type, '| type:', typeof leg.expiry_type);
        
        // Backend uses: is_stoploss, stoploss_type (UPPERCASE), stoploss_value
        // Frontend uses: stop_loss_enabled, stop_loss_mode (lowercase), stop_loss_value
        const transformed = {
          ...leg,
          
          // ⭐ NEW: Add frontend-specific fields for lazy legs
          id: leg.leg_id, // Frontend uses 'id' for leg identification
          isLazyLeg: leg.is_lazy_leg || false, // Mark if this is a lazy leg
          // ⭐ NEW: Identify sequential legs by leg_name starting with "SEQ#"
          isSequentialLeg: leg.leg_name && leg.leg_name.startsWith('SEQ#'),
          // ⭐ NEW: Extract sequential leg number from leg_name (e.g., "SEQ#1" → 1)
          sequentialLegNumber: leg.leg_name && leg.leg_name.startsWith('SEQ#') 
            ? parseInt(leg.leg_name.replace('SEQ#', '')) 
            : undefined,
          // ⭐ NEW: Extract parent leg index for sequential legs (if stored in backend)
          parentLegIndex: leg.parent_leg_index !== undefined ? leg.parent_leg_index : undefined,
          customName: leg.leg_name || '', // Lazy leg name or Sequential leg name
          is_selected: leg.is_selected, // Keep backend flag for reference
          
          // Basic leg fields - CRITICAL FIELD NAME CONVERSIONS
          lots: String(leg.lot_size || 1),  // Backend: lot_size (number) → Frontend: lots (string)
          position: leg.position_type?.toLowerCase() || 'buy',  // Backend: position_type → Frontend: position
          option_type: leg.option_type?.toLowerCase() || 'call',  // Case conversion
          expiry: leg.expiry_type || '0dte',  // ✅ Backend: expiry_type → Frontend: expiry
          
          // Stop Loss field name + case conversion
          stop_loss_enabled: leg.is_stoploss || false,
          stop_loss_mode: formatTypeForUI(leg.stoploss_type),
          stop_loss_value: leg.stoploss_value || '',
          
          // Trail SL field name + case conversion
          trail_enabled: leg.is_trail_sl || false,
          trail_mode: formatTypeForUI(leg.trail_sl_type),
          trail_value: leg.instrument_moves || '',  // Fixed: instrument_moves (plural)
          trail_lock_value: leg.stoploss_moves || '',  // Fixed: stoploss_moves (plural)
          
          // Target field name + case conversion
          target_enabled: leg.is_target || false,
          target_mode: formatTypeForUI(leg.target_type),
          target_value: leg.target_value || '',
          
          // Re-entry SL field name + case conversion
          // ⭐ FIX: Don't lowercase if it's LAZY_LEG (preserve for linking logic)
          reentry_sl_enabled: leg.is_reentry_sl || false,
          reentry_sl_mode: leg.reentry_sl_type?.toUpperCase() === 'LAZY_LEG' 
            ? 'LAZY_LEG' 
            : leg.reentry_sl_type?.toLowerCase() || 're_asap',
          reentry_sl_count: leg.reentry_sl_value || '',
          
          // Re-entry Target field name + case conversion
          // ⭐ FIX: Don't lowercase if it's LAZY_LEG (preserve for linking logic)
          reentry_tgt_enabled: leg.is_reentry_target || false,
          reentry_tgt_mode: leg.reentry_target_type?.toUpperCase() === 'LAZY_LEG' 
            ? 'LAZY_LEG' 
            : leg.reentry_target_type?.toLowerCase() || 're_asap',
          reentry_tgt_count: leg.reentry_target_value || '',
          
          // Momentum field name + case conversion
          momentum_enabled: leg.is_simple_momentum || false,
          momentum_mode: leg.momentum_type?.toLowerCase() || 'percent_up',
          momentum_value: leg.momentum_value || '',
          
          // Range breakout field name conversion (exclude for lazy legs)
          ...(!leg.is_lazy_leg && {
            range_enabled: leg.is_range_breakout || false,
            range_instrument: leg.range_breakout_type?.toLowerCase() || 'instrument',
            range_time: leg.range_end_time || null,
            range_direction: leg.range_on?.toLowerCase() || 'high',
          }),
          
          // Strike criteria conversion (backend stores normalized, UI needs display format)
          // ⭐ FIX: Map backend "atm percentage" back to UI "based on atm percent"
          strike_criteria: leg.strike_criteria === 'atm percentage' 
            ? 'based on atm percent' 
            : (leg.strike_criteria || 'strike_type'),
          atm_strike: leg.atm_strike || 'ATM',  // Keep backend format "ITM-17"
          strike_value: leg.premium_value || '',
          atm_percent_direction: leg.strike_sign || '+',
          atm_percent_value: leg.multiplier_percentage || '',
        };
        
        // ⭐ DEBUG: Log sequential leg data
        if (transformed.isSequentialLeg) {
          console.log('[App] 🔍 Sequential leg loaded:', {
            leg_id: transformed.id,
            leg_name: transformed.customName,
            strike_criteria: transformed.strike_criteria,
            atm_percent_value: transformed.atm_percent_value,
            multiplier_percentage_from_backend: leg.multiplier_percentage,
            atm_percent_direction: transformed.atm_percent_direction
          });
        }
        
        // ⭐ DEBUG: Log lazy leg data
        if (transformed.isLazyLeg) {
          console.log('[App] 🔍 Lazy leg loaded:', {
            leg_id: transformed.id,
            leg_name: transformed.customName,
            strike_criteria: transformed.strike_criteria,
            atm_percent_value: transformed.atm_percent_value,
            multiplier_percentage_from_backend: leg.multiplier_percentage,
            atm_percent_direction: transformed.atm_percent_direction,
            stop_loss_enabled: transformed.stop_loss_enabled,
            stop_loss_value: transformed.stop_loss_value,
            target_enabled: transformed.target_enabled,
            target_value: transformed.target_value,
            trail_enabled: transformed.trail_enabled,
            trail_value: transformed.trail_value,
            trail_lock_value: transformed.trail_lock_value
          });
        }
        
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
      
      // ⭐ NEW: Extract nested lazy legs from ALL legs (main legs and lazy legs)
      // Backend sends lazy legs nested inside main legs: main_leg.lazy_leg = {...}
      // AND lazy legs can also have nested lazy legs: lazy_leg.lazy_leg = {...}
      // We need to extract these and add them to transformedLegs array
      console.log('[App] 🔍 Extracting nested lazy legs from all legs...');
      const extractedLazyLegs = [];
      const extractedLazyLegIds = new Set(); // Track which lazy legs we've extracted
      
      // Function to recursively extract nested lazy legs
      const extractNestedLazyLeg = (parentLeg, originalParentLeg) => {
        if (originalParentLeg && originalParentLeg.lazy_leg) {
          const lazyLeg = originalParentLeg.lazy_leg;
          
          // Skip if we've already extracted this lazy leg
          if (extractedLazyLegIds.has(lazyLeg.leg_id)) {
            console.log(`[App] ⏭️ Skipping already extracted lazy_leg ${lazyLeg.leg_id}`);
            return;
          }
          
          console.log(`[App] 📦 Found nested lazy_leg in leg ${parentLeg.leg_id} (name: ${parentLeg.customName || 'unnamed'})`);
          
          // Transform the nested lazy leg to frontend format
          const transformedLazyLeg = {
            ...lazyLeg,
            id: lazyLeg.leg_id, // Frontend uses 'id'
            isLazyLeg: true,
            customName: lazyLeg.leg_name || '',
            is_selected: true, // Nested lazy legs are always selected
            
            // Transform field names
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
            
            strike_criteria: lazyLeg.strike_criteria || 'strike_type',
            atm_strike: lazyLeg.atm_strike || 'ATM',
            strike_value: lazyLeg.premium_value || '',
            atm_percent_direction: lazyLeg.strike_sign || '+',
            atm_percent_value: lazyLeg.multiplier_percentage || '',
          };
          
          extractedLazyLegs.push(transformedLazyLeg);
          extractedLazyLegIds.add(lazyLeg.leg_id);
          console.log(`[App] ✅ Extracted lazy leg: ${transformedLazyLeg.customName} (id: ${transformedLazyLeg.id})`);
          
          // Link the parent leg to this lazy leg using lazy_leg_${id} format
          if (parentLeg.reentry_sl_mode === 'LAZY_LEG') {
            parentLeg.reentry_sl_mode = `lazy_leg_${transformedLazyLeg.id}`;
            console.log(`[App] 🔗 Linked parent leg ${parentLeg.leg_id} (${parentLeg.customName}) → lazy leg ${transformedLazyLeg.id} (${transformedLazyLeg.customName}) via reentry_sl_mode`);
          }
          if (parentLeg.reentry_tgt_mode === 'LAZY_LEG') {
            parentLeg.reentry_tgt_mode = `lazy_leg_${transformedLazyLeg.id}`;
            console.log(`[App] 🔗 Linked parent leg ${parentLeg.leg_id} (${parentLeg.customName}) → lazy leg ${transformedLazyLeg.id} (${transformedLazyLeg.customName}) via reentry_tgt_mode`);
          }
          
          // ⭐ RECURSIVE: Check if this lazy leg also has a nested lazy leg
          extractNestedLazyLeg(transformedLazyLeg, lazyLeg);
        }
      };
      
      // Extract from ALL legs in the backend response (both main and lazy legs)
      (legs || []).forEach((originalLeg, index) => {
        if (transformedLegs[index]) {
          extractNestedLazyLeg(transformedLegs[index], originalLeg);
        }
      });
      
      // Add extracted lazy legs to transformedLegs array
      if (extractedLazyLegs.length > 0) {
        transformedLegs.push(...extractedLazyLegs);
        console.log(`[App] 📥 Added ${extractedLazyLegs.length} extracted lazy legs to transformedLegs`);
      }
      
      // ⭐ NEW FIX: Convert any remaining 'LAZY_LEG' references to 'lazy_leg_{id}' format
      // This handles standalone lazy legs that reference other lazy legs
      console.log('[App] 🔗 Resolving LAZY_LEG references for all legs...');
      transformedLegs.forEach((leg, legIndex) => {
        // Check if reentry_sl_mode is 'LAZY_LEG' but not yet resolved
        if (leg.reentry_sl_enabled && leg.reentry_sl_mode === 'LAZY_LEG') {
          // Find the linked lazy leg by looking at reentry_sl_count (backend stores linked_leg_id there)
          const linkedLegId = leg.reentry_sl_count || legs[legIndex]?.reentry_sl_value;
          if (linkedLegId) {
            leg.reentry_sl_mode = `lazy_leg_${linkedLegId}`;
            console.log(`[App] 🔗 Resolved leg ${leg.id} reentry_sl_mode: LAZY_LEG → lazy_leg_${linkedLegId}`);
          }
        }
        
        // Check if reentry_tgt_mode is 'LAZY_LEG' but not yet resolved
        if (leg.reentry_tgt_enabled && leg.reentry_tgt_mode === 'LAZY_LEG') {
          // Find the linked lazy leg by looking at reentry_tgt_count (backend stores linked_leg_id there)
          const linkedLegId = leg.reentry_tgt_count || legs[legIndex]?.reentry_target_value;
          if (linkedLegId) {
            leg.reentry_tgt_mode = `lazy_leg_${linkedLegId}`;
            console.log(`[App] 🔗 Resolved leg ${leg.id} reentry_tgt_mode: LAZY_LEG → lazy_leg_${linkedLegId}`);
          }
        }
      });
      
      // ⭐ NEW: Extract nested sequential legs from main legs
      // Backend sends sequential legs nested inside main legs: main_leg.sequential_leg = {...}
      console.log('[App] 🔍 Extracting nested sequential legs from main legs...');
      const extractedSequentialLegs = [];
      
      const extractSequentialLeg = (parentLeg, originalParentLeg, parentIndex) => {
        if (originalParentLeg && originalParentLeg.sequential_leg) {
          const seqLeg = originalParentLeg.sequential_leg;
          
          console.log(`[App] 📦 Found sequential_leg in leg ${parentLeg.leg_id}: ${seqLeg.leg_name}`);
          
          // Transform the sequential leg to frontend format
          const transformedSeqLeg = {
            ...seqLeg,
            id: seqLeg.leg_id || Date.now() + Math.random(), // Generate ID if not provided
            isSequentialLeg: true,
            customName: seqLeg.leg_name || '',
            sequentialLegNumber: seqLeg.leg_name && seqLeg.leg_name.startsWith('SEQ#')
              ? parseInt(seqLeg.leg_name.replace('SEQ#', ''))
              : undefined,
            parentLegIndex: parentIndex, // Link to parent main leg index
            
            // Transform field names (same as main legs)
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
            
            strike_criteria: seqLeg.strike_criteria || 'strike_type',
            atm_strike: seqLeg.atm_strike || 'ATM',
            strike_value: seqLeg.premium_value !== null && seqLeg.premium_value !== undefined 
              ? String(seqLeg.premium_value) 
              : '',
            atm_percent_direction: seqLeg.strike_sign || '+',
            atm_percent_value: (() => {
              const backendVal = seqLeg.multiplier_percentage;
              const result = backendVal !== null && backendVal !== undefined 
                ? String(backendVal) 
                : '';
              console.log(`[LOAD] Sequential leg "${seqLeg.leg_name}" multiplier_percentage: ${backendVal} (type: ${typeof backendVal}) → "${result}"`);
              return result;
            })(),
          };
          
          extractedSequentialLegs.push(transformedSeqLeg);
          console.log(`[App] ✅ Extracted sequential leg: ${transformedSeqLeg.customName} (parentIndex: ${parentIndex})`);
        }
      };
      
      // Extract sequential legs from main legs
      (legs || []).forEach((originalLeg, index) => {
        if (transformedLegs[index] && !transformedLegs[index].isLazyLeg) {
          extractSequentialLeg(transformedLegs[index], originalLeg, index);
        }
      });
      
      // Add extracted sequential legs to transformedLegs array
      if (extractedSequentialLegs.length > 0) {
        transformedLegs.push(...extractedSequentialLegs);
        console.log(`[App] 📥 Added ${extractedSequentialLegs.length} extracted sequential legs to transformedLegs`);
      }
      
      // ⭐ NOTE: parentLegIndex is now set during sequential leg extraction above
      // No need to recalculate here since sequential legs are already linked to their parents
      // Sequential legs were extracted with correct parentLegIndex from the nested structure
      
      // ⭐ FIX: Also add unselected lazy legs to transformedLegs BEFORE linking
      // so they also get their nested lazy leg references linked
      const unselectedLazyLegs = (unselected_legs || []).map(leg => {
        console.log('[App] Transforming unselected lazy leg:', leg.leg_id, 'from backend format');
        
        const transformed = {
          ...leg,
          
          // Frontend-specific fields
          id: leg.leg_id,
          isLazyLeg: true, // All unselected legs are lazy legs
          customName: leg.leg_name || '',
          is_selected: false, // All unselected legs have is_selected = false
          
          // Transform field names (same as main transformation logic)
          lots: String(leg.lot_size || 1),
          position: leg.position_type?.toLowerCase() || 'buy',
          option_type: leg.option_type?.toLowerCase() || 'call',
          expiry: leg.expiry_type || '0dte',
          
          // Stop Loss field name + case conversion
          stop_loss_enabled: leg.is_stoploss || false,
          stop_loss_mode: leg.stoploss_type?.toLowerCase() || 'points',
          stop_loss_value: leg.stoploss_value || '',
          
          // Trail SL field name + case conversion
          trail_enabled: leg.is_trail_sl || false,
          trail_mode: leg.trail_sl_type?.toLowerCase() || 'points',
          trail_value: leg.instrument_moves || '',
          trail_lock_value: leg.stoploss_moves || '',
          
          // Target field name + case conversion
          target_enabled: leg.is_target || false,
          target_mode: leg.target_type?.toLowerCase() || 'points',
          target_value: leg.target_value || '',
          
          // Re-entry SL field name + case conversion
          // ⭐ FIX: Don't lowercase if it's LAZY_LEG (preserve for linking logic)
          reentry_sl_enabled: leg.is_reentry_sl || false,
          reentry_sl_mode: leg.reentry_sl_type?.toUpperCase() === 'LAZY_LEG' 
            ? 'LAZY_LEG' 
            : leg.reentry_sl_type?.toLowerCase() || 're_asap',
          reentry_sl_count: leg.reentry_sl_value || '',
          
          // Re-entry Target field name + case conversion
          // ⭐ FIX: Don't lowercase if it's LAZY_LEG (preserve for linking logic)
          reentry_tgt_enabled: leg.is_reentry_target || false,
          reentry_tgt_mode: leg.reentry_target_type?.toUpperCase() === 'LAZY_LEG' 
            ? 'LAZY_LEG' 
            : leg.reentry_target_type?.toLowerCase() || 're_asap',
          reentry_tgt_count: leg.reentry_target_value || '',
          
          // Momentum field name + case conversion
          momentum_enabled: leg.is_simple_momentum || false,
          momentum_mode: leg.momentum_type?.toLowerCase() || 'percent_up',
          momentum_value: leg.momentum_value || '',
          
          // Range breakout field name conversion (exclude for lazy legs)
          ...(!leg.is_lazy_leg && {
            range_enabled: leg.is_range_breakout || false,
            range_instrument: leg.range_breakout_type?.toLowerCase() || 'instrument',
            range_time: leg.range_end_time || null,
            range_direction: leg.range_on?.toLowerCase() || 'high',
          }),
          
          // Strike criteria conversion
          strike_criteria: leg.strike_criteria || 'strike_type',
          atm_strike: leg.atm_strike || 'ATM',
          strike_value: leg.premium_value || '',
          atm_percent_direction: leg.strike_sign || '+',
          atm_percent_value: leg.multiplier_percentage || '',
        };
        
        return transformed;
      });
      
      console.log('[App] Processed unselected lazy legs count:', unselectedLazyLegs.length);
      
      // ⭐ FIXED: Process flat structure from README2.md format  
      // All legs are in one flat array, but we need to:
      // 1. Identify main legs (is_lazy_leg = false) 
      // 2. Identify selected lazy legs (is_lazy_leg = true, is_selected = true)
      // 3. Identify unselected lazy legs (is_lazy_leg = true, is_selected = false)
      // 4. Link selected lazy legs to main legs based on reentry configuration
      // ⚠️ IMPORTANT: Unselected legs appear in BOTH legs array AND unselected_legs array - avoid duplication!
      console.log('[App] 🔄 Processing flat structure with is_selected flags...');
      
      const mainLegs = transformedLegs.filter(leg => !leg.isLazyLeg);
      const selectedLazyLegs = transformedLegs.filter(leg => leg.isLazyLeg && leg.is_selected);
      // ⚠️ FIX: Don't get unselected legs from transformedLegs - they're duplicated in unselected_legs array
      
      console.log('[App] Main legs count:', mainLegs.length);
      console.log('[App] Selected lazy legs count:', selectedLazyLegs.length);
      console.log('[App] Selected lazy legs details:', selectedLazyLegs.map(leg => ({
        id: leg.id,
        leg_id: leg.leg_id,
        customName: leg.customName,
        is_selected: leg.is_selected
      })));
      
      // ⭐ POTENTIAL FIX: Check if we need to deduplicate selected lazy legs by name
      // From README2.md: Both leg_id 365 and 367 have leg_name "lazy2" and is_selected: true
      // This might be causing UI duplication - let's see if we should keep only unique names
      
      // ⭐ NEW: Also handle case where same lazy leg name appears as both selected AND unselected
      // From current response: lazy3 appears as both selected (388) and unselected (391)
      console.log('[App] 🔍 Analyzing lazy leg duplications...');
      
      const allLazyLegNames = new Set();
      const uniqueSelectedLazyLegs = [];
      const seenSelectedNames = new Set();
      
      selectedLazyLegs.forEach(leg => {
        console.log(`[App] 📋 Selected lazy leg: ${leg.customName} (leg_id: ${leg.leg_id})`);
        allLazyLegNames.add(leg.customName);
        
        if (!seenSelectedNames.has(leg.customName)) {
          uniqueSelectedLazyLegs.push(leg);
          seenSelectedNames.add(leg.customName);
          console.log('[App] ✅ Keeping selected lazy leg:', leg.customName, `(leg_id: ${leg.leg_id})`);
        } else {
          console.log('[App] 🔄 Skipping duplicate selected lazy leg:', leg.customName, `(leg_id: ${leg.leg_id})`);
        }
      });
      
      console.log('[App] Selected lazy legs after deduplication:', uniqueSelectedLazyLegs.length);
      console.log('[App] Raw unselected_legs from backend:', unselected_legs?.length || 0);
      
      // ⭐ NEW: Filter out unselected lazy legs that have same names as selected lazy legs
      // From current response: lazy3 appears as both selected (388) AND unselected (391)
      // We should only show the selected version in UI, not both
      const filteredUnselectedLazyLegs = unselectedLazyLegs.filter(leg => {
        const isDuplicate = allLazyLegNames.has(leg.customName);
        if (isDuplicate) {
          console.log('[App] 🚫 Filtering out unselected lazy leg with same name as selected:', leg.customName, `(leg_id: ${leg.leg_id})`);
          return false;
        }
        console.log('[App] ✅ Keeping unique unselected lazy leg:', leg.customName, `(leg_id: ${leg.leg_id})`);
        return true;
      });
      
      console.log('[App] Unselected lazy legs after filtering duplicates:', filteredUnselectedLazyLegs.length);
      
      // ⭐ NEW: Add unselected lazy legs to transformedLegs BEFORE linking
      // so they can participate in nested lazy leg linking
      console.log('[App] 🔧 Adding unselected lazy legs to transformedLegs array before linking...');
      transformedLegs.push(...filteredUnselectedLazyLegs);
      console.log('[App] transformedLegs count after adding unselected:', transformedLegs.length);
      
      // ⭐ FIX: Link selected lazy legs to main legs based on backend array position
      // Backend pattern: Main leg followed by N lazy legs based on reentry_sl_value
      // reentry_sl_value tells us HOW MANY lazy legs follow this leg
      console.log('[App] 🔗 Linking lazy legs to main legs based on array position and reentry_sl_value...');
      
      // Process the original transformedLegs array to maintain order
      for (let i = 0; i < transformedLegs.length; i++) {
        const currentLeg = transformedLegs[i];
        
        // Skip if this is not a main leg
        if (currentLeg.isLazyLeg) continue;
        
        // Check if this main leg expects a lazy leg
        const hasLazyLegInReentrySL = currentLeg.reentry_sl_type?.toUpperCase() === 'LAZY_LEG';
        const hasLazyLegInReentryTgt = currentLeg.reentry_target_type?.toUpperCase() === 'LAZY_LEG';
        
        if (!hasLazyLegInReentrySL && !hasLazyLegInReentryTgt) {
          console.log(`[App] Main leg ${currentLeg.leg_id} does not expect lazy leg, skipping...`);
          continue;
        }
        
        // Check reentry_sl_value - if > 0, then lazy leg(s) follow
        const lazyLegCount = hasLazyLegInReentrySL ? (currentLeg.reentry_sl_count || 0) : 0;
        if (lazyLegCount === 0) {
          console.warn(`[App] Main leg ${currentLeg.leg_id} has LAZY_LEG but reentry_sl_count is 0`);
        }
        
        // Look for the NEXT leg in the array that is a selected lazy leg
        const nextLeg = transformedLegs[i + 1];
        if (nextLeg && nextLeg.isLazyLeg && nextLeg.is_selected) {
          console.log(`[App] 🔍 Found lazy leg ${nextLeg.leg_id} ("${nextLeg.customName}") following main leg ${currentLeg.leg_id}`);
          
          // Link based on which reentry type expects the lazy leg
          // ⭐ FIX: Use frontend ID (nextLeg.id), not backend ID (nextLeg.leg_id)
          // The dropdown looks for `lazy_leg_${l.id}` where `id` is the frontend ID
          if (hasLazyLegInReentrySL) {
            currentLeg.reentry_sl_mode = `lazy_leg_${nextLeg.id}`;
            console.log(`[App] ✅ Linked main leg ${currentLeg.leg_id} → lazy leg ${nextLeg.id} (backend: ${nextLeg.leg_id}, name: "${nextLeg.customName}") via reentry_sl_mode`);
          }
          
          if (hasLazyLegInReentryTgt) {
            currentLeg.reentry_tgt_mode = `lazy_leg_${nextLeg.id}`;
            console.log(`[App] ✅ Linked main leg ${currentLeg.leg_id} → lazy leg ${nextLeg.id} (backend: ${nextLeg.leg_id}, name: "${nextLeg.customName}") via reentry_tgt_mode`);
          }
        } else {
          console.warn(`[App] ⚠️ Main leg ${currentLeg.leg_id} expects lazy leg but next leg is not a selected lazy leg!`);
          console.warn(`[App]   Next leg:`, nextLeg ? {
            leg_id: nextLeg.leg_id,
            isLazyLeg: nextLeg.isLazyLeg,
            is_selected: nextLeg.is_selected,
            customName: nextLeg.customName
          } : 'NO NEXT LEG');
        }
      }
      
      // ⭐ FIX: Handle nested lazy leg references (lazy legs referencing other lazy legs)
      // Find by counting and position, then link by NAME to handle duplicates
      console.log('[App] 🔗 Processing nested lazy leg references...');
      console.log('[App] Total transformedLegs before nested linking:', transformedLegs.length);
      
      // Build a map of lazy leg names to IDs (use FIRST occurrence = the kept one after dedup)
      const lazyLegNameToId = {};
      transformedLegs.forEach(leg => {
        if (leg.isLazyLeg && leg.customName && !lazyLegNameToId[leg.customName]) {
          lazyLegNameToId[leg.customName] = leg.id; // Only set if not already set (first wins)
        }
      });
      
      console.log('[App] 📋 Lazy leg name→ID map:', lazyLegNameToId);
      
      // Process lazy legs and link them by position first, then verify by name
      transformedLegs.forEach((leg, index) => {
        if (!leg.isLazyLeg) return;
        
        const slType = leg.reentry_sl_type || '';
        const tgtType = leg.reentry_target_type || '';
        
        // Check if this lazy leg expects another lazy leg
        const hasNestedLazyLegInReentrySL = slType.toUpperCase() === 'LAZY_LEG';
        const hasNestedLazyLegInReentryTgt = tgtType.toUpperCase() === 'LAZY_LEG';
        
        if (!hasNestedLazyLegInReentrySL && !hasNestedLazyLegInReentryTgt) {
          return;
        }
        
        console.log(`[App] Lazy leg ${leg.leg_id} ("${leg.customName}") has nested lazy leg reference`);
        console.log(`[App]   slType="${slType}", reentry_sl_count=${leg.reentry_sl_count}`);
        
        // Check reentry_sl_count - if > 0, next lazy leg follows
        const hasNextLazyLeg = hasNestedLazyLegInReentrySL && (leg.reentry_sl_count > 0);
        
        if (hasNextLazyLeg) {
          const nextLeg = transformedLegs[index + 1];
          if (nextLeg && nextLeg.isLazyLeg && nextLeg.customName) {
            // Use the name-based lookup to find the correct lazy leg ID
            const targetLegId = lazyLegNameToId[nextLeg.customName];
            if (targetLegId) {
              leg.reentry_sl_mode = `lazy_leg_${targetLegId}`;
              console.log(`[App] ✅ SET reentry_sl_mode = "lazy_leg_${targetLegId}" for lazy leg ${leg.leg_id} ("${leg.customName}") → references "${nextLeg.customName}"`);
            } else {
              console.warn(`[App] ⚠️ Could not find lazy leg ID for name "${nextLeg.customName}"`);
            }
          } else {
            // ⭐ FIX: Next leg doesn't exist or isn't lazy - find by looking in backend data
            // This happens when unselected lazy legs are at the end of the array
            console.warn(`[App] ⚠️ Lazy leg ${leg.leg_id} expects lazy leg but next is not lazy!`);
            console.log(`[App] 🔍 Searching backend data for the target lazy leg...`);
            
            // Find this leg in the original backend legs array
            const backendLegIndex = legs.findIndex(l => l.leg_id === leg.leg_id);
            console.log(`[App] 🔍 Found lazy leg ${leg.leg_id} at backend index ${backendLegIndex}`);
            
            if (backendLegIndex !== -1 && backendLegIndex + 1 < legs.length) {
              const backendNextLeg = legs[backendLegIndex + 1];
              console.log(`[App] 🔍 Next leg in backend: leg_id=${backendNextLeg.leg_id}, is_lazy=${backendNextLeg.is_lazy_leg}, name="${backendNextLeg.leg_name}"`);
              
              if (backendNextLeg.is_lazy_leg && backendNextLeg.leg_name) {
                // Found the target lazy leg name, now find its ID in our deduplicated map
                // This will use the FIRST occurrence if there are duplicates
                const targetLegId = lazyLegNameToId[backendNextLeg.leg_name];
                console.log(`[App] 🔍 Looking up "${backendNextLeg.leg_name}" in map, found ID: ${targetLegId}`);
                
                if (targetLegId) {
                  leg.reentry_sl_mode = `lazy_leg_${targetLegId}`;
                  console.log(`[App] ✅ SET reentry_sl_mode = "lazy_leg_${targetLegId}" for lazy leg ${leg.leg_id} ("${leg.customName}") → references "${backendNextLeg.leg_name}" (found in backend data, using deduplicated ID)`);
                } else {
                  console.warn(`[App] ⚠️ Could not find lazy leg ID for backend name "${backendNextLeg.leg_name}"`);
                }
              }
            } else {
              console.warn(`[App] ⚠️ Could not find next leg in backend array for lazy leg ${leg.leg_id}`);
            }
          }
        } else if (hasNestedLazyLegInReentrySL && (leg.reentry_sl_count === 0 || leg.reentry_sl_count === '' || leg.reentry_sl_count === '0')) {
          // Circular reference: find the OTHER lazy leg by name
          // Pattern: lazy1 → lazy2 → lazy1 (circular)
          console.log(`[App] 🔄 Circular reference detected for lazy leg ${leg.leg_id} ("${leg.customName}")`);
          
          // Build name→ID map for all lazy legs (use first occurrence)
          const lazyLegNameToId = {};
          transformedLegs.forEach(l => {
            if (l.isLazyLeg && l.customName && !lazyLegNameToId[l.customName]) {
              lazyLegNameToId[l.customName] = l.id;
            }
          });
          
          console.log(`[App] 📋 Available lazy legs for circular linking:`, Object.keys(lazyLegNameToId));
          
          // Find the OTHER lazy leg (not this one)
          const allLazyLegNames = Object.keys(lazyLegNameToId);
          const otherLazyLegName = allLazyLegNames.find(name => name !== leg.customName);
          
          if (otherLazyLegName && lazyLegNameToId[otherLazyLegName]) {
            leg.reentry_sl_mode = `lazy_leg_${lazyLegNameToId[otherLazyLegName]}`;
            console.log(`[App] ✅ CIRCULAR: SET reentry_sl_mode = "lazy_leg_${lazyLegNameToId[otherLazyLegName]}" for lazy leg ${leg.leg_id} ("${leg.customName}") → references "${otherLazyLegName}"`);
          } else {
            console.warn(`[App] ⚠️ Lazy leg ${leg.leg_id} ("${leg.customName}") has circular reference but can't find other lazy leg!`);
          }
        }
        
        // Similar logic for target
        const hasNextLazyLegTgt = hasNestedLazyLegInReentryTgt && (leg.reentry_tgt_count > 0);
        if (hasNextLazyLegTgt) {
          const nextLeg = transformedLegs[index + 1];
          if (nextLeg && nextLeg.isLazyLeg) {
            leg.reentry_tgt_mode = `lazy_leg_${nextLeg.id}`;
            console.log(`[App] ✅ SET reentry_tgt_mode = "lazy_leg_${nextLeg.id}" for lazy leg ${leg.leg_id} → references "${nextLeg.customName}"`);
          }
        } else if (hasNestedLazyLegInReentryTgt && leg.reentry_tgt_count === 0) {
          // Circular reference for target
          const lazyLegNameToId = {};
          transformedLegs.forEach(l => {
            if (l.isLazyLeg && l.customName && !lazyLegNameToId[l.customName]) {
              lazyLegNameToId[l.customName] = l.id;
            }
          });
          
          const allLazyLegNames = Object.keys(lazyLegNameToId);
          const otherLazyLegName = allLazyLegNames.find(name => name !== leg.customName);
          
          if (otherLazyLegName && lazyLegNameToId[otherLazyLegName]) {
            leg.reentry_tgt_mode = `lazy_leg_${lazyLegNameToId[otherLazyLegName]}`;
            console.log(`[App] ✅ CIRCULAR: SET reentry_tgt_mode = "lazy_leg_${lazyLegNameToId[otherLazyLegName]}" for lazy leg ${leg.leg_id} ("${leg.customName}") → references "${otherLazyLegName}"`);
          }
        }
      });
      
      // ⭐ FIXED: Combine main legs + deduplicated selected lazy legs + filtered unselected lazy legs
      // Important: Must use the LINKED legs from transformedLegs, not the pre-linking arrays!
      // After linking, transformedLegs contains the updated reentry_sl_mode and reentry_tgt_mode values
      
      // Get main legs from transformedLegs (they have been linked)
      const linkedMainLegs = transformedLegs.filter(leg => !leg.isLazyLeg);
      
      // Get selected lazy legs from transformedLegs (they have been linked for nested references)
      const linkedSelectedLazyLegs = transformedLegs.filter(leg => leg.isLazyLeg && leg.is_selected);
      
      // Deduplicate selected lazy legs by name (keep first occurrence)
      const seenNamesAfterLinking = new Set();
      const deduplicatedLinkedSelectedLazyLegs = linkedSelectedLazyLegs.filter(leg => {
        if (!seenNamesAfterLinking.has(leg.customName)) {
          seenNamesAfterLinking.add(leg.customName);
          return true;
        }
        return false;
      });
      
      // Filter unselected lazy legs (from transformedLegs) that don't conflict with selected names
      const linkedUnselectedLazyLegs = transformedLegs.filter(leg => leg.isLazyLeg && !leg.is_selected);
      const filteredLinkedUnselectedLazyLegs = linkedUnselectedLazyLegs.filter(leg => {
        return !seenNamesAfterLinking.has(leg.customName);
      });
      
      const finalLegs = [
        ...linkedMainLegs,                           // Main legs (with linked lazy leg references)
        ...deduplicatedLinkedSelectedLazyLegs,       // Selected lazy legs (deduplicated, with nested linking)
        ...filteredLinkedUnselectedLazyLegs          // Unselected lazy legs (filtered)
      ];
      
      console.log('[App] Final legs array composition:');
      console.log('  - Main legs:', linkedMainLegs.length);
      console.log('  - Selected lazy legs (deduplicated):', deduplicatedLinkedSelectedLazyLegs.length); 
      console.log('  - Unselected lazy legs (filtered):', filteredLinkedUnselectedLazyLegs.length);
      console.log('  - Total final legs:', finalLegs.length);
      
      console.log('[App] Final structure with linking details:');
      finalLegs.forEach(leg => {
        if (leg.isSequentialLeg) {
          // Sequential leg
          console.log(`  Sequential Leg frontend_id:${leg.id} backend_id:${leg.leg_id} name:"${leg.customName}" parentLegIndex:${leg.parentLegIndex}`);
        } else if (!leg.isLazyLeg) {
          // Main leg
          const reentryInfo = [];
          if (leg.reentry_sl_mode) reentryInfo.push(`SL→${leg.reentry_sl_mode}`);
          if (leg.reentry_tgt_mode) reentryInfo.push(`TGT→${leg.reentry_tgt_mode}`);
          console.log(`  Main Leg frontend_id:${leg.id} backend_id:${leg.leg_id} ${reentryInfo.join(', ') || 'No lazy legs'}`);
        } else {
          // Lazy leg (show nested lazy leg references if any)
          const nestedInfo = [];
          if (leg.reentry_sl_mode) nestedInfo.push(`SL→${leg.reentry_sl_mode}`);
          if (leg.reentry_tgt_mode) nestedInfo.push(`TGT→${leg.reentry_tgt_mode}`);
          console.log(`  Lazy Leg frontend_id:${leg.id} backend_id:${leg.leg_id} name:"${leg.customName}" selected:${leg.is_selected}${nestedInfo.length ? ` [${nestedInfo.join(', ')}]` : ''}`);
        }
      });

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
      const finalLegsWithStrike = finalLegs.map(leg => {
        const convertedStrikeType = convertBackendStrikeToUI(leg.atm_strike);
        console.log(`[App] Converting leg ${leg.leg_id} strike: "${leg.atm_strike}" → "${convertedStrikeType}"`);
        return {
          ...leg,
          strike_type: convertedStrikeType
        };
      });

      console.log('[App] Final legs with strike_type converted:', finalLegsWithStrike.map(l => ({
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
        dte_filter: (() => {
          // Backend may return number (0, 1) or string ("0", "1", "combine_dte")
          const dteValue = strategy.dte_filter;
          const strategyType = strategy.strategy_type?.toLowerCase();
          
          console.log('[App] DTE Filter conversion (first path):', {
            raw_dte_value: dteValue,
            strategy_type: strategyType,
            is_btst: strategyType === 'btst',
            will_convert_to_combined: strategyType === 'btst' && (dteValue === 1 || dteValue === '1')
          });
          
          // Special case: If BTST and dte_filter=1, convert to 'combine_dte' for UI
          if (strategyType === 'btst' && (dteValue === 1 || dteValue === '1')) {
            console.log('[App] ✅ Converting BTST dte_filter=1 to "combine_dte" (first path)');
            return 'combine_dte';
          }
          
          // Standard conversions
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
        
        // Legs array (use final legs with strike_type converted and nested structure)
        legs: finalLegsWithStrike,
        
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
        // Range breakout field name conversion (exclude for lazy legs)
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
        dte_filter: (() => {
          const dteValue = strategy.dte_filter;
          const strategyType = strategy.strategy_type?.toLowerCase();
          
          console.log('[App] DTE Filter conversion:', {
            raw_dte_value: dteValue,
            strategy_type: strategyType,
            is_btst: strategyType === 'btst',
            will_convert_to_combined: strategyType === 'btst' && (dteValue === 1 || dteValue === '1')
          });
          
          // Special case: If BTST and dte_filter=1, convert to 'combine_dte' for UI
          if (strategyType === 'btst' && (dteValue === 1 || dteValue === '1')) {
            console.log('[App] ✅ Converting BTST dte_filter=1 to "combine_dte"');
            return 'combine_dte';
          }
          
          // Standard conversions
          if (dteValue === 0 || dteValue === '0') return '0';
          if (dteValue === 1 || dteValue === '1') return '1';
          if (dteValue === 'combine_dte' || dteValue === 'combined') return 'combine_dte';
          return String(dteValue || '0');
        })(),
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
        const savedStrategies = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
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
      
      // 🔥 DEBUG: Verify data was stored
      setTimeout(() => {
        const storedData = JSON.parse(localStorage.getItem('strategy_session_data') || '{}');
        console.log('🔍🔍🔍 VERIFICATION: Data actually stored in localStorage:');
        console.log('  strategy_id:', storedData.strategy_id);
        console.log('  strategy_name:', storedData.strategy_name);
        console.log('  version:', storedData.version);
        console.log('  Full data:', JSON.stringify(storedData, null, 2));
      }, 500);
      
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
          version: result.version || contextVersion || 1,  // ⭐ Store version from response or context
          symbol: strategyConfig.symbol || 'SPXW',
          strategy_type: strategyConfig.strategy_type || 'intraday',
          entry_time: strategyConfig.entry_time || '13:30',
          exit_time: strategyConfig.exit_time || '20:00',
          start_date: strategyConfig.start_date || null,
          end_date: strategyConfig.end_date || null,
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

              {activeTab === "portfolios" && (
                <Portfolios 
                  onShowToast={(message, type = 'success') => {
                    setToastMessage(message);
                    setToastType(type);
                    setShowToast(true);
                  }}
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
