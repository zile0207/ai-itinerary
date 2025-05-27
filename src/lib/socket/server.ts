import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  User,
  ActiveUser,
  RoomInfo,
  SocketError
} from './types';

// In-memory storage for active rooms and users
// In production, this would be replaced with Redis or similar
const activeRooms = new Map<string, RoomInfo>();
const userSessions = new Map<string, { userId: string; itineraryId?: string }>();

export class SocketServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXT_PUBLIC_APP_URL 
          : ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['polling', 'websocket'],
      allowEIO3: true
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const authHeader = socket.handshake.headers.authorization;
        const token = socket.handshake.auth.token || (typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : undefined);
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        
        // In a real app, you'd fetch user data from database
        const user: User = {
          id: decoded.userId || decoded.id,
          name: decoded.name || 'Unknown User',
          email: decoded.email || '',
          avatar: decoded.avatar
        };

        socket.data.user = user;
        socket.data.isAuthenticated = true;
        
        // Store user session
        userSessions.set(socket.id, { userId: user.id });
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Invalid authentication token'));
      }
    });

    // Logging middleware
    this.io.use((socket, next) => {
      const user = socket.data.user;
      console.log(`[Socket.io] User ${user?.name} (${user?.id}) connecting from ${socket.handshake.address}`);
      next();
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      console.log(`[Socket.io] User ${user.name} connected with socket ID: ${socket.id}`);

      // Join itinerary room
      socket.on('join-itinerary', ({ itineraryId, user: clientUser }) => {
        try {
          console.log(`[Socket.io] User ${user.name} joining itinerary: ${itineraryId}`);
          
          // Leave previous room if any
          if (socket.data.itineraryId) {
            this.handleLeaveItinerary(socket, socket.data.itineraryId);
          }

          // Join new room
          socket.join(`itinerary:${itineraryId}`);
          socket.data.itineraryId = itineraryId;
          
          // Update user session
          const session = userSessions.get(socket.id);
          if (session) {
            session.itineraryId = itineraryId;
          }

          // Initialize room if doesn't exist
          if (!activeRooms.has(itineraryId)) {
            activeRooms.set(itineraryId, {
              itineraryId,
              activeUsers: new Map(),
              operations: [],
              comments: []
            });
          }

          const room = activeRooms.get(itineraryId)!;
          
          // Add user to active users
          const activeUser: ActiveUser = {
            ...user,
            socketId: socket.id,
            lastActivity: new Date(),
            focusArea: undefined,
            isTyping: false
          };
          
          room.activeUsers.set(socket.id, activeUser);

          // Broadcast updated user list to all users in room
          const activeUsersList = Array.from(room.activeUsers.values());
          this.io.to(`itinerary:${itineraryId}`).emit('active-users', activeUsersList);
          
          // Notify others that user joined
          socket.to(`itinerary:${itineraryId}`).emit('user-joined', activeUser);
          
          console.log(`[Socket.io] User ${user.name} joined itinerary ${itineraryId}. Total users: ${room.activeUsers.size}`);
        } catch (error) {
          console.error('[Socket.io] Error joining itinerary:', error);
          socket.emit('connection-error', 'Failed to join itinerary');
        }
      });

      // Leave itinerary room
      socket.on('leave-itinerary', ({ itineraryId }) => {
        this.handleLeaveItinerary(socket, itineraryId);
      });

      // Update user focus area
      socket.on('update-focus', ({ itineraryId, focusArea }) => {
        try {
          const room = activeRooms.get(itineraryId);
          const activeUser = room?.activeUsers.get(socket.id);
          
          if (activeUser) {
            activeUser.focusArea = focusArea;
            activeUser.lastActivity = new Date();
            
            // Broadcast focus change to other users
            socket.to(`itinerary:${itineraryId}`).emit('user-focus-changed', user.id, focusArea);
          }
        } catch (error) {
          console.error('[Socket.io] Error updating focus:', error);
        }
      });

      // Set typing indicator
      socket.on('set-typing', ({ itineraryId, isTyping }) => {
        try {
          const room = activeRooms.get(itineraryId);
          const activeUser = room?.activeUsers.get(socket.id);
          
          if (activeUser) {
            activeUser.isTyping = isTyping;
            activeUser.lastActivity = new Date();
            
            // Broadcast typing indicator to other users
            socket.to(`itinerary:${itineraryId}`).emit('user-typing', user.id, isTyping);
          }
        } catch (error) {
          console.error('[Socket.io] Error setting typing indicator:', error);
        }
      });

      // Handle itinerary operations (will be expanded in next subtasks)
      socket.on('itinerary-operation', ({ itineraryId, operation }) => {
        try {
          console.log(`[Socket.io] Itinerary operation from ${user.name}:`, operation.type, operation.entityType);
          
          const room = activeRooms.get(itineraryId);
          if (!room) {
            socket.emit('connection-error', 'Itinerary room not found');
            return;
          }

          // Add operation to room history
          room.operations.push(operation);
          
          // Broadcast operation to other users
          socket.to(`itinerary:${itineraryId}`).emit('itinerary-updated', operation);
          
        } catch (error) {
          console.error('[Socket.io] Error handling itinerary operation:', error);
          socket.emit('connection-error', 'Failed to process operation');
        }
      });

      // Handle comments (placeholder for future implementation)
      socket.on('add-comment', ({ itineraryId, comment }) => {
        try {
          console.log(`[Socket.io] Comment added by ${user.name} on itinerary ${itineraryId}`);
          
          const fullComment = {
            ...comment,
            id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            authorId: user.id,
            authorName: user.name,
            authorAvatar: user.avatar
          };

          const room = activeRooms.get(itineraryId);
          if (room) {
            room.comments.push(fullComment);
          }

          // Broadcast comment to all users in room
          this.io.to(`itinerary:${itineraryId}`).emit('comment-added', fullComment);
          
        } catch (error) {
          console.error('[Socket.io] Error adding comment:', error);
          socket.emit('connection-error', 'Failed to add comment');
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`[Socket.io] User ${user.name} disconnected: ${reason}`);
        
        // Clean up user from all rooms
        const session = userSessions.get(socket.id);
        if (session?.itineraryId) {
          this.handleLeaveItinerary(socket, session.itineraryId);
        }
        
        // Remove user session
        userSessions.delete(socket.id);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`[Socket.io] Socket error for user ${user.name}:`, error);
      });
    });
  }

  private handleLeaveItinerary(socket: any, itineraryId: string) {
    try {
      const user = socket.data.user;
      console.log(`[Socket.io] User ${user.name} leaving itinerary: ${itineraryId}`);
      
      socket.leave(`itinerary:${itineraryId}`);
      
      const room = activeRooms.get(itineraryId);
      if (room) {
        room.activeUsers.delete(socket.id);
        
        // Broadcast user left to remaining users
        socket.to(`itinerary:${itineraryId}`).emit('user-left', user.id);
        
        // Broadcast updated user list
        const activeUsersList = Array.from(room.activeUsers.values());
        this.io.to(`itinerary:${itineraryId}`).emit('active-users', activeUsersList);
        
        // Clean up empty rooms
        if (room.activeUsers.size === 0) {
          console.log(`[Socket.io] Cleaning up empty room: ${itineraryId}`);
          activeRooms.delete(itineraryId);
        }
      }
      
      socket.data.itineraryId = undefined;
      
      // Update user session
      const session = userSessions.get(socket.id);
      if (session) {
        session.itineraryId = undefined;
      }
    } catch (error) {
      console.error('[Socket.io] Error leaving itinerary:', error);
    }
  }

  // Utility methods
  public getRoomInfo(itineraryId: string): RoomInfo | undefined {
    return activeRooms.get(itineraryId);
  }

  public getActiveUsersCount(itineraryId: string): number {
    const room = activeRooms.get(itineraryId);
    return room ? room.activeUsers.size : 0;
  }

  public broadcastToItinerary(itineraryId: string, event: string, data: any) {
    this.io.to(`itinerary:${itineraryId}`).emit(event, data);
  }

  public getServer(): Server {
    return this.io;
  }

  // Cleanup method for graceful shutdown
  public close() {
    console.log('[Socket.io] Server shutting down...');
    this.io.close();
    activeRooms.clear();
    userSessions.clear();
  }
}

// Global server instance
let socketServer: SocketServer | null = null;

export function initSocketServer(server: any): SocketServer {
  if (!socketServer) {
    socketServer = new SocketServer(server);
    console.log('[Socket.io] Server initialized');
  }
  return socketServer;
}

export function getSocketServer(): SocketServer | null {
  return socketServer;
} 