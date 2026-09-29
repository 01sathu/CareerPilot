/**
 * MongoDB Operator Injection Sanitization Middleware
 * Implements NFR-SEC-06:
 * Request bodies, query parameters, and path params are sanitized against MongoDB operator injection
 * by stripping or removing any object keys that begin with '$' or contain '.'
 */

const sanitizeObject = (target) => {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeObject(item));
  }

  const clean = {};
  for (const key of Object.keys(target)) {
    // If key starts with '$' or contains '.', or is prototype pollution key, strip it to prevent query operator injection
    if (
      key.startsWith('$') ||
      key.includes('.') ||
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype'
    ) {
      continue;
    }
    clean[key] = sanitizeObject(target[key]);
  }

  return clean;
};

const mongoSanitize = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

module.exports = {
  mongoSanitize,
  sanitizeObject
};
