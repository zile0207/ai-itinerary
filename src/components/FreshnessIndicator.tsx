/**
 * Freshness Indicator Component
 * 
 * Displays data freshness status with visual indicators, scores, and refresh recommendations.
 */

'use client';

import React, { useState } from 'react';
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ArrowPathIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

export interface FreshnessData {
  isFresh: boolean;
  freshnessScore: number;
  nextValidation: string;
  issues?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }>;
  recommendations?: string[];
  lastValidated?: string;
  dataAge?: number; // in hours
}

export interface FreshnessIndicatorProps {
  data: FreshnessData;
  showDetails?: boolean;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const FreshnessIndicator: React.FC<FreshnessIndicatorProps> = ({
  data,
  showDetails = true,
  showRefreshButton = true,
  onRefresh,
  className = '',
  size = 'md'
}) => {
  const [expanded, setExpanded] = useState(false);

  const getFreshnessColor = (score: number, isFresh: boolean) => {
    if (!isFresh || score < 0.4) return 'text-red-500 bg-red-50 border-red-200';
    if (score < 0.7) return 'text-yellow-500 bg-yellow-50 border-yellow-200';
    return 'text-green-500 bg-green-50 border-green-200';
  };

  const getFreshnessIcon = (score: number, isFresh: boolean) => {
    if (!isFresh || score < 0.4) return ExclamationTriangleIcon;
    if (score < 0.7) return ClockIcon;
    return CheckCircleIcon;
  };

  const getFreshnessLabel = (score: number, isFresh: boolean) => {
    if (!isFresh || score < 0.4) return 'Stale';
    if (score < 0.7) return 'Aging';
    return 'Fresh';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'text-xs',
          icon: 'w-3 h-3',
          badge: 'px-2 py-1',
          button: 'px-2 py-1 text-xs'
        };
      case 'lg':
        return {
          container: 'text-base',
          icon: 'w-6 h-6',
          badge: 'px-4 py-2',
          button: 'px-4 py-2 text-base'
        };
      default:
        return {
          container: 'text-sm',
          icon: 'w-4 h-4',
          badge: 'px-3 py-1',
          button: 'px-3 py-2 text-sm'
        };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const sizeClasses = getSizeClasses();
  const colorClasses = getFreshnessColor(data.freshnessScore, data.isFresh);
  const IconComponent = getFreshnessIcon(data.freshnessScore, data.isFresh);
  const label = getFreshnessLabel(data.freshnessScore, data.isFresh);

  const criticalIssues = data.issues?.filter(issue => issue.severity === 'critical') || [];
  const highIssues = data.issues?.filter(issue => issue.severity === 'high') || [];

  return (
    <div className={`freshness-indicator ${className}`}>
      <div className={`flex items-center gap-2 ${sizeClasses.container}`}>
        {/* Main Freshness Badge */}
        <div className={`flex items-center gap-1 border rounded-full ${sizeClasses.badge} ${colorClasses}`}>
          <IconComponent className={sizeClasses.icon} />
          <span className="font-medium">{label}</span>
          <span className="opacity-75">
            {Math.round(data.freshnessScore * 100)}%
          </span>
        </div>

        {/* Critical Issues Alert */}
        {criticalIssues.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
            <ExclamationTriangleIcon className="w-3 h-3" />
            <span>{criticalIssues.length} critical</span>
          </div>
        )}

        {/* Refresh Button */}
        {showRefreshButton && onRefresh && (
          <button
            onClick={onRefresh}
            className={`flex items-center gap-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${sizeClasses.button}`}
            title="Refresh data"
          >
            <ArrowPathIcon className={sizeClasses.icon} />
            <span>Refresh</span>
          </button>
        )}

        {/* Details Toggle */}
        {showDetails && (data.issues?.length || data.recommendations?.length) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title={expanded ? 'Hide details' : 'Show details'}
          >
            {expanded ? (
              <ChevronUpIcon className={sizeClasses.icon} />
            ) : (
              <ChevronDownIcon className={sizeClasses.icon} />
            )}
          </button>
        )}
      </div>

      {/* Last Validated Info */}
      {data.lastValidated && (
        <div className="text-xs text-gray-500 mt-1">
          Last checked: {formatTimeAgo(data.lastValidated)}
        </div>
      )}

      {/* Expanded Details */}
      {expanded && showDetails && (
        <div className="mt-3 space-y-3 border-t pt-3">
          {/* Freshness Score Details */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">Freshness Score</span>
              <span className={`font-medium ${data.isFresh ? 'text-green-600' : 'text-red-600'}`}>
                {Math.round(data.freshnessScore * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  data.freshnessScore >= 0.7 ? 'bg-green-500' :
                  data.freshnessScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${data.freshnessScore * 100}%` }}
              />
            </div>
          </div>

          {/* Issues */}
          {data.issues && data.issues.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Issues</h4>
              <div className="space-y-1">
                {data.issues.map((issue, index) => (
                  <div 
                    key={index}
                    className={`flex items-start gap-2 p-2 rounded text-xs ${
                      issue.severity === 'critical' ? 'bg-red-50 text-red-700' :
                      issue.severity === 'high' ? 'bg-orange-50 text-orange-700' :
                      issue.severity === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-blue-50 text-blue-700'
                    }`}
                  >
                    <ExclamationTriangleIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium capitalize">{issue.severity}</div>
                      <div>{issue.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
              <div className="space-y-1">
                {data.recommendations.map((recommendation, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-2 p-2 bg-blue-50 text-blue-700 rounded text-xs"
                  >
                    <InformationCircleIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div>{recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Validation */}
          <div className="text-xs text-gray-500">
            <span className="font-medium">Next validation:</span> {formatTimeAgo(data.nextValidation)}
          </div>
        </div>
      )}
    </div>
  );
};

export default FreshnessIndicator; 