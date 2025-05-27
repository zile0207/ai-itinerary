'use client';

import React from 'react';
import { AlertTriangle, RotateCcw, X, Clock, User } from 'lucide-react';

interface RollbackConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetVersion: {
    id: string;
    versionNumber: number;
    name: string;
    createdAt: string;
    changeNotes?: string;
  };
  currentVersion: {
    id: string;
    versionNumber: number;
    name: string;
    createdAt: string;
  };
  impactSummary: {
    fieldsAffected: number;
    conflictsResolved: number;
    safeChanges: number;
    willCreateBackup: boolean;
    willNotifyCollaborators: boolean;
  };
  isProcessing?: boolean;
  className?: string;
}

const RollbackConfirmation: React.FC<RollbackConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetVersion,
  currentVersion,
  impactSummary,
  isProcessing = false,
  className = ''
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return 'Yesterday at ' + date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-orange-50 px-6 py-4 border-b border-orange-200 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Confirm Rollback</h2>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Warning Message */}
          <div className="mb-6">
            <p className="text-gray-700 mb-2">
              You are about to roll back your document to a previous version. This will replace the current content with the selected version.
            </p>
            <p className="text-sm text-gray-600">
              {impactSummary.willCreateBackup 
                ? "A backup of the current version will be created automatically."
                : "No backup will be created. Make sure you have saved any important changes elsewhere."
              }
            </p>
          </div>

          {/* Version Details */}
          <div className="space-y-4 mb-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-orange-600" />
                Rolling back to
              </h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="font-medium text-gray-900">
                  Version {targetVersion.versionNumber} - {targetVersion.name}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(targetVersion.createdAt)}
                </div>
                {targetVersion.changeNotes && (
                  <div className="text-sm text-gray-700 mt-2 italic">
                    "{targetVersion.changeNotes}"
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Current version
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="font-medium text-gray-900">
                  Version {currentVersion.versionNumber} - {currentVersion.name}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(currentVersion.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Impact Summary */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Impact Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fields affected:</span>
                <span className="font-medium">{impactSummary.fieldsAffected}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Conflicts resolved:</span>
                <span className="font-medium">{impactSummary.conflictsResolved}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Safe changes:</span>
                <span className="font-medium">{impactSummary.safeChanges}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Create backup:</span>
                <span className={`font-medium ${impactSummary.willCreateBackup ? 'text-green-600' : 'text-red-600'}`}>
                  {impactSummary.willCreateBackup ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Notify collaborators:</span>
                <span className={`font-medium ${impactSummary.willNotifyCollaborators ? 'text-green-600' : 'text-gray-600'}`}>
                  {impactSummary.willNotifyCollaborators ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Warnings */}
          {!impactSummary.willCreateBackup && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <strong>Warning:</strong> No backup will be created. Your current changes will be permanently lost.
                </div>
              </div>
            </div>
          )}

          {impactSummary.willNotifyCollaborators && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700">
                <strong>Note:</strong> All active collaborators will be notified of this rollback operation.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Rolling back...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Yes, Roll Back
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RollbackConfirmation; 