import React, { useEffect, useState } from 'react';
import { X, Bell, MessageCircle, Users, FileEdit, Shield, GitBranch, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { NotificationType, NotificationPriority, Notification } from '@/types/notifications';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  onAction?: (actionId: string) => void;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationToast({
  notification,
  onDismiss,
  onAction,
  duration = 5000,
  position = 'top-right',
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, [duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.COMMENT_ADDED:
      case NotificationType.COMMENT_REPLY:
      case NotificationType.COMMENT_MENTION:
        return MessageCircle;
      case NotificationType.USER_JOINED:
      case NotificationType.USER_LEFT:
        return Users;
      case NotificationType.DOCUMENT_EDITED:
      case NotificationType.ACTIVITY_ADDED:
        return FileEdit;
      case NotificationType.PERMISSION_CHANGED:
        return Shield;
      case NotificationType.VERSION_CREATED:
        return GitBranch;
      case NotificationType.SYSTEM_ERROR:
        return AlertTriangle;
      default:
        return Bell;
    }
  };

  const getPriorityStyles = () => {
    switch (notification.priority) {
      case NotificationPriority.URGENT:
        return 'border-red-500 bg-red-50';
      case NotificationPriority.HIGH:
        return 'border-orange-500 bg-orange-50';
      case NotificationPriority.MEDIUM:
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getPositionStyles = () => {
    const base = 'fixed z-50 transform transition-all duration-300 ease-in-out';
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
    };

    const translateMap = {
      'top-right': isVisible && !isLeaving ? 'translate-x-0' : 'translate-x-full',
      'top-left': isVisible && !isLeaving ? 'translate-x-0' : '-translate-x-full',
      'bottom-right': isVisible && !isLeaving ? 'translate-x-0' : 'translate-x-full',
      'bottom-left': isVisible && !isLeaving ? 'translate-x-0' : '-translate-x-full',
    };

    return `${base} ${positions[position]} ${translateMap[position]}`;
  };

  const IconComponent = getIcon();

  return (
    <Card 
      className={`
        ${getPositionStyles()}
        ${getPriorityStyles()}
        w-96 max-w-sm border-l-4 shadow-lg
        ${isLeaving ? 'opacity-0' : 'opacity-100'}
      `}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            ${notification.priority === NotificationPriority.URGENT ? 'bg-red-100 text-red-600' :
              notification.priority === NotificationPriority.HIGH ? 'bg-orange-100 text-orange-600' :
              notification.priority === NotificationPriority.MEDIUM ? 'bg-blue-100 text-blue-600' :
              'bg-gray-100 text-gray-600'}
          `}>
            <IconComponent className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                  {notification.message}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                onClick={handleDismiss}
                aria-label="Dismiss notification"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Priority badge */}
            {notification.priority === NotificationPriority.URGENT && (
              <Badge variant="destructive" className="text-xs mt-2">
                Urgent
              </Badge>
            )}

            {/* Actions */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {notification.actions.slice(0, 2).map((action) => (
                  <Button
                    key={action.id}
                    variant={action.style === 'primary' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => onAction?.(action.id)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Toast container for managing multiple toasts
interface NotificationToastContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onAction?: (notificationId: string, actionId: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

export function NotificationToastContainer({
  notifications,
  onDismiss,
  onAction,
  position = 'top-right',
  maxToasts = 3,
}: NotificationToastContainerProps) {
  const displayedNotifications = notifications.slice(0, maxToasts);

  return (
    <div className="pointer-events-none">
      {displayedNotifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            [position.includes('top') ? 'top' : 'bottom']: `${4 + index * 110}px`,
            [position.includes('right') ? 'right' : 'left']: '16px',
          }}
          className="absolute pointer-events-auto"
        >
          <NotificationToast
            notification={notification}
            onDismiss={() => onDismiss(notification.id)}
            onAction={(actionId) => onAction?.(notification.id, actionId)}
            position={position}
          />
        </div>
      ))}
    </div>
  );
} 