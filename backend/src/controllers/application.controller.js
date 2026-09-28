const applicationService = require('../services/application.service');
const { success, created } = require('../utils/apiResponse');

/**
 * Create a new application
 * POST /api/v1/applications
 */
const create = async (req, res, next) => {
  try {
    const application = await applicationService.createApplication(req.user.id, req.body);
    return created(res, { application });
  } catch (error) {
    next(error);
  }
};

/**
 * List applications with search, filters, pagination, and sorting
 * GET /api/v1/applications
 */
const list = async (req, res, next) => {
  try {
    const { applications, meta } = await applicationService.listApplications(
      req.user.id,
      req.query
    );
    return success(res, applications, 200, meta);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single application details with status history timeline
 * GET /api/v1/applications/:id
 */
const getById = async (req, res, next) => {
  try {
    const { application, history } = await applicationService.getApplicationById(
      req.user.id,
      req.params.id
    );
    return success(res, { application, history });
  } catch (error) {
    next(error);
  }
};

/**
 * Update application fields or status
 * PATCH /api/v1/applications/:id
 */
const update = async (req, res, next) => {
  try {
    const application = await applicationService.updateApplication(
      req.user.id,
      req.params.id,
      req.body
    );
    return success(res, { application });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an application
 * DELETE /api/v1/applications/:id
 */
const remove = async (req, res, next) => {
  try {
    await applicationService.deleteApplication(req.user.id, req.params.id);
    return success(res, { message: 'Application deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Export applications as CSV (FR-117, FR-119, FR-120, FR-125)
 * GET /api/v1/applications/export/csv
 */
const exportCsv = async (req, res, next) => {
  try {
    const csvContent = await applicationService.exportApplicationsCsv(req.user.id, req.query);
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="careerpilot-applications-${dateStr}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Export application status history as CSV (FR-118, FR-119, FR-125)
 * GET /api/v1/applications/export/history-csv
 */
const exportHistoryCsv = async (req, res, next) => {
  try {
    const csvContent = await applicationService.exportHistoryCsv(req.user.id);
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="careerpilot-history-${dateStr}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  exportCsv,
  exportHistoryCsv
};

