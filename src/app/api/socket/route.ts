import { Server as NetServer } from 'http';
import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { initSocketServer, getSocketServer } from '@/lib/socket/server';

// Extend the global object to store the socket server
declare global {
  var socketio: SocketIOServer | undefined;
}

export async function GET(req: NextRequest) {
  try {
    // Return connection info for the client
    return NextResponse.json({
      message: 'Socket.io server is running',
      endpoint: '/api/socket',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Socket.io API] Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Socket.io server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Handle Socket.io initialization
    if (!global.socketio) {
      console.log('[Socket.io API] Initializing Socket.io server...');
      
      // In Next.js App Router, we need to get the server instance differently
      // This is a placeholder - the actual server setup will be handled in a custom server
      const response = NextResponse.json({
        message: 'Socket.io server initialization requested',
        status: 'pending'
      });
      
      return response;
    }

    return NextResponse.json({
      message: 'Socket.io server already running',
      status: 'active'
    });
  } catch (error) {
    console.error('[Socket.io API] Error in POST handler:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Socket.io server' },
      { status: 500 }
    );
  }
}

// Handle upgrade requests for WebSocket connections
export async function PATCH(req: NextRequest) {
  try {
    return NextResponse.json({
      message: 'Socket.io upgrade endpoint',
      note: 'WebSocket upgrades are handled by the custom server'
    });
  } catch (error) {
    console.error('[Socket.io API] Error in PATCH handler:', error);
    return NextResponse.json(
      { error: 'Socket.io upgrade error' },
      { status: 500 }
    );
  }
} 