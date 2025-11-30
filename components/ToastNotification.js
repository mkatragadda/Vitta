import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Cloud } from 'lucide-react';

/**
 * ToastNotification Component
 * Phase 4: Shows transient notifications for sync events
 *
 * Types:
 * - success: Operation completed successfully
 * - error: Operation failed
 * - info: General information
 * - warning: Warning message
 */
const ToastNotification = ({
  id = '',
  type = 'info', // success, error, info, warning
  message = '',
  duration = 4000, // Auto-dismiss after 4 seconds
  onDismiss = null,
  action = null // { label: string, onClick: function }
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss after duration
  useEffect(() => {
    if (duration === 0) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!isVisible) {
    return null;
  }

  // Determine styling based on type
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-500',
          icon: CheckCircle
        };
      case 'error':
        return {
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-500',
          icon: AlertCircle
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-500',
          icon: AlertCircle
        };
      default:
        return {
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-500',
          icon: Cloud
        };
    }
  };

  const styles = getStyles();
  const IconComponent = styles.icon;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`${styles.bgColor} border rounded-lg px-4 py-3 flex items-start gap-3 max-w-sm shadow-lg`}>
        {/* Icon */}
        <div className="flex-shrink-0 pt-0.5">
          {type === 'info' && <Cloud className={`${styles.iconColor} w-5 h-5 animate-pulse`} />}
          {type !== 'info' && <IconComponent className={`${styles.iconColor} w-5 h-5`} />}
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className={`${styles.textColor} text-sm font-medium`}>
            {message}
          </p>

          {/* Action button */}
          {action && (
            <button
              onClick={action.onClick}
              className={`${styles.textColor} text-xs font-medium mt-2 hover:opacity-75 transition underline`}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => {
            setIsVisible(false);
            onDismiss?.();
          }}
          className={`flex-shrink-0 ${styles.textColor} hover:opacity-50 transition`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;

/**
 * ToastContainer Component
 * Manages multiple toast notifications
 */
export const ToastContainer = ({ toasts = [], onDismiss = null }) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 space-y-2 z-50 max-w-md">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          {...toast}
          onDismiss={() => onDismiss?.(toast.id)}
        />
      ))}
    </div>
  );
};
