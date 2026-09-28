const analyticsService = require('../services/analytics.service');
const { success } = require('../utils/apiResponse');

/**
 * Get analytics overview metrics for authenticated user
 * GET /api/v1/analytics/overview
 * Requirements: FR-080, FR-081, FR-082, FR-083, FR-085, FR-086, FR-088, FR-149
 */
const getOverview = async (req, res, next) => {
  try {
    const overviewData = await analyticsService.getOverview(req.user.id, {
      range: req.query.range,
      timezone: req.query.timezone
    });

    return success(res, overviewData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview
};
