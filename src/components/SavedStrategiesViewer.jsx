import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Trash2, RefreshCw, Folder } from 'lucide-react';

const SavedStrategiesViewer = ({ isOpen, onToggle }) => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      // Fetch from backend API only - no localStorage fallback
      const response = await fetch('/api/strategies/list');
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        setStrategies(data.strategies || []);
      } else {
        console.warn('Backend returned no strategies');
        setStrategies([]);
      }
    } catch (error) {
      console.error('Error fetching strategies:', error);
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStrategies();
    }
  }, [isOpen]);

  const handleDelete = async (strategyId, strategyName) => {
    if (!window.confirm(`Delete strategy "${strategyName}"?`)) {
      return;
    }

    try {
      // Delete from backend API only - no localStorage
      const response = await fetch(`/api/strategies/delete/${strategyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        fetchStrategies();
      } else {
        throw new Error(data.error || 'Failed to delete strategy');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Failed to delete strategy: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideInButton {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInSidebar {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        @keyframes slideOutSidebar {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(100%);
          }
        }
        
        @keyframes fadeInOverlay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .toggle-button-animate {
          animation: slideInButton 0.5s ease-out;
        }
        
        .sidebar-open {
          animation: slideInSidebar 0.4s ease-out forwards;
        }
        
        .sidebar-closed {
          animation: slideOutSidebar 0.3s ease-in forwards;
        }
        
        .overlay-animate {
          animation: fadeInOverlay 0.3s ease-out;
        }
      `}</style>
      
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-l-lg shadow-lg hover:bg-blue-700 transition-all z-40 toggle-button-animate"
        style={{ 
          right: isOpen ? '320px' : '0',
          transition: 'right 0.3s ease-out'
        }}
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-xl z-30 ${
          isOpen ? 'sidebar-open' : 'sidebar-closed'
        }`}
        style={{ 
          width: '320px',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s ease-out'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900">Saved Strategies</h3>
            <button
              onClick={fetchStrategies}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <p className="text-xs text-gray-500">{strategies.length} strategies saved</p>
        </div>

        {/* Strategies List */}
        <div className="overflow-y-auto h-[calc(100%-80px)] p-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 bg-gray-100 rounded-lg animate-pulse h-24" />
              ))}
            </div>
          ) : strategies.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Folder size={48} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-1">No saved strategies yet</p>
              <p className="text-xs text-gray-400">Save a strategy to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {strategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate text-sm">
                        {strategy.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {strategy.strategy_type?.toUpperCase() || 'UNKNOWN'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(strategy.id, strategy.name);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </div>

                  {/* Legs Display */}
                  {strategy.config?.legs && strategy.config.legs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Legs:</p>
                      <div className="space-y-1">
                        {strategy.config.legs.map((leg, idx) => (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-blue-600">LEG {idx + 1}:</span>
                              <span className="text-gray-700">
                                {leg.position?.toUpperCase()} {leg.option_type?.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-gray-500 mt-1">
                              <div>Expiry: {leg.expiry}</div>
                              <div>Strike: {leg.strike_criteria}</div>
                              <div>Lots: {leg.lots}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                    <span>{formatDate(strategy.updated_at)}</span>
                    {strategy.has_results && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        Has Results
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-20 overlay-animate"
          onClick={onToggle}
          style={{
            animation: 'fadeInOverlay 0.3s ease-out'
          }}
        />
      )}
    </>
  );
};

export default SavedStrategiesViewer;
