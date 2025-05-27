import { logger } from './logger.js';

/**
 * Handle and log errors consistently across the application
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {any} additionalData - Additional data related to the error
 */
export function handleError(error, context = 'Unknown', additionalData = null) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    ...(additionalData && { additionalData })
  };

  logger.error(`Error in ${context}:`, errorInfo);

  // In production, you might want to send errors to a monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToMonitoringService(errorInfo);
  }

  return errorInfo;
}

/**
 * Handle Socket.io specific errors
 * @param {Error} error - The Socket.io error
 * @param {string} socketId - The socket ID where error occurred
 * @param {string} event - The event that caused the error
 * @param {any} data - The data associated with the event
 */
export function handleSocketError(error, socketId, event = null, data = null) {
  const context = `Socket.io ${event ? `event: ${event}` : 'connection'}`;
  const additionalData = {
    socketId,
    event,
    data
  };

  return handleError(error, context, additionalData);
}

/**
 * Create a standardized error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Error response object
 */
export function createErrorResponse(message, code = 'INTERNAL_ERROR', statusCode = 500) {
  return {
    error: true,
    message,
    code,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

/**
 * Wrapper for async functions to handle errors gracefully
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export function asyncErrorHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, 'Async operation');
      throw error;
    }
  };
} 