/**
 * Basic tests for Context Formatting System
 * 
 * These tests verify the core functionality of the context formatter
 * without requiring a full testing framework setup.
 */

import { 
  ContextFormatter, 
  ContextType, 
  ContextPriority, 
  TruncationStrategy, 
  ValidationLevel,
  estimateTokens 
} from '../context-formatter';
import { ContextPerformanceMonitor } from '../context-performance';

// Mock PromptFormData for testing
const mockFormData = {
  destination: {
    name: 'Tokyo',
    country: 'Japan'
  },
  dateRange: {
    start: new Date('2024-06-01'),
    end: new Date('2024-06-07'),
    flexibility: 'flexible'
  },
  travelers: {
    travelers: [
      { name: 'John', type: 'adult', age: 30, tags: [] },
      { name: 'Jane', type: 'adult', age: 28, tags: [] }
    ],
    adults: 2,
    children: 0
  },
  interests: {
    activities: ['sightseeing', 'food tours', 'museums'],
    specialInterests: ['photography', 'history'],
    accommodationTypes: ['hotel'],
    transportationModes: ['public transport'],
    diningPreferences: ['local cuisine']
  },
  budget: {
    amount: 2000,
    currency: 'USD',
    budgetLevel: 'medium',
    priorities: ['experiences', 'food']
  },
  externalContent: {
    items: [],
    extractedPreferences: null
  }
} as any;

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
 * Test basic context formatter creation
 */
runTest('Context Formatter Creation', () => {
  const formatter = new ContextFormatter();
  if (!formatter) {
    throw new Error('Failed to create context formatter');
  }
});

/**
 * Test context creation from form data
 */
runTest('Context Creation from Form Data', () => {
  const formatter = ContextFormatter.fromFormData(mockFormData);
  const context = formatter.format();
  
  if (!context.content) {
    throw new Error('No content generated');
  }
  
  if (context.segments.length === 0) {
    throw new Error('No segments created');
  }
  
  // Check for required segments
  const hasDestination = context.segments.some(s => s.type === ContextType.USER_REQUIREMENTS);
  if (!hasDestination) {
    throw new Error('Missing user requirements segment');
  }
});

/**
 * Test token estimation
 */
runTest('Token Estimation', () => {
  const text = 'This is a test string for token estimation.';
  const tokens = estimateTokens(text);
  
  if (tokens <= 0) {
    throw new Error('Invalid token count');
  }
  
  if (tokens > text.length) {
    throw new Error('Token count exceeds character count');
  }
});

/**
 * Test context truncation
 */
runTest('Context Truncation', () => {
  const formatter = ContextFormatter.fromFormData(mockFormData, {
    maxTokens: 100, // Very low limit to force truncation
    truncationStrategy: TruncationStrategy.PRIORITY_BASED
  });
  
  const context = formatter.format();
  
  if (context.tokenCount > 100) {
    throw new Error('Context not properly truncated');
  }
  
  if (!context.truncated) {
    throw new Error('Truncation flag not set');
  }
});

/**
 * Test context validation
 */
runTest('Context Validation', () => {
  const formatter = ContextFormatter.fromFormData(mockFormData, {
    validationLevel: ValidationLevel.STRICT
  });
  
  const context = formatter.format();
  
  // Should have some validation (warnings are expected for incomplete data)
  if (context.warnings === undefined) {
    throw new Error('Validation not performed');
  }
});

/**
 * Test performance monitoring
 */
runTest('Performance Monitoring', () => {
  // Clear previous metrics
  ContextPerformanceMonitor.clearMetrics();
  
  const formatter = ContextFormatter.fromFormData(mockFormData);
  const context = formatter.format();
  
  // Record metrics
  const metrics = ContextPerformanceMonitor.recordMetrics('test-request', context, 10);
  
  if (!metrics.requestId) {
    throw new Error('Request ID not recorded');
  }
  
  if (metrics.efficiency < 0 || metrics.efficiency > 1) {
    throw new Error('Invalid efficiency score');
  }
  
  // Test performance stats
  const stats = ContextPerformanceMonitor.getPerformanceStats();
  if (stats.totalRequests !== 1) {
    throw new Error('Performance stats not recorded correctly');
  }
});

/**
 * Test context optimization suggestions
 */
runTest('Context Optimization Suggestions', () => {
  const formatter = ContextFormatter.fromFormData(mockFormData, {
    maxTokens: 5000 // High token count to trigger suggestions
  });
  
  const context = formatter.format();
  const suggestions = ContextPerformanceMonitor.analyzeContext(context);
  
  // Should return an array (may be empty for good contexts)
  if (!Array.isArray(suggestions)) {
    throw new Error('Suggestions not returned as array');
  }
});

/**
 * Test research context addition
 */
runTest('Research Context Addition', () => {
  const formatter = ContextFormatter.fromFormData(mockFormData, {
    includeResearchContext: true
  });
  
  formatter.addResearchContext('Tokyo is known for its vibrant culture and excellent food scene.', 'test-source');
  
  const context = formatter.format();
  const researchSegments = context.segments.filter(s => s.type === ContextType.RESEARCH_DATA);
  
  if (researchSegments.length === 0) {
    throw new Error('Research context not added');
  }
  
  if (!researchSegments[0].metadata?.source) {
    throw new Error('Research source metadata not preserved');
  }
});

/**
 * Test context type breakdown
 */
runTest('Context Type Breakdown', () => {
  // Clear and add test data
  ContextPerformanceMonitor.clearMetrics();
  
  const formatter = ContextFormatter.fromFormData(mockFormData);
  const context = formatter.format();
  
  ContextPerformanceMonitor.recordMetrics('test-breakdown', context, 5);
  
  const breakdown = ContextPerformanceMonitor.getContextTypeBreakdown();
  
  if (typeof breakdown !== 'object') {
    throw new Error('Breakdown not returned as object');
  }
  
  // Should have entries for all context types
  const hasUserRequirements = breakdown[ContextType.USER_REQUIREMENTS];
  if (!hasUserRequirements) {
    throw new Error('User requirements not in breakdown');
  }
});

console.log('\n🧪 Context Formatting System Tests Complete');
console.log('Run this file with: npx tsx src/lib/__tests__/context-formatter.test.ts'); 