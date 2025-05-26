export interface Activity {
  id: string;
  title: string;
  description: string;
  location: {
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  startTime: string;
  endTime: string;
  category: 'attraction' | 'restaurant' | 'accommodation' | 'transport' | 'activity' | 'shopping';
  estimatedCost: {
    amount: number;
    currency: string;
  };
  notes?: string;
  bookingInfo?: {
    confirmationNumber?: string;
    website?: string;
    phone?: string;
  };
}

export interface DayPlan {
  date: string;
  activities: Activity[];
  notes?: string;
}

export interface Itinerary {
  id: string;
  title: string;
  description: string;
  destination: {
    city: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  startDate: string;
  endDate: string;
  travelers: {
    adults: number;
    children: number;
  };
  budget: {
    total: number;
    currency: string;
    spent: number;
  };
  days: DayPlan[];
  createdBy: string; // User ID
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'planned' | 'active' | 'completed';
  isPublic: boolean;
  tags: string[];
  coverImage?: string;
}

export const mockItineraries: Itinerary[] = [
  {
    id: '1',
    title: 'Tokyo Adventure',
    description: 'A week-long exploration of Tokyo\'s culture, food, and modern attractions',
    destination: {
      city: 'Tokyo',
      country: 'Japan',
      coordinates: {
        lat: 35.6762,
        lng: 139.6503
      }
    },
    startDate: '2024-03-15',
    endDate: '2024-03-22',
    travelers: {
      adults: 2,
      children: 0
    },
    budget: {
      total: 3000,
      currency: 'USD',
      spent: 1200
    },
    days: [
      {
        date: '2024-03-15',
        activities: [
          {
            id: 'a1',
            title: 'Arrival at Narita Airport',
            description: 'Land at Narita and take the train to Shibuya',
            location: {
              name: 'Narita International Airport',
              address: '1-1 Furugome, Narita, Chiba 282-0004, Japan',
              coordinates: { lat: 35.7720, lng: 140.3929 }
            },
            startTime: '14:00',
            endTime: '16:00',
            category: 'transport',
            estimatedCost: { amount: 50, currency: 'USD' }
          },
          {
            id: 'a2',
            title: 'Check-in at Hotel',
            description: 'Check into hotel in Shibuya district',
            location: {
              name: 'Shibuya Hotel',
              address: 'Shibuya, Tokyo, Japan',
              coordinates: { lat: 35.6598, lng: 139.7006 }
            },
            startTime: '16:30',
            endTime: '17:30',
            category: 'accommodation',
            estimatedCost: { amount: 150, currency: 'USD' }
          },
          {
            id: 'a3',
            title: 'Dinner at Izakaya',
            description: 'Traditional Japanese dinner experience',
            location: {
              name: 'Local Izakaya',
              address: 'Shibuya, Tokyo, Japan',
              coordinates: { lat: 35.6598, lng: 139.7006 }
            },
            startTime: '19:00',
            endTime: '21:00',
            category: 'restaurant',
            estimatedCost: { amount: 80, currency: 'USD' }
          }
        ]
      },
      {
        date: '2024-03-16',
        activities: [
          {
            id: 'a4',
            title: 'Visit Senso-ji Temple',
            description: 'Explore Tokyo\'s oldest temple in Asakusa',
            location: {
              name: 'Senso-ji Temple',
              address: '2-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan',
              coordinates: { lat: 35.7148, lng: 139.7967 }
            },
            startTime: '09:00',
            endTime: '11:00',
            category: 'attraction',
            estimatedCost: { amount: 0, currency: 'USD' }
          },
          {
            id: 'a5',
            title: 'Lunch at Tsukiji Market',
            description: 'Fresh sushi and seafood at the famous market',
            location: {
              name: 'Tsukiji Outer Market',
              address: 'Tsukiji, Chuo City, Tokyo, Japan',
              coordinates: { lat: 35.6654, lng: 139.7707 }
            },
            startTime: '12:00',
            endTime: '13:30',
            category: 'restaurant',
            estimatedCost: { amount: 60, currency: 'USD' }
          }
        ]
      }
    ],
    createdBy: '1',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    status: 'planned',
    isPublic: false,
    tags: ['culture', 'food', 'urban', 'asia'],
    coverImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=400&fit=crop'
  },
  {
    id: '2',
    title: 'Paris Romance',
    description: 'A romantic getaway in the City of Light',
    destination: {
      city: 'Paris',
      country: 'France',
      coordinates: {
        lat: 48.8566,
        lng: 2.3522
      }
    },
    startDate: '2024-04-10',
    endDate: '2024-04-15',
    travelers: {
      adults: 2,
      children: 0
    },
    budget: {
      total: 2500,
      currency: 'EUR',
      spent: 800
    },
    days: [
      {
        date: '2024-04-10',
        activities: [
          {
            id: 'b1',
            title: 'Eiffel Tower Visit',
            description: 'Iconic tower visit with sunset views',
            location: {
              name: 'Eiffel Tower',
              address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
              coordinates: { lat: 48.8584, lng: 2.2945 }
            },
            startTime: '17:00',
            endTime: '19:00',
            category: 'attraction',
            estimatedCost: { amount: 25, currency: 'EUR' }
          }
        ]
      }
    ],
    createdBy: '2',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-18T16:45:00Z',
    status: 'draft',
    isPublic: true,
    tags: ['romance', 'culture', 'europe', 'luxury'],
    coverImage: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=400&fit=crop'
  },
  {
    id: '3',
    title: 'Bali Relaxation',
    description: 'Tropical paradise with beaches, temples, and wellness',
    destination: {
      city: 'Ubud',
      country: 'Indonesia',
      coordinates: {
        lat: -8.5069,
        lng: 115.2625
      }
    },
    startDate: '2024-05-01',
    endDate: '2024-05-08',
    travelers: {
      adults: 1,
      children: 0
    },
    budget: {
      total: 1500,
      currency: 'USD',
      spent: 0
    },
    days: [
      {
        date: '2024-05-01',
        activities: [
          {
            id: 'c1',
            title: 'Arrival in Ubud',
            description: 'Check into eco-resort and explore local area',
            location: {
              name: 'Ubud Center',
              address: 'Ubud, Gianyar Regency, Bali, Indonesia',
              coordinates: { lat: -8.5069, lng: 115.2625 }
            },
            startTime: '15:00',
            endTime: '18:00',
            category: 'accommodation',
            estimatedCost: { amount: 100, currency: 'USD' }
          }
        ]
      }
    ],
    createdBy: '3',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-21T12:00:00Z',
    status: 'draft',
    isPublic: false,
    tags: ['relaxation', 'nature', 'wellness', 'tropical'],
    coverImage: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800&h=400&fit=crop'
  }
];

// Helper functions
export const findItineraryById = (id: string): Itinerary | undefined => {
  return mockItineraries.find(itinerary => itinerary.id === id);
};

export const findItinerariesByUser = (userId: string): Itinerary[] => {
  return mockItineraries.filter(itinerary => itinerary.createdBy === userId);
};

export const searchItineraries = (query: string): Itinerary[] => {
  const lowercaseQuery = query.toLowerCase();
  return mockItineraries.filter(itinerary => 
    itinerary.title.toLowerCase().includes(lowercaseQuery) ||
    itinerary.description.toLowerCase().includes(lowercaseQuery) ||
    itinerary.destination.city.toLowerCase().includes(lowercaseQuery) ||
    itinerary.destination.country.toLowerCase().includes(lowercaseQuery) ||
    itinerary.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
}; 