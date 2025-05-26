'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, updateProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await updateProfile(data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update profile' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    });
    setIsEditing(false);
    setMessage(null);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                My Itinerary App
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
                Dashboard
              </Link>
              <span className="text-sm text-gray-700">
                {user.firstName} {user.lastName}
              </span>
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account information and preferences</p>
            </div>

            {message && (
              <div className={`mx-6 mt-4 p-4 rounded-md ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${
                  message.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {message.text}
                </p>
              </div>
            )}

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Picture Section */}
                <div className="lg:col-span-1">
                  <div className="text-center">
                    <div className="mx-auto h-32 w-32 rounded-full overflow-hidden bg-gray-100">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-blue-500 text-white text-2xl font-bold">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-gray-500">{user.email}</p>
                    <button className="mt-2 text-sm text-blue-600 hover:text-blue-500">
                      Change photo
                    </button>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Account Status</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isEmailVerified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.isEmailVerified ? 'Email Verified' : 'Email Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Member since {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                        {user.lastLogin && (
                          <p className="text-xs text-gray-500">
                            Last login {new Date(user.lastLogin).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Form Section */}
                <div className="lg:col-span-2">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                          First name
                        </label>
                        <input
                          {...register('firstName')}
                          type="text"
                          id="firstName"
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                        {errors.firstName && (
                          <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                          Last name
                        </label>
                        <input
                          {...register('lastName')}
                          type="text"
                          id="lastName"
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email address
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        id="email"
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Preferences Section */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Currency
                          </label>
                          <select 
                            disabled={!isEditing}
                            defaultValue={user.preferences.currency}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                          >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="JPY">JPY - Japanese Yen</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Travel Interests
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {user.preferences.travelInterests.map((interest, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notifications
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                disabled={!isEditing}
                                defaultChecked={user.preferences.notificationSettings.email}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">Email notifications</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                disabled={!isEditing}
                                defaultChecked={user.preferences.notificationSettings.push}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">Push notifications</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                disabled={!isEditing}
                                defaultChecked={user.preferences.notificationSettings.sms}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">SMS notifications</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-6 border-t">
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Edit Profile
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleCancel}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Saving...
                              </div>
                            ) : (
                              'Save Changes'
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 