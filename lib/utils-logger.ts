/**
 * Rate-Limited Logger Utility
 * Prevents log spam by deduplicating and rate-limiting repeated errors
 */

interface LogEntry {
  message: string;
  lastLogged: number;
  count: number;
}

class RateLimitedLogger {
  private errorCache = new Map<string, LogEntry>();
  private readonly minInterval: number; // Minimum time between duplicate logs (ms)
  private readonly summaryInterval: number; // How often to print summary (ms)
  private summaryTimer: NodeJS.Timeout | null = null;

  constructor(minInterval = 60000, summaryInterval = 300000) {
    // Default: 1 min between duplicates, 5 min summary interval
    this.minInterval = minInterval;
    this.summaryInterval = summaryInterval;
    this.startSummaryTimer();
  }

  /**
   * Log an error with rate limiting
   * @param key - Unique identifier for this error type
   * @param message - Error message
   * @param data - Additional data to log (only shown on first occurrence)
   */
  error(key: string, message: string, data?: any): void {
    const now = Date.now();
    const existing = this.errorCache.get(key);

    if (!existing) {
      // First occurrence - log immediately
      console.error(`[ERROR] ${message}`, data || '');
      this.errorCache.set(key, {
        message,
        lastLogged: now,
        count: 1
      });
    } else {
      // Duplicate error - increment counter
      existing.count++;

      // Only log if enough time has passed
      if (now - existing.lastLogged >= this.minInterval) {
        console.error(
          `[ERROR] ${message} (occurred ${existing.count} times in last ${Math.round((now - existing.lastLogged) / 1000)}s)`
        );
        existing.lastLogged = now;
        existing.count = 1; // Reset counter after logging
      }
    }
  }

  /**
   * Log a warning with rate limiting
   */
  warn(key: string, message: string, data?: any): void {
    const now = Date.now();
    const existing = this.errorCache.get(key);

    if (!existing) {
      console.warn(`[WARN] ${message}`, data || '');
      this.errorCache.set(key, {
        message,
        lastLogged: now,
        count: 1
      });
    } else {
      existing.count++;

      if (now - existing.lastLogged >= this.minInterval) {
        console.warn(
          `[WARN] ${message} (occurred ${existing.count} times in last ${Math.round((now - existing.lastLogged) / 1000)}s)`
        );
        existing.lastLogged = now;
        existing.count = 1;
      }
    }
  }

  /**
   * Print a summary of suppressed errors
   */
  private printSummary(): void {
    const now = Date.now();
    const suppressedErrors: string[] = [];

    for (const [key, entry] of this.errorCache.entries()) {
      if (entry.count > 1) {
        suppressedErrors.push(
          `  - ${entry.message}: ${entry.count} occurrences (last ${Math.round((now - entry.lastLogged) / 1000)}s ago)`
        );
      }
    }

    if (suppressedErrors.length > 0) {
      console.log('\n📊 Rate-limited log summary:');
      console.log(suppressedErrors.join('\n'));
      console.log('');
    }

    // Clean up old entries (older than 1 hour)
    for (const [key, entry] of this.errorCache.entries()) {
      if (now - entry.lastLogged > 3600000) {
        this.errorCache.delete(key);
      }
    }
  }

  /**
   * Start periodic summary timer
   */
  private startSummaryTimer(): void {
    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
    }

    this.summaryTimer = setInterval(() => {
      this.printSummary();
    }, this.summaryInterval);

    // Don't keep process alive for this timer
    if (this.summaryTimer.unref) {
      this.summaryTimer.unref();
    }
  }

  /**
   * Clear all cached errors
   */
  clear(): void {
    this.errorCache.clear();
  }

  /**
   * Stop the logger (cleanup)
   */
  stop(): void {
    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
      this.summaryTimer = null;
    }
    this.clear();
  }
}

// Singleton instance
export const logger = new RateLimitedLogger();

/**
 * Helper function for rate-limited error logging
 */
export function logError(key: string, message: string, data?: any): void {
  logger.error(key, message, data);
}

/**
 * Helper function for rate-limited warning logging
 */
export function logWarn(key: string, message: string, data?: any): void {
  logger.warn(key, message, data);
}
