'use client';

import { useState, useCallback, useMemo } from 'react';
import { Itinerary, ItineraryVersion } from '../types/itinerary';
import { useVersionHistory } from './useVersionHistory';

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
  targetVersion: ItineraryVersion;
  currentVersion: ItineraryVersion;
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
  partialRollback?: {
    includePaths?: string[];
    excludePaths?: string[];
  };
}

interface UseDocumentRollbackReturn {
  // Preview functionality
  generateRollbackPreview: (targetVersionId: string, currentData: Itinerary) => Promise<RollbackPreview | null>;
  
  // Rollback execution
  executeRollback: (
    targetVersionId: string, 
    currentData: Itinerary, 
    options?: RollbackOptions
  ) => Promise<{ success: boolean; newVersion?: ItineraryVersion; errors?: string[] }>;
  
  // Conflict resolution
  resolveConflicts: (
    preview: RollbackPreview,
    resolutions: Record<string, 'use_current' | 'use_rollback' | 'merge' | 'skip'>
  ) => Promise<Itinerary>;
  
  // Partial rollback
  executePartialRollback: (
    targetVersionId: string,
    currentData: Itinerary,
    selectedPaths: string[],
    options?: RollbackOptions
  ) => Promise<{ success: boolean; newVersion?: ItineraryVersion; errors?: string[] }>;
  
  // State
  isProcessing: boolean;
  error: string | null;
}

