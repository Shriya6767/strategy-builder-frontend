import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, TrendingUp, TrendingDown, Clock, Target, AlertTriangle, CheckCircle, XCircle, Pause, Play, Settings, Download, RefreshCw, ChevronDown, ChevronUp, DollarSign, Percent, Calendar, BarChart3, TrendingUp as TrendUp, TrendingDown as TrendDown } from 'lucide-react';
import TWSStylePositionsTable from './TWSStylePositionsTable';
import logger from '../utils/logger';

const AutoTradingMonitor = ({ onBack }) => {
  const [status, setStatus] = useState(null);
  const [positionsData, setPositionsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityLog, setActivityLog] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedPositions, setExpandedPositions] = useState(new Set());

  useEffect(() => {
    fetchStatus();
    fetchPositionsData();
    fetchPerformanceMetrics();
    
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchStatus();
        fetchPositionsData();
        fetchPerformanceMetrics();
      }
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/live/enhanced-auto-trading-status');
      const data = await response.json();
      
      if (data.status === 'success') {
        setStatus(data.data);
        setLoading(false);
      }
    } catch (error) {
      logger.error('Failed to fetch status:', error);
      addToLog(`❌ Failed to fetch status: ${error.message}`, 'error');
    }
  };

  const fetchPositionsData = async () => {
    try {
      const response = await fetch('/api/live/enhanced-positions-with-pnl');
      const data = await response.json();
      
      if (data.status === 'success') {
        setPositionsData(data.data);
        
        if (data.data.positions && data.data.positions.length > 0) {
          data.data.positions.forEach(pos => {
            checkPositionAlerts(pos);
            
            const pnlText = pos.pnl_pct >= 0 ? `+${pos.pnl_pct.toFixed(1)}%` : `${pos.pnl_pct.toFixed(1)}%`;
            const emoji = pos.pnl_pct >= 0 ? '📈' : '📉';
            addToLog(`${emoji} ${pos.symbol || 'Position'} P&L: ${pnlText} (${pos.pnl_amount?.toFixed(2) || '0.00'})`, pos.pnl_pct >= 0 ? 'profit' : 'loss');
          });
        }
      }
    } catch (error) {
      logger.error('Failed to fetch positions data:', error);
      addToLog(`❌ Failed to fetch positions: ${error.message}`, 'error');
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/live/enhanced-strategy-performance');
      const data = await response.json();
      
      if (data.status === 'success') {
        setPerformanceMetrics(data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch performance metrics:', error);
    }
  };

  const checkPositionAlerts = (position) => {
    const pnl = position.pnl_pct || 0;
    
    if (Math.abs(pnl) > 20) {
      const alertType = pnl > 0 ? 'success' : 'danger';
      const message = `${position.symbol || 'Position'} ${pnl > 0 ? 'gained' : 'lost'} ${Math.abs(pnl).toFixed(1)}%`;
      
      addAlert(message, alertType);
      
      if (soundEnabled) {
        playAlertSound(alertType);
      }
    }
  };

  const addAlert = (message, type = 'info') => {
    const alert = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 10000);
  };

  const playAlertSound = (type) => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = type === 'success' ? 800 : type === 'danger' ? 400 : 600;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      logger.error('Could not play alert sound:', error);
    }
  };

  const addToLog = (message, type = 'info') => {
    const logEntry = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setActivityLog(prev => {
      const newLog = [logEntry, ...prev].slice(0, 100); // Keep last 100 entries
      return newLog;
    });
  };

  const handleStopTrading = async () => {
    if (!window.confirm('Are you sure you want to stop auto trading? All positions will be closed.')) {
      return;
    }

    try {
      const response = await fetch('/api/live/stop-auto-trading', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        addAlert('Auto trading stopped successfully', 'success');
        addToLog('🛑 Auto trading stopped by user', 'info');
        onBack();
      } else {
        addAlert(`Failed to stop: ${data.message}`, 'danger');
      }
    } catch (error) {
      addAlert(`Error: ${error.message}`, 'danger');
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await fetch('/api/live/enhanced-new-reports');
      const data = await response.json();
      
      if (data.status === 'success' && data.reports.length > 0) {
        const latestReport = data.reports[0];
        const downloadUrl = `/api/live/download-report/${latestReport}`;
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = latestReport;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addAlert('Report downloaded successfully', 'success');
      } else {
        addAlert('No reports available', 'warning');
      }
    } catch (error) {
      addAlert(`Download failed: ${error.message}`, 'danger');
    }
  };

  const getStatusColor = (stage) => {
    switch (stage) {
      case 'ACTIVE':
      case 'WAITING_MOMENTUM':
        return 'text-green-600 bg-green-50';
      case 'IDLE':
        return 'text-yellow-600 bg-yellow-50';
      case 'COMPLETED':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const getStatusIcon = (stage) => {
    switch (stage) {
      case 'ACTIVE':
        return <Activity className="text-green-600" size={20} />;
      case 'WAITING_MOMENTUM':
        return <Clock className="text-yellow-600" size={20} />;
      case 'COMPLETED':
        return <CheckCircle className="text-gray-600" size={20} />;
      default:
        return <Activity className="text-blue-600" size={20} />;
    }
  };

  const calculateTimeToExpiry = (expiryDate) => {
    if (!expiryDate) return 'N/A';
    
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'EXPIRED';
      if (diffDays === 0) return 'TODAY';
      if (diffDays === 1) return '1 DAY';
      return `${diffDays} DAYS`;
    } catch (error) {
      return 'N/A';
    }
  };

  const calculateBreakeven = (position) => {
    if (!position) return { upper: 'N/A', lower: 'N/A' };
    
    try {
      const strike = parseFloat(position.strike || position.strike_price || 0);
      const premium = parseFloat(position.entry_price || 0);
      
      if (strike === 0 || premium === 0) return { upper: 'N/A', lower: 'N/A' };
      
      const upper = (strike + premium).toFixed(2);
      const lower = (strike - premium).toFixed(2);
      
      return { upper, lower };
    } catch (error) {
      return { upper: 'N/A', lower: 'N/A' };
    }
  };

  const calculateRiskReward = (position) => {
    if (!position) return { risk: 'N/A', reward: 'N/A', ratio: 'N/A' };
    
    try {
      const entryPrice = parseFloat(position.entry_price || 0);
      const currentPrice = parseFloat(position.current_price || 0);
      const quantity = parseInt(position.quantity || 1);
      const multiplier = parseInt(position.multiplier || 100);
      
      if (entryPrice === 0) return { risk: 'N/A', reward: 'N/A', ratio: 'N/A' };
      
      const risk = Math.abs(entryPrice * quantity * multiplier);
      
      const currentPnL = (currentPrice - entryPrice) * quantity * multiplier;
      const reward = Math.max(currentPnL, 0);
      
      const ratio = reward > 0 ? (reward / risk).toFixed(2) : '0.00';
      
      return {
        risk: risk.toFixed(2),
        reward: reward.toFixed(2),
        ratio: ratio
      };
    } catch (error) {
      return { risk: 'N/A', reward: 'N/A', ratio: 'N/A' };
    }
  };

  const getPositionHealth = (position) => {
    if (!position) return { status: 'unknown', color: 'gray', message: 'Unknown' };
    
    try {
      const pnlPct = parseFloat(position.pnl_pct || 0);
      
      if (pnlPct >= 20) return { status: 'excellent', color: 'green', message: 'Excellent' };
      if (pnlPct >= 10) return { status: 'good', color: 'green', message: 'Good' };
      if (pnlPct >= 0) return { status: 'neutral', color: 'yellow', message: 'Neutral' };
      if (pnlPct >= -10) return { status: 'caution', color: 'orange', message: 'Caution' };
      if (pnlPct >= -25) return { status: 'warning', color: 'red', message: 'Warning' };
      return { status: 'critical', color: 'red', message: 'Critical' };
    } catch (error) {
      return { status: 'unknown', color: 'gray', message: 'Unknown' };
    }
  };

  const togglePositionExpansion = (index) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPositions(newExpanded);
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0.00%';
    return `${value >= 0 ? '+' : ''}${parseFloat(value).toFixed(2)}%`;
  };

  const safeGet = (obj, path, defaultValue = 'N/A') => {
    try {
      return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Auto Trading Monitor...</p>
        </div>
      </div>
    );
  }

  if (!status || !status.is_running) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-full max-w-md p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 text-yellow-600" size={48} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Auto Trading Not Active</h2>
            <p className="text-gray-600 mb-4">No auto trading session is currently running.</p>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalPositions = positionsData?.positions?.length || 0;
  const totalPnL = positionsData?.total_pnl || 0;
  const totalPnLPct = positionsData?.total_pnl_pct || 0;

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border-b w-full`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <Activity className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold">Auto Trading Monitor</h1>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Real-time strategy monitoring & control
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${status?.is_running ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-sm font-medium ${status?.is_running ? 'text-green-600' : 'text-red-600'}`}>
                  {status?.is_running ? 'ACTIVE' : 'STOPPED'}
                </span>
              </div>

              {/* Controls */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              >
                <RefreshCw className={`h-5 w-5 ${autoRefresh ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleDownloadReport}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Report</span>
              </button>

              <button
                onClick={handleStopTrading}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                <span>Stop</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full p-6">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Open Positions</span>
              <Activity className="text-blue-600" size={20} />
            </div>
            <div className="text-2xl font-bold">{totalPositions}</div>
            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
              Active trades
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total P&L</span>
              {totalPnL >= 0 ? (
                <TrendingUp className="text-green-600" size={20} />
              ) : (
                <TrendingDown className="text-red-600" size={20} />
              )}
            </div>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </div>
            <div className={`text-xs mt-1 ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Strategy</span>
              <Target className="text-purple-600" size={20} />
            </div>
            <div className="text-lg font-bold">
              {status.strategy_type || 'Sequential'}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>Active monitoring</div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Session Time</span>
              <Clock className="text-orange-600" size={20} />
            </div>
            <div className="text-lg font-bold">
              {new Date().toLocaleTimeString()}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>Live updates</div>
          </div>
        </div>

        {/* Open Positions */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border mb-6`}>
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2">
              📈 Trading Status
              <span className={`text-sm font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                ({totalPositions} active positions)
              </span>
            </h2>
          </div>

          <div className="p-6">
            {/* Strategy Monitoring Info */}
            {status && status.monitoring_pairs && status.monitoring_pairs.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                  👁️ Strategy Monitoring
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {status.monitoring_pairs.map((pair, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{pair.pair_id}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(pair.stage)}`}>
                          {pair.stage}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>👁️ Monitor: <span className="font-medium">{pair.main_type}</span></div>
                        <div>💰 Enter: <span className="font-medium">{pair.reentry_type}</span></div>
                        <div>⏰ Time: <span className="font-medium">{pair.entry_time}</span></div>
                        {pair.momentum_value > 0 && (
                          <div>📈 Momentum: <span className="font-medium">{pair.momentum_value}%</span></div>
                        )}
                        {pair.target_profit > 0 && (
                          <div>🎯 Target: <span className="font-medium">{pair.target_profit}%</span></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Positions */}
            {positionsData && positionsData.positions && positionsData.positions.length > 0 ? (
              <div>
                <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                  💼 Active Positions
                </h3>
                <TWSStylePositionsTable 
                  positions={positionsData.positions} 
                  darkMode={darkMode}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                {status && status.monitoring_pairs && status.monitoring_pairs.length > 0 ? (
                  <div>
                    <Activity className={`mx-auto mb-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={48} />
                    <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Strategy Active - Monitoring for Entry Signals
                    </p>
                    <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {status.monitoring_pairs.length} straddle{status.monitoring_pairs.length !== 1 ? 's' : ''} being monitored for momentum conditions
                    </p>
                  </div>
                ) : (
                  <div>
                    <Activity className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} size={48} />
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No active positions or monitoring</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border`}>
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2">
              📊 Activity Log
              <span className={`text-sm font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                (Last {activityLog.length} entries)
              </span>
            </h2>
          </div>

          <div className="p-6">
            {activityLog.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activityLog.map((log) => (
                  <div
                    key={log.id}
                    className={`text-sm p-2 rounded border-l-4 ${
                      log.type === 'profit' ? 'border-green-500 bg-green-50 text-green-800' :
                      log.type === 'loss' ? 'border-red-500 bg-red-50 text-red-800' :
                      log.type === 'error' ? 'border-red-500 bg-red-50 text-red-800' :
                      'border-blue-500 bg-blue-50 text-blue-800'
                    }`}
                  >
                    <span className="text-xs opacity-75">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} size={48} />
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No activity yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoTradingMonitor;