const express = require('express');
const { isConnected } = require('../config/db');
const { success } = require('../utils/apiResponse');

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    System health and diagnostic check (SRS FR-131)
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbStatus = isConnected() ? 'connected' : 'disconnected';

  const healthData = {
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    service: 'CareerPilot API',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus
    },
    timestamp: new Date().toISOString()
  };

  const statusCode = dbStatus === 'connected' ? 200 : 503;
  return success(res, healthData, statusCode);
});

module.exports = router;
