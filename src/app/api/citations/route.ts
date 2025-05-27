/**
 * Citation Management API
 * 
 * Provides endpoints for citation analysis, formatting, and quality assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  citationManager, 
  parseCitationsFromPerplexity, 
  formatCitationsForDisplay, 
  getCitationsByQuality,
  groupCitationsByTopic,
  getCitationStatistics,
  CitationFormat 
} from '@/lib/citation-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, options = {} } = body;

    switch (action) {
      case 'parse':
        return await handleParseCitations(data, options);
      
      case 'format':
        return await handleFormatCitations(data, options);
      
      case 'analyze':
        return await handleAnalyzeCitations(data, options);
      
      case 'filter':
        return await handleFilterCitations(data, options);
      
      case 'group':
        return await handleGroupCitations(data, options);
      
      case 'statistics':
        return await handleGetStatistics(data, options);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: parse, format, analyze, filter, group, statistics' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Citation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Parse citations from Perplexity response data
 */
async function handleParseCitations(data: unknown[], options: any) {
  try {
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data must be an array of citation objects' },
        { status: 400 }
      );
    }

    const citations = await parseCitationsFromPerplexity(data);
    const statistics = getCitationStatistics(citations);

    return NextResponse.json({
      success: true,
      citations,
      statistics,
      metadata: {
        totalParsed: citations.length,
        totalInput: data.length,
        parseRate: citations.length / data.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Parse citations error:', error);
    return NextResponse.json(
      { error: 'Failed to parse citations' },
      { status: 500 }
    );
  }
}

/**
 * Format citations in specified format
 */
async function handleFormatCitations(data: any, options: any) {
  try {
    const { citations, format = CitationFormat.WEB } = data;
    
    if (!Array.isArray(citations)) {
      return NextResponse.json(
        { error: 'Citations must be an array' },
        { status: 400 }
      );
    }

    const formattedCitations = formatCitationsForDisplay(citations, format);

    return NextResponse.json({
      success: true,
      formatted: formattedCitations,
      format,
      count: formattedCitations.length
    });
  } catch (error) {
    console.error('Format citations error:', error);
    return NextResponse.json(
      { error: 'Failed to format citations' },
      { status: 500 }
    );
  }
}

/**
 * Analyze citation quality and provide recommendations
 */
async function handleAnalyzeCitations(data: any, options: any) {
  try {
    const { citations } = data;
    
    if (!Array.isArray(citations)) {
      return NextResponse.json(
        { error: 'Citations must be an array' },
        { status: 400 }
      );
    }

    // Validate citations for enhanced analysis
    const validatedCitations = await citationManager.validateCitations(citations);
    const statistics = getCitationStatistics(validatedCitations);
    const groups = groupCitationsByTopic(validatedCitations);

    // Generate quality report
    const qualityReport = {
      overall: {
        averageQuality: statistics.averageQuality,
        totalIssues: statistics.issueCount,
        qualityDistribution: statistics.byQuality
      },
      recommendations: generateQualityRecommendations(validatedCitations),
      topSources: statistics.topDomains.slice(0, 5),
      issuesSummary: summarizeIssues(validatedCitations)
    };

    return NextResponse.json({
      success: true,
      citations: validatedCitations,
      statistics,
      groups,
      qualityReport,
      metadata: {
        analysisTimestamp: new Date().toISOString(),
        totalAnalyzed: validatedCitations.length
      }
    });
  } catch (error) {
    console.error('Analyze citations error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze citations' },
      { status: 500 }
    );
  }
}

/**
 * Filter citations by quality or other criteria
 */
async function handleFilterCitations(data: any, options: any) {
  try {
    const { citations, minQuality = 0.6, criteria = {} } = data;
    
    if (!Array.isArray(citations)) {
      return NextResponse.json(
        { error: 'Citations must be an array' },
        { status: 400 }
      );
    }

    let filteredCitations = getCitationsByQuality(citations, minQuality);

    // Apply additional filters
    if (criteria.domain) {
      filteredCitations = filteredCitations.filter(c => 
        c.domain.toLowerCase().includes(criteria.domain.toLowerCase())
      );
    }

    if (criteria.type) {
      filteredCitations = filteredCitations.filter(c => c.type === criteria.type);
    }

    if (criteria.hasAuthor) {
      filteredCitations = filteredCitations.filter(c => !!c.author);
    }

    if (criteria.recentOnly) {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6); // Last 6 months
      
      filteredCitations = filteredCitations.filter(c => {
        if (!c.publishDate) return false;
        return new Date(c.publishDate) > cutoffDate;
      });
    }

    return NextResponse.json({
      success: true,
      citations: filteredCitations,
      originalCount: citations.length,
      filteredCount: filteredCitations.length,
      filters: { minQuality, ...criteria }
    });
  } catch (error) {
    console.error('Filter citations error:', error);
    return NextResponse.json(
      { error: 'Failed to filter citations' },
      { status: 500 }
    );
  }
}

/**
 * Group citations by various criteria
 */
async function handleGroupCitations(data: any, options: any) {
  try {
    const { citations, groupBy = 'topic' } = data;
    
    if (!Array.isArray(citations)) {
      return NextResponse.json(
        { error: 'Citations must be an array' },
        { status: 400 }
      );
    }

    const groups = citationManager.groupCitations(citations, groupBy);

    return NextResponse.json({
      success: true,
      groups,
      groupBy,
      totalGroups: groups.length,
      totalCitations: citations.length
    });
  } catch (error) {
    console.error('Group citations error:', error);
    return NextResponse.json(
      { error: 'Failed to group citations' },
      { status: 500 }
    );
  }
}

/**
 * Get citation statistics
 */
async function handleGetStatistics(data: any, options: any) {
  try {
    const { citations } = data;
    
    if (!Array.isArray(citations)) {
      return NextResponse.json(
        { error: 'Citations must be an array' },
        { status: 400 }
      );
    }

    const statistics = getCitationStatistics(citations);

    return NextResponse.json({
      success: true,
      statistics,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCitations: citations.length
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}

/**
 * Helper functions
 */

function generateQualityRecommendations(citations: any[]): string[] {
  const recommendations: string[] = [];
  const stats = getCitationStatistics(citations);

  if (stats.byQuality.low > stats.total * 0.3) {
    recommendations.push('Consider finding higher quality sources to improve overall credibility');
  }

  if (stats.issueCount > citations.length * 0.5) {
    recommendations.push('Review and address citation issues to improve source reliability');
  }

  const govSources = citations.filter(c => c.domain.includes('.gov')).length;
  if (govSources === 0 && citations.length > 3) {
    recommendations.push('Consider adding government or official sources for authoritative information');
  }

  const recentSources = citations.filter(c => {
    if (!c.publishDate) return false;
    const publishDate = new Date(c.publishDate);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return publishDate > sixMonthsAgo;
  }).length;

  if (recentSources < citations.length * 0.5) {
    recommendations.push('Look for more recent sources to ensure information currency');
  }

  if (recommendations.length === 0) {
    recommendations.push('Citation quality is good - maintain current sourcing standards');
  }

  return recommendations;
}

function summarizeIssues(citations: any[]): Record<string, number> {
  const issueSummary: Record<string, number> = {};

  citations.forEach(citation => {
    citation.quality.issues.forEach((issue: any) => {
      issueSummary[issue.type] = (issueSummary[issue.type] || 0) + 1;
    });
  });

  return issueSummary;
} 