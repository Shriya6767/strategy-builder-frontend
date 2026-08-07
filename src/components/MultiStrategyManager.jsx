import React, { useState, useEffect } from 'react';
import { Plus, Play, Square, Edit2, Trash2, Clock, TrendingUp, TrendingDown, Activity, AlertCircle, RefreshCw, Copy } from 'lucide-react';

const MultiStrategyManager = () => {
  const [strategies, setStrategies] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchStatus();
    
    const interval = setInterval(() => {
      if (autoRefresh && isRunning) {
        fetchStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, isRunning]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/live/multi-strategy-status');
      const data = await response.json();
      
      if (data.status === 'active') {
        setIsRunning(data.is_running);
        setStatus(data);
      } else {
        setIsRunning(false);
        setStatus(null);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const handleAddStrategy = () => {
    setEditingStrategy(null);
    setShowAddModal(true);
  };

  const handleEditStrategy = (index) => {
    setEditingStrategy({ ...strategies[index], index });
    setShowAddModal(true);
  };

  const handleDuplicateStrategy = (index) => {
    const strategy = { ...strategies[index] };
    strategy.name = `${strategy.name} (Copy)`;
    strategy.id = `strategy_${Date.now()}`;
    setStrategies([...strategies, strategy]);
  };

  const handleDeleteStrategy = (index) => {
    if (window.confirm(`Delete "${strategies[index].name}"?`)) {
      setStrategies(strategies.filter((_, i) => i !== index));
    }
  };

  const handleSaveStrategy = (strategy) => {
    if (editingStrategy !== null && editingStrategy.index !== undefined) {
      // Edit existing
      const updated = [...strategies];
      updated[editingStrategy.index] = strategy;
      setStrategies(updated);
    } else {
      // Add new
      setStrategies([...strategies, strategy]);
    }
    setShowAddModal(false);
    setEditingStrategy(null);
  };

  const handleStartAll = async () => {
    if (strategies.length === 0) {
      alert('Please add at least one strategy first!');
      return;
    }

    if (!window.confirm(`Start ${strategies.length} strateg${strategies.length > 1 ? 'ies' : 'y'}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/live/start-multi-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategies })
      });

      const data = await response.json();

      if (data.status === 'success') {
        alert(`✅ Started ${data.strategies_count} strateg${data.strategies_count > 1 ? 'ies' : 'y'}!`);
        setIsRunning(true);
        fetchStatus();
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleStopAll = async () => {
    if (!window.confirm('Stop all strategies and close all positions?')) {
      return;
    }

    try {
      const response = await fetch('/api/live/stop-multi-strategy', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.status === 'success') {
        alert('✅ All strategies stopped!');
        setIsRunning(false);
        setStatus(null);
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-600" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Multi-Strategy Manager</h2>
              <p className="text-sm text-gray-500 mt-1">Run multiple straddles with different parameters</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isRunning && (
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
              >
                <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </button>
            )}

            {isRunning ? (
              <button
                onClick={handleStopAll}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Square size={18} />
                Stop All Strategies
              </button>
            ) : (
              <button
                onClick={handleStartAll}
                disabled={strategies.length === 0}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Play size={18} />
                Start All Strategies
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Summary */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Strategies</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{status.total_strategies}</p>
              </div>
              <Activity className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Strategies</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {status.strategies?.filter(s => s.is_active).length || 0}
                </p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Open Positions</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {status.strategies?.reduce((sum, s) => sum + s.positions_count, 0) || 0}
                </p>
              </div>
              <TrendingDown className="text-blue-600" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!isRunning && strategies.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-blue-600" size={20} />
            <p className="text-blue-800 font-medium">Get Started</p>
          </div>
          <p className="text-blue-700 text-sm mb-2">
            Add multiple straddles with different entry/exit times and parameters:
          </p>
          <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside ml-2">
            <li>Straddle 1: Entry 14:35, Exit 19:55, SL 25%, TP 30%</li>
            <li>Straddle 2: Entry 15:05, Exit 15:35, SL 50%, TP 20%</li>
            <li>Straddle 3: Entry 16:05, Exit 20:00, SL 30%, TP 40%</li>
          </ul>
          <p className="text-blue-600 text-xs mt-3">
            💡 Each strategy runs independently with its own monitoring and reporting!
          </p>
        </div>
      )}

      {/* Strategies List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Configured Strategies ({strategies.length})</h3>
          <button
            onClick={handleAddStrategy}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Strategy
          </button>
        </div>

        {strategies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Activity size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg">No strategies configured</p>
            <p className="text-sm mt-1">Click "Add Strategy" to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy, index) => (
              <StrategyCard
                key={strategy.id || index}
                strategy={strategy}
                index={index}
                isRunning={isRunning}
                status={status?.strategies?.find(s => s.id === strategy.id)}
                onEdit={() => handleEditStrategy(index)}
                onDuplicate={() => handleDuplicateStrategy(index)}
                onDelete={() => handleDeleteStrategy(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <StrategyModal
          strategy={editingStrategy}
          onSave={handleSaveStrategy}
          onClose={() => {
            setShowAddModal(false);
            setEditingStrategy(null);
          }}
        />
      )}
    </div>
  );
};

const StrategyCard = ({ strategy, index, isRunning, status, onEdit, onDuplicate, onDelete }) => {
  return (
    <div className={`border rounded-lg p-4 ${status?.is_active ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-bold text-gray-800">{strategy.name}</h4>
            {status && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                status.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {status.entry_executed ? 'ENTERED' : 'WAITING'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Entry Time</p>
              <p className="font-medium text-gray-800 flex items-center gap-1">
                <Clock size={14} />
                {strategy.entry_time}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Exit Time</p>
              <p className="font-medium text-gray-800 flex items-center gap-1">
                <Clock size={14} />
                {strategy.exit_time}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Stop Loss</p>
              <p className="font-medium text-red-600">{strategy.stop_loss}%</p>
            </div>
            <div>
              <p className="text-gray-500">Target Profit</p>
              <p className="font-medium text-green-600">{strategy.target_profit}%</p>
            </div>
          </div>

          {strategy.momentum?.enabled && (
            <div className="mt-2 text-sm">
              <p className="text-gray-500">Momentum</p>
              <p className="font-medium text-blue-600">
                {strategy.momentum.value}% {strategy.momentum.direction}
              </p>
            </div>
          )}

          {status && status.positions_count > 0 && (
            <div className="mt-3 text-sm">
              <p className="text-gray-500">Open Positions: <span className="font-medium text-gray-800">{status.positions_count}</span></p>
              <div className="flex flex-wrap gap-2 mt-1">
                {status.open_positions?.map((pos, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {pos}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onDuplicate}
            disabled={isRunning}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Duplicate"
          >
            <Copy size={18} />
          </button>
          <button
            onClick={onEdit}
            disabled={isRunning}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Edit"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={onDelete}
            disabled={isRunning}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const StrategyModal = ({ strategy, onSave, onClose }) => {
  const [formData, setFormData] = useState(
    strategy || {
      id: `strategy_${Date.now()}`,
      name: `Straddle ${Date.now()}`,
      entry_time: '14:30',
      exit_time: '20:00',
      stop_loss: 25,
      target_profit: 30,
      momentum: {
        enabled: false,
        value: 5,
        direction: 'UP'
      },
      legs: [
        { option_type: 'CALL', position: 'SELL', lots: 1, strike_type: 'atm' },
        { option_type: 'PUT', position: 'SELL', lots: 1, strike_type: 'atm' }
      ]
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">
            {strategy ? 'Edit Strategy' : 'Add New Strategy'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Strategy Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strategy Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Entry & Exit Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entry Time
              </label>
              <input
                type="time"
                value={formData.entry_time}
                onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exit Time
              </label>
              <input
                type="time"
                value={formData.exit_time}
                onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Stop Loss & Target Profit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stop Loss (%)
              </label>
              <input
                type="number"
                value={formData.stop_loss}
                onChange={(e) => setFormData({ ...formData, stop_loss: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="100"
                step="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Profit (%)
              </label>
              <input
                type="number"
                value={formData.target_profit}
                onChange={(e) => setFormData({ ...formData, target_profit: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="1000"
                step="1"
                required
              />
            </div>
          </div>

          {/* Momentum */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                Momentum Entry Filter
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.momentum.enabled}
                  onChange={(e) => setFormData({
                    ...formData,
                    momentum: { ...formData.momentum, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formData.momentum.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Momentum (%)
                  </label>
                  <input
                    type="number"
                    value={formData.momentum.value}
                    onChange={(e) => setFormData({
                      ...formData,
                      momentum: { ...formData.momentum, value: parseFloat(e.target.value) }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Direction
                  </label>
                  <select
                    value={formData.momentum.direction}
                    onChange={(e) => setFormData({
                      ...formData,
                      momentum: { ...formData.momentum, direction: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="UP">UP</option>
                    <option value="DOWN">DOWN</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {strategy ? 'Save Changes' : 'Add Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MultiStrategyManager;
