/**
 * Context Formatting System
 * 
 * Provides comprehensive context management for AI API requests including:
 * - Context truncation strategies
 * - Context prioritization algorithms  
 * - Context validation tools
 * - Context assembly pipeline
 * - Research-specific formatting
 */

import { PromptFormData } from '@/types/prompt';

// Context priority levels
export enum ContextPriority {
  CRITICAL = 1,    // Must be included (user requirements, core data)
  HIGH = 2,        // Very important (preferences, constraints)
  MEDIUM = 3,      // Important but can be truncated (additional details)
  LOW = 4,         // Nice to have (examples, background info)
  OPTIONAL = 5     // Can be omitted if space is limited
}

// Context types for different formatting strategies
export enum ContextType {
  USER_REQUIREMENTS = 'user_requirements',
  TRAVEL_PREFERENCES = 'travel_preferences',
  DESTINATION_INFO = 'destination_info',
  BUDGET_CONSTRAINTS = 'budget_constraints',
  EXTERNAL_CONTENT = 'external_content',
  RESEARCH_DATA = 'research_data',
  SYSTEM_INSTRUCTIONS = 'system_instructions',
  EXAMPLES = 'examples',
  METADATA = 'metadata'
}

// Context segment interface
export interface ContextSegment {
  id: string;
  type: ContextType;
  priority: ContextPriority;
  content: string;
  tokenCount?: number;
  metadata?: Record<string, any>;
  required?: boolean;
}

// Context assembly options
export interface ContextAssemblyOptions {
  maxTokens?: number;
  includeResearchContext?: boolean;
  prioritizeUserInput?: boolean;
  includeExamples?: boolean;
  truncationStrategy?: TruncationStrategy;
  validationLevel?: ValidationLevel;
}

// Truncation strategies
export enum TruncationStrategy {
  PRIORITY_BASED = 'priority_based',     // Remove lowest priority segments first
  PROPORTIONAL = 'proportional',         // Reduce all segments proportionally
  TAIL_TRUNCATION = 'tail_truncation',   // Remove from end of segments
  SMART_SUMMARY = 'smart_summary'        // Summarize less important content
}

// Validation levels
export enum ValidationLevel {
  NONE = 'none',
  BASIC = 'basic',       // Check for required fields
  STRICT = 'strict',     // Full validation with content checks
  RESEARCH = 'research'  // Research-specific validation
}

// Context formatting result
export interface FormattedContext {
  content: string;
  tokenCount: number;
  segments: ContextSegment[];
  truncated: boolean;
  warnings: string[];
  metadata: {
    originalTokenCount: number;
    compressionRatio: number;
    segmentsIncluded: number;
    segmentsOmitted: number;
  };
}

// Token estimation (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Context validation utilities
class ContextValidator {
  static validateSegment(segment: ContextSegment, level: ValidationLevel): string[] {
    const warnings: string[] = [];

    if (level === ValidationLevel.NONE) return warnings;

    // Basic validation
    if (!segment.content || segment.content.trim().length === 0) {
      warnings.push(`Empty content in segment ${segment.id}`);
    }

    if (!segment.type) {
      warnings.push(`Missing type for segment ${segment.id}`);
    }

    if (level === ValidationLevel.BASIC) return warnings;

    // Strict validation
    if (segment.content.length > 10000) {
      warnings.push(`Segment ${segment.id} is very long (${segment.content.length} chars)`);
    }

    if (segment.priority === ContextPriority.CRITICAL && segment.content.length < 10) {
      warnings.push(`Critical segment ${segment.id} has very little content`);
    }

    // Research-specific validation
    if (level === ValidationLevel.RESEARCH) {
      if (segment.type === ContextType.RESEARCH_DATA && !segment.metadata?.source) {
        warnings.push(`Research segment ${segment.id} missing source metadata`);
      }

      if (segment.type === ContextType.EXTERNAL_CONTENT && !segment.metadata?.url) {
        warnings.push(`External content segment ${segment.id} missing URL metadata`);
      }
    }

    return warnings;
  }

  static validateContext(segments: ContextSegment[], level: ValidationLevel): string[] {
    const warnings: string[] = [];

    // Check for required segments
    const hasUserRequirements = segments.some(s => s.type === ContextType.USER_REQUIREMENTS);
    if (!hasUserRequirements) {
      warnings.push('Missing user requirements segment');
    }

    // Check for duplicate IDs
    const ids = segments.map(s => s.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      warnings.push(`Duplicate segment IDs: ${duplicates.join(', ')}`);
    }

    // Validate individual segments
    segments.forEach(segment => {
      warnings.push(...this.validateSegment(segment, level));
    });

    return warnings;
  }
}

