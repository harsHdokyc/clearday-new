/**
 * Performance monitoring and optimization utilities
 * 
 * This module provides performance monitoring tools, optimization utilities,
 * and performance tracking capabilities for the ClearDay application.
 * 
 * @fileoverview Performance monitoring and optimization utilities
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

import React from 'react';

// ============================================================================
// Performance Metrics Interface
// ============================================================================

/**
 * Performance metric data structure
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  category: 'render' | 'api' | 'storage' | 'user' | 'system';
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThreshold {
  warning: number;
  critical: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of operations to track
  maxMetrics: number; // Maximum metrics to keep in memory
  thresholds: Record<string, PerformanceThreshold>;
}

// ============================================================================
// Performance Monitor Class
// ============================================================================

/**
 * Performance monitoring system
 * 
 * Tracks and analyzes application performance metrics with configurable thresholds
 * and automated reporting capabilities.
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private config: PerformanceConfig;
  private observers: PerformanceObserver[] = [];
  private startTime: number = performance.now();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 0.1, // Track 10% of operations by default
      maxMetrics: 1000,
      thresholds: {
        // Default thresholds
        'api-response': { warning: 1000, critical: 3000, unit: 'ms' },
        'render-time': { warning: 16, critical: 33, unit: 'ms' },
        'file-upload': { warning: 5000, critical: 15000, unit: 'ms' },
        'memory-usage': { warning: 50, critical: 80, unit: 'percentage' },
      },
      ...config,
    };

    if (this.config.enabled && typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  /**
   * Initialize performance observers for browser metrics
   */
  private initializeObservers(): void {
    try {
      // Observer for navigation timing
      if ('PerformanceObserver' in window) {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordMetric('page-load', navEntry.loadEventEnd - navEntry.loadEventStart, 'ms', 'system');
            }
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      }

      // Observer for resource timing
      if ('PerformanceObserver' in window) {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              const duration = resourceEntry.responseEnd - resourceEntry.requestStart;
              this.recordMetric('resource-load', duration, 'ms', 'api');
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      }

      // Observer for long tasks
      if ('PerformanceObserver' in window && 'PerformanceLongTaskTiming' in window) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              this.recordMetric('long-task', entry.duration, 'ms', 'render');
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      }
    } catch (error) {
      console.warn('Performance observers initialization failed:', error);
    }
  }

  /**
   * Record a performance metric
   * 
   * @param name - Metric name
   * @param value - Metric value
   * @param unit - Unit of measurement
   * @param category - Metric category
   */
  public recordMetric(
    name: string, 
    value: number, 
    unit: PerformanceMetric['unit'], 
    category: PerformanceMetric['category']
  ): void {
    if (!this.config.enabled) return;

    // Sample based on configured rate
    if (Math.random() > this.config.sampleRate) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      category,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Maintain maximum metrics limit
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    // Check thresholds
    this.checkThresholds(metric);
  }

  /**
   * Check if metric exceeds configured thresholds
   * 
   * @param metric - Metric to check
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.config.thresholds[metric.name];
    if (!threshold) return;

    let level: 'warning' | 'critical' | null = null;
    
    if (metric.value >= threshold.critical) {
      level = 'critical';
    } else if (metric.value >= threshold.warning) {
      level = 'warning';
    }

    if (level) {
      console.warn(`Performance ${level}: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${threshold[level]}${threshold.unit})`);
      
      // Could trigger alerts or send to monitoring service here
      this.reportThresholdViolation(metric, level, threshold);
    }
  }

  /**
   * Report threshold violation (could be extended to send to monitoring service)
   * 
   * @param metric - Violating metric
   * @param level - Violation level
   * @param threshold - Threshold configuration
   */
  private reportThresholdViolation(
    metric: PerformanceMetric, 
    level: 'warning' | 'critical', 
    threshold: PerformanceThreshold
  ): void {
    // In production, this could send to a monitoring service
    if (process.env.NODE_ENV === 'development') {
      console.group(`Performance ${level.toUpperCase()}: ${metric.name}`);
      console.log('Value:', metric.value, metric.unit);
      console.log('Threshold:', threshold[level], threshold.unit);
      console.log('Timestamp:', new Date(metric.timestamp));
      console.log('Category:', metric.category);
      console.groupEnd();
    }
  }

  /**
   * Get metrics summary for a specific time period
   * 
   * @param period - Time period in milliseconds (default: 5 minutes)
   * @returns Summary of metrics
   */
  public getMetricsSummary(period: number = 5 * 60 * 1000): {
    total: number;
    byCategory: Record<string, number>;
    averages: Record<string, number>;
    max: Record<string, number>;
  } {
    const cutoff = Date.now() - period;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    const byCategory: Record<string, number> = {};
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    const max: Record<string, number> = {};

    for (const metric of recentMetrics) {
      // Count by category
      byCategory[metric.category] = (byCategory[metric.category] || 0) + 1;

      // Calculate averages and max by name
      if (!sums[metric.name]) {
        sums[metric.name] = 0;
        counts[metric.name] = 0;
        max[metric.name] = metric.value;
      }
      sums[metric.name] += metric.value;
      counts[metric.name] += 1;
      max[metric.name] = Math.max(max[metric.name], metric.value);
    }

    const averages: Record<string, number> = {};
    for (const name in sums) {
      averages[name] = sums[name] / counts[name];
    }

    return {
      total: recentMetrics.length,
      byCategory,
      averages,
      max,
    };
  }

  /**
   * Get memory usage information
   * 
   * @returns Memory usage metrics or null if unavailable
   */
  public getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    }
    return null;
  }

  /**
   * Clear all stored metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Disable performance monitoring
   */
  public disable(): void {
    this.config.enabled = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * Enable performance monitoring
   */
  public enable(): void {
    this.config.enabled = true;
    if (this.observers.length === 0) {
      this.initializeObservers();
    }
  }
}

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Create a performance measurement wrapper for async functions
 * 
 * @param fn - Function to measure
 * @param name - Metric name
 * @param monitor - Performance monitor instance
 * @returns Wrapped function with performance tracking
 */
