import { useState, useRef, useEffect, forwardRef } from 'react';

// Segmented 24-hour HH:MM time input.
//
// Click (or Tab into) the Hour or Minute segment to select it -- the selected
// segment highlights, just like it does in a native browser time picker.
// While a segment is selected:
//   - Typing digits edits ONLY that segment (the other segment is untouched).
//   - Arrow Up / Arrow Down increments or decrements that segment by 1.
//   - Arrow Left / Arrow Right moves between the Hour and Minute segments.
//   - Backspace resets that segment to "00".
// Both segments always hold a valid two-digit value (Hour 00-23, Minute
// 00-59), so this component can never end up in a half-typed/invalid state.
//
// Props:
//   value:      current "HH:MM" string (controlled, from parent state)
//   onCommit:   (newValue: string) => boolean
//               Called every time a segment change results in a new
//               complete "HH:MM" value. Return `true` to accept the change,
//               or `false` to reject it (e.g. it fails a cross-field
//               check like "Entry Time must be before Exit Time") -- when
//               rejected, this component reverts its own display back to
//               the last value it received via props.
//   disabled:   optional, disables interaction
//   placeholder:optional aria-label prefix, e.g. "Entry Time"

const clampWrap = (num, min, max) => {
  const range = max - min + 1;
  return ((num - min) % range + range) % range + min;
};

const parseValue = (v) => {
  if (v && /^\d{2}:\d{2}$/.test(v)) {
    const [h, m] = v.split(':');
    return { hour: h, minute: m };
  }
  return { hour: '00', minute: '00' };
};