export const useDocumentRollback = (itineraryId: string): UseDocumentRollbackReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    versions,
    generateDiff,
    createVersion,
    currentVersion
  } = useVersionHistory(itineraryId);

  // Deep clone helper function
  const deepClone = useCallback((obj: any): any => {
    return JSON.parse(JSON.stringify(obj));
  }, []);

  // Detect conflicts between target version and current state
  const detectConflicts = useCallback((
    targetData: Itinerary,
    currentData: Itinerary,
    targetVersion: ItineraryVersion
  ): RollbackConflict[] => {
    const conflicts: RollbackConflict[] = [];
    const diffs = generateDiff(targetData, currentData);
    
    // Analyze each difference to determine if it's a conflict
    diffs.forEach(diff => {
      // Check if this path has been modified since the target version
      const hasBeenModified = checkPathModifiedSinceVersion(diff.path, targetVersion);
      
      if (hasBeenModified && diff.type === 'modified') {
        conflicts.push({
          path: diff.path,
          type: 'modified_after_version',
          currentValue: diff.newValue,
          rollbackValue: diff.oldValue,
          description: `Field "${formatPath(diff.path)}" has been modified since version ${targetVersion.versionNumber}`,
          canAutoResolve: canAutoResolveConflict(diff.path, diff.oldValue, diff.newValue),
          autoResolveStrategy: getAutoResolveStrategy(diff.path, diff.oldValue, diff.newValue)
        });
      }
    });

    return conflicts;
  }, [generateDiff]);

  // Check if a path has been modified since a specific version
  const checkPathModifiedSinceVersion = useCallback((
    path: string,
    sinceVersion: ItineraryVersion
  ): boolean => {
    // In a real implementation, this would check the operation history
    // For now, we'll use a simplified heuristic based on timestamps
    if (!currentVersion) return false;
    
    const sinceDate = new Date(sinceVersion.createdAt);
    const currentDate = new Date(currentVersion.createdAt);
    
    return currentDate > sinceDate;
  }, [currentVersion]);

  // Determine if a conflict can be auto-resolved
  const canAutoResolveConflict = useCallback((path: string, oldValue: any, newValue: any): boolean => {
    // Simple rules for auto-resolution
    if (typeof oldValue === 'string' && typeof newValue === 'string') {
      return oldValue.length < newValue.length; // Favor additions
    }
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      return oldValue.length < newValue.length; // Favor array growth
    }
    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      return Math.abs(newValue - oldValue) < 1000; // Small numeric changes
    }
    return false;
  }, []);

  // Get auto-resolve strategy for conflicts
  const getAutoResolveStrategy = useCallback((
    path: string,
    oldValue: any,
    newValue: any
  ): 'use_current' | 'use_rollback' | 'merge' => {
    if (path.includes('description') || path.includes('notes')) {
      return 'merge'; // Merge text fields
    }
    if (path.includes('budget') || path.includes('cost')) {
      return 'use_current'; // Keep current financial data
    }
    if (path.includes('date') || path.includes('time')) {
      return 'use_current'; // Keep current temporal data
    }
    return 'use_rollback'; // Default to rollback value
  }, []);

  // Format path for human-readable display
  const formatPath = useCallback((path: string): string => {
    return path
      .replace(/\[(\d+)\]/g, '[$1]')
      .replace(/\./g, ' → ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/^./, str => str.toUpperCase());
  }, []);

  // Generate rollback preview
  const generateRollbackPreview = useCallback(async (
    targetVersionId: string,
    currentData: Itinerary
  ): Promise<RollbackPreview | null> => {
    setError(null);
    
    try {
      const targetVersion = versions.find(v => v.id === targetVersionId);
      if (!targetVersion || !currentVersion) {
        throw new Error('Target version or current version not found');
      }

      const conflicts = detectConflicts(targetVersion.data, currentData, targetVersion);
      const diffs = generateDiff(currentData, targetVersion.data);
      
      // Separate safe changes from conflicts
      const conflictPaths = new Set(conflicts.map(c => c.path));
      const safeChanges = diffs
        .filter(diff => !conflictPaths.has(diff.path))
        .map(diff => ({
          path: diff.path,
          type: diff.type === 'added' ? 'restore' as const : 'revert' as const,
          description: `${diff.type === 'added' ? 'Restore' : 'Revert'} ${formatPath(diff.path)}`,
          oldValue: diff.oldValue,
          newValue: diff.newValue
        }));

      // Calculate impact analysis
      const impactAnalysis = {
        fieldsAffected: diffs.length,
        daysAffected: diffs.filter(d => d.path.includes('days')).length,
        activitiesAffected: diffs.filter(d => d.path.includes('activities')).length,
        conflictsCount: conflicts.length,
        safeChangesCount: safeChanges.length
      };

      return {
        targetVersion,
        currentVersion,
        conflicts,
        safeChanges,
        impactAnalysis
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate rollback preview';
      setError(errorMessage);
      return null;
    }
  }, [versions, currentVersion, detectConflicts, generateDiff, formatPath]);

  // Resolve conflicts by applying user-selected resolutions
  const resolveConflicts = useCallback(async (
    preview: RollbackPreview,
    resolutions: Record<string, 'use_current' | 'use_rollback' | 'merge' | 'skip'>
  ): Promise<Itinerary> => {
    const resolvedData = deepClone(preview.currentVersion.data);
    
    // Apply conflict resolutions
    preview.conflicts.forEach(conflict => {
      const resolution = resolutions[conflict.path];
      
      switch (resolution) {
        case 'use_current':
          // Keep current value (no change needed)
          break;
        case 'use_rollback':
          setValueAtPath(resolvedData, conflict.path, conflict.rollbackValue);
          break;
        case 'merge':
          // Simple merge strategy for text fields
          if (typeof conflict.currentValue === 'string' && typeof conflict.rollbackValue === 'string') {
            const merged = mergeTextValues(conflict.currentValue, conflict.rollbackValue);
            setValueAtPath(resolvedData, conflict.path, merged);
          } else {
            // Fall back to using current value
            setValueAtPath(resolvedData, conflict.path, conflict.currentValue);
          }
          break;
        case 'skip':
        default:
          // Keep current value
          break;
      }
    });

    // Apply safe changes
    preview.safeChanges.forEach(change => {
      setValueAtPath(resolvedData, change.path, change.newValue);
    });

    return resolvedData;
  }, [deepClone]);

  // Set value at a given path in an object
  const setValueAtPath = useCallback((obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const match = key.match(/^(.+)\[(\d+)\]$/);
      
      if (match) {
        const [, arrayKey, index] = match;
        if (!current[arrayKey]) current[arrayKey] = [];
        if (!current[arrayKey][parseInt(index)]) current[arrayKey][parseInt(index)] = {};
        current = current[arrayKey][parseInt(index)];
      } else {
        if (!current[key]) current[key] = {};
        current = current[key];
      }
    }
    
    const lastKey = keys[keys.length - 1];
    const match = lastKey.match(/^(.+)\[(\d+)\]$/);
    
    if (match) {
      const [, arrayKey, index] = match;
      if (!current[arrayKey]) current[arrayKey] = [];
      current[arrayKey][parseInt(index)] = value;
    } else {
      current[lastKey] = value;
    }
  }, []);

  // Simple text merge strategy
  const mergeTextValues = useCallback((current: string, rollback: string): string => {
    // If one contains the other, use the longer one
    if (current.includes(rollback)) return current;
    if (rollback.includes(current)) return rollback;
    
    // Otherwise, concatenate with a separator
    return `${rollback}\n\n[Merged with current changes]\n${current}`;
  }, []);

  // Execute full rollback
  const executeRollback = useCallback(async (
    targetVersionId: string,
    currentData: Itinerary,
    options: RollbackOptions = {}
  ): Promise<{ success: boolean; newVersion?: ItineraryVersion; errors?: string[] }> => {
    setIsProcessing(true);
    setError(null);

    try {
      const preview = await generateRollbackPreview(targetVersionId, currentData);
      if (!preview) {
        throw new Error('Failed to generate rollback preview');
      }

      // Handle conflicts based on options
      let resolvedData: Itinerary;
      
      if (preview.conflicts.length > 0 && !options.skipConflicts) {
        if (options.autoResolveConflicts) {
          // Auto-resolve conflicts using suggested strategies
          const autoResolutions: Record<string, 'use_current' | 'use_rollback' | 'merge' | 'skip'> = {};
          preview.conflicts.forEach(conflict => {
            if (conflict.canAutoResolve && conflict.autoResolveStrategy) {
              autoResolutions[conflict.path] = conflict.autoResolveStrategy;
            } else {
              autoResolutions[conflict.path] = 'skip';
            }
          });
          
          resolvedData = await resolveConflicts(preview, autoResolutions);
        } else {
          throw new Error(`Rollback has ${preview.conflicts.length} conflicts that need manual resolution`);
        }
      } else {
        // No conflicts or skipping conflicts - apply safe changes only
        resolvedData = deepClone(currentData);
        preview.safeChanges.forEach(change => {
          setValueAtPath(resolvedData, change.path, change.newValue);
        });
      }

      // Create backup version if requested
      if (options.createBackupVersion) {
        await createVersion(currentData, {
          name: `Backup before rollback to v${preview.targetVersion.versionNumber}`,
          changeNotes: `Automatic backup created before rolling back to version ${preview.targetVersion.versionNumber}`,
          tags: ['backup', 'pre-rollback']
        });
      }

      // Create new version with rolled back data
      const newVersion = await createVersion(resolvedData, {
        name: `Rollback to v${preview.targetVersion.versionNumber}`,
        changeNotes: `Rolled back to version ${preview.targetVersion.versionNumber}. ${preview.safeChanges.length} changes applied, ${options.skipConflicts ? preview.conflicts.length + ' conflicts skipped' : '0 conflicts'}`,
        tags: ['rollback']
      });

      // Notify collaborators if requested
      if (options.notifyCollaborators) {
        // Emit Socket.io event for real-time notification
        window.dispatchEvent(new CustomEvent('document-rollback', {
          detail: {
            itineraryId,
            targetVersion: preview.targetVersion,
            newVersion,
            impactAnalysis: preview.impactAnalysis
          }
        }));
      }

      return { success: true, newVersion };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Rollback failed';
      setError(errorMessage);
      return { success: false, errors: [errorMessage] };
    } finally {
      setIsProcessing(false);
    }
  }, [generateRollbackPreview, resolveConflicts, deepClone, setValueAtPath, createVersion, itineraryId]);

  // Execute partial rollback for specific paths
  const executePartialRollback = useCallback(async (
    targetVersionId: string,
    currentData: Itinerary,
    selectedPaths: string[],
    options: RollbackOptions = {}
  ): Promise<{ success: boolean; newVersion?: ItineraryVersion; errors?: string[] }> => {
    setIsProcessing(true);
    setError(null);

    try {
      const targetVersion = versions.find(v => v.id === targetVersionId);
      if (!targetVersion) {
        throw new Error('Target version not found');
      }

      const resolvedData = deepClone(currentData);
      
      // Apply only selected paths from target version
      selectedPaths.forEach(path => {
        const targetValue = getValueAtPath(targetVersion.data, path);
        if (targetValue !== undefined) {
          setValueAtPath(resolvedData, path, targetValue);
        }
      });

      // Create new version
      const newVersion = await createVersion(resolvedData, {
        name: `Partial rollback to v${targetVersion.versionNumber}`,
        changeNotes: `Partial rollback: ${selectedPaths.length} fields restored from version ${targetVersion.versionNumber}`,
        tags: ['partial-rollback']
      });

      // Notify collaborators if requested
      if (options.notifyCollaborators) {
        window.dispatchEvent(new CustomEvent('document-partial-rollback', {
          detail: {
            itineraryId,
            targetVersion,
            newVersion,
            selectedPaths
          }
        }));
      }

      return { success: true, newVersion };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Partial rollback failed';
      setError(errorMessage);
      return { success: false, errors: [errorMessage] };
    } finally {
      setIsProcessing(false);
    }
  }, [versions, deepClone, setValueAtPath, createVersion, itineraryId]);

  // Get value at a given path in an object
  const getValueAtPath = useCallback((obj: any, path: string): any => {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      const match = key.match(/^(.+)\[(\d+)\]$/);
      
      if (match) {
        const [, arrayKey, index] = match;
        current = current?.[arrayKey]?.[parseInt(index)];
      } else {
        current = current?.[key];
      }
      
      if (current === undefined) break;
    }
    
    return current;
  }, []);

  return {
    generateRollbackPreview,
    executeRollback,
    resolveConflicts,
    executePartialRollback,
    isProcessing,
    error
  };
}; 