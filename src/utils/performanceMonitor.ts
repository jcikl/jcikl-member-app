/**
 * Performance Monitor
 * 性能监控工具
 * 
 * ⚡ Performance: Real-time monitoring with Web Vitals
 * 性能优化：使用 Web Vitals 的实时监控
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

interface PerformanceMetrics {
  CLS: number | null;   // Cumulative Layout Shift
  FID: number | null;   // First Input Delay
  FCP: number | null;   // First Contentful Paint
  LCP: number | null;   // Largest Contentful Paint
  TTFB: number | null;  // Time to First Byte
  INP: number | null;   // Interaction to Next Paint
}

/**
 * Performance Monitor Class
 * 性能监控类
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    CLS: null,
    FID: null,
    FCP: null,
    LCP: null,
    TTFB: null,
    INP: null,
  };

  private listeners: Array<(metrics: PerformanceMetrics) => void> = [];

  /**
   * Initialize performance monitoring
   * 初始化性能监控
   */
  init() {
    console.log('⚡ [Performance] Initializing Web Vitals monitoring...');

    // Cumulative Layout Shift (should be < 0.1)
    onCLS(this.handleMetric('CLS'));

    // First Input Delay (should be < 100ms)
    onFID(this.handleMetric('FID'));

    // First Contentful Paint (should be < 1.8s)
    onFCP(this.handleMetric('FCP'));

    // Largest Contentful Paint (should be < 2.5s)
    onLCP(this.handleMetric('LCP'));

    // Time to First Byte (should be < 600ms)
    onTTFB(this.handleMetric('TTFB'));

    // Interaction to Next Paint (should be < 200ms)
    onINP(this.handleMetric('INP'));
  }

  /**
   * Handle metric update
   * 处理指标更新
   */
  private handleMetric(name: keyof PerformanceMetrics) {
    return (metric: Metric) => {
      this.metrics[name] = metric.value;
      
      // Log metric
      this.logMetric(name, metric);

      // Notify listeners
      this.notifyListeners();

      // Send to analytics (if configured)
      this.sendToAnalytics(metric);
    };
  }

  /**
   * Log metric to console
   * 记录指标到控制台
   */
  private logMetric(name: string, metric: Metric) {
    const thresholds = {
      CLS: { good: 0.1, needsImprovement: 0.25 },
      FID: { good: 100, needsImprovement: 300 },
      FCP: { good: 1800, needsImprovement: 3000 },
      LCP: { good: 2500, needsImprovement: 4000 },
      TTFB: { good: 600, needsImprovement: 1500 },
      INP: { good: 200, needsImprovement: 500 },
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';

    if (threshold) {
      if (metric.value > threshold.needsImprovement) {
        rating = 'poor';
      } else if (metric.value > threshold.good) {
        rating = 'needs-improvement';
      }
    }

    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '🔴';
    const displayValue = name === 'CLS' 
      ? metric.value.toFixed(3) 
      : `${Math.round(metric.value)}ms`;

    console.log(`${emoji} [Performance] ${name}: ${displayValue} (${rating})`);
  }

  /**
   * Send metric to analytics
   * 发送指标到分析服务
   */
  private sendToAnalytics(metric: Metric) {
    // You can integrate with your analytics service here
    // Example: Google Analytics, Mixpanel, etc.
    
    // For now, just store locally
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      try {
        const existing = localStorage.getItem('performance-metrics') || '[]';
        const metrics = JSON.parse(existing);
        metrics.push({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          timestamp: Date.now(),
          url: window.location.pathname,
        });

        // Keep only last 100 metrics
        if (metrics.length > 100) {
          metrics.shift();
        }

        localStorage.setItem('performance-metrics', JSON.stringify(metrics));
      } catch (error) {
        console.error('Failed to store performance metric:', error);
      }
    }
  }

  /**
   * Get current metrics
   * 获取当前指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Subscribe to metric updates
   * 订阅指标更新
   */
  subscribe(listener: (metrics: PerformanceMetrics) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   * 通知所有监听器
   */
  private notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.getMetrics());
    });
  }

  /**
   * Get performance report
   * 获取性能报告
   */
  getReport(): string {
    const lines = [
      '📊 Performance Report',
      '==================',
      '',
    ];

    Object.entries(this.metrics).forEach(([name, value]) => {
      if (value !== null) {
        const displayValue = name === 'CLS' ? value.toFixed(3) : `${Math.round(value)}ms`;
        lines.push(`${name}: ${displayValue}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Log performance report to console
   * 将性能报告记录到控制台
   */
  logReport() {
    console.log(this.getReport());
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize performance monitoring
 * 初始化性能监控
 */
export const initPerformanceMonitoring = () => {
  performanceMonitor.init();
};

/**
 * React hook for performance metrics
 * 性能指标的 React 钩子
 */
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>(performanceMonitor.getMetrics());

  React.useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe(setMetrics);
    return unsubscribe;
  }, []);

  return metrics;
};

// Import React for the hook
import React from 'react';

export default performanceMonitor;

