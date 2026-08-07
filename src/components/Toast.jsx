import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

/**
 * Toast notification component
 * Shows success, error, or info messages with auto-dismiss
 */
const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} className="text-green-600" />;
      case 'error':
        return <XCircle size={24} className="text-red-600" />;
      case 'info':
        return <AlertCircle size={24} className="text-blue-600" />;
      default:
        return <CheckCircle size={24} className="text-green-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-green-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-lg border-2 shadow-lg ${getBackgroundColor()} min-w-[320px]`}>
        {getIcon()}
        <p className={`flex-1 font-semibold ${getTextColor()}`}>{message}</p>
        <button
          onClick={onClose}
          className={`p-1 hover:bg-white rounded transition-colors ${getTextColor()}`}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
