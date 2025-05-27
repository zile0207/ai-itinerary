// Version management components
export { VersionHistoryPanel } from './VersionHistoryPanel';
export { VersionComparisonModal } from './VersionComparisonModal';
export { VersionTagModal } from './VersionTagModal';

// Re-export version types for convenience
export type {
  DocumentVersion,
  VersionDiff,
  VersionChange,
  VersionTag,
  VersionMetadata,
  VersionQuery,
  VersionActionResult,
  VersioningConfig,
  VersionStorage,
  ChangesSummary,
  VersionBranch,
  VersionConflict,
  VersionEvents,
  VersionAction,
  VersionStats
} from '@/lib/versions/types';

// Re-export version manager
export { VersionManager, createVersionManager } from '@/lib/versions/VersionManager';

// Re-export version hook
export { useVersionHistory } from '@/hooks/useVersionHistory';
export type { UseVersionHistoryOptions, UseVersionHistoryReturn } from '@/hooks/useVersionHistory'; 