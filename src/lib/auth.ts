import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { findUserById } from './mock-data/users';
import { config } from './config';

const JWT_SECRET = config.jwt.secret;

export interface JWTPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

export async function authenticateRequest(request: NextRequest) {
  const token = getTokenFromRequest(request);
  
  if (!token) {
    return { error: 'No token provided', status: 401 };
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return { error: 'Invalid token', status: 401 };
  }
  
  // Verify user still exists
  const user = findUserById(payload.userId);
  
  if (!user) {
    return { error: 'User not found', status: 401 };
  }
  
  return { user, payload };
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
} 