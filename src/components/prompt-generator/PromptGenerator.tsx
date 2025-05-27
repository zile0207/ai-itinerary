'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Stepper, Step } from '@/components/ui/stepper';
import { PromptFormData, FormStep, FORM_STEPS, StepValidation } from '@/types/prompt';
import { DestinationStep } from './steps/DestinationStep';
import { DatesStep } from './steps/DatesStep';
import { TravelersStep } from './steps/TravelersStep';
import { InterestsStep } from './steps/InterestsStep';
import { BudgetStep } from './steps/BudgetStep';
import { ExternalContentStep } from './steps/ExternalContentStep';
import { ReviewStep } from './steps/ReviewStep';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PromptGeneratorProps {
  onSubmit: (data: PromptFormData) => void;
  onSave?: (data: Partial<PromptFormData>) => void;
  initialData?: Partial<PromptFormData>;
  className?: string;
}

const getInitialFormData = (initialData?: Partial<PromptFormData>): PromptFormData => ({
  destination: {
    name: '',
    ...initialData?.destination
  },
  dateRange: {
    start: null,
    end: null,
    ...initialData?.dateRange
  },
  travelers: {
    travelers: [],
    adults: 2,
    children: 0,
    childrenAges: [],
    ...initialData?.travelers
  },
  interests: {
    activities: [],
    accommodationTypes: [],
    transportationModes: [],
    diningPreferences: [],
    specialInterests: [],
    ...initialData?.interests
  },
  budget: {
    amount: 0,
    currency: 'USD',
    budgetLevel: 'mid-range',
    priorities: [],
    ...initialData?.budget
  },
  externalContent: {
    items: [],
    analysisEnabled: false,
    privacyConsent: false,
    ...initialData?.externalContent
  }
});

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({
  onSubmit,
  onSave,
  initialData,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('destination');
  const [formData, setFormData] = useState<PromptFormData>(() => 
    getInitialFormData(initialData)
  );
  const [stepValidations, setStepValidations] = useState<Record<FormStep, StepValidation>>({
    'destination': { isValid: false, errors: [] },
    'dates': { isValid: false, errors: [] },
    'travelers': { isValid: false, errors: [] },
    'interests': { isValid: false, errors: [] },
    'budget': { isValid: false, errors: [] },
    'external-content': { isValid: true, errors: [] }, // Optional step
    'review': { isValid: false, errors: [] }
  });

  const currentStepIndex = FORM_STEPS.indexOf(currentStep);
  const progressPercentage = ((currentStepIndex + 1) / FORM_STEPS.length) * 100;

  const updateFormData = useCallback((section: keyof PromptFormData, data: Partial<PromptFormData[keyof PromptFormData]>) => {
    setFormData(prev => {
      const newSectionData = { ...prev[section], ...data };
      const newFormData = {
        ...prev,
        [section]: newSectionData
      };
      
      // Auto-save if enabled
      if (onSave) {
        onSave({ [section]: newSectionData });
      }
      
      return newFormData;
    });
  }, [onSave]);

  const updateStepValidation = useCallback((step: FormStep, validation: StepValidation) => {
    setStepValidations(prev => ({
      ...prev,
      [step]: validation
    }));
  }, []);

  const canProceedToNext = () => {
    const currentValidation = stepValidations[currentStep];
    return currentValidation.isValid;
  };

  const handleNext = () => {
    if (currentStepIndex < FORM_STEPS.length - 1 && canProceedToNext()) {
      setCurrentStep(FORM_STEPS[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(FORM_STEPS[currentStepIndex - 1]);
    }
  };

  const handleStepClick = (step: FormStep) => {
    const stepIndex = FORM_STEPS.indexOf(step);
    const currentIndex = FORM_STEPS.indexOf(currentStep);
    
    // Allow navigating to previous steps or next step if current is valid
    if (stepIndex <= currentIndex || (stepIndex === currentIndex + 1 && canProceedToNext())) {
      setCurrentStep(step);
    }
  };

  const handleSubmit = () => {
    // Final validation before submission
    const allValid = Object.entries(stepValidations).every(([step, validation]) => {
      return step === 'external-content' || validation.isValid; // external-content is optional
    });

    if (allValid) {
      onSubmit(formData);
    }
  };

  const renderStepContent = () => {
    const commonProps = {
      data: formData,
      updateData: updateFormData,
      updateValidation: updateStepValidation,
      currentStep
    };

    switch (currentStep) {
      case 'destination':
        return <DestinationStep {...commonProps} />;
      case 'dates':
        return <DatesStep {...commonProps} />;
      case 'travelers':
        return <TravelersStep {...commonProps} />;
      case 'interests':
        return <InterestsStep {...commonProps} />;
      case 'budget':
        return <BudgetStep {...commonProps} />;
      case 'external-content':
        return <ExternalContentStep {...commonProps} />;
      case 'review':
        return <ReviewStep {...commonProps} onSubmit={handleSubmit} />;
      default:
        return null;
    }
  };

  const getStepTitle = (step: FormStep) => {
    const titles = {
      'destination': 'Where to?',
      'dates': 'When?',
      'travelers': 'Who\'s traveling?',
      'interests': 'What interests you?',
      'budget': 'What\'s your budget?',
      'external-content': 'Inspiration (Optional)',
      'review': 'Review & Generate'
    };
    return titles[step];
  };

  const getStepDescription = (step: FormStep) => {
    const descriptions = {
      'destination': 'Choose your travel destination',
      'dates': 'Select your travel dates',
      'travelers': 'Add travelers and preferences',
      'interests': 'Select your interests',
      'budget': 'Set your travel budget',
      'external-content': 'Add inspiration content',
      'review': 'Review and generate itinerary'
    };
    return descriptions[step];
  };

  const getSteps = (): Step[] => {
    return FORM_STEPS.map(step => ({
      id: step,
      title: getStepTitle(step),
      description: getStepDescription(step),
      status: step === currentStep 
        ? 'current' 
        : stepValidations[step].isValid 
        ? 'completed' 
        : 'pending',
      optional: step === 'external-content'
    }));
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="text-center text-2xl font-bold text-gray-900">
            Create Your Perfect Itinerary
          </CardTitle>
          
          {/* Progress Indicator */}
          <div className="space-y-2">
            <Progress value={progressPercentage} className="w-full" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Step {currentStepIndex + 1} of {FORM_STEPS.length}</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
          </div>

          {/* Step Navigation - Enhanced Stepper */}
          <div className="px-4">
            <Stepper
              steps={getSteps()}
              currentStep={currentStep}
              onStepClick={(stepId) => handleStepClick(stepId as FormStep)}
              orientation="horizontal"
              allowClickthrough={true}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Step Content */}
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>

            <div className="flex space-x-2">
              {currentStep !== 'review' ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceedToNext()}
                  className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
                >
                  <span>Generate Itinerary</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Validation Errors */}
          {stepValidations[currentStep].errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="text-red-800 font-medium mb-2">Please fix the following:</h4>
              <ul className="text-red-700 text-sm space-y-1">
                {stepValidations[currentStep].errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 