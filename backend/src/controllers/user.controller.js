const userService = require('../services/user.service');
const { getClearRefreshTokenCookieOptions } = require('../services/token.service');
const { success } = require('../utils/apiResponse');

/**
 * Get current authenticated user profile
 * GET /api/v1/users/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user.id);
    return success(res, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current authenticated user profile
 * PATCH /api/v1/users/me
 */
const updateMe = async (req, res, next) => {
  try {
    const user = await userService.updateUserProfile(req.user.id, req.body);
    return success(res, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Record user AI consent
 * POST /api/v1/users/ai-consent
 */
const acceptAiConsent = async (req, res, next) => {
  try {
    const user = await userService.acceptAiConsent(req.user.id);
    return success(res, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently delete user account and all associated data (FR-121, FR-122, FR-123)
 * DELETE /api/v1/users/me
 */
const deleteMe = async (req, res, next) => {
  try {
    const { password, confirmation } = req.body;
    const result = await userService.deleteUserAccount(req.user.id, password, confirmation);

    // Clear refresh token cookie so session terminates immediately (FR-123)
    res.clearCookie('refreshToken', getClearRefreshTokenCookieOptions());

    return success(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
  acceptAiConsent,
  deleteMe
};
