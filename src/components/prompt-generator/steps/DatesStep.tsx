'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StepContentProps } from './BaseStep';
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import { format, differenceInDays, addDays, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

export const DatesStep: React.FC<StepContentProps> = ({
  data,
  updateData,
  updateValidation,
  className = ''
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>(
    data.dateRange?.start ? new Date(data.dateRange.start) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    data.dateRange?.end ? new Date(data.dateRange.end) : undefined
  );
  const [flexibility, setFlexibility] = useState<'fixed' | 'flexible' | 'very-flexible'>(
    data.dateRange?.flexibility || 'flexible'
  );

  const validateStep = useCallback(() => {
    const errors = [];
    let isValid = true;

    if (!startDate) {
      errors.push('Please select a start date');
      isValid = false;
    }

    if (!endDate) {
      errors.push('Please select an end date');
      isValid = false;
    }

    if (startDate && endDate) {
      if (isBefore(endDate, startDate)) {
        errors.push('End date must be after start date');
        isValid = false;
      }

      if (isBefore(startDate, new Date())) {
        errors.push('Start date cannot be in the past');
        isValid = false;
      }

      const daysDifference = differenceInDays(endDate, startDate);
      if (daysDifference > 365) {
        errors.push('Trip duration cannot exceed 1 year');
        isValid = false;
      }

      if (daysDifference < 1) {
        errors.push('Trip must be at least 1 day long');
        isValid = false;
      }
    }

    updateValidation('dates', { isValid, errors });
  }, [startDate, endDate, updateValidation]);

  useEffect(() => {
    updateData('dateRange', {
      start: startDate || null,
      end: endDate || null,
      flexibility
    });
    validateStep();
  }, [startDate, endDate, flexibility, updateData, validateStep]);

  const getTripDuration = () => {
    if (!startDate || !endDate) return null;
    const days = differenceInDays(endDate, startDate) + 1; // Include both start and end days
    return days;
  };

  const getFlexibilityDescription = (flex: string) => {
    switch (flex) {
      case 'fixed':
        return 'Exact dates required';
      case 'flexible':
        return 'Can adjust by ±2-3 days';
      case 'very-flexible':
        return 'Can adjust by ±1 week';
      default:
        return '';
    }
  };

  const getFlexibilityColor = (flex: string) => {
    switch (flex) {
      case 'fixed':
        return 'bg-red-100 text-red-800';
      case 'flexible':
        return 'bg-yellow-100 text-yellow-800';
      case 'very-flexible':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const quickDateOptions = [
    { label: 'This Weekend', days: 2, startOffset: 5 }, // Next Friday
    { label: 'Long Weekend', days: 3, startOffset: 5 }, // Friday-Sunday
    { label: 'One Week', days: 7, startOffset: 7 },
    { label: 'Two Weeks', days: 14, startOffset: 14 },
    { label: 'One Month', days: 30, startOffset: 30 }
  ];

  const setQuickDate = (option: { days: number; startOffset: number }) => {
    const start = addDays(new Date(), option.startOffset);
    const end = addDays(start, option.days - 1);
    setStartDate(start);
    setEndDate(end);
  };

  const duration = getTripDuration();

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <CalendarIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">When are you traveling?</h2>
        <p className="text-gray-600">
          Select your travel dates and flexibility preferences
        </p>
      </div>

      {/* Quick Date Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Quick Options</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {quickDateOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => setQuickDate(option)}
                className="text-sm"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Date */}
        <Card>
          <CardHeader>
            <CardTitle>Departure Date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => isBefore(date, new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* End Date */}
        <Card>
          <CardHeader>
            <CardTitle>Return Date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => 
                    isBefore(date, new Date()) || 
                    (startDate ? isBefore(date, startDate) : false)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>

      {/* Trip Duration Display */}
      {duration && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-semibold text-blue-900">
                Trip Duration: {duration} {duration === 1 ? 'day' : 'days'}
              </span>
            </div>
            {startDate && endDate && (
              <p className="text-center text-blue-700 mt-2">
                {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Flexibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Date Flexibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="flexibility">How flexible are your dates?</Label>
          <Select value={flexibility} onValueChange={(value: 'fixed' | 'flexible' | 'very-flexible') => setFlexibility(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed - Exact dates only</SelectItem>
              <SelectItem value="flexible">Flexible - Can adjust by a few days</SelectItem>
              <SelectItem value="very-flexible">Very Flexible - Can adjust by a week</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Badge className={getFlexibilityColor(flexibility)}>
              {flexibility.charAt(0).toUpperCase() + flexibility.slice(1)}
            </Badge>
            <span className="text-sm text-gray-600">
              {getFlexibilityDescription(flexibility)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {(!startDate || !endDate) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Please select both departure and return dates</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 