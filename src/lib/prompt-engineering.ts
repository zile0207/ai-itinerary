import { PromptFormData } from '@/types/prompt';
import { PerplexityResponse } from './perplexity';

// Types for prompt engineering
export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  category: 'itinerary' | 'analysis' | 'research' | 'general';
  systemPrompt: string;
  userPromptTemplate: string;
  variables: PromptVariable[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
    tags: string[];
    performance?: PromptPerformance;
  };
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
    searchRecency?: 'month' | 'week' | 'day' | 'hour';
    includeCitations: boolean;
    includeRelatedQuestions: boolean;
  };
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface PromptPerformance {
  averageTokens: number;
  averageResponseTime: number;
  successRate: number;
  qualityScore: number;
  costPerRequest: number;
  testResults: PromptTestResult[];
}

export interface PromptTestResult {
  id: string;
  templateId: string;
  templateVersion: string;
  input: Record<string, any>;
  output: PerplexityResponse;
  metrics: {
    responseTime: number;
    tokenUsage: number;
    qualityScore: number;
    cost: number;
  };
  evaluation: {
    accuracy: number;
    relevance: number;
    completeness: number;
    clarity: number;
    citations: number;
  };
  timestamp: string;
}

export interface PromptExperiment {
  id: string;
  name: string;
  description: string;
  variants: PromptTemplate[];
  testCases: PromptTestCase[];
  results: ExperimentResult[];
  status: 'draft' | 'running' | 'completed' | 'paused';
  metadata: {
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    author: string;
  };
}

export interface PromptTestCase {
  id: string;
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput?: {
    structure?: Record<string, any>;
    keywords?: string[];
    minLength?: number;
    maxLength?: number;
  };
  category: string;
}

export interface ExperimentResult {
  variantId: string;
  testCaseId: string;
  response: PerplexityResponse;
  metrics: {
    responseTime: number;
    tokenUsage: number;
    cost: number;
  };
  evaluation: {
    accuracy: number;
    relevance: number;
    completeness: number;
    clarity: number;
    citations: number;
    overallScore: number;
  };
  timestamp: string;
}

// Prompt Engineering Service
export class PromptEngineeringService {
  private templates: Map<string, PromptTemplate> = new Map();
  private experiments: Map<string, PromptExperiment> = new Map();
  private testResults: PromptTestResult[] = [];

  constructor() {
    this.initializeDefaultTemplates();
  }

  // Template Management
  createTemplate(template: Omit<PromptTemplate, 'id' | 'metadata'>): PromptTemplate {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullTemplate: PromptTemplate = {
      ...template,
      id,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'system',
        tags: [],
      },
    };

