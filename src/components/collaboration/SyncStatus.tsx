import React from 'react';
import { Wifi, WifiOff, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SyncStatusProps {
  isConnected: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastError: string | null;
  lastModifiedBy: string | null;
  lastModifiedAt: Date | null;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Component to display real-time synchronization status
 * Shows connection state, pending operations, and sync errors
 */
export function SyncStatus({
  isConnected,
  isSyncing,
  pendingCount,
  lastError,
  lastModifiedBy,
  lastModifiedAt,
  onRetry,
  className,
  compact = false
}: SyncStatusProps) {
  const getStatusColor = () => {
    if (lastError) return 'text-red-600';
    if (!isConnected) return 'text-gray-400';
    if (isSyncing || pendingCount > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (lastError) return AlertCircle;
    if (!isConnected) return WifiOff;
    if (isSyncing) return RefreshCw;
    if (pendingCount > 0) return Clock;
    return CheckCircle;
  };

  const getStatusText = () => {
    if (lastError) return 'Sync error';
    if (!isConnected) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Synced';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const StatusIcon = getStatusIcon();

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <StatusIcon 
          className={cn(
            'w-3 h-3',
            getStatusColor(),
            isSyncing && 'animate-spin'
          )} 
        />
        {lastError && onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-600 hover:text-red-800 underline"
          >
            retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 p-2 rounded-lg bg-gray-50', className)}>
      <div className="flex items-center gap-2">
        <StatusIcon 
          className={cn(
            'w-4 h-4',
            getStatusColor(),
            isSyncing && 'animate-spin'
          )} 
        />
        <span className={cn('text-sm font-medium', getStatusColor())}>
          {getStatusText()}
        </span>
      </div>

      {/* Connection indicator */}
      <div className="flex items-center gap-1">
        <Wifi className={cn(
          'w-3 h-3',
          isConnected ? 'text-green-500' : 'text-gray-400'
        )} />
        <span className="text-xs text-gray-500">
          {isConnected ? 'online' : 'offline'}
        </span>
      </div>

      {/* Last sync info */}
      {lastModifiedAt && (
        <div className="text-xs text-gray-500">
          {lastModifiedBy && `by ${lastModifiedBy} `}
          {formatTimeAgo(lastModifiedAt)}
        </div>
      )}

      {/* Error message and retry */}
      {lastError && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600 truncate max-w-48">
            {lastError}
          </span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SyncStatus; 