import { io, Socket } from 'socket.io-client';

// Types for Socket.io events
export interface ServerToClientEvents {
  'user-joined': (data: { user: UserPresence; users: UserPresence[] }) => void;
  'user-left': (data: { userId: string; users: UserPresence[] }) => void;
  'user-focus-changed': (data: { userId: string; focusArea: string | null; users: UserPresence[] }) => void;
  'user-typing': (data: { userId: string; isTyping: boolean; area: string }) => void;
  'itinerary-updated': (data: { operation: string; data: any; userId: string }) => void;
  'comment-added': (comment: Comment) => void;
  'notification': (notification: Notification) => void;
  'notification-received': (data: { userId: string; notification: any }) => void;
  'notifications-read': (data: { userId: string; notificationIds: string[]; timestamp: string }) => void;
  'notification-preferences-updated': (data: { userId: string; preferences: any; timestamp: string }) => void;
  'error': (error: { message: string; code: string }) => void;
}

export interface ClientToServerEvents {
  'join-trip': (data: { tripId: string; user: UserInfo }) => void;
  'leave-trip': (tripId: string) => void;
  'update-focus': (data: { tripId: string; focusArea: string | null }) => void;
  'typing-start': (data: { tripId: string; area: string }) => void;
  'typing-stop': (data: { tripId: string; area: string }) => void;
  'itinerary-update': (data: { tripId: string; operation: string; data: any }) => void;
  'add-comment': (data: { tripId: string; comment: CommentData }) => void;
  'notifications-read': (data: { notificationIds: string[]; userId: string; timestamp: Date }) => void;
  'notification-preferences-updated': (data: { userId: string; preferences: any; timestamp: Date }) => void;
  'send-notification': (notification: Notification) => void;
  'send-targeted-notification': (data: { userId: string; notification: any }) => void;
}

export interface UserPresence {
  id: string;
  name: string;
  avatar?: string;
  status: 'active' | 'idle' | 'away';
  focusArea: string | null;
  lastSeen: Date;
  isTyping: boolean;
  typingArea: string | null;
}

export interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  itemId?: string;
  parentId?: string;
}

export interface CommentData {
  content: string;
  itemId?: string;
  parentId?: string;
}

export interface Notification {
  id: string;
  type: 'comment' | 'mention' | 'update' | 'join' | 'leave' | 'permission' | 'version' | 'system';
  message: string;
  userId: string;
  timestamp: Date;
  read: boolean;
}

// Socket.io client instance
let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * Initialize Socket.io client connection
 * @param token - Authentication token
 * @returns Socket.io client instance
 */
export function initializeSocket(token?: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socketInstance) {
    return socketInstance;
  }

  const options = {
    auth: token ? { token } : undefined,
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
  };

  socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', options);

  // Connection event handlers
  socketInstance.on('connect', () => {
    console.log('[Socket.io] Connected to server');
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[Socket.io] Disconnected from server:', reason);
  });

  socketInstance.on('connect_error', (error) => {
    console.error('[Socket.io] Connection error:', error);
  });

  socketInstance.on('error', (error) => {
    console.error('[Socket.io] Server error:', error);
  });

  return socketInstance;
}

/**
 * Get the current Socket.io client instance
 * @returns Socket.io client instance, initializes if not already done
 */
export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socketInstance) {
    socketInstance = initializeSocket();
  }
  return socketInstance;
}

/**
 * Disconnect and cleanup Socket.io client
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

/**
 * Check if socket is connected
 * @returns True if socket is connected
 */
export function isSocketConnected(): boolean {
  return socketInstance?.connected ?? false;
} 