// Context truncation utilities
class ContextTruncator {
  static truncateByPriority(
    segments: ContextSegment[], 
    maxTokens: number
  ): { segments: ContextSegment[], truncated: boolean } {
    // Sort by priority (lower number = higher priority)
    const sorted = [...segments].sort((a, b) => a.priority - b.priority);
    const result: ContextSegment[] = [];
    let currentTokens = 0;
    let truncated = false;

    for (const segment of sorted) {
      const segmentTokens = segment.tokenCount || estimateTokens(segment.content);
      
      if (currentTokens + segmentTokens <= maxTokens) {
        result.push(segment);
        currentTokens += segmentTokens;
      } else if (segment.required || segment.priority === ContextPriority.CRITICAL) {
        // Try to fit critical/required segments by truncating content
        const availableTokens = maxTokens - currentTokens;
        if (availableTokens > 100) { // Minimum viable content
          const truncatedContent = this.truncateContent(segment.content, availableTokens * 4);
          result.push({
            ...segment,
            content: truncatedContent,
            tokenCount: estimateTokens(truncatedContent)
          });
          truncated = true;
          break;
        }
      } else {
        truncated = true;
        break;
      }
    }

    return { segments: result, truncated };
  }

  static truncateProportionally(
    segments: ContextSegment[], 
    maxTokens: number
  ): { segments: ContextSegment[], truncated: boolean } {
    const totalTokens = segments.reduce((sum, s) => sum + (s.tokenCount || estimateTokens(s.content)), 0);
    
    if (totalTokens <= maxTokens) {
      return { segments, truncated: false };
    }

    const ratio = maxTokens / totalTokens;
    const result: ContextSegment[] = [];

    for (const segment of segments) {
      const originalTokens = segment.tokenCount || estimateTokens(segment.content);
      const targetTokens = Math.floor(originalTokens * ratio);
      
      if (targetTokens < 50 && segment.priority !== ContextPriority.CRITICAL) {
        continue; // Skip segments that would be too small
      }

      const targetChars = Math.max(50, targetTokens * 4);
      const truncatedContent = this.truncateContent(segment.content, targetChars);
      
      result.push({
        ...segment,
        content: truncatedContent,
        tokenCount: estimateTokens(truncatedContent)
      });
    }

    return { segments: result, truncated: true };
  }

  static truncateContent(content: string, maxChars: number): string {
    if (content.length <= maxChars) return content;

    // Try to truncate at sentence boundaries
    const sentences = content.split(/[.!?]+/);
    let result = '';
    
    for (const sentence of sentences) {
      if ((result + sentence).length > maxChars - 10) break;
      result += sentence + '.';
    }

    if (result.length < maxChars * 0.5) {
      // If sentence-based truncation is too aggressive, do word-based
      const words = content.split(' ');
      result = '';
      
      for (const word of words) {
        if ((result + ' ' + word).length > maxChars - 10) break;
        result += (result ? ' ' : '') + word;
      }
    }

    return result.trim() + (result.length < content.length ? '...' : '');
  }
}

// Main context formatter class
export class ContextFormatter {
  private segments: ContextSegment[] = [];
  private options: ContextAssemblyOptions;

  constructor(options: ContextAssemblyOptions = {}) {
    this.options = {
      maxTokens: 4000,
      includeResearchContext: false,
      prioritizeUserInput: true,
      includeExamples: true,
      truncationStrategy: TruncationStrategy.PRIORITY_BASED,
      validationLevel: ValidationLevel.STRICT,
      ...options
    };
  }

  // Add context segment
  addSegment(segment: ContextSegment): void {
    // Estimate tokens if not provided
    if (!segment.tokenCount) {
      segment.tokenCount = estimateTokens(segment.content);
    }

    this.segments.push(segment);
  }

