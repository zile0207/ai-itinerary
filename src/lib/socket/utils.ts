import type { SocketError, ItineraryOperation, Comment } from './types';

// Error handling utilities
export const createSocketError = (code: string, message: string, details?: any): SocketError => ({
  code,
  message,
  details
});

export const handleSocketError = (error: any, context: string): SocketError => {
  console.error(`[Socket.io ${context}] Error:`, error);
  
  if (error.name === 'JsonWebTokenError') {
    return createSocketError('AUTH_INVALID_TOKEN', 'Invalid authentication token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return createSocketError('AUTH_TOKEN_EXPIRED', 'Authentication token expired');
  }
  
  if (error.code === 'ECONNREFUSED') {
    return createSocketError('CONNECTION_REFUSED', 'Connection refused');
  }
  
  return createSocketError('UNKNOWN_ERROR', error.message || 'An unknown error occurred', error);
};

// Logging utilities
export const logSocketEvent = (event: string, userId: string, itineraryId?: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    event,
    userId,
    itineraryId,
    data: data ? JSON.stringify(data).substring(0, 100) : undefined
  };
  
  console.log(`[Socket.io Event] ${JSON.stringify(logData)}`);
};

// Validation utilities
export const validateItineraryOperation = (operation: ItineraryOperation): boolean => {
  const requiredFields = ['type', 'entityType', 'entityId', 'timestamp', 'userId'];
  
  for (const field of requiredFields) {
    if (!operation[field as keyof ItineraryOperation]) {
      console.error(`[Socket.io] Invalid operation: missing ${field}`);
      return false;
    }
  }
  
  const validTypes = ['create', 'update', 'delete', 'reorder'];
  if (!validTypes.includes(operation.type)) {
    console.error(`[Socket.io] Invalid operation type: ${operation.type}`);
    return false;
  }
  
  const validEntityTypes = ['activity', 'day', 'note', 'metadata'];
  if (!validEntityTypes.includes(operation.entityType)) {
    console.error(`[Socket.io] Invalid entity type: ${operation.entityType}`);
    return false;
  }
  
  return true;
};

export const validateComment = (comment: Partial<Comment>): boolean => {
  if (!comment.content || comment.content.trim().length === 0) {
    console.error('[Socket.io] Invalid comment: content is required');
    return false;
  }
  
  if (!comment.entityType || !comment.entityId) {
    console.error('[Socket.io] Invalid comment: entityType and entityId are required');
    return false;
  }
  
  const validEntityTypes = ['activity', 'day', 'itinerary'];
  if (!validEntityTypes.includes(comment.entityType)) {
    console.error(`[Socket.io] Invalid comment entity type: ${comment.entityType}`);
    return false;
  }
  
  return true;
};

// Rate limiting utilities
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (userId: string, limit = 10, windowMs = 60000): boolean => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
};

// Cleanup utilities
export const cleanupOldSessions = (activeRooms: Map<string, any>, maxAge = 24 * 60 * 60 * 1000) => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [roomId, room] of activeRooms.entries()) {
    const roomUsers = Array.from(room.activeUsers.values());
    const hasActiveUsers = roomUsers.some(user => 
      now - user.lastActivity.getTime() < maxAge
    );
    
    if (!hasActiveUsers && roomUsers.length === 0) {
      activeRooms.delete(roomId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[Socket.io] Cleaned up ${cleanedCount} inactive rooms`);
  }
};

// ID generation utilities
export const generateId = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}_${random}`;
};

export const generateCommentId = (): string => generateId('comment_');
export const generateOperationId = (): string => generateId('op_');
export const generateVersionId = (): string => generateId('version_');

// Permission utilities
export const hasPermission = (userRole: string, requiredPermission: string): boolean => {
  const roleHierarchy: Record<string, string[]> = {
    'admin': ['view', 'comment', 'edit', 'admin'],
    'edit': ['view', 'comment', 'edit'],
    'comment': ['view', 'comment'],
    'view': ['view']
  };
  
  const userPermissions = roleHierarchy[userRole] || [];
  return userPermissions.includes(requiredPermission);
};

// Data sanitization utilities
export const sanitizeComment = (content: string): string => {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .trim();
};

// Connection health utilities
export const isHealthyConnection = (socket: any): boolean => {
  return socket.connected && !socket.disconnected;
};

export const getConnectionInfo = (socket: any) => ({
  id: socket.id,
  connected: socket.connected,
  address: socket.handshake.address,
  userAgent: socket.handshake.headers['user-agent'],
  connectTime: socket.handshake.time
});

// Performance monitoring utilities
export const measureExecutionTime = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      console.warn(`[Socket.io Performance] ${operationName} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Socket.io Performance] ${operationName} failed after ${duration}ms:`, error);
    throw error;
  }
}; 