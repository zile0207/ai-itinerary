'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Itinerary, ItineraryVersion } from '../types/itinerary';

interface VersionHistoryOptions {
  autoSaveInterval?: number; // in milliseconds, default 15 minutes
  maxVersions?: number; // maximum versions to keep, default 50
  enableCompression?: boolean; // enable delta compression, default true
}

interface VersionDiff {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
}

interface UseVersionHistoryReturn {
  versions: ItineraryVersion[];
  currentVersion: ItineraryVersion | null;
  isLoading: boolean;
  error: string | null;
  
  // Version management
  createVersion: (data: Itinerary, options?: { name?: string; changeNotes?: string; tags?: string[] }) => Promise<ItineraryVersion>;
  restoreVersion: (versionId: string) => Promise<void>;
  deleteVersion: (versionId: string) => Promise<void>;
  
  // Version comparison
  compareVersions: (versionId1: string, versionId2: string) => VersionDiff[];
  generateDiff: (oldData: Itinerary, newData: Itinerary) => VersionDiff[];
  
  // Auto-versioning
  enableAutoVersioning: () => void;
  disableAutoVersioning: () => void;
  isAutoVersioningEnabled: boolean;
  
  // Utility functions
  getVersionByNumber: (versionNumber: number) => ItineraryVersion | undefined;
  getVersionsInRange: (startDate: string, endDate: string) => ItineraryVersion[];
  searchVersions: (query: string) => ItineraryVersion[];
}

