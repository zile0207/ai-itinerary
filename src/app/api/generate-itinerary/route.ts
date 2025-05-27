import { NextRequest, NextResponse } from 'next/server';
import { perplexityService } from '@/lib/perplexity';
import { promptEngineeringService } from '@/lib/prompt-engineering';
import { ContextFormatter, ContextAssemblyOptions, TruncationStrategy, ValidationLevel, ContextType } from '@/lib/context-formatter';
import { ContextPerformanceMonitor, generateRequestId } from '@/lib/context-performance';
import { parseItinerary } from '@/lib/response-parser';
import { PromptFormData } from '@/types/prompt';
import { saveItinerary as saveItineraryToStorage } from '@/lib/itinerary-storage';
import { validateItineraryFreshness, DataSourceType } from '@/lib/data-freshness';

// Types for the itinerary structure
export interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  activities: ItineraryActivity[];
  totalCost: number;
  notes?: string;
}

export interface ItineraryActivity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: {
    name: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  duration: number; // in minutes
  cost: {
    amount: number;
    currency: string;
    notes?: string;
  };
  category: 'activity' | 'meal' | 'transport' | 'accommodation' | 'other';
  bookingRequired: boolean;
  tips?: string[];
}

export interface GeneratedItinerary {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalCost: {
    amount: number;
    currency: string;
    breakdown: {
      accommodation: number;
      activities: number;
      meals: number;
      transport: number;
      other: number;
    };
  };
  days: ItineraryDay[];
  travelers: {
    adults: number;
    children: number;
    infants: number;
  };
  metadata: {
    generatedAt: string;
    model: string;
    citations?: string[];
    relatedQuestions?: string[];
    citationData?: unknown[]; // Full citation objects for advanced features
  };
}



