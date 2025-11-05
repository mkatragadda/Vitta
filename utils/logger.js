/**
 * Application Logger
 * Centralized logging with production-safe defaults
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.info('User logged in', { userId: user.id });
 *   logger.error('API call failed', error);
 *   logger.warn('Low balance detected', { cardId, balance });
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Log levels
const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * Format log message with timestamp and context
 */
const formatMessage = (level, context, message, data) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;

  if (data) {
    return `${prefix} ${message}`;
  }
  return `${prefix} ${message}`;
};

/**
 * Log to console (development only)
 */
const logToConsole = (level, context, message, data) => {
  if (!isDevelopment) return;

  const formatted = formatMessage(level, context, message, data);

  switch (level) {
    case LogLevel.ERROR:
      console.error(formatted, data || '');
      break;
    case LogLevel.WARN:
      console.warn(formatted, data || '');
      break;
    case LogLevel.INFO:
      console.info(formatted, data || '');
      break;
    case LogLevel.DEBUG:
      console.log(formatted, data || '');
      break;
    default:
      console.log(formatted, data || '');
  }
};

/**
 * Log to external service (production)
 * TODO: Integrate with logging service (Sentry, LogRocket, etc.)
 */
const logToService = (level, context, message, data) => {
  // In production, send to logging service
  // For now, only log errors to avoid console clutter
  if (level === LogLevel.ERROR) {
    // TODO: Send to error tracking service
    // Example: Sentry.captureException(data);
  }
};

/**
 * Main logging function
 */
const log = (level, context, message, data) => {
  // Always log to service (for production monitoring)
  logToService(level, context, message, data);

  // Console logging (development only)
  logToConsole(level, context, message, data);
};

/**
 * Create a logger instance for a specific context
 */
export const createLogger = (context) => ({
  error: (message, data) => log(LogLevel.ERROR, context, message, data),
  warn: (message, data) => log(LogLevel.WARN, context, message, data),
  info: (message, data) => log(LogLevel.INFO, context, message, data),
  debug: (message, data) => log(LogLevel.DEBUG, context, message, data),
});

/**
 * Default logger instance
 */
export const logger = createLogger('App');

/**
 * Disable all logging (for tests)
 */
export const disableLogging = () => {
  // Set flag or no-op all functions
};

/**
 * Enable logging
 */
export const enableLogging = () => {
  // Reset to normal
};