  // Create context from form data
  static fromFormData(formData: PromptFormData, options: ContextAssemblyOptions = {}): ContextFormatter {
    const formatter = new ContextFormatter(options);

    // User requirements (highest priority)
    formatter.addSegment({
      id: 'destination',
      type: ContextType.USER_REQUIREMENTS,
      priority: ContextPriority.CRITICAL,
      content: `Destination: ${formData.destination.name}${formData.destination.country ? `, ${formData.destination.country}` : ''}`,
      required: true
    });

    // Date range
    if (formData.dateRange.start && formData.dateRange.end) {
      const startDate = formData.dateRange.start.toLocaleDateString();
      const endDate = formData.dateRange.end.toLocaleDateString();
      formatter.addSegment({
        id: 'date_range',
        type: ContextType.USER_REQUIREMENTS,
        priority: ContextPriority.CRITICAL,
        content: `Travel Dates: ${startDate} to ${endDate}`,
        required: true
      });
    }

    // Travelers information
    if (formData.travelers.travelers && formData.travelers.travelers.length > 0) {
      const travelerSummary = formData.travelers.travelers.map(t => 
        `${t.name} (${t.type}${t.age ? `, age ${t.age}` : ''})`
      ).join(', ');
      
      formatter.addSegment({
        id: 'travelers',
        type: ContextType.TRAVEL_PREFERENCES,
        priority: ContextPriority.HIGH,
        content: `Travelers: ${travelerSummary}`
      });
    }

    // Interests and activities
    if (formData.interests.activities && formData.interests.activities.length > 0) {
      formatter.addSegment({
        id: 'activities',
        type: ContextType.TRAVEL_PREFERENCES,
        priority: ContextPriority.HIGH,
        content: `Preferred Activities: ${formData.interests.activities.join(', ')}`
      });
    }

    if (formData.interests.specialInterests && formData.interests.specialInterests.length > 0) {
      formatter.addSegment({
        id: 'special_interests',
        type: ContextType.TRAVEL_PREFERENCES,
        priority: ContextPriority.HIGH,
        content: `Special Interests: ${formData.interests.specialInterests.join(', ')}`
      });
    }

    // Budget constraints
    if (formData.budget.amount > 0) {
      formatter.addSegment({
        id: 'budget',
        type: ContextType.BUDGET_CONSTRAINTS,
        priority: ContextPriority.HIGH,
        content: `Budget: ${formData.budget.amount} ${formData.budget.currency} (${formData.budget.budgetLevel})`
      });
    }

    if (formData.budget.priorities && formData.budget.priorities.length > 0) {
      formatter.addSegment({
        id: 'budget_priorities',
        type: ContextType.BUDGET_CONSTRAINTS,
        priority: ContextPriority.MEDIUM,
        content: `Budget Priorities: ${formData.budget.priorities.join(', ')}`
      });
    }

    // Accommodation preferences
    if (formData.interests.accommodationTypes && formData.interests.accommodationTypes.length > 0) {
      formatter.addSegment({
        id: 'accommodation',
        type: ContextType.TRAVEL_PREFERENCES,
        priority: ContextPriority.MEDIUM,
        content: `Accommodation Preferences: ${formData.interests.accommodationTypes.join(', ')}`
      });
    }

    // Transportation preferences
    if (formData.interests.transportationModes && formData.interests.transportationModes.length > 0) {
      formatter.addSegment({
        id: 'transportation',
        type: ContextType.TRAVEL_PREFERENCES,
        priority: ContextPriority.MEDIUM,
        content: `Transportation Preferences: ${formData.interests.transportationModes.join(', ')}`
      });
    }

    // Dining preferences
    if (formData.interests.diningPreferences && formData.interests.diningPreferences.length > 0) {
      formatter.addSegment({
        id: 'dining',
        type: ContextType.TRAVEL_PREFERENCES,
        priority: ContextPriority.MEDIUM,
        content: `Dining Preferences: ${formData.interests.diningPreferences.join(', ')}`
      });
    }

    // External content
    if (formData.externalContent.items && formData.externalContent.items.length > 0) {
      const completedItems = formData.externalContent.items.filter(item => item.status === 'completed');
      
      completedItems.forEach((item, index) => {
        formatter.addSegment({
          id: `external_content_${index}`,
          type: ContextType.EXTERNAL_CONTENT,
          priority: ContextPriority.MEDIUM,
          content: `External Content (${item.contentType}): ${item.content}${item.extractedInsights ? '\nInsights: ' + item.extractedInsights.join(', ') : ''}`,
          metadata: { 
            source: 'user_input',
            type: item.type,
            contentType: item.contentType,
            url: item.type === 'url' ? item.content : undefined
          }
        });
      });
    }

    // Extracted preferences from external content
    if (formData.externalContent.extractedPreferences) {
      const prefs = formData.externalContent.extractedPreferences;
      const prefSections: string[] = [];
      
      if (prefs.destinations && prefs.destinations.length > 0) {
        prefSections.push(`Destinations: ${prefs.destinations.join(', ')}`);
      }
      if (prefs.activities && prefs.activities.length > 0) {
        prefSections.push(`Activities: ${prefs.activities.join(', ')}`);
      }
      if (prefs.travelStyle && prefs.travelStyle.length > 0) {
        prefSections.push(`Travel Style: ${prefs.travelStyle.join(', ')}`);
      }
      
      if (prefSections.length > 0) {
        formatter.addSegment({
          id: 'extracted_preferences',
          type: ContextType.EXTERNAL_CONTENT,
          priority: ContextPriority.MEDIUM,
          content: `Extracted Preferences:\n${prefSections.join('\n')}`,
          metadata: { source: 'content_analysis' }
        });
      }
    }

    return formatter;
  }

  // Add research context
  addResearchContext(researchData: string, source?: string): void {
    if (!this.options.includeResearchContext) return;

    this.addSegment({
      id: `research_${Date.now()}`,
      type: ContextType.RESEARCH_DATA,
      priority: ContextPriority.MEDIUM,
      content: researchData,
      metadata: { source: source || 'research_api', timestamp: new Date().toISOString() }
    });
  }

