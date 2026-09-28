const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { listNotificationsQuerySchema } = require('../validators/notification.validator');

const router = express.Router();

// All notification endpoints require authentication (FR-013, FR-149)
router.use(requireAuth);

router.get('/', validate(listNotificationsQuerySchema, 'query'), notificationController.list);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', notificationController.markRead);
router.patch('/:id/unread', notificationController.markUnread);
router.post('/mark-all-read', notificationController.markAllRead);
router.delete('/:id', notificationController.delete);

module.exports = router;
