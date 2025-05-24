/**
 * Database Performance Monitoring Utility
 * Tracks and analyzes Supabase database interaction performance
 */

class DBPerformanceMonitor {
  constructor() {
    this.metrics = {
      queries: [],
      totalQueries: 0,
      totalTime: 0,
      slowQueries: [],
      errors: [],
      lastSync: Date.now()
    };
    
    // Configuration
    this.config = {
      slowQueryThreshold: 500, // ms
      logToConsole: true,
      maxStoredQueries: 100,
      storageKey: 'trashdrop_db_metrics'
    };

    // Load saved metrics if available
    this.loadMetrics();
  }

  /**
   * Track a database operation's performance
   * @param {string} operation - The operation type (select, insert, update, delete)
   * @param {string} table - The table being queried
   * @param {Object} params - Query parameters
   * @returns {Function} - Function to call when query completes
   */
  trackOperation(operation, table, params = {}) {
    const startTime = performance.now();
    const queryData = {
      operation,
      table, 
      params: JSON.stringify(params).substring(0, 500), // Truncate for storage efficiency
      startTime,
      timestamp: new Date().toISOString()
    };
    
    return (result) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      queryData.duration = duration;
      queryData.status = result.error ? 'error' : 'success';
      queryData.rowCount = result.data ? (Array.isArray(result.data) ? result.data.length : 1) : 0;
      
      // Track slow queries
      if (duration > this.config.slowQueryThreshold) {
        queryData.isSlow = true;
        this.metrics.slowQueries.push(queryData);
        
        // Keep only the latest slow queries
        if (this.metrics.slowQueries.length > this.config.maxStoredQueries / 2) {
          this.metrics.slowQueries = this.metrics.slowQueries.slice(-Math.floor(this.config.maxStoredQueries / 2));
        }
      }
      
      // Track errors
      if (result.error) {
        queryData.error = result.error.message || 'Unknown error';
        this.metrics.errors.push({
          table,
          operation,
          error: result.error.message || 'Unknown error',
          timestamp: queryData.timestamp
        });
        
        // Keep only the latest errors
        if (this.metrics.errors.length > this.config.maxStoredQueries / 2) {
          this.metrics.errors = this.metrics.errors.slice(-Math.floor(this.config.maxStoredQueries / 2));
        }
      }
      
      // Update overall metrics
      this.metrics.queries.push(queryData);
      this.metrics.totalQueries++;
      this.metrics.totalTime += duration;
      
      // Keep only the latest queries for memory efficiency
      if (this.metrics.queries.length > this.config.maxStoredQueries) {
        this.metrics.queries = this.metrics.queries.slice(-this.config.maxStoredQueries);
      }
      
      // Log to console if enabled
      if (this.config.logToConsole) {
        if (queryData.isSlow) {
          console.warn(`🐌 Slow query (${duration.toFixed(2)}ms): ${operation} on ${table}`);
        } else if (result.error) {
          console.error(`❌ Query error (${operation} on ${table}): ${result.error.message}`);
        } else if (this.config.logToConsole === 'verbose') {
          console.log(`✅ Query (${duration.toFixed(2)}ms): ${operation} on ${table}`);
        }
      }
      
      // Save metrics periodically (every 10 operations)
      if (this.metrics.totalQueries % 10 === 0) {
        this.saveMetrics();
      }
      
      return result;
    };
  }
  
  /**
   * Get performance metrics
   * @param {string} type - Type of metrics to get (all, slow, errors)
   * @returns {Object} Metrics data
   */
  getMetrics(type = 'all') {
    switch(type) {
      case 'slow':
        return {
          slowQueries: this.metrics.slowQueries,
          count: this.metrics.slowQueries.length,
          avgDuration: this.getAverageDuration(this.metrics.slowQueries)
        };
      case 'errors':
        return {
          errors: this.metrics.errors,
          count: this.metrics.errors.length
        };
      case 'summary':
        return {
          totalQueries: this.metrics.totalQueries,
          totalTime: this.metrics.totalTime,
          avgDuration: this.metrics.totalQueries ? this.metrics.totalTime / this.metrics.totalQueries : 0,
          slowQueryCount: this.metrics.slowQueries.length,
          errorCount: this.metrics.errors.length,
          lastSync: this.metrics.lastSync
        };
      default:
        return this.metrics;
    }
  }
  
  /**
   * Calculate average duration for a set of queries
   * @param {Array} queries - Array of query objects
   * @returns {number} Average duration in ms
   */
  getAverageDuration(queries) {
    if (!queries || queries.length === 0) return 0;
    const total = queries.reduce((sum, q) => sum + (q.duration || 0), 0);
    return total / queries.length;
  }
  
  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      queries: [],
      totalQueries: 0,
      totalTime: 0,
      slowQueries: [],
      errors: [],
      lastSync: Date.now()
    };
    this.saveMetrics();
  }
  
  /**
   * Save metrics to localStorage
   */
  saveMetrics() {
    try {
      // Only save essential data to keep storage size manageable
      const essentialMetrics = {
        totalQueries: this.metrics.totalQueries,
        totalTime: this.metrics.totalTime,
        slowQueries: this.metrics.slowQueries.slice(-20), // Only keep the 20 most recent slow queries
        errors: this.metrics.errors.slice(-20), // Only keep the 20 most recent errors
        lastSync: Date.now()
      };
      
      localStorage.setItem(this.config.storageKey, JSON.stringify(essentialMetrics));
    } catch (error) {
      console.error('Failed to save DB metrics:', error);
    }
  }
  
  /**
   * Load metrics from localStorage
   */
  loadMetrics() {
    try {
      const savedMetrics = localStorage.getItem(this.config.storageKey);
      if (savedMetrics) {
        const parsed = JSON.parse(savedMetrics);
        // Merge with current metrics
        this.metrics = {
          ...this.metrics,
          totalQueries: parsed.totalQueries || 0,
          totalTime: parsed.totalTime || 0,
          slowQueries: parsed.slowQueries || [],
          errors: parsed.errors || [],
          lastSync: parsed.lastSync || Date.now()
        };
      }
    } catch (error) {
      console.error('Failed to load DB metrics:', error);
    }
  }
  
  /**
   * Configure the monitor
   * @param {Object} config - Configuration options
   */
  configure(config = {}) {
    this.config = { ...this.config, ...config };
  }
}

// Create a singleton instance
const dbMonitor = new DBPerformanceMonitor();

// Export the monitor instance
window.dbMonitor = dbMonitor;
export default dbMonitor;
