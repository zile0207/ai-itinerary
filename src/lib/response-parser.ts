/**
 * Response Parsing and Validation System
 * 
 * Provides robust parsing and validation for AI-generated itinerary responses
 * with support for multiple formats, fallback strategies, and comprehensive validation.
 */

import { GeneratedItinerary, ItineraryDay, ItineraryActivity } from '@/app/api/generate-itinerary/route';
import { processCitationsSync, getCitationQualitySummary } from './citation-processor';

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestedFix?: string;
}

// Parsing result interface
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationError[];
  metadata: {
    parseMethod: string;
    processingTimeMs: number;
    originalLength: number;
    extractedLength: number;
    confidence: number; // 0-1 score
  };
}

// Schema validation interfaces
export interface ItinerarySchema {
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
}

// Parsing strategies enum
export enum ParseStrategy {
  JSON_EXTRACTION = 'json_extraction',
  STRUCTURED_TEXT = 'structured_text',
  MARKDOWN_PARSING = 'markdown_parsing',
  FALLBACK_RECONSTRUCTION = 'fallback_reconstruction'
}

// Response format detection
export enum ResponseFormat {
  PURE_JSON = 'pure_json',
  JSON_WITH_TEXT = 'json_with_text',
  STRUCTURED_TEXT = 'structured_text',
  MARKDOWN = 'markdown',
  UNSTRUCTURED = 'unstructured'
}

export class ResponseParser {
  private static readonly JSON_PATTERNS = [
    /\{[\s\S]*\}/g,                    // Standard JSON object
    /```json\s*([\s\S]*?)\s*```/g,     // JSON in code blocks
    /```\s*([\s\S]*?)\s*```/g,         // Generic code blocks
    /"itinerary":\s*(\{[\s\S]*?\})/g   // Nested itinerary object
  ];

  private static readonly REQUIRED_FIELDS = [
    'title', 'destination', 'startDate', 'endDate', 'days'
  ];

  private static readonly OPTIONAL_FIELDS = [
    'totalDays', 'totalCost', 'travelers', 'metadata'
  ];

  /**
   * Main parsing method with automatic format detection and fallback strategies
   */
  static parseItineraryResponse(
    content: string, 
    citations?: unknown[], 
    relatedQuestions?: string[]
  ): ParseResult<GeneratedItinerary> {
    const startTime = performance.now();
    const originalLength = content.length;

    // Detect response format
    const format = this.detectResponseFormat(content);
    
    // Try parsing strategies in order of preference
    const strategies = this.getParsingStrategies(format);
    let lastResult: ParseResult<GeneratedItinerary> | null = null;

         for (const strategy of strategies) {
       try {
         const result = this.parseWithStrategy(content, strategy);
         
         if (result.success && result.data) {
           // Add metadata and citations
           const enrichedItinerary = this.enrichItinerary(
             result.data, 
             citations, 
             relatedQuestions
           );

           const endTime = performance.now();
           
           return {
             success: true,
             data: enrichedItinerary,
             errors: result.errors,
             warnings: result.warnings,
             metadata: {
               ...result.metadata,
               processingTimeMs: endTime - startTime,
               originalLength,
               extractedLength: JSON.stringify(enrichedItinerary).length
             }
           };
         }
         
         lastResult = result as any; // Type assertion for compatibility
       } catch (error) {
         console.warn(`Parsing strategy ${strategy} failed:`, error);
         continue;
       }
     }

    // If all strategies failed, return the last attempt with errors
    const endTime = performance.now();
    return lastResult || {
      success: false,
      errors: [{
        field: 'content',
        message: 'Failed to parse response with any strategy',
        severity: 'error'
      }],
      warnings: [],
      metadata: {
        parseMethod: 'failed',
        processingTimeMs: endTime - startTime,
        originalLength,
        extractedLength: 0,
        confidence: 0
      }
    };
  }

