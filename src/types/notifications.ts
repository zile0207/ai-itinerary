export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export enum NotificationType {
  // Comment-related notifications
  COMMENT_ADDED = 'comment_added',
  COMMENT_REPLY = 'comment_reply',
  COMMENT_MENTION = 'comment_mention',
  COMMENT_RESOLVED = 'comment_resolved',
  
  // Document change notifications
  DOCUMENT_EDITED = 'document_edited',
  ACTIVITY_ADDED = 'activity_added',
  ACTIVITY_REMOVED = 'activity_removed',
  ACTIVITY_UPDATED = 'activity_updated',
  
  // Collaboration notifications
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_INVITED = 'user_invited',
  PERMISSION_CHANGED = 'permission_changed',
  ROLE_CHANGED = 'role_changed',
  
  // Version control notifications
  VERSION_CREATED = 'version_created',
  DOCUMENT_ROLLBACK = 'document_rollback',
  VERSION_RESTORED = 'version_restored',
  
  // System notifications
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SYSTEM_ERROR = 'system_error',
  SYSTEM_UPDATE = 'system_update',
  
  // Trip-specific notifications
  TRIP_SHARED = 'trip_shared',
  TRIP_UPDATED = 'trip_updated',
  DEADLINE_REMINDER = 'deadline_reminder',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum DeliveryChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
}

export interface NotificationAction {
  id: string;
  label: string;
  action: 'navigate' | 'api_call' | 'modal' | 'dismiss';
  payload?: any;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationMetadata {
  resourceId: string;
  resourceType: 'trip' | 'itinerary' | 'activity' | 'comment' | 'version';
  parentResourceId?: string;
  triggeredBy: string;
  changes?: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
  mentions?: string[]; // User IDs mentioned
  relatedUsers?: string[]; // Other relevant user IDs
  location?: {
    section: string;
    itemId?: string;
  };
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  userId: string; // Recipient
  createdAt: Date;
  readAt?: Date;
  dismissedAt?: Date;
  expiresAt?: Date;
  metadata: NotificationMetadata;
  actions?: NotificationAction[];
  grouped?: boolean;
  groupId?: string;
  groupCount?: number;
  deliveryChannels: DeliveryChannel[];
  deliveryStatus: Record<DeliveryChannel, {
    sent: boolean;
    sentAt?: Date;
    delivered?: boolean;
    deliveredAt?: Date;
    failed?: boolean;
    error?: string;
  }>;
}

export interface NotificationGroup {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  userId: string;
  notifications: Notification[];
  count: number;
  latestAt: Date;
  readAt?: Date;
  metadata: NotificationMetadata;
}

export interface NotificationPreferences {
  userId: string;
  globalEnabled: boolean;
  channels: Record<DeliveryChannel, boolean>;
  types: Record<NotificationType, {
    enabled: boolean;
    channels: DeliveryChannel[];
    immediate: boolean; // Send immediately vs batch
    priority: NotificationPriority;
  }>;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;
    timezone: string;
    days: number[]; // 0-6 (Sunday-Saturday)
  };
  batching: {
    enabled: boolean;
    frequency: 'immediate' | '15min' | '1hour' | '4hours' | '12hours' | 'daily';
    maxBatchSize: number;
  };
  mentions: {
    allMentions: boolean;
    directMentions: boolean;
    keywords: string[];
  };
  autoMarkRead: {
    enabled: boolean;
    delaySeconds: number;
  };
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  defaultChannels: DeliveryChannel[];
  actions?: NotificationAction[];
  groupable: boolean;
  expiryHours?: number;
}

export interface NotificationFilter {
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  read?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  resourceTypes?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationContext {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  preferences: NotificationPreferences | null;
  
  // Core operations
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (notificationIds: string[]) => Promise<void>;
  delete: (notificationIds: string[]) => Promise<void>;
  
  // Filtering and pagination
  filter: (filter: NotificationFilter) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Preferences management
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  
  // Real-time events
  subscribe: (callback: (notification: Notification) => void) => () => void;
}

export interface NotificationEvent {
  type: 'notification_received' | 'notification_read' | 'notification_dismissed' | 'preferences_updated';
  notification?: Notification;
  userId: string;
  timestamp: Date;
}

export interface NotificationBatch {
  id: string;
  userId: string;
  notifications: Notification[];
  createdAt: Date;
  scheduledFor: Date;
  sentAt?: Date;
  channel: DeliveryChannel;
  template: 'digest' | 'summary' | 'grouped';
}

export interface EmailDigestData {
  user: User;
  notifications: Notification[];
  dateRange: {
    start: Date;
    end: Date;
  };
  unreadCount: number;
  summary: {
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
    byResource: Record<string, number>;
  };
}

// Default notification templates
export const DEFAULT_NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  [NotificationType.COMMENT_ADDED]: {
    type: NotificationType.COMMENT_ADDED,
    title: 'New comment on {resourceName}',
    message: '{userName} added a comment: "{commentPreview}"',
    priority: NotificationPriority.MEDIUM,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: true,
    actions: [
      {
        id: 'view_comment',
        label: 'View Comment',
        action: 'navigate',
        style: 'primary',
      },
      {
        id: 'reply',
        label: 'Reply',
        action: 'modal',
        style: 'secondary',
      },
    ],
  },
  
