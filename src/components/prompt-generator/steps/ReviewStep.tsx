'use client';

import React, { useCallback, useEffect } from 'react';
import { StepContentProps } from './BaseStep';
import { PromptFormData } from '@/types/prompt';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Heart, 
  DollarSign, 
  FileText, 
  Edit,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

interface ReviewStepProps extends StepContentProps {
  onSubmit: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  data,
  updateValidation,
  onSubmit,
  className = ''
}) => {
  const validateStep = useCallback(() => {
    // Review step is always valid since all previous steps have been validated
    updateValidation('review', { isValid: true, errors: [] });
  }, [updateValidation]);

  useEffect(() => {
    validateStep();
  }, [validateStep]);

  const formatCurrency = (amount: number, currency: string) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$'
    };
    return `${symbols[currency as keyof typeof symbols] || currency} ${amount.toLocaleString()}`;
  };

  const formatDateRange = () => {
    if (!data.dateRange.start || !data.dateRange.end) {
      return 'No dates selected';
    }
    
    const start = format(data.dateRange.start, 'MMM dd, yyyy');
    const end = format(data.dateRange.end, 'MMM dd, yyyy');
    const days = Math.ceil((data.dateRange.end.getTime() - data.dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    return `${start} - ${end} (${days} days)`;
  };

  const getTravelerSummary = () => {
    if (data.travelers.travelers && data.travelers.travelers.length > 0) {
      const adults = data.travelers.travelers.filter(t => t.type === 'adult').length;
      const children = data.travelers.travelers.filter(t => t.type === 'child').length;
      const infants = data.travelers.travelers.filter(t => t.type === 'infant').length;
      
      const parts = [];
      if (adults > 0) parts.push(`${adults} adult${adults > 1 ? 's' : ''}`);
      if (children > 0) parts.push(`${children} child${children > 1 ? 'ren' : ''}`);
      if (infants > 0) parts.push(`${infants} infant${infants > 1 ? 's' : ''}`);
      
      return parts.join(', ');
    }
    
    // Fallback to legacy format
    const adults = data.travelers.adults || 0;
    const children = data.travelers.children || 0;
    const parts = [];
    if (adults > 0) parts.push(`${adults} adult${adults > 1 ? 's' : ''}`);
    if (children > 0) parts.push(`${children} child${children > 1 ? 'ren' : ''}`);
    
    return parts.join(', ') || 'No travelers specified';
  };

  const getAllTags = () => {
    if (data.travelers.travelers && data.travelers.travelers.length > 0) {
      const allTags = data.travelers.travelers.flatMap(t => t.tags);
      return [...new Set(allTags)]; // Remove duplicates
    }
    return [];
  };

  const getTotalSelections = () => {
    return (
      data.interests.activities.length +
      data.interests.accommodationTypes.length +
      data.interests.transportationModes.length +
      data.interests.diningPreferences.length +
      data.interests.specialInterests.length
    );
  };

  const getBudgetLevelDescription = () => {
    const descriptions = {
      budget: 'Budget-friendly options',
      'mid-range': 'Comfortable mid-range experiences',
      luxury: 'Premium luxury experiences'
    };
    return descriptions[data.budget.budgetLevel] || data.budget.budgetLevel;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Review Your Trip Details</h2>
        <p className="text-gray-600">
          Review all your preferences before generating your personalized itinerary
        </p>
      </div>

      {/* Destination */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>Destination</span>
            </div>
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-lg font-medium">{data.destination.name || 'No destination selected'}</p>
            {data.destination.coordinates && (
              <p className="text-sm text-gray-600">
                Coordinates: {data.destination.coordinates.lat.toFixed(4)}, {data.destination.coordinates.lng.toFixed(4)}
              </p>
            )}
            {data.destination.country && (
              <Badge variant="secondary">{data.destination.country}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <span>Travel Dates</span>
            </div>
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-lg font-medium">{formatDateRange()}</p>
            {data.dateRange.flexibility && (
              <Badge 
                variant={data.dateRange.flexibility === 'fixed' ? 'destructive' : 
                        data.dateRange.flexibility === 'flexible' ? 'default' : 'secondary'}
              >
                {data.dateRange.flexibility} dates
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Travelers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-600" />
              <span>Travelers</span>
            </div>
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-lg font-medium">{getTravelerSummary()}</p>
            
            {data.travelers.travelers && data.travelers.travelers.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Individual Travelers:</h4>
                <div className="space-y-2">
                  {data.travelers.travelers.map((traveler, index) => (
                    <div key={traveler.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div>
                        <span className="font-medium">{traveler.name}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          ({traveler.type}{traveler.age ? `, ${traveler.age}` : ''})
                        </span>
                      </div>
                      {traveler.tags.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {traveler.tags.length} preferences
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {getAllTags().length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Special Considerations:</h4>
                <div className="flex flex-wrap gap-1">
                  {getAllTags().slice(0, 6).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {getAllTags().length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{getAllTags().length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-red-600" />
              <span>Interests & Preferences</span>
            </div>
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Total Selections</span>
              <Badge variant="default">{getTotalSelections()} preferences</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.interests.activities.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Activities ({data.interests.activities.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {data.interests.activities.slice(0, 3).map((activity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{activity}</Badge>
                    ))}
                    {data.interests.activities.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{data.interests.activities.length - 3}</Badge>
                    )}
                  </div>
                </div>
              )}

              {data.interests.accommodationTypes.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Accommodation ({data.interests.accommodationTypes.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {data.interests.accommodationTypes.slice(0, 3).map((type, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
                    ))}
                    {data.interests.accommodationTypes.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{data.interests.accommodationTypes.length - 3}</Badge>
                    )}
                  </div>
                </div>
              )}

              {data.interests.transportationModes.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Transportation ({data.interests.transportationModes.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {data.interests.transportationModes.slice(0, 3).map((mode, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{mode}</Badge>
                    ))}
                    {data.interests.transportationModes.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{data.interests.transportationModes.length - 3}</Badge>
                    )}
                  </div>
                </div>
              )}

              {data.interests.diningPreferences.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Dining ({data.interests.diningPreferences.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {data.interests.diningPreferences.slice(0, 3).map((pref, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{pref}</Badge>
                    ))}
                    {data.interests.diningPreferences.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{data.interests.diningPreferences.length - 3}</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {data.interests.specialInterests.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Special Interests ({data.interests.specialInterests.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {data.interests.specialInterests.map((interest, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">{interest}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              <span>Budget</span>
            </div>
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">
                {formatCurrency(data.budget.amount, data.budget.currency)}
              </span>
              <Badge variant="default">{getBudgetLevelDescription()}</Badge>
            </div>
            
            {data.budget.priorities && data.budget.priorities.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Spending Priorities</h4>
                <div className="flex flex-wrap gap-1">
                  {data.budget.priorities.map((priority, index) => (
                    <Badge key={index} variant="outline" className="text-xs">{priority}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* External Content */}
      {data.externalContent.items && data.externalContent.items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Inspiration Content</span>
              </div>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">{data.externalContent.items.length} items added</span>
                {data.externalContent.analysisEnabled && (
                  <Badge variant="default" className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Analysis enabled</span>
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                {data.externalContent.items.slice(0, 3).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.title || (item.type === 'url' ? item.content : `${item.content.substring(0, 50)}...`)}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">{item.contentType}</Badge>
                        <Badge variant="outline" className="text-xs">{item.type}</Badge>
                      </div>
                    </div>
                    {item.extractedInsights && item.extractedInsights.length > 0 && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        {item.extractedInsights.length} insights
                      </Badge>
                    )}
                  </div>
                ))}
                {data.externalContent.items.length > 3 && (
                  <p className="text-sm text-gray-600">
                    +{data.externalContent.items.length - 3} more items
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Generate Button */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-blue-900">Ready to Generate Your Itinerary!</h3>
            </div>
            <p className="text-blue-800 max-w-2xl mx-auto">
              We'll use all your preferences to create a personalized travel itinerary that matches your style, 
              budget, and interests. This may take a few moments.
            </p>
            <Button 
              onClick={onSubmit}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate My Itinerary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 