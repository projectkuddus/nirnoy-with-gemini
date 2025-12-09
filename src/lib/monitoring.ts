/**
 * Application monitoring and analytics
 * Tracks user activity, performance metrics, and system health
 */

import { logger } from './logger';

interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags?: Record<string, string>;
}

class Monitoring {
  private metrics: Metric[] = [];
  private maxMetrics = 1000;

  /**
   * Track a metric
   */
  trackMetric(name: string, value: number, unit: string = 'ms', tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      tags,
    };

    this.metrics.push(metric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log important metrics
    if (value > 1000 || name.includes('error')) {
      logger.warn(`Metric: ${name}`, { value, unit, tags });
    }
  }

  /**
   * Track page view
   */
  trackPageView(page: string, duration?: number): void {
    this.trackMetric('page_view', duration || 0, 'ms', { page });
    
    // Send to analytics (if configured)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: page,
      });
    }
  }

  /**
   * Track user action
   */
  trackAction(action: string, details?: Record<string, any>): void {
    this.trackMetric('user_action', 1, 'count', { action, ...details });
    
    logger.info(`User Action: ${action}`, details);
  }

  /**
   * Track API call
   */
  trackAPICall(endpoint: string, duration: number, success: boolean): void {
    this.trackMetric('api_call', duration, 'ms', {
      endpoint,
      success: success.toString(),
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, any>): void {
    this.trackMetric('error', 1, 'count', {
      error_name: error.name,
      error_message: error.message.substring(0, 100),
      ...context,
    });

    logger.error('Tracked Error', error, context);
  }

  /**
   * Track performance
   */
  trackPerformance(operation: string, duration: number): void {
    this.trackMetric('performance', duration, 'ms', { operation });
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): Record<string, { count: number; avg: number; max: number; min: number }> {
    const summary: Record<string, any> = {};

    this.metrics.forEach((metric) => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          total: 0,
          max: -Infinity,
          min: Infinity,
        };
      }

      const stat = summary[metric.name];
      stat.count++;
      stat.total += metric.value;
      stat.max = Math.max(stat.max, metric.value);
      stat.min = Math.min(stat.min, metric.value);
    });

    // Calculate averages
    Object.keys(summary).forEach((key) => {
      const stat = summary[key];
      stat.avg = stat.total / stat.count;
      delete stat.total;
    });

    return summary;
  }

  /**
   * Export metrics (for sending to analytics service)
   */
  exportMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const monitoring = new Monitoring();

// React hook for tracking page views
export function usePageTracking(page: string) {
  if (typeof window !== 'undefined') {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      monitoring.trackPageView(page, duration);
    };
  }
  
  return () => {};
}

export default monitoring;

