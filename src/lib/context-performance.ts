/**
 * Context Performance Monitoring
 * 
 * Tracks and analyzes context formatting performance metrics
 * to optimize token usage and improve AI response quality.
 */

import { FormattedContext, ContextSegment, ContextType } from './context-formatter';

export interface ContextPerformanceMetrics {
  timestamp: string;
  requestId: string;
  originalTokenCount: number;
  finalTokenCount: number;
  compressionRatio: number;
  truncated: boolean;
  segmentsIncluded: number;
  segmentsOmitted: number;
  warnings: string[];
  processingTimeMs: number;
  segmentBreakdown: Record<ContextType, number>;
  tokenSavings: number;
  efficiency: number; // 0-1 score based on token usage vs content retention
}

export interface ContextOptimizationSuggestion {
  type: 'token_limit' | 'content_priority' | 'truncation_strategy' | 'validation_level';
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
  estimatedTokenSavings?: number;
}

export class ContextPerformanceMonitor {
  private static metrics: ContextPerformanceMetrics[] = [];
  private static readonly MAX_METRICS_HISTORY = 1000;

  /**
   * Record performance metrics for a context formatting operation
   */
  static recordMetrics(
    requestId: string,
    formattedContext: FormattedContext,
    processingTimeMs: number
  ): ContextPerformanceMetrics {
    const segmentBreakdown = formattedContext.segments.reduce((acc, segment) => {
      acc[segment.type] = (acc[segment.type] || 0) + (segment.tokenCount || 0);
      return acc;
    }, {} as Record<ContextType, number>);

    const tokenSavings = formattedContext.metadata.originalTokenCount - formattedContext.tokenCount;
    const efficiency = this.calculateEfficiency(formattedContext);

    const metrics: ContextPerformanceMetrics = {
      timestamp: new Date().toISOString(),
      requestId,
      originalTokenCount: formattedContext.metadata.originalTokenCount,
      finalTokenCount: formattedContext.tokenCount,
      compressionRatio: formattedContext.metadata.compressionRatio,
      truncated: formattedContext.truncated,
      segmentsIncluded: formattedContext.metadata.segmentsIncluded,
      segmentsOmitted: formattedContext.metadata.segmentsOmitted,
      warnings: formattedContext.warnings,
      processingTimeMs,
      segmentBreakdown,
      tokenSavings,
      efficiency
    };

    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }

