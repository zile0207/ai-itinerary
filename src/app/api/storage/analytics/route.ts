import { NextRequest, NextResponse } from 'next/server';
import { getStorageAnalytics } from '@/lib/itinerary-storage';
import { authenticateRequest } from '@/lib/auth';

// GET /api/storage/analytics - Get storage analytics and performance metrics
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const analytics = getStorageAnalytics();

    return NextResponse.json({
      analytics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Storage analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 