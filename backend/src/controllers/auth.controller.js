const authService = require('../services/auth.service');
const { getRefreshTokenCookieOptions, getClearRefreshTokenCookieOptions } = require('../services/token.service');
const { success, created } = require('../utils/apiResponse');

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.registerUser(req.body);

    // Set HttpOnly refresh token cookie (FR-010)
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return created(res, { user, accessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.loginUser(email, password);

    // Set HttpOnly refresh token cookie (FR-010)
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return success(res, { user, accessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using HttpOnly cookie (FR-010, FR-012)
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const { user, accessToken, refreshToken } = await authService.refreshSession(rawRefreshToken);

    // Set rotated refresh token cookie
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return success(res, { user, accessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    await authService.logoutUser(req.user?.id, rawRefreshToken);

    // Clear refresh cookie
    res.clearCookie('refreshToken', getClearRefreshTokenCookieOptions());

    return success(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    return success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const token = req.query.token || req.body.token;
    const result = await authService.resetPassword(token, req.body.password);
    return success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Change password when authenticated
 * POST /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { user, accessToken, refreshToken } = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );

    // Rotate refresh token cookie
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return success(res, {
      user,
      accessToken,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword
};