const TimeSegmentInput = forwardRef(({ value, onCommit, disabled = false, placeholder = 'Time', onKeyDown }, ref) => {
  const initial = parseValue(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [activeSegment, setActiveSegment] = useState(null); // 'hour' | 'minute' | null
  const typedBufferRef = useRef(''); // digits typed so far in the active segment during this edit
  const lastCommittedValueRef = useRef(value); // Track last committed value
  const isTypingRef = useRef(false); // Track if actively typing
  const containerRef = useRef(null);

  // Stay in sync with the value coming from the parent, but only update if we're not actively typing
  useEffect(() => {
    if (isTypingRef.current) return; // Don't interrupt active typing
    
    const parsed = parseValue(value);
    const incomingValue = `${parsed.hour}:${parsed.minute}`;
    
    // Always sync from parent when not typing
    setHour(parsed.hour);
    setMinute(parsed.minute);
    lastCommittedValueRef.current = incomingValue;
  }, [value]); // Only depend on value prop, not local state

  const selectSegment = (segment) => {
    if (disabled) return;
    setActiveSegment(segment);
    typedBufferRef.current = ''; // Clear buffer when clicking a segment
    isTypingRef.current = true; // Mark as starting to type
  };

  const revertToLastValue = () => {
    const parsed = parseValue(value);
    setHour(parsed.hour);
    setMinute(parsed.minute);
  };

  const commit = (h, m) => {
    const newValue = `${h}:${m}`;
    lastCommittedValueRef.current = newValue; // Track what we're committing
    isTypingRef.current = false; // Done typing after commit
    const accepted = onCommit ? onCommit(newValue) : true;
    if (accepted === false) {
      revertToLastValue();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    // Allow parent navigation with ArrowLeft when at leftmost segment (hour)
    if (e.key === 'ArrowLeft' && activeSegment === 'hour') {
      if (onKeyDown) {
        onKeyDown(e); // Let parent handle navigation to previous field
      }
      return;
    }
    
    // Allow parent navigation with ArrowRight when at rightmost segment (minute)
    if (e.key === 'ArrowRight' && activeSegment === 'minute') {
      if (onKeyDown) {
        onKeyDown(e); // Let parent handle navigation to next field
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectSegment('hour');
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectSegment('minute');
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && activeSegment === 'hour') {
      e.preventDefault();
      selectSegment('minute');
      return;
    }
    if (e.key === 'Tab' && e.shiftKey && activeSegment === 'minute') {
      e.preventDefault();
      selectSegment('hour');
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      typedBufferRef.current = '';
      if (activeSegment === 'hour') {
        const next = String(clampWrap(parseInt(hour, 10) + delta, 0, 23)).padStart(2, '0');
        setHour(next);
        commit(next, minute);
      } else if (activeSegment === 'minute') {
        const next = String(clampWrap(parseInt(minute, 10) + delta, 0, 59)).padStart(2, '0');
        setMinute(next);
        commit(hour, next);
      }
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      typedBufferRef.current = '';
      if (activeSegment === 'hour') {
        setHour('00');
        commit('00', minute);
      } else if (activeSegment === 'minute') {
        setMinute('00');
        commit(hour, '00');
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

      if (activeSegment === 'hour') {
        if (buffer.length === 1) {
          const asNum = parseInt(buffer, 10);
          if (asNum > 2) {
            // Can't be extended into a valid two-digit hour (>23) --
            // commit immediately as a single digit and move to Minute.
            const h2 = buffer.padStart(2, '0');
            typedBufferRef.current = '';
            setHour(h2);
            commit(h2, minute);
            selectSegment('minute');
          } else {
            typedBufferRef.current = buffer;
            setHour(buffer.padStart(2, '0'));
          }
        } else {
          const clamped = clampWrap(parseInt(buffer, 10), 0, 23);
          const h2 = String(clamped).padStart(2, '0');
          typedBufferRef.current = '';
          setHour(h2);
          commit(h2, minute);
          selectSegment('minute');
        }
      } else if (activeSegment === 'minute') {
        if (buffer.length === 1) {
          const asNum = parseInt(buffer, 10);
          if (asNum > 5) {
            const m2 = buffer.padStart(2, '0');
            typedBufferRef.current = '';
            setMinute(m2);
            commit(hour, m2);
          } else {
            typedBufferRef.current = buffer;
            setMinute(buffer.padStart(2, '0'));
          }
        } else {
          const clamped = clampWrap(parseInt(buffer, 10), 0, 59);
          const m2 = String(clamped).padStart(2, '0');
          typedBufferRef.current = '';
          setMinute(m2);
          commit(hour, m2);
        }
      }
    }
  };

  const handleBlur = (e) => {
    if (!containerRef.current || !containerRef.current.contains(e.relatedTarget)) {
      setActiveSegment(null);
      typedBufferRef.current = '';
      isTypingRef.current = false; // Stop typing on blur
    }
  };

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      role="group"
      aria-label={placeholder}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onFocus={() => { if (!activeSegment) selectSegment('hour'); }}
      onBlur={handleBlur}
      className={[
        'inline-flex items-center px-3 py-2 text-base border rounded-lg font-medium bg-white transition-all duration-200 select-none',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text hover:border-gray-400 hover:shadow-md',
        activeSegment ? 'ring-2 border-transparent' : 'border-gray-300',
      ].join(' ')}
      style={activeSegment ? { ringColor: '#60a5fa', '--tw-ring-color': '#60a5fa' } : {}}
    >
      <span
        onMouseDown={(e) => { e.preventDefault(); selectSegment('hour'); containerRef.current?.focus(); }}
        aria-label={`${placeholder} hour`}
        className={`rounded min-w-[28px] text-center ${activeSegment === 'hour' ? 'text-white' : ''}`}
        style={activeSegment === 'hour' ? { backgroundColor: '#60a5fa' } : {}}
      >
        {hour}
      </span>
      <span>:</span>
      <span
        onMouseDown={(e) => { e.preventDefault(); selectSegment('minute'); containerRef.current?.focus(); }}
        aria-label={`${placeholder} minute`}
        className={`rounded min-w-[28px] text-center ${activeSegment === 'minute' ? 'text-white' : ''}`}
        style={activeSegment === 'minute' ? { backgroundColor: '#60a5fa' } : {}}
      >
        {minute}
      </span>
    </div>
  );
});

TimeSegmentInput.displayName = 'TimeSegmentInput';

export default TimeSegmentInput;