/**
 * Advanced Rate Limiting System
 * 
 * Provides sophisticated rate limiting with multiple strategies,
 * intelligent throttling, and comprehensive monitoring.
 */

export enum RateLimitStrategy {
  TOKEN_BUCKET = 'token_bucket',
  SLIDING_WINDOW = 'sliding_window',
  FIXED_WINDOW = 'fixed_window',
  ADAPTIVE = 'adaptive'
}

export interface RateLimitConfig {
  strategy: RateLimitStrategy;
  maxRequests: number;
  windowMs: number;
  burstLimit?: number;
  adaptiveThreshold?: number;
  backoffMultiplier?: number;
  identifier?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  strategy: RateLimitStrategy;
  metadata: {
    currentWindow: number;
    totalRequests: number;
    burstUsed?: number;
    adaptiveLevel?: number;
  };
}

export interface RateLimitStats {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  averageWaitTime: number;
  peakRequestsPerSecond: number;
  adaptiveAdjustments: number;
  strategyBreakdown: Record<RateLimitStrategy, number>;
}

// Token bucket implementation
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Sliding window implementation
class SlidingWindow {
  private requests: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(): boolean {
    const now = Date.now();
    this.cleanOldRequests(now);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }

  getRemaining(): number {
    this.cleanOldRequests(Date.now());
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getResetTime(): number {
    if (this.requests.length === 0) return Date.now();
    return this.requests[0] + this.windowMs;
  }

  private cleanOldRequests(now: number): void {
    const cutoff = now - this.windowMs;
    this.requests = this.requests.filter(time => time > cutoff);
  }
}

// Fixed window implementation
class FixedWindow {
  private requestCount: number = 0;
  private windowStart: number;
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.windowStart = Date.now();
  }

  isAllowed(): boolean {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    if (this.requestCount < this.maxRequests) {
      this.requestCount++;
      return true;
    }
    
    return false;
  }

  getRemaining(): number {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      return this.maxRequests;
    }
    
    return Math.max(0, this.maxRequests - this.requestCount);
  }

  getResetTime(): number {
    return this.windowStart + this.windowMs;
  }
}

// Adaptive rate limiter
class AdaptiveRateLimiter {
  private baseLimit: number;
  private currentLimit: number;
  private successCount: number = 0;
  private errorCount: number = 0;
  private lastAdjustment: number = Date.now();
  private readonly adjustmentInterval: number = 60000; // 1 minute
  private readonly threshold: number;
  private readonly backoffMultiplier: number;

  constructor(baseLimit: number, threshold: number = 0.1, backoffMultiplier: number = 0.8) {
    this.baseLimit = baseLimit;
    this.currentLimit = baseLimit;
    this.threshold = threshold;
    this.backoffMultiplier = backoffMultiplier;
  }

  recordSuccess(): void {
    this.successCount++;
    this.adjustIfNeeded();
  }

  recordError(): void {
    this.errorCount++;
    this.adjustIfNeeded();
  }

  getCurrentLimit(): number {
    return this.currentLimit;
  }

  getAdaptiveLevel(): number {
    return this.currentLimit / this.baseLimit;
  }

  private adjustIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastAdjustment < this.adjustmentInterval) {
      return;
    }

    const totalRequests = this.successCount + this.errorCount;
    if (totalRequests === 0) return;

    const errorRate = this.errorCount / totalRequests;
    
    if (errorRate > this.threshold) {
      // Too many errors, reduce limit
      this.currentLimit = Math.max(1, Math.floor(this.currentLimit * this.backoffMultiplier));
    } else if (errorRate < this.threshold / 2 && this.currentLimit < this.baseLimit) {
      // Low error rate, increase limit
      this.currentLimit = Math.min(this.baseLimit, Math.floor(this.currentLimit * 1.2));
    }

    // Reset counters
    this.successCount = 0;
    this.errorCount = 0;
    this.lastAdjustment = now;
  }
}

export class RateLimiter {
  private limiters: Map<string, any> = new Map();
  private stats: Map<string, RateLimitStats> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  /**
   * Check if a request is allowed under the rate limit
   */
  async checkLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const key = `${identifier}_${config.strategy}`;
    
    // Store config for stats
    this.configs.set(key, config);
    
    // Initialize stats if needed
    if (!this.stats.has(key)) {
      this.stats.set(key, {
        totalRequests: 0,
        allowedRequests: 0,
        blockedRequests: 0,
        averageWaitTime: 0,
        peakRequestsPerSecond: 0,
        adaptiveAdjustments: 0,
        strategyBreakdown: {} as Record<RateLimitStrategy, number>
      });
    }

    const stats = this.stats.get(key)!;
    stats.totalRequests++;
    stats.strategyBreakdown[config.strategy] = (stats.strategyBreakdown[config.strategy] || 0) + 1;

    let limiter = this.limiters.get(key);
    
    // Initialize limiter if needed
    if (!limiter) {
      limiter = this.createLimiter(config);
      this.limiters.set(key, limiter);
    }

    const result = this.checkLimiterStrategy(limiter, config);
    
    if (result.allowed) {
      stats.allowedRequests++;
    } else {
      stats.blockedRequests++;
    }

