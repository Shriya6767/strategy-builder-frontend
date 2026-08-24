import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const StrikeSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const strikeOptions = [
    'ITM-20', 'ITM-19', 'ITM-18', 'ITM-17', 'ITM-16',
    'ITM-15', 'ITM-14', 'ITM-13', 'ITM-12', 'ITM-11',
    'ITM-10', 'ITM-9', 'ITM-8', 'ITM-7', 'ITM-6',
    'ITM-5', 'ITM-4', 'ITM-3', 'ITM-2', 'ITM-1',
    'ATM',
    'OTM-1', 'OTM-2', 'OTM-3', 'OTM-4', 'OTM-5',
    'OTM-6', 'OTM-7', 'OTM-8', 'OTM-9', 'OTM-10',
    'OTM-11', 'OTM-12', 'OTM-13', 'OTM-14', 'OTM-15',
    'OTM-16', 'OTM-17', 'OTM-18', 'OTM-19', 'OTM-20'
  ];

  const displayValue = value ? value.toUpperCase().replace('_', '-') : 'ATM';

  const handleSelect = (option) => {
    const optionValue = option.toLowerCase().replace('-', '_');
    onChange(optionValue);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full flex items-center justify-between"
      >
        <span>{displayValue}</span>
        <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Inline Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {strikeOptions.map((option) => {
            const optionValue = option.toLowerCase().replace('-', '_');
            const isSelected = value === optionValue;

            return (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={`w-full px-4 py-2 text-left text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option}
                {isSelected && (
                  <span className="float-right">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StrikeSelector;
