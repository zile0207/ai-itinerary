'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationService } from '@/services/notificationService';
import { Bell, Wifi, WifiOff, TestTube2, Send, MessageCircle } from 'lucide-react';

interface NotificationTesterProps {
  className?: string;
}

export function NotificationTester({ className = '' }: NotificationTesterProps) {
  const { 
    notifications, 
    unreadCount, 
    connected, 
    error, 
    simulateNotification,
    markAsRead,
    markAllAsRead 
  } = useNotifications();
  
  const [selectedType, setSelectedType] = useState<'comment' | 'mention' | 'update' | 'join' | 'leave' | 'permission' | 'version' | 'system'>('comment');

  const notificationTypes = [
    { value: 'comment', label: 'New Comment', color: 'bg-blue-500' },
    { value: 'mention', label: 'Mention', color: 'bg-orange-500' },
    { value: 'update', label: 'Itinerary Update', color: 'bg-green-500' },
    { value: 'join', label: 'User Joined', color: 'bg-purple-500' },
    { value: 'leave', label: 'User Left', color: 'bg-gray-500' },
    { value: 'permission', label: 'Permission Change', color: 'bg-yellow-500' },
    { value: 'version', label: 'New Version', color: 'bg-indigo-500' },
    { value: 'system', label: 'System Notification', color: 'bg-red-500' },
  ] as const;

  const handleSimulate = () => {
    simulateNotification(selectedType);
  };

  const handleMarkFirstAsRead = () => {
    const firstUnread = notifications.find(n => !n.readAt);
    if (firstUnread) {
      markAsRead([firstUnread.id]);
    }
  };

  // Test notification service integration
  const testCommentNotification = () => {
    const mockComment = {
      id: `comment_${Date.now()}`,
      content: 'This is a test comment with real-time notification!',
      authorId: 'user123',
      authorName: 'Test User',
      authorAvatar: undefined,
      timestamp: new Date(),
      entityType: 'itinerary' as const,
      entityId: 'test-itinerary',
      mentions: []
    };

    const notification = notificationService.createCommentNotification(
      mockComment, 
      'test-itinerary-123', 
      'current-user'
    );
    
    notificationService.sendNotification(notification);
  };

  const testMentionNotification = () => {
    const mockComment = {
      id: `comment_${Date.now()}`,
      content: 'Hey @testuser, check this out!',
      authorId: 'user123',
      authorName: 'Test User',
      authorAvatar: undefined,
      timestamp: new Date(),
      entityType: 'itinerary' as const,
      entityId: 'test-itinerary',
      mentions: ['testuser']
    };

    const notification = notificationService.createMentionNotification(
      mockComment,
      'testuser',
      'Test User',
      'test-itinerary-123'
    );
    
    notificationService.sendNotification(notification, ['testuser']);
  };

  const testSystemNotification = () => {
    const notification = notificationService.createSystemNotification(
      'System Test',
      'This is a test system notification sent via Socket.io',
      'medium'
    );
    
    notificationService.sendNotification(notification);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <TestTube2 className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Notification System Tester</h3>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-gray-50">
        {connected ? (
          <div className="flex items-center gap-2 text-green-600">
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">Socket.io Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">Socket.io Disconnected</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          <Bell className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-600">
            {unreadCount} unread of {notifications.length} total
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Test Controls */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Simulate Notification Type:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {notificationTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
                  selectedType === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${type.color} inline-block mr-1`} />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleSimulate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send className="h-4 w-4" />
              Local Simulation
            </button>
            
            <button
              onClick={handleMarkFirstAsRead}
              disabled={unreadCount === 0}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Mark First Unread
            </button>
            
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Mark All Read
            </button>
          </div>

          {/* Real notification service testing */}
          <div className="pt-2 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Real-time Service Testing:
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => testCommentNotification()}
                disabled={!connected}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                Test Comment
              </button>
              
              <button
                onClick={() => testMentionNotification()}
                disabled={!connected}
                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Test Mention
              </button>
              
              <button
                onClick={() => testSystemNotification()}
                disabled={!connected}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Test System
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Notifications Preview */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Notifications</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notifications.slice(0, 5).map((notification) => (
            <div 
              key={notification.id}
              className={`p-3 rounded-lg border text-sm ${
                notification.readAt 
                  ? 'bg-gray-50 border-gray-200 text-gray-600' 
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{notification.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      notification.type === 'comment' ? 'bg-blue-100 text-blue-700' :
                      notification.type === 'mention' ? 'bg-orange-100 text-orange-700' :
                      notification.type === 'update' ? 'bg-green-100 text-green-700' :
                      notification.type === 'join' ? 'bg-purple-100 text-purple-700' :
                      notification.type === 'leave' ? 'bg-gray-100 text-gray-700' :
                      notification.type === 'permission' ? 'bg-yellow-100 text-yellow-700' :
                      notification.type === 'version' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {notification.type}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {notification.createdAt.toLocaleTimeString()}
                    {notification.readAt && ' • Read'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {notifications.length === 0 && (
            <p className="text-gray-500 text-center py-4">No notifications yet</p>
          )}
        </div>
      </div>
    </div>
  );
} 