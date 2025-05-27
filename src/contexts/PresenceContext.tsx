import React, { createContext, useContext, useEffect, useRef } from 'react';
import { initializeSocket, disconnectSocket, UserInfo } from '@/lib/socket/client';
import { useAuth } from './AuthContext';

interface PresenceContextType {
  isSocketInitialized: boolean;
  currentUser: UserInfo | null;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

interface PresenceProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for managing Socket.io connection and presence state
 */
export function PresenceProvider({ children }: PresenceProviderProps) {
  const { user } = useAuth();
  const socketInitialized = useRef(false);

  // Get token from localStorage
  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  // Initialize Socket.io connection when user is authenticated
  useEffect(() => {
    const token = getToken();
    if (user && token && !socketInitialized.current) {
      console.log('[PresenceProvider] Initializing Socket.io connection');
      initializeSocket(token);
      socketInitialized.current = true;
    }

    // Cleanup on user logout
    if (!user && socketInitialized.current) {
      console.log('[PresenceProvider] Disconnecting Socket.io');
      disconnectSocket();
      socketInitialized.current = false;
    }
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketInitialized.current) {
        disconnectSocket();
        socketInitialized.current = false;
      }
    };
  }, []);

  const currentUser: UserInfo | null = user ? {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    avatar: user.profilePicture
  } : null;

  const value = {
    isSocketInitialized: socketInitialized.current && !!user,
    currentUser,
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

/**
 * Hook to access presence context
 */
export function usePresenceContext() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresenceContext must be used within a PresenceProvider');
  }
  return context;
}

/**
 * Hook to check if Socket.io is available and ready
 */
export function useSocketReady() {
  const { isSocketInitialized } = usePresenceContext();
  return isSocketInitialized;
} 