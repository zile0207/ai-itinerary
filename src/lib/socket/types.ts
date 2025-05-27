export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ActiveUser extends User {
  socketId: string;
  focusArea?: string; // Current section/activity user is viewing/editing
  lastActivity: Date;
  isTyping?: boolean;
}

export interface ItineraryOperation {
  type: 'create' | 'update' | 'delete' | 'reorder';
  entityType: 'activity' | 'day' | 'note' | 'metadata';
  entityId: string;
  data: any;
  timestamp: Date;
  userId: string;
  previousData?: any; // For rollback functionality
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: Date;
  entityType: 'activity' | 'day' | 'itinerary';
  entityId: string;
  parentCommentId?: string; // For threaded comments
  mentions?: string[]; // User IDs mentioned in comment
  isResolved?: boolean;
}

export interface VersionSnapshot {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  operation: ItineraryOperation;
  itineraryState: any; // Full or partial itinerary state
  description?: string; // Human-readable description of changes
}

export interface CollaborationState {
  activeUsers: ActiveUser[];
  recentComments: Comment[];
  hasUnseenChanges: boolean;
  lastSyncedAt: Date;
}

// Server to Client Events
export interface ServerToClientEvents {
  // User presence
  'active-users': (users: ActiveUser[]) => void;
  'user-joined': (user: ActiveUser) => void;
  'user-left': (userId: string) => void;
  'user-focus-changed': (userId: string, focusArea: string | null) => void;
  'user-typing': (userId: string, isTyping: boolean) => void;

  // Itinerary operations
  'itinerary-updated': (operation: ItineraryOperation) => void;
  'operation-conflict': (operation: ItineraryOperation, conflictingOperation: ItineraryOperation) => void;

  // Operational Transformation (OT) events
  'ot-operation': (data: { operation: any; tripId: string }) => void;
  'ot-acknowledged': (data: { operationId: string }) => void;
  'ot-rejected': (data: { operationId: string; reason: string }) => void;
  'ot-undo': (data: { operationId: string; timestamp: number; tripId: string }) => void;
  'ot-redo': (data: { operationId: string; timestamp: number; tripId: string }) => void;

  // Comments
  'comment-added': (comment: Comment) => void;
  'comment-updated': (comment: Comment) => void;
  'comment-deleted': (commentId: string) => void;
  'comment-resolved': (commentId: string, isResolved: boolean) => void;

  // Version control
  'version-created': (version: VersionSnapshot) => void;
  'itinerary-rolled-back': (versionId: string, newState: any) => void;

  // Notifications
  'notification': (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
  'mentioned': (comment: Comment) => void;

  // Connection management
  'connection-error': (error: string) => void;
  'reconnected': () => void;
}

// Client to Server Events
export interface ClientToServerEvents {
  // Room management
  'join-itinerary': (data: { itineraryId: string; user: User }) => void;
  'leave-itinerary': (data: { itineraryId: string }) => void;

  // User presence
  'update-focus': (data: { itineraryId: string; focusArea: string | null }) => void;
  'set-typing': (data: { itineraryId: string; isTyping: boolean }) => void;

  // Itinerary operations
  'itinerary-operation': (data: { itineraryId: string; operation: ItineraryOperation }) => void;
  'request-sync': (data: { itineraryId: string; lastSyncedAt: Date }) => void;

  // Operational Transformation (OT) events
  'ot-operation': (data: { tripId: string; operation: any }) => void;
  'ot-undo': (data: { tripId: string; operationId: string }) => void;
  'ot-redo': (data: { tripId: string; operationId: string }) => void;

  // Comments
  'add-comment': (data: { itineraryId: string; comment: Omit<Comment, 'id' | 'timestamp'> }) => void;
  'update-comment': (data: { itineraryId: string; commentId: string; content: string }) => void;
  'delete-comment': (data: { itineraryId: string; commentId: string }) => void;
  'resolve-comment': (data: { itineraryId: string; commentId: string; isResolved: boolean }) => void;

  // Version control
  'create-version': (data: { itineraryId: string; description?: string }) => void;
  'rollback-to-version': (data: { itineraryId: string; versionId: string }) => void;
  'get-version-history': (data: { itineraryId: string }) => void;

  // Authentication
  'authenticate': (token: string) => void;
}

// Inter-server events (for scaling with multiple servers)
export interface InterServerEvents {
  'user-joined-itinerary': (data: { itineraryId: string; user: ActiveUser }) => void;
  'user-left-itinerary': (data: { itineraryId: string; userId: string }) => void;
  'itinerary-operation': (data: { itineraryId: string; operation: ItineraryOperation }) => void;
}

// Socket data attached to each socket
export interface SocketData {
  user: User;
  itineraryId?: string;
  isAuthenticated: boolean;
}

// Room information
export interface RoomInfo {
  itineraryId: string;
  activeUsers: Map<string, ActiveUser>;
  operations: ItineraryOperation[];
  comments: Comment[];
}

// Error types
export interface SocketError {
  code: string;
  message: string;
  details?: any;
}

// Permission levels
export type PermissionLevel = 'view' | 'comment' | 'edit' | 'admin';

export interface UserPermission {
  userId: string;
  itineraryId: string;
  level: PermissionLevel;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
} 