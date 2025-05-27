'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StepContentProps } from './BaseStep';
import { Heart, Search, MapPin, Utensils, Car, Home } from 'lucide-react';

const ACTIVITY_OPTIONS = [
  'Museums & Galleries', 'Historical Sites', 'Architecture', 'Local Markets',
  'Food Tours', 'Cooking Classes', 'Wine Tasting', 'Brewery Tours',
  'Hiking', 'Beach Activities', 'Water Sports', 'Cycling',
  'Adventure Sports', 'Wildlife Watching', 'Photography Tours',
  'Music & Concerts', 'Theater & Shows', 'Festivals & Events',
  'Shopping', 'Spa & Wellness', 'Nightlife', 'Local Experiences',
  'Religious Sites', 'Parks & Gardens', 'Scenic Drives'
];

const ACCOMMODATION_OPTIONS = [
  'Hotels', 'Boutique Hotels', 'Luxury Resorts', 'Budget Hotels',
  'Hostels', 'Vacation Rentals', 'Apartments', 'Bed & Breakfast',
  'Guesthouses', 'Camping', 'Glamping', 'Unique Stays'
];

const TRANSPORTATION_OPTIONS = [
  'Walking', 'Public Transit', 'Taxi/Rideshare', 'Rental Car',
  'Bicycle', 'Scooter', 'Train', 'Bus Tours', 'Private Driver',
  'Boat/Ferry', 'Domestic Flights'
];

const DINING_OPTIONS = [
  'Local Cuisine', 'Street Food', 'Fine Dining', 'Casual Dining',
  'Fast Food', 'Vegetarian/Vegan', 'Halal', 'Kosher',
  'Food Markets', 'Rooftop Dining', 'Waterfront Dining'
];

const SPECIAL_INTERESTS = [
  'Photography', 'Art & Culture', 'History', 'Architecture',
  'Nature & Wildlife', 'Adventure Sports', 'Food & Drink',
  'Music & Entertainment', 'Shopping', 'Wellness & Spa',
  'Family-Friendly', 'Romantic', 'Solo Travel', 'Group Travel',
  'Sustainable Travel', 'Off the Beaten Path', 'Luxury Experiences',
  'Budget Travel', 'Accessibility Focused'
];

type InterestsKey = keyof import('@/types/prompt').InterestsData;
const getInterestsKey = (category: string): InterestsKey => {
  switch (category) {
    case 'accommodation':
      return 'accommodationTypes';
    case 'transportation':
      return 'transportationModes';
    case 'dining':
      return 'diningPreferences';
    case 'special':
      return 'specialInterests';
    default:
      return 'activities';
  }
};

