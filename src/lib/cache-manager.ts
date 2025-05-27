/**
 * Advanced Cache Management System
 * 
 * Provides sophisticated caching with multiple storage backends,
 * intelligent eviction policies, and comprehensive cache analytics.
 */

export enum CacheStrategy {
  LRU = 'lru',
  LFU = 'lfu',
  TTL = 'ttl',
  FIFO = 'fifo',
  ADAPTIVE = 'adaptive'
}

export enum CacheBackend {
  MEMORY = 'memory',
  LOCAL_STORAGE = 'localStorage',
  SESSION_STORAGE = 'sessionStorage',
  INDEXED_DB = 'indexedDB'
}

export interface CacheConfig {
  strategy: CacheStrategy;
  backend: CacheBackend;
  maxSize: number;
  defaultTTL: number;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
  persistToDisk?: boolean;
  namespace?: string;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
  averageAccessTime: number;
  memoryUsage: number;
  oldestEntry?: number;
  newestEntry?: number;
  strategyBreakdown: Record<CacheStrategy, number>;
}

export interface CacheResult<T = any> {
  hit: boolean;
  value?: T;
  metadata?: {
    age: number;
    accessCount: number;
    remainingTTL: number;
    source: CacheBackend;
  };
}

// LRU Cache implementation
class LRUCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, {
        ...entry,
        lastAccessed: Date.now(),
        accessCount: entry.accessCount + 1
      });
      return entry;
    }
    return undefined;
  }

  set(key: string, entry: CacheEntry<T>): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, entry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  entries(): IterableIterator<[string, CacheEntry<T>]> {
    return this.cache.entries();
  }
}

// LFU Cache implementation
class LFUCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private frequencies = new Map<number, Set<string>>();
  private keyFrequencies = new Map<string, number>();
  private minFrequency = 0;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      this.updateFrequency(key);
      return {
        ...entry,
        lastAccessed: Date.now(),
        accessCount: entry.accessCount + 1
      };
    }
    return undefined;
  }

  set(key: string, entry: CacheEntry<T>): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLFU();
    }

    this.cache.set(key, entry);
    this.keyFrequencies.set(key, 1);
    
    if (!this.frequencies.has(1)) {
      this.frequencies.set(1, new Set());
    }
    this.frequencies.get(1)!.add(key);
    this.minFrequency = 1;
  }

  delete(key: string): boolean {
    if (this.cache.has(key)) {
      const freq = this.keyFrequencies.get(key)!;
      this.frequencies.get(freq)!.delete(key);
      this.keyFrequencies.delete(key);
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.frequencies.clear();
    this.keyFrequencies.clear();
    this.minFrequency = 0;
  }

  size(): number {
    return this.cache.size;
  }

  entries(): IterableIterator<[string, CacheEntry<T>]> {
    return this.cache.entries();
  }

  private updateFrequency(key: string): void {
    const freq = this.keyFrequencies.get(key)!;
    this.frequencies.get(freq)!.delete(key);
    
    if (this.frequencies.get(freq)!.size === 0 && freq === this.minFrequency) {
      this.minFrequency++;
    }

    const newFreq = freq + 1;
    this.keyFrequencies.set(key, newFreq);
    
    if (!this.frequencies.has(newFreq)) {
      this.frequencies.set(newFreq, new Set());
    }
    this.frequencies.get(newFreq)!.add(key);
  }

  private evictLFU(): void {
    const keyToEvict = this.frequencies.get(this.minFrequency)!.values().next().value;
    if (keyToEvict) {
      this.delete(keyToEvict);
    }
  }
}

// TTL Cache implementation
class TTLCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private timers = new Map<string, NodeJS.Timeout>();

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return {
        ...entry,
        lastAccessed: Date.now(),
        accessCount: entry.accessCount + 1
      };
    } else if (entry) {
      this.delete(key);
    }
    return undefined;
  }

  set(key: string, entry: CacheEntry<T>): void {
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.cache.set(key, entry);
    
    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, entry.ttl);
    
    this.timers.set(key, timer);
  }

  delete(key: string): boolean {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  entries(): IterableIterator<[string, CacheEntry<T>]> {
    return this.cache.entries();
  }
}

export class CacheManager {
  private caches = new Map<string, any>();
  private stats = new Map<string, CacheStats>();
  private configs = new Map<string, CacheConfig>();

