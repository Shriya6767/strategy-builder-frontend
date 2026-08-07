import React, { useState } from 'react';

const ExpandableSection = ({ title, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg border transition-all ${
          isExpanded
            ? 'bg-gradient-to-r from-primary-600 to-cyan-500 text-white border-primary-600'
            : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
        }`}
      >
        <span className="text-sm font-medium">{title}</span>
        <span className={`w-5 h-5 flex items-center justify-center bg-white/20 rounded text-lg font-bold transition-transform ${isExpanded ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      {isExpanded && (
        <div className="mt-2 animate-slideDown">
          {children}
        </div>
      )}
    </div>
  );
};

export default ExpandableSection;