export const useVersionHistory = (
  itineraryId: string,
  options: VersionHistoryOptions = {}
): UseVersionHistoryReturn => {
  const {
    autoSaveInterval = 15 * 60 * 1000, // 15 minutes
    maxVersions = 50,
    enableCompression = true
  } = options;

  const [versions, setVersions] = useState<ItineraryVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ItineraryVersion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoVersioningEnabled, setIsAutoVersioningEnabled] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a diff between two itinerary versions
  const generateDiff = useCallback((oldData: Itinerary, newData: Itinerary): VersionDiff[] => {
    const diffs: VersionDiff[] = [];

    // Helper function to compare nested objects
    const compareObjects = (old: any, newer: any, path: string = '') => {
      if (old === newer) return;

      if (typeof old !== 'object' || typeof newer !== 'object' || old === null || newer === null) {
        if (old !== newer) {
          diffs.push({
            path,
            type: 'modified',
            oldValue: old,
            newValue: newer
          });
        }
        return;
      }

      // Handle arrays
      if (Array.isArray(old) && Array.isArray(newer)) {
        const maxLength = Math.max(old.length, newer.length);
        for (let i = 0; i < maxLength; i++) {
          const itemPath = `${path}[${i}]`;
          if (i >= old.length) {
            diffs.push({
              path: itemPath,
              type: 'added',
              newValue: newer[i]
            });
          } else if (i >= newer.length) {
            diffs.push({
              path: itemPath,
              type: 'removed',
              oldValue: old[i]
            });
          } else {
            compareObjects(old[i], newer[i], itemPath);
          }
        }
        return;
      }

      // Handle objects
      const allKeys = new Set([...Object.keys(old), ...Object.keys(newer)]);
      for (const key of allKeys) {
        const keyPath = path ? `${path}.${key}` : key;
        if (!(key in old)) {
          diffs.push({
            path: keyPath,
            type: 'added',
            newValue: newer[key]
          });
        } else if (!(key in newer)) {
          diffs.push({
            path: keyPath,
            type: 'removed',
            oldValue: old[key]
          });
        } else {
          compareObjects(old[key], newer[key], keyPath);
        }
      }
    };

    compareObjects(oldData, newData);
    return diffs;
  }, []);

  // Compare two specific versions
  const compareVersions = useCallback((versionId1: string, versionId2: string): VersionDiff[] => {
    const version1 = versions.find(v => v.id === versionId1);
    const version2 = versions.find(v => v.id === versionId2);
    
    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }
    
    return generateDiff(version1.data, version2.data);
  }, [versions, generateDiff]);

  // Create a new version
  const createVersion = useCallback(async (
    data: Itinerary,
    options: { name?: string; changeNotes?: string; tags?: string[] } = {}
  ): Promise<ItineraryVersion> => {
    setIsLoading(true);
    setError(null);

    try {
      const newVersion: ItineraryVersion = {
        id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        itineraryId,
        versionNumber: versions.length + 1,
        name: options.name || `Version ${versions.length + 1}`,
        data: JSON.parse(JSON.stringify(data)), // Deep clone
        createdAt: new Date().toISOString(),
        changeNotes: options.changeNotes,
        tags: options.tags,
        isActive: true
      };

      // Store in localStorage for now (would be API call in production)
      const storageKey = `itinerary_versions_${itineraryId}`;
      const existingVersions = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Apply version limit
      const updatedVersions = [...existingVersions, newVersion];
      if (updatedVersions.length > maxVersions) {
        updatedVersions.splice(0, updatedVersions.length - maxVersions);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(updatedVersions));
      
      setVersions(updatedVersions);
      setCurrentVersion(newVersion);
      
      return newVersion;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create version';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [itineraryId, versions.length, maxVersions]);

  // Restore a specific version
  const restoreVersion = useCallback(async (versionId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) {
        throw new Error('Version not found');
      }

      // In a real app, this would update the main itinerary
      // For now, we'll just set it as current version
      setCurrentVersion(version);
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('itinerary-restored', {
        detail: { itineraryId, version }
      }));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore version';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [versions, itineraryId]);

  // Delete a specific version
  const deleteVersion = useCallback(async (versionId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedVersions = versions.filter(v => v.id !== versionId);
      
      const storageKey = `itinerary_versions_${itineraryId}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedVersions));
      
      setVersions(updatedVersions);
      
      if (currentVersion?.id === versionId) {
        setCurrentVersion(updatedVersions[updatedVersions.length - 1] || null);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete version';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [versions, currentVersion, itineraryId]);

  // Auto-versioning functionality
  const enableAutoVersioning = useCallback(() => {
    setIsAutoVersioningEnabled(true);
  }, []);

  const disableAutoVersioning = useCallback(() => {
    setIsAutoVersioningEnabled(false);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  // Utility functions
  const getVersionByNumber = useCallback((versionNumber: number): ItineraryVersion | undefined => {
    return versions.find(v => v.versionNumber === versionNumber);
  }, [versions]);

  const getVersionsInRange = useCallback((startDate: string, endDate: string): ItineraryVersion[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return versions.filter(v => {
      const versionDate = new Date(v.createdAt);
      return versionDate >= start && versionDate <= end;
    });
  }, [versions]);

  const searchVersions = useCallback((query: string): ItineraryVersion[] => {
    const lowercaseQuery = query.toLowerCase();
    
    return versions.filter(v => 
      v.name.toLowerCase().includes(lowercaseQuery) ||
      v.changeNotes?.toLowerCase().includes(lowercaseQuery) ||
      v.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      v.data.name.toLowerCase().includes(lowercaseQuery) ||
      v.data.description?.toLowerCase().includes(lowercaseQuery)
    );
  }, [versions]);

  // Load versions on mount
  useEffect(() => {
    const loadVersions = async () => {
      setIsLoading(true);
      try {
        const storageKey = `itinerary_versions_${itineraryId}`;
        const storedVersions = JSON.parse(localStorage.getItem(storageKey) || '[]');
        setVersions(storedVersions);
        
        if (storedVersions.length > 0) {
          setCurrentVersion(storedVersions[storedVersions.length - 1]);
        }
      } catch (err) {
        setError('Failed to load version history');
      } finally {
        setIsLoading(false);
      }
    };

    if (itineraryId) {
      loadVersions();
    }
  }, [itineraryId]);

  // Auto-versioning timer
  useEffect(() => {
    if (isAutoVersioningEnabled && autoSaveInterval > 0) {
      autoSaveTimerRef.current = setInterval(() => {
        // This would check if there are unsaved changes
        // For now, we'll just emit an event that components can listen to
        window.dispatchEvent(new CustomEvent('auto-version-trigger', {
          detail: { itineraryId }
        }));
      }, autoSaveInterval);

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
        }
      };
    }
  }, [isAutoVersioningEnabled, autoSaveInterval, itineraryId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    versions,
    currentVersion,
    isLoading,
    error,
    createVersion,
    restoreVersion,
    deleteVersion,
    compareVersions,
    generateDiff,
    enableAutoVersioning,
    disableAutoVersioning,
    isAutoVersioningEnabled,
    getVersionByNumber,
    getVersionsInRange,
    searchVersions
  };
}; 