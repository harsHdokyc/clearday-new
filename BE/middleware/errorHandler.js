import logger from '../utils/logger.js';

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original send function
  const originalSend = res.send;
  
  // Override send to log response after it's sent
  res.send = function(data) {
    // Get auth after Clerk middleware has run
    const auth = typeof req.auth === 'function' ? req.auth() : null;
    const userId = auth?.userId || 'anonymous';
    const duration = Date.now() - startTime;
    
    logger.response(req.method, req.path, userId, res.statusCode, {
      responseSize: data?.length || 0,
      duration: `${duration}ms`
    });
    
    return originalSend.call(this, data);
  };
  
  // Log request after Clerk middleware runs
  // Use setImmediate to ensure Clerk middleware has processed the request
  setImmediate(() => {
    const auth = typeof req.auth === 'function' ? req.auth() : null;
    const userId = auth?.userId || 'anonymous';
    
    logger.request(req.method, req.path, userId, {
      query: req.query,
      bodyKeys: Object.keys(req.body || {}),
      ip: req.ip || req.connection?.remoteAddress
    });
  });
  
  next();
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Safely get auth - req.auth might not be available if Clerk middleware hasn't run or failed
  const auth = typeof req.auth === 'function' ? req.auth() : null;
  const userId = auth?.userId || 'anonymous';
  
  logger.error(`[ERROR_HANDLER] ${req.method} ${req.path}`, err, { userId });
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    logger.warn('[ERROR_HANDLER] Mongoose validation error', { userId, errors });
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    logger.warn('[ERROR_HANDLER] Duplicate key error', { userId, field, keyValue: err.keyValue });
    return res.status(400).json({
      error: 'Duplicate Error',
      message: `${field} already exists`
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    logger.warn('[ERROR_HANDLER] Cast error - invalid ID format', { userId, value: err.value });
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'Invalid resource ID format'
    });
  }

  // Mongoose version error (optimistic concurrency)
  if (err.name === 'VersionError') {
    logger.warn('[ERROR_HANDLER] Version error - document was modified', { 
      userId, 
      documentId: err.documentId,
      version: err.version 
    });
    return res.status(409).json({
      error: 'Conflict',
      message: 'The document was modified by another operation. Please try again.',
      code: 'VERSION_CONFLICT'
    });
  }

  // Multer error
  if (err.code === 'LIMIT_FILE_SIZE') {
    logger.warn('[ERROR_HANDLER] File size limit exceeded', { userId });
    return res.status(400).json({
      error: 'File Size Error',
      message: 'File size exceeds the limit (5MB)'
    });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    logger.warn('[ERROR_HANDLER] File count limit exceeded', { userId });
    return res.status(400).json({
      error: 'File Count Error',
      message: 'Too many files uploaded'
    });
  }

  // JWT/auth errors
  if (err.name === 'JsonWebTokenError') {
    logger.warn('[ERROR_HANDLER] Invalid JWT token', { userId });
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }
  if (err.name === 'TokenExpiredError') {
    logger.warn('[ERROR_HANDLER] JWT token expired', { userId });
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Token expired'
    });
  }

  // Default error
  logger.error('[ERROR_HANDLER] Unhandled error', err, { 
    userId, 
    status: err.status || 500,
    path: req.path,
    method: req.method 
  });
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong on the server',
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
};

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      // Safely get auth - req.auth might not be available if Clerk middleware hasn't run
      const auth = typeof req.auth === 'function' ? req.auth() : null;
      const userId = auth?.userId || 'anonymous';
      logger.warn('[VALIDATION_ERROR] Request validation failed', { 
        userId,
        path: req.path,
        errors: error.details.map(detail => detail.message) 
      });
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFound = (req, res) => {
  // Safely get auth - req.auth might not be available if Clerk middleware hasn't run
  const auth = typeof req.auth === 'function' ? req.auth() : null;
  const userId = auth?.userId || 'anonymous';
  logger.warn('[404_NOT_FOUND] Route not found', { 
    userId,
    method: req.method,
    path: req.path 
  });
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
};

export {
  errorHandler,
  validateRequest,
  asyncHandler,
  notFound
};
