const express = require('express');
const multer = require('multer');
const resumeController = require('../controllers/resume.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAiConsent } = require('../middleware/aiConsent.middleware');
const { resumeAiRateLimiter } = require('../middleware/aiRateLimiter.middleware');
const validate = require('../middleware/validate.middleware');
const { jobMatchRequestSchema } = require('../validators/resume.validator');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB (FR-046)
  }
});

const router = express.Router();

// All resume endpoints require authentication (FR-013, FR-149)
router.use(requireAuth);

// 1. Resume CRUD & Download
router.post('/', upload.single('resume'), resumeController.upload);
router.get('/', resumeController.list);
router.get('/:id', resumeController.getById);
router.get('/:id/download-token', resumeController.getDownloadToken);
router.get('/:id/download', resumeController.download);
router.delete('/:id', resumeController.remove);

// 2. AI Analysis endpoints (requires AI Consent & Rate Limiting, FR-063, FR-064)
router.post(
  '/:id/analyze',
  requireAiConsent,
  resumeAiRateLimiter,
  resumeController.analyze
);

router.post(
  '/:id/match',
  requireAiConsent,
  resumeAiRateLimiter,
  validate(jobMatchRequestSchema),
  resumeController.match
);

// 3. Delete specific analysis
router.delete('/:id/analyses/:analysisId', resumeController.removeAnalysis);

module.exports = router;
