/**
 * Error Handler Tests
 * 
 * Tests for the comprehensive error handling and retry logic system
 */

import { 
  ErrorHandler, 
  ErrorType, 
  ErrorSeverity,
  FallbackStrategy,
  withRetry,
  withRetryAndFallback,
  classifyError
} from '../error-handler';

/**
 * Simple test runner
 */
function runTest(name: string, testFn: () => void | Promise<void>): void {
  try {
    const result = testFn();
    if (result instanceof Promise) {
      result
        .then(() => console.log(`✅ ${name}`))
        .catch(error => console.error(`❌ ${name}: ${error.message}`));
    } else {
      console.log(`✅ ${name}`);
    }
  } catch (error) {
    console.error(`❌ ${name}: ${(error as Error).message}`);
  }
}

/**
 * Test error classification
 */
runTest('Error Classification - Network Error', () => {
  const networkError = new Error('Network connection failed');
  const classified = classifyError(networkError);
  
  if (classified.type !== ErrorType.NETWORK_ERROR) {
    throw new Error('Should classify as network error');
  }
  
  if (!classified.retryable) {
    throw new Error('Network errors should be retryable');
  }
  
  if (classified.severity !== ErrorSeverity.MEDIUM) {
    throw new Error('Network errors should have medium severity');
  }
});

/**
 * Test error classification with status codes
 */
runTest('Error Classification - Rate Limit', () => {
  const rateLimitError = new Error('Too many requests');
  const classified = classifyError(rateLimitError, { statusCode: 429 });
  
  if (classified.type !== ErrorType.RATE_LIMIT) {
    throw new Error('Should classify as rate limit error');
  }
  
  if (!classified.retryable) {
    throw new Error('Rate limit errors should be retryable');
  }
  
  if (classified.metadata.statusCode !== 429) {
    throw new Error('Should preserve status code in metadata');
  }
});

/**
 * Test authentication error classification
 */
runTest('Error Classification - Authentication', () => {
  const authError = new Error('Unauthorized');
  const classified = classifyError(authError, { statusCode: 401 });
  
  if (classified.type !== ErrorType.AUTHENTICATION) {
    throw new Error('Should classify as authentication error');
  }
  
  if (classified.retryable) {
    throw new Error('Authentication errors should not be retryable');
  }
  
  if (classified.severity !== ErrorSeverity.HIGH) {
    throw new Error('Authentication errors should have high severity');
  }
});

/**
 * Test successful operation with retry
 */
runTest('Retry Logic - Successful Operation', async () => {
  let callCount = 0;
  
  const operation = async () => {
    callCount++;
    return 'success';
  };
  
  const result = await withRetry(operation);
  
  if (!result.success) {
    throw new Error('Should succeed on first attempt');
  }
  
  if (result.data !== 'success') {
    throw new Error('Should return correct data');
  }
  
  if (callCount !== 1) {
    throw new Error('Should only call operation once');
  }
  
  if (result.attempts.length !== 0) {
    throw new Error('Should have no retry attempts for successful operation');
  }
});

/**
 * Test retry logic with eventual success
 */
runTest('Retry Logic - Eventual Success', async () => {
  let callCount = 0;
  
  const operation = async () => {
    callCount++;
    if (callCount < 3) {
      const error = new Error('Temporary network error');
      throw error;
    }
    return 'success';
  };
  
  const result = await withRetry(operation, {
    maxAttempts: 3,
    baseDelayMs: 10, // Short delay for testing
    retryableErrors: [ErrorType.NETWORK_ERROR]
  });
  
  if (!result.success) {
    throw new Error('Should eventually succeed');
  }
  
  if (result.data !== 'success') {
    throw new Error('Should return correct data');
  }
  
  if (callCount !== 3) {
    throw new Error('Should call operation 3 times');
  }
  
  if (result.attempts.length !== 2) {
    throw new Error('Should have 2 retry attempts');
  }
});

/**
 * Test retry logic with permanent failure
 */
runTest('Retry Logic - Permanent Failure', async () => {
  let callCount = 0;
  
  const operation = async () => {
    callCount++;
    const error = new Error('Authentication failed');
    (error as any).statusCode = 401;
    throw error;
  };
  
  const result = await withRetry(operation, {
    maxAttempts: 3,
    baseDelayMs: 10,
    retryableErrors: [ErrorType.NETWORK_ERROR] // Auth errors not retryable
  });
  
  if (result.success) {
    throw new Error('Should fail for non-retryable error');
  }
  
  if (callCount !== 1) {
    throw new Error('Should only call operation once for non-retryable error');
  }
  
  if (!result.error) {
    throw new Error('Should have error information');
  }
  
  if (result.error.type !== ErrorType.AUTHENTICATION) {
    throw new Error('Should classify error correctly');
  }
});

/**
 * Test retry with timeout
 */
runTest('Retry Logic - Timeout', async () => {
  const operation = async () => {
    // Simulate long operation
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'success';
  };
  
  const result = await withRetry(operation, {
    maxAttempts: 1,
    timeoutMs: 50 // Shorter than operation time
  });
  
  if (result.success) {
    throw new Error('Should fail due to timeout');
  }
  
  if (!result.error?.message.includes('timeout')) {
    throw new Error('Should indicate timeout error');
  }
});

/**
 * Test fallback strategies
 */
