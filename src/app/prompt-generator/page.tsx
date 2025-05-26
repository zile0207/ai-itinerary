'use client';

import { PromptGenerator } from '@/components/prompt-generator/PromptGenerator';
import { PromptFormData } from '@/types/prompt';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function PromptGeneratorPage() {
  const handleSubmit = (data: PromptFormData) => {
    console.log('Form submitted:', data);
    // TODO: Implement actual itinerary generation
    alert('Itinerary generation will be implemented! Check console for form data.');
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