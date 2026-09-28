const interviewSessionService = require('../services/interviewSession.service');
const ApiResponse = require('../utils/apiResponse');

class InterviewSessionController {
  /**
   * POST /api/v1/interview-sessions - Generate new interview prep session (FR-068, FR-070)
   */
  async create(req, res, next) {
    try {
      const session = await interviewSessionService.createSession(req.user.id, req.body);
      return ApiResponse.created(res, { session });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/interview-sessions - List user's sessions (FR-078)
   */
  async list(req, res, next) {
    try {
      const result = await interviewSessionService.listSessions(req.user.id, req.query);
      return ApiResponse.success(res, { sessions: result.sessions }, 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/interview-sessions/:id - Get session details (FR-078)
   */
  async getById(req, res, next) {
    try {
      const session = await interviewSessionService.getSessionById(req.user.id, req.params.id);
      return ApiResponse.success(res, { session });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/interview-sessions/:id/questions/:questionId/answer - Save answer, skip, or bookmark (FR-072, FR-079)
   */
  async saveAnswer(req, res, next) {
    try {
      const result = await interviewSessionService.saveAnswer(
        req.user.id,
        req.params.id,
        req.params.questionId,
        req.body
      );
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/interview-sessions/:id/questions/:questionId/example-answer - Get AI sample answer (FR-071)
   */
  async getExampleAnswer(req, res, next) {
    try {
      const result = await interviewSessionService.getExampleAnswer(
        req.user.id,
        req.params.id,
        req.params.questionId
      );
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/interview-sessions/:id/questions/:questionId/feedback - Request AI answer evaluation (FR-074, FR-075)
   */
  async evaluateAnswer(req, res, next) {
    try {
      const result = await interviewSessionService.evaluateAnswer(
        req.user.id,
        req.params.id,
        req.params.questionId,
        req.body.userAnswer
      );
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/interview-sessions/:id/complete - Complete session and compute summary (FR-077)
   */
  async complete(req, res, next) {
    try {
      const session = await interviewSessionService.completeSession(req.user.id, req.params.id);
      return ApiResponse.success(res, { session });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/interview-sessions/:id - Delete session (FR-078)
   */
  async remove(req, res, next) {
    try {
      const result = await interviewSessionService.deleteSession(req.user.id, req.params.id);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InterviewSessionController();
