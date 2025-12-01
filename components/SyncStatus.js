import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Clock, Loader, X } from 'lucide-react';

/**
 * SyncStatus Component
 * Phase 4: Detailed view of sync operation status
 *
 * Shows:
 * - List of pending operations with status
 * - Sync progress indicators
 * - Individual operation success/failure status
 * - Clear button for completed operations
 */
const SyncStatus = ({
  operations = [], // Array of { id, type, status, timestamp, error? }
  isCollapsed = false,
  onCollapse = null,
  onClearCompleted = null
}) => {
  const [expanded, setExpanded] = useState(!isCollapsed);

  const pendingCount = operations.filter(op => op.status === 'pending').length;
  const syncingCount = operations.filter(op => op.status === 'syncing').length;
  const successCount = operations.filter(op => op.status === 'success').length;
  const failedCount = operations.filter(op => op.status === 'failed').length;

  if (operations.length === 0) {
    return null;
  }

  const getOperationIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'syncing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getOperationLabel = (type) => {
    const typeLabels = {
      'message': '💬 Message',
      'card_add': '➕ Add Card',
      'card_update': '✏️ Update Card',
      'card_delete': '❌ Delete Card'
    };
    return typeLabels[type] || type;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-gray-600';
      case 'syncing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 max-h-96 bg-white rounded-lg shadow-lg border border-gray-200 z-30">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Sync Queue</h3>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {operations.length}
          </span>
        </div>
        <button
          onClick={() => {
            setExpanded(!expanded);
            onCollapse?.(!expanded);
          }}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {/* Stats */}
      {expanded && (
        <>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 grid grid-cols-4 gap-2">
            {pendingCount > 0 && (
              <div className="text-center">
                <div className="text-xs text-gray-600">Pending</div>
                <div className="text-sm font-semibold text-gray-700">{pendingCount}</div>
              </div>
            )}
            {syncingCount > 0 && (
              <div className="text-center">
                <div className="text-xs text-blue-600">Syncing</div>
                <div className="text-sm font-semibold text-blue-700">{syncingCount}</div>
              </div>
            )}
            {successCount > 0 && (
              <div className="text-center">
                <div className="text-xs text-green-600">Done</div>
                <div className="text-sm font-semibold text-green-700">{successCount}</div>
              </div>
            )}
            {failedCount > 0 && (
              <div className="text-center">
                <div className="text-xs text-red-600">Failed</div>
                <div className="text-sm font-semibold text-red-700">{failedCount}</div>
              </div>
            )}
          </div>

          {/* Operations List */}
          <div className="max-h-64 overflow-y-auto">
            {operations.map((op) => (
              <div
                key={op.id}
                className={`px-4 py-2 border-b border-gray-100 flex items-start gap-3 ${
                  op.status === 'success' ? 'bg-green-50' : op.status === 'failed' ? 'bg-red-50' : ''
                }`}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 pt-0.5">
                  {getOperationIcon(op.status)}
                </div>

                {/* Operation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {getOperationLabel(op.type)}
                    </span>
                    <span className={`text-xs font-medium ${getStatusColor(op.status)}`}>
                      {op.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(op.timestamp).toLocaleTimeString()}
                  </div>
                  {op.error && (
                    <div className="text-xs text-red-600 mt-1 line-clamp-1">
                      {op.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Clear Completed Button */}
          {successCount > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => onClearCompleted?.()}
                className="w-full py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition"
              >
                Clear Completed
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SyncStatus;
