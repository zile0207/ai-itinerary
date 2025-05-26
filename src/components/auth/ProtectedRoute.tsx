'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback = null,
  redirectTo = '/login'
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the current path to redirect back after login
      const currentPath = window.location.pathname + window.location.search;
      const returnUrl = encodeURIComponent(currentPath);
      router.push(`${redirectTo}?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show fallback or nothing if not authenticated
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Render children if authenticated
  return <>{children}</>;
};

// Higher-order component version for easier use
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options?: { redirectTo?: string; fallback?: ReactNode }
) => {
  const AuthenticatedComponent = (props: P) => (
    <ProtectedRoute 
      redirectTo={options?.redirectTo} 
      fallback={options?.fallback}
    >
      <Component {...props} />
    </ProtectedRoute>
  );

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
}; 