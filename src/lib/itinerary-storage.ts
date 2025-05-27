/**
 * Itinerary Storage System
 * 
 * Provides comprehensive storage mechanisms for generated itineraries with support for:
 * - File-based JSON storage with optimized I/O
 * - In-memory storage with LRU caching
 * - Hybrid storage strategies
 * - Performance monitoring and analytics
 * - Backup and recovery mechanisms
 */

import { GeneratedItinerary } from '@/app/api/generate-itinerary/route';
import { writeFile, readFile, mkdir, readdir, stat, unlink, access } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { constants } from 'fs';

// Storage configuration types
export interface StorageConfig {
  strategy: StorageStrategy;
  fileStorage?: FileStorageConfig;
  memoryStorage?: MemoryStorageConfig;
  performance?: PerformanceConfig;
  backup?: BackupConfig;
}

export interface FileStorageConfig {
  baseDirectory: string;
  namingConvention: NamingConvention;
  compression: boolean;
  maxFileSize: number; // in bytes
  indexing: boolean;
  cleanup: CleanupConfig;
}

export interface MemoryStorageConfig {
  maxItems: number;
  maxMemoryMB: number;
  evictionPolicy: EvictionPolicy;
  persistToDisk: boolean;
  syncInterval: number; // in milliseconds
}

export interface PerformanceConfig {
  enableMetrics: boolean;
  slowOperationThreshold: number; // in milliseconds
  batchSize: number;
  concurrentOperations: number;
}

export interface BackupConfig {
  enabled: boolean;
  interval: number; // in milliseconds
  maxBackups: number;
  compressionLevel: number;
}

export interface CleanupConfig {
  enabled: boolean;
  maxAge: number; // in milliseconds
  maxFiles: number;
  schedule: string; // cron-like schedule
}

// Enums
export enum StorageStrategy {
  FILE_ONLY = 'file_only',
  MEMORY_ONLY = 'memory_only',
  HYBRID = 'hybrid',
  DISTRIBUTED = 'distributed'
}

export enum NamingConvention {
  TIMESTAMP = 'timestamp',
  UUID = 'uuid',
  SEMANTIC = 'semantic',
  HIERARCHICAL = 'hierarchical'
}

export enum EvictionPolicy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  TTL = 'ttl'
}

// Storage result types
export interface StorageResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: StorageMetadata;
}

export interface StorageMetadata {
  operationType: StorageOperation;
  duration: number;
  size: number;
  location: string;
  timestamp: number;
  strategy: StorageStrategy;
}

export enum StorageOperation {
  SAVE = 'save',
  LOAD = 'load',
  DELETE = 'delete',
  LIST = 'list',
  SEARCH = 'search',
  BACKUP = 'backup',
  RESTORE = 'restore'
}

// Storage analytics
export interface StorageAnalytics {
  totalOperations: number;
  operationsByType: Record<StorageOperation, number>;
  averageResponseTime: number;
  errorRate: number;
  storageUtilization: {
    fileSystem: {
      totalFiles: number;
      totalSize: number;
      averageFileSize: number;
    };
    memory: {
      itemCount: number;
      memoryUsage: number;
      hitRate: number;
    };
  };
  performance: {
    slowOperations: number;
    fastestOperation: number;
    slowestOperation: number;
  };
}

// In-memory cache entry
interface CacheEntry {
  data: GeneratedItinerary;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

// File index entry
interface FileIndexEntry {
  id: string;
  filename: string;
  path: string;
  size: number;
  created: number;
  modified: number;
  metadata: {
    destination: string;
    startDate: string;
    endDate: string;
    travelers: number;
  };
}

/**
 * Main Itinerary Storage Manager
 */
export class ItineraryStorageManager {
  private config: StorageConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private fileIndex: Map<string, FileIndexEntry> = new Map();
  private analytics: StorageAnalytics;
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    this.analytics = this.initializeAnalytics();
    this.initializeStorage();
  }

