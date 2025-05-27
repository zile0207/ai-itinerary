'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NotificationCenter, NotificationTester } from '@/components/notifications';
import { useNotifications } from '@/hooks/useNotifications';
import Link from 'next/link';
import { ArrowLeft, Bell } from 'lucide-react';

export default function NotificationsTestPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center gap-4">
                <Link 
                  href="/dashboard"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
                <div className="h-4 border-l border-gray-300"></div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Notification System Test</h1>
                  <p className="text-gray-600">Real-time notification testing and demonstration</p>
                </div>
              </div>

              {/* Notification Center in header for comparison */}
              <div className="flex items-center gap-4">
                <NotificationCenter 
                  variant="icon"
                  showSettingsButton={true}
                  onNotificationClick={(id) => {
                    console.log('Header notification clicked:', id);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Notification Tester */}
            <div>
              <NotificationTester />
            </div>

            {/* Notification Center Panel View */}
            <div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Notification Center (Panel)</h3>
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <NotificationCenter 
                    variant="panel"
                    showSettingsButton={true}
                    onNotificationClick={(id) => {
                      console.log('Panel notification clicked:', id);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Testing Instructions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
              <div>
                <h4 className="font-medium mb-2">Socket.io Integration:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Connection status shows in the tester</li>
                  <li>Real-time events are logged to console</li>
                  <li>Notifications sync across components</li>
                  <li>Read states persist in real-time</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Testing Features:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Simulate different notification types</li>
                  <li>Test mark as read functionality</li>
                  <li>Compare icon vs panel variants</li>
                  <li>Verify unread count synchronization</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Real-time Events Log */}
          <div className="mt-8">
            <RealTimeEventLog />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function RealTimeEventLog() {
  const { notifications, connected } = useNotifications();
  
  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Real-time Event Log</h3>
        <div className={`flex items-center gap-2 text-sm ${
          connected ? 'text-green-400' : 'text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-sm">
        <div className="text-gray-400">// Recent notification events (newest first)</div>
        {notifications.slice(0, 10).map((notification, index) => (
          <div key={notification.id} className="text-gray-300">
            <span className="text-blue-400">[{notification.createdAt.toLocaleTimeString()}]</span>{' '}
            <span className="text-yellow-400">{notification.type.toUpperCase()}</span>:{' '}
            <span className="text-white">{notification.title}</span>
            {notification.readAt && <span className="text-green-400"> • READ</span>}
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="text-gray-500">No events yet. Use the tester to generate notifications.</div>
        )}
      </div>
    </div>
  );
} 