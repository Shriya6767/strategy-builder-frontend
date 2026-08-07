import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const SaveStrategyModal = ({ isOpen, onClose, onSave, currentStrategyName = '', saveStatus = null, saveMessage = '' }) => {
  const [strategyName, setStrategyName] = useState(currentStrategyName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync saving state with parent saveStatus
  useEffect(() => {
    if (saveStatus === 'loading') {
      setSaving(true);
      setError('');
    } else if (saveStatus === 'error') {
      setSaving(false);
      setError(saveMessage || 'Failed to save strategy');
    } else if (saveStatus === 'success') {
      setSaving(false);
      setError('');
    }
  }, [saveStatus, saveMessage]);

  const handleSave = async () => {
    if (!strategyName.trim()) {
      setError('Please enter a strategy name');
      return;
    }

    // ⭐ NEW: Check if strategy name already exists in localStorage
    try {
      const savedStrategies = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
      const nameExists = savedStrategies.some(
        strategy => strategy.name.toLowerCase() === strategyName.trim().toLowerCase()
      );
      
      if (nameExists) {
        setError('Strategy name already exists! Please choose a different name.');
        return; // Don't proceed with save
      }
    } catch (err) {
      console.error('Error checking strategy names:', err);
      // Continue with save if localStorage check fails
    }

    setSaving(true);
    setError('');
    
    try {
      await onSave(strategyName.trim());
      // Reset form on success (modal will close via parent)
      setStrategyName('');
    } catch (error) {
      console.error('Save error:', error);
      // Error is handled by parent, just update local error for display
      if (!saveMessage) {
        setError(error.message || 'Failed to save strategy');
      }
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Save Strategy</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Strategy Name Input */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Strategy Name
          </label>
          <input
            type="text"
            value={strategyName}
            onChange={(e) => {
              setStrategyName(e.target.value);
              setError('');
            }}
            placeholder="e.g., My BTST Strategy"
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !saving && strategyName.trim()) {
                handleSave();
              }
            }}
          />
          {/* Inline Error Message */}
          {error && !saving ? (
            <p className="text-sm text-red-600 font-medium mt-2">
              {error}
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-2">
              Give your strategy a memorable name to easily find it later
            </p>
          )}

          {/* Loading State */}
          {saving && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Loader size={16} className="text-blue-600 animate-spin" />
              <p className="text-sm text-blue-700">
                {saveMessage || 'Saving strategy to server...'}
              </p>
            </div>
          )}

          {/* Success State */}
          {saveStatus === 'success' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700 mb-1">Success!</p>
                <p className="text-sm text-green-600">{saveMessage || 'Strategy saved successfully!'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveStatus === 'success' ? 'Close' : 'Cancel'}
          </button>
          {saveStatus !== 'success' && (
            <button
              onClick={handleSave}
              disabled={saving || !strategyName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Strategy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaveStrategyModal;
