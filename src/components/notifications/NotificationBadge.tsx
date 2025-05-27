import React from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationBadgeProps {
  className?: string;
  onClick?: () => void;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function NotificationBadge({
  className = '',
  onClick,
  showIcon = true,
  size = 'md',
}: NotificationBadgeProps) {
  const { unreadCount, loading } = useNotifications();

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const badgeSizeClasses = {
    sm: 'h-4 w-4 text-xs',
    md: 'h-5 w-5 text-xs',
    lg: 'h-6 w-6 text-sm',
  };

  if (showIcon) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`relative ${className}`}
        onClick={onClick}
        disabled={loading}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className={sizeClasses[size]} />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className={`absolute -top-2 -right-2 ${badgeSizeClasses[size]} p-0 flex items-center justify-center`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  // Badge only mode
  if (unreadCount === 0) {
    return null;
  }

  return (
    <Badge
      variant="destructive"
      className={`${badgeSizeClasses[size]} p-0 flex items-center justify-center cursor-pointer ${className}`}
      onClick={onClick}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
} 