export function measurePerformance<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string,
  monitor: PerformanceMonitor
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      monitor.recordMetric(name, duration, 'ms', 'api');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      monitor.recordMetric(`${name}-error`, duration, 'ms', 'api');
      throw error;
    }
  }) as T;
}

/**
 * Create a performance measurement wrapper for synchronous functions
 * 
 * @param fn - Function to measure
 * @param name - Metric name
 * @param monitor - Performance monitor instance
 * @returns Wrapped function with performance tracking
 */
export function measureSyncPerformance<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  monitor: PerformanceMonitor
): T {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    try {
      const result = fn(...args);
      const duration = performance.now() - startTime;
      monitor.recordMetric(name, duration, 'ms', 'render');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      monitor.recordMetric(`${name}-error`, duration, 'ms', 'render');
      throw error;
    }
  }) as T;
}

/**
 * Debounce function with performance tracking
 * 
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @param monitor - Performance monitor instance
 * @returns Debounced function
 */
export function measureDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  monitor: PerformanceMonitor
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  let callCount = 0;
  
  return (...args: Parameters<T>) => {
    callCount++;
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      monitor.recordMetric('debounce-calls', callCount, 'count', 'user');
      callCount = 0;
      func(...args);
    }, delay);
  };
}

/**
 * Throttle function with performance tracking
 * 
 * @param func - Function to throttle
 * @param delay - Delay in milliseconds
 * @param monitor - Performance monitor instance
 * @returns Throttled function
 */
export function measureThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  monitor: PerformanceMonitor
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let skippedCalls = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      if (skippedCalls > 0) {
        monitor.recordMetric('throttle-skipped', skippedCalls, 'count', 'user');
        skippedCalls = 0;
      }
      lastCall = now;
      func(...args);
    } else {
      skippedCalls++;
    }
  };
}

// ============================================================================
// React Performance Hooks
// ============================================================================

/**
 * Performance monitoring hook for React components
 * 
 * @param componentName - Name of the component being monitored
 * @param monitor - Performance monitor instance
 * @returns Performance tracking utilities
 */
export function usePerformanceMonitoring(
  componentName: string,
  monitor: PerformanceMonitor
) {
  const renderCount = React.useRef(0);
  const renderStartTime = React.useRef<number>(0);

  React.useEffect(() => {
    renderCount.current++;
    renderStartTime.current = performance.now();

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      monitor.recordMetric(`${componentName}-render`, renderTime, 'ms', 'render');
      monitor.recordMetric(`${componentName}-renders`, renderCount.current, 'count', 'render');
    };
  });

  return {
    renderCount: renderCount.current,
    measureOperation: (name: string, operation: () => void) => {
      const start = performance.now();
      operation();
      const duration = performance.now() - start;
      monitor.recordMetric(`${componentName}-${name}`, duration, 'ms', 'user');
    },
  };
}

/**
 * Memory usage monitoring hook
 * 
 * @param monitor - Performance monitor instance
 * @param interval - Monitoring interval in milliseconds
 * @returns Current memory usage
 */
export function useMemoryMonitoring(monitor: PerformanceMonitor, interval: number = 5000) {
  const [memoryUsage, setMemoryUsage] = React.useState<{ used: number; total: number; percentage: number } | null>(null);

  React.useEffect(() => {
    const updateMemoryUsage = () => {
      const usage = monitor.getMemoryUsage();
      if (usage) {
        setMemoryUsage(usage);
        monitor.recordMetric('memory-usage', usage.percentage, 'percentage', 'system');
      }
    };

    updateMemoryUsage();
    const intervalId = setInterval(updateMemoryUsage, interval);

    return () => clearInterval(intervalId);
  }, [monitor, interval]);

  return memoryUsage;
}

// ============================================================================
// Global Performance Monitor Instance
// ============================================================================

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor({
  enabled: process.env.NODE_ENV === 'development',
  sampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.01, // 100% in dev, 1% in prod
  maxMetrics: 500,
});

// ============================================================================
// Performance Reporting
// ============================================================================

/**
 * Generate performance report for debugging
 * 
 * @param monitor - Performance monitor instance
 * @returns Formatted performance report
 */
export function generatePerformanceReport(monitor: PerformanceMonitor = globalPerformanceMonitor): string {
  const summary = monitor.getMetricsSummary();
  const memory = monitor.getMemoryUsage();
  
  let report = '=== Performance Report ===\n\n';
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `Total Metrics: ${summary.total}\n\n`;
  
  if (memory) {
    report += `Memory Usage: ${(memory.used / 1024 / 1024).toFixed(2)}MB / ${(memory.total / 1024 / 1024).toFixed(2)}MB (${memory.percentage.toFixed(1)}%)\n\n`;
  }
  
  report += 'Metrics by Category:\n';
  for (const [category, count] of Object.entries(summary.byCategory)) {
    report += `  ${category}: ${count}\n`;
  }
  
  report += '\nAverage Times:\n';
  for (const [name, avg] of Object.entries(summary.averages)) {
    report += `  ${name}: ${avg.toFixed(2)}ms\n`;
  }
  
  report += '\nMaximum Times:\n';
  for (const [name, max] of Object.entries(summary.max)) {
    report += `  ${name}: ${max.toFixed(2)}ms\n`;
  }
  
  return report;
}

/**
 * Log performance report to console (development only)
 */
export function logPerformanceReport(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(generatePerformanceReport());
  }
}