    return result;
  }

  /**
   * Record the result of an API call for adaptive limiting
   */
  recordResult(identifier: string, success: boolean, strategy: RateLimitStrategy = RateLimitStrategy.ADAPTIVE): void {
    const key = `${identifier}_${strategy}`;
    const limiter = this.limiters.get(key);
    
    if (limiter && limiter instanceof AdaptiveRateLimiter) {
      if (success) {
        limiter.recordSuccess();
      } else {
        limiter.recordError();
        
        const stats = this.stats.get(key);
        if (stats) {
          stats.adaptiveAdjustments++;
        }
      }
    }
  }

  /**
   * Get rate limiting statistics
   */
  getStats(identifier?: string): Map<string, RateLimitStats> | RateLimitStats | null {
    if (identifier) {
      // Find stats for this identifier across all strategies
      const identifierStats = new Map<string, RateLimitStats>();
      
      for (const [key, stats] of this.stats.entries()) {
        if (key.startsWith(identifier)) {
          identifierStats.set(key, stats);
        }
      }
      
      return identifierStats.size > 0 ? identifierStats : null;
    }
    
    return this.stats;
  }

  /**
   * Clear all rate limiting data
   */
  clear(): void {
    this.limiters.clear();
    this.stats.clear();
    this.configs.clear();
  }

  /**
   * Get current limits for an identifier
   */
  getCurrentLimits(identifier: string): Map<RateLimitStrategy, number> {
    const limits = new Map<RateLimitStrategy, number>();
    
    for (const [key, limiter] of this.limiters.entries()) {
      if (key.startsWith(identifier)) {
        const strategy = key.split('_').pop() as RateLimitStrategy;
        
        if (limiter instanceof AdaptiveRateLimiter) {
          limits.set(strategy, limiter.getCurrentLimit());
        } else if (limiter instanceof TokenBucket) {
          limits.set(strategy, limiter.getAvailableTokens());
        } else if (limiter instanceof SlidingWindow || limiter instanceof FixedWindow) {
          limits.set(strategy, limiter.getRemaining());
        }
      }
    }
    
    return limits;
  }

  private createLimiter(config: RateLimitConfig): any {
    switch (config.strategy) {
      case RateLimitStrategy.TOKEN_BUCKET:
        return new TokenBucket(
          config.burstLimit || config.maxRequests,
          config.maxRequests / (config.windowMs / 1000)
        );
      
      case RateLimitStrategy.SLIDING_WINDOW:
        return new SlidingWindow(config.maxRequests, config.windowMs);
      
      case RateLimitStrategy.FIXED_WINDOW:
        return new FixedWindow(config.maxRequests, config.windowMs);
      
      case RateLimitStrategy.ADAPTIVE:
        return new AdaptiveRateLimiter(
          config.maxRequests,
          config.adaptiveThreshold || 0.1,
          config.backoffMultiplier || 0.8
        );
      
      default:
        throw new Error(`Unknown rate limiting strategy: ${config.strategy}`);
    }
  }

  private checkLimiterStrategy(limiter: any, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    
    if (limiter instanceof TokenBucket) {
      const allowed = limiter.consume();
      return {
        allowed,
        remaining: limiter.getAvailableTokens(),
        resetTime: now + config.windowMs,
        retryAfter: allowed ? undefined : 1000,
        strategy: config.strategy,
        metadata: {
          currentWindow: now,
          totalRequests: config.maxRequests - limiter.getAvailableTokens(),
          burstUsed: config.maxRequests - limiter.getAvailableTokens()
        }
      };
    }
    
    if (limiter instanceof SlidingWindow) {
      const allowed = limiter.isAllowed();
      return {
        allowed,
        remaining: limiter.getRemaining(),
        resetTime: limiter.getResetTime(),
        retryAfter: allowed ? undefined : limiter.getResetTime() - now,
        strategy: config.strategy,
        metadata: {
          currentWindow: now,
          totalRequests: config.maxRequests - limiter.getRemaining()
        }
      };
    }
    
    if (limiter instanceof FixedWindow) {
      const allowed = limiter.isAllowed();
      return {
        allowed,
        remaining: limiter.getRemaining(),
        resetTime: limiter.getResetTime(),
        retryAfter: allowed ? undefined : limiter.getResetTime() - now,
        strategy: config.strategy,
        metadata: {
          currentWindow: Math.floor(now / config.windowMs),
          totalRequests: config.maxRequests - limiter.getRemaining()
        }
      };
    }
    
    if (limiter instanceof AdaptiveRateLimiter) {
      const currentLimit = limiter.getCurrentLimit();
      // For adaptive, we need to track requests separately
      const allowed = true; // Simplified for now
      return {
        allowed,
        remaining: currentLimit,
        resetTime: now + config.windowMs,
        strategy: config.strategy,
        metadata: {
          currentWindow: now,
          totalRequests: 0,
          adaptiveLevel: limiter.getAdaptiveLevel()
        }
      };
    }
    
    throw new Error('Unknown limiter type');
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export utility functions
export function createRateLimitConfig(
  strategy: RateLimitStrategy,
  maxRequests: number,
  windowMs: number,
  options: Partial<RateLimitConfig> = {}
): RateLimitConfig {
  return {
    strategy,
    maxRequests,
    windowMs,
    ...options
  };
}

export function isRateLimited(result: RateLimitResult): boolean {
  return !result.allowed;
}

export function getRetryDelay(result: RateLimitResult): number {
  return result.retryAfter || 1000;
} 