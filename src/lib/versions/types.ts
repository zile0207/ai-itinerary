export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  data: any; // Complete document snapshot
  timestamp: Date;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  description?: string;
  tags: VersionTag[];
  operationsSinceLastSnapshot: string[]; // Operation IDs
  previousVersionId?: string;
  
  // Metadata
  size: number; // Serialized size in bytes
  isAutoSave: boolean;
  isMilestone: boolean;
  changesSummary: ChangesSummary;
}

export interface VersionTag {
  id: string;
  label: string;
  color: string;
  createdBy: string;
  createdAt: Date;
}

export interface ChangesSummary {
  addedCount: number;
  modifiedCount: number;
  deletedCount: number;
  addedFields: string[];
  modifiedFields: string[];
  deletedFields: string[];
  significance: 'minor' | 'moderate' | 'major';
}

export interface VersionDiff {
  fromVersionId: string;
  toVersionId: string;
  changes: VersionChange[];
  timestamp: Date;
}

export interface VersionChange {
  type: 'added' | 'modified' | 'deleted' | 'moved';
  path: string[];
  pathLabel: string; // Human-readable field name
  oldValue?: any;
  newValue?: any;
  context?: string; // Additional context for the change
}

export interface VersionMetadata {
  documentId: string;
  totalVersions: number;
  oldestVersion: Date;
  newestVersion: Date;
  totalSize: number; // Total storage used
  totalOperations: number;
  activeAuthors: Array<{
    id: string;
    name: string;
    versionsCreated: number;
    lastActivity: Date;
  }>;
}

export interface VersionStorage {
  documentId: string;
  versions: Map<string, DocumentVersion>;
  operationHistory: Map<string, any>; // Operation ID -> Operation
  versionOrder: string[]; // Ordered list of version IDs
  metadata: VersionMetadata;
}

export interface VersioningConfig {
  autoSaveInterval: number; // Minutes between auto-saves
  maxVersions: number; // Maximum versions to retain
  compressionEnabled: boolean;
  retentionDays: number; // Days to keep versions
  milestoneVersions: number; // How many milestone versions to keep
}

export interface VersionBranch {
  id: string;
  name: string;
  parentVersionId: string;
  headVersionId: string;
  createdBy: string;
  createdAt: Date;
  mergedAt?: Date;
  mergedBy?: string;
  description?: string;
}

export interface VersionConflict {
  id: string;
  branchId: string;
  conflictingVersions: string[];
  conflictingPaths: string[];
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: 'manual' | 'auto-merge' | 'abort';
}

// Event types for version history
export interface VersionEvents {
  'version-created': (version: DocumentVersion) => void;
  'version-deleted': (versionId: string) => void;
  'version-restored': (version: DocumentVersion) => void;
  'version-tagged': (versionId: string, tag: VersionTag) => void;
  'version-compared': (diff: VersionDiff) => void;
  'branch-created': (branch: VersionBranch) => void;
  'branch-merged': (branchId: string, targetVersionId: string) => void;
  'conflict-detected': (conflict: VersionConflict) => void;
  'conflict-resolved': (conflictId: string, resolution: string) => void;
}

// Utility types
export type VersionAction = 'create' | 'restore' | 'delete' | 'tag' | 'compare' | 'branch' | 'merge';

export interface VersionActionResult {
  success: boolean;
  versionId?: string;
  error?: string;
  changes?: VersionChange[];
}

export interface VersionQuery {
  documentId: string;
  authorId?: string;
  fromDate?: Date;
  toDate?: Date;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface VersionStats {
  documentId: string;
  period: 'day' | 'week' | 'month' | 'year';
  versionsCreated: number;
  collaborators: number;
  totalChanges: number;
  significantChanges: number;
  averageTimesBetweenVersions: number;
} 