const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Token Service (adhering to SRS FR-009 & FR-010)
 */

// Generate a 15-minute JWT access token containing ONLY the user ID (sub)
const generateAccessToken = (userId) => {
  return jwt.sign(
    { sub: userId.toString() },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

// Generate an opaque cryptographically random refresh token
const generateOpaqueRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// SHA-256 hash a refresh token for safe database storage
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Verify JWT access token
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

// Standard cookie options for refresh token
const getRefreshTokenCookieOptions = () => {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/'
  };
};

const getClearRefreshTokenCookieOptions = () => {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  };
};

module.exports = {
  generateAccessToken,
  generateOpaqueRefreshToken,
  hashToken,
  verifyAccessToken,
  getRefreshTokenCookieOptions,
  getClearRefreshTokenCookieOptions
};
