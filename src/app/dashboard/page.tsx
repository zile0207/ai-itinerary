'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">My Itinerary App</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user?.profilePicture && (
                  <img
                    src={user.profilePicture}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-sm text-gray-700">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to your Dashboard, {user?.firstName}!
              </h2>
              <p className="text-gray-600 mb-8">
                Your authentication is working perfectly. This is a protected page that requires login.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">My Itineraries</h3>
                  <p className="text-gray-600 text-sm">View and manage your travel plans</p>
                  <button className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                    View Itineraries
                  </button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Trip</h3>
                  <p className="text-gray-600 text-sm">Plan your next adventure</p>
                  <Link href="/prompt-generator" className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 block text-center">
                    Create Trip
                  </Link>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Settings</h3>
                  <p className="text-gray-600 text-sm">Update your preferences</p>
                  <Link href="/profile" className="mt-4 w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 block text-center">
                    Edit Profile
                  </Link>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">User Information</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Member since:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Last login:</strong> {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Email verified:</strong> {user?.isEmailVerified ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 