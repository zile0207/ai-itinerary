export interface DestinationData {
  name: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  country?: string;
  region?: string;
}

export interface DateRangeData {
  start: Date | null;
  end: Date | null;
  flexibility?: 'fixed' | 'flexible' | 'very-flexible';
}

export interface Traveler {
  id: string;
  name: string;
  type: 'adult' | 'child' | 'infant';
  age?: number;
  tags: string[];
}

export interface TravelerData {
  travelers: Traveler[];
  // Legacy fields for backward compatibility
  adults?: number;
  children?: number;
  childrenAges?: number[];
  relationships?: string[];
  accessibility?: string[];
}

export interface InterestsData {
  activities: string[];
  accommodationTypes: string[];
  transportationModes: string[];
  diningPreferences: string[];
  specialInterests: string[];
}

export interface BudgetData {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
  budgetLevel: 'budget' | 'mid-range' | 'luxury';
  priorities: string[];
}

export interface ExternalContentItem {
  id: string;
  type: 'url' | 'text' | 'file';
  content: string;
  contentType: 'blog' | 'video' | 'social' | 'itinerary' | 'article' | 'review' | 'other';
  title?: string;
  extractedInsights?: string[];
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  error?: string;
}

export interface ExternalContentData {
  items: ExternalContentItem[];
  analysisEnabled: boolean;
  privacyConsent: boolean;
  extractedPreferences?: {
    destinations?: string[];
    activities?: string[];
    accommodations?: string[];
    dining?: string[];
    budget?: string;
    travelStyle?: string[];
  };
}

export interface PromptFormData {
  destination: DestinationData;
  dateRange: DateRangeData;
  travelers: TravelerData;
  interests: InterestsData;
  budget: BudgetData;
  externalContent: ExternalContentData;
}

export const FORM_STEPS = [
  'destination',
  'dates',
  'travelers', 
  'interests',
  'budget',
  'external-content',
  'review'
] as const;

export type FormStep = typeof FORM_STEPS[number];

export interface StepValidation {
  isValid: boolean;
  errors: string[];
} 