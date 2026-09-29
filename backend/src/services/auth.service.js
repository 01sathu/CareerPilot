const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/appError');
const env = require('../config/env');
const {
  generateAccessToken,
  generateOpaqueRefreshToken,
  hashToken
} = require('./token.service');

/**
 * Register a new user (FR-001 - FR-005)
 */
const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Check email uniqueness (FR-002)
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('Email already registered', 409, 'EMAIL_ALREADY_REGISTERED');
  }

  // Hash password using bcrypt (cost factor >= 12, FR-004)
  const passwordHash = await User.hashPassword(password);

  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    refreshTokens: []
  });

  // Issue initial tokens on registration (FR-005)
  const rawRefreshToken = generateOpaqueRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const tokenFamily = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  user.refreshTokens.push({
    tokenHash,
    family: tokenFamily,
    expiresAt,
    isRevoked: false
  });

  await user.save();

  const accessToken = generateAccessToken(user._id);

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken: rawRefreshToken
  };
};

/**
 * Login user with email and password (FR-006, FR-007)
 */
const loginUser = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Select passwordHash explicitly since it is select: false by default
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  // Generic message on failed login (FR-007)
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Issue new session tokens
  const rawRefreshToken = generateOpaqueRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const tokenFamily = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Clean up expired tokens to keep document compact
  user.refreshTokens = user.refreshTokens.filter((t) => t.expiresAt > new Date());

  user.refreshTokens.push({
    tokenHash,
    family: tokenFamily,
    expiresAt,
    isRevoked: false
  });

  await user.save();

  const accessToken = generateAccessToken(user._id);

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken: rawRefreshToken
  };
};

/**
 * Refresh tokens with rotation and reuse detection (FR-010)
 */
const refreshSession = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    throw new AppError('Refresh token is required', 401, 'REFRESH_TOKEN_REQUIRED');
  }

  const tokenHash = hashToken(rawRefreshToken);

  // Find user holding this token hash
  const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash });
  if (!user) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const tokenRecord = user.refreshTokens.find((t) => t.tokenHash === tokenHash);
  if (!tokenRecord) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // REUSE DETECTION (FR-010): If token was already revoked/used, invalidate the whole user's sessions
  if (tokenRecord.isRevoked) {
    console.warn(`[Security Alert] Refresh token reuse detected for user ${user._id}. Revoking all sessions.`);
    user.refreshTokens = [];
    await user.save();
    throw new AppError('Token reuse detected. All active sessions have been revoked. Please log in again.', 401, 'TOKEN_REUSE_DETECTED');
  }

  // Check expiration
  if (new Date() > tokenRecord.expiresAt) {
    user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
    await user.save();
    throw new AppError('Refresh token has expired. Please log in again.', 401, 'EXPIRED_REFRESH_TOKEN');
  }

  // Rotate token: revoke current token and issue new one in same family
  tokenRecord.isRevoked = true;

  const newRawRefreshToken = generateOpaqueRefreshToken();
  const newTokenHash = hashToken(newRawRefreshToken);
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  user.refreshTokens.push({
    tokenHash: newTokenHash,
    family: tokenRecord.family,
    expiresAt: newExpiresAt,
    isRevoked: false
  });

  // Prune old revoked tokens older than 14 days
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  user.refreshTokens = user.refreshTokens.filter(
    (t) => !(t.isRevoked && t.createdAt < twoWeeksAgo)
  );

  await user.save();

  const newAccessToken = generateAccessToken(user._id);

  return {
    user: user.toSafeObject(),
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken
  };
};

/**
 * Logout user by revoking refresh token (FR-011)
 */
const logoutUser = async (userId, rawRefreshToken) => {
  if (!rawRefreshToken && !userId) {
    return;
  }

  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    await User.updateOne(
      { 'refreshTokens.tokenHash': tokenHash },
      { $pull: { refreshTokens: { tokenHash } } }
    );
  }
};

/**
 * Request password reset link (FR-014, FR-016)
 * Generic response always returned to prevent email enumeration.
 */
const forgotPassword = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (user) {
    const resetToken = user.createPasswordResetToken();
    await user.save();

    const resetLink = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

    // FR-016 & NFR-SEC-12: In local development, print to console; in production/test, never leak tokens to logs
    if (env.NODE_ENV === 'development') {
      console.log(`\n======================================================`);
      console.log(`[AUTH] Password Reset Request for: ${user.email}`);
      console.log(`[AUTH] Reset Token: ${resetToken}`);
      console.log(`[AUTH] Reset Link: ${resetLink}`);
      console.log(`======================================================\n`);
    }
  }

  return {
    message: 'If an account exists with this email address, password reset instructions have been generated.'
  };
};

/**
 * Reset password using single-use hashed token (FR-015)
 */
const resetPassword = async (token, newPassword) => {
  if (!token) {
    throw new AppError('Password reset token is required', 400, 'INVALID_RESET_TOKEN');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() }
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    throw new AppError('Password reset token is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
  }

  // Update password with new bcrypt hash (FR-004)
  user.passwordHash = await User.hashPassword(newPassword);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;

  // Revoke all refresh tokens for this user on password reset (FR-015)
  user.refreshTokens = [];

  await user.save();

  return {
    message: 'Password reset successful. Please log in with your new password.'
  };
};

/**
 * Change password when authenticated (FR-116)
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
  }

  user.passwordHash = await User.hashPassword(newPassword);

  // Revoke all other refresh tokens (FR-116)
  user.refreshTokens = [];

  // Issue new session tokens for current device
  const rawRefreshToken = generateOpaqueRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const tokenFamily = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  user.refreshTokens.push({
    tokenHash,
    family: tokenFamily,
    expiresAt,
    isRevoked: false
  });

  await user.save();

  const accessToken = generateAccessToken(user._id);

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken: rawRefreshToken
  };
};

module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  forgotPassword,
  resetPassword,
  changePassword
};
