'use client';

import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  User, 
  Tag, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  RotateCcw, 
  Trash2, 
  Calendar,
  GitCompare,
  Download,
  Star,
  StarOff
} from 'lucide-react';
import { ItineraryVersion } from '../../types/itinerary';
import { useVersionHistory } from '../../hooks/useVersionHistory';
import { useDocumentRollback } from '../../hooks/useDocumentRollback';
import RollbackPreviewModal from './RollbackPreviewModal';
import RollbackConfirmation from './RollbackConfirmation';

interface VersionHistoryPanelProps {
  itineraryId: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionSelect?: (version: ItineraryVersion) => void;
  onCompareVersions?: (versions: string[]) => void;
  currentData?: any; // Current itinerary data for rollback operations
  className?: string;
}

const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  itineraryId,
  isOpen,
  onClose,
  onVersionSelect,
  onCompareVersions,
  currentData,
  className = ''
}) => {
  const {
    versions,
    currentVersion,
    isLoading,
    error,
    restoreVersion,
    deleteVersion,
    searchVersions,
    enableAutoVersioning,
    disableAutoVersioning,
    isAutoVersioningEnabled
  } = useVersionHistory(itineraryId);

  const {
    generateRollbackPreview,
    executeRollback,
    isProcessing: isRollbackProcessing,
    error: rollbackError
  } = useDocumentRollback(itineraryId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterBy, setFilterBy] = useState<'all' | 'tagged' | 'manual' | 'auto'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Rollback state
  const [rollbackPreview, setRollbackPreview] = useState<any>(null);
  const [showRollbackPreview, setShowRollbackPreview] = useState(false);
  const [showRollbackConfirmation, setShowRollbackConfirmation] = useState(false);
  const [pendingRollbackOptions, setPendingRollbackOptions] = useState<any>(null);

  // Filter and sort versions
  const filteredVersions = useMemo(() => {
    let filtered = versions;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = searchVersions(searchQuery);
    }

    // Apply category filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(version => {
        switch (filterBy) {
          case 'tagged':
            return version.tags && version.tags.length > 0;
          case 'manual':
            return !version.name.includes('Auto-save');
          case 'auto':
            return version.name.includes('Auto-save');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [versions, searchQuery, filterBy, sortBy, searchVersions]);

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
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const handleVersionSelect = (versionId: string) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(prev => prev.filter(id => id !== versionId));
    } else {
      setSelectedVersions(prev => [...prev, versionId]);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!currentData) {
      console.error('No current data available for rollback comparison');
      return;
    }

    try {
      // Generate rollback preview
      const preview = await generateRollbackPreview(versionId, currentData);
      if (preview) {
        setRollbackPreview(preview);
        setShowRollbackPreview(true);
      }
    } catch (err) {
      console.error('Failed to generate rollback preview:', err);
      // Show error message
    }
  };

  const handleExecuteRollback = async (resolutions?: Record<string, any>, options?: any) => {
    if (!rollbackPreview) return;

    try {
      // Store options for confirmation step
      setPendingRollbackOptions({ resolutions, options });
      setShowRollbackPreview(false);
      setShowRollbackConfirmation(true);
    } catch (err) {
      console.error('Failed to prepare rollback:', err);
    }
  };

  const handleConfirmRollback = async () => {
    if (!rollbackPreview || !currentData) return;

    try {
      const result = await executeRollback(
        rollbackPreview.targetVersion.id,
        currentData,
        pendingRollbackOptions?.options || {}
      );

      if (result.success) {
        // Close modals and show success
        setShowRollbackConfirmation(false);
        setRollbackPreview(null);
        setPendingRollbackOptions(null);
        // Show success message
        console.log('Rollback completed successfully');
      } else {
        console.error('Rollback failed:', result.errors);
      }
    } catch (err) {
      console.error('Failed to execute rollback:', err);
    }
  };

  const handleCloseRollbackModals = () => {
    setShowRollbackPreview(false);
    setShowRollbackConfirmation(false);
    setRollbackPreview(null);
    setPendingRollbackOptions(null);
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (window.confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      try {
        await deleteVersion(versionId);
        setSelectedVersions(prev => prev.filter(id => id !== versionId));
      } catch (err) {
        console.error('Failed to delete version:', err);
      }
    }
  };

  const handleCompareSelected = () => {
    if (selectedVersions.length >= 2 && onCompareVersions) {
      onCompareVersions(selectedVersions);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l z-50 ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Version History</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            ×
          </button>
        </div>

        {/* Auto-versioning toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Auto-versioning</span>
          <button
            onClick={isAutoVersioningEnabled ? disableAutoVersioning : enableAutoVersioning}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isAutoVersioningEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAutoVersioningEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b bg-white">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search versions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg border transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            <Filter className="w-3 h-3" />
            Filter
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">By name</option>
          </select>
        </div>

        {showFilters && (
          <div className="mt-3 flex gap-2">
            {['all', 'tagged', 'manual', 'auto'].map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterBy(filter as any)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  filterBy === filter
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons for selected versions */}
        {selectedVersions.length > 0 && (
          <div className="mt-3 flex gap-2">
            {selectedVersions.length >= 2 && (
              <button
                onClick={handleCompareSelected}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <GitCompare className="w-3 h-3" />
                Compare ({selectedVersions.length})
              </button>
            )}
            <button
              onClick={() => setSelectedVersions([])}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">
            {error}
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No versions match your search' : 'No versions found'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredVersions.map((version) => (
              <div
                key={version.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  currentVersion?.id === version.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedVersions.includes(version.id)}
                      onChange={() => handleVersionSelect(version.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {version.name}
                        </h3>
                        {currentVersion?.id === version.id && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(version.createdAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          v{version.versionNumber}
                        </div>
                      </div>

                      {version.changeNotes && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {version.changeNotes}
                        </p>
                      )}

                      {version.tags && version.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {version.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              <Tag className="w-2 h-2" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        {version.data.days?.length || 0} days • {version.data.travelers || 0} travelers
                      </div>
                    </div>
                  </div>

                  {/* Action menu */}
                  <div className="relative">
                    <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    
                    {/* Action menu dropdown would go here */}
                    <div className="hidden absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                      <button
                        onClick={() => onVersionSelect?.(version)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleRestoreVersion(version.id)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                      <button
                        onClick={() => handleDeleteVersion(version.id)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-gray-50 px-4 py-3">
        <div className="text-xs text-gray-500 text-center">
          {versions.length} total versions
        </div>
      </div>

      {/* Rollback Modals */}
      <RollbackPreviewModal
        isOpen={showRollbackPreview}
        onClose={handleCloseRollbackModals}
        preview={rollbackPreview}
        isProcessing={isRollbackProcessing}
        onExecuteRollback={handleExecuteRollback}
      />

      {rollbackPreview && (
        <RollbackConfirmation
          isOpen={showRollbackConfirmation}
          onClose={handleCloseRollbackModals}
          onConfirm={handleConfirmRollback}
          targetVersion={rollbackPreview.targetVersion}
          currentVersion={rollbackPreview.currentVersion}
          impactSummary={{
            fieldsAffected: rollbackPreview.impactAnalysis.fieldsAffected,
            conflictsResolved: rollbackPreview.impactAnalysis.conflictsCount,
            safeChanges: rollbackPreview.impactAnalysis.safeChangesCount,
            willCreateBackup: pendingRollbackOptions?.options?.createBackupVersion || false,
            willNotifyCollaborators: pendingRollbackOptions?.options?.notifyCollaborators || false
          }}
          isProcessing={isRollbackProcessing}
        />
      )}
    </div>
  );
};

export default VersionHistoryPanel; 