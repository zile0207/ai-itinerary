/**
 * Response Parser Tests
 * 
 * Tests for the robust response parsing and validation system
 */

import { 
  ResponseParser, 
  parseItinerary, 
  validateItinerary,
  ParseStrategy,
  ResponseFormat,
  ValidationError
} from '../response-parser';

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

// Test data
const validJsonResponse = `{
  "title": "Tokyo Adventure",
  "destination": "Tokyo, Japan",
  "startDate": "2024-06-01",
  "endDate": "2024-06-07",
  "totalDays": 7,
  "totalCost": {
    "amount": 2500,
    "currency": "USD",
    "breakdown": {
      "accommodation": 800,
      "activities": 600,
      "meals": 700,
      "transport": 300,
      "other": 100
    }
  },
  "days": [
    {
      "day": 1,
      "date": "2024-06-01",
      "title": "Arrival Day",
      "activities": [
        {
          "id": "act1",
          "time": "14:00",
          "title": "Check into hotel",
          "description": "Arrive and settle in",
          "location": { "name": "Shibuya Hotel" },
          "duration": 60,
          "cost": { "amount": 0, "currency": "USD" },
          "category": "accommodation",
          "bookingRequired": true
        }
      ],
      "totalCost": 120
    }
  ],
  "travelers": {
    "adults": 2,
    "children": 0,
    "infants": 0
  }
}`;

const jsonWithTextResponse = `Here's your itinerary:

\`\`\`json
${validJsonResponse}
\`\`\`

This itinerary includes all the major attractions in Tokyo.`;

const structuredTextResponse = `
Title: Tokyo Adventure
Destination: Tokyo, Japan
Dates: 2024-06-01 to 2024-06-07

Day 1: Arrival Day
- 14:00: Check into hotel in Shibuya
- 16:00: Explore Shibuya Crossing
- 19:00: Dinner at local restaurant

Day 2: Cultural Exploration
- 09:00: Visit Senso-ji Temple
- 12:00: Lunch in Asakusa
- 15:00: Tokyo National Museum
`;

const markdownResponse = `
# Tokyo Adventure Itinerary

**Destination:** Tokyo, Japan  
**Dates:** June 1-7, 2024

## Day 1: Arrival
- **14:00** - Check into hotel
- **16:00** - Explore Shibuya
- **19:00** - Welcome dinner

## Day 2: Culture
- **09:00** - Senso-ji Temple
- **12:00** - Traditional lunch
`;

const malformedJsonResponse = `{
  "title": "Tokyo Adventure",
  "destination": "Tokyo, Japan",
  "startDate": "2024-06-01",
  // Missing closing brace and other fields
`;

const incompleteResponse = `{
  "title": "Tokyo Adventure"
  // Missing required fields
}`;

/**
 * Test JSON extraction parsing
 */
runTest('JSON Extraction - Valid JSON', () => {
  const result = parseItinerary(validJsonResponse);
  
  if (!result.success) {
    throw new Error('Failed to parse valid JSON');
  }
  
  if (!result.data) {
    throw new Error('No data returned');
  }
  
  if (result.data.title !== 'Tokyo Adventure') {
    throw new Error('Incorrect title parsed');
  }
  
  if (result.data.days.length !== 1) {
    throw new Error('Incorrect number of days');
  }
  
  if (result.metadata.parseMethod !== ParseStrategy.JSON_EXTRACTION) {
    throw new Error('Incorrect parse method');
  }
});

/**
 * Test JSON with surrounding text
 */
runTest('JSON Extraction - JSON with Text', () => {
  const result = parseItinerary(jsonWithTextResponse);
  
  if (!result.success) {
    throw new Error('Failed to parse JSON with text');
  }
  
  if (!result.data) {
    throw new Error('No data returned');
  }
  
  if (result.data.title !== 'Tokyo Adventure') {
    throw new Error('Incorrect title parsed');
  }
});

/**
 * Test structured text parsing
 */
runTest('Structured Text Parsing', () => {
  const result = parseItinerary(structuredTextResponse);
  
  if (!result.success) {
    throw new Error('Failed to parse structured text');
  }
  
  if (!result.data) {
    throw new Error('No data returned');
  }
  
  if (result.data.title !== 'Tokyo Adventure') {
    throw new Error('Incorrect title parsed');
  }
  
  if (result.data.destination !== 'Tokyo, Japan') {
    throw new Error('Incorrect destination parsed');
  }
  
  if (result.data.days.length < 1) {
    throw new Error('No days extracted');
  }
});

/**
 * Test markdown parsing
 */
runTest('Markdown Parsing', () => {
  const result = parseItinerary(markdownResponse);
  
  if (!result.success) {
    throw new Error('Failed to parse markdown');
  }
  
  if (!result.data) {
    throw new Error('No data returned');
  }
  
  if (!result.data.title.includes('Tokyo')) {
    throw new Error('Title not extracted from markdown');
  }
});

