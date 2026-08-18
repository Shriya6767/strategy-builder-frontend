import React, { useState, useEffect, useRef } from 'react';
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

// `onApply` is called with the raw numeric multiplier the user typed & confirmed
// (in addition to `onChange`, which just tracks the display label "Nx").
// The parent uses `onApply` to push that number down into every strategy row's Qty field.
const QtyMultiplierDropdown = ({ value, onChange, onApply, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('1');
  const dropdownRef = useRef(null);

  // FIX: re-sync the input from the currently-applied `value` every time the
  // popup opens. Previously this only ran once on mount (useState('1')), so
  // reopening the popup after applying e.g. "4x" would still show "1" in the
  // input even though the pill correctly showed "4x" — looked like the value
  // never saved.
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

  // FIX: same issue as QtyMultiplierDropdown above. `inputValue` was only
  // ever initialized once via useState('0') and never updated after Apply,
  // so reopening the popup showed "0" even after you'd applied e.g. "5%".
  // Re-derive it from `value` every time the popup opens.
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

// Popup used when the Overall Portfolio Setting tab-group is on "DTE".
// Mirrors QtyMultiplierDropdown/SlippageDropdown: shows a "Days to expiry"
// select + Apply button (matches the first screenshot), instead of the plain
// DTE/Weekdays/Budget Days option list (second screenshot) that a generic
// PillDropdown would show.
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

// Popup used when the Overall Portfolio Setting tab-group is on "Weekdays".
// Mirrors DTEDropdown: shows toggleable M/T/W/Th/F/Sa/Su circles + Apply
// button (matches the first screenshot), instead of the plain
// DTE/Weekdays/Budget Days option list (second screenshot).
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

// Popup used when the Overall Portfolio Setting tab-group is on "Budget Days".
// Mirrors WeekdaysDropdown/DTEDropdown: a checklist of budget-day options +
// Apply button, instead of the plain DTE/Weekdays/Budget Days option list.
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
  // The list of strategies the user actually picked when creating this
  // portfolio (passed down from Portfolios.jsx). When present, this is the
  // source of truth for the rows — we don't fetch or fall back to
  // localStorage/sample data at all. Only fetch/fallback when the caller
  // doesn't supply this (e.g. this component used standalone).
  strategies: strategiesProp,
  onBack,
  onDeletePortfolio,
  onSaveAsNew,
  onUpdatePortfolio,
  onRunBacktest,
  onRecentBacktests,
  creditsAvailable = 0,
  backtestsRemaining = 25,
  // Accept saved dates from parent
  startDate: savedStartDate,
  endDate: savedEndDate,
}) => {
  const [portfolioName, setPortfolioName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialName);

  // Save as new modal state
  const [showSaveAsNewModal, setShowSaveAsNewModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  // Backtest results state (shown inline below the settings)
  const [backtestResults, setBacktestResults] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestError, setBacktestError] = useState(null);

  const [scopeFilter, setScopeFilter] = useState('All');
  const [qtyMultiplier, setQtyMultiplier] = useState('Qty Multiplier');
  const [dteTab, setDteTab] = useState('Weekdays');
  const [slippage, setSlippage] = useState('Slippage');

  const today = new Date();
  const lastYear = new Date();
  lastYear.setFullYear(today.getFullYear() - 1);
  
  // Initialize dates from saved portfolio data if available, otherwise use defaults
  const [startDate, setStartDate] = useState(savedStartDate || toInputDate(lastYear));
  const [endDate, setEndDate] = useState(savedEndDate || toInputDate(today));

  const [saved, setSaved] = useState(false);
  const dragIndex = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const buildRow = (s, idx) => {
      console.log(`🔧 Building row ${idx} from strategy:`, s);
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
      console.log(`✅ Built row ${idx}:`, row);
      return row;
    };

    // If the parent explicitly told us which strategies belong in this
    // portfolio, use exactly that list and skip fetching entirely — this is
    // what makes "I selected 4 strategies" actually show 4 rows instead of
    // whatever happened to be sitting in the API/localStorage/sample data.
    if (Array.isArray(strategiesProp)) {
      console.log('📥 PortfolioDetails received strategiesProp:', strategiesProp);
      const builtRows = strategiesProp.map(buildRow);
      console.log('✅ Final built rows:', builtRows);
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
        // ignore
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategiesProp]);

  const selectedCount = rows.filter((r) => r.selected).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  const toggleSelectAll = () => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const toggleRowSelected = (id) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  };

  const deleteSelected = () => {
    setRows((prev) => prev.filter((r) => !r.selected));
  };

  // Deletes a single row via the per-row trash icon (independent of the
  // checkbox/"Delete Selected" bulk action above).
  const deleteRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const toggleRowWeekday = (id, dayKey) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, weekdays: { ...r.weekdays, [dayKey]: !r.weekdays[dayKey] } } : r
      )
    );
  };

  // Fires when the Overall Portfolio Setting "Qty Multiplier" popup is applied.
  // Pushes the typed number down into every (or every *selected*, depending on
  // Scope) strategy row's Qty field — this is what makes the row dropdown show
  // "4" after typing 4 and hitting Apply at the top, per the screenshots.
  const applyQtyMultiplier = (multiplier) => {
    setRows((prev) =>
      prev.map((r) => {
        if (scopeFilter === 'Selected Only' && !r.selected) return r;
        return { ...r, qty: multiplier };
      })
    );
  };

  // Fires when the Overall Portfolio Setting "Slippage" popup is applied.
  // Pushes the typed slippage % down into every (or every *selected*)
  // strategy row's budget field, same pattern as applyQtyMultiplier above —
  // this is what makes each row show "2 %" after typing 2 and hitting Apply.
  const applySlippageToRows = (slippageValue) => {
    setRows((prev) =>
      prev.map((r) => {
        if (scopeFilter === 'Selected Only' && !r.selected) return r;
        return { ...r, budgetPct: slippageValue };
      })
    );
  };

  // Fires when the Overall Portfolio Setting "DTE" popup is applied.
  // Pushes the chosen DTE down into every (or every *selected*) strategy
  // row's DTE selection, same pattern as applyQtyMultiplier above.
  const applyDTEToRows = (dte) => {
    setRows((prev) =>
      prev.map((r) => {
        if (scopeFilter === 'Selected Only' && !r.selected) return r;
        return { ...r, selectedDTEs: [dte] };
      })
    );
  };

  // Fires when the Overall Portfolio Setting "Weekdays" popup is applied.
  // Pushes the chosen weekday set down into every (or every *selected*)
  // strategy row's weekdays, same pattern as applyDTEToRows above.
  const applyWeekdaysToRows = (selectedDays) => {
    setRows((prev) =>
      prev.map((r) => {
        if (scopeFilter === 'Selected Only' && !r.selected) return r;
        return { ...r, weekdays: { ...selectedDays } };
      })
    );
  };

  // Fires when the Overall Portfolio Setting "Budget Days" popup is applied.
  const applyBudgetDaysToRows = (selectedBudgetDays) => {
    setRows((prev) =>
      prev.map((r) => {
        if (scopeFilter === 'Selected Only' && !r.selected) return r;
        return { ...r, selectedBudgetDays: [...selectedBudgetDays] };
      })
    );
  };

  const handleDragStart = (index) => (e) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (index) => (e) => {
    e.preventDefault();
  };
  const handleDrop = (index) => (e) => {
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
  };

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
    setShowSaveAsNewModal(true);
  };

  const handleConfirmSaveAsNew = () => {
    // Auto-generate name: original name + " (copy)"
    const newName = `${portfolioName} (copy)`;
    
    // Only include SELECTED strategies (checked ones)
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

  const handleBacktest = async () => {
    setBacktestLoading(true);
    setBacktestError(null);
    setBacktestResults(null);

    try {
      // Filter only selected rows
      const selectedRows = rows.filter(row => row.selected);
      
      if (selectedRows.length === 0) {
        throw new Error('Please select at least one strategy');
      }

      console.log('🔍 Debug - Selected rows before processing:', selectedRows.map(r => ({
        id: r.id,
        type: typeof r.id,
        name: r.name,
        selected: r.selected
      })));

      // Load saved strategies from localStorage to get their original date ranges
      let savedStrategies = [];
      try {
        savedStrategies = JSON.parse(localStorage.getItem('saved_strategies_cards') || '[]');
        console.log('📅 Loaded saved strategies with dates:', savedStrategies);
        console.log('📅 First strategy structure:', savedStrategies[0]);
        console.log('📅 Available fields in first strategy:', savedStrategies[0] ? Object.keys(savedStrategies[0]) : 'No strategies');
      } catch (e) {
        console.warn('Could not load saved strategies from localStorage:', e);
      }

      // Build the payload in the format the API expects
      const payload = {
        portfolio_id: portfolioId,
        aggregate_at_eod: true,
        // Portfolio-level dates - these will be used for ALL strategies
        start_date: startDate,
        end_date: endDate,
        strategy_overrides: selectedRows.map(row => {
          console.log(`📦 Processing strategy "${row.name}" (id: ${row.id})`);

          // Parse strategy_id properly
          let strategyId;
          if (typeof row.id === 'number') {
            strategyId = row.id;
          } else if (typeof row.id === 'string') {
            // Try to extract number from string like "strategy_0" or "48"
            const match = row.id.match(/\d+/);
            strategyId = match ? parseInt(match[0]) : null;
          }

          if (!strategyId || isNaN(strategyId)) {
            console.error('❌ Invalid strategy_id for row:', row);
            throw new Error(`Invalid strategy ID for "${row.name}": ${row.id}`);
          }

          // Determine period_selection based on dteTab
          let period_selection;
          if (dteTab === 'DTE') {
            period_selection = {
              mode: 'dte',
              dte_selected: row.selectedDTEs || [0]
            };
          } else if (dteTab === 'Weekdays') {
            // Convert weekdays object to array of selected day abbreviations
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
          } else {
            // Budget Days mode
            period_selection = {
              mode: 'budget_days',
              budget_days_selected: row.selectedBudgetDays || []
            };
          }

          // ⭐ ALWAYS use portfolio dates for all strategies
          console.log(`📅 Using portfolio dates for strategy "${row.name}": ${startDate} to ${endDate}`);
          
          const strategyOverride = {
            strategy_id: strategyId,
            strategy_name: row.name || 'Untitled',
            version: row.version || 1,
            qty_multiplier: row.qty || 1,
            slippage_percent: row.budgetPct || 0,
            period_selection,
            start_date: startDate,  // ⭐ Use portfolio start date
            end_date: endDate       // ⭐ Use portfolio end date
          };

          console.log(`📦 Final strategy override for "${row.name}":`, strategyOverride);
          
          return strategyOverride;
        })
      };

      console.log('🚀 Running portfolio backtest with payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_URL}/run-portfolio-backtest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || `HTTP ${response.status}`);
      }

      // ⭐ Transform backend response: Convert option types to lowercase for display
      console.log('🔧 [TRANSFORM] Original data received from backend:', data);
      const transformedData = {
        ...data,
        strategies: (data.strategies || []).map(strategy => {
          console.log(`🔧 [TRANSFORM] Processing strategy: ${strategy.strategy_name}`);
          return {
            ...strategy,
            trade_results: (strategy.trade_results || []).map(trade => ({
              ...trade,
              legs: (trade.legs || []).map(leg => {
                const originalOption = leg.option;
                const transformedOption = leg.option ? leg.option.toLowerCase() : leg.option;
                if (originalOption !== transformedOption) {
                  console.log(`🔧 [TRANSFORM] Converted: ${originalOption} → ${transformedOption}`);
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
      console.log('🔧 [TRANSFORM] Transformed data:', transformedData);

      console.log('✅ Backtest results received:', transformedData);
      console.log('📊 Data keys:', Object.keys(transformedData));
      console.log('📊 Data.data keys:', transformedData.data ? Object.keys(transformedData.data) : 'No data.data');
      console.log('📊 Full response structure:', JSON.stringify(transformedData, null, 2));
      setBacktestResults(transformedData);

    } catch (error) {
      console.error('❌ Error running backtest:', error);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleDeletePortfolio = async () => {
    if (!window.confirm(`Delete portfolio "${portfolioName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/delete-portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_id: portfolioId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Portfolio deleted:', data);
      
      // Call the parent's callback to update UI and navigate back
      onDeletePortfolio?.(portfolioId);
    } catch (error) {
      console.error('❌ Error deleting portfolio:', error);
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
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              <Upload size={15} />
              Export
            </button>
            <button
              onClick={() => {
                setNameDraft(portfolioName);
                setEditingName(true);
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
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
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
                {['DTE', 'Weekdays', 'Budget Days'].map((tab) => (
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
              ) : dteTab === 'Weekdays' ? (
                <WeekdaysDropdown onApply={applyWeekdaysToRows} className="w-32" />
              ) : (
                <BudgetDaysDropdown onApply={applyBudgetDaysToRows} className="w-32" />
              )}
            </div>

            <div className="shrink-0 ml-2 flex flex-col gap-1">
              <label className="text-xs text-gray-600">Slippage</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={slippage === 'Slippage' ? '0' : slippage.replace('%', '')}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setSlippage(`${val}%`);
                    applySlippageToRows(val);
                  }}
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
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
            rows.map((row, idx) => {
              // Keep the row Qty select's option list in sync with whatever value
              // the multiplier applied — including numbers outside the default
              // 1/2/3/4/5/10 preset (e.g. someone types 7 into the multiplier).
              const qtyOptions = Array.from(
                new Set(['1', '2', '3', '4', '5', '10', String(row.qty)])
              );

              return (
                <div
                  key={row.id}
                  draggable
                  onDragStart={handleDragStart(idx)}
                  onDragOver={handleDragOver(idx)}
                  onDrop={handleDrop(idx)}
                  className="flex items-center gap-12 px-6 py-5 flex-wrap lg:flex-nowrap hover:bg-gray-50/60 transition-colors min-h-[72px]"
                >
                  <button
                    className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
                    title="Drag to reorder"
                    type="button"
                  >
                    <GripVertical size={18} />
                  </button>

                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggleRowSelected(row.id)}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                  />

                  <div className="min-w-[10rem] mr-23">
                    <p className="font-medium text-gray-900">{row.name}</p>
                    <p className="text-xs text-gray-500">
                      {row.symbol} <span className="mx-1">•</span> {row.strategy_type}
                    </p>
                  </div>

                  <div className="w-32 shrink-0">
                    <PillDropdown
                      value={String(row.qty)}
                      onChange={(v) => updateRow(row.id, { qty: Number(v) })}
                      options={qtyOptions}
                      className="w-full"
                    />
                  </div>

                  {dteTab === 'Weekdays' && (
                    <div className="flex-1 flex items-center justify-center gap-3 shrink-0 px-4 ml-6">
                      {WEEKDAYS.map((d) => {
                        const active = row.weekdays[d.key];
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => toggleRowWeekday(row.id, d.key)}
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
                    </div>
                  )}

                  {dteTab === 'DTE' && (
                    <div className="flex-1 flex justify-center">
                      {/* Single-value dropdown per row, same pattern as the
                          Qty column, instead of a multi-select checklist. */}
                      <PillDropdown
                        value={String(row.selectedDTEs?.[0] ?? 0)}
                        onChange={(v) => updateRow(row.id, { selectedDTEs: [Number(v)] })}
                        options={Array.from({ length: 81 }, (_, i) => String(i))}
                        className="w-36 shrink-0"
                      />
                    </div>
                  )}

                  {dteTab === 'Budget Days' && (
                    <div className="flex-1 flex justify-center">
                      <BudgetDaysMultiSelect
                        selectedBudgetDays={row.selectedBudgetDays || []}
                        onChange={(newBudgetDays) => updateRow(row.id, { selectedBudgetDays: newBudgetDays })}
                        className="w-44 shrink-0"
                      />
                    </div>
                  )}

                  <div className="w-24 shrink-0 flex items-center gap-1.5">
                    <input
                      type="number"
                      value={row.budgetPct}
                      onChange={(e) => updateRow(row.id, { budgetPct: Number(e.target.value) })}
                      className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 h-[38px]"
                    />
                    <span className="text-sm text-gray-500 flex items-center h-[38px]">%</span>
                  </div>

                  <button
                    onClick={() => deleteRow(row.id)}
                    className="text-red-500 hover:text-red-700 transition-colors shrink-0"
                    title="Delete this strategy"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
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
              <h2 className="text-xl font-semibold text-gray-800">Create portfolio: {portfolioName} (copy) (copy)</h2>
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
                  value={`${portfolioName} (copy) (copy)`}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Add Strategy Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Add Strategy</h3>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    + New Strategy
                  </button>
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
    </div>
  );
};

export default Portfolio;