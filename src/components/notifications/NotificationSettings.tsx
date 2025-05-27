import React, { useState, useCallback } from 'react';
import { Save, Bell, Mail, Smartphone, MessageSquare, Clock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  NotificationType, 
  DeliveryChannel, 
  NotificationPreferences 
} from '@/types/notifications';

interface NotificationSettingsProps {
  onClose?: () => void;
  className?: string;
}

export function NotificationSettings({ onClose, className }: NotificationSettingsProps) {
  const { preferences, updatePreferences } = useNotifications();
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(preferences);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handlePreferenceChange = useCallback((updates: Partial<NotificationPreferences>) => {
    if (!localPreferences) return;
    
    const updatedPreferences = { ...localPreferences, ...updates };
    setLocalPreferences(updatedPreferences);
    setHasChanges(true);
  }, [localPreferences]);

  const handleChannelToggle = useCallback((channel: DeliveryChannel, enabled: boolean) => {
    if (!localPreferences) return;
    
    handlePreferenceChange({
      channels: {
        ...localPreferences.channels,
        [channel]: enabled,
      },
    });
  }, [localPreferences, handlePreferenceChange]);

  const handleNotificationTypeToggle = useCallback((type: NotificationType, enabled: boolean) => {
    if (!localPreferences) return;
    
    handlePreferenceChange({
      types: {
        ...localPreferences.types,
        [type]: {
          ...localPreferences.types[type],
          enabled,
        },
      },
    });
  }, [localPreferences, handlePreferenceChange]);

  const handleQuietHoursChange = useCallback((field: string, value: any) => {
    if (!localPreferences) return;
    
    handlePreferenceChange({
      quietHours: {
        ...localPreferences.quietHours,
        [field]: value,
      },
    });
  }, [localPreferences, handlePreferenceChange]);

  const handleBatchingChange = useCallback((field: string, value: any) => {
    if (!localPreferences) return;
    
    handlePreferenceChange({
      batching: {
        ...localPreferences.batching,
        [field]: value,
      },
    });
  }, [localPreferences, handlePreferenceChange]);

  const handleSave = useCallback(async () => {
    if (!localPreferences || !hasChanges) return;
    
    setSaving(true);
    try {
      await updatePreferences(localPreferences);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    } finally {
      setSaving(false);
    }
  }, [localPreferences, hasChanges, updatePreferences]);

  if (!localPreferences) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading preferences...</p>
      </div>
    );
  }

  const notificationCategories = {
    'Comments & Mentions': [
      NotificationType.COMMENT_ADDED,
      NotificationType.COMMENT_REPLY,
      NotificationType.COMMENT_MENTION,
      NotificationType.COMMENT_RESOLVED,
    ],
    'Document Changes': [
      NotificationType.DOCUMENT_EDITED,
      NotificationType.ACTIVITY_ADDED,
      NotificationType.ACTIVITY_REMOVED,
      NotificationType.ACTIVITY_UPDATED,
    ],
    'Collaboration': [
      NotificationType.USER_JOINED,
      NotificationType.USER_LEFT,
      NotificationType.USER_INVITED,
      NotificationType.PERMISSION_CHANGED,
      NotificationType.ROLE_CHANGED,
    ],
    'Version Control': [
      NotificationType.VERSION_CREATED,
      NotificationType.DOCUMENT_ROLLBACK,
      NotificationType.VERSION_RESTORED,
    ],
    'System': [
      NotificationType.SYSTEM_ERROR,
      NotificationType.SYSTEM_MAINTENANCE,
      NotificationType.SYSTEM_UPDATE,
    ],
  };

  const channelIcons = {
    [DeliveryChannel.IN_APP]: Bell,
    [DeliveryChannel.EMAIL]: Mail,
    [DeliveryChannel.PUSH]: Smartphone,
    [DeliveryChannel.SMS]: MessageSquare,
  };

  const channelLabels = {
    [DeliveryChannel.IN_APP]: 'In-App',
    [DeliveryChannel.EMAIL]: 'Email',
    [DeliveryChannel.PUSH]: 'Push',
    [DeliveryChannel.SMS]: 'SMS',
  };

  return (
    <div className={`space-y-6 p-4 ${className}`}>
      {/* Global Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Global Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable Notifications</Label>
              <p className="text-xs text-gray-600 mt-1">
                Turn off to disable all notifications
              </p>
            </div>
            <Switch
              checked={localPreferences.globalEnabled}
              onCheckedChange={(enabled) => handlePreferenceChange({ globalEnabled: enabled })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Channels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery Channels</CardTitle>
          <CardDescription className="text-xs">
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(channelLabels).map(([channel, label]) => {
            const IconComponent = channelIcons[channel as DeliveryChannel];
            const isEnabled = localPreferences.channels[channel as DeliveryChannel];
            
            return (
              <div key={channel} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <IconComponent className="h-4 w-4 text-gray-500" />
                  <Label className="text-sm">{label}</Label>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(enabled) => handleChannelToggle(channel as DeliveryChannel, enabled)}
                  disabled={!localPreferences.globalEnabled}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notification Types</CardTitle>
          <CardDescription className="text-xs">
            Customize which events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(notificationCategories).map(([category, types]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-medium text-gray-800">{category}</h4>
              <div className="space-y-2 pl-4">
                {types.map((type) => {
                  const typePrefs = localPreferences.types[type];
                  const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <Label className="text-xs text-gray-700">{typeLabel}</Label>
                      <Switch
                        checked={typePrefs?.enabled || false}
                        onCheckedChange={(enabled) => handleNotificationTypeToggle(type, enabled)}
                        disabled={!localPreferences.globalEnabled}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Quiet Hours</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable Quiet Hours</Label>
            <Switch
              checked={localPreferences.quietHours.enabled}
              onCheckedChange={(enabled) => handleQuietHoursChange('enabled', enabled)}
              disabled={!localPreferences.globalEnabled}
            />
          </div>

          {localPreferences.quietHours.enabled && (
            <div className="space-y-3 pl-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="time"
                    value={localPreferences.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="time"
                    value={localPreferences.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batching Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Batching</CardTitle>
          <CardDescription className="text-xs">
            Group notifications to reduce interruptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable Batching</Label>
            <Switch
              checked={localPreferences.batching.enabled}
              onCheckedChange={(enabled) => handleBatchingChange('enabled', enabled)}
              disabled={!localPreferences.globalEnabled}
            />
          </div>

          {localPreferences.batching.enabled && (
            <div className="space-y-3 pl-4">
              <div>
                <Label className="text-xs">Batch Frequency</Label>
                <Select
                  value={localPreferences.batching.frequency}
                  onValueChange={(value) => handleBatchingChange('frequency', value)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="15min">Every 15 minutes</SelectItem>
                    <SelectItem value="1hour">Every hour</SelectItem>
                    <SelectItem value="4hours">Every 4 hours</SelectItem>
                    <SelectItem value="12hours">Every 12 hours</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto Mark Read */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Auto Mark as Read</CardTitle>
          <CardDescription className="text-xs">
            Automatically mark notifications as read when viewed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Auto Mark Read</Label>
            <Switch
              checked={localPreferences.autoMarkRead.enabled}
              onCheckedChange={(enabled) => 
                handlePreferenceChange({
                  autoMarkRead: { ...localPreferences.autoMarkRead, enabled }
                })
              }
              disabled={!localPreferences.globalEnabled}
            />
          </div>

          {localPreferences.autoMarkRead.enabled && (
            <div className="pl-4">
              <Label className="text-xs">Delay (seconds)</Label>
              <Input
                type="number"
                min="0"
                max="30"
                value={localPreferences.autoMarkRead.delaySeconds}
                onChange={(e) => 
                  handlePreferenceChange({
                    autoMarkRead: { 
                      ...localPreferences.autoMarkRead, 
                      delaySeconds: parseInt(e.target.value) || 0 
                    }
                  })
                }
                className="text-xs mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">
              Unsaved changes
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {onClose && (
            <Button variant="outline" onClick={onClose} size="sm">
              Close
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            size="sm"
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Save className="h-3 w-3" />
                <span>Save</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 