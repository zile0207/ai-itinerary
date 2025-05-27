import { ChatMessage, ChatContext, ChatSuggestion, AIResponse, ChatAttachment } from '@/types/chat';
import { perplexityService, PerplexityRequest, PerplexityResponse } from '@/lib/perplexity';
import { contextManager } from './context-manager';

export interface ChatAIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  includeContext?: boolean;
  includeCitations?: boolean;
  includeRelatedQuestions?: boolean;
  enableSuggestions?: boolean;
  searchRecency?: 'month' | 'week' | 'day' | 'hour';
}

export interface ProcessedResponse {
  content: string;
  suggestions: ChatSuggestion[];
  citations: string[];
  relatedQuestions: string[];
  metadata: {
    model: string;
    confidence: number;
    processingTime: number;
    tokenUsage: {
      input: number;
      output: number;
      total: number;
    };
    contextOptimizations: string[];
  };
}

export class ChatAIService {
  private static instance: ChatAIService;
  
  private readonly defaultOptions: ChatAIOptions = {
    model: 'llama-3.1-sonar-small-128k-online',
    temperature: 0.7,
    maxTokens: 2000,
    includeContext: true,
    includeCitations: true,
    includeRelatedQuestions: true,
    enableSuggestions: true,
    searchRecency: 'week'
  };

  static getInstance(): ChatAIService {
    if (!ChatAIService.instance) {
      ChatAIService.instance = new ChatAIService();
    }
    return ChatAIService.instance;
  }

  /**
   * Process chat message and get AI response
   */
  async processMessage(
    content: string,
    messages: ChatMessage[],
    context: ChatContext,
    attachments?: ChatAttachment[],
    options: Partial<ChatAIOptions> = {}
  ): Promise<ProcessedResponse> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      // Step 1: Extract and process URLs if present
      const urls = contextManager.extractUrls(content);
      let updatedContext = { ...context };

      if (urls.length > 0) {
        const urlAnalysis = await this.analyzeUrls(urls);
        updatedContext = contextManager.updateContext(context, {
          urlAnalysis
        });
      }

      // Step 2: Process attachments if present
      if (attachments && attachments.length > 0) {
        const attachmentAnalysis = await this.processAttachments(attachments);
        updatedContext = contextManager.updateContext(updatedContext, {
          attachmentAnalysis
        });
      }

      // Step 3: Optimize context for token limits
      const contextOptimization = await contextManager.optimizeContext(
        messages,
        updatedContext,
        content
      );

      // Step 4: Build Perplexity request
      const perplexityRequest: PerplexityRequest = {
        model: mergedOptions.model!,
        messages: contextOptimization.messages,
        max_tokens: mergedOptions.maxTokens,
        temperature: mergedOptions.temperature,
        return_citations: mergedOptions.includeCitations,
        return_related_questions: mergedOptions.includeRelatedQuestions,
        search_recency_filter: mergedOptions.searchRecency
      };

      // Step 5: Get AI response
      const aiResponse = await perplexityService.query(perplexityRequest);

      // Step 6: Process and enhance the response
      const processedResponse = await this.enhanceResponse(
        aiResponse,
        mergedOptions,
        contextOptimization.optimizations
      );

      // Step 7: Add processing metadata
      processedResponse.metadata.processingTime = Date.now() - startTime;

