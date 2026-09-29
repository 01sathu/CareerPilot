const resumeService = require('../services/resume.service');
const { success, created } = require('../utils/apiResponse');

/**
 * Upload a new PDF resume
 * POST /api/v1/resumes
 */
const upload = async (req, res, next) => {
  try {
    const resume = await resumeService.uploadResume(req.user.id, req.file);
    return created(res, { resume }, 'Resume uploaded and processed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * List all user resumes (metadata only)
 * GET /api/v1/resumes
 */
const list = async (req, res, next) => {
  try {
    const resumes = await resumeService.listResumes(req.user.id);
    return success(res, resumes);
  } catch (error) {
    next(error);
  }
};

/**
 * Get resume by ID with extracted text and analyses
 * GET /api/v1/resumes/:id
 */
const getById = async (req, res, next) => {
  try {
    const resume = await resumeService.getResumeById(req.user.id, req.params.id);
    return success(res, { resume });
  } catch (error) {
    next(error);
  }
};

/**
 * Get 5-minute signed download token/link
 * GET /api/v1/resumes/:id/download-token
 */
const getDownloadToken = async (req, res, next) => {
  try {
    const result = await resumeService.getDownloadToken(req.user.id, req.params.id);
    return success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Stream/download original PDF using signed token
 * GET /api/v1/resumes/:id/download?token=...
 */
const download = async (req, res, next) => {
  try {
    const token = req.query.token;
    const { buffer, filename } = await resumeService.getResumeFileForDownload(
      req.user.id,
      req.params.id,
      token
    );

    const safeFilename = (filename || 'resume.pdf')
      .replace(/["\r\n\\]/g, '_')
      .replace(/[^a-zA-Z0-9._ -]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete resume and associated file & analyses
 * DELETE /api/v1/resumes/:id
 */
const remove = async (req, res, next) => {
  try {
    await resumeService.deleteResume(req.user.id, req.params.id);
    return success(res, { message: 'Resume deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Run general resume analysis
 * POST /api/v1/resumes/:id/analyze
 */
const analyze = async (req, res, next) => {
  try {
    const result = await resumeService.analyzeGeneralResume(req.user.id, req.params.id);
    return created(res, result, 'General resume analysis completed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Run job match analysis
 * POST /api/v1/resumes/:id/match
 */
const match = async (req, res, next) => {
  try {
    const result = await resumeService.matchResumeWithJob(
      req.user.id,
      req.params.id,
      req.body
    );
    return created(res, result, 'Job match analysis completed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific embedded analysis record
 * DELETE /api/v1/resumes/:id/analyses/:analysisId
 */
const removeAnalysis = async (req, res, next) => {
  try {
    await resumeService.deleteAnalysis(
      req.user.id,
      req.params.id,
      req.params.analysisId
    );
    return success(res, { message: 'Analysis deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  list,
  getById,
  getDownloadToken,
  download,
  remove,
  analyze,
  match,
  removeAnalysis
};
