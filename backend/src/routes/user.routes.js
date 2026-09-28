const express = require('express');
const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { updateProfileSchema, deleteAccountSchema } = require('../validators/user.validator');

const router = express.Router();

// Protected User Profile Endpoints (SRS FR-017, FR-018, FR-063, FR-121)
router.get('/me', requireAuth, userController.getMe);
router.patch('/me', requireAuth, validate(updateProfileSchema), userController.updateMe);
router.delete('/me', requireAuth, validate(deleteAccountSchema), userController.deleteMe);
router.post('/ai-consent', requireAuth, userController.acceptAiConsent);

module.exports = router;
