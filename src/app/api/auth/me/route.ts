import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

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
    
    // Return user data without password
    const { passwordHash, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 