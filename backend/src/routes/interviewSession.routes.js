const express = require('express');
const interviewSessionController = require('../controllers/interviewSession.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAiConsent } = require('../middleware/aiConsent.middleware');
const { interviewAiRateLimiter } = require('../middleware/aiRateLimiter.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createSessionSchema,
  saveAnswerSchema,
  feedbackRequestSchema,
  listSessionsQuerySchema
} = require('../validators/interviewSession.validator');

const router = express.Router();

// All interview prep endpoints require authentication (FR-013, FR-149)
router.use(requireAuth);

// 1. Session CRUD
router.post(
  '/',
  requireAiConsent,
  interviewAiRateLimiter,
  validate(createSessionSchema),
  interviewSessionController.create
);

router.get(
  '/',
  validate(listSessionsQuerySchema, 'query'),
  interviewSessionController.list
);

router.get('/:id', interviewSessionController.getById);

router.delete('/:id', interviewSessionController.remove);

// 2. Answering & Session Progression
router.patch(
  '/:id/questions/:questionId/answer',
  validate(saveAnswerSchema),
  interviewSessionController.saveAnswer
);

router.post(
  '/:id/complete',
  interviewSessionController.complete
);

// 3. AI Sample Answer & Feedback (Requires AI Consent and Rate Limiting, FR-063, FR-064)
router.post(
  '/:id/questions/:questionId/example-answer',
  requireAiConsent,
  interviewAiRateLimiter,
  interviewSessionController.getExampleAnswer
);

router.post(
  '/:id/questions/:questionId/feedback',
  requireAiConsent,
  interviewAiRateLimiter,
  validate(feedbackRequestSchema),
  interviewSessionController.evaluateAnswer
);

module.exports = router;
