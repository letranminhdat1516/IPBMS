import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PerformanceMonitoringService } from './performance-monitoring.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 300; // 5 minutes default

  constructor(
    private readonly _configService: ConfigService,
    private readonly _performanceMonitoring: PerformanceMonitoringService,
  ) {}

  /**
   * Get cached data by key
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this._performanceMonitoring.recordMetric('cache_miss', 1, { key });
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this._performanceMonitoring.recordMetric('cache_expired', 1, { key });
      return null;
    }

    this._performanceMonitoring.recordMetric('cache_hit', 1, { key });
    return entry.data;
  }

  /**
   * Set cache data with optional TTL
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, entry);
    this._performanceMonitoring.recordMetric('cache_set', 1, { key, ttl: ttl.toString() });
  }

  /**
   * Delete cache entry by key
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted for key: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }

  /**
   * Delete cache entries by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    this.logger.debug(`Deleted ${deletedCount} cache entries matching pattern: ${pattern}`);
    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalEntries = entries.length;
    const expiredEntries = entries.filter(
      (entry) => Date.now() - entry.timestamp > entry.ttl * 1000,
    ).length;

    return {
      totalEntries,
      expiredEntries,
      activeEntries: totalEntries - expiredEntries,
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length,
    };
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Clean up expired entries (can be called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }
}
