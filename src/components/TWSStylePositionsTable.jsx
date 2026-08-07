import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const TWSStylePositionsTable = ({ positions, darkMode = false }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) return '0.00';
    return parseFloat(value).toFixed(decimals);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPositions = React.useMemo(() => {
    if (!positions || positions.length === 0) return [];
    
    let sortablePositions = [...positions];
    if (sortConfig.key) {
      sortablePositions.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortablePositions;
  }, [positions, sortConfig]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp size={14} className="inline ml-1" /> : 
      <ChevronDown size={14} className="inline ml-1" />;
  };

  const getPositionColor = (action) => {
    return action === 'BUY' ? 'text-green-600' : 'text-red-600';
  };

  const getPnLColor = (value) => {
    if (!value || value === 0) return darkMode ? 'text-gray-400' : 'text-gray-600';
    return value > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
  };

  if (!positions || positions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No open positions</p>
      </div>
    );
  }

  // Calculate totals
  const totals = positions.reduce((acc, pos) => {
    acc.marketValue += (pos.current_price || 0) * (pos.quantity || 0) * (pos.multiplier || 100);
    acc.costBasis += (pos.entry_price || 0) * (pos.quantity || 0) * (pos.multiplier || 100);
    acc.unrealizedPnL += pos.pnl_amount || 0;
    return acc;
  }, { marketValue: 0, costBasis: 0, unrealizedPnL: 0 });

  return (
    <div className="w-full">
      {/* TWS-Style Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b-2`}>
              <th 
                className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                onClick={() => handleSort('symbol')}
              >
                Symbol <SortIcon columnKey="symbol" />
              </th>
              <th 
                className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider`}
              >
                Description
              </th>
              <th 
                className={`px-4 py-3 text-center text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                onClick={() => handleSort('action')}
              >
                Position <SortIcon columnKey="action" />
              </th>
              <th 
                className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                onClick={() => handleSort('quantity')}
              >
                Quantity <SortIcon columnKey="quantity" />
              </th>
              <th 
                className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                onClick={() => handleSort('current_price')}
              >
                Market Price <SortIcon columnKey="current_price" />
              </th>
              <th 
                className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider`}
              >
                Market Value
              </th>
              <th 
                className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                onClick={() => handleSort('entry_price')}
              >
                Avg Cost <SortIcon columnKey="entry_price" />
              </th>
              <th 
                className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider`}
              >
                Cost Basis
              </th>
              <th 
                className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                onClick={() => handleSort('pnl_amount')}
              >
                Unrealized P&L <SortIcon columnKey="pnl_amount" />
              </th>
              <th 
                className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wider cursor-pointer hover:bg-opacity-80`}
                onClick={() => handleSort('pnl_pct')}
              >
                P&L % <SortIcon columnKey="pnl_pct" />
              </th>
            </tr>
          </thead>
          <tbody className={darkMode ? 'bg-gray-900' : 'bg-white'}>
            {sortedPositions.map((position, index) => {
              const marketValue = (position.current_price || 0) * (position.quantity || 0) * (position.multiplier || 100);
              const costBasis = (position.entry_price || 0) * (position.quantity || 0) * (position.multiplier || 100);
              const optionDesc = `${position.option_type || 'OPT'} ${formatNumber(position.strike || 0, 0)} ${position.expiry || ''}`;
              
              return (
                <tr 
                  key={index}
                  className={`border-b ${darkMode ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}
                >
                  {/* Symbol */}
                  <td className={`px-4 py-3 text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {position.symbol || 'N/A'}
                  </td>
                  
                  {/* Description */}
                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className="flex flex-col">
                      <span className="font-medium">{optionDesc}</span>
                      <span className="text-xs text-gray-500">
                        {position.straddle_label || `Straddle ${position.straddle_id || '1'}`}
                      </span>
                    </div>
                  </td>
                  
                  {/* Position */}
                  <td className={`px-4 py-3 text-center text-sm font-semibold ${getPositionColor(position.action)}`}>
                    {position.action || 'N/A'}
                  </td>
                  
                  {/* Quantity */}
                  <td className={`px-4 py-3 text-right text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {position.quantity || 0}
                  </td>
                  
                  {/* Market Price */}
                  <td className={`px-4 py-3 text-right text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {formatCurrency(position.current_price || 0)}
                  </td>
                  
                  {/* Market Value */}
                  <td className={`px-4 py-3 text-right text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {formatCurrency(marketValue)}
                  </td>
                  
                  {/* Avg Cost */}
                  <td className={`px-4 py-3 text-right text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatCurrency(position.entry_price || 0)}
                  </td>
                  
                  {/* Cost Basis */}
                  <td className={`px-4 py-3 text-right text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatCurrency(costBasis)}
                  </td>
                  
                  {/* Unrealized P&L */}
                  <td className={`px-4 py-3 text-right text-sm ${getPnLColor(position.pnl_amount)}`}>
                    {position.pnl_amount >= 0 ? '+' : ''}{formatCurrency(position.pnl_amount || 0)}
                  </td>
                  
                  {/* P&L % */}
                  <td className={`px-4 py-3 text-right text-sm ${getPnLColor(position.pnl_pct)}`}>
                    {position.pnl_pct >= 0 ? '+' : ''}{formatNumber(position.pnl_pct || 0, 2)}%
                  </td>
                </tr>
              );
            })}
            
            {/* Totals Row */}
            <tr className={`border-t-2 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'} font-semibold`}>
              <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} colSpan="5">
                TOTAL
              </td>
              <td className={`px-4 py-3 text-right text-sm ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                {formatCurrency(totals.marketValue)}
              </td>
              <td className={`px-4 py-3 text-right text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                -
              </td>
              <td className={`px-4 py-3 text-right text-sm ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                {formatCurrency(totals.costBasis)}
              </td>
              <td className={`px-4 py-3 text-right text-sm ${getPnLColor(totals.unrealizedPnL)}`}>
                {totals.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(totals.unrealizedPnL)}
              </td>
              <td className={`px-4 py-3 text-right text-sm ${getPnLColor(totals.unrealizedPnL)}`}>
                {totals.costBasis !== 0 ? 
                  `${totals.unrealizedPnL >= 0 ? '+' : ''}${formatNumber((totals.unrealizedPnL / totals.costBasis) * 100, 2)}%` 
                  : '0.00%'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Stats (TWS-style) */}
      <div className={`mt-4 p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Market Value:</span>
            <span className={`ml-2 font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              {formatCurrency(totals.marketValue)}
            </span>
          </div>
          <div>
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Cost Basis:</span>
            <span className={`ml-2 font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              {formatCurrency(totals.costBasis)}
            </span>
          </div>
          <div>
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Unrealized P&L:</span>
            <span className={`ml-2 font-semibold ${getPnLColor(totals.unrealizedPnL)}`}>
              {totals.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(totals.unrealizedPnL)}
              {' '}
              ({totals.costBasis !== 0 ? 
                `${totals.unrealizedPnL >= 0 ? '+' : ''}${formatNumber((totals.unrealizedPnL / totals.costBasis) * 100, 2)}%` 
                : '0.00%'})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TWSStylePositionsTable;
