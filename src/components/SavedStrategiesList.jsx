import React, { useState, useEffect, useRef } from 'react';
import { Trash2, RefreshCw, Folder, Activity, ChevronDown, X } from 'lucide-react';
import { API_URL } from '../services/api';
import { deleteStrategy } from '../services/strategyApi';

const SavedStrategiesList = ({ onLoadStrategy, onNavigateToBuilder, onShowToast, onRefreshStrategies, refreshKey }) => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const [showPaperTradeModal, setShowPaperTradeModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [paperTradeInstances, setPaperTradeInstances] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [strategyToDelete, setStrategyToDelete] = useState(null);

  const fetchStrategies = async () => {
    console.log('[SavedStrategiesList] Loading strategies from localStorage...');
    setLoading(true);
    // ⭐ Close any open dropdowns when fetching
    setOpenDropdown(null);
    try {
      // ⭐ Load from localStorage instead of backend API
      const savedCards = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
      
      console.log('[SavedStrategiesList] ✓ Loaded strategies from localStorage:', savedCards.length);
      
      // Sort by created_at (newest first)
      savedCards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // DEBUG: Log each strategy name
      savedCards.forEach((s, idx) => {
        console.log(`[SavedStrategiesList] Strategy ${idx}: id=${s.id}, name="${s.name}"`);
      });
      
      setStrategies(savedCards);
      console.log('[SavedStrategiesList] openDropdown state:', openDropdown);
    } catch (error) {
      console.error('[SavedStrategiesList] Error loading strategies from localStorage:', error);
      setStrategies([]);
      
      // Show error toast if callback is available
      if (onShowToast) {
        onShowToast(`Failed to load strategies: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
    // ⭐ Close any open dropdowns when list refreshes
    setOpenDropdown(null);
  }, [refreshKey]); // ⭐ Re-fetch when refreshKey changes (after save)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (strategyId) => {
    // ⭐ FIX: Don't toggle if strategyId is null or undefined
    if (strategyId === null || strategyId === undefined) {
      console.warn('[SavedStrategiesList] Cannot toggle dropdown for strategy with null/undefined ID');
      return;
    }
    setOpenDropdown(openDropdown === strategyId ? null : strategyId);
  };

  const handleActivate = (strategy, mode) => {
    console.log(`Activating ${strategy.name} in ${mode} mode`);
    setOpenDropdown(null);
    
    if (mode === 'paper') {
      setSelectedStrategy(strategy);
      setShowPaperTradeModal(true);
      setPaperTradeInstances(1);
    } else if (mode === 'live') {
      // Handle live trade activation
      console.log('Live trade activation');
    }
  };

  const handlePaperTradeActivate = () => {
    console.log(`Activating Paper Trade for ${selectedStrategy.name} with ${paperTradeInstances} instances`);
    // Add your paper trade activation logic here
    setShowPaperTradeModal(false);
    setSelectedStrategy(null);
  };

  const handleModalClose = () => {
    setShowPaperTradeModal(false);
    setSelectedStrategy(null);
    setPaperTradeInstances(1);
  };

  const handleStrategyClick = async (strategy) => {
    console.log('[SavedStrategiesList] ========== STRATEGY CLICK DEBUG START ==========');
    console.log('[SavedStrategiesList] Strategy button clicked');
    console.log('[SavedStrategiesList] strategy object:', strategy);
    console.log('[SavedStrategiesList] strategy.id:', strategy.id);
    console.log('[SavedStrategiesList] strategy.name:', strategy.name);
    console.log('[SavedStrategiesList] strategy.name type:', typeof strategy.name);
    console.log('[SavedStrategiesList] strategy.name length:', strategy.name?.length);
    console.log('[SavedStrategiesList] strategy.name charCodes:', strategy.name?.split('').map(c => c.charCodeAt(0)));
    console.log('[SavedStrategiesList] Calling onLoadStrategy with:', { id: strategy.id, name: strategy.name });
    console.log('[SavedStrategiesList] ========== STRATEGY CLICK DEBUG END ==========');
    
    // Load the strategy by ID and name from backend
    if (onLoadStrategy) {
      try {
        await onLoadStrategy(strategy.id, strategy.name);
        
        // Navigate to builder tab after successful load
        if (onNavigateToBuilder) {
          onNavigateToBuilder();
        }
      } catch (error) {
        console.error('[SavedStrategiesList] Error loading strategy:', error);
        alert(`Failed to load strategy: ${error.message}`);
      }
    } else {
      console.error('[SavedStrategiesList] onLoadStrategy callback is not defined!');
    }
  };

  const handleDelete = async (strategyId, strategyName) => {
    // Show custom delete modal instead of browser confirm
    setStrategyToDelete({ id: strategyId, name: strategyName });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!strategyToDelete) return;

    const { id: strategyId, name: strategyName } = strategyToDelete;

    try {
      console.log('[SavedStrategiesList] Deleting strategy from localStorage...');
      
      // ⭐ Remove from localStorage
      const savedCards = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
      const updatedCards = savedCards.filter(card => card.id !== strategyId);
      localStorage.setItem('saved_strategies_cards', JSON.stringify(updatedCards));
      
      console.log('[SavedStrategiesList] ✓ Strategy deleted from localStorage');
      
      // Show success toast
      if (onShowToast) {
        onShowToast(`Strategy "${strategyName}" deleted successfully!`, 'success');
      }
      
      // Refresh the list
      fetchStrategies();
      
      // Trigger parent refresh if needed
      if (onRefreshStrategies) {
        onRefreshStrategies();
      }
      
      // ⭐ OPTIONAL: Also delete from backend if needed
      try {
        await deleteStrategy(strategyId, strategyName);
        console.log('[SavedStrategiesList] ✓ Strategy also deleted from backend');
      } catch (backendError) {
        console.warn('[SavedStrategiesList] ⚠️ Failed to delete from backend (continuing anyway):', backendError);
      }
    } catch (error) {
      console.error('[SavedStrategiesList] Delete error:', error);
      
      // Show error toast
      if (onShowToast) {
        onShowToast(`Failed to delete strategy: ${error.message}`, 'error');
      } else {
        alert(`Failed to delete strategy: ${error.message}`);
      }
    } finally {
      // Close modal
      setShowDeleteModal(false);
      setStrategyToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setStrategyToDelete(null);
  };

  const getStrategyBadgeColor = (type) => {
    const colors = {
      'intraday': 'bg-orange-100 text-orange-700',
      'btst': 'bg-purple-100 text-purple-700',
      'sequential': 'bg-blue-100 text-blue-700',
    };
    return colors[type?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="w-full h-full bg-gray-50">
      <div className="mx-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Strategies</h1>
            <p className="text-gray-600">{strategies.length} strategies saved</p>
          </div>
          <button
            onClick={fetchStrategies}
            className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={loading}
            title="Refresh strategies"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin text-blue-600' : 'text-gray-600'} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 bg-white rounded-xl border border-gray-200 animate-pulse h-64" />
            ))}
          </div>
        ) : strategies.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-gray-200">
            <Folder size={80} className="text-gray-300 mb-6" />
            <p className="text-2xl text-gray-500 mb-3 font-semibold">No saved strategies yet</p>
            <p className="text-gray-400 text-lg">Build a strategy and save it to see it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="bg-white rounded-lg border border-gray-300 hover:shadow-lg hover:border-blue-400 transition-all py-6 px-6"
              >
                {/* Header Row - Strategy Type Badge */}
                <div className="flex justify-end mb-4">
                  <span className="px-3 py-1 rounded text-xs font-semibold text-orange-700 bg-orange-50">
                    {strategy.strategy_type?.charAt(0).toUpperCase() + strategy.strategy_type?.slice(1) || 'Intraday'}
                  </span>
                </div>

                {/* Strategy Name */}
                <h2 className="text-2xl font-bold text-blue-600 mb-2">
                  {strategy.name}
                </h2>
                
                {/* Subtitle */}
                <p className="text-gray-600 text-sm mb-5">
                  Option Structure | Paper-0x | Live-0x
                </p>

                {/* Symbol */}
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {strategy.symbol || 'NIFTY'}
                </h3>
                
                {/* Entry and Exit Time Row */}
                <div className="flex justify-between text-sm mb-5">
                  <div>
                    <span className="text-gray-700">Entry time: </span>
                    <span className="text-gray-900 font-semibold">{strategy.entry_time || '09:16'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-700">Exit time: </span>
                    <span className="text-gray-900 font-semibold">{strategy.exit_time || '15:29'}</span>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2 relative">
                  <button 
                    onClick={() => handleStrategyClick(strategy)}
                    className="px-5 py-2.5 rounded text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors z-0"
                  >
                    Strategy
                  </button>
                  <button className="px-5 py-2.5 rounded text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors z-0">
                    Execution
                  </button>
                  
                  {/* Activate Dropdown */}
                  <div className="relative z-10" ref={openDropdown === strategy.id ? dropdownRef : null}>
                    <button 
                      onClick={() => toggleDropdown(strategy.id)}
                      className="px-5 py-2.5 rounded text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      Activate
                      <ChevronDown size={16} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {openDropdown === strategy.id && strategy.id !== null && strategy.id !== undefined && (
                      <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded shadow-lg border border-gray-200 z-50 overflow-hidden">
                        <button
                          onClick={() => handleActivate(strategy, 'paper')}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Paper Trade
                        </button>
                        <button
                          onClick={() => handleActivate(strategy, 'live')}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          Live Trade
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(strategy.id, strategy.name);
                    }}
                    className="p-2.5 rounded bg-blue-800 hover:bg-blue-900 transition-colors text-white ml-auto z-20 relative cursor-pointer"
                    title="Delete strategy"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paper Trade Modal */}
      {showPaperTradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 relative">
            {/* Close Button */}
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Modal Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-blue-500">
                Paper-Trading Activation Settings
              </h2>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6">
              {/* Instance Counter Display */}
              <div className="flex justify-end mb-6">
                <span className="text-gray-600 font-medium">
                  {paperTradeInstances}/10
                </span>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-gray-700">Broker</h3>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-gray-700">No. of time</h3>
                </div>
              </div>

              {/* Table Row */}
              <div className="grid grid-cols-2 gap-4 items-center mb-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="paperTrade"
                    className="w-5 h-5 rounded border-gray-300"
                    defaultChecked
                  />
                  <label htmlFor="paperTrade" className="text-gray-700 font-medium">
                    Paper Trade
                  </label>
                </div>
                <div className="flex items-center justify-center">
                  <div className="flex items-center border border-gray-300 rounded">
                    <button
                      onClick={() => setPaperTradeInstances(Math.max(1, paperTradeInstances - 1))}
                      className="px-3 py-1 hover:bg-gray-100 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={paperTradeInstances}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setPaperTradeInstances(Math.min(10, Math.max(1, val)));
                      }}
                      className="w-16 text-center border-x border-gray-300 py-1 focus:outline-none"
                      min="1"
                      max="10"
                    />
                    <button
                      onClick={() => setPaperTradeInstances(Math.min(10, paperTradeInstances + 1))}
                      className="px-3 py-1 hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Activate Button */}
              <div className="flex justify-end">
                <button
                  onClick={handlePaperTradeActivate}
                  className="px-8 py-2.5 bg-blue-400 hover:bg-blue-500 text-white rounded font-medium transition-colors"
                >
                  Activate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && strategyToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            {/* Warning Icon and Message */}
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Strategy
                </h3>
                <p className="text-gray-600">
                  Are you sure you want to delete <span className="font-semibold">"{strategyToDelete.name}"</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedStrategiesList;
