/**
 * Itinerary Storage System Tests
 * 
 * Comprehensive test suite for the itinerary storage system covering:
 * - File-based storage operations
 * - Memory-based storage operations
 * - Hybrid storage strategies
 * - Performance monitoring
 * - Error handling
 */

import { 
  ItineraryStorageManager, 
  StorageStrategy, 
  NamingConvention, 
  EvictionPolicy,
  StorageOperation 
} from '../itinerary-storage';
import { GeneratedItinerary } from '@/app/api/generate-itinerary/route';
import { writeFile, mkdir, readFile, unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock itinerary data for testing
const createMockItinerary = (id: string = 'test-1'): GeneratedItinerary => ({
  id,
  title: 'Test Tokyo Adventure',
  destination: 'Tokyo, Japan',
  startDate: '2024-03-15',
  endDate: '2024-03-22',
  totalDays: 7,
  totalCost: {
    amount: 3000,
    currency: 'USD',
    breakdown: {
      accommodation: 1000,
      activities: 800,
      meals: 700,
      transport: 400,
      other: 100
    }
  },
  days: [
    {
      day: 1,
      date: '2024-03-15',
      title: 'Arrival Day',
      activities: [
        {
          id: 'a1',
          time: '14:00',
          title: 'Arrival at Narita Airport',
          description: 'Land at Narita and take the train to Shibuya',
          location: {
            name: 'Narita International Airport',
            address: '1-1 Furugome, Narita, Chiba 282-0004, Japan',
            coordinates: { lat: 35.7720, lng: 140.3929 }
          },
          duration: 120,
          cost: { amount: 50, currency: 'USD' },
          category: 'transport',
          bookingRequired: false
        }
      ],
      totalCost: 50
    }
  ],
  travelers: {
    adults: 2,
    children: 0,
    infants: 0
  },
  metadata: {
    generatedAt: new Date().toISOString(),
    model: 'test-model',
    citations: ['https://example.com/source1'],
    relatedQuestions: ['What are the best restaurants in Tokyo?']
  }
});

describe('ItineraryStorageManager', () => {
  let tempDir: string;
  let storageManager: ItineraryStorageManager;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = join(tmpdir(), `itinerary-storage-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Initialize storage manager with test configuration
    storageManager = new ItineraryStorageManager({
      strategy: StorageStrategy.HYBRID,
      fileStorage: {
        baseDirectory: tempDir,
        namingConvention: NamingConvention.TIMESTAMP,
        compression: false,
        maxFileSize: 1024 * 1024, // 1MB
        indexing: true,
        cleanup: {
          enabled: false, // Disable for testing
          maxAge: 24 * 60 * 60 * 1000,
          maxFiles: 100,
          schedule: '0 2 * * *'
        }
      },
      memoryStorage: {
        maxItems: 10,
        maxMemoryMB: 10,
        evictionPolicy: EvictionPolicy.LRU,
        persistToDisk: false,
        syncInterval: 60000
      },
      performance: {
        enableMetrics: true,
        slowOperationThreshold: 100,
        batchSize: 5,
        concurrentOperations: 3
      },
      backup: {
        enabled: false, // Disable for testing
        interval: 24 * 60 * 60 * 1000,
        maxBackups: 3,
        compressionLevel: 6
      }
    });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      const files = await readFile(tempDir).catch(() => []);
      if (Array.isArray(files)) {
        for (const file of files) {
          await unlink(join(tempDir, file)).catch(() => {});
        }
      }
      await rmdir(tempDir).catch(() => {});
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('File Storage Operations', () => {
    beforeEach(() => {
      storageManager = new ItineraryStorageManager({
        strategy: StorageStrategy.FILE_ONLY,
        fileStorage: {
          baseDirectory: tempDir,
          namingConvention: NamingConvention.TIMESTAMP,
          compression: false,
          maxFileSize: 1024 * 1024,
          indexing: true,
          cleanup: { enabled: false, maxAge: 0, maxFiles: 0, schedule: '' }
        }
      });
    });

    test('should save itinerary to file', async () => {
      const itinerary = createMockItinerary();
      const result = await storageManager.saveItinerary(itinerary);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata.strategy).toBe(StorageStrategy.FILE_ONLY);
      expect(result.metadata.operationType).toBe(StorageOperation.SAVE);
    });

    test('should load itinerary from file', async () => {
      const itinerary = createMockItinerary();
      await storageManager.saveItinerary(itinerary);

      const result = await storageManager.loadItinerary(itinerary.id);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(itinerary.id);
      expect(result.data?.title).toBe(itinerary.title);
    });

    test('should handle file not found error', async () => {
      const result = await storageManager.loadItinerary('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should delete itinerary file', async () => {
      const itinerary = createMockItinerary();
      await storageManager.saveItinerary(itinerary);

      const deleteResult = await storageManager.deleteItinerary(itinerary.id);
      expect(deleteResult.success).toBe(true);

      const loadResult = await storageManager.loadItinerary(itinerary.id);
      expect(loadResult.success).toBe(false);
    });

    test('should respect file size limits', async () => {
      const largeItinerary = createMockItinerary();
      // Create a very large description to exceed file size limit
      largeItinerary.days[0].activities[0].description = 'x'.repeat(2 * 1024 * 1024); // 2MB

      const result = await storageManager.saveItinerary(largeItinerary);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum file size');
    });
  });

  describe('Memory Storage Operations', () => {
    beforeEach(() => {
      storageManager = new ItineraryStorageManager({
        strategy: StorageStrategy.MEMORY_ONLY,
        memoryStorage: {
          maxItems: 5,
          maxMemoryMB: 1,
          evictionPolicy: EvictionPolicy.LRU,
          persistToDisk: false,
          syncInterval: 60000
        }
      });
    });

    test('should save itinerary to memory', async () => {
      const itinerary = createMockItinerary();
      const result = await storageManager.saveItinerary(itinerary);

      expect(result.success).toBe(true);
      expect(result.data).toBe(`memory:${itinerary.id}`);
      expect(result.metadata.strategy).toBe(StorageStrategy.MEMORY_ONLY);
    });

    test('should load itinerary from memory', async () => {
      const itinerary = createMockItinerary();
      await storageManager.saveItinerary(itinerary);

      const result = await storageManager.loadItinerary(itinerary.id);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(itinerary.id);
    });

    test('should handle memory eviction', async () => {
      // Fill memory beyond capacity
      const itineraries = Array.from({ length: 7 }, (_, i) => 
        createMockItinerary(`test-${i}`)
      );

      for (const itinerary of itineraries) {
        await storageManager.saveItinerary(itinerary);
      }

      // First itinerary should be evicted
      const result = await storageManager.loadItinerary('test-0');
      expect(result.success).toBe(false);

      // Last itinerary should still be available
      const lastResult = await storageManager.loadItinerary('test-6');
      expect(lastResult.success).toBe(true);
    });

    test('should update access statistics', async () => {
      const itinerary = createMockItinerary();
      await storageManager.saveItinerary(itinerary);

      // Load multiple times
      await storageManager.loadItinerary(itinerary.id);
      await storageManager.loadItinerary(itinerary.id);

      const analytics = storageManager.getAnalytics();
      expect(analytics.storageUtilization.memory.itemCount).toBe(1);
      expect(analytics.totalOperations).toBeGreaterThan(1);
    });
  });

  describe('Hybrid Storage Strategy', () => {
    test('should save to both memory and file', async () => {
      const itinerary = createMockItinerary();
      const result = await storageManager.saveItinerary(itinerary);

      expect(result.success).toBe(true);
      expect(result.metadata.strategy).toBe(StorageStrategy.HYBRID);

      // Should be able to load from memory (faster)
      const loadResult = await storageManager.loadItinerary(itinerary.id);
      expect(loadResult.success).toBe(true);
      expect(loadResult.metadata.location).toBe('memory');
    });

    test('should fall back to file when not in memory', async () => {
      const itinerary = createMockItinerary();
      await storageManager.saveItinerary(itinerary);

      // Manually remove from memory to test file fallback
      (storageManager as any).memoryCache.delete(itinerary.id);

      const loadResult = await storageManager.loadItinerary(itinerary.id);
      expect(loadResult.success).toBe(true);
      expect(loadResult.metadata.location).not.toBe('memory');
    });
  });

  describe('Listing and Filtering', () => {
    beforeEach(async () => {
      // Create multiple test itineraries
      const itineraries = [
        { ...createMockItinerary('tokyo-1'), destination: 'Tokyo, Japan', startDate: '2024-03-15' },
        { ...createMockItinerary('paris-1'), destination: 'Paris, France', startDate: '2024-04-10' },
        { ...createMockItinerary('tokyo-2'), destination: 'Tokyo, Japan', startDate: '2024-05-01' }
      ];

      for (const itinerary of itineraries) {
        await storageManager.saveItinerary(itinerary);
      }
    });

    test('should list all itineraries', async () => {
      const result = await storageManager.listItineraries();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    test('should filter by destination', async () => {
      const result = await storageManager.listItineraries({
        filter: { destination: 'Tokyo' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.every(entry => entry.metadata.destination.includes('Tokyo'))).toBe(true);
    });

    test('should filter by date range', async () => {
      const result = await storageManager.listItineraries({
        filter: {
          dateRange: { start: '2024-04-01', end: '2024-05-31' }
        }
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // paris-1 and tokyo-2
    });

    test('should apply pagination', async () => {
      const result = await storageManager.listItineraries({
        limit: 2,
        offset: 1
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should sort by creation date', async () => {
      const result = await storageManager.listItineraries({
        sortBy: 'created',
        sortOrder: 'asc'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      
      // Check if sorted by creation time
      const creationTimes = result.data!.map(entry => entry.created);
      const sortedTimes = [...creationTimes].sort((a, b) => a - b);
      expect(creationTimes).toEqual(sortedTimes);
    });
  });

  describe('Performance Analytics', () => {
    test('should track operation metrics', async () => {
      const itinerary = createMockItinerary();
      
      await storageManager.saveItinerary(itinerary);
      await storageManager.loadItinerary(itinerary.id);
      await storageManager.listItineraries();

      const analytics = storageManager.getAnalytics();

      expect(analytics.totalOperations).toBeGreaterThan(0);
      expect(analytics.operationsByType[StorageOperation.SAVE]).toBe(1);
      expect(analytics.operationsByType[StorageOperation.LOAD]).toBe(1);
      expect(analytics.operationsByType[StorageOperation.LIST]).toBe(1);
      expect(analytics.averageResponseTime).toBeGreaterThan(0);
    });

    test('should track storage utilization', async () => {
      const itinerary = createMockItinerary();
      await storageManager.saveItinerary(itinerary);

      const analytics = storageManager.getAnalytics();

      expect(analytics.storageUtilization.fileSystem.totalFiles).toBe(1);
      expect(analytics.storageUtilization.fileSystem.totalSize).toBeGreaterThan(0);
      expect(analytics.storageUtilization.memory.itemCount).toBe(1);
      expect(analytics.storageUtilization.memory.memoryUsage).toBeGreaterThan(0);
    });

    test('should track error rates', async () => {
      // Attempt to load non-existent itinerary
      await storageManager.loadItinerary('non-existent');

      const analytics = storageManager.getAnalytics();

      expect(analytics.errorRate).toBeGreaterThan(0);
      expect(analytics.totalOperations).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid storage strategy', async () => {
      const invalidManager = new ItineraryStorageManager({
        strategy: 'invalid' as StorageStrategy
      });

      const itinerary = createMockItinerary();
      const result = await invalidManager.saveItinerary(itinerary);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported storage strategy');
    });

    test('should handle file system errors gracefully', async () => {
      // Create manager with invalid directory
      const invalidManager = new ItineraryStorageManager({
        strategy: StorageStrategy.FILE_ONLY,
        fileStorage: {
          baseDirectory: '/invalid/path/that/does/not/exist',
          namingConvention: NamingConvention.TIMESTAMP,
          compression: false,
          maxFileSize: 1024 * 1024,
          indexing: true,
          cleanup: { enabled: false, maxAge: 0, maxFiles: 0, schedule: '' }
        }
      });

      const itinerary = createMockItinerary();
      const result = await invalidManager.saveItinerary(itinerary);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle JSON parsing errors', async () => {
      // Create a corrupted file
      const corruptedPath = join(tempDir, 'corrupted.json');
      await writeFile(corruptedPath, 'invalid json content');

      // Manually add to file index
      (storageManager as any).fileIndex.set('corrupted', {
        id: 'corrupted',
        filename: 'corrupted.json',
        path: corruptedPath,
        size: 100,
        created: Date.now(),
        modified: Date.now(),
        metadata: {
          destination: 'Test',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          travelers: 1
        }
      });

      const result = await storageManager.loadItinerary('corrupted');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Naming Conventions', () => {
    test('should use timestamp naming convention', async () => {
      const manager = new ItineraryStorageManager({
        strategy: StorageStrategy.FILE_ONLY,
        fileStorage: {
          baseDirectory: tempDir,
          namingConvention: NamingConvention.TIMESTAMP,
          compression: false,
          maxFileSize: 1024 * 1024,
          indexing: true,
          cleanup: { enabled: false, maxAge: 0, maxFiles: 0, schedule: '' }
        }
      });

      const itinerary = createMockItinerary();
      const result = await manager.saveItinerary(itinerary);

      expect(result.success).toBe(true);
      expect(result.data).toMatch(/itinerary_test-1_\d+\.json$/);
    });

    test('should use UUID naming convention', async () => {
      const manager = new ItineraryStorageManager({
        strategy: StorageStrategy.FILE_ONLY,
        fileStorage: {
          baseDirectory: tempDir,
          namingConvention: NamingConvention.UUID,
          compression: false,
          maxFileSize: 1024 * 1024,
          indexing: true,
          cleanup: { enabled: false, maxAge: 0, maxFiles: 0, schedule: '' }
        }
      });

      const itinerary = createMockItinerary();
      const result = await manager.saveItinerary(itinerary);

      expect(result.success).toBe(true);
      expect(result.data).toMatch(/test-1\.json$/);
    });

    test('should use semantic naming convention', async () => {
      const manager = new ItineraryStorageManager({
        strategy: StorageStrategy.FILE_ONLY,
        fileStorage: {
          baseDirectory: tempDir,
          namingConvention: NamingConvention.SEMANTIC,
          compression: false,
          maxFileSize: 1024 * 1024,
          indexing: true,
          cleanup: { enabled: false, maxAge: 0, maxFiles: 0, schedule: '' }
        }
      });

      const itinerary = createMockItinerary();
      const result = await manager.saveItinerary(itinerary);

      expect(result.success).toBe(true);
      expect(result.data).toMatch(/Tokyo__Japan_2024-03-15_test-1\.json$/);
    });
  });
}); 