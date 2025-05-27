/**
 * Simple logger utility for the application
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const currentLogLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.INFO;

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} data - Additional data to log
 * @returns {string} Formatted log message
 */
function formatMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}`;
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {any} data - Additional error data
 */
export function error(message, data) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    console.error(formatMessage('ERROR', message, data));
  }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {any} data - Additional warning data
 */
export function warn(message, data) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(formatMessage('WARN', message, data));
  }
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {any} data - Additional info data
 */
export function info(message, data) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.log(formatMessage('INFO', message, data));
  }
}

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {any} data - Additional debug data
 */
export function debug(message, data) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.log(formatMessage('DEBUG', message, data));
  }
}

/**
 * Logger object with all logging methods
 */
export const logger = {
  error,
  warn,
  info,
  debug
}; 