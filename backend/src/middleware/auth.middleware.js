const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { verifyAccessToken } = require('../services/token.service');

/**
 * Authentication Middleware (adhering to SRS FR-013, FR-149, FR-150)
 * Verifies short-lived access token and scopes user context.
 */
const requireAuth = async (req, res, next) => {
  try {
    let token;

    // Check for Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required. No token provided.', 401, 'UNAUTHORIZED'));
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Access token has expired. Please refresh your token.', 401, 'TOKEN_EXPIRED'));
      }
      return next(new AppError('Invalid access token.', 401, 'INVALID_TOKEN'));
    }

    // Verify that the user still exists in database
    const user = await User.findById(decoded.sub);
    if (!user) {
      return next(new AppError('User belonging to this token no longer exists.', 401, 'UNAUTHORIZED'));
    }

    // Attach user to request (FR-150: ownership is derived strictly from req.user)
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireAuth
};
