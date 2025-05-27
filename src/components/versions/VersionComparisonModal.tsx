'use client';

import React from 'react';
import { X, Calendar, Users, DollarSign, Clock, MapPin } from 'lucide-react';
import { ItineraryVersion, Day } from '../../types/itinerary';

interface VersionComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ItineraryVersion[];
  selectedVersions: string[];
}

const VersionComparisonModal: React.FC<VersionComparisonModalProps> = ({
  isOpen,
  onClose,
  versions,
  selectedVersions
}) => {
  if (!isOpen) return null;

  const compareVersions = versions.filter(v => selectedVersions.includes(v.id));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBudget = (budget?: number) => {
    if (!budget) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(budget);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Version Comparison ({compareVersions.length} versions)
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {compareVersions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Select versions to compare from the version history
            </div>
          ) : (
            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${compareVersions.length}, 1fr)` }}>
              {compareVersions.map((version) => (
                <div key={version.id} className="border rounded-lg overflow-hidden">
                  {/* Version Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {version.name}
                      </h3>
                      <span className="text-sm text-gray-500">
                        v{version.versionNumber}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(version.createdAt)}
                    </p>
                  </div>

                  {/* Version Details */}
                  <div className="p-4 space-y-4">
                    {/* Basic Info */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Duration:</span>
                        <span>{version.data.duration} days</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Travelers:</span>
                        <span>{version.data.travelers}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Budget:</span>
                        <span>{formatBudget(version.data.budget)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Destinations:</span>
                        <span>{version.data.destinations?.join(', ') || 'Not specified'}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {version.data.description && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {version.data.description}
                        </p>
                      </div>
                    )}

                    {/* Days Summary */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Itinerary ({version.data.days?.length || 0} days)
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {version.data.days?.map((day: Day, index: number) => (
                          <div key={index} className="bg-gray-50 rounded p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="font-medium text-xs">Day {day.day}</span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {day.activities?.length || 0} activities planned
                            </p>
                          </div>
                        )) || (
                          <p className="text-sm text-gray-500 italic">No days planned</p>
                        )}
                      </div>
                    </div>

                    {/* Change Notes */}
                    {version.changeNotes && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Change Notes</h4>
                        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded p-2">
                          {version.changeNotes}
                        </p>
                      </div>
                    )}

                    {/* Tags */}
                    {version.tags && version.tags.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-1">
                          {version.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionComparisonModal; 