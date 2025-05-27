/**
 * Citation Display Component
 * 
 * Displays citations from Perplexity research results with quality indicators,
 * expandable details, and various display formats.
 */

'use client';

import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ArrowTopRightOnSquareIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export interface CitationData {
  id: string;
  url: string;
  title: string;
  domain: string;
  snippet?: string;
  accessDate: string;
  publishDate?: string;
  author?: string;
  siteName?: string;
  quality: {
    score: number;
    factors: string[];
    issues: string[];
  };
  relevanceScore?: number;
}

export interface CitationDisplayProps {
  citations: string[]; // Formatted HTML citations
  citationData?: CitationData[]; // Full citation objects
  showQualityIndicators?: boolean;
  showExpandableDetails?: boolean;
  maxVisible?: number;
  className?: string;
}

const CitationDisplay: React.FC<CitationDisplayProps> = ({
  citations,
  citationData = [],
  showQualityIndicators = true,
  showExpandableDetails = true,
  maxVisible = 5,
  className = ''
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);

  if (!citations || citations.length === 0) {
    return null;
  }

  const visibleCitations = expanded ? citations : citations.slice(0, maxVisible);
  const hasMore = citations.length > maxVisible;

  const getQualityIcon = (score: number) => {
    if (score >= 0.8) {
      return <CheckCircleIcon className="w-4 h-4 text-green-500" title="High quality source" />;
    } else if (score >= 0.6) {
      return <InformationCircleIcon className="w-4 h-4 text-yellow-500" title="Medium quality source" />;
    } else {
      return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" title="Low quality source" />;
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'border-green-200 bg-green-50';
    if (score >= 0.6) return 'border-yellow-200 bg-yellow-50';
    return 'border-red-200 bg-red-50';
  };

  const getCitationData = (index: number): CitationData | undefined => {
    return citationData[index];
  };

  const toggleCitationDetails = (citationId: string) => {
    setSelectedCitation(selectedCitation === citationId ? null : citationId);
  };

  return (
    <div className={`citation-display ${className}`}>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Sources ({citations.length})
        </h4>
        
        {/* Quality Summary */}
        {showQualityIndicators && citationData.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
            <span className="flex items-center gap-1">
              <CheckCircleIcon className="w-3 h-3 text-green-500" />
              {citationData.filter(c => c.quality.score >= 0.8).length} high quality
            </span>
            <span className="flex items-center gap-1">
              <InformationCircleIcon className="w-3 h-3 text-yellow-500" />
              {citationData.filter(c => c.quality.score >= 0.6 && c.quality.score < 0.8).length} medium quality
            </span>
            <span className="flex items-center gap-1">
              <ExclamationTriangleIcon className="w-3 h-3 text-red-500" />
              {citationData.filter(c => c.quality.score < 0.6).length} low quality
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {visibleCitations.map((citation, index) => {
          const citationDataItem = getCitationData(index);
          const qualityScore = citationDataItem?.quality.score ?? 0.5;
          
          return (
            <div
              key={index}
              className={`citation-item border rounded-lg p-3 transition-all duration-200 ${
                showQualityIndicators && citationDataItem 
                  ? getQualityColor(qualityScore)
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {showQualityIndicators && citationDataItem && getQualityIcon(qualityScore)}
                    <div 
                      className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                      dangerouslySetInnerHTML={{ __html: citation }}
                    />
                    <ArrowTopRightOnSquareIcon className="w-3 h-3 text-gray-400" />
                  </div>
                  
                  {citationDataItem && (
                    <div className="text-xs text-gray-600">
                      {citationDataItem.domain} • {citationDataItem.accessDate}
                      {citationDataItem.author && ` • by ${citationDataItem.author}`}
                    </div>
                  )}
                </div>

                {showExpandableDetails && citationDataItem && (
                  <button
                    onClick={() => toggleCitationDetails(citationDataItem.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Show details"
                  >
                    {selectedCitation === citationDataItem.id ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Expandable Details */}
              {showExpandableDetails && 
               citationDataItem && 
               selectedCitation === citationDataItem.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="space-y-2 text-xs">
                    {citationDataItem.snippet && (
                      <div>
                        <span className="font-medium text-gray-700">Snippet:</span>
                        <p className="text-gray-600 mt-1">{citationDataItem.snippet}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Quality Score:</span>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                qualityScore >= 0.8 ? 'bg-green-500' :
                                qualityScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${qualityScore * 100}%` }}
                            />
                          </div>
                          <span className="text-gray-600">{Math.round(qualityScore * 100)}%</span>
                        </div>
                      </div>
                      
                      {citationDataItem.relevanceScore && (
                        <div>
                          <span className="font-medium text-gray-700">Relevance:</span>
                          <div className="text-gray-600 mt-1">
                            {Math.round(citationDataItem.relevanceScore * 100)}%
                          </div>
                        </div>
                      )}
                    </div>

                    {citationDataItem.quality.factors.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Quality Factors:</span>
                        <ul className="text-gray-600 mt-1 list-disc list-inside">
                          {citationDataItem.quality.factors.map((factor, idx) => (
                            <li key={idx}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {citationDataItem.quality.issues.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Issues:</span>
                        <ul className="text-gray-600 mt-1 list-disc list-inside">
                          {citationDataItem.quality.issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUpIcon className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDownIcon className="w-4 h-4" />
              Show {citations.length - maxVisible} More
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default CitationDisplay; 