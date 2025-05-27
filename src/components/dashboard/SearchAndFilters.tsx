'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  X, 
  ChevronDown,
  Calendar,
  DollarSign,
  Users,
  Tag,
  MapPin,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterOptions, SortOptions } from '@/lib/mockDataService';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  sort: SortOptions;
  onSortChange: (sort: SortOptions) => void;
  availableTags: string[];
  isLoading?: boolean;
  className?: string;
}

export function SearchAndFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  availableTags,
  isLoading = false,
  className
}: SearchAndFiltersProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearchChange(query);
    }, 300),
    [onSearchChange]
  );

  useEffect(() => {
    debouncedSearch(localSearchQuery);
  }, [localSearchQuery, debouncedSearch]);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.tags?.length) count++;
    if (filters.minBudget !== undefined || filters.maxBudget !== undefined) count++;
    if (filters.minDuration !== undefined || filters.maxDuration !== undefined) count++;
    if (filters.travelers !== undefined) count++;
    if (filters.isFavorite !== undefined) count++;
    if (filters.isPublic !== undefined) count++;
    if (filters.dateRange) count++;
    return count;
  };

  const sortOptions = [
    { field: 'updatedAt', direction: 'desc', label: 'Recently Updated' },
    { field: 'createdAt', direction: 'desc', label: 'Recently Created' },
    { field: 'title', direction: 'asc', label: 'Title A-Z' },
    { field: 'title', direction: 'desc', label: 'Title Z-A' },
    { field: 'startDate', direction: 'asc', label: 'Start Date (Earliest)' },
    { field: 'startDate', direction: 'desc', label: 'Start Date (Latest)' },
    { field: 'duration', direction: 'asc', label: 'Duration (Shortest)' },
    { field: 'duration', direction: 'desc', label: 'Duration (Longest)' },
    { field: 'budget', direction: 'asc', label: 'Budget (Lowest)' },
    { field: 'budget', direction: 'desc', label: 'Budget (Highest)' },
  ] as const;

  const currentSortLabel = sortOptions.find(
    option => option.field === sort.field && option.direction === sort.direction
  )?.label || 'Recently Updated';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search itineraries..."
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className={cn(
            'block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md',
            'placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500',
            'sm:text-sm',
            isLoading && 'opacity-50'
          )}
          disabled={isLoading}
        />
        {localSearchQuery && (
          <button
            onClick={() => {
              setLocalSearchQuery('');
              onSearchChange('');
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Filters Button */}
          <div className="relative">
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md',
                'text-sm font-medium text-gray-700 bg-white hover:bg-gray-50',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                isFiltersOpen && 'bg-gray-50',
                getActiveFilterCount() > 0 && 'border-blue-500 text-blue-700'
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {getActiveFilterCount() > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-0.5">
                  {getActiveFilterCount()}
                </span>
              )}
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform',
                isFiltersOpen && 'rotate-180'
              )} />
            </button>

            {/* Filters Dropdown */}
            {isFiltersOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setIsFiltersOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="p-4 space-y-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <div className="space-y-2">
                        {['draft', 'published', 'archived'].map((status) => (
                          <label key={status} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.status?.includes(status) || false}
                              onChange={(e) => {
                                const currentStatus = filters.status || [];
                                const newStatus = e.target.checked
                                  ? [...currentStatus, status]
                                  : currentStatus.filter(s => s !== status);
                                handleFilterChange('status', newStatus.length > 0 ? newStatus : undefined);
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Tags Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tags
                      </label>
                      <div className="max-h-32 overflow-y-auto space-y-2">
                        {availableTags.map((tag) => (
                          <label key={tag} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.tags?.includes(tag) || false}
                              onChange={(e) => {
                                const currentTags = filters.tags || [];
                                const newTags = e.target.checked
                                  ? [...currentTags, tag]
                                  : currentTags.filter(t => t !== tag);
                                handleFilterChange('tags', newTags.length > 0 ? newTags : undefined);
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{tag}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Budget Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Budget Range (USD)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={filters.minBudget || ''}
                          onChange={(e) => handleFilterChange('minBudget', e.target.value ? Number(e.target.value) : undefined)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={filters.maxBudget || ''}
                          onChange={(e) => handleFilterChange('maxBudget', e.target.value ? Number(e.target.value) : undefined)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>

                    {/* Duration Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (Days)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={filters.minDuration || ''}
                          onChange={(e) => handleFilterChange('minDuration', e.target.value ? Number(e.target.value) : undefined)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={filters.maxDuration || ''}
                          onChange={(e) => handleFilterChange('maxDuration', e.target.value ? Number(e.target.value) : undefined)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>

                    {/* Travelers */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Travelers
                      </label>
                      <input
                        type="number"
                        placeholder="Any"
                        value={filters.travelers || ''}
                        onChange={(e) => handleFilterChange('travelers', e.target.value ? Number(e.target.value) : undefined)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                    {/* Quick Filters */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quick Filters
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.isFavorite === true}
                            onChange={(e) => handleFilterChange('isFavorite', e.target.checked ? true : undefined)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Favorites only</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.isPublic === true}
                            onChange={(e) => handleFilterChange('isPublic', e.target.checked ? true : undefined)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Public only</span>
                        </label>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {getActiveFilterCount() > 0 && (
                      <button
                        onClick={clearFilters}
                        className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sort Button */}
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md',
                'text-sm font-medium text-gray-700 bg-white hover:bg-gray-50',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                isSortOpen && 'bg-gray-50'
              )}
            >
              {sort.direction === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{currentSortLabel}</span>
              <span className="sm:hidden">Sort</span>
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform',
                isSortOpen && 'rotate-180'
              )} />
            </button>

            {/* Sort Dropdown */}
            {isSortOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setIsSortOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    {sortOptions.map((option) => (
                      <button
                        key={`${option.field}-${option.direction}`}
                        onClick={() => {
                          onSortChange({
                            field: option.field,
                            direction: option.direction
                          });
                          setIsSortOpen(false);
                        }}
                        className={cn(
                          'flex items-center gap-2 w-full px-4 py-2 text-sm text-left',
                          'hover:bg-gray-50',
                          sort.field === option.field && sort.direction === option.direction
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700'
                        )}
                      >
                        {option.direction === 'asc' ? (
                          <SortAsc className="h-4 w-4" />
                        ) : (
                          <SortDesc className="h-4 w-4" />
                        )}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {getActiveFilterCount() > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.status?.map((status) => (
              <FilterChip
                key={`status-${status}`}
                label={`Status: ${status}`}
                onRemove={() => {
                  const newStatus = filters.status?.filter(s => s !== status);
                  handleFilterChange('status', newStatus?.length ? newStatus : undefined);
                }}
              />
            ))}
            {filters.tags?.map((tag) => (
              <FilterChip
                key={`tag-${tag}`}
                label={`Tag: ${tag}`}
                onRemove={() => {
                  const newTags = filters.tags?.filter(t => t !== tag);
                  handleFilterChange('tags', newTags?.length ? newTags : undefined);
                }}
              />
            ))}
            {filters.isFavorite && (
              <FilterChip
                label="Favorites"
                onRemove={() => handleFilterChange('isFavorite', undefined)}
              />
            )}
            {filters.isPublic && (
              <FilterChip
                label="Public"
                onRemove={() => handleFilterChange('isPublic', undefined)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Filter chip component
interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-blue-200 rounded-full p-0.5"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Search suggestions component
interface SearchSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isVisible: boolean;
}

export function SearchSuggestions({ suggestions, onSelect, isVisible }: SearchSuggestionsProps) {
  if (!isVisible || suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-30">
      <div className="py-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Search className="h-4 w-4 text-gray-400" />
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
} 