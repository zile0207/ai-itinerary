import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConflictData {
  id: string;
  fieldPath: string[];
  fieldLabel: string;
  localValue: any;
  remoteValue: any;
  localAuthor: string;
  remoteAuthor: string;
  localTimestamp: Date;
  remoteTimestamp: Date;
  conflictType: 'text' | 'object' | 'array';
}

export interface ConflictResolverProps {
  conflicts: ConflictData[];
  onResolve: (conflictId: string, resolution: 'local' | 'remote' | 'custom', customValue?: any) => void;
  onResolveAll: (strategy: 'local' | 'remote') => void;
  className?: string;
}

/**
 * Component for resolving merge conflicts in collaborative editing
 * Displays conflicting values and provides resolution options
 */
export function ConflictResolver({
  conflicts,
  onResolve,
  onResolveAll,
  className
}: ConflictResolverProps) {
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [showDiff, setShowDiff] = useState<Record<string, boolean>>({});

  if (conflicts.length === 0) {
    return null;
  }

  const handleCustomValueChange = (conflictId: string, value: any) => {
    setCustomValues(prev => ({ ...prev, [conflictId]: value }));
  };

  const toggleDiff = (conflictId: string) => {
    setShowDiff(prev => ({ ...prev, [conflictId]: !prev[conflictId] }));
  };

  const renderValue = (value: any, conflictType: string) => {
    if (conflictType === 'text' && typeof value === 'string') {
      return (
        <div className="p-2 bg-gray-50 rounded border text-sm font-mono whitespace-pre-wrap">
          {value || '(empty)'}
        </div>
      );
    }
    
    if (conflictType === 'object' || conflictType === 'array') {
      return (
        <div className="p-2 bg-gray-50 rounded border text-sm font-mono">
          <pre>{JSON.stringify(value, null, 2)}</pre>
        </div>
      );
    }
    
    return (
      <div className="p-2 bg-gray-50 rounded border text-sm">
        {String(value)}
      </div>
    );
  };

  const renderTextDiff = (local: string, remote: string) => {
    // Simple line-by-line diff for text
    const localLines = local.split('\n');
    const remoteLines = remote.split('\n');
    const maxLines = Math.max(localLines.length, remoteLines.length);
    
    return (
      <div className="grid grid-cols-2 gap-2 text-sm font-mono">
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <div className="font-semibold text-red-800 mb-1">Your version:</div>
          {Array.from({ length: maxLines }, (_, i) => (
            <div key={i} className={cn(
              'whitespace-pre-wrap',
              localLines[i] !== remoteLines[i] && 'bg-red-100'
            )}>
              {localLines[i] || ''}
            </div>
          ))}
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <div className="font-semibold text-green-800 mb-1">Their version:</div>
          {Array.from({ length: maxLines }, (_, i) => (
            <div key={i} className={cn(
              'whitespace-pre-wrap',
              localLines[i] !== remoteLines[i] && 'bg-green-100'
            )}>
              {remoteLines[i] || ''}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('bg-yellow-50 border border-yellow-200 rounded-lg p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <h3 className="text-lg font-semibold text-yellow-800">
          Merge Conflicts Detected
        </h3>
        <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-sm">
          {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mb-4 text-sm text-yellow-700">
        Multiple users edited the same content simultaneously. Choose how to resolve each conflict:
      </div>

      {/* Global resolution options */}
      <div className="flex gap-2 mb-6 p-3 bg-yellow-100 rounded">
        <span className="text-sm font-medium text-yellow-800">Resolve all:</span>
        <button
          onClick={() => onResolveAll('local')}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
        >
          Keep my changes
        </button>
        <button
          onClick={() => onResolveAll('remote')}
          className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
        >
          Accept their changes
        </button>
      </div>

      {/* Individual conflicts */}
      <div className="space-y-6">
        {conflicts.map((conflict) => (
          <div key={conflict.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                {conflict.fieldLabel}
              </h4>
              {conflict.conflictType === 'text' && (
                <button
                  onClick={() => toggleDiff(conflict.id)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showDiff[conflict.id] ? 'Hide diff' : 'Show diff'}
                </button>
              )}
            </div>

            {showDiff[conflict.id] && conflict.conflictType === 'text' ? (
              <div className="mb-4">
                {renderTextDiff(conflict.localValue, conflict.remoteValue)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Your changes ({conflict.localAuthor})
                    <span className="text-xs text-gray-500 ml-2">
                      {conflict.localTimestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {renderValue(conflict.localValue, conflict.conflictType)}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Their changes ({conflict.remoteAuthor})
                    <span className="text-xs text-gray-500 ml-2">
                      {conflict.remoteTimestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {renderValue(conflict.remoteValue, conflict.conflictType)}
                </div>
              </div>
            )}

            {/* Custom resolution for text conflicts */}
            {conflict.conflictType === 'text' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or create a custom resolution:
                </label>
                <textarea
                  value={customValues[conflict.id] || ''}
                  onChange={(e) => handleCustomValueChange(conflict.id, e.target.value)}
                  placeholder="Enter custom text to resolve the conflict..."
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            )}

            {/* Resolution buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onResolve(conflict.id, 'local')}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Keep mine
              </button>
              <button
                onClick={() => onResolve(conflict.id, 'remote')}
                className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Accept theirs
              </button>
              {conflict.conflictType === 'text' && customValues[conflict.id] && (
                <button
                  onClick={() => onResolve(conflict.id, 'custom', customValues[conflict.id])}
                  className="flex items-center gap-1 bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Use custom
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConflictResolver; 