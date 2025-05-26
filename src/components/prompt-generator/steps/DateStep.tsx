'use client';

import React from 'react';
import { StepContentProps } from './BaseStep';

export const DateStep: React.FC<StepContentProps> = ({
  data: _data,
  updateData: _updateData,
  updateValidation: _updateValidation,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">When are you traveling?</h2>
        <p className="text-gray-600">Select your travel dates</p>
      </div>
      <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
        <p className="text-gray-500">Date selection component will be implemented</p>
      </div>
    </div>
  );
}; 