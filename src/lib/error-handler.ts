/**
 * Error Handling and Retry Logic System
 * 
 * Provides comprehensive error management, intelligent retry mechanisms,
 * and fallback strategies for AI API interactions.
 */

import { parseItinerary } from './response-parser';
import { GeneratedItinerary } from '@/app/api/generate-itinerary/route';

// Error classification types
export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  RATE_LIMIT = 'rate_limit',
  AUTHENTICATION = 'authentication',
  PARSING_ERROR = 'parsing_error',
  VALIDATION_ERROR = 'validation_error',
  TIMEOUT = 'timeout',
  QUOTA_EXCEEDED = 'quota_exceeded',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ClassifiedError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError: Error;
  retryable: boolean;
  suggestedAction: string;
  metadata: {
    statusCode?: number;
    retryAfter?: number;
    quotaReset?: number;
    endpoint?: string;
    timestamp: string;
  };
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryableErrors: ErrorType[];
  timeoutMs: number;
}

// Fallback strategy types
export enum FallbackStrategy {
  CACHED_RESPONSE = 'cached_response',
  SIMPLIFIED_PROMPT = 'simplified_prompt',
  ALTERNATIVE_MODEL = 'alternative_model',
  BASIC_TEMPLATE = 'basic_template',
  USER_NOTIFICATION = 'user_notification'
}

export interface FallbackResult {
  strategy: FallbackStrategy;
  success: boolean;
  data?: GeneratedItinerary;
  message: string;
  confidence: number;
}

// Retry attempt tracking
export interface RetryAttempt {
  attemptNumber: number;
  timestamp: string;
  error: ClassifiedError;
  delayMs: number;
  strategy: string;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: ClassifiedError;
  attempts: RetryAttempt[];
  totalTimeMs: number;
  fallbackUsed?: FallbackResult;
}

