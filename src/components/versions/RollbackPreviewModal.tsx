'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Clock,
  User,
  FileText,
  Merge,
  SkipForward,
  RotateCcw,
  X
} from 'lucide-react';

interface RollbackConflict {
  path: string;
  type: 'modified_after_version' | 'concurrent_edit' | 'dependency_conflict';
  currentValue: any;
  rollbackValue: any;
  description: string;
  canAutoResolve: boolean;
  autoResolveStrategy?: 'use_current' | 'use_rollback' | 'merge';
}

interface RollbackPreview {
  targetVersion: {
    id: string;
    versionNumber: number;
    name: string;
    createdAt: string;
    changeNotes?: string;
  };
  currentVersion: {
    id: string;
    versionNumber: number;
    name: string;
    createdAt: string;
  };
  conflicts: RollbackConflict[];
  safeChanges: Array<{
    path: string;
    type: 'revert' | 'restore';
    description: string;
    oldValue: any;
    newValue: any;
  }>;
  impactAnalysis: {
    fieldsAffected: number;
    daysAffected: number;
    activitiesAffected: number;
    conflictsCount: number;
    safeChangesCount: number;
  };
}

interface RollbackOptions {
  preserveCurrentVersion?: boolean;
  createBackupVersion?: boolean;
  skipConflicts?: boolean;
  autoResolveConflicts?: boolean;
  notifyCollaborators?: boolean;
}

interface RollbackPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: RollbackPreview | null;
  isProcessing?: boolean;
  onExecuteRollback: (
    resolutions?: Record<string, 'use_current' | 'use_rollback' | 'merge' | 'skip'>,
    options?: RollbackOptions
  ) => Promise<void>;
  className?: string;
}

