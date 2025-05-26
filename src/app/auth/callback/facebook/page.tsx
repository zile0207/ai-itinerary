'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function FacebookCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get OAuth parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for OAuth errors
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Verify state parameter for CSRF protection
        const storedState = sessionStorage.getItem('oauth_state');
        if (!state || state !== storedState) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Clean up stored state
        sessionStorage.removeItem('oauth_state');

        // In a real implementation, you would:
        // 1. Send the code to your backend
        // 2. Backend exchanges code for access token with Facebook
        // 3. Backend gets user info from Facebook
        // 4. Backend creates/updates user account
        // 5. Backend returns JWT token

        // For now, simulate successful OAuth login
        console.log('Processing Facebook OAuth callback with code:', code);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock successful login (in real app, this would use the JWT from backend)
        await login({
          email: 'facebook.user@facebook.com',
          password: 'oauth-login'
        });

        setStatus('success');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);

      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
        
        // Redirect to login page after error
        setTimeout(() => {
          router.push('/login?error=oauth_failed');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1877F2] mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Completing Facebook Sign-in
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your account...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="rounded-full h-12 w-12 bg-green-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Sign-in Successful!
              </h2>
              <p className="text-gray-600">
                Redirecting you to your dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="rounded-full h-12 w-12 bg-red-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Authentication Failed
              </h2>
              <p className="text-gray-600 mb-4">
                {error || 'Something went wrong during sign-in.'}
              </p>
              <p className="text-sm text-gray-500">
                Redirecting you back to the login page...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 