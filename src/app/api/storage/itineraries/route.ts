import { NextRequest, NextResponse } from 'next/server';
import { listItineraries, loadItinerary, deleteItinerary } from '@/lib/itinerary-storage';
import { authenticateRequest } from '@/lib/auth';

// GET /api/storage/itineraries - List stored itineraries with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') as 'created' | 'modified' | 'size' | undefined;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;
    const destination = searchParams.get('destination') || undefined;
    const travelers = searchParams.get('travelers') ? parseInt(searchParams.get('travelers')!) : undefined;
    
    // Parse date range if provided
    let dateRange: { start: string; end: string } | undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      dateRange = { start: startDate, end: endDate };
    }

    const options = {
      limit,
      offset,
      sortBy,
      sortOrder,
      filter: {
        destination,
        dateRange,
        travelers
      }
    };

    // Remove undefined values from filter
    Object.keys(options.filter).forEach(key => {
      if (options.filter[key as keyof typeof options.filter] === undefined) {
        delete options.filter[key as keyof typeof options.filter];
      }
    });

    const entries = await listItineraries(options);

    return NextResponse.json({
      itineraries: entries,
      pagination: {
        limit,
        offset,
        total: entries.length,
        hasMore: entries.length === limit
      }
    });
    
  } catch (error) {
    console.error('List itineraries error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/storage/itineraries - Delete multiple itineraries
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'IDs array is required' },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      ids.map(id => deleteItinerary(id))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      message: `Deleted ${successful} itineraries, ${failed} failed`,
      successful,
      failed,
      details: results.map((result, index) => ({
        id: ids[index],
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? result.reason?.message : undefined
      }))
    });
    
  } catch (error) {
    console.error('Delete itineraries error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 