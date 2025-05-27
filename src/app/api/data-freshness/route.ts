/**
 * Data Freshness Validation API
 * 
 * Provides endpoints for validating data freshness, getting statistics,
 * and managing refresh recommendations for travel information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  dataFreshnessManager,
  validateItineraryFreshness,
  checkDataFreshness,
  getFreshnessStatistics,
  DataSourceType
} from '@/lib/data-freshness';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, options = {} } = body;

    switch (action) {
      case 'validate-itinerary':
        return await handleValidateItinerary(data, options);
      
      case 'validate-data':
        return await handleValidateData(data, options);
      
      case 'check-refresh-needed':
        return await handleCheckRefreshNeeded(data, options);
      
      case 'get-statistics':
        return await handleGetStatistics(data, options);
      
      case 'schedule-refresh':
        return await handleScheduleRefresh(data, options);
      
      case 'get-refresh-cost':
        return await handleGetRefreshCost(data, options);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: validate-itinerary, validate-data, check-refresh-needed, get-statistics, schedule-refresh, get-refresh-cost' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Data freshness API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate freshness of an entire itinerary
 */
async function handleValidateItinerary(data: any, options: any) {
  try {
    const { itinerary } = data;
    
    if (!itinerary || !itinerary.id) {
      return NextResponse.json(
        { error: 'Valid itinerary object with ID is required' },
        { status: 400 }
      );
    }

    const validation = validateItineraryFreshness(itinerary);

    return NextResponse.json({
      success: true,
      validation,
      metadata: {
        validatedAt: new Date().toISOString(),
        itineraryId: itinerary.id,
        componentsChecked: Object.keys(validation.byComponent).length
      }
    });
  } catch (error) {
    console.error('Validate itinerary error:', error);
    return NextResponse.json(
      { error: 'Failed to validate itinerary freshness' },
      { status: 500 }
    );
  }
}

/**
 * Validate freshness of specific data
 */
async function handleValidateData(data: any, options: any) {
  try {
    const { dataId, dataContent, sourceType = DataSourceType.PERPLEXITY_RESEARCH, citations } = data;
    
    if (!dataId || !dataContent) {
      return NextResponse.json(
        { error: 'dataId and dataContent are required' },
        { status: 400 }
      );
    }

    // Validate sourceType
    if (!Object.values(DataSourceType).includes(sourceType)) {
      return NextResponse.json(
        { error: `Invalid sourceType. Must be one of: ${Object.values(DataSourceType).join(', ')}` },
        { status: 400 }
      );
    }

    const validation = checkDataFreshness(dataId, dataContent, sourceType);

    return NextResponse.json({
      success: true,
      validation,
      metadata: {
        validatedAt: new Date().toISOString(),
        dataId,
        sourceType
      }
    });
  } catch (error) {
    console.error('Validate data error:', error);
    return NextResponse.json(
      { error: 'Failed to validate data freshness' },
      { status: 500 }
    );
  }
}

/**
 * Check if data needs refresh
 */
async function handleCheckRefreshNeeded(data: any, options: any) {
  try {
    const { dataIds } = data;
    
    if (!Array.isArray(dataIds)) {
      return NextResponse.json(
        { error: 'dataIds must be an array' },
        { status: 400 }
      );
    }

    const refreshStatus = dataIds.map(dataId => ({
      dataId,
      needsRefresh: dataFreshnessManager.needsRefresh(dataId),
      estimatedCost: dataFreshnessManager.getRefreshCostEstimate(dataId)
    }));

    const totalCost = refreshStatus.reduce((sum, status) => sum + status.estimatedCost, 0);
    const refreshNeeded = refreshStatus.filter(status => status.needsRefresh);

    return NextResponse.json({
      success: true,
      refreshStatus,
      summary: {
        totalDataSources: dataIds.length,
        needsRefresh: refreshNeeded.length,
        totalEstimatedCost: totalCost,
        refreshRecommended: refreshNeeded.length > 0
      }
    });
  } catch (error) {
    console.error('Check refresh needed error:', error);
    return NextResponse.json(
      { error: 'Failed to check refresh status' },
      { status: 500 }
    );
  }
}

/**
 * Get freshness statistics
 */
