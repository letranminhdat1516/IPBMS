import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private metrics: PerformanceMetric[] = [];
  private queryMetrics: QueryMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics
  private readonly maxQueryMetrics = 500; // Keep last 500 query metrics

  constructor(private readonly _configService: ConfigService) {}

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.logger.debug(`Performance metric recorded: ${name} = ${value}`);
  }

  /**
   * Record database query performance
   */
  recordQueryMetrics(query: string, duration: number, success: boolean, error?: string) {
    const metric: QueryMetrics = {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: Date.now(),
      success,
      error,
    };

    this.queryMetrics.push(metric);

    // Keep only recent query metrics
    if (this.queryMetrics.length > this.maxQueryMetrics) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxQueryMetrics);
    }

    if (success) {
      this.logger.debug(`Query executed in ${duration}ms: ${query.substring(0, 100)}...`);
    } else {
      this.logger.warn(`Query failed in ${duration}ms: ${error}`);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const now = Date.now();
    const lastHour = now - 3600000; // 1 hour ago

    const recentMetrics = this.metrics.filter((m) => m.timestamp > lastHour);
    const recentQueries = this.queryMetrics.filter((q) => q.timestamp > lastHour);

    // Calculate averages
    const cacheHitRate = this.calculateAverage(
      recentMetrics.filter((m) => m.name === 'cache_hit_rate').map((m) => m.value),
    );

    const dbQueryTime = this.calculateAverage(
      recentQueries.filter((q) => q.success).map((q) => q.duration),
    );

    const failedQueries = recentQueries.filter((q) => !q.success).length;

    return {
      period: 'last_hour',
      cache: {
        hitRate: cacheHitRate,
        totalRequests: recentMetrics.filter((m) => m.name.includes('cache')).length,
      },
      database: {
        avgQueryTime: dbQueryTime,
        totalQueries: recentQueries.length,
        failedQueries,
        successRate:
          recentQueries.length > 0
            ? ((recentQueries.length - failedQueries) / recentQueries.length) * 100
            : 0,
      },
      memory: {
        metricsCount: this.metrics.length,
        queryMetricsCount: this.queryMetrics.length,
      },
    };
  }

  /**
   * Get slow queries (queries taking longer than threshold)
   */
  getSlowQueries(thresholdMs: number = 1000) {
    return this.queryMetrics
      .filter((q) => q.duration > thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20); // Top 20 slowest
  }

  /**
   * Get cache performance metrics
   */
  getCacheStats() {
    const cacheMetrics = this.metrics.filter((m) => m.name.includes('cache'));

    const grouped = cacheMetrics.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = [];
        }
        acc[metric.name].push(metric.value);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    const stats: Record<string, any> = {};
    for (const [key, values] of Object.entries(grouped)) {
      stats[key] = {
        count: values.length,
        average: this.calculateAverage(values),
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }

    return stats;
  }

  /**
   * Start timing for a method
   */
  startTiming(label: string): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(`${label}_duration`, duration);
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics() {
    this.metrics = [];
    this.queryMetrics = [];
    this.logger.debug('Performance metrics cleared');
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}
