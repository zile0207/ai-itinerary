'use client';

import React from 'react';
import { StepContentProps } from './BaseStep';

interface ReviewStepProps extends StepContentProps {
  onSubmit: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  data: _data,
  updateData: _updateData,
  updateValidation: _updateValidation,
  onSubmit: _onSubmit,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Review your trip details</h2>
        <p className="text-gray-600">Make sure everything looks good before generating your itinerary</p>
      </div>
      <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
        <p className="text-gray-500">Review summary component will be implemented</p>
      </div>
    </div>
  );
}; 