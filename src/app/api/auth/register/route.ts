import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mockUsers, User, findUserByEmail } from '@/lib/mock-data/users';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const newUser: User = {
      id: (mockUsers.length + 1).toString(),
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        currency: 'USD',
        notificationSettings: {
          email: true,
          push: true,
          sms: false
        },
        travelInterests: []
      },
      isEmailVerified: false // In real app, would send verification email
    };

    // Add to mock users (in real app, would save to database)
    mockUsers.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data (without password) and token
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json({
      user: userWithoutPassword,
      token,
      message: 'Registration successful'
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 