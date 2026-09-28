const express = require('express');
const interviewController = require('../controllers/interview.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createInterviewSchema,
  updateInterviewSchema,
  listInterviewsQuerySchema
} = require('../validators/interview.validator');

const router = express.Router();

// All interview endpoints require authentication (FR-013, FR-149)
router.use(requireAuth);

router.post('/', validate(createInterviewSchema, 'body'), interviewController.create);
router.get('/', validate(listInterviewsQuerySchema, 'query'), interviewController.list);
router.get('/upcoming', interviewController.upcoming);
router.get('/:id', interviewController.getById);
router.patch('/:id', validate(updateInterviewSchema, 'body'), interviewController.update);
router.delete('/:id', interviewController.delete);
router.get('/:id/ics', interviewController.exportIcs);

module.exports = router;
