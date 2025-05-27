import React from 'react';
import { UserPresence } from '@/lib/socket/client';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  user: UserPresence;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showName?: boolean;
  className?: string;
}

const statusColors = {
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  away: 'bg-gray-500',
};

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

const statusSizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

/**
 * User avatar component with presence status indicator
 */
export function UserAvatar({
  user,
  size = 'md',
  showStatus = true,
  showName = false,
  className,
}: UserAvatarProps) {
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className={cn(
              'rounded-full object-cover border-2 border-white shadow-sm',
              sizeClasses[size]
            )}
          />
        ) : (
          <div
            className={cn(
              'rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium border-2 border-white shadow-sm',
              sizeClasses[size]
            )}
          >
            {initials}
          </div>
        )}
        
        {showStatus && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white',
              statusColors[user.status],
              statusSizeClasses[size]
            )}
            title={`${user.name} is ${user.status}`}
          />
        )}
        
        {user.isTyping && (
          <div className="absolute -top-1 -right-1">
            <div className="flex space-x-0.5">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
      
      {showName && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 truncate">
            {user.name}
          </span>
          {user.isTyping && user.typingArea && (
            <span className="text-xs text-blue-600">
              typing in {user.typingArea}...
            </span>
          )}
          {user.focusArea && !user.isTyping && (
            <span className="text-xs text-gray-500">
              viewing {user.focusArea}
            </span>
          )}
        </div>
      )}
    </div>
  );
} 