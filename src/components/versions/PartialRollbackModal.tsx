'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  RotateCcw,
  X,
  Clock,
  User,
  Search,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface VersionDiff {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
  description: string;
}

interface PartialRollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  availableChanges: VersionDiff[];
  isProcessing?: boolean;
  onExecutePartialRollback: (selectedPaths: string[]) => Promise<void>;
  className?: string;
}

const PartialRollbackModal: React.FC<PartialRollbackModalProps> = ({
  isOpen,
  onClose,
  targetVersion,
  currentVersion,
  availableChanges,
  isProcessing = false,
  onExecutePartialRollback,
  className = ''
}) => {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'modified' | 'added' | 'removed'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['basic']));

  // Group changes by category
  const groupedChanges = useMemo(() => {
    const groups: Record<string, VersionDiff[]> = {
      basic: [],
      days: [],
      activities: [],
      other: []
    };

    availableChanges.forEach(change => {
      if (change.path.includes('name') || change.path.includes('description') || 
          change.path.includes('duration') || change.path.includes('travelers') || 
          change.path.includes('budget') || change.path.includes('destinations')) {
        groups.basic.push(change);
      } else if (change.path.includes('days')) {
        groups.days.push(change);
      } else if (change.path.includes('activities')) {
        groups.activities.push(change);
      } else {
        groups.other.push(change);
      }
    });

    return groups;
  }, [availableChanges]);

  // Filter changes based on search and filter criteria
  const filteredChanges = useMemo(() => {
    const filtered: Record<string, VersionDiff[]> = {};
    
    Object.entries(groupedChanges).forEach(([category, changes]) => {
      let categoryChanges = changes;

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        categoryChanges = categoryChanges.filter(change =>
          change.path.toLowerCase().includes(query) ||
          change.description.toLowerCase().includes(query) ||
          String(change.oldValue).toLowerCase().includes(query) ||
          String(change.newValue).toLowerCase().includes(query)
        );
      }

      // Apply type filter
      if (filterBy !== 'all') {
        categoryChanges = categoryChanges.filter(change => change.type === filterBy);
      }

      if (categoryChanges.length > 0) {
        filtered[category] = categoryChanges;
      }
    });

    return filtered;
  }, [groupedChanges, searchQuery, filterBy]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatPath = (path: string): string => {
    return path
      .replace(/\[(\d+)\]/g, '[$1]')
      .replace(/\./g, ' → ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/^./, str => str.toUpperCase());
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'border-l-green-500 bg-green-50';
      case 'removed':
        return 'border-l-red-500 bg-red-50';
      case 'modified':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const togglePathSelection = (path: string) => {
    const newSelection = new Set(selectedPaths);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    setSelectedPaths(newSelection);
  };

  const toggleCategorySelection = (category: string, changes: VersionDiff[]) => {
    const newSelection = new Set(selectedPaths);
    const categoryPaths = changes.map(c => c.path);
    const allSelected = categoryPaths.every(path => newSelection.has(path));

    if (allSelected) {
      // Deselect all in category
      categoryPaths.forEach(path => newSelection.delete(path));
    } else {
      // Select all in category
      categoryPaths.forEach(path => newSelection.add(path));
    }
    setSelectedPaths(newSelection);
  };

  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleExecuteRollback = async () => {
    await onExecutePartialRollback(Array.from(selectedPaths));
  };

  const totalChanges = Object.values(filteredChanges).reduce((sum, changes) => sum + changes.length, 0);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Partial Rollback</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select specific changes to rollback from version {targetVersion.versionNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Version Information */}
          <div className="px-6 py-4 border-b bg-blue-50">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-orange-600" />
                  Target Version
                </h3>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium">v{targetVersion.versionNumber} - {targetVersion.name}</div>
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
                  Current Version
                </h3>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="font-medium">v{currentVersion.versionNumber} - {currentVersion.name}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(currentVersion.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 py-4 border-b bg-white">
            <div className="flex items-center gap-4 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search changes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All changes</option>
                <option value="modified">Modified</option>
                <option value="added">Added</option>
                <option value="removed">Removed</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedPaths.size} of {totalChanges} changes selected
              </div>
              <button
                onClick={() => {
                  if (selectedPaths.size === totalChanges) {
                    setSelectedPaths(new Set());
                  } else {
                    const allPaths = Object.values(filteredChanges).flat().map(c => c.path);
                    setSelectedPaths(new Set(allPaths));
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedPaths.size === totalChanges ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          </div>

          {/* Changes List */}
          <div className="px-6 py-4">
            {Object.entries(filteredChanges).map(([category, changes]) => {
              const isExpanded = expandedCategories.has(category);
              const categoryPaths = changes.map(c => c.path);
              const selectedInCategory = categoryPaths.filter(path => selectedPaths.has(path)).length;
              const allSelected = selectedInCategory === categoryPaths.length;
              const someSelected = selectedInCategory > 0 && selectedInCategory < categoryPaths.length;

              return (
                <div key={category} className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => toggleCategoryExpansion(category)}
                      className="flex items-center gap-2 text-lg font-medium text-gray-900 hover:text-gray-700"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {category.charAt(0).toUpperCase() + category.slice(1)} Changes
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {changes.length}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => toggleCategorySelection(category, changes)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : someSelected ? (
                        <div className="w-4 h-4 bg-blue-600 border border-blue-600 rounded flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-white"></div>
                        </div>
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3">
                      {changes.map((change, index) => (
                        <div
                          key={`${change.path}-${index}`}
                          className={`border-l-4 p-4 rounded-r-lg ${getChangeColor(change.type)} cursor-pointer hover:shadow-sm transition-shadow`}
                          onClick={() => togglePathSelection(change.path)}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePathSelection(change.path);
                              }}
                              className="mt-1"
                            >
                              {selectedPaths.has(change.path) ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-900">
                                  {formatPath(change.path)}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  change.type === 'added' ? 'bg-green-100 text-green-700' :
                                  change.type === 'removed' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {change.type}
                                </span>
                              </div>

                              <div className="text-sm text-gray-600 mb-2">
                                {change.description}
                              </div>

                              {change.type === 'modified' && (
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <div className="font-medium text-gray-700 mb-1">Current</div>
                                    <code className="text-blue-800 bg-blue-100 p-2 rounded block break-all">
                                      {formatValue(change.newValue)}
                                    </code>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-700 mb-1">Rollback to</div>
                                    <code className="text-orange-800 bg-orange-100 p-2 rounded block break-all">
                                      {formatValue(change.oldValue)}
                                    </code>
                                  </div>
                                </div>
                              )}

                              {change.type === 'added' && (
                                <div className="text-xs">
                                  <div className="font-medium text-gray-700 mb-1">Will remove</div>
                                  <code className="text-red-800 bg-red-100 p-2 rounded block break-all">
                                    {formatValue(change.newValue)}
                                  </code>
                                </div>
                              )}

                              {change.type === 'removed' && (
                                <div className="text-xs">
                                  <div className="font-medium text-gray-700 mb-1">Will restore</div>
                                  <code className="text-green-800 bg-green-100 p-2 rounded block break-all">
                                    {formatValue(change.oldValue)}
                                  </code>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {totalChanges === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg mb-2">No changes found</p>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedPaths.size} changes selected for rollback
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteRollback}
              disabled={selectedPaths.size === 0 || isProcessing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Rollback Selected ({selectedPaths.size})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartialRollbackModal; 