import React, { useState } from 'react';
import { Mail, Calendar, Clock, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Role, TimeBasedAccess } from '@/types/permissions';
import { RoleSelector } from './RoleSelector';

interface InviteUsersProps {
  onInvite: (email: string, role: Role, timeBasedAccess?: TimeBasedAccess) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  allowMultiple?: boolean;
  showTimeBasedAccess?: boolean;
}

interface InviteForm {
  email: string;
  role: Role;
  message?: string;
  timeBasedAccess?: TimeBasedAccess;
}

export function InviteUsers({
  onInvite,
  onCancel,
  isLoading = false,
  allowMultiple = false,
  showTimeBasedAccess = true,
}: InviteUsersProps) {
  const [invites, setInvites] = useState<InviteForm[]>([
    { email: '', role: Role.VIEWER }
  ]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const updateInvite = (index: number, updates: Partial<InviteForm>) => {
    setInvites(prev => prev.map((invite, i) => 
      i === index ? { ...invite, ...updates } : invite
    ));
  };

  const addInvite = () => {
    if (allowMultiple) {
      setInvites(prev => [...prev, { email: '', role: Role.VIEWER }]);
    }
  };

  const removeInvite = (index: number) => {
    if (invites.length > 1) {
      setInvites(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleTimeBasedAccessChange = (index: number, field: keyof TimeBasedAccess, value: any) => {
    updateInvite(index, {
      timeBasedAccess: {
        ...invites[index].timeBasedAccess,
        [field]: value,
      }
    });
  };

  const clearTimeBasedAccess = (index: number) => {
    updateInvite(index, { timeBasedAccess: undefined });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    for (const invite of invites) {
      if (!invite.email || !isValidEmail(invite.email)) {
        alert('Please enter valid email addresses for all invitations');
        return;
      }
    }

    try {
      for (const invite of invites) {
        await onInvite(invite.email, invite.role, invite.timeBasedAccess);
      }
      
      // Reset form
      setInvites([{ email: '', role: Role.VIEWER }]);
      setShowAdvanced(false);
    } catch (error) {
      console.error('Failed to send invitations:', error);
    }
  };

  const canSendInvites = invites.every(invite => 
    invite.email && isValidEmail(invite.email)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {invites.map((invite, index) => (
        <Card key={index} className="p-4">
          <CardContent className="space-y-4 p-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                Invitation {allowMultiple && invites.length > 1 ? `#${index + 1}` : ''}
              </h4>
              {allowMultiple && invites.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeInvite(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor={`email-${index}`}>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id={`email-${index}`}
                  type="email"
                  placeholder="Enter email address"
                  value={invite.email}
                  onChange={(e) => updateInvite(index, { email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
              {invite.email && !isValidEmail(invite.email) && (
                <p className="text-xs text-red-600">Please enter a valid email address</p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Role</Label>
              <RoleSelector
                currentRole={invite.role}
                onRoleChange={(role) => updateInvite(index, { role })}
                excludeRoles={[Role.OWNER]} // Only owners can assign owner role
                size="md"
              />
            </div>

            {/* Time-based Access Controls */}
            {showTimeBasedAccess && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Time-based Access</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    {showAdvanced ? 'Hide' : 'Set Time Limits'}
                  </Button>
                </div>

                {showAdvanced && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Valid From</Label>
                        <Input
                          type="datetime-local"
                          value={invite.timeBasedAccess?.validFrom?.toISOString().slice(0, 16) || ''}
                          onChange={(e) => handleTimeBasedAccessChange(
                            index, 
                            'validFrom', 
                            e.target.value ? new Date(e.target.value) : undefined
                          )}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Valid Until</Label>
                        <Input
                          type="datetime-local"
                          value={invite.timeBasedAccess?.validUntil?.toISOString().slice(0, 16) || ''}
                          onChange={(e) => handleTimeBasedAccessChange(
                            index, 
                            'validUntil', 
                            e.target.value ? new Date(e.target.value) : undefined
                          )}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Start Time</Label>
                        <Input
                          type="time"
                          value={invite.timeBasedAccess?.allowedHours?.start || ''}
                          onChange={(e) => handleTimeBasedAccessChange(
                            index,
                            'allowedHours',
                            e.target.value ? {
                              ...invite.timeBasedAccess?.allowedHours,
                              start: e.target.value
                            } : undefined
                          )}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Time</Label>
                        <Input
                          type="time"
                          value={invite.timeBasedAccess?.allowedHours?.end || ''}
                          onChange={(e) => handleTimeBasedAccessChange(
                            index,
                            'allowedHours',
                            e.target.value ? {
                              ...invite.timeBasedAccess?.allowedHours,
                              end: e.target.value
                            } : undefined
                          )}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Days of Week */}
                    <div>
                      <Label className="text-xs mb-2 block">Allowed Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => {
                          const isSelected = invite.timeBasedAccess?.allowedDays?.includes(dayIndex);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const currentDays = invite.timeBasedAccess?.allowedDays || [];
                                const newDays = isSelected
                                  ? currentDays.filter(d => d !== dayIndex)
                                  : [...currentDays, dayIndex];
                                handleTimeBasedAccessChange(index, 'allowedDays', newDays.length > 0 ? newDays : undefined);
                              }}
                              className={`px-3 py-1 text-xs rounded-full border ${
                                isSelected
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Clear Time Restrictions */}
                    {invite.timeBasedAccess && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => clearTimeBasedAccess(index)}
                        className="text-xs"
                      >
                        Clear Time Restrictions
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Custom Message */}
            <div className="space-y-2">
              <Label htmlFor={`message-${index}`}>Custom Message (Optional)</Label>
              <Textarea
                id={`message-${index}`}
                placeholder="Add a personal message to the invitation..."
                value={invite.message || ''}
                onChange={(e) => updateInvite(index, { message: e.target.value })}
                rows={3}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add Another Invitation */}
      {allowMultiple && (
        <Button
          type="button"
          variant="outline"
          onClick={addInvite}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Invitation
        </Button>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-gray-600">
          {invites.length} invitation{invites.length !== 1 ? 's' : ''} to send
        </div>
        
        <div className="flex items-center space-x-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!canSendInvites || isLoading}
            className="min-w-24"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Send Invitation{invites.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
} 