import React from 'react';
import { Check, ChevronDown, Shield, Eye, MessageCircle, Edit, Settings, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Role, DEFAULT_ROLE_PERMISSIONS } from '@/types/permissions';

interface RoleSelectorProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  disabled?: boolean;
  excludeRoles?: Role[];
  showPermissionCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RoleSelector({
  currentRole,
  onRoleChange,
  disabled = false,
  excludeRoles = [],
  showPermissionCount = true,
  size = 'md',
}: RoleSelectorProps) {
  const roleConfig = {
    [Role.OWNER]: {
      label: 'Owner',
      description: 'Full control over the resource',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: Crown,
    },
    [Role.ADMIN]: {
      label: 'Admin',
      description: 'Manage users and most settings',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: Settings,
    },
    [Role.EDITOR]: {
      label: 'Editor',
      description: 'Edit content and create versions',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Edit,
    },
    [Role.COMMENTER]: {
      label: 'Commenter',
      description: 'View and comment on content',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: MessageCircle,
    },
    [Role.VIEWER]: {
      label: 'Viewer',
      description: 'View content only',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: Eye,
    },
  };

  const availableRoles = Object.values(Role).filter(role => !excludeRoles.includes(role));

  const getPermissionCount = (role: Role): number => {
    return DEFAULT_ROLE_PERMISSIONS[role]?.permissions.length || 0;
  };

  return (
    <div className="space-y-2">
      <Select value={currentRole} onValueChange={onRoleChange} disabled={disabled}>
        <SelectTrigger className={`w-full ${size === 'sm' ? 'h-8 text-sm' : size === 'lg' ? 'h-12' : 'h-10'}`}>
          <SelectValue>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${roleConfig[currentRole].color.split(' ')[0]}`} />
              <span>{roleConfig[currentRole].label}</span>
              {showPermissionCount && (
                <Badge variant="secondary" className="text-xs">
                  {getPermissionCount(currentRole)} permissions
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map((role) => {
            const config = roleConfig[role];
            const IconComponent = config.icon;
            const permissionCount = getPermissionCount(role);
            
            return (
              <SelectItem key={role} value={role} className="py-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-full ${config.color}`}>
                      <IconComponent className="h-3 w-3" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{config.label}</span>
                        {role === currentRole && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{config.description}</p>
                      {showPermissionCount && (
                        <p className="text-xs text-gray-500 mt-1">
                          {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      <div className="text-xs text-gray-600 mt-2">
        {roleConfig[currentRole].description}
      </div>
    </div>
  );
} 