  // Add system instructions
  addSystemInstructions(instructions: string): void {
    this.addSegment({
      id: 'system_instructions',
      type: ContextType.SYSTEM_INSTRUCTIONS,
      priority: ContextPriority.CRITICAL,
      content: instructions,
      required: true
    });
  }

  // Add examples (if enabled)
  addExamples(examples: string[]): void {
    if (!this.options.includeExamples) return;

    examples.forEach((example, index) => {
      this.addSegment({
        id: `example_${index}`,
        type: ContextType.EXAMPLES,
        priority: ContextPriority.LOW,
        content: example
      });
    });
  }

  // Format and assemble final context
  format(): FormattedContext {
    const warnings: string[] = [];
    
    // Validate context
    const validationWarnings = ContextValidator.validateContext(
      this.segments, 
      this.options.validationLevel || ValidationLevel.STRICT
    );
    warnings.push(...validationWarnings);

    // Calculate original token count
    const originalTokenCount = this.segments.reduce(
      (sum, segment) => sum + (segment.tokenCount || 0), 
      0
    );

    let processedSegments = [...this.segments];
    let truncated = false;

    // Apply truncation if needed
    if (this.options.maxTokens && originalTokenCount > this.options.maxTokens) {
      const truncationResult = this.applyTruncation(processedSegments);
      processedSegments = truncationResult.segments;
      truncated = truncationResult.truncated;
    }

    // Assemble final content
    const content = this.assembleContent(processedSegments);
    const finalTokenCount = estimateTokens(content);

    return {
      content,
      tokenCount: finalTokenCount,
      segments: processedSegments,
      truncated,
      warnings,
      metadata: {
        originalTokenCount,
        compressionRatio: originalTokenCount > 0 ? finalTokenCount / originalTokenCount : 1,
        segmentsIncluded: processedSegments.length,
        segmentsOmitted: this.segments.length - processedSegments.length
      }
    };
  }

  private applyTruncation(segments: ContextSegment[]): { segments: ContextSegment[], truncated: boolean } {
    const maxTokens = this.options.maxTokens!;
    
    switch (this.options.truncationStrategy) {
      case TruncationStrategy.PRIORITY_BASED:
        return ContextTruncator.truncateByPriority(segments, maxTokens);
      
      case TruncationStrategy.PROPORTIONAL:
        return ContextTruncator.truncateProportionally(segments, maxTokens);
      
      case TruncationStrategy.TAIL_TRUNCATION:
        // Simple tail truncation
        const result: ContextSegment[] = [];
        let currentTokens = 0;
        
        for (const segment of segments) {
          const segmentTokens = segment.tokenCount || estimateTokens(segment.content);
          if (currentTokens + segmentTokens <= maxTokens) {
            result.push(segment);
            currentTokens += segmentTokens;
          } else {
            return { segments: result, truncated: true };
          }
        }
        return { segments: result, truncated: false };
      
      default:
        return { segments, truncated: false };
    }
  }

  private assembleContent(segments: ContextSegment[]): string {
    // Group segments by type for better organization
    const grouped = segments.reduce((acc, segment) => {
      if (!acc[segment.type]) acc[segment.type] = [];
      acc[segment.type].push(segment);
      return acc;
    }, {} as Record<ContextType, ContextSegment[]>);

    const sections: string[] = [];

    // Assemble in logical order
    const typeOrder = [
      ContextType.SYSTEM_INSTRUCTIONS,
      ContextType.USER_REQUIREMENTS,
      ContextType.TRAVEL_PREFERENCES,
      ContextType.BUDGET_CONSTRAINTS,
      ContextType.DESTINATION_INFO,
      ContextType.RESEARCH_DATA,
      ContextType.EXTERNAL_CONTENT,
      ContextType.EXAMPLES,
      ContextType.METADATA
    ];

    for (const type of typeOrder) {
      if (grouped[type]) {
        const typeContent = grouped[type]
          .map(segment => segment.content)
          .join('\n');
        
        if (typeContent.trim()) {
          sections.push(typeContent);
        }
      }
    }

    return sections.join('\n\n');
  }

  // Utility methods
  getTokenCount(): number {
    return this.segments.reduce((sum, segment) => sum + (segment.tokenCount || 0), 0);
  }

  getSegmentsByType(type: ContextType): ContextSegment[] {
    return this.segments.filter(segment => segment.type === type);
  }

  getSegmentsByPriority(priority: ContextPriority): ContextSegment[] {
    return this.segments.filter(segment => segment.priority === priority);
  }

  clear(): void {
    this.segments = [];
  }
}

// Export utility functions
export {
  ContextValidator,
  ContextTruncator,
  estimateTokens
}; 