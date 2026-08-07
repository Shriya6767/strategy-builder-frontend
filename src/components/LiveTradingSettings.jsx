import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, XCircle, Loader, Trash2 } from 'lucide-react';

const LiveTradingSettings = () => {
  const [broker, setBroker] = useState('ibkr');
  const [credentials, setCredentials] = useState({
    broker: 'interactive_brokers',
    host: '127.0.0.1',
    port: 7497, // HARDCODED - Paper Trading ONLY
    paper_trading: true
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await fetch('/api/live/status');
      const data = await response.json();
      if (data.status === 'success') {
        setIsConfigured(data.data.is_configured);
      }
    } catch (error) {
      console.error('Failed to check configuration:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    setTestResult(null);
  };

  // Port is HARDCODED to 7497 - Paper Trading ONLY
  // Live Trading (port 7496) is DISABLED for safety

  const handleTestConnection = async () => {
    if (!credentials.host || !credentials.port) {
      alert('Please enter Host and Port');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/live/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (data.status === 'success') {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.message });
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentials.host || !credentials.port) {
      alert('Please enter Host and Port');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/live/save-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (data.status === 'success') {
        alert('Credentials saved successfully!');
        setIsConfigured(true);
        setTestResult(null);
      } else {
        alert(`Failed to save: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCredentials = async () => {
    if (!window.confirm('Are you sure you want to delete saved credentials?')) {
      return;
    }

    try {
      const response = await fetch('/api/live/delete-credentials', {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.status === 'success') {
        alert('Credentials deleted successfully');
        setIsConfigured(false);
        setTestResult(null);
      } else {
        alert(`Failed to delete: ${data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="text-blue-600" size={24} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Live Trading Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Configure your Interactive Brokers connection</p>
          </div>
        </div>

        {/* Configuration Status */}
        <div className={`mb-6 p-4 rounded-lg ${isConfigured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <>
                <CheckCircle className="text-green-600" size={20} />
                <span className="text-green-800 font-medium">Credentials Configured</span>
              </>
            ) : (
              <>
                <XCircle className="text-yellow-600" size={20} />
                <span className="text-yellow-800 font-medium">No Credentials Configured</span>
              </>
            )}
          </div>
        </div>

        {/* IBKR Connection Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Host (Localhost)
            </label>
            <input
              type="text"
              value={credentials.host}
              onChange={(e) => handleInputChange('host', e.target.value)}
              placeholder="127.0.0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">TWS/Gateway runs on your local machine</p>
          </div>

          {/* SAFETY LOCK: Only Paper Trading Port 7497 Allowed */}
          <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔒</span>
              <h3 className="font-bold text-yellow-900">PAPER TRADING ONLY - SAFETY LOCK ENABLED</h3>
            </div>
            <p className="text-sm text-yellow-800 mb-3">
              Live Trading is DISABLED for safety. Only Paper Trading (Port 7497) is allowed.
            </p>
            <div className="px-4 py-3 rounded-lg border-2 border-blue-500 bg-blue-50">
              <div className="font-medium text-blue-900">Paper TWS (LOCKED)</div>
              <div className="text-sm text-blue-700">Port 7497 - Paper Trading Mode</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port (Read-Only)
            </label>
            <input
              type="number"
              value={credentials.port}
              readOnly
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
            />
            <p className="text-xs text-red-600 mt-1 font-medium">
              ⚠️ Port is locked to 7497. Any attempt to use port 7496 (Live Trading) will generate a FATAL ERROR.
            </p>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mb-6 p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : (
                <XCircle className="text-red-600" size={20} />
              )}
              <span className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                {testResult.message}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !credentials.host || !credentials.port}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isTesting ? (
              <>
                <Loader className="animate-spin" size={18} />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>

          <button
            onClick={handleSaveCredentials}
            disabled={isSaving || !credentials.host || !credentials.port}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <Loader className="animate-spin" size={18} />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </button>

          {isConfigured && (
            <button
              onClick={handleDeleteCredentials}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete
            </button>
          )}
        </div>

        {/* Information Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Interactive Brokers Paper Trading Setup:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Download and install TWS (Trader Workstation) from IBKR website</li>
            <li>Login to TWS with your IBKR Paper Trading account</li>
            <li>Go to File → Global Configuration → API → Settings</li>
            <li>Enable "Enable ActiveX and Socket Clients"</li>
            <li>Add "127.0.0.1" to "Trusted IP Addresses"</li>
            <li>Verify Socket Port is 7497 (Paper Trading)</li>
            <li>Click OK and restart TWS</li>
            <li>Come back here and test connection</li>
          </ol>
          <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded">
            <p className="text-sm text-red-800 font-medium">
              🔒 SAFETY NOTICE: Live Trading (Port 7496) is permanently disabled. This system only works with Paper Trading (Port 7497) to prevent accidental real money trades.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTradingSettings;
