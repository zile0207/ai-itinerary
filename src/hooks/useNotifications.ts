import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket/client';
import { useAuth } from '@/contexts/AuthContext';

// Enhanced notification type for real-time system
interface Notification {
  id: string;
  type: 'comment' | 'mention' | 'update' | 'join' | 'leave' | 'permission' | 'version' | 'system';
  title: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
  userId?: string; // The user who triggered the notification
  targetId?: string; // The item being referenced (itinerary, comment, etc.)
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>; // Additional data
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  connected: boolean;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (ids: string[]) => Promise<void>;
  delete: (ids: string[]) => Promise<void>;
  filter: (filterConfig: any) => void;
  refresh: () => void;
  simulateNotification: (type: Notification['type']) => void; // For testing
}

// Mock notification generators for testing
const generateMockNotification = (type: Notification['type']): Notification => {
  const baseId = Math.random().toString(36).substr(2, 9);
  const now = new Date();
  
  const templates = {
    comment: {
      title: 'New Comment',
      message: 'John Doe commented on your Paris Adventure itinerary',
      priority: 'medium' as const,
      metadata: { itineraryId: 'paris-2024', commentId: `comment-${baseId}` }
    },
    mention: {
      title: 'You were mentioned',
      message: 'Sarah mentioned you in Tokyo Summer trip planning',
      priority: 'high' as const,
      metadata: { itineraryId: 'tokyo-2024', mentionContext: 'trip-planning' }
    },
    update: {
      title: 'Itinerary Updated',
      message: 'Your London Weekend trip has been updated with new activities',
      priority: 'medium' as const,
      metadata: { itineraryId: 'london-2024', updateType: 'activities' }
    },
    join: {
      title: 'User Joined',
      message: 'Mike Johnson joined your Barcelona Adventure trip',
      priority: 'low' as const,
      metadata: { itineraryId: 'barcelona-2024', newUserId: 'user-mike' }
    },
    leave: {
      title: 'User Left',
      message: 'Emma Wilson left your Rome Explorer trip',
      priority: 'low' as const,
      metadata: { itineraryId: 'rome-2024', userId: 'user-emma' }
    },
    permission: {
      title: 'Permission Changed',
      message: 'You have been granted editor access to NYC Food Tour',
      priority: 'medium' as const,
      metadata: { itineraryId: 'nyc-2024', newRole: 'editor' }
    },
    version: {
      title: 'New Version Created',
      message: 'Version 2.1 of your Amsterdam Culture trip is now available',
      priority: 'low' as const,
      metadata: { itineraryId: 'amsterdam-2024', version: '2.1' }
    },
    system: {
      title: 'System Notification',
      message: 'Your account settings have been updated successfully',
      priority: 'low' as const,
      metadata: { settingType: 'profile' }
    }
  };

  const template = templates[type];
  
  return {
    id: baseId,
    type,
    title: template.title,
    message: template.message,
    createdAt: now,
    priority: template.priority,
    metadata: template.metadata
  };
};

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(getSocket());

  // Initialize with mock data and setup Socket.io listeners
  useEffect(() => {
    const socket = socketRef.current;

    // Initialize with some mock notifications
    const initialNotifications: Notification[] = [
      {
        id: '1',
        type: 'comment',
        title: 'New Comment',
        message: 'John Doe commented on your Paris Adventure itinerary',
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        priority: 'medium',
        metadata: { itineraryId: 'paris-2024', commentId: 'comment-1' }
      },
      {
        id: '2',
        type: 'join',
        title: 'User Joined',
        message: 'Jane Smith joined your Paris Adventure trip',
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        priority: 'low',
        metadata: { itineraryId: 'paris-2024', newUserId: 'user-jane' }
      },
      {
        id: '3',
        type: 'update',
        title: 'Itinerary Updated',
        message: 'Your Tokyo Summer trip has been updated with new activities',
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        readAt: new Date(Date.now() - 10 * 60 * 1000), // Read 10 minutes ago
        priority: 'high',
        metadata: { itineraryId: 'tokyo-2024', updateType: 'activities' }
      },
    ];

    setNotifications(initialNotifications);

    // Socket connection listeners
    const handleConnect = () => {
      console.log('[Notifications] Socket connected');
      setConnected(true);
      setError(null);
    };

    const handleDisconnect = () => {
      console.log('[Notifications] Socket disconnected');
      setConnected(false);
    };

    const handleConnectError = (error: any) => {
      console.error('[Notifications] Socket connection error:', error);
      setError('Failed to connect to notification service');
      setConnected(false);
    };

    // Notification event listeners
    const handleNotification = (notification: any) => {
      console.log('[Notifications] Received notification:', notification);
      
      // Convert to our notification format if needed
      const newNotification: Notification = {
        id: notification.id || Math.random().toString(36).substr(2, 9),
        type: notification.type || 'system',
        title: notification.title || 'New Notification',
        message: notification.message || notification.content || '',
        createdAt: new Date(notification.timestamp || notification.createdAt || Date.now()),
        priority: notification.priority || 'medium',
        userId: notification.userId,
        targetId: notification.targetId,
        metadata: notification.metadata || {}
      };

      setNotifications(prev => [newNotification, ...prev]);
    };

    const handleNotificationReceived = (data: any) => {
      console.log('[Notifications] Notification received event:', data);
      if (data.notification) {
        handleNotification(data.notification);
      }
    };

    const handleNotificationsRead = (data: any) => {
      console.log('[Notifications] Notifications marked as read:', data);
      if (data.notificationIds) {
        setNotifications(prev => 
          prev.map(notification => 
            data.notificationIds.includes(notification.id)
              ? { ...notification, readAt: new Date(data.timestamp) }
              : notification
          )
        );
      }
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('notification', handleNotification);
    socket.on('notification-received', handleNotificationReceived);
    socket.on('notifications-read', handleNotificationsRead);

    // Set initial connection status
    setConnected(socket.connected);

    // Cleanup on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('notification', handleNotification);
      socket.off('notification-received', handleNotificationReceived);
      socket.off('notifications-read', handleNotificationsRead);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const markAsRead = useCallback(async (ids: string[]) => {
    const socket = socketRef.current;
    
    try {
      // Optimistically update local state
      setNotifications(prev => 
        prev.map(notification => 
          ids.includes(notification.id) 
            ? { ...notification, readAt: new Date() }
            : notification
        )
      );

      // Emit to server if user is available
      if (user?.id && socket.connected) {
        socket.emit('notifications-read', {
          notificationIds: ids,
          userId: user.id,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('[Notifications] Failed to mark as read:', error);
      setError('Failed to mark notifications as read');
    }
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications
      .filter(n => !n.readAt)
      .map(n => n.id);
    
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  }, [notifications, markAsRead]);

  const dismiss = useCallback(async (ids: string[]) => {
    // For now, just mark as read
    await markAsRead(ids);
  }, [markAsRead]);

  const deleteNotifications = useCallback(async (ids: string[]) => {
    try {
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      // TODO: Emit deletion to server when backend is ready
    } catch (error) {
      console.error('[Notifications] Failed to delete notifications:', error);
      setError('Failed to delete notifications');
    }
  }, []);

  const filter = useCallback((filterConfig: any) => {
    // TODO: Implement filtering
    console.log('Filter applied:', filterConfig);
  }, []);

  const refresh = useCallback(() => {
    // TODO: Implement refresh from server
    console.log('Refreshing notifications...');
    setError(null);
  }, []);

  // For testing - simulate receiving different types of notifications
  const simulateNotification = useCallback((type: Notification['type']) => {
    const newNotification = generateMockNotification(type);
    setNotifications(prev => [newNotification, ...prev]);
    console.log('[Notifications] Simulated notification:', newNotification);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    connected,
    markAsRead,
    markAllAsRead,
    dismiss,
    delete: deleteNotifications,
    filter,
    refresh,
    simulateNotification,
  };
} 