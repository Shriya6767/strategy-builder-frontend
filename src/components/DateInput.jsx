import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Custom date input component that displays dates in dd/mm/yyyy format
 * Supports BOTH manual keyboard input AND calendar selection
 */
const DateInput = ({ value, onChange, className, placeholder = 'dd/mm/yyyy' }) => {
  const containerRef = useRef(null);
  const [displayValue, setDisplayValue] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };
    
    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCalendar]);

  // Update display value when prop value changes
  useEffect(() => {
    if (!value) {
      setDisplayValue('');
      return;
    }
    // Convert yyyy-mm-dd to dd/mm/yyyy for display
    const [year, month, day] = value.split('-');
    if (day && month && year) {
      setDisplayValue(`${day}/${month}/${year}`);
    }
  }, [value]);

  // Handle text input changes (user typing manually)
  const handleTextChange = (e) => {
    let input = e.target.value;
    
    // Remove any non-numeric characters except /
    input = input.replace(/[^\d/]/g, '');
    
    // Parse the input to enforce strict format
    const parts = input.split('/');
    let formattedInput = '';
    
    // Day (dd) - exactly 2 digits
    if (parts[0]) {
      const day = parts[0].slice(0, 2); // Limit to 2 digits
      formattedInput = day;
      
      // Auto-add slash after 2 digits
      if (day.length === 2 && parts.length === 1) {
        formattedInput += '/';
      }
    }
    
    // Month (mm) - exactly 2 digits, validate 01-12
    if (parts.length >= 2) {
      formattedInput += '/';
      let month = parts[1].slice(0, 2); // Limit to 2 digits
      
      // Validate month as user types
      if (month.length === 2) {
        const monthNum = parseInt(month, 10);
        // If month is invalid (>12), cap it at 12
        if (monthNum > 12) {
          month = '12';
        } else if (monthNum === 0) {
          month = '01';
        }
      }
      
      formattedInput += month;
      
      // Auto-add slash after 2 digits
      if (month.length === 2 && parts.length === 2) {
        formattedInput += '/';
      }
    }
    
    // Year (yyyy) - exactly 4 digits
    if (parts.length >= 3) {
      if (!formattedInput.endsWith('/')) {
        formattedInput += '/';
      }
      const year = parts[2].slice(0, 4); // Limit to 4 digits
      formattedInput += year;
    }
    
    setDisplayValue(formattedInput);
    
    // If complete date (dd/mm/yyyy with exact lengths), validate and convert
    if (formattedInput.length === 10) {
      const dateparts = formattedInput.split('/');
      if (dateparts.length === 3) {
        const day = dateparts[0];
        const month = dateparts[1];
        const year = dateparts[2];
        
        // Ensure exact lengths: dd (2), mm (2), yyyy (4)
        if (day.length === 2 && month.length === 2 && year.length === 4) {
          // Validate day and month ranges
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          
          if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            // Validate date object
            const dateObj = new Date(isoDate);
            if (!isNaN(dateObj.getTime()) && 
                dateObj.getFullYear() === yearNum && 
                dateObj.getMonth() + 1 === monthNum && 
                dateObj.getDate() === dayNum) {
              onChange({ target: { value: isoDate } });
            }
          }
        }
      }
    } else if (formattedInput.length === 0) {
      // Clear the date if input is empty
      onChange({ target: { value: '' } });
    }
  };

  // Handle date selection from calendar
  const handleDateSelect = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    
    setDisplayValue(`${day}/${month}/${year}`);
    onChange({ target: { value: isoDate } });
    setShowCalendar(false);
  };

  // Generate calendar days
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Generate year range (2022 to 2025)
  const years = [2022, 2023, 2024, 2025];

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value, 10);
    setCurrentMonth(new Date(currentMonth.getFullYear(), newMonth, 1));
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value, 10);
    setCurrentMonth(new Date(newYear, currentMonth.getMonth(), 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const clearDate = () => {
    setDisplayValue('');
    onChange({ target: { value: '' } });
    setShowCalendar(false);
  };

  const isSelectedDate = (date) => {
    if (!date || !value) return false;
    const [year, month, day] = value.split('-');
    return date.getDate() === parseInt(day, 10) &&
           date.getMonth() === parseInt(month, 10) - 1 &&
           date.getFullYear() === parseInt(year, 10);
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Visible text input with dd/mm/yyyy format - allows manual typing */}
      <input
        type="text"
        value={displayValue}
        onChange={handleTextChange}
        placeholder={placeholder}
        className={className}
        maxLength={10}
        autoComplete="off"
      />
      
      {/* Calendar icon - clickable to open date picker */}
      <div 
        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer z-10 pointer-events-auto"
        onClick={() => setShowCalendar(!showCalendar)}
        title="Open calendar"
      >
        <Calendar size={18} className="text-gray-400 hover:text-blue-500 transition-colors" />
      </div>
      
      {/* Custom Calendar Dropdown - positioned below the input */}
      {showCalendar && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 w-80">
          {/* Month/Year Selectors with Navigation */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              type="button"
              title="Previous month"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            
            {/* Month Dropdown */}
            <select
              value={currentMonth.getMonth()}
              onChange={handleMonthChange}
              className="px-2 py-1.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
            >
              {monthNamesShort.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
            
            {/* Year Dropdown */}
            <select
              value={currentMonth.getFullYear()}
              onChange={handleYearChange}
              className="px-2 py-1.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            
            <button
              onClick={goToNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              type="button"
              title="Next month"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
          
          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(dayName => (
              <div key={dayName} className="text-center text-xs font-medium text-gray-500 py-1">
                {dayName}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {days.map((date, index) => (
              <button
                key={index}
                type="button"
                onClick={() => date && handleDateSelect(date)}
                disabled={!date}
                className={`
                  p-2 text-sm rounded transition-all
                  ${!date ? 'invisible' : ''}
                  ${isSelectedDate(date) ? 'bg-blue-500 text-white font-semibold hover:bg-blue-600' : ''}
                  ${isToday(date) && !isSelectedDate(date) ? 'bg-blue-100 text-blue-600 font-medium hover:bg-blue-200' : ''}
                  ${date && !isSelectedDate(date) && !isToday(date) ? 'hover:bg-gray-100 text-gray-700' : ''}
                `}
              >
                {date ? date.getDate() : ''}
              </button>
            ))}
          </div>
          
          {/* Footer with Clear and Today buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <button
              onClick={clearDate}
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Clear
            </button>
            <button
              onClick={goToToday}
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateInput;
