import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, AlertCircle } from 'lucide-react';

/**
 * OfflineIndicator Component
 * Phase 4: Displays offline/online status and sync state
 *
 * Shows:
 * - Online/offline status with icon
 * - Number of pending operations
 * - Sync progress
 * - Auto-hide when online with no pending operations
 */
const OfflineIndicator = ({
  isOnline = true,
  queueLength = 0,
  syncStatus = 'idle', // idle, syncing, error
  lastSyncTime = null,
  onRetry = null
}) => {
  const [isVisible, setIsVisible] = useState(!isOnline || queueLength > 0);

  // Update visibility based on state
  useEffect(() => {
    // Show indicator if offline or has pending operations
    const shouldShow = !isOnline || queueLength > 0;
    setIsVisible(shouldShow);

    // Auto-hide after 3 seconds if online and no pending operations
    if (isOnline && queueLength === 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, queueLength]);

  if (!isVisible) {
    return null;
  }

  // Determine colors and icons based on state
  const getStatusStyles = () => {
    if (!isOnline) {
      return {
        bgColor: 'bg-red-50 border-red-200',
        textColor: 'text-red-700',
        iconColor: 'text-red-500',
        icon: WifiOff,
        label: 'Offline'
      };
    }

    if (syncStatus === 'syncing') {
      return {
        bgColor: 'bg-blue-50 border-blue-200',
        textColor: 'text-blue-700',
        iconColor: 'text-blue-500',
        icon: Cloud,
        label: 'Syncing...'
      };
    }

    if (syncStatus === 'error') {
      return {
        bgColor: 'bg-orange-50 border-orange-200',
        textColor: 'text-orange-700',
        iconColor: 'text-orange-500',
        icon: AlertCircle,
        label: 'Sync Failed'
      };
    }

    return {
      bgColor: 'bg-green-50 border-green-200',
      textColor: 'text-green-700',
      iconColor: 'text-green-500',
      icon: Wifi,
      label: 'Online'
    };
  };

  const styles = getStatusStyles();
  const IconComponent = styles.icon;

  return (
    <div className={`fixed top-4 right-4 max-w-xs z-40 animate-in fade-in slide-in-from-top-2`}>
      <div className={`${styles.bgColor} border rounded-lg px-4 py-3 flex items-start gap-3 shadow-md`}>
        {/* Icon */}
        <div className="flex-shrink-0 pt-0.5">
          {syncStatus === 'syncing' ? (
            <Cloud className={`${styles.iconColor} w-5 h-5 animate-pulse`} />
          ) : (
            <IconComponent className={`${styles.iconColor} w-5 h-5`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className={`${styles.textColor} font-semibold text-sm`}>
            {!isOnline ? 'You\'re Offline' : styles.label}
          </div>

          {/* Status message */}
          <div className={`${styles.textColor} text-xs mt-1 opacity-90`}>
            {!isOnline ? (
              <>Changes will sync when you&apos;re back online</>
            ) : syncStatus === 'syncing' ? (
              <>Syncing {queueLength} pending operations...</>
            ) : syncStatus === 'error' ? (
              <>Failed to sync. Will retry automatically</>
            ) : queueLength > 0 ? (
              <>{queueLength} {queueLength === 1 ? 'operation' : 'operations'} synced</>
            ) : (
              <>All changes synced</>
            )}
          </div>

          {/* Queue status */}
          {queueLength > 0 && (
            <div className={`${styles.textColor} text-xs mt-2 font-medium`}>
              📤 {queueLength} pending
            </div>
          )}

          {/* Last sync time */}
          {lastSyncTime && isOnline && syncStatus !== 'syncing' && (
            <div className={`${styles.textColor} text-xs mt-1 opacity-75`}>
              Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Retry button */}
        {syncStatus === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className={`flex-shrink-0 px-2 py-1 mt-0.5 text-xs font-medium ${styles.textColor} hover:opacity-75 transition`}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
