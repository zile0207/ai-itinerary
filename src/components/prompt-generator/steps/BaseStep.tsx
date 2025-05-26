import { PromptFormData, FormStep, StepValidation } from '@/types/prompt';

export interface BaseStepProps {
  data: PromptFormData;
  updateData: (section: keyof PromptFormData, data: Partial<PromptFormData[keyof PromptFormData]>) => void;
  updateValidation: (step: FormStep, validation: StepValidation) => void;
  currentStep: FormStep;
}

export interface StepContentProps extends BaseStepProps {
  className?: string;
} 