import React, { useState, useEffect } from 'react';

const BackgroundLoadingScreen = ({ isVisible, duration = 60, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isVisible) {
      setTimeLeft(duration);
      setProgress(100);
      return;
    }

    setTimeLeft(duration);
    setProgress(100);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        const newProgress = (newTime / duration) * 100;
        setProgress(newProgress);

        if (newTime <= 0) {
          clearInterval(interval);
          if (onComplete) {
            onComplete();
          }
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Large Blue Filled Circle with Counter */}
        <div className="relative w-80 h-80">
          {/* Filled blue circle */}
          <svg className="absolute inset-0 w-full h-full">
            <circle
              cx="160"
              cy="160"
              r="140"
              fill="#0ea5e9"
              opacity="0.9"
            />
          </svg>

          {/* Counter in center - white text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl font-bold text-white">{timeLeft}</div>
              <div className="text-white text-sm mt-2 opacity-75">seconds remaining</div>
            </div>
          </div>
        </div>

        {/* Optional loading text */}
        <div className="text-center mt-4">
          <p className="text-gray-700 font-medium">Processing backtest...</p>
        </div>
      </div>
    </div>
  );
};

export default BackgroundLoadingScreen;
