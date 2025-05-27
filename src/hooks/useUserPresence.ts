import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, UserPresence, UserInfo } from '@/lib/socket/client';

interface UseUserPresenceOptions {
  tripId: string;
  user: UserInfo;
  enabled?: boolean;
}

interface UseUserPresenceReturn {
  users: UserPresence[];
  isConnected: boolean;
  joinTrip: () => void;
  leaveTrip: () => void;
  updateFocus: (focusArea: string | null) => void;
  startTyping: (area: string) => void;
  stopTyping: (area: string) => void;
  currentUser: UserPresence | null;
}

/**
 * Custom hook for managing user presence in collaborative trips
 * @param options - Configuration options
 * @returns Presence state and control functions
 */
export function useUserPresence({
  tripId,
  user,
  enabled = true,
}: UseUserPresenceOptions): UseUserPresenceReturn {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserPresence | null>(null);
  
  const socket = getSocket();
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const idleTimeout = useRef<NodeJS.Timeout | null>(null);
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Create current user presence object
  useEffect(() => {
    if (user) {
      setCurrentUser({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        status: 'active',
        focusArea: null,
        lastSeen: new Date(),
        isTyping: false,
        typingArea: null,
      });
    }
  }, [user]);

  // Handle socket events
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleConnect = () => {
      setIsConnected(true);
      console.log('[Presence] Socket connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setUsers([]);
      console.log('[Presence] Socket disconnected');
    };

    const handleUserJoined = (data: { user: UserPresence; users: UserPresence[] }) => {
      setUsers(data.users);
      console.log('[Presence] User joined:', data.user.name);
    };

    const handleUserLeft = (data: { userId: string; users: UserPresence[] }) => {
      setUsers(data.users);
      console.log('[Presence] User left:', data.userId);
    };

    const handleUserFocusChanged = (data: { 
      userId: string; 
      focusArea: string | null; 
      users: UserPresence[] 
    }) => {
      setUsers(data.users);
      console.log('[Presence] User focus changed:', data.userId, data.focusArea);
    };

    const handleUserTyping = (data: { userId: string; isTyping: boolean; area: string }) => {
      setUsers(prev => prev.map(u => 
        u.id === data.userId 
          ? { ...u, isTyping: data.isTyping, typingArea: data.isTyping ? data.area : null }
          : u
      ));
    };

    const handleError = (error: { message: string; code: string }) => {
      console.error('[Presence] Socket error:', error);
    };

    // Subscribe to events
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('user-focus-changed', handleUserFocusChanged);
    socket.on('user-typing', handleUserTyping);
    socket.on('error', handleError);

    // Set initial connection state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('user-focus-changed', handleUserFocusChanged);
      socket.off('user-typing', handleUserTyping);
      socket.off('error', handleError);
    };
  }, [socket, enabled]);

  // Setup heartbeat and idle detection
  useEffect(() => {
    if (!isConnected || !enabled) return;

    // Heartbeat every 30 seconds
    heartbeatInterval.current = setInterval(() => {
      if (currentUser) {
        setCurrentUser(prev => prev ? { ...prev, lastSeen: new Date() } : null);
      }
    }, 30000);

    // Reset idle timeout on user activity
    const resetIdleTimeout = () => {
      if (idleTimeout.current) {
        clearTimeout(idleTimeout.current);
      }
      
      // Set user to idle after 5 minutes of inactivity
      idleTimeout.current = setTimeout(() => {
        setCurrentUser(prev => prev ? { ...prev, status: 'idle' } : null);
      }, 5 * 60 * 1000);

      // Set user to active if they were idle
      setCurrentUser(prev => 
        prev && prev.status === 'idle' 
          ? { ...prev, status: 'active' } 
          : prev
      );
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimeout, true);
    });

    // Initial timeout setup
    resetIdleTimeout();

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (idleTimeout.current) {
        clearTimeout(idleTimeout.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimeout, true);
      });
    };
  }, [isConnected, enabled, currentUser]);

  // Join trip room
  const joinTrip = useCallback(() => {
    if (socket && user && enabled) {
      socket.emit('join-trip', { tripId, user });
      console.log('[Presence] Joining trip:', tripId);
    }
  }, [socket, tripId, user, enabled]);

  // Leave trip room
  const leaveTrip = useCallback(() => {
    if (socket && enabled) {
      socket.emit('leave-trip', tripId);
      console.log('[Presence] Leaving trip:', tripId);
    }
  }, [socket, tripId, enabled]);

  // Update user focus area
  const updateFocus = useCallback((focusArea: string | null) => {
    if (socket && enabled) {
      socket.emit('update-focus', { tripId, focusArea });
      setCurrentUser(prev => prev ? { ...prev, focusArea } : null);
    }
  }, [socket, tripId, enabled]);

  // Start typing indicator
  const startTyping = useCallback((area: string) => {
    if (socket && enabled) {
      socket.emit('typing-start', { tripId, area });
      
      // Clear any existing timeout for this area
      const existing = typingTimeouts.current.get(area);
      if (existing) {
        clearTimeout(existing);
      }
      
      // Auto-stop typing after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        stopTyping(area);
      }, 3000);
      
      typingTimeouts.current.set(area, timeout);
    }
  }, [socket, tripId, enabled]);

  // Stop typing indicator
  const stopTyping = useCallback((area: string) => {
    if (socket && enabled) {
      socket.emit('typing-stop', { tripId, area });
      
      // Clear timeout
      const timeout = typingTimeouts.current.get(area);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeouts.current.delete(area);
      }
    }
  }, [socket, tripId, enabled]);

  // Auto-join on mount, auto-leave on unmount
  useEffect(() => {
    if (enabled && isConnected) {
      joinTrip();
    }

    return () => {
      if (enabled) {
        leaveTrip();
      }
    };
  }, [enabled, isConnected, joinTrip, leaveTrip]);

  return {
    users,
    isConnected,
    joinTrip,
    leaveTrip,
    updateFocus,
    startTyping,
    stopTyping,
    currentUser,
  };
} 