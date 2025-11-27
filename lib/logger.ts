/**
 * Client-side logging infrastructure
 * For production, integrate with error tracking services (Sentry, LogRocket, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private isDevelopment = import.meta.env.VITE_APP_ENV === 'development';
  private sessionId: string;
  private userId: string | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadUserId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadUserId(): void {
    try {
      const user = localStorage.getItem('nirnoy_user');
      if (user) {
        const userData = JSON.parse(user);
        this.userId = userData.id || null;
      }
    } catch (e) {
      // Ignore
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      userId: this.userId || undefined,
      sessionId: this.sessionId,
    };

    // Console logging
    if (this.isDevelopment || level === 'error') {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}]`, message, context || '', error || '');
    }

    // Store in localStorage for debugging (limit to last 100 logs)
    if (this.isDevelopment) {
      try {
        const logs = JSON.parse(localStorage.getItem('nirnoy_logs') || '[]');
        logs.push(entry);
        if (logs.length > 100) {
          logs.shift();
        }
        localStorage.setItem('nirnoy_logs', JSON.stringify(logs));
      } catch (e) {
        // Ignore storage errors
      }
    }

    // Send to error tracking service in production
    if (!this.isDevelopment && level === 'error') {
      this.sendToErrorTracking(entry);
    }
  }

  private async sendToErrorTracking(entry: LogEntry): Promise<void> {
    // TODO: Integrate with Sentry, LogRocket, or similar
    // Example:
    // if (window.Sentry) {
    //   window.Sentry.captureException(entry.error || new Error(entry.message), {
    //     extra: entry.context,
    //     user: { id: entry.userId },
    //   });
    // }

    // For now, send to Supabase analytics table (if exists)
    try {
      const { supabase } = await import('./supabase');
      await supabase.from('error_logs').insert({
        level: entry.level,
        message: entry.message,
        context: entry.context,
        error_stack: entry.error?.stack,
        user_id: entry.userId,
        session_id: entry.sessionId,
        created_at: entry.timestamp,
      });
    } catch (e) {
      // Ignore if table doesn't exist
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('error', message, context, error);
  }

  // Performance monitoring
  async measurePerformance<T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.info(`Performance: ${name}`, { duration: `${duration.toFixed(2)}ms` });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`Performance Error: ${name}`, error as Error, { duration: `${duration.toFixed(2)}ms` });
      throw error;
    }
  }

  // Get logs for debugging
  getLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('nirnoy_logs') || '[]');
    } catch {
      return [];
    }
  }

  // Clear logs
  clearLogs(): void {
    localStorage.removeItem('nirnoy_logs');
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for use in components
export default logger;

