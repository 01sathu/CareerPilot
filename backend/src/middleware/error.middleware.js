const AppError = require('../utils/appError');
const env = require('../config/env');

/**
 * Centralized Error-Handling Middleware (SRS FR-127, Section 13)
 * Standard envelope:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "...",
 *     "message": "...",
 *     "details": [...],
 *     "requestId": "..."
 *   }
 * }
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle SyntaxError for malformed JSON request bodies
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('Malformed JSON payload received', 400, 'INVALID_JSON');
  }

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    error = new AppError(`Invalid resource identifier: ${err.value}`, 400, 'INVALID_ID');
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    const field = fields[0] || 'field';
    error = new AppError(
      `Duplicate value entered for ${field}. Please use another value.`,
      409,
      'DUPLICATE_RESOURCE',
      [{ field, message: `${field} must be unique` }]
    );
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
    error = new AppError('Validation error occurred', 400, 'VALIDATION_ERROR', details);
  }

  // Handle Zod Validation Error (if thrown directly)
  if (err.name === 'ZodError') {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', details);
  }

  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'INTERNAL_SERVER_ERROR';
  const isOperational = error.isOperational || false;

  // Build the standardized error response payload
  const errorPayload = {
    code: errorCode,
    message: isOperational || env.NODE_ENV !== 'production'
      ? error.message
      : 'An unexpected internal server error occurred',
    details: error.details && error.details.length > 0 ? error.details : [],
    requestId: req.id || 'unknown'
  };

  // Log internal unexpected errors server-side
  if (statusCode >= 500) {
    console.error(`[Server Error] [${req.id || 'no-id'}] ${req.method} ${req.originalUrl}:`, err);
  }

  return res.status(statusCode).json({
    success: false,
    error: errorPayload
  });
};

module.exports = errorHandler;
