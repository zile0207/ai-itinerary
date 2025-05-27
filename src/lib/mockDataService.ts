import mockDataRaw from '../../data/mockItineraries.json';

export interface Itinerary {
  id: string;
  title: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: 'draft' | 'published' | 'archived';
  thumbnail: string;
  tags: string[];
  budget: {
    total: number;
    currency: string;
  };
  travelers: number;
  isPublic: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  collaborators: string[];
  activities: Activity[];
}

export interface Activity {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  duration: number;
  type: string;
}

export interface FilterOptions {
  status?: string[];
  tags?: string[];
  minBudget?: number;
  maxBudget?: number;
  minDuration?: number;
  maxDuration?: number;
  travelers?: number;
  isFavorite?: boolean;
  isPublic?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SortOptions {
  field: 'title' | 'destination' | 'startDate' | 'endDate' | 'duration' | 'budget' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface SearchResult {
  itineraries: Itinerary[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Simulate network delay
const simulateDelay = (ms: number = 300) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Type assertion for mock data
const mockData = mockDataRaw as { itineraries: Itinerary[]; metadata: any };

// In-memory storage for modifications (simulates database)
let itinerariesCache: Itinerary[] = [...mockData.itineraries];

class MockDataService {
  // Get all itineraries with optional filtering, sorting, and pagination
  async getItineraries(
    filters?: FilterOptions,
    sort?: SortOptions,
    pagination?: PaginationOptions,
    searchQuery?: string
  ): Promise<SearchResult> {
    await simulateDelay();

    let filteredItineraries = [...itinerariesCache];

    // Apply search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredItineraries = filteredItineraries.filter(itinerary =>
        itinerary.title.toLowerCase().includes(query) ||
        itinerary.destination.toLowerCase().includes(query) ||
        itinerary.description.toLowerCase().includes(query) ||
        itinerary.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        filteredItineraries = filteredItineraries.filter(itinerary =>
          filters.status!.includes(itinerary.status)
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredItineraries = filteredItineraries.filter(itinerary =>
          filters.tags!.some(tag => itinerary.tags.includes(tag))
        );
      }

      if (filters.minBudget !== undefined) {
        filteredItineraries = filteredItineraries.filter(itinerary =>
          itinerary.budget.total >= filters.minBudget!
        );
      }

      if (filters.maxBudget !== undefined) {
        filteredItineraries = filteredItineraries.filter(itinerary =>
          itinerary.budget.total <= filters.maxBudget!
        );
      }

      if (filters.minDuration !== undefined) {
        filteredItineraries = filteredItineraries.filter(itinerary =>
          itinerary.duration >= filters.minDuration!
        );
      }

      if (filters.maxDuration !== undefined) {
        filteredItineraries = filteredItineraries.filter(itinerary =>
          itinerary.duration <= filters.maxDuration!
        );
      }

      if (filters.travelers !== undefined) {
        filteredItineraries = filteredItineraries.filter(itinerary =>
          itinerary.travelers === filters.travelers
        );
      }

      if (filters.isFavorite !== undefined) {
        filteredItineraries = filteredItineraries.filter(itinerary =>
          itinerary.isFavorite === filters.isFavorite
        );
      }

      if (filters.isPublic !== undefined) {
        filteredItineraries = filteredItineraries.filter(itinerary =>
          itinerary.isPublic === filters.isPublic
        );
      }

      if (filters.dateRange) {
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        filteredItineraries = filteredItineraries.filter(itinerary => {
          const itineraryStart = new Date(itinerary.startDate);
          const itineraryEnd = new Date(itinerary.endDate);
          return itineraryStart >= startDate && itineraryEnd <= endDate;
        });
      }
    }

    // Apply sorting
    if (sort) {
      filteredItineraries.sort((a, b) => {
        let aValue: any = a[sort.field];
        let bValue: any = b[sort.field];

        // Handle nested budget field
        if (sort.field === 'budget') {
          aValue = a.budget.total;
          bValue = b.budget.total;
        }

        // Handle date fields
        if (['startDate', 'endDate', 'createdAt', 'updatedAt'].includes(sort.field)) {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        // Handle string fields
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default sort by updatedAt desc
      filteredItineraries.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    const total = filteredItineraries.length;

    // Apply pagination
    let paginatedItineraries = filteredItineraries;
    let page = 1;
    let totalPages = 1;
    let hasNext = false;
    let hasPrev = false;

    if (pagination) {
      page = Math.max(1, pagination.page);
      const limit = Math.max(1, pagination.limit);
      totalPages = Math.ceil(total / limit);
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      paginatedItineraries = filteredItineraries.slice(startIndex, endIndex);
      
      hasNext = page < totalPages;
      hasPrev = page > 1;
    }

    return {
      itineraries: paginatedItineraries,
      total,
      page,
      totalPages,
      hasNext,
      hasPrev
    };
  }

  // Get a single itinerary by ID
  async getItineraryById(id: string): Promise<Itinerary | null> {
    await simulateDelay();
    
    const itinerary = itinerariesCache.find(item => item.id === id);
    return itinerary || null;
  }

  // Create a new itinerary
  async createItinerary(itineraryData: Omit<Itinerary, 'id' | 'createdAt' | 'updatedAt'>): Promise<Itinerary> {
    await simulateDelay(500); // Longer delay for create operations
    
    const newItinerary: Itinerary = {
      ...itineraryData,
      id: `itin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    itinerariesCache.unshift(newItinerary); // Add to beginning
    return newItinerary;
  }

  // Update an existing itinerary
  async updateItinerary(id: string, updates: Partial<Itinerary>): Promise<Itinerary | null> {
    await simulateDelay(400);
    
    const index = itinerariesCache.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    const updatedItinerary = {
      ...itinerariesCache[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    itinerariesCache[index] = updatedItinerary;
    return updatedItinerary;
  }

  // Delete an itinerary
  async deleteItinerary(id: string): Promise<boolean> {
    await simulateDelay(300);
    
    const index = itinerariesCache.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    itinerariesCache.splice(index, 1);
    return true;
  }

  // Duplicate an itinerary
  async duplicateItinerary(id: string): Promise<Itinerary | null> {
    await simulateDelay(600);
    
    const original = itinerariesCache.find(item => item.id === id);
    if (!original) return null;
    
    const duplicated: Itinerary = {
      ...original,
      id: `itin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${original.title} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      collaborators: [] // Reset collaborators for duplicated itinerary
    };
    
    itinerariesCache.unshift(duplicated);
    return duplicated;
  }

  // Toggle favorite status
  async toggleFavorite(id: string): Promise<Itinerary | null> {
    await simulateDelay(200);
    
    const index = itinerariesCache.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    itinerariesCache[index] = {
      ...itinerariesCache[index],
      isFavorite: !itinerariesCache[index].isFavorite,
      updatedAt: new Date().toISOString()
    };
    
    return itinerariesCache[index];
  }

  // Get unique tags for filtering
  async getAvailableTags(): Promise<string[]> {
    await simulateDelay(100);
    
    const allTags = itinerariesCache.flatMap(itinerary => itinerary.tags);
    return [...new Set(allTags)].sort();
  }

  // Get statistics for dashboard
  async getStatistics(): Promise<{
    total: number;
    published: number;
    drafts: number;
    favorites: number;
    totalBudget: number;
    averageDuration: number;
    popularDestinations: { destination: string; count: number }[];
    recentActivity: Itinerary[];
  }> {
    await simulateDelay(200);
    
    const total = itinerariesCache.length;
    const published = itinerariesCache.filter(item => item.status === 'published').length;
    const drafts = itinerariesCache.filter(item => item.status === 'draft').length;
    const favorites = itinerariesCache.filter(item => item.isFavorite).length;
    
    const totalBudget = itinerariesCache.reduce((sum, item) => sum + item.budget.total, 0);
    const averageDuration = itinerariesCache.reduce((sum, item) => sum + item.duration, 0) / total;
    
    // Get popular destinations
    const destinationCounts = itinerariesCache.reduce((acc, item) => {
      acc[item.destination] = (acc[item.destination] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const popularDestinations = Object.entries(destinationCounts)
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Get recent activity (last 5 updated)
    const recentActivity = [...itinerariesCache]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
    
    return {
      total,
      published,
      drafts,
      favorites,
      totalBudget,
      averageDuration,
      popularDestinations,
      recentActivity
    };
  }

  // Reset cache to original data (useful for testing)
  async resetData(): Promise<void> {
    await simulateDelay(100);
    itinerariesCache = [...mockData.itineraries];
  }

  // Bulk operations
  async bulkUpdateStatus(ids: string[], status: Itinerary['status']): Promise<Itinerary[]> {
    await simulateDelay(800);
    
    const updatedItineraries: Itinerary[] = [];
    
    for (const id of ids) {
      const index = itinerariesCache.findIndex(item => item.id === id);
      if (index !== -1) {
        itinerariesCache[index] = {
          ...itinerariesCache[index],
          status,
          updatedAt: new Date().toISOString()
        };
        updatedItineraries.push(itinerariesCache[index]);
      }
    }
    
    return updatedItineraries;
  }

  async bulkDelete(ids: string[]): Promise<string[]> {
    await simulateDelay(600);
    
    const deletedIds: string[] = [];
    
    for (const id of ids) {
      const index = itinerariesCache.findIndex(item => item.id === id);
      if (index !== -1) {
        itinerariesCache.splice(index, 1);
        deletedIds.push(id);
      }
    }
    
    return deletedIds;
  }
}

// Export singleton instance
export const mockDataService = new MockDataService();

// Export utility functions
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;
    } else {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  } else {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
};

export const getDurationText = (duration: number): string => {
  if (duration === 1) return '1 day';
  if (duration < 7) return `${duration} days`;
  if (duration === 7) return '1 week';
  if (duration < 14) return `1 week, ${duration - 7} days`;
  if (duration === 14) return '2 weeks';
  if (duration < 30) return `${Math.floor(duration / 7)} weeks`;
  return `${Math.floor(duration / 30)} months`;
};

export default mockDataService; 