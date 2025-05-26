'use client';

import React from 'react';
import { StepContentProps } from './BaseStep';

export const ExternalContentStep: React.FC<StepContentProps> = ({
  data: _data,
  updateData: _updateData,
  updateValidation: _updateValidation,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Add inspiration (Optional)</h2>
        <p className="text-gray-600">Share content that inspires your trip</p>
      </div>
      <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
        <p className="text-gray-500">External content analysis component will be implemented</p>
      </div>
    </div>
  );
}; 