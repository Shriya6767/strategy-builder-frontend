import React from 'react';

const MonthlyStatsTable = ({ monthlyStats }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (!monthlyStats || Object.keys(monthlyStats).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-10 py-10 mt-8 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Stats</h3>
        <p className="text-gray-500">No monthly stats data available</p>
      </div>
    );
  }

  const fmt = (value) => (value !== null && value !== undefined && value !== '' ? String(value) : '');

  const colorClass = (value) => {
    if (value === 0 || value === '0' || value === undefined || value === null || value === '') return 'text-gray-400';
    return value >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-10 py-10 mt-8 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Stats</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 w-16">Year</th>
              {months.map(month => (
                <th key={month} className="text-center py-3 px-3 font-semibold text-gray-700 bg-gray-50 whitespace-nowrap">
                  {month}
                </th>
              ))}
              <th className="text-center py-3 px-3 font-semibold text-gray-700 bg-gray-50 whitespace-nowrap">Total</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-700 bg-gray-50 whitespace-nowrap">Max Drawdown</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-700 bg-gray-50 whitespace-nowrap">Days for MDD</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-700 bg-gray-50 whitespace-nowrap">*R/MDD</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(monthlyStats).map(([year, yearData], yearIndex) => {
              // Support either a flat { Jan: 123, ... } shape or a richer
              // { months: {...}, total, max_drawdown, mdd_start, mdd_end } shape.
              const monthsData = yearData.months || yearData;
              const total = yearData.total ?? months.reduce((sum, m) => {
                const v = monthsData[m];
                return sum + (typeof v === 'number' ? v : 0);
              }, 0);
              const maxDrawdown = yearData.max_drawdown ?? yearData.maxDrawdown ?? null;
              const mddStart = yearData.mdd_start ?? yearData.mddStart ?? null;
              const mddEnd = yearData.mdd_end ?? yearData.mddEnd ?? null;
              const daysForMdd = yearData.days_for_mdd ?? yearData.daysForMdd ?? null;
              // Return-to-Max-Drawdown ratio: how many rupees of return per rupee of max drawdown risked.
              const rMdd = yearData.r_mdd ?? yearData.rMdd ??
                (maxDrawdown ? total / Math.abs(maxDrawdown) : null);

              return (
                <tr
                  key={year}
                  className={`border-b border-gray-200 ${yearIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-gray-100/50 transition-colors`}
                >
                  <td className="py-3 px-4 font-semibold text-gray-900 bg-gray-50">{year}</td>
                  {months.map(month => {
                    const value = monthsData[month];
                    const isEmpty = value === undefined || value === null || value === '';
                    return (
                      <td key={month} className={`py-3 px-3 text-center font-medium whitespace-nowrap ${colorClass(value)}`}>
                        {isEmpty ? '' : fmt(value)}
                      </td>
                    );
                  })}
                  <td className={`py-3 px-3 text-center whitespace-nowrap ${colorClass(total)}`}>{fmt(total)}</td>
                  <td className="py-3 px-3 text-center whitespace-nowrap text-red-600 font-bold">
                    {maxDrawdown !== null ? fmt(maxDrawdown) : '---'}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap text-gray-700">
                    {daysForMdd !== null ? (
                      <>
                        {daysForMdd}
                        {mddStart && mddEnd && (
                          <div className="text-[11px] text-gray-400 leading-tight">
                            [{mddStart} to {mddEnd}]
                          </div>
                        )}
                      </>
                    ) : '---'}
                  </td>
                  <td className={`py-3 px-3 text-center whitespace-nowrap ${colorClass(rMdd)}`}>
                    {rMdd !== null ? rMdd.toFixed(2) : '---'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-4 pl-4">* The returns are annualised for calculation. R/MDD = Total return ÷ |Max Drawdown| for that year.</p>
    </div>
  );
};

export default MonthlyStatsTable;
