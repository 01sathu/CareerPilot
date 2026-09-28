const express = require('express');
const applicationController = require('../controllers/application.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createApplicationSchema,
  updateApplicationSchema,
  listApplicationsQuerySchema,
  exportApplicationsQuerySchema
} = require('../validators/application.validator');

const router = express.Router();

// All application routes require authentication (FR-013)
router.use(requireAuth);

router.post('/', validate(createApplicationSchema), applicationController.create);
router.get('/', validate(listApplicationsQuerySchema, 'query'), applicationController.list);

// CSV Export routes (FR-117, FR-118, FR-120) - MUST be declared before /:id parameter
router.get('/export/csv', validate(exportApplicationsQuerySchema, 'query'), applicationController.exportCsv);
router.get('/export/history-csv', applicationController.exportHistoryCsv);

router.get('/:id', applicationController.getById);
router.patch('/:id', validate(updateApplicationSchema), applicationController.update);
router.delete('/:id', applicationController.remove);

module.exports = router;

