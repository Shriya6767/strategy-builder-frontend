import React from 'react';
import { User } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Options Strategy Backtesting</h2>
          <p className="text-sm text-gray-500 mt-1">Test your strategies with historical data</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={18} className="text-blue-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-800">Trader</p>
              <p className="text-gray-500 text-xs">Premium</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
