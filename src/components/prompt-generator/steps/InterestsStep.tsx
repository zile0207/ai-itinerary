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

export const InterestsStep: React.FC<StepContentProps> = ({
  data,
  updateData,
  updateValidation,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('activities');

  const interests = useMemo(() => data.interests || {
    activities: [],
    accommodationTypes: [],
    transportationModes: [],
    diningPreferences: [],
    specialInterests: []
  }, [data.interests]);

  const validateStep = useCallback(() => {
    const totalSelections = 
      interests.activities.length +
      interests.accommodationTypes.length +
      interests.transportationModes.length +
      interests.diningPreferences.length +
      interests.specialInterests.length;

    const isValid = totalSelections >= 3; // Require at least 3 total selections
    const errors = [];

    if (totalSelections < 3) {
      errors.push('Please select at least 3 preferences across all categories');
    }

    updateValidation('interests', { isValid, errors });
  }, [interests, updateValidation]);

  useEffect(() => {
    updateData('interests', interests);
    validateStep();
  }, [interests, updateData, validateStep]);

  const toggleSelection = (category: keyof typeof interests, item: string) => {
    const currentItems = interests[category];
    const newItems = currentItems.includes(item)
      ? currentItems.filter(i => i !== item)
      : [...currentItems, item];

    updateData('interests', {
      ...interests,
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
        return { options: ACTIVITY_OPTIONS, selected: interests.activities, icon: MapPin };
      case 'accommodation':
        return { options: ACCOMMODATION_OPTIONS, selected: interests.accommodationTypes, icon: Home };
      case 'transportation':
        return { options: TRANSPORTATION_OPTIONS, selected: interests.transportationModes, icon: Car };
      case 'dining':
        return { options: DINING_OPTIONS, selected: interests.diningPreferences, icon: Utensils };
      case 'special':
        return { options: SPECIAL_INTERESTS, selected: interests.specialInterests, icon: Heart };
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
    return interests.activities.length +
           interests.accommodationTypes.length +
           interests.transportationModes.length +
           interests.diningPreferences.length +
           interests.specialInterests.length;
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              const categoryKey = category.id === 'accommodation' ? 'accommodationTypes' :
                                category.id === 'transportation' ? 'transportationModes' :
                                category.id === 'dining' ? 'diningPreferences' :
                                category.id === 'special' ? 'specialInterests' :
                                category.id;
              const count = interests[categoryKey as keyof typeof interests]?.length || 0;

              return (
                <Button
                  key={category.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                  className="flex flex-col items-center space-y-1 h-auto py-3"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{category.label}</span>
                  {count > 0 && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredOptions.map((option) => {
              const isSelected = categoryData.selected.includes(option);
              const categoryKey = activeCategory === 'accommodation' ? 'accommodationTypes' :
                                activeCategory === 'transportation' ? 'transportationModes' :
                                activeCategory === 'dining' ? 'diningPreferences' :
                                activeCategory === 'special' ? 'specialInterests' :
                                'activities';

              return (
                <Button
                  key={option}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSelection(categoryKey as keyof typeof interests, option)}
                  className="text-left justify-start h-auto py-2 px-3"
                >
                  <span className="text-xs">{option}</span>
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
            {interests.activities.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-800">Activities</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {interests.activities.map((activity) => (
                    <Badge key={activity} variant="secondary" className="text-xs">
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {interests.accommodationTypes.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-800">Accommodation</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {interests.accommodationTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {interests.transportationModes.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-800">Transportation</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {interests.transportationModes.map((mode) => (
                    <Badge key={mode} variant="secondary" className="text-xs">
                      {mode}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {interests.diningPreferences.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-800">Dining</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {interests.diningPreferences.map((pref) => (
                    <Badge key={pref} variant="secondary" className="text-xs">
                      {pref}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {interests.specialInterests.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-800">Special Interests</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {interests.specialInterests.map((interest) => (
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