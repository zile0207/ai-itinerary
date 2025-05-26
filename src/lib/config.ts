// Configuration management for the application
export const config = {
  // Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: '24h'
  },
  
  // Application settings
  app: {
    url: process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development'
  },
  
  // API Keys (will be undefined if not set)
  apis: {
    openai: process.env.OPENAI_API_KEY,
    googleMaps: process.env.GOOGLE_MAPS_API_KEY,
    flightApi: process.env.FLIGHT_API_KEY,
    weatherApi: process.env.WEATHER_API_KEY
  },
  
  // OAuth providers
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET
    }
  },
  
  // Email configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  }
};

// Helper function to check if required environment variables are set
export const validateConfig = () => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check JWT secret in production
  if (config.app.environment === 'production' && config.jwt.secret === 'your-secret-key-change-in-production') {
    errors.push('JWT_SECRET must be set to a secure value in production');
  }
  
  // Check for API keys (warnings only, app will work with mock data)
  if (!config.apis.openai) {
    warnings.push('OPENAI_API_KEY not set - AI features will use mock responses');
  }
  
  if (!config.apis.googleMaps) {
    warnings.push('GOOGLE_MAPS_API_KEY not set - maps will show placeholders');
  }
  
  if (!config.oauth.google.clientId || !config.oauth.google.clientSecret) {
    warnings.push('Google OAuth not configured - social login unavailable');
  }
  
  return { warnings, errors };
};

// Environment-specific configurations
export const isDevelopment = config.app.environment === 'development';
export const isProduction = config.app.environment === 'production';
export const isTest = config.app.environment === 'test'; 