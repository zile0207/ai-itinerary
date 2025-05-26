// Custom error classes for different types of errors
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class APIError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

// Error handling utilities
export const errorHandler = {
  // Parse error from API response
  parseApiError(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  },

  // Check if error is a network error
  isNetworkError(error: any): boolean {
    return (
      !error.response &&
      error.request &&
      (error.code === 'NETWORK_ERROR' || 
       error.message?.includes('Network Error') ||
       error.message?.includes('fetch'))
    );
  },

  // Check if error is an authentication error
  isAuthError(error: any): boolean {
    return (
      error.response?.status === 401 ||
      error.response?.status === 403 ||
      error instanceof AuthenticationError ||
      error.message?.toLowerCase().includes('authentication') ||
      error.message?.toLowerCase().includes('unauthorized')
    );
  },

  // Check if error is a validation error
  isValidationError(error: any): boolean {
    return (
      error.response?.status === 400 ||
      error instanceof ValidationError ||
      error.message?.toLowerCase().includes('validation')
    );
  },

  // Log error for debugging
  logError(error: Error, context?: string) {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    };

    console.error('Error logged:', errorInfo);

    // In production, you would send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, { extra: errorInfo });
    }
  },

  // Create user-friendly error message
  createUserMessage(error: any): string {
    if (this.isNetworkError(error)) {
      return 'Please check your internet connection and try again.';
    }

    if (this.isAuthError(error)) {
      return 'Your session has expired. Please sign in again.';
    }

    if (this.isValidationError(error)) {
      return this.parseApiError(error);
    }

    if (error.response?.status >= 500) {
      return 'We\'re experiencing technical difficulties. Please try again later.';
    }

    return this.parseApiError(error);
  }
};

// Retry utility for failed requests
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry authentication or validation errors
      if (errorHandler.isAuthError(error) || errorHandler.isValidationError(error)) {
        throw error;
      }

      // Wait before retrying (with exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError!;
};

// Form error utilities
export const formErrorHandler = {
  // Extract field errors from API response
  extractFieldErrors(error: any): Record<string, string> {
    const fieldErrors: Record<string, string> = {};

    if (error.response?.data?.errors) {
      // Handle validation errors from backend
      const errors = error.response.data.errors;
      
      if (Array.isArray(errors)) {
        errors.forEach((err: any) => {
          if (err.field && err.message) {
            fieldErrors[err.field] = err.message;
          }
        });
      } else if (typeof errors === 'object') {
        Object.keys(errors).forEach(field => {
          fieldErrors[field] = errors[field];
        });
      }
    }

    return fieldErrors;
  },

  // Create general form error message
  getFormErrorMessage(error: any): string | null {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (errorHandler.isValidationError(error)) {
      return 'Please check the form for errors and try again.';
    }

    return errorHandler.createUserMessage(error);
  }
};

// Type guards for error checking
export const isError = (value: any): value is Error => {
  return value instanceof Error;
};

export const isAPIError = (error: any): error is APIError => {
  return error instanceof APIError;
};

export const isAuthenticationError = (error: any): error is AuthenticationError => {
  return error instanceof AuthenticationError;
};

export const isValidationError = (error: any): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isNetworkError = (error: any): error is NetworkError => {
  return error instanceof NetworkError;
}; 