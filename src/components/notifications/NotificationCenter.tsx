import React, { useState, useCallback } from 'react';
import { Bell, Settings, Filter, MoreHorizontal, Check, X, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationType, NotificationPriority } from '@/types/notifications';
import { NotificationList } from './NotificationList';
import { NotificationSettings } from './NotificationSettings';

interface NotificationCenterProps {
  className?: string;
  variant?: 'icon' | 'panel';
  maxHeight?: string;
  showSettingsButton?: boolean;
  onNotificationClick?: (notificationId: string) => void;
}

export function NotificationCenter({
  className = '',
  variant = 'icon',
  maxHeight = '400px',
  showSettingsButton = true,
  onNotificationClick,
}: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    delete: deleteNotifications,
    filter,
    refresh,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'read'>('all');

  const handleNotificationAction = useCallback(async (
    action: 'read' | 'dismiss' | 'delete',
    notificationIds: string[]
  ) => {
    try {
      switch (action) {
        case 'read':
          await markAsRead(notificationIds);
          break;
        case 'dismiss':
          await dismiss(notificationIds);
          break;
        case 'delete':
          await deleteNotifications(notificationIds);
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} notifications:`, error);
    }
  }, [markAsRead, dismiss, deleteNotifications]);

  const handleFilterChange = useCallback((newFilter: 'all' | 'unread' | 'read') => {
    setActiveFilter(newFilter);
    
    const filterConfig = {
      read: newFilter === 'all' ? undefined : newFilter === 'read',
      limit: 50,
    };
    
    filter(filterConfig);
  }, [filter]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [markAllAsRead]);

  const getFilteredNotifications = useCallback(() => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter(n => !n.readAt);
      case 'read':
        return notifications.filter(n => !!n.readAt);
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const filteredNotifications = getFilteredNotifications();

  // Render as icon/button trigger
  if (variant === 'icon') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`relative ${className}`}
            aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-96 p-0" 
          align="end"
          side="bottom"
          sideOffset={8}
        >
          <NotificationCenterContent
            notifications={filteredNotifications}
            unreadCount={unreadCount}
            loading={loading}
            error={error}
            activeFilter={activeFilter}
            maxHeight={maxHeight}
            showSettingsButton={showSettingsButton}
            showSettings={showSettings}
            onFilterChange={handleFilterChange}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationAction={handleNotificationAction}
            onNotificationClick={onNotificationClick}
            onSettingsToggle={() => setShowSettings(!showSettings)}
            onRefresh={refresh}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Render as panel
  return (
    <Card className={`w-full ${className}`}>
      <NotificationCenterContent
        notifications={filteredNotifications}
        unreadCount={unreadCount}
        loading={loading}
        error={error}
        activeFilter={activeFilter}
        maxHeight={maxHeight}
        showSettingsButton={showSettingsButton}
        showSettings={showSettings}
        onFilterChange={handleFilterChange}
        onMarkAllAsRead={handleMarkAllAsRead}
        onNotificationAction={handleNotificationAction}
        onNotificationClick={onNotificationClick}
        onSettingsToggle={() => setShowSettings(!showSettings)}
        onRefresh={refresh}
      />
    </Card>
  );
}

interface NotificationCenterContentProps {
  notifications: any[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  activeFilter: 'all' | 'unread' | 'read';
  maxHeight: string;
  showSettingsButton: boolean;
  showSettings: boolean;
  onFilterChange: (filter: 'all' | 'unread' | 'read') => void;
  onMarkAllAsRead: () => void;
  onNotificationAction: (action: 'read' | 'dismiss' | 'delete', ids: string[]) => void;
  onNotificationClick?: (id: string) => void;
  onSettingsToggle: () => void;
  onRefresh: () => void;
}

function NotificationCenterContent({
  notifications,
  unreadCount,
  loading,
  error,
  activeFilter,
  maxHeight,
  showSettingsButton,
  showSettings,
  onFilterChange,
  onMarkAllAsRead,
  onNotificationAction,
  onNotificationClick,
  onSettingsToggle,
  onRefresh,
}: NotificationCenterContentProps) {
  if (showSettings) {
    return (
      <div>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Notification Settings</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettingsToggle}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <NotificationSettings onClose={onSettingsToggle} />
        </CardContent>
      </div>
    );
  }

  return (
    <div>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                className="h-8 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onRefresh}>
                  Refresh
                </DropdownMenuItem>
                {showSettingsButton && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onSettingsToggle}>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 mt-2">
          {(['all', 'unread', 'read'] as const).map((filterType) => (
            <Button
              key={filterType}
              variant={activeFilter === filterType ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onFilterChange(filterType)}
              className="h-7 px-3 text-xs capitalize"
            >
              {filterType === 'all' && <Filter className="h-3 w-3 mr-1" />}
              {filterType === 'unread' && <Eye className="h-3 w-3 mr-1" />}
              {filterType === 'read' && <EyeOff className="h-3 w-3 mr-1" />}
              {filterType}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error && (
          <div className="p-4 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button onClick={onRefresh} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {!error && (
          <ScrollArea style={{ maxHeight }} className="w-full">
            <NotificationList
              notifications={notifications}
              loading={loading}
              onNotificationClick={onNotificationClick}
              onNotificationAction={onNotificationAction}
              showActions={true}
              compact={true}
            />
          </ScrollArea>
        )}
      </CardContent>
    </div>
  );
} 