    this.templates.set(id, fullTemplate);
    return fullTemplate;
  }

  updateTemplate(id: string, updates: Partial<PromptTemplate>): PromptTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const updatedTemplate: PromptTemplate = {
      ...template,
      ...updates,
      metadata: {
        ...template.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  getTemplate(id: string): PromptTemplate | null {
    return this.templates.get(id) || null;
  }

  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  // Prompt Generation
  generatePrompt(templateId: string, variables: Record<string, any>): {
    systemPrompt: string;
    userPrompt: string;
    config: PromptTemplate['config'];
  } | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Validate variables
    const validationResult = this.validateVariables(template.variables, variables);
    if (!validationResult.isValid) {
      throw new Error(`Variable validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Replace variables in templates
    const systemPrompt = this.replaceVariables(template.systemPrompt, variables);
    const userPrompt = this.replaceVariables(template.userPromptTemplate, variables);

    return {
      systemPrompt,
      userPrompt,
      config: template.config,
    };
  }

  // Variable Validation
  private validateVariables(
    templateVariables: PromptVariable[],
    providedVariables: Record<string, any>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const variable of templateVariables) {
      const value = providedVariables[variable.name];

      // Check required variables
      if (variable.required && (value === undefined || value === null)) {
        errors.push(`Required variable '${variable.name}' is missing`);
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        if (!this.validateVariableType(value, variable.type)) {
          errors.push(`Variable '${variable.name}' has invalid type. Expected ${variable.type}`);
        }

        // Additional validation
        if (variable.validation) {
          const validationErrors = this.validateVariableConstraints(value, variable.validation);
          errors.push(...validationErrors.map(err => `Variable '${variable.name}': ${err}`));
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateVariableType(value: any, expectedType: PromptVariable['type']): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      default:
        return false;
    }
  }

  private validateVariableConstraints(
    value: any,
    validation: PromptVariable['validation']
  ): string[] {
    const errors: string[] = [];

    if (!validation) return errors;

    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors.push(`must be at least ${validation.minLength} characters`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push(`must be no more than ${validation.maxLength} characters`);
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        errors.push(`must match pattern ${validation.pattern}`);
      }
    }

    if (validation.enum && !validation.enum.includes(value)) {
      errors.push(`must be one of: ${validation.enum.join(', ')}`);
    }

    return errors;
  }

  // Variable Replacement
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(pattern, String(value));
    }

    return result;
  }

  // Experiment Management
  createExperiment(experiment: Omit<PromptExperiment, 'id' | 'metadata'>): PromptExperiment {
    const id = `experiment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullExperiment: PromptExperiment = {
      ...experiment,
      id,
      metadata: {
        createdAt: new Date().toISOString(),
        author: 'system',
      },
    };

    this.experiments.set(id, fullExperiment);
    return fullExperiment;
  }

  getExperiment(id: string): PromptExperiment | null {
    return this.experiments.get(id) || null;
  }

  getAllExperiments(): PromptExperiment[] {
    return Array.from(this.experiments.values());
  }

  // Performance Analysis
  analyzeTemplatePerformance(templateId: string): PromptPerformance | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const templateResults = this.testResults.filter(r => r.templateId === templateId);
    if (templateResults.length === 0) return null;

    const averageTokens = templateResults.reduce((sum, r) => sum + r.metrics.tokenUsage, 0) / templateResults.length;
    const averageResponseTime = templateResults.reduce((sum, r) => sum + r.metrics.responseTime, 0) / templateResults.length;
    const successRate = templateResults.filter(r => r.evaluation.accuracy > 0.7).length / templateResults.length;
    const qualityScore = templateResults.reduce((sum, r) => sum + r.evaluation.accuracy, 0) / templateResults.length;
    const costPerRequest = templateResults.reduce((sum, r) => sum + r.metrics.cost, 0) / templateResults.length;

    return {
      averageTokens,
      averageResponseTime,
      successRate,
      qualityScore,
      costPerRequest,
      testResults: templateResults,
    };
  }

  // Utility Methods
  exportTemplate(templateId: string): string | null {
    const template = this.templates.get(templateId);
    if (!template) return null;
    return JSON.stringify(template, null, 2);
  }

  importTemplate(templateJson: string): PromptTemplate {
    const template = JSON.parse(templateJson) as PromptTemplate;
    // Generate new ID to avoid conflicts
    template.id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    template.metadata.updatedAt = new Date().toISOString();
    
    this.templates.set(template.id, template);
    return template;
  }

  // Initialize default templates
  private initializeDefaultTemplates(): void {
    // Comprehensive Itinerary Generation Template
    this.createTemplate({
      name: 'Comprehensive Itinerary Generator',
      version: '1.0.0',
      description: 'Research-backed itinerary generation with current information and detailed planning',
      category: 'itinerary',
      systemPrompt: `You are a professional travel planner with access to current travel information. Create detailed, practical itineraries with up-to-date information about destinations, activities, costs, and travel conditions. 

Key responsibilities:
- Provide current, accurate information about destinations
- Include realistic cost estimates in the specified currency
- Consider seasonal factors and current events
- Suggest specific venues with addresses when possible
- Include practical tips and booking requirements
- Account for travel time between locations
- Provide alternative options for different weather conditions

Always format responses as valid JSON with the specified structure.`,
      userPromptTemplate: `Create a detailed {{duration}}-day travel itinerary for {{destination}} with current, up-to-date information.

**Trip Details:**
- Destination: {{destination}}
- Dates: {{startDate}} to {{endDate}} ({{duration}} days)
- Travelers: {{travelers}}
- Budget: {{budget}} ({{budgetLevel}} level)
- Date flexibility: {{flexibility}}

**Interests and Preferences:**
{{interests}}

**Special Considerations:**
{{specialConsiderations}}

{{externalContent}}

**Requirements:**
1. Provide day-by-day itinerary with morning, afternoon, and evening activities
2. Include specific activity names, locations, and addresses when possible
3. Estimate costs for each activity in {{currency}}
4. Include travel time between locations
5. Suggest specific restaurants and meal options
6. Provide accommodation recommendations
7. Include current travel conditions, weather considerations, or seasonal factors
8. Add practical tips and booking requirements
9. Consider the specified budget level ({{budgetLevel}})
10. Account for any special considerations mentioned

Please format the response as a detailed JSON object with the following structure:
{{jsonStructure}}

Ensure all costs are realistic and current, and include specific venue names and addresses where possible.`,
      variables: [
        {
          name: 'destination',
          type: 'string',
          description: 'The travel destination',
          required: true,
          validation: { minLength: 2, maxLength: 100 }
        },
        {
          name: 'duration',
          type: 'number',
          description: 'Trip duration in days',
          required: true,
          validation: { minLength: 1, maxLength: 30 }
        },
        {
          name: 'startDate',
          type: 'string',
          description: 'Trip start date',
          required: true
        },
        {
          name: 'endDate',
          type: 'string',
          description: 'Trip end date',
          required: true
        },
        {
          name: 'travelers',
          type: 'string',
          description: 'Description of travelers',
          required: true
        },
        {
          name: 'budget',
          type: 'string',
          description: 'Budget amount with currency',
          required: true
        },
        {
          name: 'budgetLevel',
          type: 'string',
          description: 'Budget level',
          required: true,
          validation: { enum: ['budget', 'mid-range', 'luxury'] }
        },
        {
          name: 'currency',
          type: 'string',
          description: 'Currency code',
          required: true,
          validation: { enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] }
        },
        {
          name: 'flexibility',
          type: 'string',
          description: 'Date flexibility level',
          required: false,
          defaultValue: 'flexible'
        },
        {
          name: 'interests',
          type: 'string',
          description: 'Traveler interests and preferences',
          required: false,
          defaultValue: 'General sightseeing and cultural experiences'
        },
        {
          name: 'specialConsiderations',
          type: 'string',
          description: 'Special considerations or requirements',
          required: false,
          defaultValue: 'None'
        },
        {
          name: 'externalContent',
          type: 'string',
          description: 'Additional inspiration content',
          required: false,
          defaultValue: ''
        },
        {
          name: 'jsonStructure',
          type: 'string',
          description: 'Expected JSON response structure',
          required: true
        }
      ],
      config: {
        model: 'llama-3.1-sonar-small-128k-online',
        temperature: 0.7,
        maxTokens: 4000,
        searchRecency: 'week',
        includeCitations: true,
        includeRelatedQuestions: true,
      },
    });

    // Content Analysis Template
    this.createTemplate({
      name: 'Travel Content Analyzer',
      version: '1.0.0',
      description: 'Extract travel preferences and insights from external content',
      category: 'analysis',
      systemPrompt: `You are a travel content analyzer. Extract travel preferences, destinations, activities, budget information, and other relevant travel insights from the provided content. Focus on actionable information that can be used for itinerary planning.`,
      userPromptTemplate: `Analyze this travel content and extract key travel preferences, destinations, activities, and insights:

**Content Type:** {{contentType}}
**Content:** {{content}}

Please extract and return:
1. Mentioned destinations or places of interest
2. Activity preferences and interests
3. Budget indicators or spending preferences
4. Travel style preferences (luxury, budget, adventure, etc.)
5. Accommodation preferences
6. Dining preferences
7. Transportation preferences
8. Special considerations (accessibility, dietary restrictions, etc.)
9. Time preferences (season, duration, etc.)
10. Any other relevant travel insights

Format the response as a structured JSON object with clear categories.`,
      variables: [
        {
          name: 'contentType',
          type: 'string',
          description: 'Type of content being analyzed',
          required: true,
          validation: { enum: ['url', 'text', 'blog', 'social', 'review', 'itinerary'] }
        },
        {
          name: 'content',
          type: 'string',
          description: 'The content to analyze',
          required: true,
          validation: { minLength: 10, maxLength: 5000 }
        }
      ],
      config: {
        model: 'llama-3.1-sonar-small-128k-online',
        temperature: 0.3,
        maxTokens: 1000,
        searchRecency: 'week',
        includeCitations: true,
        includeRelatedQuestions: false,
      },
    });
  }

  // Helper method to convert form data to prompt variables
  convertFormDataToVariables(formData: PromptFormData): Record<string, any> {
    const destination = formData.destination.name || 'the selected destination';
    const startDate = formData.dateRange.start ? new Date(formData.dateRange.start).toLocaleDateString() : 'TBD';
    const endDate = formData.dateRange.end ? new Date(formData.dateRange.end).toLocaleDateString() : 'TBD';
    
    // Calculate trip duration
    const duration = formData.dateRange.start && formData.dateRange.end 
      ? Math.ceil((new Date(formData.dateRange.end).getTime() - new Date(formData.dateRange.start).getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    // Format travelers
    let travelersText = '';
    if (formData.travelers.travelers && formData.travelers.travelers.length > 0) {
      const adults = formData.travelers.travelers.filter(t => t.type === 'adult').length;
      const children = formData.travelers.travelers.filter(t => t.type === 'child').length;
      const infants = formData.travelers.travelers.filter(t => t.type === 'infant').length;
      
      const parts = [];
      if (adults > 0) parts.push(`${adults} adult${adults > 1 ? 's' : ''}`);
      if (children > 0) parts.push(`${children} child${children > 1 ? 'ren' : ''}`);
      if (infants > 0) parts.push(`${infants} infant${infants > 1 ? 's' : ''}`);
      travelersText = parts.join(', ');

      // Add special considerations
      const allTags = formData.travelers.travelers.flatMap(t => t.tags);
      if (allTags.length > 0) {
        travelersText += `\nSpecial considerations: ${[...new Set(allTags)].join(', ')}`;
      }
    } else {
      // Fallback to legacy format
      const adults = formData.travelers.adults || 2;
      const children = formData.travelers.children || 0;
      const parts = [];
      if (adults > 0) parts.push(`${adults} adult${adults > 1 ? 's' : ''}`);
      if (children > 0) parts.push(`${children} child${children > 1 ? 'ren' : ''}`);
      travelersText = parts.join(', ');
    }

    // Format interests
    const interests = [
      ...formData.interests.activities,
      ...formData.interests.accommodationTypes,
      ...formData.interests.transportationModes,
      ...formData.interests.diningPreferences,
      ...formData.interests.specialInterests
    ];

    // Format budget
    const budgetText = `${formData.budget.amount} ${formData.budget.currency}`;

    // Format external content
    let externalContentText = '';
    if (formData.externalContent.items && formData.externalContent.items.length > 0) {
      externalContentText = '\n\nAdditional inspiration content:\n';
      formData.externalContent.items.forEach((item, index) => {
        externalContentText += `${index + 1}. ${item.type === 'url' ? item.content : item.content.substring(0, 200)}...\n`;
        if (item.extractedInsights && item.extractedInsights.length > 0) {
          externalContentText += `   Insights: ${item.extractedInsights.join(', ')}\n`;
        }
      });
    }

    // JSON structure template
    const jsonStructure = `{
  "title": "Trip title",
  "destination": "${destination}",
  "startDate": "${startDate}",
  "endDate": "${endDate}",
  "totalDays": ${duration},
  "totalCost": {
    "amount": 0,
    "currency": "${formData.budget.currency}",
    "breakdown": {
      "accommodation": 0,
      "activities": 0,
      "meals": 0,
      "transport": 0,
      "other": 0
    }
  },
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Day title",
      "activities": [
        {
          "id": "unique-id",
          "time": "09:00",
          "title": "Activity name",
          "description": "Detailed description",
          "location": {
            "name": "Location name",
            "address": "Full address",
            "coordinates": {"lat": 0, "lng": 0}
          },
          "duration": 120,
          "cost": {"amount": 0, "currency": "${formData.budget.currency}", "notes": ""},
          "category": "activity",
          "bookingRequired": false,
          "tips": ["Tip 1", "Tip 2"]
        }
      ],
      "totalCost": 0,
      "notes": "Daily notes"
    }
  ],
  "travelers": {
    "adults": ${formData.travelers.adults || 2},
    "children": ${formData.travelers.children || 0},
    "infants": 0
  }
}`;

    return {
      destination,
      duration,
      startDate,
      endDate,
      travelers: travelersText,
      budget: budgetText,
      budgetLevel: formData.budget.budgetLevel,
      currency: formData.budget.currency,
      flexibility: formData.dateRange.flexibility || 'flexible',
      interests: interests.length > 0 ? interests.join(', ') : 'General sightseeing and cultural experiences',
      specialConsiderations: 'None', // Can be enhanced based on traveler tags
      externalContent: externalContentText,
      jsonStructure,
    };
  }
}

// Export singleton instance
export const promptEngineeringService = new PromptEngineeringService(); 