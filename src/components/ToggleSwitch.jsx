import React, { useState, useEffect, useRef } from 'react';

const ToggleSwitch = ({ checked, onChange, id }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState('');
  const isInitialMount = useRef(true);
  const hasStableData = useRef(false);
  const prevChecked = useRef(checked);
  
  useEffect(() => {
    // Skip animation on initial mount to prevent flickering
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevChecked.current = checked;
      // Wait a bit to ensure data has loaded before enabling animations
      setTimeout(() => {
        hasStableData.current = true;
      }, 500);
      return;
    }
    
    // Skip animation if data hasn't stabilized yet (initial data loading)
    if (!hasStableData.current) {
      prevChecked.current = checked;
      return;
    }
    
    // Only animate if checked state actually changed
    if (prevChecked.current !== checked) {
      setIsAnimating(true);
      setAnimationDirection(checked ? 'opening' : 'closing');
      
      // Reset animation flag after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 400);
      
      prevChecked.current = checked;
      return () => clearTimeout(timer);
    }
  }, [checked]);
  
  return (
    <>
      <style>{`
        @keyframes toggleSlideOpen {
          from {
            transform: translateX(0px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          to {
            transform: translateX(24px);
            box-shadow: 0 2px 6px rgba(38, 97, 156, 0.4);
          }
        }
        
        @keyframes toggleSlideClose {
          from {
            transform: translateX(24px);
            box-shadow: 0 2px 6px rgba(38, 97, 156, 0.4);
          }
          to {
            transform: translateX(0px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        }
        
        @keyframes bgColorOpen {
          from {
            background-color: rgb(191, 219, 254);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
          }
          to {
            background: linear-gradient(135deg, #26619C 0%, #2e75b5 100%);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(38, 97, 156, 0.2);
          }
        }
        
        @keyframes bgColorClose {
          from {
            background: linear-gradient(135deg, #26619C 0%, #2e75b5 100%);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(38, 97, 156, 0.2);
          }
          to {
            background-color: rgb(191, 219, 254);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
          }
        }
        
        .toggle-container {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
          cursor: pointer;
        }
        
        .toggle-input {
          display: none;
        }
        
        .toggle-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          background-color: rgb(191, 219, 254);
          border-radius: 9999px;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .toggle-background.animating-open {
          animation: bgColorOpen 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        
        .toggle-background.animating-close {
          animation: bgColorClose 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        
        .toggle-slider {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background-color: white;
          border-radius: 9999px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transform: translateX(0px);
        }
        
        .toggle-slider.animating-open {
          animation: toggleSlideOpen 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        
        .toggle-slider.animating-close {
          animation: toggleSlideClose 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        
        .toggle-slider.state-open {
          transform: translateX(24px);
          box-shadow: 0 2px 6px rgba(38, 97, 156, 0.4);
        }
        
        .toggle-slider.state-close {
          transform: translateX(0px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .toggle-background.state-open {
          background: linear-gradient(135deg, #26619C 0%, #2e75b5 100%);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(38, 97, 156, 0.2);
        }
        
        .toggle-background.state-close {
          background-color: rgb(191, 219, 254);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        }
      `}</style>
      
      <label className="toggle-container">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          className="toggle-input"
        />
        <div className={`toggle-background ${isAnimating ? (animationDirection === 'opening' ? 'animating-open' : 'animating-close') : (checked ? 'state-open' : 'state-close')}`}></div>
        <div className={`toggle-slider ${isAnimating ? (animationDirection === 'opening' ? 'animating-open' : 'animating-close') : (checked ? 'state-open' : 'state-close')}`}></div>
      </label>
    </>
  );
};

export default ToggleSwitch;
