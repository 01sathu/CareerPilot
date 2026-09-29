const AppError = require('../utils/appError');
const User = require('../models/User');

/**
 * Middleware: Verify user has accepted third-party AI data disclosure (FR-063)
 * Returns HTTP 403 AI_CONSENT_REQUIRED if not accepted
 */
const requireAiConsent = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const user = await User.findById(req.user.id).select('aiConsentAcceptedAt');
    if (!user || !user.aiConsentAcceptedAt) {
      throw new AppError(
        'You must acknowledge and accept the third-party AI processing disclosure before using AI features.',
        403,
        'AI_CONSENT_REQUIRED'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireAiConsent
};
