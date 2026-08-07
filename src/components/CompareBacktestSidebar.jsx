import { X } from 'lucide-react';

/**
 * CompareBacktestSidebar - Displays strategy version comparison
 * Shows all backtest versions for a strategy in a table format
 * Matches the reference design with right-side drawer
 */
const CompareBacktestSidebar = ({ isOpen, onClose, compareData, strategyName, strategyId, onLoadVersion }) => {
  if (!isOpen) return null;

  // Format number with commas and 2 decimals
  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return Number(num).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Format percentage
  const formatPercent = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return Number(num).toFixed(2) + '%';
  };

  // Format date range for display
  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '-';
    // Convert from YYYY-MM-DD to DD MMM YY format
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      return `${day} ${month} ${year}`;
    };
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Format created time
  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return '-';
    }
  };

  // Get color classes based on value
  const getValueColor = (value) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-700';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Right Sidebar Drawer */}
      <div className="fixed right-0 top-0 h-full w-[700px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Compare Backtests</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {!compareData || !Array.isArray(compareData) || compareData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6">
              <p className="text-gray-500 text-center mb-2">
                Every time you use different strategy parameters in the UI, click on 
                "Save and Compare" to compare the results.
              </p>
            </div>
          ) : (
            <div className="p-6">
              {/* Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  {/* Table Header */}
                  <thead style={{ backgroundColor: '#e6e6e6' }}>
                    <tr>
                      <th className="px-4 py-2.5 text-left text-sm font-bold text-black">
                        Versions (Latest to Oldest)
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-bold text-black">
                        Overall MTM
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-bold text-black">
                        Avg MTM
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-bold text-black">
                        Max DD
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-bold text-black">
                        R/Max DD
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-bold text-black">
                        Win%
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="bg-white">
                    {compareData.map((version, idx) => (
                      <tr 
                        key={idx}
                        className="border-t border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        {/* Version & Date */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="text-xl font-light text-gray-600 leading-none">
                              {compareData.length - idx}
                            </div>
                            <div className="flex flex-col">
                              <div className="text-sm font-normal text-gray-900">
                                {formatTime(version.created_at)}
                              </div>
                              <div className="text-xs whitespace-nowrap" style={{ color: '#808080' }}>
                                {formatDateRange(version.backtest_start_date, version.backtest_end_date)}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('[CompareBacktestSidebar] Load Version clicked');
                                  console.log('[CompareBacktestSidebar] Strategy ID:', strategyId);
                                  console.log('[CompareBacktestSidebar] Version:', version.version);
                                  console.log('[CompareBacktestSidebar] onLoadVersion exists?', !!onLoadVersion);
                                  if (onLoadVersion) {
                                    onLoadVersion(strategyId, version.version);
                                  } else {
                                    console.error('[CompareBacktestSidebar] onLoadVersion is not defined!');
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium underline mt-1 text-left"
                              >
                                Load This Version
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Overall MTM */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-black">
                            {formatNumber(version.overall_mtm)}
                          </div>
                        </td>

                        {/* Avg MTM */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-black">
                            {formatNumber(version.avg_mtm)}
                          </div>
                        </td>

                        {/* Max Drawdown */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-black">
                            {formatNumber(Math.abs(version.max_drawdown))}
                          </div>
                        </td>

                        {/* R/Max DD (Risk to Max Drawdown Ratio) */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-black">
                            {version.risk_reward_ratio !== null && version.risk_reward_ratio !== undefined 
                              ? formatNumber(version.risk_reward_ratio)
                              : '-'}
                          </div>
                        </td>

                        {/* Win Percentage */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-black">
                            {formatPercent(version.win_percentage)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CompareBacktestSidebar;
