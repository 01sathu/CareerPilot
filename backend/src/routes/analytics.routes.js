const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { analyticsOverviewQuerySchema } = require('../validators/analytics.validator');

const router = express.Router();

// All analytics routes require authentication (FR-013, FR-149)
router.use(requireAuth);

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Fetch career analytics overview (counts, funnels, trends, progress summary)
 * @access  Private (Authenticated User)
 */
router.get(
  '/overview',
  validate(analyticsOverviewQuerySchema, 'query'),
  analyticsController.getOverview
);

module.exports = router;
