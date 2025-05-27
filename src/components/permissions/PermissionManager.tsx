import React, { useState, useCallback } from 'react';
import { Plus, Settings, Users, Shield, Clock, Mail, MoreVertical, Trash2, Edit, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/usePermissions';
import { Role, Permission, UserPermission, TimeBasedAccess } from '@/types/permissions';
import { RoleSelector } from './RoleSelector';
import { PermissionMatrix } from './PermissionMatrix';
import { InviteUsers } from './InviteUsers';

interface PermissionManagerProps {
  resourceId: string;
  resourceType: 'trip' | 'itinerary' | 'activity' | 'comment';
  className?: string;
}

interface EditUserModalState {
  isOpen: boolean;
  user: UserPermission | null;
}

export function PermissionManager({ resourceId, resourceType, className }: PermissionManagerProps) {
  const {
    permissions,
    loading,
    error,
    currentUserRole,
    can,
    changeUserRole,
    removeUser,
    inviteUser,
    reload,
  } = usePermissions({ resourceId, resourceType });

  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'settings'>('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState<EditUserModalState>({
    isOpen: false,
    user: null,
  });
  const [isInviting, setIsInviting] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const canManagePermissions = can(Permission.MANAGE_PERMISSIONS);
  const canInviteUsers = can(Permission.INVITE_USERS);
  const canRemoveUsers = can(Permission.REMOVE_USERS);

  // Role display configuration
  const roleConfig = {
    [Role.OWNER]: { label: 'Owner', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    [Role.ADMIN]: { label: 'Admin', color: 'bg-red-100 text-red-800 border-red-200' },
    [Role.EDITOR]: { label: 'Editor', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    [Role.COMMENTER]: { label: 'Commenter', color: 'bg-green-100 text-green-800 border-green-200' },
    [Role.VIEWER]: { label: 'Viewer', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  };

  const formatTimeBasedAccess = (timeAccess?: TimeBasedAccess): string => {
    if (!timeAccess) return 'Always';
    
    const parts: string[] = [];
    
    if (timeAccess.validFrom || timeAccess.validUntil) {
      if (timeAccess.validFrom && timeAccess.validUntil) {
        parts.push(`${timeAccess.validFrom.toLocaleDateString()} - ${timeAccess.validUntil.toLocaleDateString()}`);
      } else if (timeAccess.validFrom) {
        parts.push(`From ${timeAccess.validFrom.toLocaleDateString()}`);
      } else if (timeAccess.validUntil) {
        parts.push(`Until ${timeAccess.validUntil.toLocaleDateString()}`);
      }
    }
    
    if (timeAccess.allowedHours) {
      parts.push(`${timeAccess.allowedHours.start}-${timeAccess.allowedHours.end}`);
    }
    
    if (timeAccess.allowedDays && timeAccess.allowedDays.length < 7) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const allowedDayNames = timeAccess.allowedDays.map(d => dayNames[d]).join(', ');
      parts.push(allowedDayNames);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Always';
  };

  const handleInviteUser = useCallback(async (
    email: string,
    role: Role,
    timeBasedAccess?: TimeBasedAccess
  ) => {
    setIsInviting(true);
    try {
      await inviteUser(email, role, { timeBasedAccess });
      setShowInviteModal(false);
    } catch (error) {
      console.error('Failed to invite user:', error);
    } finally {
      setIsInviting(false);
    }
  }, [inviteUser]);

  const handleChangeUserRole = useCallback(async (userId: string, newRole: Role) => {
    setIsUpdatingUser(true);
    try {
      await changeUserRole(userId, newRole);
      setEditUserModal({ isOpen: false, user: null });
    } catch (error) {
      console.error('Failed to change user role:', error);
    } finally {
      setIsUpdatingUser(false);
    }
  }, [changeUserRole]);

  const handleRemoveUser = useCallback(async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;
    
    try {
      await removeUser(userId);
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  }, [removeUser]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading permissions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button onClick={reload} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!permissions) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-sm text-gray-600 text-center">No permissions data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Permissions</span>
            </CardTitle>
            <CardDescription>
              Manage user access and roles for this {resourceType}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {canManagePermissions && (
              <Button onClick={reload} variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            )}
            {canInviteUsers && (
              <Button onClick={() => setShowInviteModal(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Invite
              </Button>
            )}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4">
          <Button
            variant={activeTab === 'users' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('users')}
          >
            <Users className="h-4 w-4 mr-1" />
            Users ({permissions.users.length})
          </Button>
          <Button
            variant={activeTab === 'roles' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('roles')}
          >
            <Shield className="h-4 w-4 mr-1" />
            Roles & Permissions
          </Button>
          {canManagePermissions && (
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {activeTab === 'users' && (
          <div className="space-y-4">
            {permissions.users.map((userPermission) => (
              <div
                key={userPermission.userId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userPermission.user?.avatar} />
                    <AvatarFallback>
                      {userPermission.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm">
                        {userPermission.user?.name || userPermission.userId}
                      </p>
                      {!userPermission.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{userPermission.user?.email}</p>
                    {userPermission.timeBasedAccess && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {formatTimeBasedAccess(userPermission.timeBasedAccess)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge className={roleConfig[userPermission.role].color}>
                    {roleConfig[userPermission.role].label}
                  </Badge>
                  
                  {userPermission.role === currentUserRole && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}

                  {canManagePermissions && userPermission.role !== Role.OWNER && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditUserModal({ isOpen: true, user: userPermission })}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {canRemoveUsers && (
                          <DropdownMenuItem
                            onClick={() => handleRemoveUser(userPermission.userId)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}

            {permissions.users.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No users have access to this {resourceType}</p>
                {canInviteUsers && (
                  <Button onClick={() => setShowInviteModal(true)} variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Users
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'roles' && (
          <PermissionMatrix resourceType={resourceType} />
        )}

        {activeTab === 'settings' && canManagePermissions && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Inheritance Settings</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={permissions.inheritanceRules.inheritFromParent}
                    className="rounded border-gray-300"
                    readOnly
                  />
                  <span className="text-sm">Inherit permissions from parent resource</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={permissions.inheritanceRules.cascadeToChildren}
                    className="rounded border-gray-300"
                    readOnly
                  />
                  <span className="text-sm">Apply permissions to child resources</span>
                </label>
              </div>
            </div>

            {permissions.publicAccess && (
              <div>
                <h4 className="text-sm font-medium mb-3">Public Access</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={permissions.publicAccess.enabled}
                      className="rounded border-gray-300"
                      readOnly
                    />
                    <span className="text-sm">Allow public access</span>
                  </label>
                  {permissions.publicAccess.enabled && (
                    <div className="ml-6">
                      <Label className="text-xs text-gray-600">Public role</Label>
                      <Badge className={roleConfig[permissions.publicAccess.role].color}>
                        {roleConfig[permissions.publicAccess.role].label}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Invite User Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to collaborate on this {resourceType}
            </DialogDescription>
          </DialogHeader>
          <InviteUsers
            onInvite={handleInviteUser}
            isLoading={isInviting}
            onCancel={() => setShowInviteModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog 
        open={editUserModal.isOpen} 
        onOpenChange={(open) => setEditUserModal({ isOpen: open, user: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {editUserModal.user?.user?.name}
            </DialogDescription>
          </DialogHeader>
          {editUserModal.user && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={editUserModal.user.user?.avatar} />
                  <AvatarFallback>
                    {editUserModal.user.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{editUserModal.user.user?.name}</p>
                  <p className="text-sm text-gray-600">{editUserModal.user.user?.email}</p>
                </div>
              </div>
              
              <RoleSelector
                currentRole={editUserModal.user.role}
                onRoleChange={(newRole) => handleChangeUserRole(editUserModal.user!.userId, newRole)}
                disabled={isUpdatingUser}
                excludeRoles={[Role.OWNER]} // Only owners can assign owner role
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditUserModal({ isOpen: false, user: null })}
              disabled={isUpdatingUser}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 