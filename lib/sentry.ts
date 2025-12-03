/**
 * Sentry Error Tracking Integration
 * 
 * To enable Sentry:
 * 1. Install: npm install @sentry/react
 * 2. Get your DSN from https://sentry.io
 * 3. Add VITE_SENTRY_DSN to your .env file
 * 4. This file will automatically initialize Sentry
 */

// Check if Sentry is available
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const initSentry = async () => {
  if (!SENTRY_DSN) {
    console.log('[Sentry] Not configured - skipping initialization');
    return;
  }

  try {
    // Dynamically import Sentry to avoid bundle size if not used
    const Sentry = await import('@sentry/react');
    
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.VITE_APP_ENV || 'development',
      integrations: [
        // Automatically instrument React components
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true, // Privacy: mask all text
          blockAllMedia: true, // Privacy: block all media
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: import.meta.env.VITE_APP_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
      
      // Session Replay
      replaysSessionSampleRate: import.meta.env.VITE_APP_ENV === 'production' ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0, // Always record errors
      
      // Filter out sensitive data
      beforeSend(event, hint) {
        // Don't send events in development
        if (import.meta.env.VITE_APP_ENV === 'development') {
          return null;
        }
        
        // Remove sensitive data from URLs
        if (event.request?.url) {
          event.request.url = event.request.url.replace(/[?&](token|password|api_key|secret)=[^&]*/gi, '[REDACTED]');
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'Network request failed',
      ],
    });

    console.log('[Sentry] ✅ Initialized successfully');
  } catch (error) {
    console.warn('[Sentry] Failed to initialize:', error);
  }
};

// Set user context (call this after login)
export const setSentryUser = (user: { id: string; name?: string; email?: string; role?: string }) => {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.setUser({
      id: user.id,
      username: user.name,
      email: user.email,
      role: user.role,
    });
  }
};

// Clear user context (call this on logout)
export const clearSentryUser = () => {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.setUser(null);
  }
};

// Manually capture an error
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureException(error, {
      extra: context,
    });
  }
};

// Capture a message (non-error)
export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureMessage(message, level);
  }
};

