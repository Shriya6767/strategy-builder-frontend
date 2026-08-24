import { Fragment, useMemo, useState, useEffect, useRef } from 'react';
import React from 'react';
import { Download } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Legend, Line } from 'recharts';
import MonthlyStatsTable from './MonthlyStatsTable';
import ToggleSwitch from './ToggleSwitch';
import { API_URL } from '../services/api';
import logger from '../utils/logger';

const inr = (value, decimals = 2) =>
  `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const inrCompact = (value) => {
  const v = Number(value || 0);
  const sign = v < 0 ? '-' : '';
  return `${sign}₹${Math.abs(v).toLocaleString('en-IN')}`;
};

const ColoredValue = ({ value, prefix = '₹ ', suffix = '', decimals = 2, className = '' }) => {
  const numValue = Number(value || 0);
  const isPositive = numValue >= 0;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  const formattedValue = numValue.toLocaleString('en-IN', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
  
  return (
    <span className={`${colorClass} ${className}`}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

const PAGE_LEG_TARGET = 10; // target LEG rows per page. Whole day-groups are packed in without

const BacktestResults = ({ results, onSaveStrategy, strategyId, strategySavedInSession, onClearResults }) => {
  const [statsView, setStatsView] = useState('day'); // 'day' | 'trade'
  const [inOutSample, setInOutSample] = useState(false);
  const [slippage, setSlippage] = useState(0); // Default to 0 instead of 1
  const [slippageCalculated, setSlippageCalculated] = useState(false);
  const [slippageResults, setSlippageResults] = useState(null); // Store slippage-adjusted results
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render key
  const [sortField, setSortField] = useState('Entry Date');
  const [sortDir, setSortDir] = useState('ASC');
  const [page, setPage] = useState(1);
  const [expandedLegs, setExpandedLegs] = useState(() => new Set());
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  // Ref for auto-scrolling to results when backtest completes
  const resultsRef = useRef(null);

  // Auto-scroll to results when they become available
  useEffect(() => {
    if (results && resultsRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 100);
    }
  }, [results]); // Only trigger when results change

  const toggleLegExpanded = (key) => {
    setExpandedLegs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (!results) {
    return <div className="text-center text-gray-500">No results to display</div>;
  }

  const activeResults = slippageResults ? { data: slippageResults } : results;


  let allTrades = [];
  let cumulativeData = [];
  let drawdownData = [];
  let overallExits = [];

  const monthlyStatsArray = activeResults?.data?.monthly_state_result || activeResults?.data?.monthlyStateResult || [];
  const monthlyStats = {};
  monthlyStatsArray.forEach(yearData => {
    const year = yearData.year;
    const daysMatch = yearData.days_of_Max_Drawdown?.match(/^(\d+)/);
    const daysNum = daysMatch ? daysMatch[1] : null;
    const dateMatch = yearData.days_of_Max_Drawdown?.match(/\[(.*?) to (.*?)\]/);
    const mddStart = dateMatch ? dateMatch[1] : null;
    const mddEnd = dateMatch ? dateMatch[2] : null;

    monthlyStats[year] = {
      Jan: yearData.january ? parseFloat(yearData.january) : null,
      Feb: yearData.february ? parseFloat(yearData.february) : null,
      Mar: yearData.march ? parseFloat(yearData.march) : null,
      Apr: yearData.april ? parseFloat(yearData.april) : null,
      May: yearData.may ? parseFloat(yearData.may) : null,
      Jun: yearData.june ? parseFloat(yearData.june) : null,
      Jul: yearData.july ? parseFloat(yearData.july) : null,
      Aug: yearData.august ? parseFloat(yearData.august) : null,
      Sep: yearData.september ? parseFloat(yearData.september) : null,
      Oct: yearData.october ? parseFloat(yearData.october) : null,
      Nov: yearData.november ? parseFloat(yearData.november) : null,
      Dec: yearData.december ? parseFloat(yearData.december) : null,
      total: yearData.total ? parseFloat(yearData.total) : 0,
      max_drawdown: yearData.max_Drawdown ? parseFloat(yearData.max_Drawdown) : null,
      days_for_mdd: daysNum,
      mdd_start: mddStart,
      mdd_end: mddEnd,
      r_mdd: yearData.yearly_Return_per_MaxDD ? parseFloat(yearData.yearly_Return_per_MaxDD) : null
    };
  });

  const tradeResults = activeResults?.data?.trade_results
    || activeResults?.data?.tradeResults
    || activeResults?.data?.trades
    || activeResults?.data?.data
    || (Array.isArray(activeResults?.data) ? activeResults.data : []);
  
  
  if (tradeResults.length > 0) {
    const firstTrade = tradeResults[0];
    if (firstTrade.legs && firstTrade.legs.length > 0) {
      firstTrade.legs.forEach((leg, idx) => {
      });
    }
  }
  
  if (tradeResults.length > 0) {
    tradeResults.forEach((record) => {
      (record.legs || []).forEach((leg) => {
        allTrades.push({ ...leg, trade_date: record.trade_date });
      });
    });
    let cumPnl = 0;
    let peak = 0;
    tradeResults.forEach((record) => {
      const dayPnl = (record.legs || []).reduce((s, l) => s + (l.pnl || 0), 0);
      cumPnl += dayPnl;
      if (cumPnl > peak) peak = cumPnl;
      cumulativeData.push({ date: record.trade_date, cumulativePnl: Math.round(cumPnl * 100) / 100, underlyingValue: record.legs?.[0]?.underlying_entry_price ?? null });
      drawdownData.push({ date: record.trade_date, drawdown: Math.round((cumPnl - peak) * 100) / 100 });
    });
  }

  const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const toInt = (v) => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
  const r2    = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  const summaryReports      = activeResults?.data?.summary_report_result || activeResults?.data?.summaryreportResult || [];
  const daywiseSummaryRaw   = summaryReports.find(r => r.reportType?.toLowerCase().includes('day'))?.summaryReport   || {};
  const tradewiseSummaryRaw = summaryReports.find(r => r.reportType?.toLowerCase().includes('trade'))?.summaryReport || {};

  const mapBackendSummary = (raw, isDay) => ({
    overall_profit:          toNum(raw.OverallProfit),
    no_of_trades:            toInt(isDay ? raw.NumberOfDays      : raw.NumberOfTrades),
    avg_profit_per_trade:    toNum(isDay ? raw.AvgProfitPerDays  : raw.AvgProfitPerTrade),
    win_percentage:          toNum(raw.WinPer),
    loss_percentage:         toNum(raw.LossPer),
    avg_loss_losing_trades:  toNum(isDay ? raw.AvgLossOnLossingDays   : raw.AvgLossOnLossingTrade),
    avg_profit_winning_trades: toNum(isDay ? raw.AvgProfitOnWinningDays : raw.AvgProfitOnWinningTrade),
    max_profit_single_trade: toNum(isDay ? raw.MaxProfitInSingleDays  : raw.MaxProfitInSingleTrade),
    max_loss_single_trade:   toNum(isDay ? raw.MaxLossInSingleDays    : raw.MaxLossInSingleTrade),
    max_drawdown_trade:      toNum(raw.Max_Drawdown),
    days_in_max_drawdown:    raw['Days_of_Max_Drawdown'] !== undefined && raw['Days_of_Max_Drawdown'] !== null ? String(raw['Days_of_Max_Drawdown']) : '—',
    no_of_trades_in_max_dd:  raw['MaxTradesInDrawdown'] !== undefined && raw['MaxTradesInDrawdown'] !== null ? toInt(raw['MaxTradesInDrawdown']) : 0,
    return_to_maxdd:         toNum(raw.ReturnPerMaxDD),
    reward_to_risk:          toNum(raw.RewardToRiskRatio),
    expectancy_ratio:        toNum(raw.ExpectancyRatio),
    max_win_streak:          toInt(raw.MaxWiningStreak),
    max_loss_streak:         toInt(raw.MaxLossingStreak),
  });

  const computeStats = (trades) => {
    if (!trades.length) return mapBackendSummary({}, true);
    const profitTrades = trades.filter(t => (t.pnl || 0) > 0);
    const lossTrades   = trades.filter(t => (t.pnl || 0) < 0);
    const totalPnl     = r2(trades.reduce((s, t) => s + (t.pnl || 0), 0));
    const avgProfit    = profitTrades.length ? r2(profitTrades.reduce((s,t)=>s+t.pnl,0)/profitTrades.length) : 0;
    const avgLoss      = lossTrades.length   ? r2(Math.abs(lossTrades.reduce((s,t)=>s+t.pnl,0))/lossTrades.length) : 0;
    let cumPnl=0, peak=0, maxDd=0;
    trades.forEach(t => {
      cumPnl += (t.pnl||0);
      if (cumPnl>peak) peak=cumPnl;
      if (cumPnl-peak < maxDd) maxDd=cumPnl-peak;
    });
    let mxW=0,mxL=0,cW=0,cL=0;
    trades.forEach(t=>{
      if((t.pnl||0)>=0){cW++;cL=0;if(cW>mxW)mxW=cW;}
      else{cL++;cW=0;if(cL>mxL)mxL=cL;}
    });
    return {
      overall_profit:          totalPnl,
      no_of_trades:            trades.length,
      avg_profit_per_trade:    trades.length ? r2(totalPnl/trades.length) : 0,
      win_percentage:          trades.length ? Number(((profitTrades.length/trades.length)*100).toFixed(2)) : 0,
      loss_percentage:         trades.length ? Number(((lossTrades.length/trades.length)*100).toFixed(2)) : 0,
      avg_loss_losing_trades:  avgLoss,
      max_profit_single_trade: profitTrades.length ? Math.max(...profitTrades.map(t=>t.pnl)) : 0,
      max_loss_single_trade:   lossTrades.length   ? Math.min(...lossTrades.map(t=>t.pnl))   : 0,
      max_drawdown_trade:      r2(maxDd),
      days_in_max_drawdown:    '—',
      return_to_maxdd:         maxDd!==0 ? Number((totalPnl/Math.abs(maxDd)).toFixed(2)) : 0,
      reward_to_risk:          avgLoss!==0 ? Number((avgProfit/avgLoss).toFixed(2)) : 0,
      expectancy_ratio:        avgLoss!==0 ? Number((((profitTrades.length/(trades.length||1))*avgProfit-(lossTrades.length/(trades.length||1))*avgLoss)/avgLoss).toFixed(2)) : 0,
      max_win_streak:          mxW,
      max_loss_streak:         mxL,
      no_of_trades_in_max_dd:  0,
    };
  };

  const dayTradeList = useMemo(() => {
    const map = new Map();
    allTrades.forEach(leg => {
      const key = leg.trade_date || 'unknown';
      if (!map.has(key)) map.set(key, { trade_date: key, pnl: 0 });
      map.get(key).pnl = r2(map.get(key).pnl + (leg.pnl || 0));
    });
    return Array.from(map.values()).sort((a,b) => a.trade_date.localeCompare(b.trade_date));
  }, [allTrades]);

  const backendDayStats   = mapBackendSummary(daywiseSummaryRaw,   true);
  const backendTradeStats = mapBackendSummary(tradewiseSummaryRaw, false);

  const hasDayStats   = Object.keys(daywiseSummaryRaw).length > 0;
  const hasTradeStats = Object.keys(tradewiseSummaryRaw).length > 0;

  const daywiseSummary   = hasDayStats   ? backendDayStats   : computeStats(dayTradeList);
  const tradewiseSummary = hasTradeStats ? backendTradeStats : computeStats(allTrades);

  const activeStats = statsView === 'day' ? daywiseSummary : tradewiseSummary;
  const activeRaw = statsView === 'day' ? daywiseSummaryRaw : tradewiseSummaryRaw;
  const getDaysInMaxDrawdown = () => {
    const possibleNames = ['Days_of_Max_Drawdown', 'DaysOfMaxDrawdown', 'days_of_max_drawdown'];
    for (const name of possibleNames) {
      const value = activeRaw[name];
      if (value !== undefined && value !== null && value !== '' && value !== 0) {
        const strValue = String(value);
        const match = strValue.match(/^(\d+)/);
        return match ? match[1] : strValue;
      }
    }
    return activeStats.days_in_max_drawdown || '—';
  };

  const getTradesInMaxDrawdown = () => {
    const possibleNames = ['MaxTradesInDrawdown', 'maxTradesInDrawdown', 'max_trades_in_drawdown'];
    for (const name of possibleNames) {
      const value = activeRaw[name];
      if (value !== undefined && value !== null && value !== 0) {
        return value;
      }
    }
    return activeStats.no_of_trades_in_max_dd ?? 0;
  };



  const scopedTrades = useMemo(() => {
    if (!inOutSample) return allTrades;
    const hasSampleFlag = allTrades.some(t => t.sample === 'out' || t.is_out_of_sample !== undefined);
    if (!hasSampleFlag) return allTrades;
    return allTrades.filter(t => t.sample === 'out' || t.is_out_of_sample === true);
  }, [allTrades, inOutSample]);

  const dayGroups = useMemo(() => {
    const map = new Map();
    scopedTrades.forEach((leg) => {
      const entryDate = leg.entry_datetime ? new Date(leg.entry_datetime) : null;
      const dateKey = leg.trade_date || (entryDate ? entryDate.toISOString().split('T')[0] : 'unknown');
      if (!map.has(dateKey)) {
        map.set(dateKey, { dateKey, legs: [] });
      }
      map.get(dateKey).legs.push(leg);
    });

    return Array.from(map.values()).map((group) => {
      const legsSorted = [...group.legs].sort((a, b) => new Date(a.entry_datetime) - new Date(b.entry_datetime));
      const firstLeg = legsSorted[0];
      const entryDate = firstLeg?.entry_datetime ? new Date(firstLeg.entry_datetime) : null;
      const exitDates = legsSorted
        .map(l => (l.exit_datetime ? new Date(l.exit_datetime) : null))
        .filter(Boolean);
      const latestExit = exitDates.length ? new Date(Math.max(...exitDates.map(d => d.getTime()))) : null;
      const totalPnl = legsSorted.reduce((sum, l) => sum + (l.pnl || 0), 0);

      return {
        dateKey: group.dateKey,
        entryDate,
        exitDate: latestExit,
        weekday: entryDate ? entryDate.toLocaleDateString('en-US', { weekday: 'long' }) : '',
        totalPnl,
        legs: legsSorted
      };
    });
  }, [scopedTrades]);

  const sortedGroups = useMemo(() => {
    const groups = [...dayGroups];
    const dir = sortDir === 'ASC' ? 1 : -1;
    groups.sort((a, b) => {
      if (sortField === 'P/L') return (a.totalPnl - b.totalPnl) * dir;
      if (sortField === 'Exit Date') {
        return ((a.exitDate?.getTime() || 0) - (b.exitDate?.getTime() || 0)) * dir;
      }
      return ((a.entryDate?.getTime() || 0) - (b.entryDate?.getTime() || 0)) * dir;
    });
    return groups;
  }, [dayGroups, sortField, sortDir]);

  const pages = useMemo(() => {
    const result = [];
    let current = [];
    let currentLegCount = 0;
    sortedGroups.forEach((group) => {
      const legCount = group.legs.length;
      if (current.length > 0 && currentLegCount + legCount > PAGE_LEG_TARGET) {
        result.push(current);
        current = [];
        currentLegCount = 0;
      }
      current.push(group);
      currentLegCount += legCount;
    });
    if (current.length > 0) result.push(current);
    return result;
  }, [sortedGroups]);

  const totalPages = Math.max(1, pages.length);
  const clampedPage = Math.min(page, totalPages);
  const pagedGroups = pages[clampedPage - 1] || [];
  const groupIndexOffset = pages.slice(0, clampedPage - 1).reduce((sum, pg) => sum + pg.length, 0);
  const totalRowsOnPage = pagedGroups.reduce((sum, g) => sum + 1 + g.legs.length, 0);
  const totalRowsAll = sortedGroups.reduce((sum, g) => sum + 1 + g.legs.length, 0);
  const rowsBefore = pages.slice(0, clampedPage - 1).reduce((sum, pg) => sum + pg.reduce((s, g) => s + 1 + g.legs.length, 0), 0);

  const pageNumbers = Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1);

  const formatExpiry = (leg) => {
    const match = (leg.ticker || '').match(/SPXW(\d{6})[CP]/);
    if (match) {
      const [, yymmdd] = match;
      const year = '20' + yymmdd.substring(0, 2);
      const month = yymmdd.substring(2, 4);
      const day = yymmdd.substring(4, 6);
      return `${year}-${month}-${day}`;
    }
    return '---';
  };

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div ref={resultsRef} key={`results-${refreshKey}`}>
      {/* Toast Notification - Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span className="font-medium">Slippage applied successfully.</span>
          </div>
        </div>
      )}
      
      {/* Toast Notification - Error Message */}
      {showErrorMessage && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <span className="font-medium">Please re-run the backtest.</span>
          </div>
        </div>
      )}
      
      {/* SLIPPAGE SECTION */}
      <div className="mx-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-10 py-10 mt-8 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Slippage:</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={slippage === 0 ? '' : slippage}
                  onChange={(e) => {
                    setSlippage(parseFloat(e.target.value) || 0);
                    setSlippageCalculated(false);
                  }}
                  className="w-24 px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="0"
                  step="0.1"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
              </div>
            </div>
            
            <button 
              onClick={async () => {
                
                try {
                  const requestPayload = {
                    strategy_id: strategyId || -999,  // Use strategyId if saved, otherwise -999 for unsaved
                    slippage_percent: slippage  // Changed from Slippage_percent to slippage_percent
                  };


                  const response = await fetch(`${API_URL}/apply-slippage`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestPayload)
                  });


                  if (!response.ok) {
                    let errorMessage = 'Failed to apply slippage';
                    try {
                      const errorData = await response.json();
                      errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
                      logger.error('Error response:', errorData);
                    } catch (e) {
                      const errorText = await response.text();
                      errorMessage = errorText || errorMessage;
                      logger.error('Error response text:', errorText);
                    }
                    throw new Error(errorMessage);
                  }

                  const result = await response.json();
                  
                  if (result.success && result.data) {
                    
                    setSlippageResults(result.data);
                    setSlippageCalculated(true);
                    setRefreshKey(prev => prev + 1); // Force component re-render
                    
                    
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 3000); // Hide after 3 seconds
                  } else {
                    throw new Error('Invalid response format');
                  }
                  
                } catch (error) {
                  logger.error('Error applying slippage:', error);
                  
                  setShowErrorMessage(true);
                  setTimeout(() => setShowErrorMessage(false), 3000); // Hide after 3 seconds
                  
                  setSlippageCalculated(false);
                  setSlippageResults(null);
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition-all shadow-sm hover:shadow-md"
            >
              Calculate
            </button>
            
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-3">* The returns are annualized for calculation</p>
        </div>
      </div>

      {/* 1. MONTHLY STATS TABLE */}
      <div className="mx-12">
        <MonthlyStatsTable monthlyStats={monthlyStats} />
      </div>

      {/* 2. CUMULATIVE PnL CHART */}
      <div className="mx-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-10 py-10 mt-8 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Cumulative PnL</h3>
        {cumulativeData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="#6b7280"
                  
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => inrCompact(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [inr(value, 2), '']}
                />
                <Legend />
                <Line
                  
                  type="monotone"
                  dataKey="cumulativePnl"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                  name="Cumulative PnL"
                />
                <Line
                  
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (

          <p className="text-gray-500">No cumulative data available</p>
        )}
        </div>
      </div>

      {/* 3. DRAWDOWN CHART */}
      <div className="mx-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-10 py-10 mt-8 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Drawdown</h3>
        {drawdownData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownData}>
                <defs>
                  <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => inrCompact(-Math.abs(value))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => inr(value, 2)}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDrawdown)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500">No drawdown data available</p>
        )}
        </div>
      </div>

      {/* 4. OVERALL STATS GRID */}
      <div className="mx-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-10 py-10 mt-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className={`text-sm ${statsView === 'day' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>Day wise</span>
            <ToggleSwitch
              id="stats-view-toggle"
              checked={statsView === 'trade'}
              onChange={() => setStatsView(prev => (prev === 'day' ? 'trade' : 'day'))}
            />
            <span className={`text-sm ${statsView === 'trade' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>Trade wise</span>
          </div>
        </div>   

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Column 1: Revenue Metrics */}
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Overall Profit (In ₹)</span>
              <span className="text-lg font-bold">
                <ColoredValue value={activeStats.overall_profit} prefix="₹ " decimals={2} className="text-lg font-bold" />
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{statsView === 'day' ? 'No. Of Days' : 'No. Of Trades'}</span>
              <span className="text-lg font-bold text-gray-900">{activeStats.no_of_trades || 0}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{statsView === 'day' ? 'Average Profit per Day (In ₹)' : 'Average Profit per Trade (In ₹)'}</span>
              <span className="text-lg font-bold">
                <ColoredValue value={activeStats.avg_profit_per_trade} prefix="₹ " decimals={2} className="text-lg font-bold" />
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Win %</span>
              <span className="text-lg font-bold text-gray-900">{activeStats.win_percentage || 0}%</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Loss %</span>
              <span className="text-lg font-bold text-gray-900">{activeStats.loss_percentage || 0}%</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{statsView === 'day' ? 'Average Profit on Winning Days (In ₹)' : 'Average Profit on Winning Trades (In ₹)'}</span>
              <span className="text-lg font-bold">
                <ColoredValue value={activeStats.avg_profit_winning_trades} prefix="₹ " decimals={2} className="text-lg font-bold" />
              </span>
            </div>
          </div>

          {/* Column 2: Risk Metrics */}
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Return/MaxDD</span>
              <span className="text-lg font-bold text-gray-900">{activeStats.return_to_maxdd || 0}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Reward to Risk Ratio</span>
              <span className="text-lg font-bold text-gray-900">{activeStats.reward_to_risk || 0}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Expectancy Ratio</span>
              <span className="text-lg font-bold text-gray-900">{activeStats.expectancy_ratio || 0}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{statsView === 'day' ? 'Max Win Streak (Days)' : 'Max Win Streak (Trades)'}</span>
              <span className="text-lg font-bold text-gray-900">{activeStats.max_win_streak || 0}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{statsView === 'day' ? 'Max Losing Streak (Days)' : 'Max Losing Streak (Trades)'}</span>
              <span className="text-lg font-bold text-gray-900">{activeStats.max_loss_streak || 0}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">No. of Trades in Max Draw-down</span>
              <span className="text-lg font-bold text-gray-900">{getTradesInMaxDrawdown()}</span>
            </div>
          </div>

          {/* Column 3: Trade Metrics */}
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{statsView === 'day' ? 'Average Loss on Losing Days (In ₹)' : 'Average Loss on Losing Trades (In ₹)'}</span>
              <span className="text-lg font-bold">
                <ColoredValue value={-Math.abs(activeStats.avg_loss_losing_trades)} prefix="₹ " decimals={2} className="text-lg font-bold" />
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{statsView === 'day' ? 'Max Profit in Single Day (In ₹)' : 'Max Profit in Single Trade (In ₹)'}</span>
              <span className="text-lg font-bold">
                <ColoredValue value={activeStats.max_profit_single_trade} prefix="₹ " decimals={2} className="text-lg font-bold" />
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{statsView === 'day' ? 'Max Loss in Single Day (In ₹)' : 'Max Loss in Single Trade (In ₹)'}</span>
              <span className="text-lg font-bold">
                <ColoredValue value={activeStats.max_loss_single_trade} prefix="₹ " decimals={2} className="text-lg font-bold" />
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{statsView === 'day' ? 'Max Drawdown Day (In ₹)' : 'Max Drawdown Trade (In ₹)'}</span>
              <span className="text-lg font-bold">
                <ColoredValue value={activeStats.max_drawdown_trade} prefix="₹ " decimals={2} className="text-lg font-bold" />
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">No. of days in Max Draw-down</span>
              <span className="text-lg font-bold text-gray-900">{getDaysInMaxDrawdown()}</span>
            </div>
          </div>
        </div>
        </div>
      </div>

            {/* 6. FULL REPORT - TRADES TABLE */}
      <div className="mx-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-10 py-10 mt-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Full Report</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-xs sm:text-sm text-gray-600 mr-1">Sort By :</span>
            <select
              value={sortField}
              onChange={(e) => { setSortField(e.target.value); setPage(1); }}
              className="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm"
            >
              <option>Entry Date</option>
              <option>Exit Date</option>
              <option>P/L</option>
            </select>
            <button
              onClick={() => { setSortDir('ASC'); setPage(1); }}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${sortDir === 'ASC' ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
            >
              ASC
            </button>
            <button
              onClick={() => { setSortDir('DESC'); setPage(1); }}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${sortDir === 'DESC' ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
            >
              DESC
            </button>
            <button
              onClick={() => {
                const getWeekday = (dateStr) => {
                  if (!dateStr) return '';
                  const date = new Date(dateStr);
                  return date.toLocaleDateString('en-US', { weekday: 'long' });
                };
                
                const formatExpiry = (leg) => {
                  if (!leg.expiry) return '';
                  if (leg.expiry.includes('DTE') || leg.expiry.includes('dte')) return leg.expiry.toUpperCase();
                  const exp = new Date(leg.expiry);
                  return !isNaN(exp) ? exp.toISOString().split('T')[0] : leg.expiry;
                };
                
                const grouped = {};
                allTrades.forEach((leg, idx) => {
                  const entryDate = leg.entry_datetime ? new Date(leg.entry_datetime) : null;
                  const dateKey = entryDate ? entryDate.toISOString().split('T')[0] : 'unknown';
                  if (!grouped[dateKey]) {
                    grouped[dateKey] = { legs: [], index: Object.keys(grouped).length + 1 };
                  }
                  grouped[dateKey].legs.push({ ...leg, globalIndex: idx });
                });
                
                const header = ['Index', 'Leg', 'Entry Date', 'Weekday', 'Entry Time', 'Entry Price', 'Qty', 'Instrument', 'Strike Price', 'B/S', 'Exit Date', 'Exit Time', 'Exit Price', 'P/L', 'Expiry Date', 'Remark'];
                
                const rows = [];
                Object.keys(grouped).sort().forEach((dateKey, groupIdx) => {
                  const group = grouped[dateKey];
                  const dayIndex = groupIdx + 1;
                  const dayPnl = group.legs.reduce((sum, leg) => sum + (leg.pnl || 0), 0);
                  
                  const firstLeg = group.legs[0];
                  const entryDate = firstLeg.entry_datetime ? new Date(firstLeg.entry_datetime) : null;
                  const entryDateStr = entryDate ? entryDate.toISOString().split('T')[0] : dateKey;
                  const entryTimeStr = entryDate ? entryDate.toTimeString().split(' ')[0] : '';
                  const weekday = getWeekday(entryDateStr);
                  
                  rows.push([
                    dayIndex,
                    '—',
                    entryDateStr,
                    weekday,
                    entryTimeStr,
                    '—',
                    '—',
                    '—',
                    '—',
                    '—',
                    entryDateStr,
                    '',
                    '—',
                    dayPnl.toFixed(2),
                    '—',
                    '—'
                  ]);
                  
                  group.legs.forEach((leg, legIdx) => {
                    const entryDate = leg.entry_datetime ? new Date(leg.entry_datetime) : null;
                    const entryDateStr = entryDate ? entryDate.toISOString().split('T')[0] : '---';
                    const entryTimeStr = entryDate ? entryDate.toTimeString().split(' ')[0] : '---';
                    const legWeekday = getWeekday(entryDateStr);
                    const exitDate = leg.exit_datetime ? new Date(leg.exit_datetime) : null;
                    const exitDateStr = exitDate ? exitDate.toISOString().split('T')[0] : '---';
                    const exitTimeStr = exitDate ? exitDate.toTimeString().split(' ')[0] : '---';
                    
                    rows.push([
                      `${dayIndex}.${legIdx + 1}`,
                      `Leg_${leg.leg ?? legIdx + 1}`,
                      entryDateStr,
                      legWeekday,
                      entryTimeStr,
                      leg.entry_price?.toFixed(2) || '',
                      leg.qty ?? leg.lot_size ?? 1,
                      (leg.option || '').toUpperCase(),
                      leg.strike || '',
                      leg.position || '',
                      exitDateStr,
                      exitTimeStr,
                      leg.exit_price?.toFixed(2) || '',
                      (leg.pnl || 0).toFixed(2),
                      formatExpiry(leg),
                      leg.exit_reason || leg.status || 'Normal Exit'
                    ]);
                  });
                });
                
                const csvContent = [
                  header.join(','),
                  ...rows.map(row => row.map(cell => {
                    const str = String(cell);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                      return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                  }).join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `backtest_report_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
              }}
              className="px-4 py-2 rounded border-2 border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium transition-all"
            >
              Download Report
            </button>
          </div>
        </div>

        {/* Trades Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[1000px] text-xs">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Index</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Leg</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Entry Date</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Weekday</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Entry Time</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Entry Price</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Qty</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Instrument</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Strike Price</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">B/S</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Exit Date</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Exit Time</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Exit Price</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">P/L</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Expiry Date</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Remark</th>
                <th className="px-3 py-2 text-left text-gray-700 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedGroups.length > 0 ? (
                  pagedGroups.map((group, gIndex) => {
                  const rowIndex = groupIndexOffset + gIndex + 1;
                  const dayIsProfit = group.totalPnl >= 0;
                  const dateStr = group.entryDate ? group.entryDate.toISOString().split('T')[0] : group.dateKey;
                  const dayExitStr = group.exitDate ? group.exitDate.toISOString().split('T')[0] : dateStr;
                  const dayExitTimeStr = group.exitDate ? group.exitDate.toTimeString().split(' ')[0] : '';

                  return (
                    <Fragment key={group.dateKey}>
                      {/* Day summary row */}
                      <tr className="border-b border-gray-100 bg-gray-50/60 font-medium">
                        <td className="px-3 py-2 text-gray-900">{rowIndex}</td>
                        <td className="px-3 py-2 text-gray-400">—</td>
                        <td className="px-3 py-2 text-gray-900">{dateStr}</td>
                        <td className="px-3 py-2 text-gray-600">{group.weekday}</td>
                        <td className="px-3 py-2 text-gray-600">{group.entryDate ? group.entryDate.toTimeString().split(' ')[0] : ''}</td>
                        <td className="px-3 py-2 text-gray-400">—</td>
                        <td className="px-3 py-2 text-gray-400">—</td>
                        <td className="px-3 py-2 text-gray-400">—</td>
                        <td className="px-3 py-2 text-gray-400">—</td>
                        <td className="px-3 py-2 text-gray-400">—</td>
                        <td className="px-3 py-2 text-gray-900">{dayExitStr}</td>
                        <td className="px-3 py-2 text-gray-600">{dayExitTimeStr}</td>
                        <td className="px-3 py-2 text-gray-400">—</td>
                        <td className="px-3 py-2 font-semibold">
                          <ColoredValue value={group.totalPnl} prefix="" suffix="" decimals={2} className="font-semibold" />
                        </td>
                        <td className="px-3 py-2 text-gray-400">—</td>
                        <td className="px-3 py-2 text-gray-400">—</td>
                        {/* Actions column - Empty for day summary row */}
                        <td className="px-3 py-2"></td>
                      </tr>

                      {/* Leg detail rows */}
                      {group.legs.map((leg, legIdx) => {
                        const pnl = leg.pnl || 0;
                        const isProfit = pnl >= 0;
                        const entryDate = leg.entry_datetime ? new Date(leg.entry_datetime) : null;
                        const entryDateStr = entryDate ? entryDate.toISOString().split('T')[0] : '---';
                        const entryTimeStr = entryDate ? entryDate.toTimeString().split(' ')[0] : '---';
                        const legWeekday = entryDate ? entryDate.toLocaleDateString('en-US', { weekday: 'long' }) : '';
                        const exitDate = leg.exit_datetime ? new Date(leg.exit_datetime) : null;
                        const exitDateStr = exitDate ? exitDate.toISOString().split('T')[0] : '---';
                        const exitTimeStr = exitDate ? exitDate.toTimeString().split(' ')[0] : '---';
                        const legKey = `${group.dateKey}-${legIdx}`;
                        const isExpanded = expandedLegs.has(legKey);

                        return (
                          <Fragment key={legKey}>
                            <tr
                              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                              onClick={() => toggleLegExpanded(legKey)}
                              title="Click to see every raw field returned by the backend for this leg"
                            >
                              <td className="px-3 py-2 text-gray-500">
                                <span className={`inline-block mr-1 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▸</span>
                                {rowIndex}.{legIdx + 1}
                              </td>
                              <td className="px-3 py-2 text-gray-600">Leg_{leg.leg ?? legIdx + 1}</td>
                              <td className="px-3 py-2 text-gray-900">{entryDateStr}</td>
                              <td className="px-3 py-2 text-gray-600">{legWeekday}</td>
                              <td className="px-3 py-2 text-gray-600">{entryTimeStr}</td>
                              <td className="px-3 py-2 text-gray-900">{leg.entry_price?.toFixed(2)}</td>
                              <td className="px-3 py-2 text-gray-900">{leg.qty ?? leg.lot_size ?? 1}</td>
                              <td className="px-3 py-2 text-gray-600">{leg.option?.toUpperCase()}</td>
                              <td className="px-3 py-2 text-gray-900">{leg.strike}</td>
                              <td className="px-3 py-2 text-gray-600">{leg.position}</td>
                              <td className="px-3 py-2 text-gray-900">{exitDateStr}</td>
                              <td className="px-3 py-2 text-gray-600">{exitTimeStr}</td>
                              <td className="px-3 py-2 text-gray-900">{leg.exit_price?.toFixed(2)}</td>
                              <td className="px-3 py-2 font-semibold">
                                <ColoredValue value={pnl} prefix="" suffix="" decimals={2} className="font-semibold" />
                              </td>
                              <td className="px-3 py-2 text-gray-600">{formatExpiry(leg)}</td>
                              <td className="px-3 py-2 text-gray-600 text-xs max-w-xs truncate">
                                {leg.exit_reason || leg.status || 'Normal Exit'}
                                {leg.is_reentry && ` (${leg.reentry_mode || 'RE-ENTRY'})`}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-blue-50/40 border-b border-gray-100">
                                <td colSpan={17} className="px-6 py-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-[11px]">
                                    <div><span className="text-gray-500">Ticker: </span><span className="text-gray-800 font-medium">{leg.ticker || '---'}</span></div>
                                    <div><span className="text-gray-500">Moneyness: </span><span className="text-gray-800 font-medium">{leg.moneyness || '---'}</span></div>
                                    <div><span className="text-gray-500">Distance from Underlying: </span><span className="text-gray-800 font-medium">{leg.distance_from_underlying?.toFixed?.(2) ?? '---'}</span></div>
                                    <div><span className="text-gray-500">Underlying Entry Price: </span><span className="text-gray-800 font-medium">{leg.underlying_entry_price?.toFixed?.(2) ?? '---'}</span></div>
                                    <div><span className="text-gray-500">Status: </span><span className="text-gray-800 font-medium">{leg.status || '---'}</span></div>
                                    <div><span className="text-gray-500">Target Price: </span><span className="text-gray-800 font-medium">{leg.target_price?.toFixed?.(2) ?? '---'}</span></div>
                                    <div><span className="text-gray-500">Stoploss Price: </span><span className="text-gray-800 font-medium">{leg.stoploss_price?.toFixed?.(2) ?? '---'}</span></div>
                                    <div><span className="text-gray-500">Is Reentry: </span><span className="text-gray-800 font-medium">{leg.is_reentry ? 'Yes' : 'No'}</span></div>
                                    <div><span className="text-gray-500">Reentry Mode: </span><span className="text-gray-800 font-medium">{leg.reentry_mode || '---'}</span></div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="17" className="px-3 py-4 text-center text-gray-500">
                    No trades available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sortedGroups.length > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 text-sm relative">
            {/* Page Info */}
            <div className="text-gray-600 font-medium">
              Showing {rowsBefore + 1} - {rowsBefore + totalRowsOnPage} of {totalRowsAll} items
              <span className="ml-2 text-gray-500">| Page {clampedPage} of {totalPages}</span>
            </div>

            {/* Pagination Controls - Centered */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* First Page */}
              <button
                onClick={() => goToPage(1)}
                disabled={clampedPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-gray-700 transition"
                title="First Page"
              >
                ⬅️
              </button>

              {/* Previous Page */}
              <button
                onClick={() => goToPage(clampedPage - 1)}
                disabled={clampedPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-gray-700 transition"
                title="Previous Page"
              >
                ◀
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`px-3 py-2 rounded-md border transition ${
                      p === clampedPage
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-md'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {totalPages > 10 && (
                  <span className="px-2 text-gray-400 font-semibold">…</span>
                )}
              </div>

              {/* Next Page */}
              <button
                onClick={() => goToPage(clampedPage + 1)}
                disabled={clampedPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-gray-700 transition"
                title="Next Page"
              >
                ▶
              </button>

              {/* Last Page */}
              <button
                onClick={() => goToPage(totalPages)}
                disabled={clampedPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-gray-700 transition"
                title="Last Page"
              >
                ➡️
              </button>
            </div>

            {/* Close Report Button - Positioned absolute to right, vertically aligned with Download Report */}
            <button
              onClick={() => {
                if (onClearResults) {
                  onClearResults();
                }
              }}
              className="absolute right-0 top-0 flex items-center gap-2 px-4 py-2 border-2 border-red-500 text-red-600 bg-white rounded-lg hover:bg-red-50 hover:shadow-md active:scale-95 transition-all duration-200 font-medium"
              title="Close and clear this report"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Close Report
            </button>


            {/* Legend */}
            <div className="text-xs text-gray-500 mt-2">
              10 legs per page • Days grouped together • Different leg types on different pages
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

export default React.memo(BacktestResults);