  /**
   * Detect the format of the response content
   */
  private static detectResponseFormat(content: string): ResponseFormat {
    const trimmed = content.trim();
    
    // Check for pure JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        JSON.parse(trimmed);
        return ResponseFormat.PURE_JSON;
      } catch {
        // Fall through to other checks
      }
    }

    // Check for JSON with surrounding text
    if (this.JSON_PATTERNS.some(pattern => pattern.test(content))) {
      return ResponseFormat.JSON_WITH_TEXT;
    }

    // Check for markdown formatting
    if (content.includes('```') || content.includes('##') || content.includes('**')) {
      return ResponseFormat.MARKDOWN;
    }

    // Check for structured text patterns
    if (content.includes('Day 1:') || content.includes('Itinerary:') || content.includes('Activities:')) {
      return ResponseFormat.STRUCTURED_TEXT;
    }

    return ResponseFormat.UNSTRUCTURED;
  }

  /**
   * Get parsing strategies based on detected format
   */
  private static getParsingStrategies(format: ResponseFormat): ParseStrategy[] {
    switch (format) {
      case ResponseFormat.PURE_JSON:
        return [ParseStrategy.JSON_EXTRACTION];
      
      case ResponseFormat.JSON_WITH_TEXT:
        return [ParseStrategy.JSON_EXTRACTION, ParseStrategy.STRUCTURED_TEXT];
      
      case ResponseFormat.MARKDOWN:
        return [ParseStrategy.MARKDOWN_PARSING, ParseStrategy.JSON_EXTRACTION, ParseStrategy.STRUCTURED_TEXT];
      
      case ResponseFormat.STRUCTURED_TEXT:
        return [ParseStrategy.STRUCTURED_TEXT, ParseStrategy.JSON_EXTRACTION, ParseStrategy.FALLBACK_RECONSTRUCTION];
      
      default:
        return [ParseStrategy.JSON_EXTRACTION, ParseStrategy.STRUCTURED_TEXT, ParseStrategy.FALLBACK_RECONSTRUCTION];
    }
  }

  /**
   * Parse content using a specific strategy
   */
  private static parseWithStrategy(content: string, strategy: ParseStrategy): ParseResult<ItinerarySchema> {
    switch (strategy) {
      case ParseStrategy.JSON_EXTRACTION:
        return this.parseJsonExtraction(content);
      
      case ParseStrategy.STRUCTURED_TEXT:
        return this.parseStructuredText(content);
      
      case ParseStrategy.MARKDOWN_PARSING:
        return this.parseMarkdown(content);
      
      case ParseStrategy.FALLBACK_RECONSTRUCTION:
        return this.parseFallbackReconstruction(content);
      
      default:
        throw new Error(`Unknown parsing strategy: ${strategy}`);
    }
  }

  /**
   * Extract and parse JSON from content
   */
  private static parseJsonExtraction(content: string): ParseResult<ItinerarySchema> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    for (const pattern of this.JSON_PATTERNS) {
      const matches = Array.from(content.matchAll(pattern));
      
      for (const match of matches) {
        try {
          const jsonStr = match[1] || match[0];
          const parsed = JSON.parse(jsonStr);
          
          // Validate the parsed object
          const validation = this.validateItinerarySchema(parsed);
          
          if (validation.isValid) {
            return {
              success: true,
              data: parsed,
              errors: validation.errors,
              warnings: validation.warnings,
              metadata: {
                parseMethod: ParseStrategy.JSON_EXTRACTION,
                processingTimeMs: 0,
                originalLength: content.length,
                extractedLength: jsonStr.length,
                confidence: this.calculateConfidence(parsed, validation)
              }
            };
          } else {
            errors.push(...validation.errors);
            warnings.push(...validation.warnings);
          }
        } catch (parseError) {
          errors.push({
            field: 'json',
            message: `JSON parsing failed: ${(parseError as Error).message}`,
            severity: 'error'
          });
        }
      }
    }

    return {
      success: false,
      errors,
      warnings,
      metadata: {
        parseMethod: ParseStrategy.JSON_EXTRACTION,
        processingTimeMs: 0,
        originalLength: content.length,
        extractedLength: 0,
        confidence: 0
      }
    };
  }

  /**
   * Parse structured text format
   */
  private static parseStructuredText(content: string): ParseResult<ItinerarySchema> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Extract basic information
      const title = this.extractField(content, /(?:title|itinerary):\s*(.+)/i) || 'Generated Itinerary';
      const destination = this.extractField(content, /destination:\s*(.+)/i) || 'Unknown Destination';
      
      // Extract dates
      const dateMatch = content.match(/(?:dates?|period):\s*(.+?)(?:\n|$)/i);
      const dates = this.parseDateRange(dateMatch?.[1] || '');
      
      // Extract days
      const days = this.extractDaysFromText(content);
      
      // Create basic structure
      const itinerary: ItinerarySchema = {
        title,
        destination,
        startDate: dates.start,
        endDate: dates.end,
        totalDays: days.length,
        totalCost: {
          amount: 0,
          currency: 'USD',
          breakdown: {
            accommodation: 0,
            activities: 0,
            meals: 0,
            transport: 0,
            other: 0
          }
        },
        days,
        travelers: {
          adults: 2,
          children: 0,
          infants: 0
        }
      };

      const validation = this.validateItinerarySchema(itinerary);
      
      return {
        success: validation.isValid,
        data: itinerary,
        errors: validation.errors,
        warnings: validation.warnings,
        metadata: {
          parseMethod: ParseStrategy.STRUCTURED_TEXT,
          processingTimeMs: 0,
          originalLength: content.length,
          extractedLength: JSON.stringify(itinerary).length,
          confidence: this.calculateConfidence(itinerary, validation)
        }
      };
    } catch (error) {
      errors.push({
        field: 'parsing',
        message: `Structured text parsing failed: ${(error as Error).message}`,
        severity: 'error'
      });

      return {
        success: false,
        errors,
        warnings,
        metadata: {
          parseMethod: ParseStrategy.STRUCTURED_TEXT,
          processingTimeMs: 0,
          originalLength: content.length,
          extractedLength: 0,
          confidence: 0
        }
      };
    }
  }

  /**
   * Parse markdown format
   */
  private static parseMarkdown(content: string): ParseResult<ItinerarySchema> {
    // Convert markdown to structured text and then parse
    const structuredContent = this.markdownToStructured(content);
    return this.parseStructuredText(structuredContent);
  }

  /**
   * Fallback reconstruction when other methods fail
   */
  private static parseFallbackReconstruction(content: string): ParseResult<ItinerarySchema> {
    const warnings: ValidationError[] = [{
      field: 'parsing',
      message: 'Using fallback reconstruction - data may be incomplete',
      severity: 'warning'
    }];

    // Create minimal valid structure
    const itinerary: ItinerarySchema = {
      title: 'Reconstructed Itinerary',
      destination: this.extractField(content, /(?:destination|location|city):\s*(.+)/i) || 'Unknown',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalDays: 7,
      totalCost: {
        amount: 0,
        currency: 'USD',
        breakdown: {
          accommodation: 0,
          activities: 0,
          meals: 0,
          transport: 0,
          other: 0
        }
      },
      days: this.createFallbackDays(content),
      travelers: {
        adults: 2,
        children: 0,
        infants: 0
      }
    };

    return {
      success: true,
      data: itinerary,
      errors: [],
      warnings,
      metadata: {
        parseMethod: ParseStrategy.FALLBACK_RECONSTRUCTION,
        processingTimeMs: 0,
        originalLength: content.length,
        extractedLength: JSON.stringify(itinerary).length,
        confidence: 0.3 // Low confidence for fallback
      }
    };
  }

  /**
   * Validate itinerary schema
   */
  private static validateItinerarySchema(data: any): {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!data[field]) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          severity: 'error',
          suggestedFix: `Add ${field} field to the response`
        });
      }
    }

    // Validate days array
    if (data.days && Array.isArray(data.days)) {
      if (data.days.length === 0) {
        errors.push({
          field: 'days',
          message: 'Days array is empty',
          severity: 'error'
        });
      } else {
        // Validate each day
        data.days.forEach((day: any, index: number) => {
          if (!day.day || !day.date) {
            errors.push({
              field: `days[${index}]`,
              message: 'Day missing required fields (day, date)',
              severity: 'error'
            });
          }

          if (!day.activities || !Array.isArray(day.activities)) {
            warnings.push({
              field: `days[${index}].activities`,
              message: 'Day has no activities array',
              severity: 'warning'
            });
          }
        });
      }
    } else {
      errors.push({
        field: 'days',
        message: 'Days field must be an array',
        severity: 'error'
      });
    }

    // Validate date format
    if (data.startDate && !this.isValidDate(data.startDate)) {
      errors.push({
        field: 'startDate',
        message: 'Invalid start date format',
        severity: 'error',
        suggestedFix: 'Use YYYY-MM-DD format'
      });
    }

    if (data.endDate && !this.isValidDate(data.endDate)) {
      errors.push({
        field: 'endDate',
        message: 'Invalid end date format',
        severity: 'error',
        suggestedFix: 'Use YYYY-MM-DD format'
      });
    }

    // Validate totalCost structure
    if (data.totalCost) {
      if (typeof data.totalCost.amount !== 'number') {
        warnings.push({
          field: 'totalCost.amount',
          message: 'Total cost amount should be a number',
          severity: 'warning'
        });
      }

      if (!data.totalCost.currency) {
        warnings.push({
          field: 'totalCost.currency',
          message: 'Currency not specified',
          severity: 'warning'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Helper methods
   */
  private static extractField(content: string, pattern: RegExp): string | null {
    const match = content.match(pattern);
    return match?.[1]?.trim() || null;
  }

  private static parseDateRange(dateStr: string): { start: string; end: string } {
    const today = new Date();
    const defaultStart = today.toISOString().split('T')[0];
    const defaultEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (!dateStr) return { start: defaultStart, end: defaultEnd };

    // Try to extract dates from various formats
    const datePattern = /(\d{4}-\d{2}-\d{2})/g;
    const dates = Array.from(dateStr.matchAll(datePattern));

    if (dates.length >= 2) {
      return { start: dates[0][1], end: dates[1][1] };
    } else if (dates.length === 1) {
      const start = dates[0][1];
      const end = new Date(new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return { start, end };
    }

    return { start: defaultStart, end: defaultEnd };
  }

  private static extractDaysFromText(content: string): ItineraryDay[] {
    const days: ItineraryDay[] = [];
         const dayPattern = /Day\s+(\d+)[:\s]+(.*?)(?=Day\s+\d+|$)/gi;
    const matches = Array.from(content.matchAll(dayPattern));

    matches.forEach((match, index) => {
      const dayNumber = parseInt(match[1]);
      const dayContent = match[2];
      
      const day: ItineraryDay = {
        day: dayNumber,
        date: new Date(Date.now() + (dayNumber - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: `Day ${dayNumber}`,
        activities: this.extractActivitiesFromText(dayContent),
        totalCost: 0
      };

      days.push(day);
    });

    // If no days found, create a default day
    if (days.length === 0) {
      days.push({
        day: 1,
        date: new Date().toISOString().split('T')[0],
        title: 'Day 1',
        activities: [],
        totalCost: 0
      });
    }

    return days;
  }

  private static extractActivitiesFromText(content: string): ItineraryActivity[] {
    const activities: ItineraryActivity[] = [];
    
    // Simple activity extraction - can be enhanced
    const lines = content.split('\n').filter(line => line.trim());
    
    lines.forEach((line, index) => {
      if (line.trim()) {
        activities.push({
          id: `activity_${Date.now()}_${index}`,
          time: '09:00', // Default time
          title: line.trim(),
          description: line.trim(),
          location: {
            name: 'Location TBD'
          },
          duration: 120, // Default 2 hours
          cost: {
            amount: 0,
            currency: 'USD'
          },
          category: 'activity',
          bookingRequired: false
        });
      }
    });

    return activities;
  }

  private static markdownToStructured(content: string): string {
    // Convert markdown headers and formatting to structured text
    return content
      .replace(/^#+\s*/gm, '')  // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1')  // Remove italic formatting
      .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
      .trim();
  }

  private static createFallbackDays(content: string): ItineraryDay[] {
    // Create minimal days structure
    return [{
      day: 1,
      date: new Date().toISOString().split('T')[0],
      title: 'Day 1',
      activities: [{
        id: `fallback_${Date.now()}`,
        time: '09:00',
        title: 'Explore destination',
        description: 'General exploration and sightseeing',
        location: { name: 'City center' },
        duration: 240,
        cost: { amount: 0, currency: 'USD' },
        category: 'activity',
        bookingRequired: false
      }],
      totalCost: 0
    }];
  }

  private static isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private static calculateConfidence(data: any, validation: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for valid structure
    if (validation.isValid) confidence += 0.3;

    // Increase confidence for complete data
    if (data.days && data.days.length > 0) confidence += 0.1;
    if (data.totalCost && data.totalCost.amount > 0) confidence += 0.05;
    if (data.travelers) confidence += 0.05;

    // Decrease confidence for warnings
    confidence -= validation.warnings.length * 0.02;

    return Math.max(0, Math.min(1, confidence));
  }

  private static enrichItinerary(
    itinerary: ItinerarySchema, 
    citations?: unknown[], 
    relatedQuestions?: string[]
  ): GeneratedItinerary {
    // Process citations using synchronous citation processor
    let formattedCitations: string[] = [];
    let citationData: unknown[] = [];
    
    if (citations && Array.isArray(citations)) {
      try {
        const processedCitations = processCitationsSync(citations);
        formattedCitations = processedCitations.formatted;
        citationData = processedCitations.raw;
        
        // Log citation quality summary
        const qualitySummary = getCitationQualitySummary(processedCitations);
        console.log(`Citation processing completed: ${qualitySummary}`);
      } catch (error) {
        console.warn('Failed to process citations:', error);
        // Fallback to simple string conversion
        formattedCitations = citations
          .filter(c => c && typeof c === 'object')
          .map(c => {
            const citation = c as Record<string, unknown>;
            const url = citation.url as string;
            const title = citation.title as string || citation.site_name as string || url;
            return url ? `<a href="${url}">${title}</a>` : title;
          })
          .filter(Boolean);
      }
    }

    return {
      ...itinerary,
      id: `itinerary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'llama-3.1-sonar-small-128k-online',
        citations: formattedCitations,
        relatedQuestions: relatedQuestions || [],
        citationData
      }
    };
  }
}

// Export utility functions for external use
export const parseItinerary = ResponseParser.parseItineraryResponse;

// Export a public validation function
export function validateItinerary(data: any): {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
} {
  return (ResponseParser as any).validateItinerarySchema(data);
} 