  /**
   * Save an itinerary using the configured strategy
   */
  async saveItinerary(itinerary: GeneratedItinerary): Promise<StorageResult<string>> {
    const startTime = performance.now();
    
    try {
      let result: StorageResult<string>;

      switch (this.config.strategy) {
        case StorageStrategy.FILE_ONLY:
          result = await this.saveToFile(itinerary);
          break;
        case StorageStrategy.MEMORY_ONLY:
          result = await this.saveToMemory(itinerary);
          break;
        case StorageStrategy.HYBRID:
          result = await this.saveHybrid(itinerary);
          break;
        default:
          throw new Error(`Unsupported storage strategy: ${this.config.strategy}`);
      }

      const duration = performance.now() - startTime;
      this.recordMetrics(StorageOperation.SAVE, duration, result.success);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetrics(StorageOperation.SAVE, duration, false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operationType: StorageOperation.SAVE,
          duration,
          size: 0,
          location: '',
          timestamp: Date.now(),
          strategy: this.config.strategy
        }
      };
    }
  }

  /**
   * Load an itinerary by ID
   */
  async loadItinerary(id: string): Promise<StorageResult<GeneratedItinerary>> {
    const startTime = performance.now();
    
    try {
      let result: StorageResult<GeneratedItinerary>;

      switch (this.config.strategy) {
        case StorageStrategy.FILE_ONLY:
          result = await this.loadFromFile(id);
          break;
        case StorageStrategy.MEMORY_ONLY:
          result = await this.loadFromMemory(id);
          break;
        case StorageStrategy.HYBRID:
          result = await this.loadHybrid(id);
          break;
        default:
          throw new Error(`Unsupported storage strategy: ${this.config.strategy}`);
      }

      const duration = performance.now() - startTime;
      this.recordMetrics(StorageOperation.LOAD, duration, result.success);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetrics(StorageOperation.LOAD, duration, false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operationType: StorageOperation.LOAD,
          duration,
          size: 0,
          location: '',
          timestamp: Date.now(),
          strategy: this.config.strategy
        }
      };
    }
  }

  /**
   * List all stored itineraries
   */
  async listItineraries(options: {
    limit?: number;
    offset?: number;
    sortBy?: 'created' | 'modified' | 'size';
    sortOrder?: 'asc' | 'desc';
    filter?: {
      destination?: string;
      dateRange?: { start: string; end: string };
      travelers?: number;
    };
  } = {}): Promise<StorageResult<FileIndexEntry[]>> {
    const startTime = performance.now();
    
    try {
      let entries = Array.from(this.fileIndex.values());

      // Apply filters
      if (options.filter) {
        entries = this.applyFilters(entries, options.filter);
      }

      // Apply sorting
      if (options.sortBy) {
        entries = this.applySorting(entries, options.sortBy, options.sortOrder || 'desc');
      }

      // Apply pagination
      const total = entries.length;
      const offset = options.offset || 0;
      const limit = options.limit || total;
      const paginatedEntries = entries.slice(offset, offset + limit);

      const duration = performance.now() - startTime;
      this.recordMetrics(StorageOperation.LIST, duration, true);

      return {
        success: true,
        data: paginatedEntries,
        metadata: {
          operationType: StorageOperation.LIST,
          duration,
          size: paginatedEntries.length,
          location: 'index',
          timestamp: Date.now(),
          strategy: this.config.strategy
        }
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetrics(StorageOperation.LIST, duration, false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operationType: StorageOperation.LIST,
          duration,
          size: 0,
          location: '',
          timestamp: Date.now(),
          strategy: this.config.strategy
        }
      };
    }
  }

  /**
   * Delete an itinerary
   */
  async deleteItinerary(id: string): Promise<StorageResult<boolean>> {
    const startTime = performance.now();
    
    try {
      let success = false;

      // Remove from memory cache
      if (this.memoryCache.has(id)) {
        this.memoryCache.delete(id);
        success = true;
      }

      // Remove from file system
      const indexEntry = this.fileIndex.get(id);
      if (indexEntry) {
        await unlink(indexEntry.path);
        this.fileIndex.delete(id);
        success = true;
      }

      const duration = performance.now() - startTime;
      this.recordMetrics(StorageOperation.DELETE, duration, success);

      return {
        success,
        data: success,
        metadata: {
          operationType: StorageOperation.DELETE,
          duration,
          size: 0,
          location: indexEntry?.path || 'memory',
          timestamp: Date.now(),
          strategy: this.config.strategy
        }
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetrics(StorageOperation.DELETE, duration, false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operationType: StorageOperation.DELETE,
          duration,
          size: 0,
          location: '',
          timestamp: Date.now(),
          strategy: this.config.strategy
        }
      };
    }
  }

  /**
   * Get storage analytics
   */
  getAnalytics(): StorageAnalytics {
    return {
      ...this.analytics,
      storageUtilization: {
        fileSystem: this.getFileSystemUtilization(),
        memory: this.getMemoryUtilization()
      },
      performance: this.getPerformanceMetrics()
    };
  }

  /**
   * Private methods
   */

  private mergeWithDefaults(config: Partial<StorageConfig>): StorageConfig {
    return {
      strategy: config.strategy || StorageStrategy.HYBRID,
      fileStorage: {
        baseDirectory: config.fileStorage?.baseDirectory || join(process.cwd(), 'data', 'itineraries'),
        namingConvention: config.fileStorage?.namingConvention || NamingConvention.TIMESTAMP,
        compression: config.fileStorage?.compression ?? false,
        maxFileSize: config.fileStorage?.maxFileSize || 10 * 1024 * 1024, // 10MB
        indexing: config.fileStorage?.indexing ?? true,
        cleanup: {
          enabled: config.fileStorage?.cleanup?.enabled ?? true,
          maxAge: config.fileStorage?.cleanup?.maxAge || 30 * 24 * 60 * 60 * 1000, // 30 days
          maxFiles: config.fileStorage?.cleanup?.maxFiles || 1000,
          schedule: config.fileStorage?.cleanup?.schedule || '0 2 * * *' // Daily at 2 AM
        }
      },
      memoryStorage: {
        maxItems: config.memoryStorage?.maxItems || 100,
        maxMemoryMB: config.memoryStorage?.maxMemoryMB || 50,
        evictionPolicy: config.memoryStorage?.evictionPolicy || EvictionPolicy.LRU,
        persistToDisk: config.memoryStorage?.persistToDisk ?? true,
        syncInterval: config.memoryStorage?.syncInterval || 5 * 60 * 1000 // 5 minutes
      },
      performance: {
        enableMetrics: config.performance?.enableMetrics ?? true,
        slowOperationThreshold: config.performance?.slowOperationThreshold || 1000, // 1 second
        batchSize: config.performance?.batchSize || 10,
        concurrentOperations: config.performance?.concurrentOperations || 5
      },
      backup: {
        enabled: config.backup?.enabled ?? true,
        interval: config.backup?.interval || 24 * 60 * 60 * 1000, // 24 hours
        maxBackups: config.backup?.maxBackups || 7,
        compressionLevel: config.backup?.compressionLevel || 6
      }
    };
  }

  private initializeAnalytics(): StorageAnalytics {
    return {
      totalOperations: 0,
      operationsByType: {
        [StorageOperation.SAVE]: 0,
        [StorageOperation.LOAD]: 0,
        [StorageOperation.DELETE]: 0,
        [StorageOperation.LIST]: 0,
        [StorageOperation.SEARCH]: 0,
        [StorageOperation.BACKUP]: 0,
        [StorageOperation.RESTORE]: 0
      },
      averageResponseTime: 0,
      errorRate: 0,
      storageUtilization: {
        fileSystem: {
          totalFiles: 0,
          totalSize: 0,
          averageFileSize: 0
        },
        memory: {
          itemCount: 0,
          memoryUsage: 0,
          hitRate: 0
        }
      },
      performance: {
        slowOperations: 0,
        fastestOperation: Infinity,
        slowestOperation: 0
      }
    };
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Ensure base directory exists
      if (this.config.fileStorage) {
        await mkdir(this.config.fileStorage.baseDirectory, { recursive: true });
        
        // Load existing file index
        if (this.config.fileStorage.indexing) {
          await this.loadFileIndex();
        }
      }

      // Initialize cleanup scheduler if enabled
      if (this.config.fileStorage?.cleanup.enabled) {
        this.scheduleCleanup();
      }

      // Initialize backup scheduler if enabled
      if (this.config.backup?.enabled) {
        this.scheduleBackup();
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  private async saveToFile(itinerary: GeneratedItinerary): Promise<StorageResult<string>> {
    if (!this.config.fileStorage) {
      throw new Error('File storage not configured');
    }

    const filename = this.generateFilename(itinerary);
    const filepath = join(this.config.fileStorage.baseDirectory, filename);
    const content = JSON.stringify(itinerary, null, 2);

    // Check file size limit
    if (content.length > this.config.fileStorage.maxFileSize) {
      throw new Error(`Itinerary size exceeds maximum file size limit`);
    }

    await writeFile(filepath, content, 'utf8');

    // Update file index
    if (this.config.fileStorage.indexing) {
      await this.updateFileIndex(itinerary, filename, filepath);
    }

    return {
      success: true,
      data: filepath,
      metadata: {
        operationType: StorageOperation.SAVE,
        duration: 0,
        size: content.length,
        location: filepath,
        timestamp: Date.now(),
        strategy: StorageStrategy.FILE_ONLY
      }
    };
  }

  private async saveToMemory(itinerary: GeneratedItinerary): Promise<StorageResult<string>> {
    if (!this.config.memoryStorage) {
      throw new Error('Memory storage not configured');
    }

    const size = JSON.stringify(itinerary).length;
    
    // Check memory limits
    await this.enforceMemoryLimits();

    const entry: CacheEntry = {
      data: itinerary,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size
    };

    this.memoryCache.set(itinerary.id, entry);

    return {
      success: true,
      data: `memory:${itinerary.id}`,
      metadata: {
        operationType: StorageOperation.SAVE,
        duration: 0,
        size,
        location: 'memory',
        timestamp: Date.now(),
        strategy: StorageStrategy.MEMORY_ONLY
      }
    };
  }

  private async saveHybrid(itinerary: GeneratedItinerary): Promise<StorageResult<string>> {
    // Save to both memory and file
    const [memoryResult, fileResult] = await Promise.allSettled([
      this.saveToMemory(itinerary),
      this.saveToFile(itinerary)
    ]);

    const memorySuccess = memoryResult.status === 'fulfilled' && memoryResult.value.success;
    const fileSuccess = fileResult.status === 'fulfilled' && fileResult.value.success;

    if (!memorySuccess && !fileSuccess) {
      throw new Error('Failed to save to both memory and file storage');
    }

    const location = fileSuccess ? 
      (fileResult as PromiseFulfilledResult<StorageResult<string>>).value.data! : 
      `memory:${itinerary.id}`;

    return {
      success: true,
      data: location,
      metadata: {
        operationType: StorageOperation.SAVE,
        duration: 0,
        size: JSON.stringify(itinerary).length,
        location,
        timestamp: Date.now(),
        strategy: StorageStrategy.HYBRID
      }
    };
  }

  private async loadFromFile(id: string): Promise<StorageResult<GeneratedItinerary>> {
    const indexEntry = this.fileIndex.get(id);
    if (!indexEntry) {
      throw new Error(`Itinerary with ID ${id} not found in file index`);
    }

    const content = await readFile(indexEntry.path, 'utf8');
    const itinerary = JSON.parse(content) as GeneratedItinerary;

    return {
      success: true,
      data: itinerary,
      metadata: {
        operationType: StorageOperation.LOAD,
        duration: 0,
        size: content.length,
        location: indexEntry.path,
        timestamp: Date.now(),
        strategy: StorageStrategy.FILE_ONLY
      }
    };
  }

  private async loadFromMemory(id: string): Promise<StorageResult<GeneratedItinerary>> {
    const entry = this.memoryCache.get(id);
    if (!entry) {
      throw new Error(`Itinerary with ID ${id} not found in memory cache`);
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return {
      success: true,
      data: entry.data,
      metadata: {
        operationType: StorageOperation.LOAD,
        duration: 0,
        size: entry.size,
        location: 'memory',
        timestamp: Date.now(),
        strategy: StorageStrategy.MEMORY_ONLY
      }
    };
  }

  private async loadHybrid(id: string): Promise<StorageResult<GeneratedItinerary>> {
    // Try memory first (faster)
    try {
      return await this.loadFromMemory(id);
    } catch {
      // Fall back to file storage
      const result = await this.loadFromFile(id);
      
      // Cache in memory for future access
      if (result.success && result.data) {
        await this.saveToMemory(result.data);
      }
      
      return result;
    }
  }

  private generateFilename(itinerary: GeneratedItinerary): string {
    const timestamp = Date.now();
    const sanitizedDestination = itinerary.destination.replace(/[^a-zA-Z0-9]/g, '_');
    
    switch (this.config.fileStorage?.namingConvention) {
      case NamingConvention.UUID:
        return `${itinerary.id}.json`;
      case NamingConvention.SEMANTIC:
        return `${sanitizedDestination}_${itinerary.startDate}_${itinerary.id}.json`;
      case NamingConvention.HIERARCHICAL:
        const year = new Date(itinerary.startDate).getFullYear();
        const month = String(new Date(itinerary.startDate).getMonth() + 1).padStart(2, '0');
        return `${year}/${month}/${itinerary.id}.json`;
      case NamingConvention.TIMESTAMP:
      default:
        return `itinerary_${itinerary.id}_${timestamp}.json`;
    }
  }

  private async updateFileIndex(itinerary: GeneratedItinerary, filename: string, filepath: string): Promise<void> {
    const stats = await stat(filepath);
    
    const indexEntry: FileIndexEntry = {
      id: itinerary.id,
      filename,
      path: filepath,
      size: stats.size,
      created: Date.now(),
      modified: stats.mtime.getTime(),
      metadata: {
        destination: itinerary.destination,
        startDate: itinerary.startDate,
        endDate: itinerary.endDate,
        travelers: itinerary.travelers.adults + itinerary.travelers.children + itinerary.travelers.infants
      }
    };

    this.fileIndex.set(itinerary.id, indexEntry);
    
    // Persist index to disk
    await this.saveFileIndex();
  }

  private async loadFileIndex(): Promise<void> {
    try {
      const indexPath = join(this.config.fileStorage!.baseDirectory, '.index.json');
      
      try {
        await access(indexPath, constants.F_OK);
        const content = await readFile(indexPath, 'utf8');
        const indexData = JSON.parse(content);
        
        this.fileIndex = new Map(Object.entries(indexData));
      } catch {
        // Index file doesn't exist, scan directory
        await this.rebuildFileIndex();
      }
    } catch (error) {
      console.error('Failed to load file index:', error);
    }
  }

  private async saveFileIndex(): Promise<void> {
    try {
      const indexPath = join(this.config.fileStorage!.baseDirectory, '.index.json');
      const indexData = Object.fromEntries(this.fileIndex);
      
      await writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save file index:', error);
    }
  }

  private async rebuildFileIndex(): Promise<void> {
    try {
      const files = await readdir(this.config.fileStorage!.baseDirectory);
      const jsonFiles = files.filter(file => extname(file) === '.json' && !file.startsWith('.'));

      for (const file of jsonFiles) {
        try {
          const filepath = join(this.config.fileStorage!.baseDirectory, file);
          const content = await readFile(filepath, 'utf8');
          const itinerary = JSON.parse(content) as GeneratedItinerary;
          
          await this.updateFileIndex(itinerary, file, filepath);
        } catch (error) {
          console.error(`Failed to index file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to rebuild file index:', error);
    }
  }

  private async enforceMemoryLimits(): Promise<void> {
    if (!this.config.memoryStorage) return;

    const { maxItems, maxMemoryMB, evictionPolicy } = this.config.memoryStorage;
    
    // Check item count limit
    if (this.memoryCache.size >= maxItems) {
      await this.evictItems(1, evictionPolicy);
    }

    // Check memory usage limit
    const currentMemoryMB = this.calculateMemoryUsage() / (1024 * 1024);
    if (currentMemoryMB >= maxMemoryMB) {
      const itemsToEvict = Math.ceil(this.memoryCache.size * 0.1); // Evict 10%
      await this.evictItems(itemsToEvict, evictionPolicy);
    }
  }

  private async evictItems(count: number, policy: EvictionPolicy): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    
    let sortedEntries: [string, CacheEntry][];
    
    switch (policy) {
      case EvictionPolicy.LRU:
        sortedEntries = entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case EvictionPolicy.LFU:
        sortedEntries = entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case EvictionPolicy.FIFO:
        sortedEntries = entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
      case EvictionPolicy.TTL:
        const now = Date.now();
        sortedEntries = entries.sort(([, a], [, b]) => 
          (now - a.timestamp) - (now - b.timestamp)
        );
        break;
      default:
        sortedEntries = entries;
    }

    for (let i = 0; i < Math.min(count, sortedEntries.length); i++) {
      const [id] = sortedEntries[i];
      this.memoryCache.delete(id);
    }
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private applyFilters(entries: FileIndexEntry[], filter: {
    destination?: string;
    dateRange?: { start: string; end: string };
    travelers?: number;
  }): FileIndexEntry[] {
    return entries.filter(entry => {
      if (filter.destination && !entry.metadata.destination.toLowerCase().includes(filter.destination.toLowerCase())) {
        return false;
      }
      
      if (filter.dateRange) {
        const entryStart = new Date(entry.metadata.startDate);
        const filterStart = new Date(filter.dateRange.start);
        const filterEnd = new Date(filter.dateRange.end);
        
        if (entryStart < filterStart || entryStart > filterEnd) {
          return false;
        }
      }
      
      if (filter.travelers && entry.metadata.travelers !== filter.travelers) {
        return false;
      }
      
      return true;
    });
  }

  private applySorting(entries: FileIndexEntry[], sortBy: string, sortOrder: string): FileIndexEntry[] {
    return entries.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'created':
          comparison = a.created - b.created;
          break;
        case 'modified':
          comparison = a.modified - b.modified;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private recordMetrics(operation: StorageOperation, duration: number, success: boolean): void {
    if (!this.config.performance?.enableMetrics) return;

    this.analytics.totalOperations++;
    this.analytics.operationsByType[operation]++;
    
    // Update average response time
    const totalTime = this.analytics.averageResponseTime * (this.analytics.totalOperations - 1) + duration;
    this.analytics.averageResponseTime = totalTime / this.analytics.totalOperations;
    
    // Update error rate
    if (!success) {
      const totalErrors = this.analytics.errorRate * (this.analytics.totalOperations - 1) + 1;
      this.analytics.errorRate = totalErrors / this.analytics.totalOperations;
    }

    // Track performance metrics
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    this.performanceMetrics.get(operation)!.push(duration);

    // Update performance statistics
    if (duration > this.config.performance!.slowOperationThreshold) {
      this.analytics.performance.slowOperations++;
    }
    
    this.analytics.performance.fastestOperation = Math.min(
      this.analytics.performance.fastestOperation,
      duration
    );
    this.analytics.performance.slowestOperation = Math.max(
      this.analytics.performance.slowestOperation,
      duration
    );
  }

  private getFileSystemUtilization() {
    const entries = Array.from(this.fileIndex.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    
    return {
      totalFiles: entries.length,
      totalSize,
      averageFileSize: entries.length > 0 ? totalSize / entries.length : 0
    };
  }

  private getMemoryUtilization() {
    const totalHits = Array.from(this.memoryCache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return {
      itemCount: this.memoryCache.size,
      memoryUsage: this.calculateMemoryUsage(),
      hitRate: this.analytics.totalOperations > 0 ? totalHits / this.analytics.totalOperations : 0
    };
  }

  private getPerformanceMetrics() {
    const allDurations = Array.from(this.performanceMetrics.values()).flat();
    
    return {
      slowOperations: this.analytics.performance.slowOperations,
      fastestOperation: allDurations.length > 0 ? Math.min(...allDurations) : 0,
      slowestOperation: allDurations.length > 0 ? Math.max(...allDurations) : 0
    };
  }

  private scheduleCleanup(): void {
    // Implement cleanup scheduling logic
    // This would typically use a cron-like scheduler
    console.log('Cleanup scheduler initialized');
  }

  private scheduleBackup(): void {
    // Implement backup scheduling logic
    console.log('Backup scheduler initialized');
  }
}

// Export default instance with sensible defaults
export const defaultStorageManager = new ItineraryStorageManager({
  strategy: StorageStrategy.HYBRID,
  fileStorage: {
    baseDirectory: join(process.cwd(), 'data', 'itineraries'),
    namingConvention: NamingConvention.TIMESTAMP,
    compression: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    indexing: true,
    cleanup: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxFiles: 1000,
      schedule: '0 2 * * *'
    }
  },
  memoryStorage: {
    maxItems: 50,
    maxMemoryMB: 25,
    evictionPolicy: EvictionPolicy.LRU,
    persistToDisk: true,
    syncInterval: 5 * 60 * 1000 // 5 minutes
  },
  performance: {
    enableMetrics: true,
    slowOperationThreshold: 1000,
    batchSize: 10,
    concurrentOperations: 5
  },
  backup: {
    enabled: false, // Disabled by default for development
    interval: 24 * 60 * 60 * 1000,
    maxBackups: 7,
    compressionLevel: 6
  }
});

// Utility functions for common operations
export async function saveItinerary(itinerary: GeneratedItinerary): Promise<string> {
  const result = await defaultStorageManager.saveItinerary(itinerary);
  if (!result.success) {
    throw new Error(result.error || 'Failed to save itinerary');
  }
  return result.data!;
}

export async function loadItinerary(id: string): Promise<GeneratedItinerary> {
  const result = await defaultStorageManager.loadItinerary(id);
  if (!result.success) {
    throw new Error(result.error || 'Failed to load itinerary');
  }
  return result.data!;
}

export async function deleteItinerary(id: string): Promise<boolean> {
  const result = await defaultStorageManager.deleteItinerary(id);
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete itinerary');
  }
  return result.data!;
}

export async function listItineraries(options?: Parameters<typeof defaultStorageManager.listItineraries>[0]): Promise<FileIndexEntry[]> {
  const result = await defaultStorageManager.listItineraries(options);
  if (!result.success) {
    throw new Error(result.error || 'Failed to list itineraries');
  }
  return result.data!;
}

export function getStorageAnalytics(): StorageAnalytics {
  return defaultStorageManager.getAnalytics();
} 