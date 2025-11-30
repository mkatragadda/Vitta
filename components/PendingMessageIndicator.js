import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';

/**
 * PendingMessageIndicator Component
 * Phase 4: Shows pending status for queued messages
 *
 * Displays:
 * - "Queued" badge on messages waiting to sync
 * - Retry hint for failed messages
 * - Visual distinction between pending and sent messages
 */
const PendingMessageIndicator = ({
  message = {},
  isPending = false,
  isFailed = false,
  retryCount = 0,
  onRetry = null
}) => {
  if (!isPending && !isFailed) {
    return null;
  }

  return (
    <div className="relative inline-block">
      {/* Message content */}
      <div className={`px-3 py-2 rounded-lg ${
        isFailed ? 'bg-red-50 border border-red-200' : 'bg-gray-100 border border-gray-300'
      }`}>
        <p className={`text-sm ${isFailed ? 'text-red-700' : 'text-gray-700'}`}>
          {message.content || message.text || 'Message'}
        </p>
      </div>

      {/* Status badge */}
      <div className="absolute bottom-0 right-0 transform translate-y-1/2 translate-x-1/2">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          isFailed
            ? 'bg-red-500 text-white'
            : 'bg-yellow-500 text-white'
        }`}>
          {isFailed ? (
            <>
              <AlertCircle className="w-3 h-3" />
              <span>Failed</span>
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              <span>Queued</span>
            </>
          )}
        </div>
      </div>

      {/* Retry button for failed messages */}
      {isFailed && onRetry && (
        <button
          onClick={onRetry}
          className="absolute -bottom-6 right-0 text-xs text-red-600 hover:text-red-800 font-medium underline transition"
        >
          Retry
        </button>
      )}

      {/* Help text */}
      {isPending && !isFailed && (
        <div className="text-xs text-gray-500 mt-1">
          📤 Message queued • Will send when back online
        </div>
      )}
    </div>
  );
};

export default PendingMessageIndicator;
