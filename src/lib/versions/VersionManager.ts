import { EventEmitter } from 'events';
import { 
  DocumentVersion, 
  VersionStorage, 
  VersioningConfig, 
  VersionDiff, 
  VersionChange,
  VersionMetadata,
  VersionQuery,
  VersionActionResult,
  VersionTag,
  ChangesSummary
} from './types';
import { Operation } from '@/lib/ot/types';
import { operationUtils } from '@/lib/ot/utils';

export class VersionManager extends EventEmitter {
  private storage: Map<string, VersionStorage> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private config: VersioningConfig;

  constructor(config: VersioningConfig = {
    autoSaveInterval: 15, // 15 minutes
    maxVersions: 100,
    compressionEnabled: true,
    retentionDays: 90,
    milestoneVersions: 10
  }) {
    super();
    this.config = config;
  }

  /**
   * Initialize version tracking for a document
   */
  initializeDocument(documentId: string, initialData: any, authorId: string, authorName: string): void {
    if (this.storage.has(documentId)) {
      return; // Already initialized
    }

    const initialVersion: DocumentVersion = {
      id: operationUtils.generateId(),
      documentId,
      version: 1,
      data: structuredClone(initialData),
      timestamp: new Date(),
      authorId,
      authorName,
      description: 'Initial version',
      tags: [],
      operationsSinceLastSnapshot: [],
      size: JSON.stringify(initialData).length,
      isAutoSave: false,
      isMilestone: true,
      changesSummary: {
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        addedFields: [],
        modifiedFields: [],
        deletedFields: [],
        significance: 'major'
      }
    };

    const storage: VersionStorage = {
      documentId,
      versions: new Map([[initialVersion.id, initialVersion]]),
      operationHistory: new Map(),
      versionOrder: [initialVersion.id],
      metadata: {
        documentId,
        totalVersions: 1,
        oldestVersion: initialVersion.timestamp,
        newestVersion: initialVersion.timestamp,
        totalSize: initialVersion.size,
        totalOperations: 0,
        activeAuthors: [{
          id: authorId,
          name: authorName,
          versionsCreated: 1,
          lastActivity: new Date()
        }]
      }
    };

    this.storage.set(documentId, storage);
    this.startAutoSaveTimer(documentId);
    this.emit('version-created', initialVersion);
  }

  /**
   * Record an operation for a document
   */
  recordOperation(documentId: string, operation: Operation): void {
    const storage = this.storage.get(documentId);
    if (!storage) {
      console.warn(`No version storage found for document ${documentId}`);
      return;
    }

    // Store the operation
    storage.operationHistory.set(operation.id, operation);
    storage.metadata.totalOperations++;

    // Add to current snapshot's operations
    const latestVersionId = storage.versionOrder[storage.versionOrder.length - 1];
    const latestVersion = storage.versions.get(latestVersionId);
    if (latestVersion) {
      latestVersion.operationsSinceLastSnapshot.push(operation.id);
    }

    // Update author activity
    this.updateAuthorActivity(storage, operation.userId, 'Unknown User');
  }

