'use client';

import { PromptGenerator } from '@/components/prompt-generator/PromptGenerator';
import { PromptFormData } from '@/types/prompt';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';

export default function NewItineraryPage() {
  const router = useRouter();

  const handleSubmit = async (data: PromptFormData) => {
    console.log('Form submitted:', data);
    
    try {
      // TODO: Replace with actual API call to generate itinerary
      // For now, create a mock itinerary
             const mockItinerary = {
         id: `itin_${Date.now()}`,
         title: `Trip to ${data.destination.name}`,
         destination: data.destination.name,
         startDate: data.dateRange.start?.toISOString() || '',
         endDate: data.dateRange.end?.toISOString() || '',
         travelers: data.travelers,
         budget: data.budget,
         interests: data.interests,
         // Add other generated content here
       };

      // Redirect to the generated itinerary
      router.push(`/itinerary/${mockItinerary.id}`);
    } catch (error) {
      console.error('Error generating itinerary:', error);
      alert('Failed to generate itinerary. Please try again.');
    }
  };

  const handleSave = (data: Partial<PromptFormData>) => {
    console.log('Auto-save data:', data);
    // TODO: Implement auto-save to localStorage or server
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Plan Your Perfect Trip
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tell us about your dream destination and preferences, and we&apos;ll create a personalized itinerary just for you.
            </p>
          </div>

          <PromptGenerator
            onSubmit={handleSubmit}
            onSave={handleSave}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
} 