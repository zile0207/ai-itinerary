import axios, { AxiosInstance, AxiosError } from 'axios';
import { withRetry, classifyError, ErrorType, FallbackStrategy } from './error-handler';
import { rateLimiter, RateLimitStrategy, createRateLimitConfig } from './rate-limiter';
import { cacheManager, CacheStrategy, CacheBackend, createCacheConfig } from './cache-manager';

// Types for Perplexity API
export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  return_citations?: boolean;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: 'month' | 'week' | 'day' | 'hour';
  top_k?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface PerplexityResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
  related_questions?: string[];
}

export interface PerplexityError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

// Rate limiting interface
interface RateLimitInfo {
  requests: number;
  resetTime: number;
  maxRequests: number;
}

// Cache interface
interface CacheEntry {
  data: PerplexityResponse;
  timestamp: number;
  ttl: number;
}

class PerplexityService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL = 'https://api.perplexity.ai';
  private rateLimit: RateLimitInfo;
  private cache: Map<string, CacheEntry>;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_REQUESTS_PER_MINUTE = 20; // Adjust based on your plan

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PERPLEXITY_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Perplexity API key is required. Set PERPLEXITY_API_KEY environment variable.');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds timeout
    });

    this.rateLimit = {
      requests: 0,
      resetTime: Date.now() + 60000,
      maxRequests: this.MAX_REQUESTS_PER_MINUTE,
    };

    this.cache = new Map();

    // Initialize advanced cache manager
    cacheManager.configure('perplexity', createCacheConfig(
      CacheStrategy.LRU,
      CacheBackend.MEMORY,
      100, // max 100 cached responses
      30 * 60 * 1000, // 30 minutes TTL
      { persistToDisk: false }
    ));

    // Set up request interceptor for rate limiting
    this.client.interceptors.request.use(
      (config) => {
        this.checkRateLimit();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Set up response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        this.updateRateLimit();
        return response;
      },
      (error: AxiosError<PerplexityError>) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private checkRateLimit(): void {
    const now = Date.now();
    
    // Reset rate limit if time window has passed
    if (now >= this.rateLimit.resetTime) {
      this.rateLimit.requests = 0;
      this.rateLimit.resetTime = now + 60000;
    }

    // Check if rate limit exceeded
    if (this.rateLimit.requests >= this.rateLimit.maxRequests) {
      const waitTime = this.rateLimit.resetTime - now;
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
  }

  private updateRateLimit(): void {
    this.rateLimit.requests++;
  }

  private handleApiError(error: AxiosError<PerplexityError>): void {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      console.error('Perplexity API Error:', {
        message: apiError.message,
        type: apiError.type,
        code: apiError.code,
        status: error.response.status,
      });
    } else {
      console.error('Network Error:', error.message);
    }
  }

  private generateCacheKey(request: PerplexityRequest): string {
    // Create a cache key based on the request content
    const keyData = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private getCachedResponse(cacheKey: string): PerplexityResponse | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  private setCachedResponse(cacheKey: string, response: PerplexityResponse): void {
    this.cache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    });

    // Clean up old cache entries (simple LRU-like behavior)
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  async query(request: PerplexityRequest): Promise<PerplexityResponse> {
    const cacheKey = this.generateCacheKey(request);
    
    // Check advanced cache first
    const cacheResult = await cacheManager.get<PerplexityResponse>('perplexity', cacheKey);
    if (cacheResult.hit && cacheResult.value) {
      console.log('Returning cached response from advanced cache');
      return cacheResult.value;
    }

    // Check rate limiting
    const rateLimitConfig = createRateLimitConfig(
      RateLimitStrategy.SLIDING_WINDOW,
      this.MAX_REQUESTS_PER_MINUTE,
      60000, // 1 minute window
      { burstLimit: 5 }
    );
    
    const rateLimitResult = await rateLimiter.checkLimit('perplexity', rateLimitConfig);
    
    if (!rateLimitResult.allowed) {
      const waitTime = rateLimitResult.retryAfter || 1000;
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before retrying.`);
    }

    // Use retry logic for the API call
    const retryResult = await withRetry(
      async () => {
        try {
          const response = await this.client.post<PerplexityResponse>('/chat/completions', request);
          
          // Cache the response on success using advanced cache
          await cacheManager.set('perplexity', cacheKey, response.data, {
            ttl: this.CACHE_TTL,
            metadata: {
              model: request.model,
              timestamp: Date.now(),
              tokenUsage: response.data.usage
            }
          });
          
          // Record successful API call for adaptive rate limiting
          rateLimiter.recordResult('perplexity', true, RateLimitStrategy.ADAPTIVE);
          
          return response.data;
        } catch (error) {
          // Record failed API call for adaptive rate limiting
          rateLimiter.recordResult('perplexity', false, RateLimitStrategy.ADAPTIVE);
          
          if (error instanceof AxiosError) {
            // Enhance error with context for better classification
            const enhancedError = new Error(error.message);
            const context = {
              statusCode: error.response?.status,
              endpoint: '/chat/completions'
            };
            
            // Classify and re-throw with enhanced information
            const classified = classifyError(enhancedError, context);
            const newError = new Error(classified.message);
            (newError as any).statusCode = context.statusCode;
            (newError as any).errorType = classified.type;
            throw newError;
          }
          throw error;
        }
      },
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        retryableErrors: [ErrorType.NETWORK_ERROR, ErrorType.RATE_LIMIT, ErrorType.TIMEOUT, ErrorType.SERVICE_UNAVAILABLE]
      },
      `perplexity_query_${cacheKey.substring(0, 8)}`
    );

    if (retryResult.success && retryResult.data) {
      return retryResult.data;
    } else {
      // If retry failed, throw the classified error
      const error = retryResult.error || {
        type: ErrorType.UNKNOWN,
        message: 'Unknown error occurred',
        severity: 'high' as const,
        originalError: new Error('Unknown error'),
        retryable: false,
        suggestedAction: 'Contact support',
        metadata: { timestamp: new Date().toISOString() }
      };
      
      throw new Error(`${error.message} (${error.suggestedAction})`);
    }
  }

  async generateItinerary(prompt: string, options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    includeCitations?: boolean;
    searchRecency?: 'month' | 'week' | 'day' | 'hour';
  } = {}): Promise<PerplexityResponse> {
    const {
      model = 'llama-3.1-sonar-small-128k-online',
      temperature = 0.7,
      maxTokens = 4000,
      includeCitations = true,
      searchRecency = 'week',
    } = options;

    const request: PerplexityRequest = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional travel planner with access to current travel information. Create detailed, practical itineraries with up-to-date information about destinations, activities, costs, and travel conditions. Always provide specific recommendations with current pricing when possible.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature,
      return_citations: includeCitations,
      search_recency_filter: searchRecency,
      return_related_questions: true,
    };

    return this.query(request);
  }

  async analyzeContent(content: string, contentType: 'url' | 'text'): Promise<PerplexityResponse> {
    const prompt = contentType === 'url' 
      ? `Analyze this travel-related URL and extract key travel preferences, destinations, activities, and insights: ${content}`
      : `Analyze this travel content and extract key travel preferences, destinations, activities, and insights: ${content}`;

    const request: PerplexityRequest = {
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are a travel content analyzer. Extract travel preferences, destinations, activities, budget information, and other relevant travel insights from the provided content.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      return_citations: true,
    };

    return this.query(request);
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.query({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a health check. Please respond with "OK".',
          },
        ],
        max_tokens: 10,
        temperature: 0,
      });

      return response.choices[0]?.message?.content?.includes('OK') || false;
    } catch (error) {
      console.error('Perplexity health check failed:', error);
      return false;
    }
  }

  // Get rate limit status
  getRateLimitStatus(): RateLimitInfo {
    return { ...this.rateLimit };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 100,
    };
  }
}

// Export singleton instance
export const perplexityService = new PerplexityService();

// Export class for testing
export { PerplexityService }; 