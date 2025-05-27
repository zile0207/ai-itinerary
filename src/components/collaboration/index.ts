// User presence components
export { UserAvatar } from './UserAvatar';
export { UserPresenceList } from './UserPresenceList';
export { TypingIndicator } from './TypingIndicator';

// Real-time sync components  
export { SyncStatus } from './SyncStatus';
export { ConflictResolver } from './ConflictResolver';
export { EditLockIndicator } from './EditLockIndicator';
export { CollaborativeTextInput } from './CollaborativeTextInput';

// Re-export types
export type { UserPresence } from '@/lib/socket/client';
export type { EditingUser, EditLockIndicatorProps } from './EditLockIndicator';
export type { ConflictData, ConflictResolverProps } from './ConflictResolver';
export type { SyncStatusProps } from './SyncStatus';
export type { CollaborativeTextInputProps } from './CollaborativeTextInput'; 