  [NotificationType.COMMENT_MENTION]: {
    type: NotificationType.COMMENT_MENTION,
    title: 'You were mentioned in {resourceName}',
    message: '{userName} mentioned you: "{commentPreview}"',
    priority: NotificationPriority.HIGH,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL, DeliveryChannel.PUSH],
    groupable: false,
    actions: [
      {
        id: 'view_mention',
        label: 'View Mention',
        action: 'navigate',
        style: 'primary',
      },
    ],
  },
  
  [NotificationType.DOCUMENT_EDITED]: {
    type: NotificationType.DOCUMENT_EDITED,
    title: '{resourceName} was updated',
    message: '{userName} made changes to {resourceType}',
    priority: NotificationPriority.LOW,
    defaultChannels: [DeliveryChannel.IN_APP],
    groupable: true,
    expiryHours: 24,
  },
  
  [NotificationType.USER_JOINED]: {
    type: NotificationType.USER_JOINED,
    title: 'New collaborator joined',
    message: '{userName} joined {resourceName}',
    priority: NotificationPriority.MEDIUM,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: true,
  },
  
  [NotificationType.PERMISSION_CHANGED]: {
    type: NotificationType.PERMISSION_CHANGED,
    title: 'Your permissions were updated',
    message: 'Your role in {resourceName} was changed to {newRole}',
    priority: NotificationPriority.HIGH,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: false,
  },
  
  [NotificationType.VERSION_CREATED]: {
    type: NotificationType.VERSION_CREATED,
    title: 'New version created',
    message: '{userName} created a new version of {resourceName}',
    priority: NotificationPriority.MEDIUM,
    defaultChannels: [DeliveryChannel.IN_APP],
    groupable: true,
  },
  
  [NotificationType.DOCUMENT_ROLLBACK]: {
    type: NotificationType.DOCUMENT_ROLLBACK,
    title: 'Document was rolled back',
    message: '{userName} rolled back {resourceName} to a previous version',
    priority: NotificationPriority.HIGH,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: false,
    actions: [
      {
        id: 'view_changes',
        label: 'View Changes',
        action: 'navigate',
        style: 'primary',
      },
    ],
  },
  
  [NotificationType.SYSTEM_ERROR]: {
    type: NotificationType.SYSTEM_ERROR,
    title: 'System Error',
    message: 'An error occurred: {errorMessage}',
    priority: NotificationPriority.URGENT,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: false,
    expiryHours: 48,
  },
  
  // Add other notification types with their default templates...
  [NotificationType.COMMENT_REPLY]: {
    type: NotificationType.COMMENT_REPLY,
    title: 'Reply to your comment',
    message: '{userName} replied to your comment: "{commentPreview}"',
    priority: NotificationPriority.MEDIUM,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: true,
  },
  
  [NotificationType.COMMENT_RESOLVED]: {
    type: NotificationType.COMMENT_RESOLVED,
    title: 'Comment resolved',
    message: '{userName} resolved a comment thread',
    priority: NotificationPriority.LOW,
    defaultChannels: [DeliveryChannel.IN_APP],
    groupable: true,
  },
  
  [NotificationType.ACTIVITY_ADDED]: {
    type: NotificationType.ACTIVITY_ADDED,
    title: 'New activity added',
    message: '{userName} added "{activityName}" to {resourceName}',
    priority: NotificationPriority.MEDIUM,
    defaultChannels: [DeliveryChannel.IN_APP],
    groupable: true,
  },
  
  [NotificationType.ACTIVITY_REMOVED]: {
    type: NotificationType.ACTIVITY_REMOVED,
    title: 'Activity removed',
    message: '{userName} removed "{activityName}" from {resourceName}',
    priority: NotificationPriority.MEDIUM,
    defaultChannels: [DeliveryChannel.IN_APP],
    groupable: true,
  },
  
  [NotificationType.ACTIVITY_UPDATED]: {
    type: NotificationType.ACTIVITY_UPDATED,
    title: 'Activity updated',
    message: '{userName} updated "{activityName}" in {resourceName}',
    priority: NotificationPriority.LOW,
    defaultChannels: [DeliveryChannel.IN_APP],
    groupable: true,
  },
  
  [NotificationType.USER_LEFT]: {
    type: NotificationType.USER_LEFT,
    title: 'Collaborator left',
    message: '{userName} left {resourceName}',
    priority: NotificationPriority.LOW,
    defaultChannels: [DeliveryChannel.IN_APP],
    groupable: true,
  },
  
  [NotificationType.USER_INVITED]: {
    type: NotificationType.USER_INVITED,
    title: 'You were invited to collaborate',
    message: '{userName} invited you to {resourceName}',
    priority: NotificationPriority.HIGH,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: false,
    actions: [
      {
        id: 'accept_invite',
        label: 'Accept',
        action: 'api_call',
        style: 'primary',
      },
      {
        id: 'decline_invite',
        label: 'Decline',
        action: 'api_call',
        style: 'secondary',
      },
    ],
  },
  
  [NotificationType.ROLE_CHANGED]: {
    type: NotificationType.ROLE_CHANGED,
    title: 'Role changed',
    message: '{userName}\'s role was changed to {newRole} in {resourceName}',
    priority: NotificationPriority.MEDIUM,
    defaultChannels: [DeliveryChannel.IN_APP],
    groupable: true,
  },
  
  [NotificationType.VERSION_RESTORED]: {
    type: NotificationType.VERSION_RESTORED,
    title: 'Version restored',
    message: '{userName} restored {resourceName} from version {versionName}',
    priority: NotificationPriority.HIGH,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: false,
  },
  
  [NotificationType.SYSTEM_MAINTENANCE]: {
    type: NotificationType.SYSTEM_MAINTENANCE,
    title: 'Scheduled Maintenance',
    message: 'System maintenance scheduled for {maintenanceTime}',
    priority: NotificationPriority.MEDIUM,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: false,
    expiryHours: 72,
  },
  
  [NotificationType.SYSTEM_UPDATE]: {
    type: NotificationType.SYSTEM_UPDATE,
    title: 'System Update Available',
    message: 'New features and improvements are available',
    priority: NotificationPriority.LOW,
    defaultChannels: [DeliveryChannel.IN_APP],
    groupable: false,
    expiryHours: 168, // 1 week
  },
  
  [NotificationType.TRIP_SHARED]: {
    type: NotificationType.TRIP_SHARED,
    title: 'Trip shared with you',
    message: '{userName} shared "{tripName}" with you',
    priority: NotificationPriority.HIGH,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: false,
    actions: [
      {
        id: 'view_trip',
        label: 'View Trip',
        action: 'navigate',
        style: 'primary',
      },
    ],
  },
  
  [NotificationType.TRIP_UPDATED]: {
    type: NotificationType.TRIP_UPDATED,
    title: 'Trip updated',
    message: '{userName} updated {resourceName}',
    priority: NotificationPriority.LOW,
    defaultChannels: [DeliveryChannel.IN_APP],
    groupable: true,
  },
  
  [NotificationType.DEADLINE_REMINDER]: {
    type: NotificationType.DEADLINE_REMINDER,
    title: 'Deadline Reminder',
    message: '{resourceName} deadline is approaching ({deadline})',
    priority: NotificationPriority.HIGH,
    defaultChannels: [DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
    groupable: false,
    actions: [
      {
        id: 'view_details',
        label: 'View Details',
        action: 'navigate',
        style: 'primary',
      },
    ],
  },
};

// Default user preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  userId: '',
  globalEnabled: true,
  channels: {
    [DeliveryChannel.IN_APP]: true,
    [DeliveryChannel.EMAIL]: true,
    [DeliveryChannel.PUSH]: false,
    [DeliveryChannel.SMS]: false,
  },
  types: Object.values(NotificationType).reduce((acc, type) => {
    const template = DEFAULT_NOTIFICATION_TEMPLATES[type];
    acc[type] = {
      enabled: true,
      channels: template.defaultChannels,
      immediate: template.priority === NotificationPriority.URGENT || template.priority === NotificationPriority.HIGH,
      priority: template.priority,
    };
    return acc;
  }, {} as Record<NotificationType, any>),
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    days: [0, 1, 2, 3, 4, 5, 6], // All days
  },
  batching: {
    enabled: true,
    frequency: '1hour',
    maxBatchSize: 10,
  },
  mentions: {
    allMentions: true,
    directMentions: true,
    keywords: [],
  },
  autoMarkRead: {
    enabled: false,
    delaySeconds: 5,
  },
}; 