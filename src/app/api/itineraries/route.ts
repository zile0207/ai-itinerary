import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { mockItineraries, findItinerariesByUser, searchItineraries, Itinerary } from '@/lib/mock-data/itineraries';

// GET /api/itineraries - List itineraries with optional search and filtering
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    let itineraries: Itinerary[];
    
    // Get user's itineraries
    itineraries = findItinerariesByUser(user.id);
    
    // Apply search filter
    if (search) {
      itineraries = searchItineraries(search).filter(it => it.createdBy === user.id);
    }
    
    // Apply status filter
    if (status) {
      itineraries = itineraries.filter(it => it.status === status);
    }
    
    // Apply pagination
    const total = itineraries.length;
    const paginatedItineraries = itineraries.slice(offset, offset + limit);
    
    return NextResponse.json({
      itineraries: paginatedItineraries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
    
  } catch (error) {
    console.error('Get itineraries error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/itineraries - Create new itinerary
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    const { user } = authResult;
    const body = await request.json();
    
    const { title, description, destination, startDate, endDate, travelers, budget, tags } = body;
    
    // Validate required fields
    if (!title || !destination || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, destination, start date, and end date are required' },
        { status: 400 }
      );
    }
    
    // Create new itinerary
    const newItinerary: Itinerary = {
      id: (mockItineraries.length + 1).toString(),
      title,
      description: description || '',
      destination,
      startDate,
      endDate,
      travelers: travelers || { adults: 1, children: 0 },
      budget: budget || { total: 0, currency: 'USD', spent: 0 },
      days: [],
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      isPublic: false,
      tags: tags || []
    };
    
    // Add to mock data (in real app, would save to database)
    mockItineraries.push(newItinerary);
    
    return NextResponse.json({
      itinerary: newItinerary,
      message: 'Itinerary created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create itinerary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 