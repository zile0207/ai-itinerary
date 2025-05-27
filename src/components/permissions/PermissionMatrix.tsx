import React, { useState } from 'react';
import { Check, X, Eye, Edit, MessageCircle, Settings, Crown, Shield, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Role, Permission, DEFAULT_ROLE_PERMISSIONS } from '@/types/permissions';

interface PermissionMatrixProps {
  resourceType: 'trip' | 'itinerary' | 'activity' | 'comment';
  className?: string;
}

type PermissionCategory = 'read' | 'write' | 'comment' | 'version' | 'collaboration' | 'admin';

export function PermissionMatrix({ resourceType, className }: PermissionMatrixProps) {
  const [filterCategory, setFilterCategory] = useState<PermissionCategory | 'all'>('all');

  const roleConfig = {
    [Role.OWNER]: {
      label: 'Owner',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: Crown,
    },
    [Role.ADMIN]: {
      label: 'Admin',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: Settings,
    },
    [Role.EDITOR]: {
      label: 'Editor',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Edit,
    },
    [Role.COMMENTER]: {
      label: 'Commenter',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: MessageCircle,
    },
    [Role.VIEWER]: {
      label: 'Viewer',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: Eye,
    },
  };

  const permissionCategories: Record<PermissionCategory, { label: string; permissions: Permission[] }> = {
    read: {
      label: 'Read Permissions',
      permissions: [
        Permission.VIEW_TRIP,
        Permission.VIEW_ITINERARY,
        Permission.VIEW_ACTIVITIES,
        Permission.VIEW_COMMENTS,
        Permission.VIEW_HISTORY,
      ],
    },
    write: {
      label: 'Write Permissions',
      permissions: [
        Permission.EDIT_TRIP,
        Permission.EDIT_ITINERARY,
        Permission.EDIT_ACTIVITIES,
        Permission.CREATE_ACTIVITIES,
        Permission.DELETE_ACTIVITIES,
      ],
    },
    comment: {
      label: 'Comment Permissions',
      permissions: [
        Permission.ADD_COMMENTS,
        Permission.EDIT_COMMENTS,
        Permission.DELETE_COMMENTS,
        Permission.RESOLVE_COMMENTS,
      ],
    },
    version: {
      label: 'Version Control',
      permissions: [
        Permission.CREATE_VERSIONS,
        Permission.ROLLBACK_VERSIONS,
        Permission.DELETE_VERSIONS,
      ],
    },
    collaboration: {
      label: 'Collaboration',
      permissions: [
        Permission.INVITE_USERS,
        Permission.MANAGE_PERMISSIONS,
        Permission.REMOVE_USERS,
      ],
    },
    admin: {
      label: 'Administrative',
      permissions: [
        Permission.EXPORT_TRIP,
        Permission.DELETE_TRIP,
        Permission.TRANSFER_OWNERSHIP,
      ],
    },
  };

  const permissionLabels: Record<Permission, string> = {
    [Permission.VIEW_TRIP]: 'View Trip',
    [Permission.VIEW_ITINERARY]: 'View Itinerary',
    [Permission.VIEW_ACTIVITIES]: 'View Activities',
    [Permission.VIEW_COMMENTS]: 'View Comments',
    [Permission.VIEW_HISTORY]: 'View History',
    [Permission.EDIT_TRIP]: 'Edit Trip',
    [Permission.EDIT_ITINERARY]: 'Edit Itinerary',
    [Permission.EDIT_ACTIVITIES]: 'Edit Activities',
    [Permission.CREATE_ACTIVITIES]: 'Create Activities',
    [Permission.DELETE_ACTIVITIES]: 'Delete Activities',
    [Permission.ADD_COMMENTS]: 'Add Comments',
    [Permission.EDIT_COMMENTS]: 'Edit Comments',
    [Permission.DELETE_COMMENTS]: 'Delete Comments',
    [Permission.RESOLVE_COMMENTS]: 'Resolve Comments',
    [Permission.CREATE_VERSIONS]: 'Create Versions',
    [Permission.ROLLBACK_VERSIONS]: 'Rollback Versions',
    [Permission.DELETE_VERSIONS]: 'Delete Versions',
    [Permission.INVITE_USERS]: 'Invite Users',
    [Permission.MANAGE_PERMISSIONS]: 'Manage Permissions',
    [Permission.REMOVE_USERS]: 'Remove Users',
    [Permission.EXPORT_TRIP]: 'Export Trip',
    [Permission.DELETE_TRIP]: 'Delete Trip',
    [Permission.TRANSFER_OWNERSHIP]: 'Transfer Ownership',
  };

  const roles = Object.values(Role);

  const getFilteredPermissions = (): { category: string; permissions: Permission[] }[] => {
    if (filterCategory === 'all') {
      return Object.entries(permissionCategories).map(([key, value]) => ({
        category: value.label,
        permissions: value.permissions,
      }));
    }
    
    const categoryData = permissionCategories[filterCategory];
    return [{ category: categoryData.label, permissions: categoryData.permissions }];
  };

  const hasPermission = (role: Role, permission: Permission): boolean => {
    return DEFAULT_ROLE_PERMISSIONS[role]?.permissions.includes(permission) || false;
  };

  const getRolePermissionCount = (role: Role): number => {
    return DEFAULT_ROLE_PERMISSIONS[role]?.permissions.length || 0;
  };

  const filteredData = getFilteredPermissions();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Role Permissions Matrix</span>
            </CardTitle>
            <CardDescription>
              Overview of what each role can do with this {resourceType}
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select
              value={filterCategory}
              onValueChange={(value: PermissionCategory | 'all') => setFilterCategory(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span>{filterCategory === 'all' ? 'All Categories' : permissionCategories[filterCategory as PermissionCategory]?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(permissionCategories).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Role Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {roles.map((role) => {
            const config = roleConfig[role];
            const IconComponent = config.icon;
            const permissionCount = getRolePermissionCount(role);
            
            return (
              <div key={role} className="text-center p-3 border rounded-lg">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${config.color} mb-2`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <h4 className="font-medium text-sm mb-1">{config.label}</h4>
                <p className="text-xs text-gray-600">
                  {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
                </p>
              </div>
            );
          })}
        </div>

        {/* Permission Matrix */}
        <div className="space-y-6">
          {filteredData.map(({ category, permissions }) => (
            <div key={category}>
              <h4 className="font-medium text-sm mb-3 text-gray-900">{category}</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-medium text-sm text-gray-700 min-w-48">
                        Permission
                      </th>
                      {roles.map((role) => (
                        <th key={role} className="text-center p-3 font-medium text-sm text-gray-700 min-w-20">
                          <div className="flex flex-col items-center space-y-1">
                            <div className={`w-6 h-6 rounded-full ${roleConfig[role].color} flex items-center justify-center`}>
                              {React.createElement(roleConfig[role].icon, { className: 'h-3 w-3' })}
                            </div>
                            <span className="text-xs">{roleConfig[role].label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission, index) => (
                      <tr key={permission} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-3 text-sm text-gray-900 border-r">
                          {permissionLabels[permission]}
                        </td>
                        {roles.map((role) => (
                          <td key={role} className="p-3 text-center border-r">
                            {hasPermission(role, permission) ? (
                              <div className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                                <Check className="h-4 w-4 text-green-600" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                                <X className="h-4 w-4 text-red-600" />
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Legend</h4>
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
                <Check className="h-3 w-3 text-green-600" />
              </div>
              <span>Permission granted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center justify-center w-5 h-5 bg-red-100 rounded-full">
                <X className="h-3 w-3 text-red-600" />
              </div>
              <span>Permission denied</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 