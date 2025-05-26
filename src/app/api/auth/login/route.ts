import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mockUsers, User } from '@/lib/mock-data/users';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user in mock data
    const user = mockUsers.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data (without password) and token
    const { passwordHash, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      user: userWithoutPassword,
      token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 