const RollbackPreviewModal: React.FC<RollbackPreviewModalProps> = ({
  isOpen,
  onClose,
  preview,
  isProcessing = false,
  onExecuteRollback,
  className = ''
}) => {
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'use_current' | 'use_rollback' | 'merge' | 'skip'>>({});
  const [rollbackOptions, setRollbackOptions] = useState<RollbackOptions>({
    createBackupVersion: true,
    notifyCollaborators: true,
    autoResolveConflicts: false,
    skipConflicts: false
  });
  const [showConflictDetails, setShowConflictDetails] = useState<Record<string, boolean>>({});

  // Initialize conflict resolutions with auto-resolve strategies
  useMemo(() => {
    if (preview?.conflicts) {
      const initialResolutions: Record<string, 'use_current' | 'use_rollback' | 'merge' | 'skip'> = {};
      preview.conflicts.forEach(conflict => {
        if (conflict.canAutoResolve && conflict.autoResolveStrategy) {
          initialResolutions[conflict.path] = conflict.autoResolveStrategy;
        } else {
          initialResolutions[conflict.path] = 'skip';
        }
      });
      setConflictResolutions(initialResolutions);
    }
  }, [preview?.conflicts]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getResolutionIcon = (resolution: string) => {
    switch (resolution) {
      case 'use_current':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'use_rollback':
        return <RotateCcw className="w-4 h-4 text-orange-600" />;
      case 'merge':
        return <Merge className="w-4 h-4 text-purple-600" />;
      case 'skip':
        return <SkipForward className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getResolutionColor = (resolution: string) => {
    switch (resolution) {
      case 'use_current':
        return 'border-blue-200 bg-blue-50';
      case 'use_rollback':
        return 'border-orange-200 bg-orange-50';
      case 'merge':
        return 'border-purple-200 bg-purple-50';
      case 'skip':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const handleConflictResolution = (path: string, resolution: 'use_current' | 'use_rollback' | 'merge' | 'skip') => {
    setConflictResolutions(prev => ({
      ...prev,
      [path]: resolution
    }));
  };

  const toggleConflictDetails = (path: string) => {
    setShowConflictDetails(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleExecuteRollback = async () => {
    await onExecuteRollback(conflictResolutions, rollbackOptions);
  };

  const canExecuteRollback = useMemo(() => {
    if (!preview) return false;
    
    // Check if all conflicts have resolutions
    return preview.conflicts.every(conflict => 
      conflictResolutions[conflict.path] && conflictResolutions[conflict.path] !== 'skip'
    ) || rollbackOptions.skipConflicts || rollbackOptions.autoResolveConflicts;
  }, [preview, conflictResolutions, rollbackOptions]);

  const resolvedConflictsCount = useMemo(() => {
    return Object.values(conflictResolutions).filter(resolution => resolution !== 'skip').length;
  }, [conflictResolutions]);

  if (!isOpen || !preview) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Rollback Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Rolling back to version {preview.targetVersion.versionNumber} • {preview.targetVersion.name}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Version Information */}
          <div className="px-6 py-4 border-b bg-blue-50">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Target Version
                </h3>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium">v{preview.targetVersion.versionNumber} - {preview.targetVersion.name}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(preview.targetVersion.createdAt)}
                  </div>
                  {preview.targetVersion.changeNotes && (
                    <div className="text-sm text-gray-700 mt-2 italic">
                      "{preview.targetVersion.changeNotes}"
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Current Version
                </h3>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium">v{preview.currentVersion.versionNumber} - {preview.currentVersion.name}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(preview.currentVersion.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="px-6 py-4 border-b">
            <h3 className="font-medium text-gray-900 mb-3">Impact Analysis</h3>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{preview.impactAnalysis.fieldsAffected}</div>
                <div className="text-sm text-gray-600">Fields affected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{preview.impactAnalysis.daysAffected}</div>
                <div className="text-sm text-gray-600">Days affected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{preview.impactAnalysis.activitiesAffected}</div>
                <div className="text-sm text-gray-600">Activities affected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{preview.impactAnalysis.conflictsCount}</div>
                <div className="text-sm text-gray-600">Conflicts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{preview.impactAnalysis.safeChangesCount}</div>
                <div className="text-sm text-gray-600">Safe changes</div>
              </div>
            </div>
          </div>

          {/* Conflicts Section */}
          {preview.conflicts.length > 0 && (
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Conflicts ({preview.conflicts.length})
                </h3>
                <div className="text-sm text-gray-600">
                  {resolvedConflictsCount} of {preview.conflicts.length} resolved
                </div>
              </div>

              <div className="space-y-3">
                {preview.conflicts.map((conflict, index) => (
                  <div key={`${conflict.path}-${index}`} className={`border rounded-lg ${getResolutionColor(conflictResolutions[conflict.path])}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">
                            {conflict.path.replace(/\./g, ' → ')}
                          </div>
                          <div className="text-sm text-gray-600 mb-3">
                            {conflict.description}
                          </div>
                          
                          {/* Resolution Options */}
                          <div className="flex flex-wrap gap-2">
                            {['use_current', 'use_rollback', 'merge', 'skip'].map((option) => (
                              <button
                                key={option}
                                onClick={() => handleConflictResolution(conflict.path, option as any)}
                                className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg border transition-colors ${
                                  conflictResolutions[conflict.path] === option
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {getResolutionIcon(option)}
                                {option.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => toggleConflictDetails(conflict.path)}
                          className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                        >
                          {showConflictDetails[conflict.path] ? 'Hide details' : 'Show details'}
                        </button>
                      </div>

                      {/* Conflict Details */}
                      {showConflictDetails[conflict.path] && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-2">Current Value</div>
                              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <code className="text-sm text-blue-800 break-all">
                                  {formatValue(conflict.currentValue)}
                                </code>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-2">Rollback Value</div>
                              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                <code className="text-sm text-orange-800 break-all">
                                  {formatValue(conflict.rollbackValue)}
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safe Changes */}
          {preview.safeChanges.length > 0 && (
            <div className="px-6 py-4 border-b">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Safe Changes ({preview.safeChanges.length})
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {preview.safeChanges.map((change, index) => (
                  <div key={`${change.path}-${index}`} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{change.description}</div>
                      <div className="text-sm text-gray-600">{change.path}</div>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      change.type === 'revert' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {change.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rollback Options */}
          <div className="px-6 py-4">
            <h3 className="font-medium text-gray-900 mb-3">Rollback Options</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={rollbackOptions.createBackupVersion}
                  onChange={(e) => setRollbackOptions(prev => ({ ...prev, createBackupVersion: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Create backup version before rollback</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={rollbackOptions.notifyCollaborators}
                  onChange={(e) => setRollbackOptions(prev => ({ ...prev, notifyCollaborators: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Notify collaborators of rollback</span>
              </label>
              
              {preview.conflicts.length > 0 && (
                <>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={rollbackOptions.autoResolveConflicts}
                      onChange={(e) => setRollbackOptions(prev => ({ ...prev, autoResolveConflicts: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Automatically resolve conflicts using suggested strategies</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={rollbackOptions.skipConflicts}
                      onChange={(e) => setRollbackOptions(prev => ({ ...prev, skipConflicts: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Skip conflicts and apply safe changes only</span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {preview.conflicts.length > 0 && !canExecuteRollback && (
              <span className="text-orange-600">⚠️ Please resolve all conflicts before proceeding</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteRollback}
              disabled={!canExecuteRollback || isProcessing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Execute Rollback
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RollbackPreviewModal; 