/**
 * NotificationBanner Component
 *
 * Fixed-position banner that appears when exchange rate target is reached.
 * Allows user to review and approve the transfer.
 *
 * Props:
 *  - rate: number - The rate that was reached
 *  - timestamp: Date - When the target rate was achieved
 *  - onReview: () => void - Callback when user clicks "Review Transfer"
 *  - onDismiss: () => void - Callback when user dismisses the banner
 */

import React from 'react';
import { Bell, TrendingUp, X } from 'lucide-react';

const NotificationBanner = ({
  rate = 84.25,
  timestamp = new Date(),
  onReview,
  onDismiss,
}) => {
  const timeString = timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="fixed bottom-4 right-4 max-w-sm w-full bg-white border-l-4 border-green-600 rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 z-50">
      {/* Content */}
      <div className="p-4 flex gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">Target Rate Reached! 🎉</h3>
          <p className="text-sm text-gray-600 mt-1">
            USD/INR is now at ₹{rate.toFixed(2)} — your target rate has been reached.
          </p>
          <p className="text-xs text-gray-500 mt-1">{timeString}</p>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={onReview}
              className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
            >
              Review Transfer
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default NotificationBanner;
