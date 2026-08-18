import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';

const PortfolioBacktestResults = ({ 
  results, 
  startDate, 
  endDate,
  portfolioName,
  strategies,
  dteTab,
  qtyMultiplier,
  slippage
}) => {
  const [sortBy, setSortBy] = useState('Entry date');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [aggregateByDay, setAggregateByDay] = useState(true); // Checkbox state for daywise vs tradewise
  const tradesPerPage = 10;

  if (!results) {
    return null;
  }

  console.log('🔍 [PortfolioBacktestResults] Received results:', results);

  // The API response has data at root level, not nested in data property
  const data = results.data || results;

  console.log('📊 [PortfolioBacktestResults] Using data:', data);
  console.log('📊 [PortfolioBacktestResults] Data keys:', Object.keys(data));

  // Parse aggregate summary data
  const aggregate = data.aggregate || {};
  const summaryReports = aggregate.summary_report_result || [];
  const daywiseSummary = summaryReports.find(r => r.reportType === 'Daywise')?.summaryReport || {};
  const tradewiseSummary = summaryReports.find(r => r.reportType === 'Tradewise')?.summaryReport || {};

  // Parse monthly stats
  const yearlyReturns = aggregate.monthly_state_result || [];

  // Parse strategy-wise data
  const strategiesData = data.strategies || [];
  
  // Build cumulative P/L data from trades
  const allTradesWithPnL = [];
  strategiesData.forEach(strategy => {
    const trades = strategy.trade_results || [];
    trades.forEach(trade => {
      // Calculate trade P/L from legs
      let tradePnL = 0;
      if (trade.legs && trade.legs.length > 0) {
        trade.legs.forEach(leg => {
          if (leg.pnl !== undefined && leg.pnl !== null && leg.status !== 'NO_CHAIN_DATA') {
            tradePnL += parseFloat(leg.pnl) || 0;
          }
        });
      }
      
      // Only add trades that have P/L data
      if (tradePnL !== 0 || (trade.legs && trade.legs.some(leg => leg.status !== 'NO_CHAIN_DATA'))) {
        allTradesWithPnL.push({
          date: trade.trade_date || trade.entry_datetime?.split('T')[0],
          pnl: tradePnL,
          strategy_name: strategy.strategy_name,
          strategy_id: strategy.strategy_id
        });
      }
    });
  });

  // Sort trades by date
  allTradesWithPnL.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate cumulative P/L and drawdown
  const cumulativeData = [];
  let cumulativePnL = 0;
  let peak = 0;
  
  allTradesWithPnL.forEach(trade => {
    cumulativePnL += trade.pnl;
    
    // Update peak if we've reached a new high
    if (cumulativePnL > peak) {
      peak = cumulativePnL;
    }
    
    // Calculate drawdown from peak
    const drawdown = cumulativePnL - peak;
    
    cumulativeData.push({
      date: trade.date,
      cumulative: cumulativePnL,
      drawdown: drawdown,
      pnl: trade.pnl
    });
  });

  console.log('📈 [PortfolioBacktestResults] Cumulative data calculated:', {
    totalTrades: allTradesWithPnL.length,
    finalCumulativePnL: cumulativePnL,
    dataPoints: cumulativeData.length
  });
  
  // Parse all trades from all strategies for the table
  // Build BOTH daywise aggregated data and individual leg data
  const allTradesLegwise = []; // Individual legs (tradewise)
  const dayTradesMap = {}; // Aggregated by day (daywise)
  
  strategiesData.forEach(strategy => {
    const trades = strategy.trade_results || [];
    trades.forEach(trade => {
      const tradeDate = trade.trade_date;
      
      // Process each leg as a separate trade row (tradewise)
      if (trade.legs && trade.legs.length > 0) {
        trade.legs.forEach(leg => {
          // Only add legs that have actual trade data, not just NO_CHAIN_DATA status
          if (leg.status !== 'NO_CHAIN_DATA') {
            // Parse entry/exit datetime
            const entryDateTime = trade.entry_datetime || '';
            const exitDateTime = leg.exit_datetime || trade.exit_datetime || '';
            
            const [entryDate, entryTime] = entryDateTime.split('T');
            const entryTimeFormatted = entryTime ? entryTime.split('+')[0].substring(0, 8) : '';
            
            const [exitDate, exitTime] = exitDateTime.split('T');
            const exitTimeFormatted = exitTime ? exitTime.split('+')[0].substring(0, 8) : '';
            
            const legData = {
              strategy_name: strategy.strategy_name,
              strategy_id: strategy.strategy_id,
              trade_date: trade.trade_date,
              entry_date: entryDate || trade.trade_date,
              entry_time: entryTimeFormatted,
              exit_date: exitDate || '',
              exit_time: exitTimeFormatted,
              leg_number: leg.leg,
              type: leg.option || '', // "call" or "put"
              strike: leg.strike || '',
              side: leg.position || '', // "BUY" or "SELL"
              qty: leg.quantity_multiplier || leg.quantity || leg.qty || leg.lot_size || '',
              entry_price: leg.entry_price || leg.entryPrice || 0,
              exit_price: leg.exit_price || leg.exitPrice || 0,
              vix: leg.vix || trade.vix || 0,
              pnl: leg.pnl || leg.profit_loss || 0,
              moneyness: leg.moneyness || '',
              ticker: leg.ticker || ''
            };
            
            allTradesLegwise.push(legData);
            
            // Aggregate by day (daywise)
            if (!dayTradesMap[tradeDate]) {
              dayTradesMap[tradeDate] = {
                strategy_name: strategy.strategy_name,
                strategy_id: strategy.strategy_id,
                trade_date: tradeDate,
                entry_date: entryDate || tradeDate,
                entry_time: entryTimeFormatted,
                exit_date: exitDate || '',
                exit_time: exitTimeFormatted,
                legs_count: 0,
                total_pnl: 0,
                vix: leg.vix || trade.vix || 0,
                qty: leg.quantity_multiplier || leg.quantity || leg.qty || leg.lot_size || 0,
                // Collect all strikes, sides, entry prices, exit prices from legs
                strikes: [],
                sides: [],
                entry_prices: [],
                exit_prices: [],
                types: [],
                legs: []
              };
            }
            
            // Add leg data to the aggregated day
            dayTradesMap[tradeDate].strikes.push(leg.strike || '');
            dayTradesMap[tradeDate].sides.push(leg.position || '');
            dayTradesMap[tradeDate].entry_prices.push(leg.entry_price || 0);
            dayTradesMap[tradeDate].exit_prices.push(leg.exit_price || 0);
            dayTradesMap[tradeDate].types.push(leg.option || '');
            
            dayTradesMap[tradeDate].legs.push(legData);
            dayTradesMap[tradeDate].legs_count += 1;
            dayTradesMap[tradeDate].total_pnl += parseFloat(legData.pnl || 0);
          }
        });
      }
    });
  });
  
  // Convert daywise map to array
  const allTradesDaywise = Object.values(dayTradesMap);
  
  console.log('📋 [PortfolioBacktestResults] Trade data built:', {
    legwiseTrades: allTradesLegwise.length,
    daywiseTrades: allTradesDaywise.length,
    sampleLegwise: allTradesLegwise[0],
    sampleDaywise: allTradesDaywise[0]
  });
  
  // Choose which data to display based on checkbox
  const allTrades = aggregateByDay ? allTradesDaywise : allTradesLegwise;
  
  // Pagination logic
  const indexOfLastTrade = currentPage * tradesPerPage;
  const indexOfFirstTrade = indexOfLastTrade - tradesPerPage;
  const currentTrades = allTrades.slice(indexOfFirstTrade, indexOfLastTrade);
  const totalPages = Math.ceil(allTrades.length / tradesPerPage);

  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value, decimals = 2) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // Build strategy stats object for table
  const strategyStats = {};
  strategiesData.forEach(strategy => {
    // Get strategy-specific summary data based on checkbox
    const strategySummaryReports = strategy.summary_report_result || [];
    const reportType = aggregateByDay ? 'Daywise' : 'Tradewise';
    const strategySummary = strategySummaryReports.find(r => r.reportType === reportType)?.summaryReport || {};
    
    // Use different fields based on report type
    if (aggregateByDay) {
      // Daywise mode - use "Days" fields
      strategyStats[strategy.strategy_name] = {
        overall_profit: strategySummary.OverallProfit || 0,
        num_trades: strategySummary.NumberOfDays || 0,
        avg_profit: strategySummary.AvgProfitPerDays || 0,
        win_rate: strategySummary.WinPer || 0,
        loss_rate: strategySummary.LossPer || 0,
        avg_win: strategySummary.AvgProfitOnWinningDays || 0,
        avg_loss: strategySummary.AvgLossOnLossingDays || 0,
        max_profit: strategySummary.MaxProfitInSingleDays || 0,
        max_loss: strategySummary.MaxLossInSingleDays || 0,
        max_drawdown: strategySummary.Max_Drawdown || 0,
        mdd_duration: strategySummary.Days_of_Max_Drawdown || '-',
        return_mdd: strategySummary.ReturnPerMaxDD || 0,
        reward_risk: strategySummary.RewardToRiskRatio || 0,
        expectancy: strategySummary.ExpectancyRatio || 0,
        max_win_streak: strategySummary.MaxWiningStreak || 0,
        max_loss_streak: strategySummary.MaxLossingStreak || 0,
        max_dd_days: strategySummary.MaxTradesInDrawdown || 0,
      };
    } else {
      // Tradewise mode - use "Trade" fields (singular form)
      strategyStats[strategy.strategy_name] = {
        overall_profit: strategySummary.OverallProfit || 0,
        num_trades: strategySummary.NumberOfTrades || 0,
        avg_profit: strategySummary.AvgProfitPerTrade || 0,
        win_rate: strategySummary.WinPer || 0,
        loss_rate: strategySummary.LossPer || 0,
        avg_win: strategySummary.AvgProfitOnWinningTrade || 0,
        avg_loss: strategySummary.AvgLossOnLossingTrade || 0,
        max_profit: strategySummary.MaxProfitInSingleTrade || 0,
        max_loss: strategySummary.MaxLossInSingleTrade || 0,
        max_drawdown: strategySummary.Max_Drawdown || 0,
        mdd_duration: strategySummary.Days_of_Max_Drawdown || '-',
        return_mdd: strategySummary.ReturnPerMaxDD || 0,
        reward_risk: strategySummary.RewardToRiskRatio || 0,
        expectancy: strategySummary.ExpectancyRatio || 0,
        max_win_streak: strategySummary.MaxWiningStreak || 0,
        max_loss_streak: strategySummary.MaxLossingStreak || 0,
        max_dd_days: strategySummary.MaxTradesInDrawdown || 0,
      };
    }
  });

  // Add aggregate column based on checkbox
  const aggregateSummary = aggregateByDay ? daywiseSummary : tradewiseSummary;
  const aggregateLabel = aggregateByDay ? 'Aggregate' : 'Aggregate(Trades)';
  
  if (aggregateByDay) {
    // Daywise aggregate
    strategyStats[aggregateLabel] = {
      overall_profit: aggregateSummary.OverallProfit || 0,
      num_trades: aggregateSummary.NumberOfDays || 0,
      avg_profit: aggregateSummary.AvgProfitPerDays || 0,
      win_rate: aggregateSummary.WinPer || 0,
      loss_rate: aggregateSummary.LossPer || 0,
      avg_win: aggregateSummary.AvgProfitOnWinningDays || 0,
      avg_loss: aggregateSummary.AvgLossOnLossingDays || 0,
      max_profit: aggregateSummary.MaxProfitInSingleDays || 0,
      max_loss: aggregateSummary.MaxLossInSingleDays || 0,
      max_drawdown: aggregateSummary.Max_Drawdown || 0,
      mdd_duration: aggregateSummary.Days_of_Max_Drawdown || '-',
      return_mdd: aggregateSummary.ReturnPerMaxDD || 0,
      reward_risk: aggregateSummary.RewardToRiskRatio || 0,
      expectancy: aggregateSummary.ExpectancyRatio || 0,
      max_win_streak: aggregateSummary.MaxWiningStreak || 0,
      max_loss_streak: aggregateSummary.MaxLossingStreak || 0,
      max_dd_days: aggregateSummary.MaxTradesInDrawdown || 0,
    };
  } else {
    // Tradewise aggregate (singular form)
    strategyStats[aggregateLabel] = {
      overall_profit: aggregateSummary.OverallProfit || 0,
      num_trades: aggregateSummary.NumberOfTrades || 0,
      avg_profit: aggregateSummary.AvgProfitPerTrade || 0,
      win_rate: aggregateSummary.WinPer || 0,
      loss_rate: aggregateSummary.LossPer || 0,
      avg_win: aggregateSummary.AvgProfitOnWinningTrade || 0,
      avg_loss: aggregateSummary.AvgLossOnLossingTrade || 0,
      max_profit: aggregateSummary.MaxProfitInSingleTrade || 0,
      max_loss: aggregateSummary.MaxLossInSingleTrade || 0,
      max_drawdown: aggregateSummary.Max_Drawdown || 0,
      mdd_duration: aggregateSummary.Days_of_Max_Drawdown || '-',
      return_mdd: aggregateSummary.ReturnPerMaxDD || 0,
      reward_risk: aggregateSummary.RewardToRiskRatio || 0,
      expectancy: aggregateSummary.ExpectancyRatio || 0,
      max_win_streak: aggregateSummary.MaxWiningStreak || 0,
      max_loss_streak: aggregateSummary.MaxLossingStreak || 0,
      max_dd_days: aggregateSummary.MaxTradesInDrawdown || 0,
    };
  }

  const strategyNames = Object.keys(strategyStats);

  console.log('📊 [PortfolioBacktestResults] Final data:', {
    yearlyReturns: yearlyReturns.length,
    strategyNames: strategyNames.length,
    allTrades: allTrades.length,
    daywiseSummary,
    strategyStats
  });

  return (
    <div className="space-y-6 mt-6">
      {/* Separator line */}
      <div className="border-t-4 border-blue-500 my-8"></div>

      {/* Show message if no trade data */}
      {allTrades.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ No Trade Data Available</h3>
          <p className="text-yellow-700">
            The backtest completed but no trades were executed. This usually means:
          </p>
          <ul className="list-disc list-inside text-yellow-700 mt-2 space-y-1">
            <li>No option chain data available for the selected date range</li>
            <li>The strategy entry conditions were not met during the backtest period</li>
            <li>There may be configuration issues with the strategy parameters</li>
          </ul>
          <p className="text-yellow-700 mt-3">
            <strong>Backend logs show:</strong> "No chain rows for leg 1 (option_type=call, dte=1)"
          </p>
          <p className="text-yellow-700 mt-2">
            Try adjusting your strategy settings or date range, or check if historical data is available for this period.
          </p>
        </div>
      )}

      {/* BACKTEST RESULT Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">BACKTEST RESULT</h2>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" id="include-previous" className="w-4 h-4" />
              <label htmlFor="include-previous" className="text-sm text-gray-600">
                Include data from previous regime
              </label>
            </div>
            <p className="text-xs text-orange-600">
              Following results are backtested results on historical data. These historical simulations do not represent actual trading and have not been executed in the live market. <button className="text-blue-600 hover:underline">Know more</button>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              📷 Snap a Screenshot
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              🔄 Reset Zoom
            </button>
          </div>
        </div>

        {/* Cumulative P/L Chart */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-sm font-medium">Cumulative P/L</span>
            </div>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
              Reset Zoom
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  stroke="#d1d5db"
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  stroke="#d1d5db"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Cumulative P/L']}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drawdown Chart */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="text-sm font-medium">Drawdown</span>
            </div>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
              Reset Zoom
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  stroke="#d1d5db"
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  stroke="#d1d5db"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Drawdown']}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="drawdown" 
                  stroke="#ef4444" 
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Year-wise Returns Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Year-wise Returns</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Year</th>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                  <th key={month} className="px-4 py-2 text-right font-medium text-gray-600">{month}</th>
                ))}
                <th className="px-4 py-2 text-right font-medium text-gray-600">Total</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Max Drawdown</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Days for MDD</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">%MDD (Yearly)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {yearlyReturns.map((yearData, idx) => {
                const year = yearData.year || yearData.period || `Year ${idx + 1}`;
                // Backend uses full month names: january, february, etc.
                const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 
                                   'july', 'august', 'september', 'october', 'november', 'december'];
                const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                
                return (
                  <tr key={year} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{year}</td>
                    {monthKeys.map((monthKey, mIdx) => {
                      const value = yearData[monthKey];
                      const numValue = value === null || value === undefined ? null : parseFloat(value);
                      return (
                        <td 
                          key={monthKey} 
                          className={`px-4 py-2 text-right ${
                            numValue === null ? 'text-gray-400' : 
                            numValue >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {numValue === null ? '-' : formatNumber(numValue, 0)}
                        </td>
                      );
                    })}
                    <td className={`px-4 py-2 text-right font-semibold ${
                      parseFloat(yearData.total || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatNumber(yearData.total || 0, 0)}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600">
                      {formatNumber(yearData.max_Drawdown || yearData.maxDrawdown || 0, 0)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 text-xs">
                      {yearData.days_of_Max_Drawdown || yearData.mddDays || '-'}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {formatNumber(yearData.yearly_Return_per_MaxDD || yearData.mddPercent || 0, 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Curve Fitting Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Curve Fitting Analysis: Monte Carlo Drawdown</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            Run 10000 Simulations
          </button>
        </div>
        <div className="flex items-center gap-4">
          <input type="range" min="1" max="99" defaultValue="1" className="flex-1" />
          <span className="text-2xl font-bold text-gray-900">99</span>
        </div>
      </div>

      {/* Brokerage, Taxes & Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Brokerage, Taxes & Analysis:</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <input type="checkbox" />
              Include Brokerage:
            </label>
            <input type="number" defaultValue="0" className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <input type="checkbox" />
              Taxes & charges:
            </label>
            <input type="number" defaultValue="23150.0" className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-2 block">Select VIX Range</label>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="From" defaultValue="0" className="w-full px-3 py-2 border border-gray-300 rounded" />
              <span>To</span>
              <input type="number" placeholder="To" defaultValue="150" className="w-full px-3 py-2 border border-gray-300 rounded" />
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap">
                Re-calculate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy-wise Report */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Strategy-wise Report</h3>
            <p className="text-xs text-gray-500">*The returns are annualized for calculations *</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={aggregateByDay}
              onChange={(e) => setAggregateByDay(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="select-none">Aggregate At End of Trading Day</span>
          </label>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Statistic</th>
                {strategyNames.map(strategy => (
                  <th key={strategy} className="px-4 py-3 text-right font-medium text-gray-600">
                    {strategy}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <StatisticRow 
                label="Overall Profit" 
                strategies={strategyNames} 
                data={strategyStats}
                field="overall_profit"
                isCurrency 
              />
              <StatisticRow 
                label={aggregateByDay ? "No. of Trades(Periods)" : "No. of Trades"} 
                strategies={strategyNames} 
                data={strategyStats}
                field="num_trades"
              />
              <StatisticRow 
                label={aggregateByDay ? "Average Profit per Period" : "Average Profit per Trade"} 
                strategies={strategyNames} 
                data={strategyStats}
                field="avg_profit"
                isCurrency 
              />
              <StatisticRow 
                label={aggregateByDay ? "Win %(Periods)" : "Win %"} 
                strategies={strategyNames} 
                data={strategyStats}
                field="win_rate"
              />
              <StatisticRow 
                label={aggregateByDay ? "Loss %(Periods)" : "Loss %"} 
                strategies={strategyNames} 
                data={strategyStats}
                field="loss_rate"
              />
              <StatisticRow 
                label={aggregateByDay ? "Average Profit on Winning Periods" : "Average Profit on Winning Trades"} 
                strategies={strategyNames} 
                data={strategyStats}
                field="avg_win"
                isCurrency 
              />
              <StatisticRow 
                label={aggregateByDay ? "Average Loss on Losing Periods" : "Average Loss on Losing Trades"} 
                strategies={strategyNames} 
                data={strategyStats}
                field="avg_loss"
                isCurrency 
              />
              <StatisticRow 
                label={aggregateByDay ? "Max Profit in Single Period" : "Max Profit in Single Trade"} 
                strategies={strategyNames} 
                data={strategyStats}
                field="max_profit"
                isCurrency 
              />
              <StatisticRow 
                label={aggregateByDay ? "Max Loss in Single Period" : "Max Loss in Single Trade"} 
                strategies={strategyNames} 
                data={strategyStats}
                field="max_loss"
                isCurrency 
              />
              <StatisticRow 
                label="Max Drawdown" 
                strategies={strategyNames} 
                data={strategyStats}
                field="max_drawdown"
                isCurrency 
              />
              <StatisticRow 
                label="Duration of Max Drawdown" 
                strategies={strategyNames} 
                data={strategyStats}
                field="mdd_duration"
              />
              <StatisticRow 
                label="Return/MaxDD" 
                strategies={strategyNames} 
                data={strategyStats}
                field="return_mdd"
              />
              <StatisticRow 
                label="Reward to Risk Ratio" 
                strategies={strategyNames} 
                data={strategyStats}
                field="reward_risk"
              />
              <StatisticRow 
                label="Expectancy Ratio" 
                strategies={strategyNames} 
                data={strategyStats}
                field="expectancy"
              />
              <StatisticRow 
                label="Max Win Streak (Periods)" 
                strategies={strategyNames} 
                data={strategyStats}
                field="max_win_streak"
              />
              <StatisticRow 
                label="Max Losing Streak (Periods)" 
                strategies={strategyNames} 
                data={strategyStats}
                field="max_loss_streak"
              />
              <StatisticRow 
                label="Max days in any drawdown(Periods)" 
                strategies={strategyNames} 
                data={strategyStats}
                field="max_dd_days"
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Correlation Matrix */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Correlation Matrix</h3>
        <p className="text-sm text-gray-600 mb-4">
          Identify strategy correlations to optimize diversification and manage portfolio risk.
        </p>
        <button className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
          Load
        </button>
      </div>

      {/* Full Report - Only show if there are actual trades with data */}
      {allTrades.length > 0 && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Full Report</h3>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Sort By:</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option>Entry date</option>
              <option>Exit date</option>
              <option>P/L</option>
            </select>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              Asc
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
              Desc
            </button>
            <span className="text-sm text-gray-600">
              Showing {indexOfFirstTrade + 1} - {Math.min(indexOfLastTrade, allTrades.length)} trades out of {allTrades.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Index</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Entry Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Entry Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Exit Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Exit Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Strike</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">B/S</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Entry Price</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Exit Price</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Vix</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentTrades.map((trade, idx) => {
                // Daywise aggregation - show parent row + child leg rows
                if (aggregateByDay) {
                  const pnl = parseFloat(trade.total_pnl || 0);
                  const rows = [];
                  
                  // Parent row for the day (aggregated summary)
                  rows.push(
                    <tr key={`${indexOfFirstTrade + idx}-parent`} className="hover:bg-gray-50 bg-gray-50 font-medium">
                      <td className="px-4 py-3 text-gray-900">{indexOfFirstTrade + idx + 1}</td>
                      <td className="px-4 py-3 text-gray-900">{trade.entry_date || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{trade.entry_time || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{trade.exit_date || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{trade.exit_time || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">-</td>
                      <td className="px-4 py-3 text-right text-gray-900">-</td>
                      <td className="px-4 py-3 text-gray-900">-</td>
                      <td className="px-4 py-3 text-right text-gray-900">-</td>
                      <td className="px-4 py-3 text-right text-gray-900">-</td>
                      <td className="px-4 py-3 text-right text-gray-900">-</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatNumber(trade.vix, 2)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatNumber(pnl, 2)}
                      </td>
                    </tr>
                  );
                  
                  // Child rows for each leg
                  trade.legs && trade.legs.forEach((leg, legIdx) => {
                    const legPnl = parseFloat(leg.pnl || 0);
                    rows.push(
                      <tr key={`${indexOfFirstTrade + idx}-leg-${legIdx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 text-sm pl-8">{indexOfFirstTrade + idx + 1}.{legIdx + 1}</td>
                        <td className="px-4 py-3 text-gray-700 text-sm">{leg.entry_date || '-'}</td>
                        <td className="px-4 py-3 text-gray-700 text-sm">{leg.entry_time || '-'}</td>
                        <td className="px-4 py-3 text-gray-700 text-sm">{leg.exit_date || '-'}</td>
                        <td className="px-4 py-3 text-gray-700 text-sm">{leg.exit_time || '-'}</td>
                        <td className="px-4 py-3 text-gray-700 text-sm uppercase">{leg.type || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-700 text-sm">{leg.strike || '-'}</td>
                        <td className="px-4 py-3 text-gray-700 text-sm">{leg.side || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-700 text-sm">{leg.qty || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-700 text-sm">{formatNumber(leg.entry_price, 2)}</td>
                        <td className="px-4 py-3 text-right text-gray-700 text-sm">{formatNumber(leg.exit_price, 2)}</td>
                        <td className="px-4 py-3 text-right text-gray-700 text-sm">{formatNumber(leg.vix, 2)}</td>
                        <td className={`px-4 py-3 text-right text-sm ${legPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatNumber(legPnl, 2)}
                        </td>
                      </tr>
                    );
                  });
                  
                  return rows;
                } else {
                  // Tradewise - show individual legs
                  const pnl = parseFloat(trade.pnl || 0);
                  return (
                    <tr key={`${indexOfFirstTrade + idx}-${trade.leg_number}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{indexOfFirstTrade + idx + 1}</td>
                      <td className="px-4 py-3 text-gray-900">{trade.entry_date || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{trade.entry_time || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{trade.exit_date || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{trade.exit_time || '-'}</td>
                      <td className="px-4 py-3 text-gray-900 uppercase">{trade.type || '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{trade.strike || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{trade.side || '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{trade.qty || '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatNumber(trade.entry_price, 2)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatNumber(trade.exit_price, 2)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatNumber(trade.vix, 2)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatNumber(pnl, 2)}
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button 
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            «
          </button>
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            ‹
          </button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
            if (pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1 border rounded text-sm ${
                  currentPage === pageNum 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            ›
          </button>
          <button 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            »
          </button>
        </div>

        <div className="mt-4">
          <button className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
            Download Report
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

// Helper component for strategy-wise report rows
const StatisticRow = ({ label, strategies, data, field, isCurrency = false }) => {
  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    
    if (isCurrency) {
      return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-left font-medium text-gray-700">{label}</td>
      {strategies.map(strategy => {
        const value = data[strategy]?.[field] || 0;
        const numValue = parseFloat(value);
        const colorClass = numValue >= 0 ? 'text-green-600' : 'text-red-600';
        
        return (
          <td key={strategy} className={`px-4 py-3 text-right ${isCurrency || label.includes('Profit') || label.includes('Loss') ? colorClass : 'text-gray-900'}`}>
            {formatValue(value)}
          </td>
        );
      })}
    </tr>
  );
};

export default PortfolioBacktestResults;
