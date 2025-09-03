// Performance Monitoring and Optimization
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.init();
  }

  init() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startMonitoring());
    } else {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    this.observePerformanceMetrics();
    this.observeResourceTiming();
    this.observeUserInteractions();
    this.observeMemoryUsage();
    this.setupPerformanceObserver();
  }

  observePerformanceMetrics() {
    // Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = lastEntry.startTime;
          this.logMetric('LCP', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.metrics.fid = entry.processingStart - entry.startTime;
            this.logMetric('FID', this.metrics.fid);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.metrics.cls = clsValue;
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }

    // Navigation Timing API
    if ('performance' in window && 'timing' in performance) {
      const timing = performance.timing;
      this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
      this.metrics.loadComplete = timing.loadEventEnd - timing.navigationStart;
      this.metrics.dnsLookup = timing.domainLookupEnd - timing.domainLookupStart;
      this.metrics.tcpConnection = timing.connectEnd - timing.connectStart;
      this.metrics.serverResponse = timing.responseEnd - timing.requestStart;
      this.metrics.domParsing = timing.domInteractive - timing.responseEnd;
      this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart;
      this.metrics.loadEvent = timing.loadEventEnd - timing.loadEventStart;
    }

    // Modern Performance API
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      if (navigationEntry) {
        this.metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        this.metrics.domContentLoaded = navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart;
        this.metrics.loadComplete = navigationEntry.loadEventEnd - navigationEntry.fetchStart;
      }
    }
  }

  observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.initiatorType === 'img') {
              this.analyzeImagePerformance(entry);
            } else if (entry.initiatorType === 'css') {
              this.analyzeCSSPerformance(entry);
            } else if (entry.initiatorType === 'script') {
              this.analyzeScriptPerformance(entry);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource timing observer not supported:', error);
      }
    }
  }

  analyzeImagePerformance(entry) {
    const duration = entry.duration;
    const size = entry.transferSize || 0;
    
    if (duration > 1000) {
      console.warn('Slow image load:', entry.name, `${duration}ms`);
      this.suggestImageOptimization(entry.name);
    }
    
    if (size > 500000) { // 500KB
      console.warn('Large image detected:', entry.name, `${(size / 1024).toFixed(2)}KB`);
      this.suggestImageCompression(entry.name);
    }
  }

  analyzeCSSPerformance(entry) {
    const duration = entry.duration;
    if (duration > 500) {
      console.warn('Slow CSS load:', entry.name, `${duration}ms`);
      this.suggestCSSOptimization();
    }
  }

  analyzeScriptPerformance(entry) {
    const duration = entry.duration;
    if (duration > 1000) {
      console.warn('Slow script load:', entry.name, `${duration}ms`);
      this.suggestScriptOptimization(entry.name);
    }
  }

  observeUserInteractions() {
    let lastInteraction = Date.now();
    
    const events = ['click', 'scroll', 'keydown', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        lastInteraction = Date.now();
      }, { passive: true });
    });

    // Monitor for long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) { // 50ms threshold
              console.warn('Long task detected:', entry.duration, 'ms');
              this.suggestTaskOptimization();
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  observeMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.metrics.memory = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        };
        
        // Check for memory leaks
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
          console.warn('High memory usage detected');
          this.suggestMemoryOptimization();
        }
      }, 10000); // Check every 10 seconds
    }
  }

  setupPerformanceObserver() {
    // Monitor for performance marks and measures
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure') {
              this.logMetric(entry.name, entry.duration);
            }
          });
        });
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance observer setup failed:', error);
      }
    }
  }

  logMetric(name, value) {
    console.log(`📊 ${name}:`, value);
    
    // Send to analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value
      });
    }
  }

  suggestImageOptimization(imageUrl) {
    console.log('💡 Image optimization suggestions:');
    console.log('  - Use WebP format if possible');
    console.log('  - Implement lazy loading');
    console.log('  - Use appropriate image sizes');
    console.log('  - Consider using a CDN');
  }

  suggestImageCompression(imageUrl) {
    console.log('💡 Image compression suggestions:');
    console.log('  - Compress images using tools like TinyPNG');
    console.log('  - Use progressive JPEG for large images');
    console.log('  - Implement responsive images with srcset');
  }

  suggestCSSOptimization() {
    console.log('💡 CSS optimization suggestions:');
    console.log('  - Minify CSS files');
    console.log('  - Remove unused CSS');
    console.log('  - Use CSS-in-JS for critical styles');
    console.log('  - Implement CSS code splitting');
  }

  suggestScriptOptimization(scriptUrl) {
    console.log('💡 Script optimization suggestions:');
    console.log('  - Use async/defer attributes');
    console.log('  - Implement code splitting');
    console.log('  - Remove unused JavaScript');
    console.log('  - Use tree shaking');
  }

  suggestTaskOptimization() {
    console.log('💡 Task optimization suggestions:');
    console.log('  - Break long tasks into smaller chunks');
    console.log('  - Use Web Workers for heavy computations');
    console.log('  - Implement requestIdleCallback for non-critical tasks');
  }

  suggestMemoryOptimization() {
    console.log('💡 Memory optimization suggestions:');
    console.log('  - Check for memory leaks');
    console.log('  - Implement proper cleanup in event listeners');
    console.log('  - Use object pooling for frequently created objects');
    console.log('  - Monitor DOM node count');
  }

  getMetrics() {
    return this.metrics;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      recommendations: this.generateRecommendations()
    };
    
    console.log('📋 Performance Report:', report);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint - consider image optimization and critical CSS');
    }
    
    if (this.metrics.fid > 100) {
      recommendations.push('Improve First Input Delay - reduce JavaScript execution time');
    }
    
    if (this.metrics.cls > 0.1) {
      recommendations.push('Reduce Cumulative Layout Shift - avoid layout shifts during page load');
    }
    
    return recommendations;
  }

  // Performance marks and measures
  mark(name) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  measure(name, startMark, endMark) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {
        console.warn('Performance measure failed:', error);
      }
    }
  }
}

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}

// Add to window for global access
window.PerformanceMonitor = PerformanceMonitor;
window.performanceMonitor = performanceMonitor;
