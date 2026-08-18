import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { API_URL } from '../services/api';
import { usePortfolio } from '../context/PortfolioContext';

const CreatePortfolioModal = ({ isOpen, onClose, onCreatePortfolio }) => {
  const { addPortfolio } = usePortfolio();
  const [portfolioName, setPortfolioName] = useState('');
  const [activeTab, setActiveTab] = useState('My Strategies');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStrategies, setSelectedStrategies] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch strategies from backend when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchStrategies();
    }
  }, [isOpen]);

  const fetchStrategies = async () => {
    setLoading(true); 
    try {
      // ✅ Load strategies from localStorage with correct key
      const savedStrategies = localStorage.getItem('saved_strategies_cards');
      
      if (savedStrategies) {
        const strategies = JSON.parse(savedStrategies);
        console.log('✅ Loaded strategies from localStorage (saved_strategies_cards):', strategies);
        setStrategies(Array.isArray(strategies) ? strategies : []);
      } else {
        console.log('ℹ️ No strategies found in localStorage (saved_strategies_cards)');
        setStrategies([]);
      }
    } catch (error) {
      console.error('❌ Error loading strategies from localStorage:', error);
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStrategies = strategies.filter(strategy =>
    (strategy.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedStrategies.length === filteredStrategies.length) {
      setSelectedStrategies([]);
    } else {
      setSelectedStrategies(filteredStrategies.map(s => s.id));
    }
  };

  const handleToggleStrategy = (strategyId) => {
    setSelectedStrategies(prev =>
      prev.includes(strategyId)
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId]
    );
  };

  const handleCreatePortfolio = async () => {
    if (!portfolioName.trim()) {
      alert('Please enter a portfolio name');
      return;
    }
    if (selectedStrategies.length === 0) {
      alert('Please select at least one strategy');
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare the payload in the format the API expects
      const payload = {
        portfolio_name: portfolioName.trim(),
        strategies: selectedStrategies.map(strategyId => {
          const strategy = strategies.find(s => s.id === strategyId);
          return {
            strategy_id: strategyId,
            strategy_name: strategy?.name || '',
            version: strategy?.version || 1  // Default to version 1 if not present
          };
        })
      };

      console.log('📤 Creating portfolio with payload:', payload);

      const response = await fetch(`${API_URL}/save-portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 API Response Status:', response.status, response.statusText);

      const data = await response.json();
      
      console.log('📥 API Response Data:', data);
      console.log('📥 data.status:', data.status);
      console.log('📥 data.portfolio_id:', data.portfolio_id);
      console.log('📥 response.ok:', response.ok);

      // ✅ Fix: Check for portfolio_id instead of status field
      if (response.ok && data.portfolio_id) {
        console.log('✅ API Response Success:', data);
        
        // Create portfolio object with proper structure - save COMPLETE strategy data
        const newPortfolio = {
          portfolio_id: data.portfolio_id,
          portfolio_name: portfolioName.trim(),
          strategies: selectedStrategies.map(strategyId => {
            const strategy = strategies.find(s => s.id === strategyId);
            // Save complete strategy configuration
            return {
              id: strategy?.id || strategyId,
              strategy_id: strategyId,
              strategy_name: strategy?.name || '',
              version: strategy?.version || 1,
              symbol: strategy?.symbol || 'SPXW',
              strategy_type: strategy?.strategy_type || 'intraday',
              // Include all configuration fields
              qty: strategy?.qty || 1,
              quantity_multiplier: strategy?.quantity_multiplier || 1,
              weekdays: strategy?.weekdays || {},
              selectedDTEs: strategy?.selectedDTEs || [0],
              selectedBudgetDays: strategy?.selectedBudgetDays || [],
              budgetPct: strategy?.budgetPct || 0,
              slippage_percent: strategy?.slippage_percent || 0,
              selected: true
            };
          }),
          createdAt: new Date().toISOString()
        };

        // ✅ Save to React Context (which auto-saves to localStorage)
        addPortfolio(newPortfolio);

        console.log('✅ Portfolio saved to Context & localStorage:', newPortfolio);

        // Pass the created portfolio data to parent component with complete strategy info
        const portfolioDataForParent = {
          id: data.portfolio_id,
          name: portfolioName,
          strategies: selectedStrategies.map(strategyId => {
            const strategy = strategies.find(s => s.id === strategyId);
            // Return complete strategy object
            return {
              id: strategy?.id || strategyId,
              strategy_id: strategyId,
              strategy_name: strategy?.name || '',
              version: strategy?.version || 1,
              symbol: strategy?.symbol || 'SPXW',
              strategy_type: strategy?.strategy_type || 'intraday',
              qty: strategy?.qty || 1,
              quantity_multiplier: strategy?.quantity_multiplier || 1,
              weekdays: strategy?.weekdays || {},
              selectedDTEs: strategy?.selectedDTEs || [0],
              selectedBudgetDays: strategy?.selectedBudgetDays || [],
              budgetPct: strategy?.budgetPct || 0,
              slippage_percent: strategy?.slippage_percent || 0,
              selected: true
            };
          }),
        };
        
        console.log('✅ Calling onCreatePortfolio with:', portfolioDataForParent);
        
        // First close the modal
        handleClose();
        
        // Then trigger navigation (after a small delay to ensure modal is closed)
        setTimeout(() => {
          onCreatePortfolio(portfolioDataForParent);
        }, 100);
      } else {
        alert(data.message || 'Failed to create portfolio');
      }
    } catch (error) {
      console.error('Error creating portfolio:', error);
      alert('Error creating portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPortfolioName('');
    setSearchQuery('');
    setSelectedStrategies([]);
    setActiveTab('My Strategies');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Create New Portfolio</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Portfolio Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio Name
            </label>
            <input
              type="text"
              value={portfolioName}
              onChange={(e) => setPortfolioName(e.target.value)}
              placeholder="Your portfolio name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Add Strategy Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Add Strategy</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                + New Strategy
              </button>
            </div>

            {/* Tab - My Strategies */}
            <div className="border-b border-gray-200 mb-4">
              <button
                className="px-4 py-2 text-sm font-medium text-blue-600 relative"
              >
                My Strategies
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Strategy"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedStrategies.length === filteredStrategies.length && filteredStrategies.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="select-all" className="text-sm font-medium text-gray-700 cursor-pointer">
                Select all ({filteredStrategies.length})
              </label>
            </div>

            {/* Strategies List */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading strategies...
                </div>
              ) : filteredStrategies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No strategies found
                </div>
              ) : (
                filteredStrategies.map((strategy) => (
                  <div key={strategy.id} className="flex items-center gap-2 py-2 hover:bg-gray-50 px-2 rounded">
                    <input
                      type="checkbox"
                      id={`strategy-${strategy.id}`}
                      checked={selectedStrategies.includes(strategy.id)}
                      onChange={() => handleToggleStrategy(strategy.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor={`strategy-${strategy.id}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                      {strategy.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreatePortfolio}
            disabled={loading}
            className="px-6 py-2 rounded-lg font-medium transition-all bg-blue-700 text-white hover:bg-blue-800 active:scale-95 cursor-pointer shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Portfolio'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePortfolioModal;
