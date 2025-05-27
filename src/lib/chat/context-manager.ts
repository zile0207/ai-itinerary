import { ChatMessage, ChatContext } from '@/types/chat';
import { PerplexityMessage } from '@/lib/perplexity';

export interface ContextWindow {
  maxTokens: number;
  reservedTokens: number; // For system prompt and response
  availableTokens: number;
}

export interface ContextPriority {
  systemPrompt: number;
  currentItinerary: number;
  recentMessages: number;
  externalContent: number;
  historyMessages: number;
}

export interface ContextOptimization {
  summarizeAfterMessages: number;
  keepRecentMessages: number;
  maxHistoryTokens: number;
  compressRatio: number;
}

export class ContextManager {
  private static instance: ContextManager;
  
  private readonly contextWindow: ContextWindow = {
    maxTokens: 128000, // Perplexity context window
    reservedTokens: 4000, // Reserve for system prompt and response
    availableTokens: 124000
  };

  private readonly contextPriority: ContextPriority = {
    systemPrompt: 100,
    currentItinerary: 90,
    recentMessages: 80,
    externalContent: 70,
    historyMessages: 60
  };

  private readonly optimization: ContextOptimization = {
    summarizeAfterMessages: 20,
    keepRecentMessages: 10,
    maxHistoryTokens: 50000,
    compressRatio: 0.3
  };

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Convert chat messages to Perplexity message format
   */
  private chatToPerplexityMessages(messages: ChatMessage[]): PerplexityMessage[] {
    return messages
      .filter(msg => msg.sender !== 'system') // Filter out system messages
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
  }

  /**
   * Summarize a group of messages to save context space
   */
  private async summarizeMessages(messages: ChatMessage[]): Promise<string> {
    if (messages.length === 0) return '';

    const messageContent = messages
      .map(msg => `${msg.sender}: ${msg.content}`)
      .join('\n');

    // Simple summarization - in production, could use AI for better summaries
    const summary = `[Previous conversation summary: ${messages.length} messages covering topics about travel planning, with key discussions about ${this.extractKeyTopics(messages).join(', ')}]`;
    
    return summary;
  }

