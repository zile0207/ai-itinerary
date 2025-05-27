import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/lib/socket/client';
import {
  Role,
  Permission,
  ResourcePermissions,
  UserPermission,
  PermissionCheck,
  PermissionChangeEvent,
  TimeBasedAccess,
  DEFAULT_ROLE_PERMISSIONS,
  User,
  PermissionCheckFunction,
  MultiPermissionCheckFunction,
} from '@/types/permissions';

interface UsePermissionsOptions {
  resourceId: string;
  resourceType: 'trip' | 'itinerary' | 'activity' | 'comment';
  autoRefresh?: boolean;
  cacheTimeout?: number; // in milliseconds
}

interface PermissionsState {
  permissions: ResourcePermissions | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface PermissionCache {
  [key: string]: {
    result: PermissionCheck;
    timestamp: number;
  };
}

export function usePermissions(options: UsePermissionsOptions) {
  const { resourceId, resourceType, autoRefresh = true, cacheTimeout = 5000 } = options;
  const { user: currentUser } = useAuth();
  const socket = getSocket();
  
  const [state, setState] = useState<PermissionsState>({
    permissions: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const permissionCache = useRef<PermissionCache>({});
  const eventListenersRegistered = useRef(false);

  // Generate cache key for permission checks
  const getCacheKey = useCallback((userId: string, permission: Permission) => {
    return `${resourceId}:${userId}:${permission}`;
  }, [resourceId]);

  // Clear expired cache entries
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    Object.keys(permissionCache.current).forEach(key => {
      if (now - permissionCache.current[key].timestamp > cacheTimeout) {
        delete permissionCache.current[key];
      }
    });
  }, [cacheTimeout]);

  // Check if time-based access is valid
  const isTimeBasedAccessValid = useCallback((timeBasedAccess?: TimeBasedAccess): boolean => {
    if (!timeBasedAccess) return true;

    const now = new Date();
    
    // Check date range
    if (timeBasedAccess.validFrom && now < timeBasedAccess.validFrom) return false;
    if (timeBasedAccess.validUntil && now > timeBasedAccess.validUntil) return false;

    // Check allowed days
    if (timeBasedAccess.allowedDays) {
      const currentDay = now.getDay();
      if (!timeBasedAccess.allowedDays.includes(currentDay)) return false;
    }

    // Check allowed hours
    if (timeBasedAccess.allowedHours) {
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = timeBasedAccess.allowedHours;
      
      if (start <= end) {
        // Same day range
        if (currentTime < start || currentTime > end) return false;
      } else {
        // Overnight range
        if (currentTime < start && currentTime > end) return false;
      }
    }

    return true;
  }, []);

  // Core permission checking logic
  const checkPermission = useCallback((
    targetResourceId: string,
    permission: Permission,
    userId?: string
  ): PermissionCheck => {
    const checkUserId = userId || currentUser?.id;
    if (!checkUserId || !state.permissions) {
      return {
        userId: checkUserId || '',
        resourceId: targetResourceId,
        resourceType,
        permission,
        result: false,
        reason: 'User not authenticated or permissions not loaded',
        source: 'denied',
      };
    }

    // Check cache first
    const cacheKey = getCacheKey(checkUserId, permission);
    const cached = permissionCache.current[cacheKey];
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.result;
    }

    // Find user permission
    const userPermission = state.permissions.users.find(up => up.userId === checkUserId);
    
    // If no direct permission, check public access
    if (!userPermission) {
      if (state.permissions.publicAccess?.enabled) {
        const publicRole = state.permissions.publicAccess.role;
        const rolePermissions = DEFAULT_ROLE_PERMISSIONS[publicRole];
        
        if (rolePermissions.permissions.includes(permission)) {
          // Check time-based access for public access
          if (isTimeBasedAccessValid(state.permissions.publicAccess.timeBasedAccess)) {
            const result: PermissionCheck = {
              userId: checkUserId,
              resourceId: targetResourceId,
              resourceType,
              permission,
              result: true,
              effectiveRole: publicRole,
              source: 'public',
            };
            
            // Cache the result
            permissionCache.current[cacheKey] = {
              result,
              timestamp: Date.now(),
            };
            
            return result;
          }
        }
      }

      // Check inheritance from parent resource
      if (state.permissions.inheritanceRules.inheritFromParent && state.permissions.parentResourceId) {
        // In a full implementation, this would recursively check parent permissions
        // For now, we'll mark it as inherited but denied
        const result: PermissionCheck = {
          userId: checkUserId,
          resourceId: targetResourceId,
          resourceType,
          permission,
          result: false,
          reason: 'No direct access and inheritance not implemented',
          source: 'inherited',
        };

        permissionCache.current[cacheKey] = {
          result,
          timestamp: Date.now(),
        };

        return result;
      }

      const result: PermissionCheck = {
        userId: checkUserId,
        resourceId: targetResourceId,
        resourceType,
        permission,
        result: false,
        reason: 'User not found in resource permissions',
        source: 'denied',
      };

      permissionCache.current[cacheKey] = {
        result,
        timestamp: Date.now(),
      };

      return result;
    }

    // Check if user permission is active
    if (!userPermission.isActive) {
      const result: PermissionCheck = {
        userId: checkUserId,
        resourceId: targetResourceId,
        resourceType,
        permission,
        result: false,
        reason: 'User permission is inactive',
        effectiveRole: userPermission.role,
        source: 'denied',
      };

      permissionCache.current[cacheKey] = {
        result,
        timestamp: Date.now(),
      };

      return result;
    }

    // Check time-based access
    if (!isTimeBasedAccessValid(userPermission.timeBasedAccess)) {
      const result: PermissionCheck = {
        userId: checkUserId,
        resourceId: targetResourceId,
        resourceType,
        permission,
        result: false,
        reason: 'Outside allowed time window',
        effectiveRole: userPermission.role,
        source: 'denied',
      };

      permissionCache.current[cacheKey] = {
        result,
        timestamp: Date.now(),
      };

      return result;
    }

    // Check custom permissions first (grants and revokes)
    if (userPermission.customPermissions) {
      if (userPermission.customPermissions.revoked.includes(permission)) {
        const result: PermissionCheck = {
          userId: checkUserId,
          resourceId: targetResourceId,
          resourceType,
          permission,
          result: false,
          reason: 'Permission explicitly revoked',
          effectiveRole: userPermission.role,
          source: 'direct',
        };

        permissionCache.current[cacheKey] = {
          result,
          timestamp: Date.now(),
        };

        return result;
      }

      if (userPermission.customPermissions.granted.includes(permission)) {
        const result: PermissionCheck = {
          userId: checkUserId,
          resourceId: targetResourceId,
          resourceType,
          permission,
          result: true,
          effectiveRole: userPermission.role,
          source: 'direct',
        };

        permissionCache.current[cacheKey] = {
          result,
          timestamp: Date.now(),
        };

        return result;
      }
    }

    // Check role-based permissions
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[userPermission.role];
    const hasPermission = rolePermissions.permissions.includes(permission);

    const result: PermissionCheck = {
      userId: checkUserId,
      resourceId: targetResourceId,
      resourceType,
      permission,
      result: hasPermission,
      reason: hasPermission ? undefined : `Role ${userPermission.role} does not have permission ${permission}`,
      effectiveRole: userPermission.role,
      source: 'direct',
    };

    // Cache the result
    permissionCache.current[cacheKey] = {
      result,
      timestamp: Date.now(),
    };

    return result;
  }, [state.permissions, currentUser?.id, resourceType, getCacheKey, cacheTimeout, isTimeBasedAccessValid]);