export const InterestsStep: React.FC<StepContentProps> = ({
  data,
  updateData,
  updateValidation,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('activities');

  const validateStep = useCallback(() => {
    const totalSelections = 
      data.interests.activities.length +
      data.interests.accommodationTypes.length +
      data.interests.transportationModes.length +
      data.interests.diningPreferences.length +
      data.interests.specialInterests.length;

    const isValid = totalSelections >= 3; // Require at least 3 total selections
    const errors = [];

    if (totalSelections < 3) {
      errors.push('Please select at least 3 preferences across all categories');
    }

    updateValidation('interests', { isValid, errors });
  }, [data.interests, updateValidation]);

  useEffect(() => {
    validateStep();
  }, [validateStep]);

  const toggleSelection = (category: keyof typeof data.interests, item: string) => {
    const currentItems = data.interests[category];
    const newItems = currentItems.includes(item)
      ? currentItems.filter(i => i !== item)
      : [...currentItems, item];

    updateData('interests', {
      ...data.interests,
      [category]: newItems
    });
  };

  const getFilteredOptions = (options: string[]) => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getCategoryData = (category: string) => {
    switch (category) {
      case 'activities':
        return { options: ACTIVITY_OPTIONS, selected: data.interests.activities, icon: MapPin };
      case 'accommodation':
        return { options: ACCOMMODATION_OPTIONS, selected: data.interests.accommodationTypes, icon: Home };
      case 'transportation':
        return { options: TRANSPORTATION_OPTIONS, selected: data.interests.transportationModes, icon: Car };
      case 'dining':
        return { options: DINING_OPTIONS, selected: data.interests.diningPreferences, icon: Utensils };
      case 'special':
        return { options: SPECIAL_INTERESTS, selected: data.interests.specialInterests, icon: Heart };
      default:
        return { options: [], selected: [], icon: Heart };
    }
  };

  const categories = [
    { id: 'activities', label: 'Activities', icon: MapPin },
    { id: 'accommodation', label: 'Accommodation', icon: Home },
    { id: 'transportation', label: 'Transportation', icon: Car },
    { id: 'dining', label: 'Dining', icon: Utensils },
    { id: 'special', label: 'Special Interests', icon: Heart }
  ];

  const getTotalSelections = () => {
    return data.interests.activities.length +
           data.interests.accommodationTypes.length +
           data.interests.transportationModes.length +
           data.interests.diningPreferences.length +
           data.interests.specialInterests.length;
  };

  const categoryData = getCategoryData(activeCategory);
  const filteredOptions = getFilteredOptions(categoryData.options);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <Heart className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What interests you?</h2>
        <p className="text-gray-600">
          Select your travel preferences to personalize your itinerary
        </p>
        <div className="mt-2">
          <Badge variant={getTotalSelections() >= 3 ? "default" : "secondary"}>
            {getTotalSelections()} selections
          </Badge>
        </div>
      </div>

      {/* Category Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              const categoryKey: InterestsKey = getInterestsKey(category.id);
              const count = data.interests[categoryKey]?.length || 0;

              return (
                <Button
                  key={category.id}
                  variant={isActive ? "default" : "outline"}
                  size="default"
                  onClick={() => setActiveCategory(category.id)}
                  className="flex flex-col items-center space-y-1 h-16 py-3 px-4 min-h-[64px] hover:scale-[1.02] transition-transform"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium text-center leading-tight">{category.label}</span>
                  {count > 0 && (
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Search ${categories.find(c => c.id === activeCategory)?.label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Options Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <categoryData.icon className="w-5 h-5" />
            <span>{categories.find(c => c.id === activeCategory)?.label}</span>
            <Badge variant="outline">
              {categoryData.selected.length} selected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOptions.map((option) => {
              const isSelected = categoryData.selected.includes(option);
              const categoryKey: InterestsKey = getInterestsKey(activeCategory);

              return (
                <Button
                  key={option}
                  variant={isSelected ? "default" : "outline"}
                  size="default"
                  onClick={() => toggleSelection(categoryKey, option)}
                  className="text-left justify-start h-12 px-4 py-3 min-h-[48px] w-full hover:scale-[1.02] transition-transform"
                >
                  <span className="text-sm font-medium leading-tight">{option}</span>
                </Button>
              );
            })}
          </div>

          {filteredOptions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No options found for &quot;{searchTerm}&quot;</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="mt-2"
              >
                Clear search
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Summary */}
      {getTotalSelections() > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Your Selections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.interests.activities.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-800">Activities</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.interests.activities.map((activity) => (
                    <Badge key={activity} variant="secondary" className="text-xs">
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {data.interests.accommodationTypes.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-800">Accommodation</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.interests.accommodationTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {data.interests.transportationModes.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-800">Transportation</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.interests.transportationModes.map((mode) => (
                    <Badge key={mode} variant="secondary" className="text-xs">
                      {mode}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {data.interests.diningPreferences.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-800">Dining</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.interests.diningPreferences.map((pref) => (
                    <Badge key={pref} variant="secondary" className="text-xs">
                      {pref}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {data.interests.specialInterests.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-800">Special Interests</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.interests.specialInterests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 