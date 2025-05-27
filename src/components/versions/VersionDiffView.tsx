'use client';

import React, { useMemo } from 'react';
import { Plus, Minus, Edit, ArrowRight } from 'lucide-react';

interface VersionDiff {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
}

interface VersionDiffViewProps {
  diffs: VersionDiff[];
  oldVersionName: string;
  newVersionName: string;
  className?: string;
}

const VersionDiffView: React.FC<VersionDiffViewProps> = ({
  diffs,
  oldVersionName,
  newVersionName,
  className = ''
}) => {
  // Group diffs by category for better organization
  const groupedDiffs = useMemo(() => {
    const groups: Record<string, VersionDiff[]> = {
      basic: [],
      days: [],
      activities: [],
      other: []
    };

    diffs.forEach(diff => {
      if (diff.path.includes('name') || diff.path.includes('description') || 
          diff.path.includes('duration') || diff.path.includes('travelers') || 
          diff.path.includes('budget') || diff.path.includes('destinations')) {
        groups.basic.push(diff);
      } else if (diff.path.includes('days')) {
        groups.days.push(diff);
      } else if (diff.path.includes('activities')) {
        groups.activities.push(diff);
      } else {
        groups.other.push(diff);
      }
    });

    return groups;
  }, [diffs]);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatPath = (path: string): string => {
    return path
      .replace(/\[(\d+)\]/g, '[$1]')
      .replace(/\./g, ' → ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/^./, str => str.toUpperCase());
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'removed':
        return <Minus className="w-4 h-4 text-red-600" />;
      case 'modified':
        return <Edit className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'border-l-green-500 bg-green-50';
      case 'removed':
        return 'border-l-red-500 bg-red-50';
      case 'modified':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const renderDiffSection = (title: string, sectionDiffs: VersionDiff[]) => {
    if (sectionDiffs.length === 0) return null;

    return (
      <div key={title} className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
          {title} Changes
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {sectionDiffs.length}
          </span>
        </h3>
        
        <div className="space-y-3">
          {sectionDiffs.map((diff, index) => (
            <div
              key={`${diff.path}-${index}`}
              className={`border-l-4 p-4 rounded-r-lg ${getChangeColor(diff.type)}`}
            >
              <div className="flex items-start gap-3">
                {getChangeIcon(diff.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {formatPath(diff.path)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      diff.type === 'added' ? 'bg-green-100 text-green-700' :
                      diff.type === 'removed' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {diff.type}
                    </span>
                  </div>

                  {diff.type === 'modified' && (
                    <div className="space-y-2">
                      <div className="bg-red-100 border border-red-200 rounded p-3">
                        <div className="text-xs font-medium text-red-700 mb-1">
                          - {oldVersionName}
                        </div>
                        <code className="text-sm text-red-800 break-all">
                          {formatValue(diff.oldValue)}
                        </code>
                      </div>
                      
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                      
                      <div className="bg-green-100 border border-green-200 rounded p-3">
                        <div className="text-xs font-medium text-green-700 mb-1">
                          + {newVersionName}
                        </div>
                        <code className="text-sm text-green-800 break-all">
                          {formatValue(diff.newValue)}
                        </code>
                      </div>
                    </div>
                  )}

                  {diff.type === 'added' && (
                    <div className="bg-green-100 border border-green-200 rounded p-3">
                      <div className="text-xs font-medium text-green-700 mb-1">
                        + Added in {newVersionName}
                      </div>
                      <code className="text-sm text-green-800 break-all">
                        {formatValue(diff.newValue)}
                      </code>
                    </div>
                  )}

                  {diff.type === 'removed' && (
                    <div className="bg-red-100 border border-red-200 rounded p-3">
                      <div className="text-xs font-medium text-red-700 mb-1">
                        - Removed from {oldVersionName}
                      </div>
                      <code className="text-sm text-red-800 break-all">
                        {formatValue(diff.oldValue)}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (diffs.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p className="text-lg mb-2">No differences found</p>
        <p className="text-sm">The selected versions are identical</p>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Version Comparison
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>{oldVersionName}</span>
          </div>
          <ArrowRight className="w-4 h-4" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>{newVersionName}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 bg-white border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">
              {diffs.filter(d => d.type === 'added').length}
            </div>
            <div className="text-sm text-green-700">Added</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">
              {diffs.filter(d => d.type === 'modified').length}
            </div>
            <div className="text-sm text-blue-700">Modified</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600">
              {diffs.filter(d => d.type === 'removed').length}
            </div>
            <div className="text-sm text-red-700">Removed</div>
          </div>
        </div>
      </div>

      {/* Detailed Changes */}
      <div className="space-y-6">
        {renderDiffSection('Basic Information', groupedDiffs.basic)}
        {renderDiffSection('Itinerary Days', groupedDiffs.days)}
        {renderDiffSection('Activities', groupedDiffs.activities)}
        {renderDiffSection('Other', groupedDiffs.other)}
      </div>
    </div>
  );
};

export default VersionDiffView; 