  // Get user's role for a resource
  const getUserRole = useCallback((targetResourceId: string, userId?: string): Role | null => {
    const checkUserId = userId || currentUser?.id;
    if (!checkUserId || !state.permissions) return null;

    const userPermission = state.permissions.users.find(up => up.userId === checkUserId);
    return userPermission?.role || null;
  }, [state.permissions, currentUser?.id]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((
    targetResourceId: string,
    permissions: Permission[],
    userId?: string
  ): boolean => {
    return permissions.some(permission => 
      checkPermission(targetResourceId, permission, userId).result
    );
  }, [checkPermission]);

  // Permission checking functions for current resource
  const can: PermissionCheckFunction = useCallback((permission: Permission) => {
    return checkPermission(resourceId, permission).result;
  }, [checkPermission, resourceId]);

  const canAny: MultiPermissionCheckFunction = useCallback((...permissions: Permission[]) => {
    return hasAnyPermission(resourceId, permissions);
  }, [hasAnyPermission, resourceId]);

  const canAll: MultiPermissionCheckFunction = useCallback((...permissions: Permission[]) => {
    return permissions.every(permission => can(permission));
  }, [can]);

  // Current user's role
  const currentUserRole = useMemo(() => {
    return getUserRole(resourceId);
  }, [getUserRole, resourceId]);

  // Load permissions from API
  const loadPermissions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

             // In a real implementation, this would be an API call
       // For now, we'll simulate with mock data
       const currentUserForPermissions: User | undefined = currentUser ? {
         id: currentUser.id,
         name: `${currentUser.firstName} ${currentUser.lastName}`,
         email: currentUser.email,
         avatar: currentUser.profilePicture,
       } : undefined;

       const mockPermissions: ResourcePermissions = {
         resourceId,
         resourceType,
         users: [
           {
             userId: currentUser?.id || '',
             user: currentUserForPermissions,
             role: Role.OWNER,
             grantedBy: 'system',
             grantedAt: new Date(),
             isActive: true,
           },
         ],
        inheritanceRules: {
          inheritFromParent: false,
          overrideParentPermissions: false,
          cascadeToChildren: true,
        },
      };

      setState({
        permissions: mockPermissions,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });

      // Clear cache when permissions reload
      permissionCache.current = {};
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load permissions',
      }));
    }
  }, [resourceId, resourceType, currentUser]);

  // Update permissions (for permission changes)
  const updatePermissions = useCallback(async (updates: Partial<ResourcePermissions>) => {
    if (!state.permissions) return;

    try {
      const updatedPermissions = { ...state.permissions, ...updates };
      
      // In a real implementation, this would be an API call
      // For now, we'll update local state
      setState(prev => ({
        ...prev,
        permissions: updatedPermissions,
        lastUpdated: new Date(),
      }));

      // Clear cache when permissions change
      permissionCache.current = {};

      // Emit permission change event via Socket.io
      if (socket) {
        const event: PermissionChangeEvent = {
          type: 'permission_granted', // This would be determined by the specific update
          resourceId,
          resourceType,
          triggeredBy: currentUser?.id || '',
          timestamp: new Date(),
        };
        
        socket.emit('permission-changed', event);
      }
    } catch (error) {
      console.error('Failed to update permissions:', error);
      throw error;
    }
  }, [state.permissions, resourceId, resourceType, socket, currentUser?.id]);

  // Invite user to resource
  const inviteUser = useCallback(async (
    email: string,
    role: Role,
    options?: { timeBasedAccess?: TimeBasedAccess }
  ) => {
    try {
      // In a real implementation, this would be an API call
      const newUserPermission: UserPermission = {
        userId: `temp-${Date.now()}`, // Would be real user ID from API
        role,
        grantedBy: currentUser?.id || '',
        grantedAt: new Date(),
        timeBasedAccess: options?.timeBasedAccess,
        isActive: true,
      };

      const updatedUsers = [...(state.permissions?.users || []), newUserPermission];
      await updatePermissions({ users: updatedUsers });

      // Emit invitation event
      if (socket) {
        socket.emit('user-invited', {
          resourceId,
          resourceType,
          email,
          role,
          invitedBy: currentUser?.id,
        });
      }
    } catch (error) {
      console.error('Failed to invite user:', error);
      throw error;
    }
  }, [state.permissions?.users, updatePermissions, resourceId, resourceType, socket, currentUser?.id]);

  // Remove user from resource
  const removeUser = useCallback(async (userId: string) => {
    if (!state.permissions) return;

    try {
      const updatedUsers = state.permissions.users.filter(up => up.userId !== userId);
      await updatePermissions({ users: updatedUsers });

      // Emit user removal event
      if (socket) {
        socket.emit('user-removed', {
          resourceId,
          resourceType,
          userId,
          removedBy: currentUser?.id,
        });
      }
    } catch (error) {
      console.error('Failed to remove user:', error);
      throw error;
    }
  }, [state.permissions, updatePermissions, resourceId, resourceType, socket, currentUser?.id]);

  // Change user role
  const changeUserRole = useCallback(async (userId: string, newRole: Role) => {
    if (!state.permissions) return;

    try {
      const updatedUsers = state.permissions.users.map(up => 
        up.userId === userId ? { ...up, role: newRole } : up
      );
      await updatePermissions({ users: updatedUsers });

      // Emit role change event
      if (socket) {
        const oldRole = state.permissions.users.find(up => up.userId === userId)?.role;
        socket.emit('role-changed', {
          resourceId,
          resourceType,
          userId,
          oldRole,
          newRole,
          changedBy: currentUser?.id,
        });
      }
    } catch (error) {
      console.error('Failed to change user role:', error);
      throw error;
    }
  }, [state.permissions, updatePermissions, resourceId, resourceType, socket, currentUser?.id]);

  // Setup Socket.io event listeners
  useEffect(() => {
    if (!socket || eventListenersRegistered.current) return;

    const handlePermissionChanged = (event: PermissionChangeEvent) => {
      if (event.resourceId === resourceId) {
        // Reload permissions when they change
        loadPermissions();
      }
    };

    const handleUserInvited = (data: any) => {
      if (data.resourceId === resourceId) {
        loadPermissions();
      }
    };

    const handleUserRemoved = (data: any) => {
      if (data.resourceId === resourceId) {
        loadPermissions();
      }
    };

    const handleRoleChanged = (data: any) => {
      if (data.resourceId === resourceId) {
        loadPermissions();
      }
    };

    socket.on('permission-changed', handlePermissionChanged);
    socket.on('user-invited', handleUserInvited);
    socket.on('user-removed', handleUserRemoved);
    socket.on('role-changed', handleRoleChanged);

    eventListenersRegistered.current = true;

    return () => {
      socket.off('permission-changed', handlePermissionChanged);
      socket.off('user-invited', handleUserInvited);
      socket.off('user-removed', handleUserRemoved);
      socket.off('role-changed', handleRoleChanged);
      eventListenersRegistered.current = false;
    };
  }, [socket, resourceId, loadPermissions]);

  // Load permissions on mount and when resourceId changes
  useEffect(() => {
    if (currentUser) {
      loadPermissions();
    }
  }, [currentUser, loadPermissions]);

  // Auto-refresh permissions
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      clearExpiredCache();
      if (!state.loading) {
        loadPermissions();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, state.loading, loadPermissions, clearExpiredCache]);

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      permissionCache.current = {};
    };
  }, []);

  return {
    // State
    permissions: state.permissions,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    currentUserRole,

    // Permission checking functions
    checkPermission,
    getUserRole,
    hasAnyPermission,
    can,
    canAny,
    canAll,

    // Permission management functions
    updatePermissions,
    inviteUser,
    removeUser,
    changeUserRole,
    
    // Utility functions
    reload: loadPermissions,
    clearCache: () => { permissionCache.current = {}; },
  };
} 