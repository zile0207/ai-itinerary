import { NextRequest, NextResponse } from 'next/server';
import { ContextPerformanceMonitor } from '@/lib/context-performance';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get('hours') || '24');
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        const stats = ContextPerformanceMonitor.getPerformanceStats(timeRange);
        return NextResponse.json({
          success: true,
          timeRangeHours: timeRange,
          stats
        });

      case 'breakdown':
        const breakdown = ContextPerformanceMonitor.getContextTypeBreakdown(timeRange);
        return NextResponse.json({
          success: true,
          timeRangeHours: timeRange,
          breakdown
        });

      case 'export':
        const metrics = ContextPerformanceMonitor.exportMetrics();
        return NextResponse.json({
          success: true,
          metrics: metrics.slice(-100) // Return last 100 metrics
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: stats, breakdown, or export' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching context metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch context metrics' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    ContextPerformanceMonitor.clearMetrics();
    return NextResponse.json({
      success: true,
      message: 'Context metrics cleared'
    });
  } catch (error) {
    console.error('Error clearing context metrics:', error);
    return NextResponse.json(
      { error: 'Failed to clear context metrics' },
      { status: 500 }
    );
  }
} 