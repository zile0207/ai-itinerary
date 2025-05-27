export interface Activity {
  id: string;
  name: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  cost?: number;
  category?: string;
  notes?: string;
  bookingRequired?: boolean;
  bookingUrl?: string;
}

export interface Day {
  day: number;
  date: string;
  location?: string;
  activities: Activity[];
  notes?: string;
  totalCost?: number;
}

export interface Itinerary {
  id: string;
  name: string;
  description?: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  duration: number;
  travelers: number;
  budget?: number;
  currency?: string;
  days: Day[];
  tags?: string[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface ItineraryVersion {
  id: string;
  itineraryId: string;
  versionNumber: number;
  name: string;
  data: Itinerary;
  createdAt: string;
  changeNotes?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface ItineraryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  estimatedCost?: number;
  destinations: string[];
  tags: string[];
  templateData: Partial<Itinerary>;
  isPublic: boolean;
  rating?: number;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface SharedItinerary {
  id: string;
  itineraryId: string;
  shareToken: string;
  permissions: ('view' | 'edit' | 'comment')[];
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  accessCount?: number;
}

export interface ItineraryComment {
  id: string;
  itineraryId: string;
  dayNumber?: number;
  activityId?: string;
  content: string;
  authorName?: string;
  authorEmail?: string;
  createdAt: string;
  isResolved?: boolean;
} 