    return metrics;
  }

  /**
   * Calculate efficiency score based on token usage vs content retention
   */
  private static calculateEfficiency(formattedContext: FormattedContext): number {
    const { compressionRatio, segmentsIncluded, segmentsOmitted } = formattedContext.metadata;
    
    // Base efficiency on compression ratio and content retention
    const compressionScore = Math.min(1, compressionRatio); // Lower is better for compression
    const retentionScore = segmentsIncluded / (segmentsIncluded + segmentsOmitted);
    
    // Weight retention more heavily than compression
    return (retentionScore * 0.7) + ((1 - compressionScore) * 0.3);
  }

  /**
   * Analyze context and provide optimization suggestions
   */
  static analyzeContext(formattedContext: FormattedContext): ContextOptimizationSuggestion[] {
    const suggestions: ContextOptimizationSuggestion[] = [];

    // Check for excessive token usage
    if (formattedContext.tokenCount > 3000) {
      suggestions.push({
        type: 'token_limit',
        severity: 'high',
        message: 'Context is using a high number of tokens',
        recommendation: 'Consider reducing maxTokens limit or using more aggressive truncation',
        estimatedTokenSavings: Math.floor(formattedContext.tokenCount * 0.2)
      });
    }

    // Check for truncation issues
    if (formattedContext.truncated && formattedContext.metadata.segmentsOmitted > 3) {
      suggestions.push({
        type: 'content_priority',
        severity: 'medium',
        message: 'Many segments were omitted during truncation',
        recommendation: 'Review content priorities or increase token limit',
        estimatedTokenSavings: 0
      });
    }

    // Check for low compression ratio
    if (formattedContext.metadata.compressionRatio > 0.9 && formattedContext.tokenCount > 2000) {
      suggestions.push({
        type: 'truncation_strategy',
        severity: 'medium',
        message: 'Low compression achieved with current strategy',
        recommendation: 'Consider using proportional truncation or smart summary',
        estimatedTokenSavings: Math.floor(formattedContext.tokenCount * 0.15)
      });
    }

    // Check for validation warnings
    if (formattedContext.warnings.length > 2) {
      suggestions.push({
        type: 'validation_level',
        severity: 'low',
        message: 'Multiple validation warnings detected',
        recommendation: 'Review content quality or adjust validation level'
      });
    }

    return suggestions;
  }

  /**
   * Get performance statistics for recent operations
   */
  static getPerformanceStats(timeRangeHours: number = 24): {
    totalRequests: number;
    averageTokenSavings: number;
    averageEfficiency: number;
    averageProcessingTime: number;
    truncationRate: number;
    topWarnings: Array<{ warning: string; count: number }>;
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => new Date(m.timestamp) > cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageTokenSavings: 0,
        averageEfficiency: 0,
        averageProcessingTime: 0,
        truncationRate: 0,
        topWarnings: []
      };
    }

    const totalRequests = recentMetrics.length;
    const averageTokenSavings = recentMetrics.reduce((sum, m) => sum + m.tokenSavings, 0) / totalRequests;
    const averageEfficiency = recentMetrics.reduce((sum, m) => sum + m.efficiency, 0) / totalRequests;
    const averageProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / totalRequests;
    const truncationRate = recentMetrics.filter(m => m.truncated).length / totalRequests;

    // Count warning frequencies
    const warningCounts = new Map<string, number>();
    recentMetrics.forEach(m => {
      m.warnings.forEach(warning => {
        warningCounts.set(warning, (warningCounts.get(warning) || 0) + 1);
      });
    });

    const topWarnings = Array.from(warningCounts.entries())
      .map(([warning, count]) => ({ warning, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRequests,
      averageTokenSavings,
      averageEfficiency,
      averageProcessingTime,
      truncationRate,
      topWarnings
    };
  }

  /**
   * Get detailed breakdown by context type
   */
  static getContextTypeBreakdown(timeRangeHours: number = 24): Record<ContextType, {
    averageTokens: number;
    frequency: number;
    totalTokens: number;
  }> {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => new Date(m.timestamp) > cutoffTime);

    const breakdown: Record<ContextType, { averageTokens: number; frequency: number; totalTokens: number }> = {} as any;

    // Initialize all context types
    Object.values(ContextType).forEach(type => {
      breakdown[type] = { averageTokens: 0, frequency: 0, totalTokens: 0 };
    });

    recentMetrics.forEach(metrics => {
      Object.entries(metrics.segmentBreakdown).forEach(([type, tokens]) => {
        const contextType = type as ContextType;
        breakdown[contextType].totalTokens += tokens;
        breakdown[contextType].frequency += 1;
      });
    });

    // Calculate averages
    Object.keys(breakdown).forEach(type => {
      const contextType = type as ContextType;
      const data = breakdown[contextType];
      data.averageTokens = data.frequency > 0 ? data.totalTokens / data.frequency : 0;
    });

    return breakdown;
  }

  /**
   * Clear metrics history (useful for testing or memory management)
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  static exportMetrics(): ContextPerformanceMetrics[] {
    return [...this.metrics];
  }
}

/**
 * Utility function to create a unique request ID
 */
export function generateRequestId(): string {
  return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware function to wrap context formatting with performance monitoring
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => FormattedContext>(
  fn: T,
  requestId?: string
): (...args: Parameters<T>) => FormattedContext & { performanceMetrics: ContextPerformanceMetrics } {
  return (...args: Parameters<T>) => {
    const id = requestId || generateRequestId();
    const startTime = performance.now();
    
    const result = fn(...args);
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    const metrics = ContextPerformanceMonitor.recordMetrics(id, result, processingTime);
    
    return {
      ...result,
      performanceMetrics: metrics
    };
  };
} 