      return processedResponse;

    } catch (error) {
      console.error('Chat AI Service Error:', error);
      
      // Return error response
      return {
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        suggestions: [],
        citations: [],
        relatedQuestions: [
          'Could you rephrase your question?',
          'Would you like to try a different approach?'
        ],
        metadata: {
          model: mergedOptions.model!,
          confidence: 0,
          processingTime: Date.now() - startTime,
          tokenUsage: { input: 0, output: 0, total: 0 },
          contextOptimizations: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }
      };
    }
  }

  /**
   * Analyze URLs mentioned in the message
   */
  private async analyzeUrls(urls: string[]): Promise<Array<{ url: string; summary: string; metadata?: any }>> {
    const analyses = [];

    for (const url of urls) {
      try {
        const response = await perplexityService.analyzeContent(url, 'url');
        analyses.push({
          url,
          summary: response.choices[0]?.message?.content || 'Unable to analyze URL',
          metadata: {
            timestamp: new Date().toISOString(),
            tokenUsage: response.usage,
            citations: response.citations
          }
        });
      } catch (error) {
        analyses.push({
          url,
          summary: 'Error analyzing URL',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    return analyses;
  }

  /**
   * Process chat attachments
   */
  private async processAttachments(
    attachments: ChatAttachment[]
  ): Promise<Array<{ name: string; summary: string; type: string; metadata?: any }>> {
    const analyses = [];

    for (const attachment of attachments) {
      try {
        let summary = 'Attachment received';
        
        switch (attachment.type) {
          case 'url':
            if (attachment.url) {
              const response = await perplexityService.analyzeContent(attachment.url, 'url');
              summary = response.choices[0]?.message?.content || 'Unable to analyze URL';
            }
            break;
          case 'image':
            summary = 'Image attachment - content analysis not yet supported';
            break;
          case 'document':
            summary = 'Document attachment - content analysis not yet supported';
            break;
          case 'location':
            summary = `Location shared: ${attachment.name}`;
            break;
          default:
            summary = `${attachment.type} attachment received`;
        }

        analyses.push({
          name: attachment.name,
          summary,
          type: attachment.type,
          metadata: {
            attachmentId: attachment.id,
            status: attachment.status,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        analyses.push({
          name: attachment.name,
          summary: 'Error processing attachment',
          type: attachment.type,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            attachmentId: attachment.id,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    return analyses;
  }

  /**
   * Enhance AI response with suggestions and structured data
   */
  private async enhanceResponse(
    aiResponse: PerplexityResponse,
    options: ChatAIOptions,
    contextOptimizations: string[]
  ): Promise<ProcessedResponse> {
    const content = aiResponse.choices[0]?.message?.content || '';
    
    // Extract suggestions from AI response if enabled
    let suggestions: ChatSuggestion[] = [];
    if (options.enableSuggestions) {
      suggestions = this.extractSuggestions(content);
    }

    // Calculate confidence based on response quality
    const confidence = this.calculateConfidence(aiResponse, content);

    return {
      content,
      suggestions,
      citations: aiResponse.citations || [],
      relatedQuestions: aiResponse.related_questions || [],
      metadata: {
        model: aiResponse.model,
        confidence,
        processingTime: 0, // Will be set by caller
        tokenUsage: {
          input: aiResponse.usage.prompt_tokens,
          output: aiResponse.usage.completion_tokens,
          total: aiResponse.usage.total_tokens
        },
        contextOptimizations
      }
    };
  }

  /**
   * Extract actionable suggestions from AI response content
   */
  private extractSuggestions(content: string): ChatSuggestion[] {
    const suggestions: ChatSuggestion[] = [];
    
    // Simple pattern matching for common suggestion types
    const suggestionPatterns = [
      {
        pattern: /(?:visit|check out|consider|recommend)\s+([^.!?]+)/gi,
        type: 'activity' as const
      },
      {
        pattern: /(?:stay at|book|accommodation|hotel)\s+([^.!?]+)/gi,
        type: 'accommodation' as const
      },
      {
        pattern: /(?:eat at|restaurant|dine at|try)\s+([^.!?]+)/gi,
        type: 'restaurant' as const
      },
      {
        pattern: /(?:take|use|travel by|transportation)\s+([^.!?]+)/gi,
        type: 'transportation' as const
      }
    ];

    suggestionPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const suggestion = match[1]?.trim();
        if (suggestion && suggestion.length > 10 && suggestion.length < 100) {
          suggestions.push({
            id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            title: this.titleCase(suggestion),
            description: `AI suggested: ${suggestion}`,
            confidence: 0.7, // Medium confidence for pattern-matched suggestions
            actions: [
              {
                type: 'add_to_itinerary',
                label: 'Add to Itinerary',
                data: { suggestion, type }
              },
              {
                type: 'get_more_info',
                label: 'Get More Info',
                data: { suggestion, type }
              }
            ]
          });
        }
      }
    });

    // Limit to top 3 suggestions to avoid overwhelming the user
    return suggestions.slice(0, 3);
  }

  /**
   * Calculate confidence score for AI response
   */
  private calculateConfidence(aiResponse: PerplexityResponse, content: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on:
    // - Presence of citations
    if (aiResponse.citations && aiResponse.citations.length > 0) {
      confidence += 0.2;
    }

    // - Response length (not too short, not too long)
    const contentLength = content.length;
    if (contentLength > 100 && contentLength < 2000) {
      confidence += 0.1;
    }

    // - Structured content indicators
    if (content.includes('$') || content.includes('€') || content.includes('£')) {
      confidence += 0.1; // Price information
    }

    if (content.match(/\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)/gi)) {
      confidence += 0.05; // Time information
    }

    if (content.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{1,2}-\d{1,2}-\d{2,4}\b/g)) {
      confidence += 0.05; // Date information
    }

    // - Presence of specific travel keywords
    const travelKeywords = ['hotel', 'restaurant', 'activity', 'flight', 'booking', 'reservation'];
    const keywordMatches = travelKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
    confidence += Math.min(keywordMatches * 0.02, 0.1);

    return Math.min(confidence, 1.0); // Cap at 1.0
  }

  /**
   * Convert string to title case
   */
  private titleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Quick chat response for simple queries
   */
  async quickResponse(query: string, context: ChatContext): Promise<string> {
    try {
      const response = await perplexityService.query({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful travel assistant. Give a brief, direct answer to the user\'s travel question.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response at this time.';
    } catch (error) {
      console.error('Quick response error:', error);
      return 'I apologize, but I encountered an error. Please try asking your question again.';
    }
  }

  /**
   * Health check for the AI service
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await perplexityService.healthCheck();
    } catch (error) {
      console.error('AI service health check failed:', error);
      return false;
    }
  }

  /**
   * Get service status and statistics
   */
  getServiceStatus(): {
    rateLimitStatus: any;
    cacheStats: any;
    contextWindowInfo: any;
  } {
    return {
      rateLimitStatus: perplexityService.getRateLimitStatus(),
      cacheStats: perplexityService.getCacheStats(),
      contextWindowInfo: contextManager.getContextWindowInfo()
    };
  }
}

export const chatAIService = ChatAIService.getInstance(); 