// Helper function to save itinerary using the new storage system
async function saveItinerary(itinerary: GeneratedItinerary): Promise<string> {
  try {
    return await saveItineraryToStorage(itinerary);
  } catch (error) {
    console.error('Error saving itinerary:', error);
    throw new Error('Failed to save itinerary');
  }
}



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const formData: PromptFormData = body.formData;

    if (!formData) {
      return NextResponse.json(
        { error: 'Form data is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!formData.destination?.name) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    if (!formData.dateRange?.start || !formData.dateRange?.end) {
      return NextResponse.json(
        { error: 'Travel dates are required' },
        { status: 400 }
      );
    }

    // Generate unique request ID for performance tracking
    const requestId = generateRequestId();
    const contextStartTime = performance.now();

    // Use context formatting system for optimal token management
    const contextFormatter = ContextFormatter.fromFormData(formData, {
      maxTokens: 3500, // Leave room for response tokens
      includeResearchContext: true,
      prioritizeUserInput: true,
      includeExamples: false, // Disable examples to save tokens
      truncationStrategy: TruncationStrategy.PRIORITY_BASED,
      validationLevel: ValidationLevel.RESEARCH
    });

    // Add system instructions for itinerary generation
    contextFormatter.addSystemInstructions(`
You are a professional travel planner with access to current travel information. 
Create detailed, practical itineraries with up-to-date information about destinations, 
activities, costs, and travel conditions. Always provide specific recommendations with 
current pricing when possible. Format the response as a valid JSON object.
    `.trim());

    // Format the context with optimization
    const formattedContext = contextFormatter.format();
    const contextEndTime = performance.now();
    
    // Record performance metrics
    const performanceMetrics = ContextPerformanceMonitor.recordMetrics(
      requestId,
      formattedContext,
      contextEndTime - contextStartTime
    );

    // Analyze context and get optimization suggestions
    const optimizationSuggestions = ContextPerformanceMonitor.analyzeContext(formattedContext);
    
    // Log context optimization metrics and suggestions
    console.log('Context Optimization Metrics:', {
      requestId,
      originalTokens: formattedContext.metadata.originalTokenCount,
      finalTokens: formattedContext.tokenCount,
      compressionRatio: formattedContext.metadata.compressionRatio,
      truncated: formattedContext.truncated,
      segmentsIncluded: formattedContext.metadata.segmentsIncluded,
      segmentsOmitted: formattedContext.metadata.segmentsOmitted,
      warnings: formattedContext.warnings,
      efficiency: performanceMetrics.efficiency,
      tokenSavings: performanceMetrics.tokenSavings,
      processingTimeMs: performanceMetrics.processingTimeMs,
      optimizationSuggestions
    });

    // Use prompt engineering framework for JSON structure
    const itineraryTemplates = promptEngineeringService.getTemplatesByCategory('itinerary');
    const template = itineraryTemplates.find(t => t.name === 'Comprehensive Itinerary Generator');
    
    if (!template) {
      return NextResponse.json(
        { error: 'Itinerary template not found' },
        { status: 500 }
      );
    }

    // Convert form data to prompt variables for JSON structure
    const variables = promptEngineeringService.convertFormDataToVariables(formData);
    
    // Create optimized prompt combining context formatter and template
    const systemPrompt = formattedContext.segments
      .filter(s => s.type === ContextType.SYSTEM_INSTRUCTIONS)
      .map(s => s.content)
      .join('\n');

    const userContext = formattedContext.segments
      .filter(s => s.type !== ContextType.SYSTEM_INSTRUCTIONS)
      .map(s => s.content)
      .join('\n\n');

    const jsonStructure = variables.jsonStructure;
    
    const optimizedUserPrompt = `${userContext}

Please create a detailed itinerary and format the response as a valid JSON object with this structure:
${jsonStructure}

Ensure all costs are realistic and current, and include specific venue names and addresses where possible.`;

    // Call Perplexity AI with the optimized context
    const response = await perplexityService.query({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: optimizedUserPrompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
      return_citations: true,
      search_recency_filter: 'week',
      return_related_questions: true,
    });

    // Parse the response using the robust parser
    const parseResult = parseItinerary(
      response.choices[0].message.content,
      response.citations,
      response.related_questions
    );

    if (!parseResult.success || !parseResult.data) {
      console.error('Failed to parse AI response:', parseResult.errors);
      return NextResponse.json(
        { 
          error: 'Failed to parse AI response into valid itinerary',
          details: parseResult.errors.map(e => e.message).join(', '),
          parseMetadata: parseResult.metadata
        },
        { status: 500 }
      );
    }

    const itinerary = parseResult.data;

    // Validate data freshness
    const freshnessValidation = validateItineraryFreshness(itinerary);

    // Save the itinerary
    const filepath = await saveItinerary(itinerary);

    return NextResponse.json({
      success: true,
      itinerary,
      filepath,
      usage: response.usage,
      contextMetrics: {
        requestId,
        tokenOptimization: {
          originalTokens: performanceMetrics.originalTokenCount,
          finalTokens: performanceMetrics.finalTokenCount,
          tokenSavings: performanceMetrics.tokenSavings,
          compressionRatio: performanceMetrics.compressionRatio,
          efficiency: performanceMetrics.efficiency
        },
        processingTime: performanceMetrics.processingTimeMs,
        optimizationSuggestions: optimizationSuggestions.map(s => ({
          type: s.type,
          severity: s.severity,
          message: s.message,
          recommendation: s.recommendation
        }))
      },
      parseMetrics: {
        parseMethod: parseResult.metadata.parseMethod,
        confidence: parseResult.metadata.confidence,
        processingTimeMs: parseResult.metadata.processingTimeMs,
        originalLength: parseResult.metadata.originalLength,
        extractedLength: parseResult.metadata.extractedLength,
        errors: parseResult.errors,
        warnings: parseResult.warnings
      },
      freshnessValidation: {
        overall: {
          isFresh: freshnessValidation.overall.isFresh,
          freshnessScore: freshnessValidation.overall.freshnessScore,
          nextValidation: freshnessValidation.overall.nextValidation
        },
        recommendations: freshnessValidation.recommendations,
        componentsChecked: Object.keys(freshnessValidation.byComponent).length,
        issues: freshnessValidation.overall.issues.length
      }
    });

  } catch (error) {
    console.error('Error generating itinerary:', error);

    if (error instanceof Error) {
      if (error.message.includes('Rate limit exceeded')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      } else if (error.message.includes('Invalid API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate itinerary. Please try again.' },
      { status: 500 }
    );
  }
} 