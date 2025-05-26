import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { mockItineraries, findItineraryById } from '@/lib/mock-data/itineraries';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/itineraries/[id] - Get specific itinerary
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    const { user } = authResult;
    const itinerary = findItineraryById(params.id);
    
    if (!itinerary) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the itinerary or if it's public
    if (itinerary.createdBy !== user.id && !itinerary.isPublic) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ itinerary });
    
  } catch (error) {
    console.error('Get itinerary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/itineraries/[id] - Update itinerary
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    const { user } = authResult;
    const itineraryIndex = mockItineraries.findIndex(it => it.id === params.id);
    
    if (itineraryIndex === -1) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      );
    }
    
    const itinerary = mockItineraries[itineraryIndex];
    
    // Check if user owns the itinerary
    if (itinerary.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const updates = await request.json();
    
    // Update itinerary
    const updatedItinerary = {
      ...itinerary,
      ...updates,
      id: itinerary.id, // Prevent ID changes
      createdBy: itinerary.createdBy, // Prevent ownership changes
      createdAt: itinerary.createdAt, // Prevent creation date changes
      updatedAt: new Date().toISOString()
    };
    
    mockItineraries[itineraryIndex] = updatedItinerary;
    
    return NextResponse.json({
      itinerary: updatedItinerary,
      message: 'Itinerary updated successfully'
    });
    
  } catch (error) {
    console.error('Update itinerary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/itineraries/[id] - Delete itinerary
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    const { user } = authResult;
    const itineraryIndex = mockItineraries.findIndex(it => it.id === params.id);
    
    if (itineraryIndex === -1) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      );
    }
    
    const itinerary = mockItineraries[itineraryIndex];
    
    // Check if user owns the itinerary
    if (itinerary.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Remove itinerary from mock data
    mockItineraries.splice(itineraryIndex, 1);
    
    return NextResponse.json({
      message: 'Itinerary deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete itinerary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 