  /**
   * Get a value from cache
   */
  async get<T = any>(namespace: string, key: string): Promise<CacheResult<T>> {
    const cache = this.getCache(namespace);
    const config = this.configs.get(namespace);
    
    if (!cache || !config) {
      return { hit: false };
    }

    const startTime = performance.now();
    const entry = cache.get(key);
    const endTime = performance.now();

    const stats = this.getStats(namespace);
    
    if (entry) {
      stats.hitCount++;
      stats.averageAccessTime = (stats.averageAccessTime + (endTime - startTime)) / 2;
      
      return {
        hit: true,
        value: entry.value,
        metadata: {
          age: Date.now() - entry.timestamp,
          accessCount: entry.accessCount,
          remainingTTL: Math.max(0, entry.ttl - (Date.now() - entry.timestamp)),
          source: config.backend
        }
      };
    } else {
      stats.missCount++;
      return { hit: false };
    }
  }

  /**
   * Set a value in cache
   */
  async set<T = any>(
    namespace: string, 
    key: string, 
    value: T, 
    options: { ttl?: number; metadata?: Record<string, any> } = {}
  ): Promise<void> {
    const cache = this.getCache(namespace);
    const config = this.configs.get(namespace);
    
    if (!cache || !config) {
      throw new Error(`Cache namespace '${namespace}' not configured`);
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      ttl: options.ttl || config.defaultTTL,
      accessCount: 0,
      lastAccessed: now,
      size: this.calculateSize(value),
      metadata: options.metadata
    };

    cache.set(key, entry);
    
    const stats = this.getStats(namespace);
    stats.totalEntries = cache.size();
    stats.totalSize += entry.size;
    
    // Update oldest/newest entry timestamps
    if (!stats.oldestEntry || now < stats.oldestEntry) {
      stats.oldestEntry = now;
    }
    if (!stats.newestEntry || now > stats.newestEntry) {
      stats.newestEntry = now;
    }

    // Persist to backend if configured
    if (config.persistToDisk) {
      await this.persistToBackend(namespace, key, entry, config);
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(namespace: string, key: string): Promise<boolean> {
    const cache = this.getCache(namespace);
    const config = this.configs.get(namespace);
    
    if (!cache) {
      return false;
    }

    const deleted = cache.delete(key);
    
    if (deleted) {
      const stats = this.getStats(namespace);
      stats.totalEntries = cache.size();
      stats.evictionCount++;
    }

    // Remove from backend if configured
    if (config?.persistToDisk) {
      await this.removeFromBackend(namespace, key, config);
    }

    return deleted;
  }

  /**
   * Clear all entries in a namespace
   */
  async clear(namespace: string): Promise<void> {
    const cache = this.getCache(namespace);
    const config = this.configs.get(namespace);
    
    if (cache) {
      cache.clear();
      
      const stats = this.getStats(namespace);
      stats.totalEntries = 0;
      stats.totalSize = 0;
      stats.evictionCount = 0;
    }

    // Clear backend if configured
    if (config?.persistToDisk) {
      await this.clearBackend(namespace, config);
    }
  }

  /**
   * Configure a cache namespace
   */
  configure(namespace: string, config: CacheConfig): void {
    this.configs.set(namespace, config);
    
    // Initialize cache based on strategy
    let cache: any;
    
    switch (config.strategy) {
      case CacheStrategy.LRU:
        cache = new LRUCache(config.maxSize);
        break;
      case CacheStrategy.LFU:
        cache = new LFUCache(config.maxSize);
        break;
      case CacheStrategy.TTL:
        cache = new TTLCache();
        break;
      case CacheStrategy.FIFO:
        cache = new LRUCache(config.maxSize); // Simplified FIFO using LRU
        break;
      case CacheStrategy.ADAPTIVE:
        cache = new LRUCache(config.maxSize); // Default to LRU for adaptive
        break;
      default:
        throw new Error(`Unknown cache strategy: ${config.strategy}`);
    }
    
    this.caches.set(namespace, cache);
    
    // Initialize stats
    this.stats.set(namespace, {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      strategyBreakdown: {} as Record<CacheStrategy, number>
    });
  }

  /**
   * Get cache statistics
   */
  getStatistics(namespace?: string): Map<string, CacheStats> | CacheStats | null {
    if (namespace) {
      const stats = this.stats.get(namespace);
      if (stats) {
        // Calculate hit rate
        const total = stats.hitCount + stats.missCount;
        stats.hitRate = total > 0 ? stats.hitCount / total : 0;
        return stats;
      }
      return null;
    }
    
    // Calculate hit rates for all namespaces
    for (const [ns, stats] of this.stats.entries()) {
      const total = stats.hitCount + stats.missCount;
      stats.hitRate = total > 0 ? stats.hitCount / total : 0;
    }
    
    return this.stats;
  }

  /**
   * Get all keys in a namespace
   */
  getKeys(namespace: string): string[] {
    const cache = this.getCache(namespace);
    if (!cache) {
      return [];
    }
    
    const entries = Array.from(cache.entries()) as [string, any][];
    return entries.map(([key]) => key);
  }

  /**
   * Check if a key exists
   */
  async has(namespace: string, key: string): Promise<boolean> {
    const result = await this.get(namespace, key);
    return result.hit;
  }

  /**
   * Get cache size for a namespace
   */
  size(namespace: string): number {
    const cache = this.getCache(namespace);
    return cache ? cache.size() : 0;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(namespace?: string): void {
    const namespaces = namespace ? [namespace] : Array.from(this.caches.keys());
    
    for (const ns of namespaces) {
      const cache = this.getCache(ns);
      const config = this.configs.get(ns);
      
      if (!cache || !config) continue;
      
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        cache.delete(key);
        this.getStats(ns).evictionCount++;
      }
    }
  }

  private getCache(namespace: string): any {
    return this.caches.get(namespace);
  }

  private getStats(namespace: string): CacheStats {
    let stats = this.stats.get(namespace);
    if (!stats) {
      stats = {
        totalEntries: 0,
        totalSize: 0,
        hitCount: 0,
        missCount: 0,
        evictionCount: 0,
        hitRate: 0,
        averageAccessTime: 0,
        memoryUsage: 0,
        strategyBreakdown: {} as Record<CacheStrategy, number>
      };
      this.stats.set(namespace, stats);
    }
    return stats;
  }

  private calculateSize(value: any): number {
    // Simple size calculation - in production, use more sophisticated method
    return JSON.stringify(value).length;
  }

  private async persistToBackend<T>(
    namespace: string, 
    key: string, 
    entry: CacheEntry<T>, 
    config: CacheConfig
  ): Promise<void> {
    const fullKey = `${namespace}:${key}`;
    
    try {
      switch (config.backend) {
        case CacheBackend.LOCAL_STORAGE:
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(fullKey, JSON.stringify(entry));
          }
          break;
        case CacheBackend.SESSION_STORAGE:
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem(fullKey, JSON.stringify(entry));
          }
          break;
        case CacheBackend.INDEXED_DB:
          // IndexedDB implementation would go here
          break;
      }
    } catch (error) {
      console.warn(`Failed to persist cache entry to ${config.backend}:`, error);
    }
  }

