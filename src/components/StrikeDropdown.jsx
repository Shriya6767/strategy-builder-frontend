import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

// Build option list in the order: ITM-20 ... ITM-1, ATM, OTM-1 ... OTM-20
const buildOptions = () => {
  const options = [];
  for (let i = 20; i >= 1; i--) {
    options.push({ value: `itm_${i}`, label: `ITM-${i}` });
  }
  options.push({ value: 'atm', label: 'ATM' });
  for (let i = 1; i <= 20; i++) {
    options.push({ value: `otm_${i}`, label: `OTM-${i}` });
  }
  return options;
};

const STRIKE_OPTIONS = buildOptions();

const StrikeDropdown = ({ value, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const selected = STRIKE_OPTIONS.find((o) => o.value === (value || 'atm')) || STRIKE_OPTIONS.find((o) => o.value === 'atm');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'center' });
      }
    }
  }, [open]);

  return (
    <div className="relative h-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-full flex items-center justify-between px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white font-medium hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
      >
        <span className="text-slate-800">{selected.label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1"
        >
          {STRIKE_OPTIONS.map((opt) => {
            const isActive = opt.value === selected.value;
            return (
              <div
                key={opt.value}
                data-active={isActive}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-700 hover:bg-gray-100'
                }`}
              >
                <span>{opt.label}</span>
                {isActive && <Check size={14} className="text-blue-600" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StrikeDropdown;
