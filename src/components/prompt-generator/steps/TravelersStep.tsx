'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StepContentProps } from './BaseStep';
import { Traveler } from '@/types/prompt';
import { Users, Plus, X, Tag } from 'lucide-react';

const COMMON_TAGS = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut allergy',
  'Loves food tours', 'Adventure seeker', 'History buff', 'Art lover',
  'Beach lover', 'Mountain hiker', 'City explorer', 'Nature lover',
  'Photography enthusiast', 'Shopping lover', 'Nightlife enthusiast',
  'Cultural experiences', 'Relaxation focused', 'Budget conscious',
  'Luxury traveler', 'Accessibility needs'
];

export const TravelersStep: React.FC<StepContentProps> = ({
  data,
  updateData,
  updateValidation,
  className = ''
}) => {
  const [travelers, setTravelers] = useState<Traveler[]>(data.travelers?.travelers || []);
  const [newTravelerName, setNewTravelerName] = useState('');
  const [newTravelerType, setNewTravelerType] = useState<'adult' | 'child' | 'infant'>('adult');
  const [newTravelerAge, setNewTravelerAge] = useState('');

  const validateStep = useCallback(() => {
    const isValid = travelers.length > 0 && travelers.every(t => t.name.trim().length > 0);
    const errors = [];
    
    if (travelers.length === 0) {
      errors.push('Please add at least one traveler');
    }
    
    const invalidTravelers = travelers.filter(t => t.name.trim().length === 0);
    if (invalidTravelers.length > 0) {
      errors.push('All travelers must have a name');
    }

    updateValidation('travelers', { isValid, errors });
  }, [travelers, updateValidation]);

  useEffect(() => {
    updateData('travelers', { travelers });
    validateStep();
  }, [travelers, updateData, validateStep]);

  const addTraveler = () => {
    if (!newTravelerName.trim()) return;

    const newTraveler: Traveler = {
      id: Date.now().toString(),
      name: newTravelerName.trim(),
      type: newTravelerType,
      age: newTravelerAge ? parseInt(newTravelerAge) : undefined,
      tags: []
    };

    setTravelers([...travelers, newTraveler]);
    setNewTravelerName('');
    setNewTravelerAge('');
    setNewTravelerType('adult');
  };

  const removeTraveler = (id: string) => {
    setTravelers(travelers.filter(t => t.id !== id));
  };

  const updateTraveler = (id: string, updates: Partial<Traveler>) => {
    setTravelers(travelers.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  };

  const addTag = (travelerId: string, tag: string) => {
    const traveler = travelers.find(t => t.id === travelerId);
    if (traveler && !traveler.tags.includes(tag)) {
      updateTraveler(travelerId, {
        tags: [...traveler.tags, tag]
      });
    }
  };

  const removeTag = (travelerId: string, tag: string) => {
    const traveler = travelers.find(t => t.id === travelerId);
    if (traveler) {
      updateTraveler(travelerId, {
        tags: traveler.tags.filter(t => t !== tag)
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'adult': return 'bg-blue-100 text-blue-800';
      case 'child': return 'bg-green-100 text-green-800';
      case 'infant': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <Users className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Who&apos;s Traveling?</h2>
        <p className="text-gray-600">
          Add travelers and their preferences to personalize your itinerary
        </p>
      </div>

      {/* Add New Traveler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Add Traveler</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="traveler-name">Name</Label>
              <Input
                id="traveler-name"
                value={newTravelerName}
                onChange={(e) => setNewTravelerName(e.target.value)}
                placeholder="Enter traveler name"
                onKeyPress={(e) => e.key === 'Enter' && addTraveler()}
              />
            </div>
            <div>
              <Label htmlFor="traveler-type">Type</Label>
              <Select value={newTravelerType} onValueChange={(value: 'adult' | 'child' | 'infant') => setNewTravelerType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adult">Adult (18+)</SelectItem>
                  <SelectItem value="child">Child (2-17)</SelectItem>
                  <SelectItem value="infant">Infant (0-2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="traveler-age">Age (optional)</Label>
              <Input
                id="traveler-age"
                type="number"
                value={newTravelerAge}
                onChange={(e) => setNewTravelerAge(e.target.value)}
                placeholder="Age"
                min="0"
                max="120"
              />
            </div>
          </div>
          <Button 
            onClick={addTraveler} 
            disabled={!newTravelerName.trim()}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Traveler
          </Button>
        </CardContent>
      </Card>

      {/* Travelers List */}
      {travelers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Travelers ({travelers.length})</h3>
          {travelers.map((traveler) => (
            <Card key={traveler.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{traveler.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getTypeColor(traveler.type)}>
                          {traveler.type}
                        </Badge>
                        {traveler.age && (
                          <Badge variant="outline">
                            Age {traveler.age}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTraveler(traveler.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Tags Section */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <Label className="text-sm font-medium">Preferences & Notes</Label>
                  </div>
                  
                  {/* Existing Tags */}
                  {traveler.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {traveler.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                          <span>{tag}</span>
                          <button
                            onClick={() => removeTag(traveler.id, tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Add Tags */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {COMMON_TAGS.filter(tag => !traveler.tags.includes(tag)).slice(0, 8).map((tag) => (
                      <Button
                        key={tag}
                        variant="outline"
                        size="sm"
                        onClick={() => addTag(traveler.id, tag)}
                        className="text-xs h-8 justify-start"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {tag}
                      </Button>
                    ))}
                  </div>
                  
                  {COMMON_TAGS.filter(tag => !traveler.tags.includes(tag)).length > 8 && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                        Show more options ({COMMON_TAGS.filter(tag => !traveler.tags.includes(tag)).length - 8} more)
                      </summary>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                        {COMMON_TAGS.filter(tag => !traveler.tags.includes(tag)).slice(8).map((tag) => (
                          <Button
                            key={tag}
                            variant="outline"
                            size="sm"
                            onClick={() => addTag(traveler.id, tag)}
                            className="text-xs h-8 justify-start"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {tag}
                          </Button>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {travelers.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="pt-6 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No travelers added yet</h3>
            <p className="text-gray-500 text-sm">
              Add travelers above to get started with your itinerary planning
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 