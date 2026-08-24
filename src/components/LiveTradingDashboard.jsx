import React, { useState, useEffect } from 'react';
import { Play, Square, Activity, DollarSign, TrendingUp, TrendingDown, AlertCircle, RefreshCw, Monitor } from 'lucide-react';
import logger from '../utils/logger';

const LiveTradingDashboard = ({ strategyConfig, onShowMonitor }) => {
  const [status, setStatus] = useState({
    is_configured: false,
    is_active: false,
    is_connected: false,
    positions: [],
    daily_pnl: 0
  });
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchStatus();
    
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/live/status');
      const data = await response.json();
      
      if (data.status === 'success') {
        setStatus(data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch status:', error);
    }
  };

  const handleStart = async () => {
    if (!status.is_configured) {
      alert('Please configure broker credentials first in Settings');
      return;
    }

    if (!strategyConfig || Object.keys(strategyConfig).length === 0) {
      alert('Please configure your strategy first in the Strategy Builder tab.\n\nNote: Date selection is only for backtesting - it will be ignored for live trading.');
      return;
    }

    setIsStarting(true);

    try {
      const connectResponse = await fetch('/api/live/start', {
        method: 'POST'
      });

      const connectData = await connectResponse.json();

      if (connectData.status !== 'success') {
        alert(`Failed to connect: ${connectData.message}`);
        setIsStarting(false);
        return;
      }

      const autoTradeResponse = await fetch('/api/live/start-auto-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyConfig)
      });

      const autoTradeData = await autoTradeResponse.json();

      if (autoTradeData.status === 'success') {
        alert('Live trading started successfully with your strategy!');
        fetchStatus();
      } else {
        alert(`Failed to start auto-trading: ${autoTradeData.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    if (!window.confirm('Are you sure you want to stop live trading? This will stop auto-trading and close all positions.')) {
      return;
    }

    setIsStopping(true);

    try {
      const stopAutoResponse = await fetch('/api/live/stop-auto-trading', {
        method: 'POST'
      });

      const stopAutoData = await stopAutoResponse.json();
      
      const stopResponse = await fetch('/api/live/stop', {
        method: 'POST'
      });

      const stopData = await stopResponse.json();

      if (stopData.status === 'success') {
        alert('Live trading stopped');
        fetchStatus();
      } else {
        alert(`Failed to stop: ${stopData.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsStopping(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-600" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Live Trading Dashboard</h2>
              <p className="text-sm text-gray-500 mt-1">Monitor your live trading activity</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
            >
              <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>

            {/* Auto Trading Monitor Button - Show when trading is active */}
            {status.is_active && (
              <button
                onClick={onShowMonitor}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Monitor size={18} />
                Trading Monitor
              </button>
            )}

            {status.is_active ? (
              <button
                onClick={handleStop}
                disabled={isStopping}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Square size={18} />
                {isStopping ? 'Stopping...' : 'Stop Trading'}
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={isStarting || !status.is_configured}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Play size={18} />
                {isStarting ? 'Starting...' : 'Start Trading'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Configuration Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Configuration</p>
              <p className={`text-lg font-bold mt-1 ${status.is_configured ? 'text-green-600' : 'text-red-600'}`}>
                {status.is_configured ? 'Configured' : 'Not Configured'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status.is_configured ? 'bg-green-100' : 'bg-red-100'}`}>
              {status.is_configured ? (
                <Activity className="text-green-600" size={24} />
              ) : (
                <AlertCircle className="text-red-600" size={24} />
              )}
            </div>
          </div>
        </div>

        {/* Trading Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Trading Status</p>
              <p className={`text-lg font-bold mt-1 ${status.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                {status.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
              {status.is_active ? (
                <Play className="text-green-600" size={24} />
              ) : (
                <Square className="text-gray-600" size={24} />
              )}
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Connection</p>
              <p className={`text-lg font-bold mt-1 ${status.is_connected ? 'text-green-600' : 'text-gray-600'}`}>
                {status.is_connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${status.is_connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          </div>
        </div>

        {/* Daily P&L */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Daily P&L</p>
              <p className={`text-lg font-bold mt-1 ${status.daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(status.daily_pnl)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status.daily_pnl >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {status.daily_pnl >= 0 ? (
                <TrendingUp className="text-green-600" size={24} />
              ) : (
                <TrendingDown className="text-red-600" size={24} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning if not configured */}
      {!status.is_configured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-yellow-600" size={20} />
            <p className="text-yellow-800">
              Please configure your broker credentials in the Settings tab before starting live trading.
            </p>
          </div>
        </div>
      )}

      {/* Info about strategy configuration */}
      {status.is_configured && (!strategyConfig || Object.keys(strategyConfig).length === 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-blue-600" size={20} />
            <p className="text-blue-800 font-medium">Strategy Configuration Required</p>
          </div>
          <p className="text-blue-700 text-sm">
            Before starting live trading, please configure your strategy in the <strong>Strategy Builder</strong> tab.
          </p>
          <p className="text-blue-600 text-xs mt-2">
            💡 Note: Date selection in Strategy Builder is only for backtesting. For live trading, it will be ignored and trades will execute in real-time.
          </p>
        </div>
      )}

      {/* Strategy configured confirmation */}
      {strategyConfig && Object.keys(strategyConfig).length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-green-600" size={20} />
            <p className="text-green-800 font-medium">Strategy Configured ✓</p>
          </div>
          <p className="text-green-700 text-sm">
            Strategy Type: <strong>{strategyConfig.strategy_type?.toUpperCase() || 'INTRADAY'}</strong>
          </p>
          <p className="text-green-700 text-sm">
            Entry Time: <strong>{strategyConfig.entry_time || 'N/A'}</strong> | 
            Exit Time: <strong>{strategyConfig.exit_time || 'N/A'}</strong>
          </p>
          <p className="text-green-700 text-sm">
            Legs: <strong>{strategyConfig.legs?.length || 0}</strong> | 
            Capital: <strong>${strategyConfig.initial_capital?.toLocaleString() || 'N/A'}</strong>
          </p>
        </div>
      )}

      {/* Positions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Open Positions</h3>
        
        {status.positions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg">No open positions</p>
            <p className="text-sm mt-1">Positions will appear here when you start trading</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Symbol</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Entry Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Current Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">P&L</th>
                </tr>
              </thead>
              <tbody>
                {status.positions.map((position, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{position.symbol}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        position.type === 'LONG' ? 'bg-green-100 text-green-800' : 
                        position.type === 'SHORT' ? 'bg-red-100 text-red-800' :
                        position.type === 'CALL' ? 'bg-blue-100 text-blue-800' : 
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {position.type === 'LONG' ? 'BUY (LONG)' : 
                         position.type === 'SHORT' ? 'SELL (SHORT)' : 
                         position.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800">{position.quantity}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800">
                      {position.avg_cost ? formatCurrency(position.avg_cost) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800">
                      {position.current_price ? formatCurrency(position.current_price) : 'Loading...'}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${
                      position.pnl && position.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {position.pnl ? formatCurrency(position.pnl) : 'Calculating...'}
                      {position.pnl_pct && (
                        <span className="text-xs ml-1">
                          ({position.pnl_pct >= 0 ? '+' : ''}{position.pnl_pct.toFixed(2)}%)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Live Trading Information:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Dashboard auto-refreshes every 5 seconds when enabled</li>
          <li>All positions and P&L are updated in real-time</li>
          <li>Start with Paper Trading mode to test without risk</li>
          <li>Monitor your positions and daily P&L carefully</li>
          <li>Stop trading will close all open positions</li>
        </ul>
      </div>
    </div>
  );
};

export default LiveTradingDashboard;
