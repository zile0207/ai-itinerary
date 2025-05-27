'use client';

import { useState, useEffect } from 'react';
import { Plus, Grid, List } from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationCenter } from '@/components/notifications';
import { 
  DashboardContainer, 
  DashboardSection, 
  DashboardGrid,
  EmptyState,
  GridSkeleton
} from '@/components/dashboard/DashboardGrid';
import { ItineraryCard, ItineraryCardSkeleton } from '@/components/dashboard/ItineraryCard';
import { SearchAndFilters } from '@/components/dashboard/SearchAndFilters';
import { Pagination, usePagination } from '@/components/dashboard/Pagination';
import { 
  mockDataService,
  type Itinerary,
  type FilterOptions,
  type SortOptions
} from '@/lib/mockDataService';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sort, setSort] = useState<SortOptions>({ field: 'updatedAt', direction: 'desc' });
  const [isLoading, setIsLoading] = useState(true);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  
  const { pagination, handlePageChange, handlePageSizeChange, reset } = usePagination(0, 12);

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await mockDataService.getItineraries(
        filters,
        sort,
        {
          page: pagination.currentPage,
          limit: pagination.itemsPerPage
        },
        searchQuery
      );
      
      setItineraries(result.itineraries);
      setTotalItems(result.total);
      
      // Load available tags
      const tags = await mockDataService.getAvailableTags();
      setAvailableTags(tags);
      
    } catch (error) {
      console.error('Failed to load itineraries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData();
  }, [searchQuery, filters, sort, pagination.currentPage, pagination.itemsPerPage]);

  // Reset pagination when search/filters change
  useEffect(() => {
    reset();
  }, [searchQuery, filters, sort]);

  // Action handlers
  const handleToggleFavorite = async (id: string) => {
    try {
      await mockDataService.toggleFavorite(id);
      loadData(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleEdit = (id: string) => {
    window.location.href = `/itinerary/${id}/edit`;
  };

  const handleDuplicate = async (id: string) => {
    try {
      await mockDataService.duplicateItinerary(id);
      loadData(); // Reload to show the new duplicate
    } catch (error) {
      console.error('Failed to duplicate itinerary:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this itinerary?')) {
      try {
        await mockDataService.deleteItinerary(id);
        loadData(); // Reload to remove deleted item
      } catch (error) {
        console.error('Failed to delete itinerary:', error);
      }
    }
  };

  const handleShare = (id: string) => {
    // Copy share URL to clipboard
    const shareUrl = `${window.location.origin}/itinerary/${id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Share link copied to clipboard!');
    });
  };

  const currentPagination = {
    ...pagination,
    totalItems,
    totalPages: Math.ceil(totalItems / pagination.itemsPerPage),
    hasNextPage: pagination.currentPage < Math.ceil(totalItems / pagination.itemsPerPage),
    hasPreviousPage: pagination.currentPage > 1
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <DashboardContainer>
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Itineraries</h1>
                <p className="text-gray-600">Plan and manage your travel adventures</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <NotificationCenter 
                variant="icon"
                showSettingsButton={true}
                onNotificationClick={(id) => {
                  // Handle notification click - could navigate to relevant page
                  console.log('Notification clicked:', id);
                }}
              />
              
              {/* User Info */}
              <div className="flex items-center gap-3">
                {user?.profilePicture && (
                  <img
                    src={user.profilePicture}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/notifications-test"
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  title="Test notification system"
                >
                  🔔 Test
                </Link>
                
                <Link
                  href="/itinerary/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Itinerary
                </Link>
                
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </DashboardContainer>
      </div>

      {/* Main Content */}
      <DashboardContainer>
        <DashboardSection>
          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex-1 w-full lg:max-w-2xl">
                <SearchAndFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filters={filters}
                  onFiltersChange={setFilters}
                  sort={sort}
                  onSortChange={setSort}
                  availableTags={availableTags}
                  isLoading={isLoading}
                />
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <GridSkeleton count={pagination.itemsPerPage} />
          ) : itineraries.length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <DashboardGrid>
                  {itineraries.map((itinerary) => (
                    <ItineraryCard
                      key={itinerary.id}
                      itinerary={itinerary}
                      onEdit={handleEdit}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                      onShare={handleShare}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </DashboardGrid>
              ) : (
                <div className="space-y-4">
                  {itineraries.map((itinerary) => (
                    <ItineraryCard
                      key={itinerary.id}
                      itinerary={itinerary}
                      onEdit={handleEdit}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                      onShare={handleShare}
                      onToggleFavorite={handleToggleFavorite}
                      className="max-w-none"
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="mt-8">
                <Pagination
                  pagination={currentPagination}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  isLoading={isLoading}
                />
              </div>
            </>
          ) : (
            <EmptyState
              title="No itineraries found"
              description={
                searchQuery || Object.keys(filters).length > 0
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "Get started by creating your first travel itinerary."
              }
              action={
                <Link
                  href="/itinerary/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {searchQuery || Object.keys(filters).length > 0 
                    ? 'Create New Itinerary' 
                    : 'Create Your First Itinerary'
                  }
                </Link>
              }
              icon={<Plus className="h-12 w-12" />}
            />
          )}
        </DashboardSection>
      </DashboardContainer>
    </div>
  );
} 