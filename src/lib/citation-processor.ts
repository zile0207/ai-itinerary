/**
 * Citation Processor for Response Parser
 * 
 * Provides synchronous citation processing for use in the response parser
 * without requiring async operations.
 */

import { Citation, CitationFormat, citationManager } from './citation-manager';

export interface ProcessedCitations {
  formatted: string[];
  raw: Citation[];
  statistics: {
    total: number;
    highQuality: number;
    mediumQuality: number;
    lowQuality: number;
  };
}

/**
 * Process citations synchronously for immediate use in response parsing
 */
export function processCitationsSync(citationsData: unknown[]): ProcessedCitations {
  if (!Array.isArray(citationsData)) {
    return {
      formatted: [],
      raw: [],
      statistics: { total: 0, highQuality: 0, mediumQuality: 0, lowQuality: 0 }
    };
  }

  try {
    // Parse citations synchronously (without validation)
    const citations = citationManager.parseCitations(citationsData);
    
    // Format citations for display
    const formatted = citations.map(citation => {
      try {
        const formattedCitation = citationManager.formatCitation(citation, CitationFormat.WEB);
        return formattedCitation.html;
      } catch (error) {
        console.warn('Failed to format citation:', error);
        // Fallback formatting
        return `<a href="${citation.url}" title="${citation.title}">${citation.siteName || citation.domain}</a>`;
      }
    });

    // Calculate statistics
    const statistics = {
      total: citations.length,
      highQuality: citations.filter(c => c.quality.score >= 0.8).length,
      mediumQuality: citations.filter(c => c.quality.score >= 0.6 && c.quality.score < 0.8).length,
      lowQuality: citations.filter(c => c.quality.score < 0.6).length
    };

    return {
      formatted,
      raw: citations,
      statistics
    };
  } catch (error) {
    console.warn('Failed to process citations:', error);
    
    // Fallback processing
    const fallbackFormatted = citationsData
      .filter(c => c && typeof c === 'object')
      .map(c => {
        const citation = c as Record<string, unknown>;
        const url = citation.url as string;
        const title = citation.title as string || citation.site_name as string || url;
        return url ? `<a href="${url}">${title}</a>` : title;
      })
      .filter(Boolean);

    return {
      formatted: fallbackFormatted,
      raw: [],
      statistics: { 
        total: fallbackFormatted.length, 
        highQuality: 0, 
        mediumQuality: 0, 
        lowQuality: fallbackFormatted.length 
      }
    };
  }
}

/**
 * Extract citation URLs from processed citations for storage
 */
export function extractCitationUrls(processedCitations: ProcessedCitations): string[] {
  return processedCitations.raw.map(citation => citation.url);
}

/**
 * Get citation quality summary
 */
export function getCitationQualitySummary(processedCitations: ProcessedCitations): string {
  const { statistics } = processedCitations;
  
  if (statistics.total === 0) {
    return 'No citations available';
  }

  const qualityParts: string[] = [];
  
  if (statistics.highQuality > 0) {
    qualityParts.push(`${statistics.highQuality} high-quality`);
  }
  
  if (statistics.mediumQuality > 0) {
    qualityParts.push(`${statistics.mediumQuality} medium-quality`);
  }
  
  if (statistics.lowQuality > 0) {
    qualityParts.push(`${statistics.lowQuality} low-quality`);
  }

  return `${statistics.total} source${statistics.total > 1 ? 's' : ''} (${qualityParts.join(', ')})`;
}

/**
 * Filter citations by minimum quality score
 */
export function filterCitationsByQuality(
  processedCitations: ProcessedCitations, 
  minQuality: number = 0.6
): ProcessedCitations {
  const filteredCitations = processedCitations.raw.filter(c => c.quality.score >= minQuality);
  
  const formatted = filteredCitations.map(citation => {
    const formattedCitation = citationManager.formatCitation(citation, CitationFormat.WEB);
    return formattedCitation.html;
  });

  const statistics = {
    total: filteredCitations.length,
    highQuality: filteredCitations.filter(c => c.quality.score >= 0.8).length,
    mediumQuality: filteredCitations.filter(c => c.quality.score >= 0.6 && c.quality.score < 0.8).length,
    lowQuality: filteredCitations.filter(c => c.quality.score < 0.6).length
  };

  return {
    formatted,
    raw: filteredCitations,
    statistics
  };
} 