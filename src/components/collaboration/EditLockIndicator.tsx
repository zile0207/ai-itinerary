import React from 'react';
import { Edit, Lock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from './UserAvatar';

export interface EditingUser {
  id: string;
  name: string;
  avatar?: string;
}

export interface EditLockIndicatorProps {
  editingUsers: EditingUser[];
  isCurrentUserEditing: boolean;
  fieldLabel?: string;
  className?: string;
  variant?: 'subtle' | 'prominent' | 'overlay';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showNames?: boolean;
}

/**
 * Component to indicate when fields are being edited by other users
 * Provides visual feedback for collaborative editing conflicts
 */
export function EditLockIndicator({
  editingUsers,
  isCurrentUserEditing,
  fieldLabel,
  className,
  variant = 'subtle',
  position = 'top-right',
  showNames = true
}: EditLockIndicatorProps) {
  const otherUsers = editingUsers.filter(user => !isCurrentUserEditing || user.id !== 'current');
  
  if (otherUsers.length === 0 && !isCurrentUserEditing) {
    return null;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-0 left-0';
      case 'top-right':
        return 'top-0 right-0';
      case 'bottom-left':
        return 'bottom-0 left-0';
      case 'bottom-right':
        return 'bottom-0 right-0';
      default:
        return 'top-0 right-0';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'subtle':
        return 'bg-blue-50 border border-blue-200 text-blue-800';
      case 'prominent':
        return 'bg-yellow-100 border border-yellow-300 text-yellow-800 shadow-md';
      case 'overlay':
        return 'bg-white border border-gray-300 text-gray-800 shadow-lg';
      default:
        return 'bg-blue-50 border border-blue-200 text-blue-800';
    }
  };

  const formatEditingText = () => {
    if (isCurrentUserEditing && otherUsers.length === 0) {
      return 'You are editing';
    }
    
    if (otherUsers.length === 1) {
      return `${otherUsers[0].name} is editing`;
    }
    
    if (otherUsers.length === 2) {
      return `${otherUsers[0].name} and ${otherUsers[1].name} are editing`;
    }
    
    return `${otherUsers[0].name} and ${otherUsers.length - 1} others are editing`;
  };

  if (variant === 'overlay') {
    return (
      <div className={cn(
        'absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-90',
        className
      )}>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-300 bg-white shadow-lg">
          <div className="flex -space-x-2">
            {otherUsers.slice(0, 3).map((user) => (
                             <UserAvatar
                 key={user.id}
                 user={{ ...user, status: 'active', lastSeen: new Date(), isTyping: false, focusArea: null, typingArea: null }}
                 size="sm"
                 className="border-2 border-white"
               />
            ))}
            {isCurrentUserEditing && (
              <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                <Edit className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {formatEditingText()}
            </div>
            {fieldLabel && (
              <div className="text-gray-500">
                {fieldLabel}
              </div>
            )}
          </div>
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'absolute z-10 rounded-md px-2 py-1 text-xs',
      getPositionClasses(),
      getVariantClasses(),
      variant === 'subtle' && 'transform translate-x-1 -translate-y-1',
      variant === 'prominent' && 'transform translate-x-2 -translate-y-2',
      className
    )}>
      <div className="flex items-center gap-2">
        {/* Icon indicating edit state */}
        {isCurrentUserEditing ? (
          <Edit className="w-3 h-3" />
        ) : otherUsers.length > 0 ? (
          <Lock className="w-3 h-3" />
        ) : (
          <Eye className="w-3 h-3" />
        )}

        {/* User avatars */}
        <div className="flex -space-x-1">
          {otherUsers.slice(0, 2).map((user) => (
                         <UserAvatar
               key={user.id}
               user={{ ...user, status: 'active', lastSeen: new Date(), isTyping: false, focusArea: null, typingArea: null }}
               size="sm"
               className="border border-white"
             />
          ))}
          {otherUsers.length > 2 && (
            <div className="w-4 h-4 bg-gray-300 rounded-full border border-white flex items-center justify-center text-xs">
              +{otherUsers.length - 2}
            </div>
          )}
        </div>

        {/* Text label */}
        {showNames && variant === 'prominent' && (
          <span className="whitespace-nowrap">
            {formatEditingText()}
          </span>
        )}
      </div>
    </div>
  );
}

export default EditLockIndicator; 