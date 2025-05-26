'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SocialLoginButtonsProps {
  onSuccess?: () => void;
  className?: string;
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({ 
  onSuccess, 
  className = '' 
}) => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const generateState = (): string => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      // Generate CSRF protection state
      const state = generateState();
      sessionStorage.setItem('oauth_state', state);

      // Check if we have Google OAuth configured
      const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      
      if (googleClientId) {
        // Real OAuth flow - redirect to Google
        const redirectUri = `${window.location.origin}/auth/callback/google`;
        const scope = 'openid email profile';
        
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleAuthUrl.searchParams.set('client_id', googleClientId);
        googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('scope', scope);
        googleAuthUrl.searchParams.set('state', state);
        googleAuthUrl.searchParams.set('access_type', 'offline');
        googleAuthUrl.searchParams.set('prompt', 'consent');

        // Redirect to Google OAuth
        window.location.href = googleAuthUrl.toString();
        return;
      }

      // Mock OAuth flow for development
      console.log('Initiating mock Google OAuth flow with state:', state);
      
      // Simulate OAuth flow delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful OAuth response
      const mockGoogleUser = {
        email: 'google.user@gmail.com',
        firstName: 'Google',
        lastName: 'User',
        profilePicture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        provider: 'google'
      };

      // Simulate login with OAuth data
      await login({
        email: mockGoogleUser.email,
        password: 'oauth-login' // This would be handled differently in real OAuth
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Google login failed. Please try again.');
      console.error('Google OAuth error:', err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsFacebookLoading(true);
    setError(null);

    try {
      // Generate CSRF protection state
      const state = generateState();
      sessionStorage.setItem('oauth_state', state);

      // Check if we have Facebook OAuth configured
      const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      
      if (facebookAppId) {
        // Real OAuth flow - redirect to Facebook
        const redirectUri = `${window.location.origin}/auth/callback/facebook`;
        const scope = 'email,public_profile';
        
        const facebookAuthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
        facebookAuthUrl.searchParams.set('client_id', facebookAppId);
        facebookAuthUrl.searchParams.set('redirect_uri', redirectUri);
        facebookAuthUrl.searchParams.set('response_type', 'code');
        facebookAuthUrl.searchParams.set('scope', scope);
        facebookAuthUrl.searchParams.set('state', state);

        // Redirect to Facebook OAuth
        window.location.href = facebookAuthUrl.toString();
        return;
      }

      // Mock OAuth flow for development
      console.log('Initiating mock Facebook OAuth flow with state:', state);
      
      // Simulate OAuth flow delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful OAuth response
      const mockFacebookUser = {
        email: 'facebook.user@facebook.com',
        firstName: 'Facebook',
        lastName: 'User',
        profilePicture: 'https://graph.facebook.com/me/picture?type=large',
        provider: 'facebook'
      };

      // Simulate login with OAuth data
      await login({
        email: mockFacebookUser.email,
        password: 'oauth-login' // This would be handled differently in real OAuth
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Facebook login failed. Please try again.');
      console.error('Facebook OAuth error:', err);
    } finally {
      setIsFacebookLoading(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Google Login Button */}
      <button
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading || isFacebookLoading}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGoogleLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
            Connecting to Google...
          </div>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </>
        )}
      </button>

      {/* Facebook Login Button */}
      <button
        onClick={handleFacebookLogin}
        disabled={isGoogleLoading || isFacebookLoading}
        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-[#1877F2] text-sm font-medium text-white hover:bg-[#166FE5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isFacebookLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Connecting to Facebook...
          </div>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </>
        )}
      </button>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          By continuing with social login, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-500">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-500">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}; 