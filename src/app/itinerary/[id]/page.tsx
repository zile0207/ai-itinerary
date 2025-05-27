'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Share2, 
  Heart, 
  MoreHorizontal,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { ItineraryBuilder } from '@/components/itinerary-builder/ItineraryBuilder';
import { ItineraryDay, ItineraryActivity } from '@/components/itinerary-builder/TimelineView';
import type { Itinerary } from '@/lib/mockDataService';

export default function ItineraryViewPage() {
  return (
    <ProtectedRoute>
      <ItineraryViewContent />
    </ProtectedRoute>
  );
}

function ItineraryViewContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const itineraryId = params.id as string;

  useEffect(() => {
    loadItinerary();
  }, [itineraryId]);

  const loadItinerary = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/itineraries/${itineraryId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Itinerary not found');
        } else if (response.status === 403) {
          setError('You do not have permission to view this itinerary');
        } else {
          setError('Failed to load itinerary');
        }
        return;
      }

      const { itinerary: data } = await response.json();
      setItinerary(data);
      setIsFavorite(data.isFavorite || false);
      
      // Convert itinerary days to builder format
      const builderDays: ItineraryDay[] = data.days?.map((day: any, index: number) => ({
        id: day.id || `day-${index + 1}`,
        date: day.date || '',
        activities: day.activities?.map((activity: any) => ({
          id: activity.id || `activity-${Date.now()}-${Math.random()}`,
          title: activity.title || '',
          description: activity.description,
          startTime: activity.startTime || '09:00',
          endTime: activity.endTime,
          location: {
            id: activity.location?.id || `location-${Date.now()}-${Math.random()}`,
            name: activity.location?.name || 'Unknown Location',
            address: activity.location?.address,
            coordinates: activity.location?.coordinates
          },
          category: activity.category || 'activity',
          cost: activity.cost,
          bookingStatus: activity.bookingStatus || 'none',
          notes: activity.notes
        })) || [],
        notes: day.notes
      })) || [];
      
      setDays(builderDays);
    } catch (err) {
      console.error('Error loading itinerary:', err);
      setError('Failed to load itinerary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      // Implement API call to toggle favorite
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/itinerary/${itineraryId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Share link copied to clipboard!');
    });
  };

  const handleDaysChange = (newDays: ItineraryDay[]) => {
    setDays(newDays);
    // TODO: Auto-save changes to the backend
  };

  const handleActivityAdd = (dayId: string, timeSlot?: string) => {
    // TODO: Implement add activity functionality
    console.log('Add activity to day:', dayId, 'at time:', timeSlot);
  };

  const handleActivityUpdate = (activity: ItineraryActivity) => {
    // TODO: Implement update activity functionality
    console.log('Update activity:', activity);
  };

  const handleActivityDelete = (activityId: string) => {
    // TODO: Implement delete activity functionality
    console.log('Delete activity:', activityId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Itinerary not found'}
          </h1>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{itinerary.title}</h1>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {itinerary.destination}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFavorite}
                className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
              
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
                title="Share itinerary"
              >
                <Share2 className="h-5 w-5" />
              </button>
              
              <Link
                href={`/itinerary/${itineraryId}/edit`}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Itinerary Info */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(itinerary.startDate).toLocaleDateString()} - {new Date(itinerary.endDate).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{Math.ceil((new Date(itinerary.endDate).getTime() - new Date(itinerary.startDate).getTime()) / (1000 * 60 * 60 * 24))} days</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <span>{itinerary.travelers || 1} travelers</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign className="h-4 w-4" />
              <span>{itinerary.budget?.total ? `${itinerary.budget.total} ${itinerary.budget.currency}` : 'No budget set'}</span>
            </div>
          </div>
          
          {itinerary.description && (
            <div className="mt-4 text-gray-700">
              <p>{itinerary.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Itinerary Builder */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ItineraryBuilder
          initialDays={days}
          onDaysChange={handleDaysChange}
          onActivityAdd={handleActivityAdd}
          onActivityUpdate={handleActivityUpdate}
          onActivityDelete={handleActivityDelete}
          className="bg-white rounded-lg shadow-sm border"
          readOnly={false}
        />
      </div>
    </div>
  );
} 