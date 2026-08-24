import { useState, useRef, useEffect, forwardRef } from 'react';

// Segmented DD/MM/YYYY date input with SINGLE CLICK selection
// Click any segment (DD, MM, YYYY) to select and highlight it

const clampWrap = (num, min, max) => {
  const range = max - min + 1;
  return ((num - min) % range + range) % range + min;
};

const parseValue = (v) => {
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [year, month, day] = v.split('-');
    return { day, month, year };
  }
  return { day: 'DD', month: 'MM', year: 'YYYY' };
};

const DateSegmentInput = forwardRef(({ value, onCommit, onKeyDown, disabled = false, placeholder = 'Date' }, ref) => {
  const initial = parseValue(value);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [activeSegment, setActiveSegment] = useState(null); // 'day' | 'month' | 'year' | null
  const typedBufferRef = useRef('');
  const lastCommittedValueRef = useRef(value);
  const isTypingRef = useRef(false);
  const containerRef = useRef(null);

  // Merge internal ref with forwarded ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(containerRef.current);
      } else {
        ref.current = containerRef.current;
      }
    }
  }, [ref]);

  // Stay in sync with parent value when not typing
  useEffect(() => {
    if (isTypingRef.current) return;
    
    const parsed = parseValue(value);
    setDay(parsed.day);
    setMonth(parsed.month);
    setYear(parsed.year);
    lastCommittedValueRef.current = value;
  }, [value]);

  const selectSegment = (segment) => {
    if (disabled) return;
    setActiveSegment(segment);
    typedBufferRef.current = '';
    isTypingRef.current = true;
  };

  const revertToLastValue = () => {
    const parsed = parseValue(value);
    setDay(parsed.day);
    setMonth(parsed.month);
    setYear(parsed.year);
  };

  const commit = (d, m, y) => {
    // Validate and format as YYYY-MM-DD
    if (d === 'DD' || m === 'MM' || y === 'YYYY') return;
    
    const dayNum = parseInt(d, 10);
    const monthNum = parseInt(m, 10);
    const yearNum = parseInt(y, 10);
    
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 2000 || yearNum > 2100) {
      revertToLastValue();
      return;
    }
    
    const newValue = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    lastCommittedValueRef.current = newValue;
    isTypingRef.current = false;
    
    const accepted = onCommit ? onCommit(newValue) : true;
    if (accepted === false) {
      revertToLastValue();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    // Handle arrow keys for navigation between segments or fields
    if (e.key === 'ArrowLeft') {
      if (!activeSegment || activeSegment === 'day') {
        // At the leftmost segment or no segment active - allow parent navigation
        if (onKeyDown) {
          onKeyDown(e);
        }
        return;
      }
      e.preventDefault();
      if (activeSegment === 'month') selectSegment('day');
      else if (activeSegment === 'year') selectSegment('month');
      return;
    }
    
    if (e.key === 'ArrowRight') {
      if (!activeSegment || activeSegment === 'year') {
        // At the rightmost segment or no segment active - allow parent navigation
        if (onKeyDown) {
          onKeyDown(e);
        }
        return;
      }
      e.preventDefault();
      if (activeSegment === 'day') selectSegment('month');
      else if (activeSegment === 'month') selectSegment('year');
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (activeSegment === 'day') selectSegment('month');
      else if (activeSegment === 'month') selectSegment('year');
      return;
    }
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      if (activeSegment === 'month') selectSegment('day');
      else if (activeSegment === 'year') selectSegment('month');
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      typedBufferRef.current = '';
      if (activeSegment === 'day') {
        setDay('DD');
      } else if (activeSegment === 'month') {
        setMonth('MM');
      } else if (activeSegment === 'year') {
        setYear('YYYY');
      }
      return;
    }
    if (e.key === 'Enter' || e.key === 'Escape') {
      containerRef.current?.blur();
      return;
    }

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const digit = e.key;
      const buffer = typedBufferRef.current + digit;

      if (activeSegment === 'day') {
        if (buffer.length === 1) {
          const asNum = parseInt(buffer, 10);
          if (asNum > 3) {
            const d2 = buffer.padStart(2, '0');
            typedBufferRef.current = '';
            setDay(d2);
            commit(d2, month, year);
            selectSegment('month');
          } else {
            typedBufferRef.current = buffer;
            setDay(buffer.padStart(2, '0'));
          }
        } else {
          const clamped = clampWrap(parseInt(buffer, 10), 1, 31);
          const d2 = String(clamped).padStart(2, '0');
          typedBufferRef.current = '';
          setDay(d2);
          commit(d2, month, year);
          selectSegment('month');
        }
      } else if (activeSegment === 'month') {
        if (buffer.length === 1) {
          const asNum = parseInt(buffer, 10);
          if (asNum > 1) {
            const m2 = buffer.padStart(2, '0');
            typedBufferRef.current = '';
            setMonth(m2);
            commit(day, m2, year);
            selectSegment('year');
          } else {
            typedBufferRef.current = buffer;
            setMonth(buffer.padStart(2, '0'));
          }
        } else {
          const clamped = clampWrap(parseInt(buffer, 10), 1, 12);
          const m2 = String(clamped).padStart(2, '0');
          typedBufferRef.current = '';
          setMonth(m2);
          commit(day, m2, year);
          selectSegment('year');
        }
      } else if (activeSegment === 'year') {
        typedBufferRef.current = buffer;
        
        if (buffer.length < 4) {
          setYear(buffer.padStart(4, '0'));
        } else {
          const yearNum = parseInt(buffer, 10);
          const y4 = String(clampWrap(yearNum, 2000, 2100)).padStart(4, '0');
          typedBufferRef.current = '';
          setYear(y4);
          commit(day, month, y4);
        }
      }
    }
  };

  const handleBlur = (e) => {
    if (!containerRef.current || !containerRef.current.contains(e.relatedTarget)) {
      setActiveSegment(null);
      typedBufferRef.current = '';
      isTypingRef.current = false;
    }
  };

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={placeholder}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onFocus={() => { if (!activeSegment) selectSegment('day'); }}
      onBlur={handleBlur}
      className={[
        'inline-flex items-center px-4 py-2.5 text-base border rounded-2xl font-medium bg-white transition-all duration-200 select-none min-w-[140px] justify-center',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text hover:border-gray-400 hover:shadow-md',
        activeSegment ? 'ring-2 border-transparent' : 'border-gray-300',
      ].join(' ')}
      style={activeSegment ? { '--tw-ring-color': '#60a5fa' } : {}}
    >
      {/* DD segment - SINGLE CLICK to select */}
      <span
        onClick={() => { selectSegment('day'); containerRef.current?.focus(); }}
        aria-label={`${placeholder} day`}
        className={`px-0.5 rounded min-w-[24px] text-center cursor-pointer ${activeSegment === 'day' ? 'text-white' : day === 'DD' ? 'text-gray-400' : ''}`}
        style={activeSegment === 'day' ? { backgroundColor: '#60a5fa' } : {}}
      >
        {day}
      </span>
      <span className="text-gray-400">/</span>
      {/* MM segment - SINGLE CLICK to select */}
      <span
        onClick={() => { selectSegment('month'); containerRef.current?.focus(); }}
        aria-label={`${placeholder} month`}
        className={`px-0.5 rounded min-w-[24px] text-center cursor-pointer ${activeSegment === 'month' ? 'text-white' : month === 'MM' ? 'text-gray-400' : ''}`}
        style={activeSegment === 'month' ? { backgroundColor: '#60a5fa' } : {}}
      >
        {month}
      </span>
      <span className="text-gray-400">/</span>
      {/* YYYY segment - SINGLE CLICK to select */}
      <span
        onClick={() => { selectSegment('year'); containerRef.current?.focus(); }}
        aria-label={`${placeholder} year`}
        className={`px-0.5 rounded min-w-[40px] text-center cursor-pointer ${activeSegment === 'year' ? 'text-white' : year === 'YYYY' ? 'text-gray-400' : ''}`}
        style={activeSegment === 'year' ? { backgroundColor: '#60a5fa' } : {}}
      >
        {year}
      </span>
    </div>
  );
});

DateSegmentInput.displayName = 'DateSegmentInput';

export default DateSegmentInput;