  private async removeFromBackend(
    namespace: string, 
    key: string, 
    config: CacheConfig
  ): Promise<void> {
    const fullKey = `${namespace}:${key}`;
    
    try {
      switch (config.backend) {
        case CacheBackend.LOCAL_STORAGE:
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(fullKey);
          }
          break;
        case CacheBackend.SESSION_STORAGE:
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.removeItem(fullKey);
          }
          break;
        case CacheBackend.INDEXED_DB:
          // IndexedDB implementation would go here
          break;
      }
    } catch (error) {
      console.warn(`Failed to remove cache entry from ${config.backend}:`, error);
    }
  }

  private async clearBackend(namespace: string, config: CacheConfig): Promise<void> {
    try {
      switch (config.backend) {
        case CacheBackend.LOCAL_STORAGE:
          if (typeof window !== 'undefined' && window.localStorage) {
            const keys = Object.keys(localStorage).filter(key => key.startsWith(`${namespace}:`));
            keys.forEach(key => localStorage.removeItem(key));
          }
          break;
        case CacheBackend.SESSION_STORAGE:
          if (typeof window !== 'undefined' && window.sessionStorage) {
            const keys = Object.keys(sessionStorage).filter(key => key.startsWith(`${namespace}:`));
            keys.forEach(key => sessionStorage.removeItem(key));
          }
          break;
        case CacheBackend.INDEXED_DB:
          // IndexedDB implementation would go here
          break;
      }
    } catch (error) {
      console.warn(`Failed to clear cache backend ${config.backend}:`, error);
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Export utility functions
export function createCacheConfig(
  strategy: CacheStrategy,
  backend: CacheBackend,
  maxSize: number,
  defaultTTL: number,
  options: Partial<CacheConfig> = {}
): CacheConfig {
  return {
    strategy,
    backend,
    maxSize,
    defaultTTL,
    ...options
  };
} 