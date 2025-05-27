'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StepContentProps } from './BaseStep';
import { MapPin, Search } from 'lucide-react';
import { MapSelector } from '../MapSelector';

export const DestinationStep: React.FC<StepContentProps> = ({
  data,
  updateData,
  updateValidation,
  className = ''
}) => {
  const [destination, setDestination] = useState(data.destination.name || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState<{
    name: string;
    coordinates: { lat: number; lng: number };
    country?: string;
  } | undefined>(
    data.destination.coordinates ? {
      name: data.destination.name,
      coordinates: data.destination.coordinates,
      country: data.destination.country
    } : undefined
  );

  // Popular destinations for suggestions
  const popularDestinations = [
    'Paris, France',
    'Tokyo, Japan',
    'New York City, USA',
    'London, England',
    'Rome, Italy',
    'Barcelona, Spain',
    'Bali, Indonesia',
    'Thai Islands',
    'Iceland',
    'Morocco',
    'Costa Rica',
    'Greece',
    'Peru',
    'Egypt',
    'Turkey'
  ];

  const validateStep = useCallback(() => {
    const hasDestination = destination.trim().length >= 2;
    const hasMapSelection = selectedMapLocation !== undefined;
    const isValid = hasDestination || hasMapSelection;
    const errors = [];
    
    if (!hasDestination && !hasMapSelection) {
      errors.push('Please enter a destination or select one from the map');
    } else if (hasDestination && destination.trim().length < 2) {
      errors.push('Destination must be at least 2 characters');
    }

    updateValidation('destination', { isValid, errors });
  }, [destination, selectedMapLocation, updateValidation]);

  useEffect(() => {
    validateStep();
  }, [validateStep]);

  const handleDestinationChange = (value: string) => {
    setDestination(value);
    
    // Clear map selection when manually typing
    if (selectedMapLocation && value !== selectedMapLocation.name) {
      setSelectedMapLocation(undefined);
    }
    
    // Update form data
    updateData('destination', { 
      name: value,
      // Clear coordinates when destination changes
      coordinates: undefined,
      country: undefined,
      region: undefined
    });

    // Show suggestions when typing
    if (value.length > 1) {
      const filtered = popularDestinations.filter(dest =>
        dest.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setDestination(suggestion);
    setSelectedMapLocation(undefined); // Clear map selection
    updateData('destination', { 
      name: suggestion,
      // You would typically extract country/region here
      coordinates: undefined,
      country: undefined,
      region: undefined
    });
    setShowSuggestions(false);
  };

  const showPopularDestinations = () => {
    setSuggestions(popularDestinations.slice(0, 8));
    setShowSuggestions(true);
  };

  const handleMapLocationSelect = (location: { name: string; coordinates: { lat: number; lng: number }; country?: string }) => {
    setSelectedMapLocation(location);
    setDestination(location.name);
    
    // Update form data with map selection
    updateData('destination', {
      name: location.name,
      coordinates: location.coordinates,
      country: location.country,
      region: undefined // Could be enhanced later
    });
    
    setShowSuggestions(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Where would you like to go?</h2>
        <p className="text-gray-600">
          Enter your dream destination. You can be specific like &quot;Paris, France&quot; or general like &quot;European cities&quot;
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span>Destination</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Label htmlFor="destination" className="text-base font-medium">
              Where do you want to travel?
            </Label>
            <div className="relative mt-2">
              <Input
                id="destination"
                type="text"
                placeholder="e.g., Tokyo, Japan or Southeast Asia"
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                className="pr-10 text-base"
                onFocus={showPopularDestinations}
                onBlur={() => {
                  // Delay hiding suggestions to allow clicking
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-2 border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSuggestionClick(suggestion)}
                    type="button"
                  >
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visual divider */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="text-sm text-gray-500">OR</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Map Selector */}
          <MapSelector
            onLocationSelect={handleMapLocationSelect}
            selectedLocation={selectedMapLocation}
          />

          {/* Helpful Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 Tips for better results:</h4>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Be specific: &quot;Kyoto, Japan&quot; vs &quot;Japan&quot;</li>
              <li>• Multiple destinations: &quot;Paris and London&quot; works too</li>
              <li>• Regions: &quot;Greek Islands&quot; or &quot;Northern Italy&quot;</li>
              <li>• Themes: &quot;Safari destinations in Africa&quot;</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 