import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronsLeft,
  Upload,
  Edit2,
  Trash2,
  ChevronDown,
  GripVertical,
  Info,
  Play,
  Clock,
  FileEdit,
  Copy,
  Check,
  Plus,
  X,
  FileDown,
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { API_URL } from '../services/api';
import PortfolioBacktestResults from './PortfolioBacktestResults';
import logger from '../utils/logger';
import StrategyRow from './StrategyRow';
import { generatePortfolioScreenshotPDF } from '../utils/portfolioScreenshotPdf';

const WEEKDAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'Th' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'Sa' },
  { key: 'sun', label: 'Su' },
];

const ALL_WEEKDAYS_ON = WEEKDAYS.reduce((acc, d) => ({ ...acc, [d.key]: true }), {});

const toInputDate = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const PillDropdown = ({ value, options, onChange, className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
    <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
  </div>
);

const QtyMultiplierDropdown = ({ value, onChange, onApply, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('1');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const match = /^(\d+)x$/.exec(value);
      setInputValue(match ? match[1] : '1');
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    const multiplier = parseInt(inputValue) || 1;
    onChange(`${multiplier}x`);
    onApply?.(multiplier);
    setIsOpen(false);
  };

  const displayText = value === 'Qty Multiplier' ? 'Qty Multiplier' : value;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none w-full bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 cursor-pointer text-left"
      >
        {displayText}
      </button>
      <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" />

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-3 w-48">
          <label className="block text-xs text-gray-600 mb-2">Quantity Multiplier</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min="1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApply();
                  }
                }}
                className="w-full px-3 py-1.5 pr-7 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                autoFocus
              />
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SlippageDropdown = ({ value, onChange, onApply, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('0');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const match = /^(-?\d+(\.\d+)?)%$/.exec(value);
      setInputValue(match ? match[1] : '0');
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    const slippage = parseFloat(inputValue) || 0;
    onChange(`${slippage}%`);
    onApply?.(slippage);
    setIsOpen(false);
  };

  const displayText = 'Slippage';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none w-full bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 cursor-pointer text-left"
      >
        {displayText}
      </button>
      <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" />

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-3 w-48">
          <label className="block text-xs text-gray-600 mb-2">Slippage (%)</label>
          <div className="flex flex-row items-center gap-2">
            <div className="relative flex-1 flex flex-row items-center">
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApply();
                  }
                }}
                className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                autoFocus
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">%</span>
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DTEDropdown = ({ onApply, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('0');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    const dte = parseInt(inputValue, 10);
    onApply?.(Number.isNaN(dte) ? 0 : dte);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 cursor-pointer text-left"
      >
        DTE
      </button>
      <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" />

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-3 w-64">
          <label className="block text-xs text-gray-600 mb-2">Days to expiry</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="appearance-none w-full px-3 py-1.5 pr-8 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              >
                {Array.from({ length: 81 }, (_, i) => i).map((d) => (
                  <option key={d} value={d}>
                    {d} DTE
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const WeekdaysDropdown = ({ onApply, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState({ ...ALL_WEEKDAYS_ON });
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDay = (key) => {
    setSelectedDays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApply = () => {
    onApply?.(selectedDays);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 cursor-pointer text-left"
      >
        Weekdays
      </button>
      <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" />

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-3 w-max">
          <label className="block text-xs text-gray-600 mb-2">Weekdays</label>
          <div className="flex items-center gap-2">
            {WEEKDAYS.map((d) => {
              const active = selectedDays[d.key];
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className={`w-9 h-9 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-blue-50 border-blue-400 text-blue-600'
                      : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors whitespace-nowrap ml-1"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const BudgetDaysDropdown = ({ onApply, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const dropdownRef = useRef(null);

  const budgetDaysOptions = [
    { key: 'budgetDay', label: 'Budget Day' },
    { key: '1dayBefore', label: '1 day Before' },
    { key: '2daysBefore', label: '2 days before' },
    { key: '3daysBefore', label: '3 days before' },
    { key: '4daysBefore', label: '4 days before' },
    { key: '5daysBefore', label: '5 days before' },
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleKey = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleApply = () => {
    onApply?.(selected);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 cursor-pointer text-left"
      >
        Budget Days
      </button>
      <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" />

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-3 w-56">
          <label className="block text-xs text-gray-600 mb-2">Budget Days</label>
          <div className="max-h-48 overflow-y-auto mb-2">
            {budgetDaysOptions.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 px-1 py-1.5 hover:bg-gray-50 cursor-pointer rounded"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.key)}
                  onChange={() => toggleKey(opt.key)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="w-full px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

const BudgetDaysMultiSelect = ({ selectedBudgetDays = [], onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const budgetDaysOptions = [
    { key: 'budgetDay', label: 'Budget Day' },
    { key: '1dayBefore', label: '1 day Before' },
    { key: '2daysBefore', label: '2 days before' },
    { key: '3daysBefore', label: '3 days before' },
    { key: '4daysBefore', label: '4 days before' },
    { key: '5daysBefore', label: '5 days before' },
  ];

  const allSelected = selectedBudgetDays.length === budgetDaysOptions.length;

  const toggleBudgetDay = (key) => {
    if (selectedBudgetDays.includes(key)) {
      onChange(selectedBudgetDays.filter((d) => d !== key));
    } else {
      onChange([...selectedBudgetDays, key]);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(budgetDaysOptions.map(opt => opt.key));
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayText = selectedBudgetDays.length === 0
    ? 'Select Budget Days'
    : `${selectedBudgetDays.length} Selected`;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="appearance-none w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 cursor-pointer text-left"
      >
        {displayText}
      </button>
      <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" />

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
            />
            <span className="text-sm text-gray-700">Select All</span>
          </label>

          {budgetDaysOptions.map((opt) => (
            <label
              key={opt.key}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedBudgetDays.includes(opt.key)}
                onChange={() => toggleBudgetDay(opt.key)}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const Portfolio = ({
  portfolioId,
  portfolioName: initialName = 'My Portfolio',
  strategies: strategiesProp,
  onBack,
  onDeletePortfolio,
  onSaveAsNew,
  onUpdatePortfolio,
  onRunBacktest,
  onRecentBacktests,
  creditsAvailable = 0,
  backtestsRemaining = 25,
  startDate: savedStartDate,
  endDate: savedEndDate,
}) => {
  const [portfolioName, setPortfolioName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialName);

  const [showSaveAsNewModal, setShowSaveAsNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalName, setEditModalName] = useState(initialName);
  const [allSavedStrategies, setAllSavedStrategies] = useState([]);
  const [saveAsNewName, setSaveAsNewName] = useState('');

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [backtestResults, setBacktestResults] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestError, setBacktestError] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [scopeFilter, setScopeFilter] = useState('All');
  const [qtyMultiplier, setQtyMultiplier] = useState('Qty Multiplier');
  const [dteTab, setDteTab] = useState('Weekdays');
  const [slippage, setSlippage] = useState('Slippage');

  const today = new Date();
  const lastYear = new Date();
  lastYear.setFullYear(today.getFullYear() - 1);
  
  const [startDate, setStartDate] = useState(savedStartDate || toInputDate(lastYear));
  const [endDate, setEndDate] = useState(savedEndDate || toInputDate(today));

  const [saved, setSaved] = useState(false);
  const dragIndex = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const buildRow = (s, idx) => {
      const row = {
        id: s.id ?? s.strategy_id ?? `strategy_${idx}`,
        name: s.name ?? s.strategy_name ?? 'Untitled Strategy',
        symbol: s.symbol ?? 'NIFTY',
        strategy_type: (s.strategy_type ?? 'intraday').toUpperCase(),
        version: s.version ?? 1,
        selected: s.selected ?? true,
        qty: s.qty ?? s.quantity_multiplier ?? 1,
        weekdays: s.weekdays ?? { ...ALL_WEEKDAYS_ON },
        budgetPct: s.budgetPct ?? s.slippage_percent ?? 0,
        selectedDTEs: s.selectedDTEs ?? [0],
        selectedBudgetDays: s.selectedBudgetDays ?? [],
      };
      return row;
    };

    if (Array.isArray(strategiesProp)) {
      const builtRows = strategiesProp.map(buildRow);
      setRows(builtRows);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const loadFallback = () => {
      try {
        const local = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
        if (local.length > 0) return local.map(buildRow);
      } catch (e) {
      }
      return [
        {
          id: 'sample_trending',
          name: 'Trending Strategy',
          symbol: 'NIFTY',
          strategy_type: 'INTRADAY',
          selected: true,
          qty: 1,
          weekdays: { ...ALL_WEEKDAYS_ON },
          budgetPct: 0,
          selectedDTEs: [0],
          selectedBudgetDays: [],
        },
      ];
    };

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/strategies/list`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && Array.isArray(data.strategies) && data.strategies.length > 0) {
            if (!cancelled) setRows(data.strategies.map(buildRow));
            return;
          }
        }
        if (!cancelled) setRows(loadFallback());
      } catch (e) {
        if (!cancelled) setRows(loadFallback());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [strategiesProp]);

  const selectedCount = rows.filter((r) => r.selected).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  const toggleSelectAll = () => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const toggleRowSelected = useCallback((id) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  }, []);

  const deleteSelected = () => {
    setRows((prev) => prev.filter((r) => !r.selected));
  };

  const deleteRow = useCallback((id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRow = useCallback((id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const toggleRowWeekday = useCallback((id, dayKey) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, weekdays: { ...r.weekdays, [dayKey]: !r.weekdays[dayKey] } } : r
      )
    );
  }, []);

  const applyQtyMultiplier = (multiplier) => {
    setRows((prev) =>
      prev.map((r) => {
        if (scopeFilter === 'Selected Only' && !r.selected) return r;
        return { ...r, qty: multiplier };
      })
    );
  };

  const applySlippageToRows = (slippageValue) => {
    setRows((prev) =>
      prev.map((r) => {
        if (scopeFilter === 'Selected Only' && !r.selected) return r;
        return { ...r, budgetPct: slippageValue };
      })
    );
  };

  const applyDTEToRows = (dte) => {
    setRows((prev) =>
      prev.map((r) => {
        if (scopeFilter === 'Selected Only' && !r.selected) return r;
        return { ...r, selectedDTEs: [dte] };
      })
    );
  };

  const applyWeekdaysToRows = (selectedDays) => {
    setRows((prev) =>
      prev.map((r) => {
        if (scopeFilter === 'Selected Only' && !r.selected) return r;
        return { ...r, weekdays: { ...selectedDays } };
      })
    );
  };

  const applyBudgetDaysToRows = (selectedBudgetDays) => {
    setRows((prev) =>
      prev.map((r) => {
        if (scopeFilter === 'Selected Only' && !r.selected) return r;
        return { ...r, selectedBudgetDays: [...selectedBudgetDays] };
      })
    );
  };

  const handleDragStart = useCallback((index) => (e) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  
  const handleDragOver = useCallback((index) => (e) => {
    e.preventDefault();
  }, []);
  
  const handleDrop = useCallback((index) => (e) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === index) return;
    setRows((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndex.current = null;
  }, []);

  const buildPortfolioPayload = () => ({
    id: portfolioId,
    name: portfolioName,
    scopeFilter,
    qtyMultiplier,
    dteTab,
    slippage,
    startDate,
    endDate,
    strategies: rows,
  });

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const handleUpdatePortfolio = () => {
    onUpdatePortfolio?.(buildPortfolioPayload());
    flashSaved();
  };

  const handleSaveAsNew = () => {
    setSaveAsNewName(`${portfolioName} (copy)`);
    setShowSaveAsNewModal(true);
  };

  const handleConfirmSaveAsNew = () => {
    const newName = saveAsNewName.trim() || `${portfolioName} (copy)`;
    
    const selectedStrategies = rows.filter(row => row.selected);
    
    if (selectedStrategies.length === 0) {
      alert('Please select at least one strategy');
      return;
    }
    
    const payload = {
      ...buildPortfolioPayload(),
      name: newName,
      strategies: selectedStrategies  // Only save selected strategies
    };
    onSaveAsNew?.(payload);
    setShowSaveAsNewModal(false);
    flashSaved();
  };

  const handleConfirmEdit = () => {
    if (rows.length === 0) {
      alert('Please select at least one strategy');
      return;
    }
    
    const updatedName = editModalName.trim() || portfolioName;
    
    const payload = {
      id: portfolioId,
      name: updatedName,
      scopeFilter,
      qtyMultiplier,
      dteTab,
      slippage,
      startDate,
      endDate,
      strategies: rows  // All rows are the selected strategies
    };
    
    // Update the portfolio name
    setPortfolioName(updatedName);
    
    // Call the update handler
    onUpdatePortfolio?.(payload);
    
    setShowEditModal(false);
    flashSaved();
  };

  const handleBacktest = async () => {
    setBacktestLoading(true);
    setBacktestError(null);
    setBacktestResults(null);

    try {
      const selectedRows = rows.filter(row => row.selected);
      
      if (selectedRows.length === 0) {
        throw new Error('Please select at least one strategy');
      }


      let savedStrategies = [];
      try {
        savedStrategies = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
      } catch (e) {
      }

      const payload = {
        portfolio_id: portfolioId,
        aggregate_at_eod: true,
        start_date: startDate,
        end_date: endDate,
        strategy_overrides: selectedRows.map(row => {

          let strategyId;
          if (typeof row.id === 'number') {
            strategyId = row.id;
          } else if (typeof row.id === 'string') {
            const match = row.id.match(/\d+/);
            strategyId = match ? parseInt(match[0]) : null;
          }

          if (!strategyId || isNaN(strategyId)) {
            logger.error('❌ Invalid strategy_id for row:', row);
            throw new Error(`Invalid strategy ID for "${row.name}": ${row.id}`);
          }

          let period_selection;
          if (dteTab === 'DTE') {
            // Use array format: [0, 1, 2, etc.]
            period_selection = {
              mode: 'dte',
              dte_selected: row.selectedDTEs || [0]
            };
          } else if (dteTab === 'Weekdays') {
            const weekdayMap = {
              mon: 'M', tue: 'T', wed: 'W', thu: 'Th', 
              fri: 'F', sat: 'Sa', sun: 'Su'
            };
            const weekdays_selected = Object.entries(row.weekdays || {})
              .filter(([key, value]) => value)
              .map(([key]) => weekdayMap[key])
              .filter(Boolean);
            
            period_selection = {
              mode: 'weekdays',
              weekdays_selected
            };
          }

          // Return with strategy_name included (as shown in correct format)
          return {
            strategy_id: strategyId,
            strategy_name: row.name || 'Untitled',
            version: row.version || 2,
            qty_multiplier: row.qty || 1,
            slippage_percent: row.budgetPct || 0,
            period_selection
          };
        })
      };

      logger.request('[RUN PORTFOLIO BACKTEST] Request', {
        method: 'POST',
        url: `${API_URL}/run-portfolio-backtest`,
        body: payload
      });

      const response = await fetch(`${API_URL}/run-portfolio-backtest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      logger.response('[RUN PORTFOLIO BACKTEST] Response', {
        status: response.status,
        data: data
      });

      if (!response.ok) {
        throw new Error(data.detail || data.message || `HTTP ${response.status}`);
      }

      const transformedData = {
        ...data,
        strategies: (data.strategies || []).map(strategy => {
          return {
            ...strategy,
            trade_results: (strategy.trade_results || []).map(trade => ({
              ...trade,
              legs: (trade.legs || []).map(leg => {
                const originalOption = leg.option;
                const transformedOption = leg.option ? leg.option.toLowerCase() : leg.option;
                if (originalOption !== transformedOption) {
                }
                return {
                  ...leg,
                  option: transformedOption  // CALL → call, PUT → put
                };
              })
            }))
          };
        })
      };

      setBacktestResults(transformedData);

    } catch (error) {
      logger.error('❌ Error running backtest:', error);
      setBacktestError(error.message);
    } finally {
      setBacktestLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        handleBacktest();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rows, portfolioName, scopeFilter, qtyMultiplier, dteTab, slippage, startDate, endDate]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(buildPortfolioPayload(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioName || 'portfolio'}.algtst`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleGeneratePDF = async () => {
    if (!backtestResults) {
      alert('Please run a backtest first before generating PDF');
      return;
    }
    
    try {
      setIsGeneratingPDF(true);
      await generatePortfolioScreenshotPDF(portfolioName || 'Portfolio');
      // Success - PDF downloaded automatically
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!window.confirm(`Delete portfolio "${portfolioName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const payload = { portfolio_id: portfolioId };
      
      logger.request('[DELETE PORTFOLIO] Request', {
        method: 'POST',
        url: `${API_URL}/delete-portfolio`,
        body: payload
      });
      
      const response = await fetch(`${API_URL}/delete-portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      logger.response('[DELETE PORTFOLIO] Response', {
        status: response.status,
        data: data
      });
      logger.success('Portfolio deleted successfully');
      
      onDeletePortfolio?.(portfolioId);
    } catch (error) {
      logger.error('Error deleting portfolio:', error);
      alert('Failed to delete portfolio. Please try again.');
    }
  };

  const commitName = () => {
    setPortfolioName(nameDraft.trim() || portfolioName);
    setEditingName(false);
  };

  return (
    <div className="flex flex-col h-full bg-white -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-12 -my-6 min-h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Collapse"
            type="button"
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Back"
            type="button"
          >
            <ArrowLeft size={20} />
          </button>

          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === 'Enter' && commitName()}
              className="text-xl font-semibold text-gray-900 border-b-2 border-blue-400 focus:outline-none px-1 min-w-0"
            />
          ) : (
            <h1 className="text-xl font-semibold text-gray-900 truncate">{portfolioName}</h1>
          )}

          <div className="hidden sm:flex items-center gap-2 ml-4">
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF || !backtestResults}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isGeneratingPDF || !backtestResults
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-blue-600 hover:bg-blue-50 border border-blue-200'
              }`}
              type="button"
              title={!backtestResults ? 'Run a backtest first' : 'Generate PDF report'}
            >
              <FileDown size={15} />
              {isGeneratingPDF ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              <Upload size={15} />
              Export
            </button>
            <button
              onClick={() => {
                // Load all saved strategies from localStorage
                try {
                  const savedStrategies = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
                  setAllSavedStrategies(savedStrategies);
                } catch (e) {
                  console.error('Failed to load saved strategies:', e);
                  setAllSavedStrategies([]);
                }
                setEditModalName(portfolioName);
                setShowEditModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              type="button"
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={handleDeletePortfolio}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              type="button"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-2">
            <button
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              type="button"
            >
              <Upload size={14} />
              Import
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              type="button"
            >
              <Plus size={14} />
              Create new portfolio
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div id="portfolio-pdf-content" className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
        {/* Portfolio configuration section - Always visible */}
        <div>
          <h2 className="text-sm font-medium text-gray-800 mb-3">Overall Portfolio Setting</h2>

        <div className="flex items-center justify-between gap-12 mb-6">
          <div className="flex items-center gap-88 flex-1">
            <PillDropdown
              value={scopeFilter}
              onChange={setScopeFilter}
              options={['All', 'Selected Only']}
              className="w-24"
            />

            <div className="w-32">
              <QtyMultiplierDropdown
                value={qtyMultiplier}
                onChange={setQtyMultiplier}
                onApply={applyQtyMultiplier}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-3 ml-12">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden text-sm bg-white">
                {['DTE', 'Weekdays'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDteTab(tab)}
                    className={`px-4 py-2 transition-colors ${
                      dteTab === tab
                        ? 'bg-blue-100 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* When on the DTE tab, show the "Days to expiry / Apply" popup
                  (matches screenshot 1) instead of a plain option-list dropdown
                  that just repeats DTE/Weekdays/Budget Days (screenshot 2). */}
              {dteTab === 'DTE' ? (
                <DTEDropdown onApply={applyDTEToRows} className="w-32" />
              ) : (
                <WeekdaysDropdown onApply={applyWeekdaysToRows} className="w-32" />
              )}
            </div>

            <div className="shrink-0 ml-2">
              <SlippageDropdown
                value={slippage}
                onChange={setSlippage}
                onApply={applySlippageToRows}
                className="w-32"
              />
            </div>
          </div>
        </div>

        {/* Selection bar */}
        <div className="border border-gray-200 rounded-t-lg bg-gray-100 px-6 py-3 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">
              {selectedCount}/{rows.length} selected
            </span>
          </label>

          <button
            onClick={deleteSelected}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            type="button"
            title="Delete Selected"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Strategy rows */}
        <div className="border border-t-0 border-gray-200 rounded-b-lg mb-6 divide-y divide-gray-100 bg-white">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Loading strategies…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No strategies in this portfolio yet.
            </div>
          ) : (
            rows.map((row, idx) => (
              <StrategyRow
                key={row.id}
                row={row}
                idx={idx}
                dteTab={dteTab}
                PillDropdown={PillDropdown}
                onUpdateRow={updateRow}
                onToggleSelected={toggleRowSelected}
                onToggleWeekday={toggleRowWeekday}
                onDelete={deleteRow}
                onDragStart={handleDragStart(idx)}
                onDragOver={handleDragOver(idx)}
                onDrop={handleDrop(idx)}
              />
            ))
          )}
        </div>

        {/* Backtest duration */}
        <div className="border border-gray-200 rounded-lg bg-white px-5 py-4 flex items-center justify-between flex-wrap gap-4">
          <p className="text-sm font-medium text-gray-800">Enter the duration of your backtest</p>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="portfolio-start-date">
                Start Date
              </label>
              <input
                id="portfolio-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                lang="en-GB"
                placeholder="dd/mm/yyyy"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="portfolio-end-date">
                End Date
              </label>
              <input
                id="portfolio-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                lang="en-GB"
                placeholder="dd/mm/yyyy"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
          </div>
        </div>
        </div>
        {/* End of Portfolio configuration section */}

        {/* Backtest Results Section - Shows below the settings */}
        {backtestLoading && (
          <div className="border border-gray-200 rounded-lg bg-white px-6 py-12 mt-6">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-700 font-medium">Running backtest...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </div>
          </div>
        )}

        {backtestError && (
          <div className="border border-red-200 rounded-lg bg-red-50 px-6 py-6 mt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Backtest Failed</h3>
                <p className="text-red-700 mb-4">{backtestError}</p>
                <button
                  onClick={handleBacktest}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  Retry Backtest
                </button>
              </div>
            </div>
          </div>
        )}

        {backtestResults && (
          <div className="mt-6">
            <PortfolioBacktestResults 
              results={backtestResults}
              startDate={startDate}
              endDate={endDate}
              portfolioName={portfolioName}
              strategies={rows.filter(r => r.selected)}
              dteTab={dteTab}
              qtyMultiplier={qtyMultiplier}
              slippage={slippage}
            />
          </div>
        )}
      </div>

      {/* Fixed footer - Always visible at bottom */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 z-10">
        <div className="flex items-center justify-end gap-3 flex-wrap">
          {/* All buttons on the right side */}
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 mr-auto">
              <Check size={16} />
              Saved
            </span>
          )}
          <button
            onClick={handleSaveAsNew}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-colors"
            type="button"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <Copy size={14} />
            </div>
            Save as new
          </button>
          <button
            onClick={handleUpdatePortfolio}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-colors"
            type="button"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <FileEdit size={14} />
            </div>
            Update Portfolio
          </button>
          <button
            onClick={onRecentBacktests}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-green-600 hover:border-green-600 hover:text-white transition-colors"
            type="button"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <Clock size={14} />
            </div>
            Recent Backtests
          </button>
          <button
            onClick={handleBacktest}
            disabled={backtestLoading}
            className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              backtestLoading 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            type="button"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <Play size={14} fill="white" />
            </div>
            {backtestLoading ? 'Running...' : 'Backtest'}
          </button>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-3">
          <Info size={13} />
          Update Portfolio to save any changes to the DTE or Qty Multiplier
        </p>
      </div>

      {/* Save as New Modal */}
      {showSaveAsNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Create New Portfolio</h2>
              <button
                onClick={() => setShowSaveAsNewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Portfolio Name Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  value={saveAsNewName}
                  onChange={(e) => setSaveAsNewName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter portfolio name"
                />
              </div>

              {/* Add Strategy Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Add Strategy</h3>
                </div>

                {/* Tab - My Strategies */}
                <div className="border-b border-gray-200 mb-4">
                  <button className="px-4 py-2 text-sm font-medium text-blue-600 relative">
                    My Strategies
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search Strategy"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </div>

                {/* Select All Checkbox */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                  <input
                    type="checkbox"
                    id="select-all-modal"
                    checked={rows.length > 0 && rows.every(r => r.selected)}
                    onChange={() => {
                      const allSelected = rows.every(r => r.selected);
                      setRows(prev => prev.map(r => ({ ...r, selected: !allSelected })));
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="select-all-modal" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Select all ({rows.length})
                  </label>
                </div>

                {/* Strategies List */}
                <div className="max-h-64 overflow-y-auto">
                  {rows.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No strategies found
                    </div>
                  ) : (
                    rows.map((row) => (
                      <div key={row.id} className="flex items-center gap-2 py-2 hover:bg-gray-50 px-2 rounded">
                        <input
                          type="checkbox"
                          id={`modal-strategy-${row.id}`}
                          checked={row.selected}
                          onChange={() => toggleRowSelected(row.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor={`modal-strategy-${row.id}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                          {row.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowSaveAsNewModal(false)}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveAsNew}
                className="px-6 py-2 rounded-lg font-medium transition-all bg-blue-700 text-white hover:bg-blue-800 active:scale-95 cursor-pointer shadow-sm"
              >
                Create Portfolio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Portfolio Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Edit Portfolio</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Portfolio Name Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  value={editModalName}
                  onChange={(e) => setEditModalName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter portfolio name"
                />
              </div>

              {/* Add Strategy Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Select Strategies</h3>
                </div>

                {/* Tab - My Strategies */}
                <div className="border-b border-gray-200 mb-4">
                  <button className="px-4 py-2 text-sm font-medium text-blue-600 relative">
                    My Strategies
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search Strategy"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </div>

                {/* Select All Checkbox */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                  <input
                    type="checkbox"
                    id="select-all-edit-modal"
                    checked={allSavedStrategies.length > 0 && allSavedStrategies.every(strategy => 
                      rows.some(row => row.name === strategy.name)
                    )}
                    onChange={() => {
                      const allSelected = allSavedStrategies.every(strategy => 
                        rows.some(row => row.name === strategy.name)
                      );
                      
                      if (allSelected) {
                        // Deselect all - clear the rows
                        setRows([]);
                      } else {
                        // Select all - add all strategies that aren't already in rows
                        const newRows = allSavedStrategies.map(strategy => {
                          const existingRow = rows.find(row => row.name === strategy.name);
                          if (existingRow) {
                            return existingRow;
                          }
                          return {
                            id: strategy.id || `temp-${Date.now()}-${strategy.name}`,
                            name: strategy.name,
                            qty: 1,
                            dte: 'DTE',
                            selectedDTEs: [0],
                            weekdays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
                            budgetDays: 'Budget Days',
                            selectedBudgetDays: [],
                            slippage: '0%',
                            selected: true
                          };
                        });
                        setRows(newRows);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="select-all-edit-modal" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Select all ({allSavedStrategies.length})
                  </label>
                </div>

                {/* Strategies List */}
                <div className="max-h-64 overflow-y-auto">
                  {allSavedStrategies.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No saved strategies found
                    </div>
                  ) : (
                    allSavedStrategies.map((strategy) => {
                      // Check if this strategy is currently in the portfolio
                      const isInPortfolio = rows.some(row => row.name === strategy.name);
                      
                      return (
                        <div key={strategy.id || strategy.name} className="flex items-center gap-2 py-2 hover:bg-gray-50 px-2 rounded">
                          <input
                            type="checkbox"
                            id={`edit-modal-strategy-${strategy.id || strategy.name}`}
                            checked={isInPortfolio}
                            onChange={() => {
                              // Toggle strategy in/out of portfolio
                              const existingRow = rows.find(row => row.name === strategy.name);
                              if (existingRow) {
                                // Remove from portfolio
                                setRows(prev => prev.filter(r => r.name !== strategy.name));
                              } else {
                                // Add to portfolio - create a new row from the strategy
                                const newRow = {
                                  id: strategy.id || `temp-${Date.now()}`,
                                  name: strategy.name,
                                  qty: 1,
                                  dte: 'DTE',
                                  selectedDTEs: [0],
                                  weekdays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
                                  budgetDays: 'Budget Days',
                                  selectedBudgetDays: [],
                                  slippage: '0%',
                                  selected: true
                                };
                                setRows(prev => [...prev, newRow]);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <label htmlFor={`edit-modal-strategy-${strategy.id || strategy.name}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                            {strategy.name}
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEdit}
                className="px-6 py-2 rounded-lg font-medium transition-all bg-blue-700 text-white hover:bg-blue-800 active:scale-95 cursor-pointer shadow-sm"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;