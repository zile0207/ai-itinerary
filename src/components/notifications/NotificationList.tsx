import React, { useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  MessageCircle, 
  Users, 
  FileEdit, 
  Shield, 
  GitBranch, 
  AlertTriangle,
  Check, 
  X, 
  Trash2,
  MoreHorizontal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// Simplified notification interface to match the hook
interface SimpleNotification {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface NotificationListProps {
  notifications: SimpleNotification[];
  loading?: boolean;
  compact?: boolean;
  showActions?: boolean;
  onNotificationClick?: (notificationId: string) => void;
  onNotificationAction?: (action: 'read' | 'dismiss' | 'delete', ids: string[]) => void;
}

export function NotificationList({
  notifications,
  loading = false,
  compact = false,
  showActions = true,
  onNotificationClick,
  onNotificationAction,
}: NotificationListProps) {
  const getNotificationIcon = useCallback(() => {
    // For simplicity, just return Bell for all notifications
    return Bell;
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }, []);

  const handleNotificationClick = useCallback((notification: SimpleNotification) => {
    if (onNotificationClick) {
      onNotificationClick(notification.id);
    }
    
    // Auto-mark as read when clicked
    if (!notification.readAt && onNotificationAction) {
      onNotificationAction('read', [notification.id]);
    }
  }, [onNotificationClick, onNotificationAction]);

  const handleActionClick = useCallback((
    e: React.MouseEvent,
    action: 'read' | 'dismiss' | 'delete',
    notificationId: string
  ) => {
    e.stopPropagation();
    if (onNotificationAction) {
      onNotificationAction(action, [notificationId]);
    }
  }, [onNotificationAction]);

  if (loading && notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">No notifications</p>
        <p className="text-xs text-gray-500">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${compact ? 'p-2' : 'p-4'}`}>
      {notifications.map((notification) => {
        const IconComponent = getNotificationIcon();
        const priorityColors = getPriorityColor(notification.priority);
        const isUnread = !notification.readAt;
        const isDismissed = false; // Simplified - no dismissal in basic version

        return (
          <div
            key={notification.id}
            className={`
              group relative cursor-pointer transition-all duration-200
              ${compact ? 'p-3' : 'p-4'}
              ${isUnread ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white hover:bg-gray-50'}
              ${isDismissed ? 'opacity-60' : ''}
              border rounded-lg hover:shadow-sm
            `}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${priorityColors}
              `}>
                <IconComponent className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={`
                      text-sm font-medium truncate
                      ${isUnread ? 'text-gray-900' : 'text-gray-700'}
                    `}>
                      {notification.title}
                    </h4>
                    <p className={`
                      text-sm mt-1 line-clamp-2
                      ${isUnread ? 'text-gray-700' : 'text-gray-600'}
                    `}>
                      {notification.message}
                    </p>
                  </div>

                  {/* Actions */}
                  {showActions && (
                    <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => handleActionClick(e, 'read', notification.id)}
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {!isDismissed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => handleActionClick(e, 'dismiss', notification.id)}
                          title="Dismiss"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        onClick={(e) => handleActionClick(e, 'delete', notification.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                    </span>
                    
                    {notification.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-xs">
                        Urgent
                      </Badge>
                    )}
                    
                    {notification.priority === 'high' && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                        High
                      </Badge>
                    )}
                    

                  </div>

                  {/* Unread indicator */}
                  {isUnread && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>

                {/* Actions - Simplified version has no custom actions */}
              </div>
            </div>
          </div>
        );
      })}

      {loading && notifications.length > 0 && (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs text-gray-600">Loading more...</p>
        </div>
      )}
    </div>
  );
} 