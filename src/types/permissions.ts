export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin', 
  EDITOR = 'editor',
  COMMENTER = 'commenter',
  VIEWER = 'viewer'
}

export enum Permission {
  // Read permissions
  VIEW_TRIP = 'view_trip',
  VIEW_ITINERARY = 'view_itinerary',
  VIEW_ACTIVITIES = 'view_activities',
  VIEW_COMMENTS = 'view_comments',
  VIEW_HISTORY = 'view_history',
  
  // Write permissions
  EDIT_TRIP = 'edit_trip',
  EDIT_ITINERARY = 'edit_itinerary', 
  EDIT_ACTIVITIES = 'edit_activities',
  CREATE_ACTIVITIES = 'create_activities',
  DELETE_ACTIVITIES = 'delete_activities',
  
  // Comment permissions
  ADD_COMMENTS = 'add_comments',
  EDIT_COMMENTS = 'edit_comments',
  DELETE_COMMENTS = 'delete_comments',
  RESOLVE_COMMENTS = 'resolve_comments',
  
  // Version control permissions
  CREATE_VERSIONS = 'create_versions',
  ROLLBACK_VERSIONS = 'rollback_versions',
  DELETE_VERSIONS = 'delete_versions',
  
  // Collaboration permissions
  INVITE_USERS = 'invite_users',
  MANAGE_PERMISSIONS = 'manage_permissions',
  REMOVE_USERS = 'remove_users',
  
  // Advanced permissions
  EXPORT_TRIP = 'export_trip',
  DELETE_TRIP = 'delete_trip',
  TRANSFER_OWNERSHIP = 'transfer_ownership'
}

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
  inherits?: Role[];
}

export interface TimeBasedAccess {
  validFrom?: Date;
  validUntil?: Date;
  timezone?: string;
  allowedHours?: {
    start: string; // HH:mm format
    end: string;
  };
  allowedDays?: number[]; // 0-6 (Sunday-Saturday)
}

export interface UserPermission {
  userId: string;
  user?: User;
  role: Role;
  grantedBy: string;
  grantedAt: Date;
  timeBasedAccess?: TimeBasedAccess;
  customPermissions?: {
    granted: Permission[];
    revoked: Permission[];
  };
  isActive: boolean;
}

export interface ResourcePermissions {
  resourceId: string;
  resourceType: 'trip' | 'itinerary' | 'activity' | 'comment';
  parentResourceId?: string; // For inheritance
  users: UserPermission[];
  publicAccess?: {
    enabled: boolean;
    role: Role;
    timeBasedAccess?: TimeBasedAccess;
  };
  inheritanceRules: {
    inheritFromParent: boolean;
    overrideParentPermissions: boolean;
    cascadeToChildren: boolean;
  };
}

export interface PermissionCheck {
  userId: string;
  resourceId: string;
  resourceType: string;
  permission: Permission;
  result: boolean;
  reason?: string;
  effectiveRole?: Role;
  source: 'direct' | 'inherited' | 'public' | 'denied';
}

export interface PermissionChangeEvent {
  type: 'permission_granted' | 'permission_revoked' | 'role_changed' | 'user_added' | 'user_removed';
  resourceId: string;
  resourceType: string;
  userId?: string;
  oldRole?: Role;
  newRole?: Role;
  permissions?: Permission[];
  triggeredBy: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PermissionContext {
  currentUser: User;
  resourcePermissions: Map<string, ResourcePermissions>;
  roleDefinitions: Map<Role, RolePermissions>;
  checkPermission: (resourceId: string, permission: Permission, userId?: string) => PermissionCheck;
  getUserRole: (resourceId: string, userId?: string) => Role | null;
  hasAnyPermission: (resourceId: string, permissions: Permission[], userId?: string) => boolean;
  updatePermissions: (resourceId: string, updates: Partial<ResourcePermissions>) => Promise<void>;
  inviteUser: (resourceId: string, email: string, role: Role, options?: { timeBasedAccess?: TimeBasedAccess }) => Promise<void>;
  removeUser: (resourceId: string, userId: string) => Promise<void>;
  changeUserRole: (resourceId: string, userId: string, newRole: Role) => Promise<void>;
}

export interface PermissionAuditLog {
  id: string;
  resourceId: string;
  resourceType: string;
  action: string;
  userId: string;
  targetUserId?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  roleAssignments: Array<{
    role: Role;
    autoAssign?: boolean;
    defaultTimeBasedAccess?: TimeBasedAccess;
  }>;
  inheritanceRules: ResourcePermissions['inheritanceRules'];
  publicAccess?: ResourcePermissions['publicAccess'];
}

export interface InvitationToken {
  id: string;
  resourceId: string;
  resourceType: string;
  email: string;
  role: Role;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  timeBasedAccess?: TimeBasedAccess;
  isActive: boolean;
  token: string;
}

// Default role permissions configuration
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  [Role.OWNER]: {
    role: Role.OWNER,
    permissions: Object.values(Permission),
  },
  [Role.ADMIN]: {
    role: Role.ADMIN,
    permissions: [
      Permission.VIEW_TRIP,
      Permission.VIEW_ITINERARY,
      Permission.VIEW_ACTIVITIES,
      Permission.VIEW_COMMENTS,
      Permission.VIEW_HISTORY,
      Permission.EDIT_TRIP,
      Permission.EDIT_ITINERARY,
      Permission.EDIT_ACTIVITIES,
      Permission.CREATE_ACTIVITIES,
      Permission.DELETE_ACTIVITIES,
      Permission.ADD_COMMENTS,
      Permission.EDIT_COMMENTS,
      Permission.DELETE_COMMENTS,
      Permission.RESOLVE_COMMENTS,
      Permission.CREATE_VERSIONS,
      Permission.ROLLBACK_VERSIONS,
      Permission.INVITE_USERS,
      Permission.MANAGE_PERMISSIONS,
      Permission.REMOVE_USERS,
      Permission.EXPORT_TRIP,
    ],
  },
  [Role.EDITOR]: {
    role: Role.EDITOR,
    permissions: [
      Permission.VIEW_TRIP,
      Permission.VIEW_ITINERARY,
      Permission.VIEW_ACTIVITIES,
      Permission.VIEW_COMMENTS,
      Permission.VIEW_HISTORY,
      Permission.EDIT_ITINERARY,
      Permission.EDIT_ACTIVITIES,
      Permission.CREATE_ACTIVITIES,
      Permission.ADD_COMMENTS,
      Permission.EDIT_COMMENTS,
      Permission.RESOLVE_COMMENTS,
      Permission.CREATE_VERSIONS,
      Permission.EXPORT_TRIP,
    ],
  },
  [Role.COMMENTER]: {
    role: Role.COMMENTER,
    permissions: [
      Permission.VIEW_TRIP,
      Permission.VIEW_ITINERARY,
      Permission.VIEW_ACTIVITIES,
      Permission.VIEW_COMMENTS,
      Permission.VIEW_HISTORY,
      Permission.ADD_COMMENTS,
      Permission.EDIT_COMMENTS,
      Permission.EXPORT_TRIP,
    ],
  },
  [Role.VIEWER]: {
    role: Role.VIEWER,
    permissions: [
      Permission.VIEW_TRIP,
      Permission.VIEW_ITINERARY,
      Permission.VIEW_ACTIVITIES,
      Permission.VIEW_COMMENTS,
      Permission.VIEW_HISTORY,
      Permission.EXPORT_TRIP,
    ],
  },
};

// Utility type for permission checking
export type PermissionCheckFunction = (permission: Permission) => boolean;
export type MultiPermissionCheckFunction = (...permissions: Permission[]) => boolean; 