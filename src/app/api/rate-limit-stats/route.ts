import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';
import { cacheManager } from '@/lib/cache-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get('hours') || '24');
    const action = searchParams.get('action') || 'overview';

    switch (action) {
      case 'overview':
        const rateLimitStats = rateLimiter.getStats('perplexity');
        const cacheStats = cacheManager.getStatistics('perplexity');
        const currentLimits = rateLimiter.getCurrentLimits('perplexity');

        return NextResponse.json({
          success: true,
          timeRangeHours: timeRange,
          rateLimiting: {
            stats: rateLimitStats,
            currentLimits: Object.fromEntries(currentLimits),
            summary: {
              totalRequests: rateLimitStats ? (rateLimitStats as any).totalRequests : 0,
              allowedRequests: rateLimitStats ? (rateLimitStats as any).allowedRequests : 0,
              blockedRequests: rateLimitStats ? (rateLimitStats as any).blockedRequests : 0,
              blockRate: rateLimitStats ? 
                ((rateLimitStats as any).blockedRequests / Math.max(1, (rateLimitStats as any).totalRequests)) * 100 : 0
            }
          },
          caching: {
            stats: cacheStats,
            summary: {
              totalEntries: cacheStats ? (cacheStats as any).totalEntries : 0,
              hitRate: cacheStats ? ((cacheStats as any).hitRate * 100) : 0,
              totalSize: cacheStats ? (cacheStats as any).totalSize : 0,
              averageAccessTime: cacheStats ? (cacheStats as any).averageAccessTime : 0
            }
          }
        });

      case 'rate-limit-details':
        const detailedRateStats = rateLimiter.getStats();
        return NextResponse.json({
          success: true,
          rateLimitStats: detailedRateStats instanceof Map ? Object.fromEntries(detailedRateStats) : detailedRateStats || {}
        });

      case 'cache-details':
        const detailedCacheStats = cacheManager.getStatistics();
        const cacheKeys = cacheManager.getKeys('perplexity');
        
        return NextResponse.json({
          success: true,
          cacheStats: detailedCacheStats instanceof Map ? Object.fromEntries(detailedCacheStats) : detailedCacheStats || {},
          cacheKeys: cacheKeys.slice(0, 20), // Limit to first 20 keys
          totalKeys: cacheKeys.length
        });

      case 'performance':
        const perfStats = {
          rateLimiting: rateLimiter.getStats('perplexity'),
          caching: cacheManager.getStatistics('perplexity'),
          recommendations: []
        };

        // Generate performance recommendations
        const recommendations: string[] = [];
        
        if (perfStats.caching && (perfStats.caching as any).hitRate < 0.5) {
          recommendations.push('Cache hit rate is below 50%. Consider increasing cache TTL or size.');
        }
        
        if (perfStats.rateLimiting && (perfStats.rateLimiting as any).blockedRequests > 0) {
          recommendations.push('Some requests are being rate limited. Consider implementing request queuing.');
        }
        
        if (perfStats.caching && (perfStats.caching as any).averageAccessTime > 10) {
          recommendations.push('Cache access time is high. Consider optimizing cache strategy.');
        }

        return NextResponse.json({
          success: true,
          performance: {
            ...perfStats,
            recommendations
          }
        });

      case 'cleanup':
        // Perform cache cleanup
        cacheManager.cleanup('perplexity');
        
        return NextResponse.json({
          success: true,
          message: 'Cache cleanup completed',
          newStats: cacheManager.getStatistics('perplexity')
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: overview, rate-limit-details, cache-details, performance, cleanup' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Rate limit stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve rate limiting and caching statistics' },
      { status: 500 }
    );
  }
} 