export class ErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 500,
    retryableErrors: [
      ErrorType.NETWORK_ERROR,
      ErrorType.RATE_LIMIT,
      ErrorType.TIMEOUT,
      ErrorType.SERVICE_UNAVAILABLE
    ],
    timeoutMs: 30000
  };

  private static retryHistory: Map<string, RetryAttempt[]> = new Map();
  private static fallbackCache: Map<string, GeneratedItinerary> = new Map();

  /**
   * Classify an error based on its characteristics
   */
  static classifyError(error: Error, context?: { statusCode?: number; endpoint?: string }): ClassifiedError {
    const statusCode = context?.statusCode;
    const endpoint = context?.endpoint;
    
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;
    let suggestedAction = 'Contact support if the issue persists';
    let retryAfter: number | undefined;
    let quotaReset: number | undefined;

    // Classify based on error message and status code
    const errorMessage = error.message.toLowerCase();

    if (statusCode) {
      switch (statusCode) {
        case 401:
        case 403:
          type = ErrorType.AUTHENTICATION;
          severity = ErrorSeverity.HIGH;
          retryable = false;
          suggestedAction = 'Check API key configuration';
          break;

        case 429:
          type = ErrorType.RATE_LIMIT;
          severity = ErrorSeverity.MEDIUM;
          retryable = true;
          suggestedAction = 'Wait before retrying';
          // Extract retry-after header if available
          retryAfter = this.extractRetryAfter(error);
          break;

        case 402:
          type = ErrorType.QUOTA_EXCEEDED;
          severity = ErrorSeverity.HIGH;
          retryable = false;
          suggestedAction = 'Check billing and quota limits';
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          type = ErrorType.SERVICE_UNAVAILABLE;
          severity = ErrorSeverity.HIGH;
          retryable = true;
          suggestedAction = 'Service temporarily unavailable, retry later';
          break;

        case 408:
          type = ErrorType.TIMEOUT;
          severity = ErrorSeverity.MEDIUM;
          retryable = true;
          suggestedAction = 'Request timed out, retry with shorter content';
          break;

        default:
          if (statusCode >= 400 && statusCode < 500) {
            type = ErrorType.API_ERROR;
            severity = ErrorSeverity.MEDIUM;
            retryable = false;
            suggestedAction = 'Check request parameters';
          } else if (statusCode >= 500) {
            type = ErrorType.SERVICE_UNAVAILABLE;
            severity = ErrorSeverity.HIGH;
            retryable = true;
            suggestedAction = 'Server error, retry later';
          }
      }
    } else {
      // Classify based on error message
      if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        type = ErrorType.NETWORK_ERROR;
        severity = ErrorSeverity.MEDIUM;
        retryable = true;
        suggestedAction = 'Check network connection';
      } else if (errorMessage.includes('timeout')) {
        type = ErrorType.TIMEOUT;
        severity = ErrorSeverity.MEDIUM;
        retryable = true;
        suggestedAction = 'Request timed out, retry with shorter content';
      } else if (errorMessage.includes('parse') || errorMessage.includes('json')) {
        type = ErrorType.PARSING_ERROR;
        severity = ErrorSeverity.LOW;
        retryable = true;
        suggestedAction = 'Response format issue, retry may resolve';
      } else if (errorMessage.includes('validation')) {
        type = ErrorType.VALIDATION_ERROR;
        severity = ErrorSeverity.LOW;
        retryable = false;
        suggestedAction = 'Check input data format';
      }
    }

    return {
      type,
      severity,
      message: error.message,
      originalError: error,
      retryable,
      suggestedAction,
      metadata: {
        statusCode,
        retryAfter,
        quotaReset,
        endpoint,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Execute a function with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    operationId?: string
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    const attempts: RetryAttempt[] = [];
    const startTime = performance.now();
    const id = operationId || `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        // Set timeout for the operation
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), finalConfig.timeoutMs);
        });

        const result = await Promise.race([operation(), timeoutPromise]);
        
        const totalTime = performance.now() - startTime;
        
        // Success - clear any previous retry history
        this.retryHistory.delete(id);
        
        return {
          success: true,
          data: result,
          attempts,
          totalTimeMs: totalTime
        };

      } catch (error) {
        const classifiedError = this.classifyError(error as Error);
        
        const attemptRecord: RetryAttempt = {
          attemptNumber: attempt,
          timestamp: new Date().toISOString(),
          error: classifiedError,
          delayMs: 0,
          strategy: 'exponential_backoff'
        };

        attempts.push(attemptRecord);

        // Check if we should retry
        if (attempt === finalConfig.maxAttempts || !classifiedError.retryable || 
            !finalConfig.retryableErrors.includes(classifiedError.type)) {
          
          const totalTime = performance.now() - startTime;
          
          // Store retry history
          this.retryHistory.set(id, attempts);
          
          return {
            success: false,
            error: classifiedError,
            attempts,
            totalTimeMs: totalTime
          };
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, finalConfig, classifiedError);
        attemptRecord.delayMs = delay;

        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, classifiedError.message);
        
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    const totalTime = performance.now() - startTime;
    return {
      success: false,
      error: {
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.CRITICAL,
        message: 'Unexpected retry loop exit',
        originalError: new Error('Unexpected retry loop exit'),
        retryable: false,
        suggestedAction: 'Contact support',
        metadata: { timestamp: new Date().toISOString() }
      },
      attempts,
      totalTimeMs: totalTime
    };
  }

  /**
   * Execute operation with retry and fallback strategies
   */
  static async withRetryAndFallback<T>(
    operation: () => Promise<T>,
    fallbackStrategies: FallbackStrategy[],
    config: Partial<RetryConfig> = {},
    operationId?: string
  ): Promise<RetryResult<T>> {
    // First try with retry logic
    const retryResult = await this.withRetry(operation, config, operationId);
    
    if (retryResult.success) {
      return retryResult;
    }

    // If retry failed, try fallback strategies
    console.warn('Primary operation failed, attempting fallback strategies:', retryResult.error?.message);
    
    for (const strategy of fallbackStrategies) {
      try {
        const fallbackResult = await this.executeFallbackStrategy(strategy, retryResult.error!);
        
        if (fallbackResult.success && fallbackResult.data) {
          return {
            ...retryResult,
            success: true,
            data: fallbackResult.data as T,
            fallbackUsed: fallbackResult
          };
        }
      } catch (fallbackError) {
        console.warn(`Fallback strategy ${strategy} failed:`, fallbackError);
        continue;
      }
    }

    // All strategies failed
    return retryResult;
  }

  /**
   * Execute a specific fallback strategy
   */
  private static async executeFallbackStrategy(
    strategy: FallbackStrategy,
    originalError: ClassifiedError
  ): Promise<FallbackResult> {
    switch (strategy) {
      case FallbackStrategy.CACHED_RESPONSE:
        return this.tryGetCachedResponse(originalError);
      
      case FallbackStrategy.BASIC_TEMPLATE:
        return this.generateBasicTemplate(originalError);
      
      case FallbackStrategy.USER_NOTIFICATION:
        return this.createUserNotification(originalError);
      
      default:
        return {
          strategy,
          success: false,
          message: `Fallback strategy ${strategy} not implemented`,
          confidence: 0
        };
    }
  }

  /**
   * Try to get a cached response
   */
  private static async tryGetCachedResponse(error: ClassifiedError): Promise<FallbackResult> {
    // Simple cache lookup - in production, this would be more sophisticated
    const cachedKeys = Array.from(this.fallbackCache.keys());
    
    if (cachedKeys.length > 0) {
      const randomKey = cachedKeys[Math.floor(Math.random() * cachedKeys.length)];
      const cachedData = this.fallbackCache.get(randomKey);
      
      if (cachedData) {
        return {
          strategy: FallbackStrategy.CACHED_RESPONSE,
          success: true,
          data: {
            ...cachedData,
            id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: `${cachedData.title} (Cached Response)`,
                       metadata: {
             ...cachedData.metadata,
             generatedAt: new Date().toISOString()
           } as any
          },
          message: 'Using cached response due to service unavailability',
          confidence: 0.6
        };
      }
    }

    return {
      strategy: FallbackStrategy.CACHED_RESPONSE,
      success: false,
      message: 'No cached responses available',
      confidence: 0
    };
  }

  /**
   * Generate a basic template response
   */
  private static async generateBasicTemplate(error: ClassifiedError): Promise<FallbackResult> {
    const basicItinerary: GeneratedItinerary = {
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'Basic Travel Itinerary',
      destination: 'Your Destination',
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
      days: [
        {
          day: 1,
          date: new Date().toISOString().split('T')[0],
          title: 'Arrival Day',
          activities: [
            {
              id: `fallback_activity_${Date.now()}`,
              time: '14:00',
              title: 'Arrive at destination',
              description: 'Check into accommodation and get oriented',
              location: { name: 'City center' },
              duration: 120,
              cost: { amount: 0, currency: 'USD' },
              category: 'other',
              bookingRequired: false
            }
          ],
          totalCost: 0
        }
      ],
      travelers: {
        adults: 2,
        children: 0,
        infants: 0
      },
             metadata: {
         generatedAt: new Date().toISOString(),
         model: 'fallback-template',
         citations: []
       } as any
    };

    return {
      strategy: FallbackStrategy.BASIC_TEMPLATE,
      success: true,
      data: basicItinerary,
      message: 'Generated basic template due to service issues',
      confidence: 0.3
    };
  }

  /**
   * Create a user notification response
   */
  private static async createUserNotification(error: ClassifiedError): Promise<FallbackResult> {
    return {
      strategy: FallbackStrategy.USER_NOTIFICATION,
      success: false,
      message: `Service temporarily unavailable: ${error.message}. ${error.suggestedAction}`,
      confidence: 0
    };
  }

  /**
   * Calculate delay for retry attempts
   */
  private static calculateDelay(
    attempt: number,
    config: RetryConfig,
    error: ClassifiedError
  ): number {
    let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Add jitter to prevent thundering herd
    delay += Math.random() * config.jitterMs;
    
    // Respect rate limit retry-after header
    if (error.type === ErrorType.RATE_LIMIT && error.metadata.retryAfter) {
      delay = Math.max(delay, error.metadata.retryAfter * 1000);
    }
    
    // Cap at maximum delay
    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Extract retry-after value from error
   */
  private static extractRetryAfter(error: Error): number | undefined {
    // This would extract from actual HTTP headers in a real implementation
    const match = error.message.match(/retry.*?(\d+)/i);
    return match ? parseInt(match[1]) : undefined;
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics for monitoring
   */
  static getRetryStatistics(timeRangeHours: number = 24): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageAttempts: number;
    errorBreakdown: Record<ErrorType, number>;
    fallbackUsage: Record<FallbackStrategy, number>;
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentAttempts = Array.from(this.retryHistory.values())
      .flat()
      .filter(attempt => new Date(attempt.timestamp) > cutoffTime);

    const errorBreakdown: Record<ErrorType, number> = {} as any;
    const fallbackUsage: Record<FallbackStrategy, number> = {} as any;

    recentAttempts.forEach(attempt => {
      errorBreakdown[attempt.error.type] = (errorBreakdown[attempt.error.type] || 0) + 1;
    });

    const totalOperations = this.retryHistory.size;
    const failedOperations = recentAttempts.length;
    const successfulOperations = Math.max(0, totalOperations - failedOperations);
    const averageAttempts = recentAttempts.length > 0 ? 
      recentAttempts.reduce((sum, attempt) => sum + attempt.attemptNumber, 0) / recentAttempts.length : 0;

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageAttempts,
      errorBreakdown,
      fallbackUsage
    };
  }

  /**
   * Clear retry history (for testing or memory management)
   */
  static clearHistory(): void {
    this.retryHistory.clear();
    this.fallbackCache.clear();
  }

  /**
   * Add a response to the fallback cache
   */
  static cacheResponse(key: string, response: GeneratedItinerary): void {
    this.fallbackCache.set(key, response);
    
    // Keep cache size manageable
    if (this.fallbackCache.size > 100) {
           const firstKey = this.fallbackCache.keys().next().value;
     if (firstKey) {
       this.fallbackCache.delete(firstKey);
     }
    }
  }
}

// Export utility functions
export const withRetry = ErrorHandler.withRetry.bind(ErrorHandler);
export const withRetryAndFallback = ErrorHandler.withRetryAndFallback.bind(ErrorHandler);
export const classifyError = ErrorHandler.classifyError.bind(ErrorHandler); 