async function handleGetStatistics(data: any, options: any) {
  try {
    const statistics = getFreshnessStatistics();

    // Add additional insights
    const insights = generateFreshnessInsights(statistics);

    return NextResponse.json({
      success: true,
      statistics,
      insights,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSourcesTracked: statistics.totalSources
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    return NextResponse.json(
      { error: 'Failed to get freshness statistics' },
      { status: 500 }
    );
  }
}

/**
 * Schedule automatic refresh
 */
async function handleScheduleRefresh(data: any, options: any) {
  try {
    const { dataIds, force = false } = data;
    
    if (!Array.isArray(dataIds)) {
      return NextResponse.json(
        { error: 'dataIds must be an array' },
        { status: 400 }
      );
    }

    const refreshResults = dataIds.map(dataId => {
      const scheduled = force || dataFreshnessManager.scheduleAutoRefresh(dataId);
      const cost = dataFreshnessManager.getRefreshCostEstimate(dataId);
      
      return {
        dataId,
        scheduled,
        estimatedCost: cost,
        reason: scheduled ? 'Refresh scheduled' : 'Refresh not needed or cost threshold exceeded'
      };
    });

    const scheduledCount = refreshResults.filter(r => r.scheduled).length;
    const totalCost = refreshResults
      .filter(r => r.scheduled)
      .reduce((sum, r) => sum + r.estimatedCost, 0);

    return NextResponse.json({
      success: true,
      refreshResults,
      summary: {
        totalRequested: dataIds.length,
        scheduled: scheduledCount,
        totalCost,
        message: scheduledCount > 0 
          ? `Scheduled ${scheduledCount} refresh operations (estimated cost: $${totalCost.toFixed(3)})`
          : 'No refresh operations scheduled'
      }
    });
  } catch (error) {
    console.error('Schedule refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule refresh' },
      { status: 500 }
    );
  }
}

/**
 * Get refresh cost estimates
 */
async function handleGetRefreshCost(data: any, options: any) {
  try {
    const { dataIds, refreshType = 'partial' } = data;
    
    if (!Array.isArray(dataIds)) {
      return NextResponse.json(
        { error: 'dataIds must be an array' },
        { status: 400 }
      );
    }

    if (!['partial', 'full'].includes(refreshType)) {
      return NextResponse.json(
        { error: 'refreshType must be either "partial" or "full"' },
        { status: 400 }
      );
    }

    const costEstimates = dataIds.map(dataId => ({
      dataId,
      partialCost: dataFreshnessManager.getRefreshCostEstimate(dataId, 'partial'),
      fullCost: dataFreshnessManager.getRefreshCostEstimate(dataId, 'full'),
      recommendedType: dataFreshnessManager.needsRefresh(dataId) ? 'partial' : 'none'
    }));

    const totalPartialCost = costEstimates.reduce((sum, est) => sum + est.partialCost, 0);
    const totalFullCost = costEstimates.reduce((sum, est) => sum + est.fullCost, 0);

    return NextResponse.json({
      success: true,
      costEstimates,
      summary: {
        totalDataSources: dataIds.length,
        totalPartialCost,
        totalFullCost,
        recommendedCost: costEstimates
          .filter(est => est.recommendedType !== 'none')
          .reduce((sum, est) => sum + est.partialCost, 0),
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Get refresh cost error:', error);
    return NextResponse.json(
      { error: 'Failed to get refresh cost estimates' },
      { status: 500 }
    );
  }
}

/**
 * Helper functions
 */

function generateFreshnessInsights(statistics: any): {
  overall: string;
  recommendations: string[];
  alerts: string[];
} {
  const insights = {
    overall: '',
    recommendations: [] as string[],
    alerts: [] as string[]
  };

  // Overall assessment
  if (statistics.averageFreshness >= 0.8) {
    insights.overall = 'Excellent - Data freshness is very good across all sources';
  } else if (statistics.averageFreshness >= 0.6) {
    insights.overall = 'Good - Most data sources are reasonably fresh';
  } else if (statistics.averageFreshness >= 0.4) {
    insights.overall = 'Fair - Some data sources need attention';
  } else {
    insights.overall = 'Poor - Significant data freshness issues detected';
  }

  // Recommendations
  if (statistics.staleSources > statistics.totalSources * 0.3) {
    insights.recommendations.push('Consider implementing more frequent data refresh cycles');
  }

  if (statistics.criticalSources > 0) {
    insights.recommendations.push('Address critical data staleness issues immediately');
  }

  if (statistics.refreshCandidates.length > 0) {
    insights.recommendations.push(`${statistics.refreshCandidates.length} data sources are candidates for refresh`);
  }

  if (statistics.oldestSource.age > 72) { // 3 days
    insights.recommendations.push('Review data retention policies - some sources are very old');
  }

  // Alerts
  if (statistics.criticalSources > 0) {
    insights.alerts.push(`${statistics.criticalSources} data sources have critical staleness issues`);
  }

  if (statistics.averageFreshness < 0.4) {
    insights.alerts.push('Overall data freshness is below acceptable threshold');
  }

  if (statistics.refreshCandidates.length > statistics.totalSources * 0.5) {
    insights.alerts.push('More than half of data sources need refresh');
  }

  return insights;
}

export async function GET(request: NextRequest) {
  try {
    // GET endpoint for quick statistics
    const statistics = getFreshnessStatistics();
    const insights = generateFreshnessInsights(statistics);

    return NextResponse.json({
      success: true,
      statistics,
      insights,
      metadata: {
        generatedAt: new Date().toISOString(),
        endpoint: 'GET /api/data-freshness'
      }
    });
  } catch (error) {
    console.error('Data freshness GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get freshness data' },
      { status: 500 }
    );
  }
} 