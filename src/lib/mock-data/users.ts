import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  profilePicture?: string;
  preferences: UserPreferences;
  isEmailVerified: boolean;
}

export interface UserPreferences {
  currency: string;
  notificationSettings: NotificationSettings;
  travelInterests: string[];
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
}

// Pre-hashed passwords for demo users (password: "password123")
const hashedPassword = bcrypt.hashSync('password123', 10);

// Pre-hashed password for test account (password: "Test1234")
const testPassword = bcrypt.hashSync('Test1234', 10);

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'john.doe@example.com',
    passwordHash: hashedPassword,
    firstName: 'John',
    lastName: 'Doe',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    lastLogin: '2024-01-20T14:30:00Z',
    profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    preferences: {
      currency: 'USD',
      notificationSettings: {
        email: true,
        push: true,
        sms: false
      },
      travelInterests: ['adventure', 'culture', 'food', 'nature']
    },
    isEmailVerified: true
  },
  {
    id: '2',
    email: 'jane.smith@example.com',
    passwordHash: hashedPassword,
    firstName: 'Jane',
    lastName: 'Smith',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-18T16:45:00Z',
    lastLogin: '2024-01-19T09:15:00Z',
    profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    preferences: {
      currency: 'EUR',
      notificationSettings: {
        email: true,
        push: false,
        sms: true
      },
      travelInterests: ['luxury', 'relaxation', 'culture', 'shopping']
    },
    isEmailVerified: true
  },
  {
    id: '3',
    email: 'demo@example.com',
    passwordHash: hashedPassword,
    firstName: 'Demo',
    lastName: 'User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-21T12:00:00Z',
    lastLogin: '2024-01-21T12:00:00Z',
    profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
    preferences: {
      currency: 'USD',
      notificationSettings: {
        email: true,
        push: true,
        sms: false
      },
      travelInterests: ['budget', 'backpacking', 'adventure', 'local-experiences']
    },
    isEmailVerified: true
  },
  {
    id: '4',
    email: 'test@gmail.com',
    passwordHash: testPassword,
    firstName: 'Test',
    lastName: 'User',
    createdAt: '2025-05-27T08:00:00Z',
    updatedAt: '2025-05-27T08:00:00Z',
    lastLogin: '2025-05-27T08:00:00Z',
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    preferences: {
      currency: 'USD',
      notificationSettings: {
        email: true,
        push: true,
        sms: false
      },
      travelInterests: ['technology', 'urban-exploration', 'photography', 'food']
    },
    isEmailVerified: true
  }
];

// Helper function to find user by email
export const findUserByEmail = (email: string): User | undefined => {
  return mockUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
};

// Helper function to find user by ID
export const findUserById = (id: string): User | undefined => {
  return mockUsers.find(user => user.id === id);
}; 