  /**
   * Create a new version snapshot
   */
  createVersion(
    documentId: string, 
    currentData: any, 
    authorId: string, 
    authorName: string,
    description?: string,
    isAutoSave: boolean = false,
    tags: VersionTag[] = []
  ): VersionActionResult {
    try {
      const storage = this.storage.get(documentId);
      if (!storage) {
        return { success: false, error: 'Document not initialized' };
      }

      const latestVersionId = storage.versionOrder[storage.versionOrder.length - 1];
      const latestVersion = storage.versions.get(latestVersionId);
      
      if (!latestVersion) {
        return { success: false, error: 'No previous version found' };
      }

      // Calculate changes since last version
      const changes = this.calculateChanges(latestVersion.data, currentData);
      const changesSummary = this.summarizeChanges(changes);

      // Create new version
      const newVersion: DocumentVersion = {
        id: operationUtils.generateId(),
        documentId,
        version: latestVersion.version + 1,
        data: structuredClone(currentData),
        timestamp: new Date(),
        authorId,
        authorName,
        description: description || (isAutoSave ? 'Auto-save' : 'Manual save'),
        tags: [...tags],
        operationsSinceLastSnapshot: [],
        previousVersionId: latestVersionId,
        size: JSON.stringify(currentData).length,
        isAutoSave,
        isMilestone: !isAutoSave && changesSummary.significance === 'major',
        changesSummary
      };

      // Store the version
      storage.versions.set(newVersion.id, newVersion);
      storage.versionOrder.push(newVersion.id);

      // Update metadata
      this.updateMetadata(storage, newVersion);

      // Clear operations for the previous version (they're now captured in this snapshot)
      if (latestVersion) {
        latestVersion.operationsSinceLastSnapshot = [];
      }

      // Clean up old versions if needed
      this.cleanupOldVersions(storage);

      this.emit('version-created', newVersion);
      return { success: true, versionId: newVersion.id, changes };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get version history for a document
   */
  getVersionHistory(documentId: string, query?: VersionQuery): DocumentVersion[] {
    const storage = this.storage.get(documentId);
    if (!storage) return [];

    let versions = Array.from(storage.versions.values());

    // Apply filters
    if (query) {
      if (query.authorId) {
        versions = versions.filter(v => v.authorId === query.authorId);
      }
      if (query.fromDate) {
        versions = versions.filter(v => v.timestamp >= query.fromDate!);
      }
      if (query.toDate) {
        versions = versions.filter(v => v.timestamp <= query.toDate!);
      }
      if (query.tags && query.tags.length > 0) {
        versions = versions.filter(v => 
          v.tags.some(tag => query.tags!.includes(tag.label))
        );
      }
    }

    // Sort by timestamp (newest first)
    versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (query?.offset) {
      versions = versions.slice(query.offset);
    }
    if (query?.limit) {
      versions = versions.slice(0, query.limit);
    }

    return versions;
  }

  /**
   * Get a specific version
   */
  getVersion(documentId: string, versionId: string): DocumentVersion | null {
    const storage = this.storage.get(documentId);
    return storage?.versions.get(versionId) || null;
  }

  /**
   * Compare two versions and return differences
   */
  compareVersions(documentId: string, fromVersionId: string, toVersionId: string): VersionDiff | null {
    const storage = this.storage.get(documentId);
    if (!storage) return null;

    const fromVersion = storage.versions.get(fromVersionId);
    const toVersion = storage.versions.get(toVersionId);

    if (!fromVersion || !toVersion) return null;

    const changes = this.calculateChanges(fromVersion.data, toVersion.data);

    const diff: VersionDiff = {
      fromVersionId,
      toVersionId,
      changes,
      timestamp: new Date()
    };

    this.emit('version-compared', diff);
    return diff;
  }

  /**
   * Restore a document to a specific version
   */
  restoreVersion(documentId: string, versionId: string, authorId: string, authorName: string): VersionActionResult {
    const storage = this.storage.get(documentId);
    if (!storage) {
      return { success: false, error: 'Document not initialized' };
    }

    const targetVersion = storage.versions.get(versionId);
    if (!targetVersion) {
      return { success: false, error: 'Version not found' };
    }

    // Create a new version with the restored data
    const result = this.createVersion(
      documentId,
      targetVersion.data,
      authorId,
      authorName,
      `Restored to version ${targetVersion.version}`,
      false,
      [{ id: operationUtils.generateId(), label: 'Restored', color: '#10B981', createdBy: authorId, createdAt: new Date() }]
    );

    if (result.success) {
      this.emit('version-restored', targetVersion);
    }

    return result;
  }

  /**
   * Add a tag to a version
   */
  tagVersion(documentId: string, versionId: string, tag: VersionTag): boolean {
    const storage = this.storage.get(documentId);
    if (!storage) return false;

    const version = storage.versions.get(versionId);
    if (!version) return false;

    // Check if tag already exists
    if (version.tags.some(t => t.label === tag.label)) {
      return false;
    }

    version.tags.push(tag);
    this.emit('version-tagged', versionId, tag);
    return true;
  }

  /**
   * Get metadata for a document's version history
   */
  getMetadata(documentId: string): VersionMetadata | null {
    const storage = this.storage.get(documentId);
    return storage?.metadata || null;
  }

  /**
   * Start automatic versioning for a document
   */
  private startAutoSaveTimer(documentId: string): void {
    const existingTimer = this.timers.get(documentId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(() => {
      // Check if there are pending operations that warrant a version
      const storage = this.storage.get(documentId);
      if (storage) {
        const latestVersionId = storage.versionOrder[storage.versionOrder.length - 1];
        const latestVersion = storage.versions.get(latestVersionId);
        
        if (latestVersion && latestVersion.operationsSinceLastSnapshot.length > 0) {
          // Emit event to trigger auto-save (handled by the consuming component)
          this.emit('auto-save-requested', documentId);
        }
      }
    }, this.config.autoSaveInterval * 60 * 1000);

    this.timers.set(documentId, timer);
  }

  /**
   * Calculate changes between two data objects
   */
  private calculateChanges(oldData: any, newData: any, path: string[] = []): VersionChange[] {
    const changes: VersionChange[] = [];

    // Handle null/undefined cases
    if (oldData === newData) return changes;
    if (oldData == null && newData != null) {
      changes.push({
        type: 'added',
        path,
        pathLabel: this.pathToLabel(path),
        newValue: newData
      });
      return changes;
    }
    if (oldData != null && newData == null) {
      changes.push({
        type: 'deleted',
        path,
        pathLabel: this.pathToLabel(path),
        oldValue: oldData
      });
      return changes;
    }

    // Handle primitives
    if (typeof oldData !== 'object' || typeof newData !== 'object') {
      if (oldData !== newData) {
        changes.push({
          type: 'modified',
          path,
          pathLabel: this.pathToLabel(path),
          oldValue: oldData,
          newValue: newData
        });
      }
      return changes;
    }

    // Handle arrays
    if (Array.isArray(oldData) && Array.isArray(newData)) {
      const maxLength = Math.max(oldData.length, newData.length);
      for (let i = 0; i < maxLength; i++) {
        const itemPath = [...path, i.toString()];
        if (i >= oldData.length) {
          changes.push({
            type: 'added',
            path: itemPath,
            pathLabel: this.pathToLabel(itemPath),
            newValue: newData[i]
          });
        } else if (i >= newData.length) {
          changes.push({
            type: 'deleted',
            path: itemPath,
            pathLabel: this.pathToLabel(itemPath),
            oldValue: oldData[i]
          });
        } else {
          changes.push(...this.calculateChanges(oldData[i], newData[i], itemPath));
        }
      }
      return changes;
    }

    // Handle objects
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    for (const key of allKeys) {
      const keyPath = [...path, key];
      if (!(key in oldData)) {
        changes.push({
          type: 'added',
          path: keyPath,
          pathLabel: this.pathToLabel(keyPath),
          newValue: newData[key]
        });
      } else if (!(key in newData)) {
        changes.push({
          type: 'deleted',
          path: keyPath,
          pathLabel: this.pathToLabel(keyPath),
          oldValue: oldData[key]
        });
      } else {
        changes.push(...this.calculateChanges(oldData[key], newData[key], keyPath));
      }
    }

    return changes;
  }

  /**
   * Convert path array to human-readable label
   */
  private pathToLabel(path: string[]): string {
    if (path.length === 0) return 'Document';
    
    // Handle common itinerary paths
    const segments = path.map(segment => {
      if (segment === 'activities') return 'Activities';
      if (segment === 'accommodations') return 'Accommodations';
      if (segment === 'title') return 'Title';
      if (segment === 'description') return 'Description';
      if (segment === 'notes') return 'Notes';
      if (segment.match(/^\d+$/)) return `Item ${parseInt(segment) + 1}`;
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    });

    return segments.join(' > ');
  }

  /**
   * Summarize changes for metadata
   */
  private summarizeChanges(changes: VersionChange[]): ChangesSummary {
    const addedFields: string[] = [];
    const modifiedFields: string[] = [];
    const deletedFields: string[] = [];

    for (const change of changes) {
      const pathLabel = change.pathLabel;
      switch (change.type) {
        case 'added':
          addedFields.push(pathLabel);
          break;
        case 'modified':
          modifiedFields.push(pathLabel);
          break;
        case 'deleted':
          deletedFields.push(pathLabel);
          break;
      }
    }

    const totalChanges = changes.length;
    let significance: 'minor' | 'moderate' | 'major' = 'minor';
    
    if (totalChanges > 20) significance = 'major';
    else if (totalChanges > 5) significance = 'moderate';

    return {
      addedCount: addedFields.length,
      modifiedCount: modifiedFields.length,
      deletedCount: deletedFields.length,
      addedFields: [...new Set(addedFields)],
      modifiedFields: [...new Set(modifiedFields)],
      deletedFields: [...new Set(deletedFields)],
      significance
    };
  }

  /**
   * Update author activity in metadata
   */
  private updateAuthorActivity(storage: VersionStorage, authorId: string, authorName: string): void {
    const author = storage.metadata.activeAuthors.find(a => a.id === authorId);
    if (author) {
      author.lastActivity = new Date();
    } else {
      storage.metadata.activeAuthors.push({
        id: authorId,
        name: authorName,
        versionsCreated: 0,
        lastActivity: new Date()
      });
    }
  }

  /**
   * Update storage metadata after version creation
   */
  private updateMetadata(storage: VersionStorage, newVersion: DocumentVersion): void {
    storage.metadata.totalVersions++;
    storage.metadata.newestVersion = newVersion.timestamp;
    storage.metadata.totalSize += newVersion.size;

    const author = storage.metadata.activeAuthors.find(a => a.id === newVersion.authorId);
    if (author) {
      author.versionsCreated++;
      author.lastActivity = newVersion.timestamp;
    }
  }

  /**
   * Clean up old versions based on retention policy
   */
  private cleanupOldVersions(storage: VersionStorage): void {
    const { maxVersions, retentionDays, milestoneVersions } = this.config;
    
    // Remove versions beyond max limit (keep milestones)
    if (storage.versionOrder.length > maxVersions) {
      const versionsToCheck = storage.versionOrder.slice(0, storage.versionOrder.length - maxVersions);
      
      for (const versionId of versionsToCheck) {
        const version = storage.versions.get(versionId);
        if (version && !version.isMilestone) {
          storage.versions.delete(versionId);
          storage.versionOrder = storage.versionOrder.filter(id => id !== versionId);
          storage.metadata.totalVersions--;
          storage.metadata.totalSize -= version.size;
        }
      }
    }

    // Remove versions older than retention period (keep milestones)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    for (const versionId of storage.versionOrder) {
      const version = storage.versions.get(versionId);
      if (version && version.timestamp < cutoffDate && !version.isMilestone) {
        storage.versions.delete(versionId);
        storage.versionOrder = storage.versionOrder.filter(id => id !== versionId);
        storage.metadata.totalVersions--;
        storage.metadata.totalSize -= version.size;
      }
    }
  }

  /**
   * Dispose of resources and clear timers
   */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.storage.clear();
    this.removeAllListeners();
  }
}

// Create a default instance
export const createVersionManager = (config?: VersioningConfig) => new VersionManager(config); 