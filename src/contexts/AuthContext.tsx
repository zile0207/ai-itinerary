'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/mock-data/users';
import { useToast } from './ToastContext';
import { errorHandler, retryRequest, AuthenticationError } from '@/lib/errors';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // Get token from localStorage
  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  // Set token in localStorage
  const setToken = (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  };

  // Remove token from localStorage
  const removeToken = (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  };

  // Fetch current user from API
  const fetchCurrentUser = async (): Promise<User | null> => {
    const token = getToken();
    if (!token) return null;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.user;
      } else {
        // Token is invalid, remove it
        removeToken();
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      removeToken();
      return null;
    }
  };

  // Login function with retry and better error handling
  const login = async (data: LoginData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await retryRequest(async () => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          return await response.json();
        } else {
          const error = await response.json();
          if (response.status === 401) {
            throw new AuthenticationError(error.error || 'Invalid credentials');
          }
          throw new Error(error.error || 'Login failed');
        }
      });

      setToken(result.token);
      setUser(result.user);
      
      showToast({
        type: 'success',
        title: 'Welcome back!',
        message: `Successfully signed in as ${result.user.firstName}`,
        duration: 4000
      });
    } catch (error) {
      errorHandler.logError(error as Error, 'AuthContext.login');
      
      showToast({
        type: 'error',
        title: 'Sign in failed',
        message: errorHandler.createUserMessage(error),
        duration: 6000
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function with retry and better error handling
  const register = async (data: RegisterData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await retryRequest(async () => {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          return await response.json();
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Registration failed');
        }
      });

      setToken(result.token);
      setUser(result.user);
      
      showToast({
        type: 'success',
        title: 'Account created!',
        message: `Welcome to My Itinerary App, ${result.user.firstName}!`,
        duration: 5000
      });
    } catch (error) {
      errorHandler.logError(error as Error, 'AuthContext.register');
      
      showToast({
        type: 'error',
        title: 'Registration failed',
        message: errorHandler.createUserMessage(error),
        duration: 6000
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function with user feedback
  const logout = (): void => {
    removeToken();
    setUser(null);
    
    showToast({
      type: 'info',
      title: 'Signed out',
      message: 'You have been successfully signed out',
      duration: 3000
    });
  };

  // Update profile function with better error handling
  const updateProfile = async (data: Partial<User>): Promise<void> => {
    const token = getToken();
    if (!token || !user) {
      const error = new AuthenticationError('Not authenticated');
      errorHandler.logError(error, 'AuthContext.updateProfile');
      throw error;
    }

    try {
      // For now, just update local state since we don't have a backend endpoint
      // In a real app, this would make an API call
      const updatedUser = { ...user, ...data, updatedAt: new Date().toISOString() };
      setUser(updatedUser);
      
      showToast({
        type: 'success',
        title: 'Profile updated',
        message: 'Your profile has been successfully updated',
        duration: 4000
      });
    } catch (error) {
      errorHandler.logError(error as Error, 'AuthContext.updateProfile');
      
      showToast({
        type: 'error',
        title: 'Update failed',
        message: errorHandler.createUserMessage(error),
        duration: 5000
      });
      
      throw error;
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
  };

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 