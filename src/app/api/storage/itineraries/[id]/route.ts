import { NextRequest, NextResponse } from 'next/server';
import { loadItinerary, deleteItinerary } from '@/lib/itinerary-storage';
import { authenticateRequest } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/storage/itineraries/[id] - Get specific stored itinerary
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const itinerary = await loadItinerary(id);

    return NextResponse.json({
      itinerary,
      loadedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Load itinerary error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/storage/itineraries/[id] - Delete specific stored itinerary
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const success = await deleteItinerary(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Itinerary deleted successfully',
      id,
      deletedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Delete itinerary error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 