  /**
   * Extract key topics from messages for summarization
   */
  private extractKeyTopics(messages: ChatMessage[]): string[] {
    const topics = new Set<string>();
    const keywords = [
      'destination', 'hotel', 'flight', 'activity', 'restaurant', 'budget',
      'itinerary', 'travel', 'booking', 'recommendation', 'price', 'location'
    ];

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          topics.add(keyword);
        }
      });
    });

    return Array.from(topics).slice(0, 5); // Limit to top 5 topics
  }

  /**
   * Create system prompt with current context
   */
  private createSystemPrompt(context: ChatContext): string {
    const basePrompt = `You are an AI travel assistant specializing in itinerary planning and travel advice. You have access to current travel information and can help with destinations, activities, accommodations, transportation, and budgeting.

Key Guidelines:
- Provide specific, actionable travel recommendations
- Include current pricing and availability when possible
- Consider the user's itinerary context when making suggestions
- Offer practical alternatives and backup options
- Be concise but comprehensive in your responses
- Always cite your sources when providing factual information`;

    let contextualPrompt = basePrompt;

    // Add itinerary context if available
    if (context.itinerary) {
      const itineraryInfo = this.formatItineraryContext(context.itinerary);
      contextualPrompt += `\n\nCurrent Itinerary Context:\n${itineraryInfo}`;
    }

    // Add any specific travel preferences
    if (context.travelPreferences) {
      contextualPrompt += `\n\nTravel Preferences:\n${JSON.stringify(context.travelPreferences, null, 2)}`;
    }

    return contextualPrompt;
  }

  /**
   * Format itinerary data for context
   */
  private formatItineraryContext(itinerary: any): string {
    if (!itinerary) return 'No current itinerary';

    try {
      return `Destination: ${itinerary.destination || 'Not specified'}
Travel Dates: ${itinerary.startDate || 'Not specified'} to ${itinerary.endDate || 'Not specified'}
Duration: ${itinerary.duration || 'Not specified'}
Budget: ${itinerary.budget || 'Not specified'}
Travelers: ${itinerary.travelers || 'Not specified'}
Current Activities: ${itinerary.activities?.length || 0} planned activities
Accommodations: ${itinerary.accommodations ? 'Selected' : 'Not selected'}
Transportation: ${itinerary.transportation ? 'Planned' : 'Not planned'}`;
    } catch (error) {
      console.warn('Error formatting itinerary context:', error);
      return 'Itinerary data available but format error occurred';
    }
  }

  /**
   * Process external content (URLs, attachments) for context
   */
  private formatExternalContent(context: ChatContext): string {
    const externalParts: string[] = [];

    if (context.urlAnalysis && context.urlAnalysis.length > 0) {
      externalParts.push('URL Analysis:');
      context.urlAnalysis.forEach((analysis, index) => {
        externalParts.push(`${index + 1}. ${analysis.url}: ${analysis.summary}`);
      });
    }

    if (context.attachmentAnalysis && context.attachmentAnalysis.length > 0) {
      externalParts.push('\nAttachment Analysis:');
      context.attachmentAnalysis.forEach((analysis, index) => {
        externalParts.push(`${index + 1}. ${analysis.name}: ${analysis.summary}`);
      });
    }

    return externalParts.join('\n');
  }

  /**
   * Optimize context to fit within token limits
   */
  async optimizeContext(
    messages: ChatMessage[],
    context: ChatContext,
    currentMessage: string
  ): Promise<{
    messages: PerplexityMessage[];
    tokenCount: number;
    optimizations: string[];
  }> {
    const optimizations: string[] = [];
    let optimizedMessages = [...messages];

    // Calculate initial token counts
    const systemPrompt = this.createSystemPrompt(context);
    const systemTokens = this.estimateTokens(systemPrompt);
    const currentMessageTokens = this.estimateTokens(currentMessage);
    const externalContent = this.formatExternalContent(context);
    const externalTokens = this.estimateTokens(externalContent);

    let availableForHistory = this.contextWindow.availableTokens 
      - systemTokens 
      - currentMessageTokens 
      - externalTokens;

    // If we have too many messages, apply optimization strategies
    if (optimizedMessages.length > this.optimization.summarizeAfterMessages) {
      // Keep recent messages, summarize older ones
      const recentMessages = optimizedMessages.slice(-this.optimization.keepRecentMessages);
      const oldMessages = optimizedMessages.slice(0, -this.optimization.keepRecentMessages);

      if (oldMessages.length > 0) {
        const summary = await this.summarizeMessages(oldMessages);
        const summaryTokens = this.estimateTokens(summary);

        // Replace old messages with summary if it saves tokens
        const oldMessagesTokens = oldMessages.reduce((sum, msg) => 
          sum + this.estimateTokens(msg.content), 0);

        if (summaryTokens < oldMessagesTokens * this.optimization.compressRatio) {
          optimizedMessages = recentMessages;
          optimizations.push(`Summarized ${oldMessages.length} older messages`);
          
          // Add summary as a system-like message
          if (summary) {
            optimizedMessages.unshift({
              id: 'summary',
              content: summary,
              sender: 'system',
              timestamp: new Date(),
              status: 'delivered'
            });
          }
        }
      }
    }

    // Build final message array for Perplexity
    const perplexityMessages: PerplexityMessage[] = [
      {
        role: 'system',
        content: systemPrompt + (externalContent ? `\n\nExternal Content:\n${externalContent}` : '')
      }
    ];

    // Add conversation history
    const historyMessages = this.chatToPerplexityMessages(optimizedMessages);
    perplexityMessages.push(...historyMessages);

    // Add current user message
    perplexityMessages.push({
      role: 'user',
      content: currentMessage
    });

    // Calculate final token count
    const totalTokens = perplexityMessages.reduce((sum, msg) => 
      sum + this.estimateTokens(msg.content), 0);

    // If still over limit, further trim history
    if (totalTokens > this.contextWindow.availableTokens) {
      const excessTokens = totalTokens - this.contextWindow.availableTokens;
      optimizations.push(`Trimmed ${excessTokens} excess tokens from conversation history`);
      
      // Remove messages from the middle of history, keeping system and current message
      while (perplexityMessages.length > 3 && totalTokens > this.contextWindow.availableTokens) {
        const removedMessage = perplexityMessages.splice(1, 1)[0]; // Remove second message (keep system first)
        optimizations.push(`Removed message: "${removedMessage.content.substring(0, 50)}..."`);
      }
    }

    return {
      messages: perplexityMessages,
      tokenCount: totalTokens,
      optimizations
    };
  }

  /**
   * Update context with new information
   */
  updateContext(
    context: ChatContext,
    updates: Partial<ChatContext>
  ): ChatContext {
    return {
      ...context,
      ...updates,
      conversationHistory: [
        ...(context.conversationHistory || []),
        ...(updates.conversationHistory || [])
      ],
      urlAnalysis: [
        ...(context.urlAnalysis || []),
        ...(updates.urlAnalysis || [])
      ],
      attachmentAnalysis: [
        ...(context.attachmentAnalysis || []),
        ...(updates.attachmentAnalysis || [])
      ]
    };
  }

  /**
   * Extract and validate URLs from message content
   */
  extractUrls(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>[\]{}|\\^`]+/gi;
    const urls = content.match(urlRegex) || [];
    
    return urls.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Get context window information
   */
  getContextWindowInfo(): ContextWindow {
    return { ...this.contextWindow };
  }

  /**
   * Get optimization settings
   */
  getOptimizationSettings(): ContextOptimization {
    return { ...this.optimization };
  }
}

export const contextManager = ContextManager.getInstance(); 