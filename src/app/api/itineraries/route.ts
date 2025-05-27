import { NextRequest, NextResponse } from 'next/server';
import { mockDataService } from '@/lib/mockDataService';
import type { Itinerary } from '@/lib/mockDataService';

// GET /api/itineraries - List itineraries with optional search and filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    
    const result = await mockDataService.getItineraries(undefined, undefined, undefined, search);
    
    return NextResponse.json({ 
      itineraries: result.itineraries,
      total: result.total 
    });
  } catch (error) {
    console.error('Error fetching itineraries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch itineraries' },
      { status: 500 }
    );
  }
}

// POST /api/itineraries - Create new itinerary
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.destination || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: title, destination, startDate, endDate' },
        { status: 400 }
      );
    }

    // For now, use a mock user ID - in a real app, get this from authentication
    const userId = 'test-user-123';
    
    // Calculate duration
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const createRequest: Omit<Itinerary, 'id' | 'createdAt' | 'updatedAt'> = {
      title: body.title,
      description: body.description || '',
      destination: body.destination,
      startDate: body.startDate,
      endDate: body.endDate,
      duration: duration,
      status: 'draft',
      thumbnail: '',
      tags: body.tags || [],
      budget: body.budget || { total: 0, currency: 'USD' },
      travelers: body.travelers?.adults || body.travelers || 1,
      isPublic: false,
      isFavorite: false,
      createdBy: userId,
      collaborators: [],
      activities: []
    };

    const itinerary = await mockDataService.createItinerary(createRequest);
    
    return NextResponse.json({ 
      itinerary,
      message: 'Itinerary created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to create itinerary' },
      { status: 500 }
    );
  }
} 