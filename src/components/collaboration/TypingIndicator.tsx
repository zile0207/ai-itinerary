import React from 'react';
import { UserPresence } from '@/lib/socket/client';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  users: UserPresence[];
  area?: string;
  className?: string;
}

/**
 * Component to display typing indicators for users
 */
export function TypingIndicator({ users, area, className }: TypingIndicatorProps) {
  const typingUsers = users.filter(user => 
    user.isTyping && (!area || user.typingArea === area)
  );

  if (typingUsers.length === 0) {
    return null;
  }

  const getTypingMessage = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    } else {
      return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className={cn('flex items-center gap-2 text-sm text-gray-600', className)}>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-blue-600 font-medium">
        {getTypingMessage()}
      </span>
    </div>
  );
}

/**
 * Compact typing indicator that just shows the dots
 */
export function CompactTypingIndicator({ hasTypingUsers, className }: { 
  hasTypingUsers: boolean; 
  className?: string; 
}) {
  if (!hasTypingUsers) {
    return null;
  }

  return (
    <div className={cn('flex space-x-1', className)}>
      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
} 