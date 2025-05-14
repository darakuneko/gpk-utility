import React, { useEffect, useRef } from "react";

// Custom slider component
export const CustomSlider = ({ id, value = 0, min, max, step, marks, onChange, valueLabelFormat, onChangeStart, onChangeEnd }) => {
  const sliderRef = useRef(null);
  
  // Ensure value is a valid number
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const safeMin = typeof min === 'number' && !isNaN(min) ? min : 0;
  const safeMax = typeof max === 'number' && !isNaN(max) ? max : 100;
  
  // Calculate thumb position safely
  const thumbPosition = `${((safeValue - safeMin) / (safeMax - safeMin)) * 100}%`;
  
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    
    const handleUpdate = () => {
      // Force re-render on update event
      slider.style.setProperty('--thumb-position', thumbPosition);
    };
    
    slider.addEventListener('update', handleUpdate);
    return () => {
      slider.removeEventListener('update', handleUpdate);
    };
  }, [safeValue, safeMin, safeMax, thumbPosition]);
  
  return (
    <div className="relative w-full h-6 px-2">
      <input
        ref={sliderRef}
        type="range"
        id={id}
        value={safeValue}
        min={safeMin}
        max={safeMax}
        step={step}
        onChange={onChange}
        onMouseDown={onChangeStart}
        onTouchStart={onChangeStart}
        onMouseUp={onChangeEnd}
        onTouchEnd={onChangeEnd}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        style={{ '--thumb-position': thumbPosition }}
      />
      <div className="absolute flex justify-between w-full px-2 mt-1 text-xs text-gray-600 dark:text-gray-300">
        {marks.map(mark => (
          <span key={mark.value} style={{left: `${((mark.value - safeMin) / (safeMax - safeMin)) * 100}%`}}>
            {mark.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// Custom switch component
export const CustomSwitch = ({ id, checked = false, onChange, label }) => {
  const switchRef = useRef(null);
  
  // Ensure checked is a boolean
  const safeChecked = checked === true;
  
  useEffect(() => {
    const switchEl = switchRef.current;
    if (!switchEl) return;
    
    const handleUpdate = () => {
      // Force immediate visual feedback
      setTimeout(() => {
        switchEl.checked = safeChecked;
      }, 0);
    };
    
    switchEl.addEventListener('update', handleUpdate);
    return () => {
      switchEl.removeEventListener('update', handleUpdate);
    };
  }, [safeChecked, id]);
  
  const handleOnChange = (e) => {
    if (onChange) {
      onChange(e);
      
      // Force UI update immediately after the onChange event
      setTimeout(() => {
        if (switchRef.current) {
          const event = new Event('update', { bubbles: true });
          switchRef.current.dispatchEvent(event);
        }
      }, 0);
    }
  };
  
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        ref={switchRef}
        type="checkbox"
        id={id}
        checked={safeChecked}
        onChange={handleOnChange}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      {label && <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>}
    </label>
  );
};

// Custom select component
export const CustomSelect = ({ id, value = '', onChange, children, label, options }) => {
  const selectRef = useRef(null);
  
  // Ensure value is a valid string
  const safeValue = value !== undefined && value !== null ? String(value) : '';
  
  useEffect(() => {
    const select = selectRef.current;
    if (!select) return;
    
    const handleUpdate = () => {
      // Ensure UI is updated
      select.value = safeValue;
    };
    
    select.addEventListener('update', handleUpdate);
    return () => {
      select.removeEventListener('update', handleUpdate);
    };
  }, [safeValue]);
  
  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <select
        ref={selectRef}
        id={id}
        value={safeValue}
        onChange={onChange}
        className="block w-full px-3 py-2 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
      >
        {options ? options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        )) : children}
      </select>
    </div>
  );
};

// Hamburger menu icon component
export const HamburgerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);