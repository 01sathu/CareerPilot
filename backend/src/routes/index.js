const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const applicationRoutes = require('./application.routes');
const analyticsRoutes = require('./analytics.routes');
const resumeRoutes = require('./resume.routes');
const interviewRoutes = require('./interview.routes');
const notificationRoutes = require('./notification.routes');
const interviewSessionRoutes = require('./interviewSession.routes');

const router = express.Router();

// Mount API Endpoints (FR-125)
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/applications', applicationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/resumes', resumeRoutes);
router.use('/interviews', interviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/interview-sessions', interviewSessionRoutes);

module.exports = router;