/**
 * Test malformed JSON handling
 */
runTest('Malformed JSON Handling', () => {
  const result = parseItinerary(malformedJsonResponse);
  
  // Should either succeed with fallback or fail gracefully
  if (result.success && result.data) {
    // If it succeeded, it should have used fallback
    if (result.metadata.parseMethod === ParseStrategy.JSON_EXTRACTION) {
      throw new Error('Should not have succeeded with JSON extraction');
    }
  } else {
    // If it failed, should have meaningful errors
    if (result.errors.length === 0) {
      throw new Error('Should have error messages for malformed JSON');
    }
  }
});

/**
 * Test incomplete data handling
 */
runTest('Incomplete Data Handling', () => {
  const result = parseItinerary(incompleteResponse);
  
  // Should either succeed with fallback or fail with validation errors
  if (result.success && result.data) {
    // Check if fallback was used
    if (result.metadata.confidence > 0.5) {
      throw new Error('Confidence should be low for incomplete data');
    }
  } else {
    // Should have validation errors
    if (result.errors.length === 0) {
      throw new Error('Should have validation errors for incomplete data');
    }
  }
});

/**
 * Test validation function
 */
runTest('Schema Validation', () => {
  const validData = {
    title: 'Test Itinerary',
    destination: 'Test City',
    startDate: '2024-06-01',
    endDate: '2024-06-07',
    days: [
      {
        day: 1,
        date: '2024-06-01',
        activities: []
      }
    ]
  };
  
  const validation = validateItinerary(validData);
  
  if (!validation.isValid) {
    throw new Error('Valid data should pass validation');
  }
  
  // Test invalid data
  const invalidData = {
    title: 'Test Itinerary'
    // Missing required fields
  };
  
  const invalidValidation = validateItinerary(invalidData);
  
  if (invalidValidation.isValid) {
    throw new Error('Invalid data should fail validation');
  }
  
  if (invalidValidation.errors.length === 0) {
    throw new Error('Should have validation errors');
  }
});

/**
 * Test citations and metadata handling
 */
runTest('Citations and Metadata', () => {
  const citations = ['https://example.com/source1', 'https://example.com/source2'];
  const relatedQuestions = ['What to eat in Tokyo?', 'Best time to visit?'];
  
  const result = parseItinerary(validJsonResponse, citations, relatedQuestions);
  
  if (!result.success || !result.data) {
    throw new Error('Failed to parse with citations');
  }
  
  if (!result.data.metadata.citations) {
    throw new Error('Citations not added to metadata');
  }
  
  if (result.data.metadata.citations.length !== 2) {
    throw new Error('Incorrect number of citations');
  }
  
  if (!result.data.metadata.relatedQuestions) {
    throw new Error('Related questions not added to metadata');
  }
  
  if (result.data.metadata.relatedQuestions.length !== 2) {
    throw new Error('Incorrect number of related questions');
  }
});

/**
 * Test confidence scoring
 */
runTest('Confidence Scoring', () => {
  // Valid complete data should have high confidence
  const validResult = parseItinerary(validJsonResponse);
  if (validResult.success && validResult.metadata.confidence < 0.7) {
    throw new Error('Valid data should have high confidence');
  }
  
  // Structured text should have medium confidence
  const structuredResult = parseItinerary(structuredTextResponse);
  if (structuredResult.success && structuredResult.metadata.confidence > 0.9) {
    throw new Error('Structured text should have medium confidence');
  }
});

/**
 * Test performance metrics
 */
runTest('Performance Metrics', () => {
  const result = parseItinerary(validJsonResponse);
  
  if (!result.metadata.processingTimeMs && result.metadata.processingTimeMs !== 0) {
    throw new Error('Processing time not recorded');
  }
  
  if (!result.metadata.originalLength) {
    throw new Error('Original length not recorded');
  }
  
  if (!result.metadata.extractedLength) {
    throw new Error('Extracted length not recorded');
  }
  
  if (result.metadata.originalLength < result.metadata.extractedLength) {
    throw new Error('Extracted length should not exceed original');
  }
});

/**
 * Test error handling and recovery
 */
runTest('Error Handling and Recovery', () => {
  const emptyResponse = '';
  const result = parseItinerary(emptyResponse);
  
  // Should fail gracefully or use fallback
  if (!result.success) {
    if (result.errors.length === 0) {
      throw new Error('Should have error messages for empty response');
    }
  } else {
    // If it succeeded with fallback, should have low confidence
    if (result.metadata.confidence > 0.5) {
      throw new Error('Empty response should have low confidence');
    }
  }
});

console.log('\n🧪 Response Parser Tests Complete');
console.log('Run this file with: npx tsx src/lib/__tests__/response-parser.test.ts'); 