runTest('Fallback Strategies - Basic Template', async () => {
  const operation = async () => {
    throw new Error('Service unavailable');
  };
  
  const result = await withRetryAndFallback(
    operation,
    [FallbackStrategy.BASIC_TEMPLATE],
    { maxAttempts: 1 }
  );
  
  if (!result.success) {
    throw new Error('Should succeed with fallback');
  }
  
  if (!result.fallbackUsed) {
    throw new Error('Should indicate fallback was used');
  }
  
  if (result.fallbackUsed.strategy !== FallbackStrategy.BASIC_TEMPLATE) {
    throw new Error('Should use correct fallback strategy');
  }
  
  if (!result.data) {
    throw new Error('Should return fallback data');
  }
});

/**
 * Test cached response fallback
 */
runTest('Fallback Strategies - Cached Response', async () => {
  // Clear any existing cache
  ErrorHandler.clearHistory();
  
  // Add a response to cache
  const mockItinerary = {
    id: 'test-itinerary',
    title: 'Test Itinerary',
    destination: 'Test City',
    startDate: '2024-06-01',
    endDate: '2024-06-07',
    totalDays: 7,
    totalCost: {
      amount: 1000,
      currency: 'USD',
      breakdown: {
        accommodation: 400,
        activities: 300,
        meals: 200,
        transport: 100,
        other: 0
      }
    },
    days: [],
    travelers: { adults: 2, children: 0, infants: 0 },
    metadata: {
      generatedAt: '2024-06-01T00:00:00Z',
      model: 'test-model',
      citations: []
    }
  } as any;
  
  ErrorHandler.cacheResponse('test-key', mockItinerary);
  
  const operation = async () => {
    throw new Error('Service unavailable');
  };
  
  const result = await withRetryAndFallback(
    operation,
    [FallbackStrategy.CACHED_RESPONSE],
    { maxAttempts: 1 }
  );
  
  if (!result.success) {
    throw new Error('Should succeed with cached fallback');
  }
  
  if (!result.fallbackUsed) {
    throw new Error('Should indicate fallback was used');
  }
  
  if (result.fallbackUsed.strategy !== FallbackStrategy.CACHED_RESPONSE) {
    throw new Error('Should use cached response strategy');
  }
});

/**
 * Test retry statistics
 */
runTest('Retry Statistics', async () => {
  // Clear history first
  ErrorHandler.clearHistory();
  
  // Perform some operations that will generate retry attempts
  const failingOperation = async () => {
    throw new Error('Network error');
  };
  
  // Run a few failing operations
  await withRetry(failingOperation, { maxAttempts: 2, baseDelayMs: 1 });
  await withRetry(failingOperation, { maxAttempts: 2, baseDelayMs: 1 });
  
  const stats = ErrorHandler.getRetryStatistics();
  
  if (stats.totalOperations === 0) {
    throw new Error('Should track operations');
  }
  
  if (stats.failedOperations === 0) {
    throw new Error('Should track failed operations');
  }
  
  if (Object.keys(stats.errorBreakdown).length === 0) {
    throw new Error('Should provide error breakdown');
  }
});

/**
 * Test delay calculation
 */
runTest('Delay Calculation', async () => {
  const delays: number[] = [];
  let callCount = 0;
  
  const operation = async () => {
    callCount++;
    if (callCount <= 3) {
      throw new Error('Network error');
    }
    return 'success';
  };
  
  // Mock the sleep function to capture delays
  const originalSleep = (ErrorHandler as any).sleep;
  (ErrorHandler as any).sleep = async (ms: number) => {
    delays.push(ms);
    return originalSleep.call(ErrorHandler, 1); // Use very short delay for testing
  };
  
  try {
    await withRetry(operation, {
      maxAttempts: 4,
      baseDelayMs: 100,
      backoffMultiplier: 2,
      jitterMs: 0 // No jitter for predictable testing
    });
    
    if (delays.length !== 3) {
      throw new Error('Should have 3 delays for 3 retries');
    }
    
    // Check exponential backoff (approximately, allowing for some variance)
    if (delays[0] < 90 || delays[0] > 110) {
      throw new Error('First delay should be around 100ms');
    }
    
    if (delays[1] < 190 || delays[1] > 210) {
      throw new Error('Second delay should be around 200ms');
    }
    
    if (delays[2] < 390 || delays[2] > 410) {
      throw new Error('Third delay should be around 400ms');
    }
    
  } finally {
    // Restore original sleep function
    (ErrorHandler as any).sleep = originalSleep;
  }
});

/**
 * Test cache management
 */
runTest('Cache Management', () => {
  ErrorHandler.clearHistory();
  
  // Add multiple responses to test cache size management
  for (let i = 0; i < 105; i++) {
    const mockItinerary = {
      id: `test-${i}`,
      title: `Test ${i}`,
      destination: 'Test City',
      startDate: '2024-06-01',
      endDate: '2024-06-07',
      totalDays: 7,
      totalCost: { amount: 1000, currency: 'USD', breakdown: { accommodation: 0, activities: 0, meals: 0, transport: 0, other: 0 } },
      days: [],
      travelers: { adults: 2, children: 0, infants: 0 },
      metadata: { generatedAt: '2024-06-01T00:00:00Z', model: 'test', citations: [] }
    } as any;
    
    ErrorHandler.cacheResponse(`key-${i}`, mockItinerary);
  }
  
  // Cache should be limited to 100 items
  const cacheSize = (ErrorHandler as any).fallbackCache.size;
  if (cacheSize > 100) {
    throw new Error('Cache should be limited to 100 items');
  }
});

console.log('\n🧪 Error Handler Tests Complete');
console.log('Run this file with: npx tsx src/lib/__tests__/error-handler.test.ts'); 