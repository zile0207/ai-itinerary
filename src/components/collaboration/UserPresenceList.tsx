import React from 'react';
import { UserPresence } from '@/lib/socket/client';
import { UserAvatar } from './UserAvatar';
import { cn } from '@/lib/utils';
import { Users, Wifi, WifiOff } from 'lucide-react';

interface UserPresenceListProps {
  users: UserPresence[];
  currentUserId?: string;
  isConnected: boolean;
  showHeader?: boolean;
  layout?: 'horizontal' | 'vertical';
  maxVisible?: number;
  className?: string;
}

/**
 * Component to display list of active users with presence indicators
 */
export function UserPresenceList({
  users,
  currentUserId,
  isConnected,
  showHeader = true,
  layout = 'horizontal',
  maxVisible = 5,
  className,
}: UserPresenceListProps) {
  // Filter out current user and sort by status
  const otherUsers = users
    .filter(user => user.id !== currentUserId)
    .sort((a, b) => {
      // Sort by status: active > idle > away
      const statusOrder = { active: 0, idle: 1, away: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, otherUsers.length - maxVisible);
  const activeCount = otherUsers.filter(u => u.status === 'active').length;

  if (!isConnected) {
    return (
      <div className={cn('flex items-center gap-2 text-gray-500', className)}>
        <WifiOff className="w-4 h-4" />
        <span className="text-sm">Disconnected</span>
      </div>
    );
  }

  if (otherUsers.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-gray-500', className)}>
        <Users className="w-4 h-4" />
        <span className="text-sm">You're the only one here</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showHeader && (
        <div className="flex items-center gap-1 text-gray-600">
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium">
            {activeCount} active
          </span>
        </div>
      )}

      <div
        className={cn(
          'flex gap-1',
          layout === 'vertical' && 'flex-col',
          layout === 'horizontal' && 'flex-row'
        )}
      >
        {visibleUsers.map(user => (
          <div key={user.id} className="group relative">
            <UserAvatar
              user={user}
              size="sm"
              showStatus={true}
              showName={layout === 'vertical'}
            />
            
            {/* Tooltip for horizontal layout */}
            {layout === 'horizontal' && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <div className="text-center">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-gray-300 capitalize">{user.status}</div>
                  {user.isTyping && user.typingArea && (
                    <div className="text-blue-300">typing in {user.typingArea}</div>
                  )}
                  {user.focusArea && !user.isTyping && (
                    <div className="text-gray-400">viewing {user.focusArea}</div>
                  )}
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        ))}

        {hiddenCount > 0 && (
          <div className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full text-xs font-medium text-gray-600">
            +{hiddenCount}
          </div>
        )}
      </div>

      {/* Connection indicator */}
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-gray-500">live</span>
      </div>
    </div>
  );
}

/**
 * Compact version for showing in headers/toolbars
 */
export function CompactUserPresence({
  users,
  currentUserId,
  isConnected,
  className,
}: Pick<UserPresenceListProps, 'users' | 'currentUserId' | 'isConnected' | 'className'>) {
  const otherUsers = users.filter(user => user.id !== currentUserId);
  const activeCount = otherUsers.filter(u => u.status === 'active').length;

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <div className="flex -space-x-1">
        {otherUsers.slice(0, 3).map(user => (
          <UserAvatar
            key={user.id}
            user={user}
            size="sm"
            showStatus={true}
            className="ring-2 ring-white"
          />
        ))}
        {otherUsers.length > 3 && (
          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 ring-2 ring-white">
            +{otherUsers.length - 3}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1 text-gray-600">
        {isConnected ? (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>{activeCount} online</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span>offline</span>
          </>
        )}
      </div>
    </div>
  );
} 