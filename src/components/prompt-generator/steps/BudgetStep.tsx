'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StepContentProps } from './BaseStep';
import { DollarSign, Star, AlertCircle } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
];

const BUDGET_LEVELS = [
  {
    id: 'budget',
    label: 'Budget',
    description: 'Affordable options, hostels, local transport',
    color: 'bg-green-100 text-green-800',
    icon: '💰'
  },
  {
    id: 'mid-range',
    label: 'Mid-Range',
    description: 'Comfortable hotels, mix of experiences',
    color: 'bg-blue-100 text-blue-800',
    icon: '🏨'
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'Premium accommodations, exclusive experiences',
    color: 'bg-purple-100 text-purple-800',
    icon: '✨'
  }
];

const SPENDING_PRIORITIES = [
  'Accommodation',
  'Food & Dining',
  'Activities & Tours',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Experiences',
  'Photography',
  'Souvenirs',
  'Emergency Fund'
];

const QUICK_AMOUNTS = {
  budget: [500, 1000, 1500, 2000],
  'mid-range': [2000, 3000, 4000, 5000],
  luxury: [5000, 7500, 10000, 15000]
};

export const BudgetStep: React.FC<StepContentProps> = ({
  data,
  updateData,
  updateValidation,
  className = ''
}) => {
  const [budgetAmount, setBudgetAmount] = useState<string>(
    data.budget?.amount ? data.budget.amount.toString() : ''
  );
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'>(
    data.budget?.currency || 'USD'
  );
  const [budgetLevel, setBudgetLevel] = useState<'budget' | 'mid-range' | 'luxury'>(
    data.budget?.budgetLevel || 'mid-range'
  );
  const [priorities, setPriorities] = useState<string[]>(
    data.budget?.priorities || []
  );

  const validateStep = useCallback(() => {
    const amount = parseFloat(budgetAmount);
    const isValid = !isNaN(amount) && amount > 0;
    const errors = [];

    if (!budgetAmount || isNaN(amount)) {
      errors.push('Please enter a valid budget amount');
    } else if (amount <= 0) {
      errors.push('Budget amount must be greater than 0');
    } else if (amount > 1000000) {
      errors.push('Budget amount seems unrealistic');
    }

    updateValidation('budget', { isValid, errors });
  }, [budgetAmount, updateValidation]);

  useEffect(() => {
    const amount = parseFloat(budgetAmount) || 0;
    updateData('budget', {
      amount,
      currency,
      budgetLevel,
      priorities
    });
    validateStep();
  }, [budgetAmount, currency, budgetLevel, priorities, updateData, validateStep]);

  const handleAmountChange = (value: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setBudgetAmount(cleanValue);
  };

  const setQuickAmount = (amount: number) => {
    setBudgetAmount(amount.toString());
  };

  const togglePriority = (priority: string) => {
    setPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const formatCurrency = (amount: number) => {
    const currencyData = CURRENCIES.find(c => c.code === currency);
    return `${currencyData?.symbol}${amount.toLocaleString()}`;
  };

  const getBudgetLevelData = () => {
    return BUDGET_LEVELS.find(level => level.id === budgetLevel) || BUDGET_LEVELS[1];
  };

  const currentAmount = parseFloat(budgetAmount) || 0;
  const levelData = getBudgetLevelData();

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <DollarSign className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What&apos;s your budget?</h2>
        <p className="text-gray-600">
          Set your travel budget to get personalized recommendations
        </p>
      </div>

      {/* Budget Amount */}
      <Card>
        <CardHeader>
          <CardTitle>Total Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {CURRENCIES.find(c => c.code === currency)?.symbol}
                </span>
                <Input
                  id="budget-amount"
                  type="text"
                  value={budgetAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={(value: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD') => setCurrency(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {currentAmount > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(currentAmount)}
              </p>
              <p className="text-blue-700 text-sm">Total Travel Budget</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Level */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BUDGET_LEVELS.map((level) => (
              <Button
                key={level.id}
                variant={budgetLevel === level.id ? "default" : "outline"}
                onClick={() => setBudgetLevel(level.id as 'budget' | 'mid-range' | 'luxury')}
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                <span className="text-2xl">{level.icon}</span>
                <span className="font-medium">{level.label}</span>
                <span className="text-xs text-center opacity-75">
                  {level.description}
                </span>
              </Button>
            ))}
          </div>
          
          <div className="mt-4 flex items-center space-x-2">
            <Badge className={levelData.color}>
              {levelData.label}
            </Badge>
            <span className="text-sm text-gray-600">{levelData.description}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Amount Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {QUICK_AMOUNTS[budgetLevel].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(amount)}
                className="text-sm"
              >
                {formatCurrency(amount)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Typical {levelData.label.toLowerCase()} budgets for a week-long trip
          </p>
        </CardContent>
      </Card>

      {/* Spending Priorities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5" />
            <span>Spending Priorities</span>
            <Badge variant="outline">{priorities.length} selected</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Select what matters most to you (optional)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {SPENDING_PRIORITIES.map((priority) => (
              <Button
                key={priority}
                variant={priorities.includes(priority) ? "default" : "outline"}
                size="sm"
                onClick={() => togglePriority(priority)}
                className="text-xs h-auto py-2"
              >
                {priority}
              </Button>
            ))}
          </div>

          {priorities.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Your priorities:</p>
              <div className="flex flex-wrap gap-1">
                {priorities.map((priority) => (
                  <Badge key={priority} variant="secondary" className="text-xs">
                    {priority}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Breakdown Estimate */}
      {currentAmount > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-900">Estimated Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Accommodation (30-40%)</span>
                <span className="font-medium">
                  {formatCurrency(Math.round(currentAmount * 0.35))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Food & Dining (25-30%)</span>
                <span className="font-medium">
                  {formatCurrency(Math.round(currentAmount * 0.275))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Activities & Tours (20-25%)</span>
                <span className="font-medium">
                  {formatCurrency(Math.round(currentAmount * 0.225))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Transportation (10-15%)</span>
                <span className="font-medium">
                  {formatCurrency(Math.round(currentAmount * 0.125))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Miscellaneous (5-10%)</span>
                <span className="font-medium">
                  {formatCurrency(Math.round(currentAmount * 0.075))}
                </span>
              </div>
            </div>
            <p className="text-xs text-green-700 mt-3">
              * Estimates based on typical {levelData.label.toLowerCase()} travel patterns
            </p>
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      {(!budgetAmount || parseFloat(budgetAmount) <= 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Please enter a valid budget amount</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 