import React, { useState } from 'react';
import { LayoutDashboard, Settings, FileText, Activity, Key, ChevronRight, Save, Briefcase } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onToggleSidebar }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    }
    setIsFullscreen(!isFullscreen);
  };

  const menuItems = [
    { id: 'builder', label: 'Strategy Builder', icon: LayoutDashboard },
    { id: 'live-dashboard', label: 'Live Trading', icon: Activity },
    { id: 'save-strategy', label: 'Strategies', icon: Save },
    { id: 'paper-trading', label: 'Paper Trading', icon: FileText },
    { id: 'portfolios', label: 'Portfolios', icon: Briefcase },
  ];

  return (
    <div className="w-56 xl:w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold" style={{ color: '#26619C' }}>Strategy Builder</h1>
        <p className="text-sm text-gray-500 mt-1">Options Backtesting</p>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200 hover:scale-[1.03] hover:shadow-md active:scale-[0.98] group ${
                isActive
                  ? 'font-medium shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={isActive ? {
                backgroundColor: 'rgba(38, 97, 156, 0.1)',
                color: '#26619C'
              } : {}}
            >
              <Icon size={20} className="transition-transform duration-200 group-hover:scale-110" />
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">{item.label}</span>
            </button>
          );
        })}

        {/* Single Separator Icon - Fullscreen Toggle */}
        <div className="flex justify-center my-4">
          <button
            onClick={handleToggleFullscreen}
            className="text-white rounded-full p-2 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 active:scale-90 transition-all duration-200 cursor-pointer"
            style={{ backgroundColor: '#26619C' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e4d7a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#26619C'}
            title="Toggle Fullscreen"
          >
            <ChevronRight
              size={20}
              className={`text-white transition-transform duration-300 ${isFullscreen ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>Connected to Backend</p>
          <p className="text-green-500 mt-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Active
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;