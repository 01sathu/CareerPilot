const rateLimit = require('express-rate-limit');
const AppError = require('../utils/appError');
const env = require('../config/env');

/**
 * Login Rate Limiter (adhering to SRS FR-008)
 * Rate-limits failed login attempts to 5 per 15 minutes per IP/email.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 5, // higher limit during automated test runs
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : 'no-email';
    return `${req.ip}_${email}`;
  },
  handler: (req, res, next, options) => {
    res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
    next(new AppError('Too many failed login attempts. Please try again after 15 minutes.', 429, 'RATE_LIMIT_EXCEEDED'));
  }
});

/**
 * General Auth Endpoints Rate Limiter (Registration, Forgot Password)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.setHeader('Retry-After', Math.ceil(options.windowMs / 1000));
    next(new AppError('Too many requests from this IP. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED'));
  }
});

module.exports = {
  loginLimiter,
  authLimiter
};
