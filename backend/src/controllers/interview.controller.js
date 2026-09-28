const interviewService = require('../services/interview.service');
const ApiResponse = require('../utils/apiResponse');

class InterviewController {
  /**
   * POST /api/v1/interviews - Create interview event
   */
  async create(req, res, next) {
    try {
      const result = await interviewService.createInterview(req.user.id, req.body);
      return ApiResponse.created(res, {
        interview: result.interview,
        hasOverlap: result.hasOverlap,
        overlappingEvent: result.overlappingEvent
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/interviews - List interview events
   */
  async list(req, res, next) {
    try {
      const interviews = await interviewService.listInterviews(req.user.id, req.query);
      return ApiResponse.success(res, { interviews });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/interviews/upcoming - Get upcoming events in next 30 days
   */
  async upcoming(req, res, next) {
    try {
      const interviews = await interviewService.getUpcomingInterviews(req.user.id);
      return ApiResponse.success(res, { interviews });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/interviews/:id - Get single interview event
   */
  async getById(req, res, next) {
    try {
      const interview = await interviewService.getInterviewById(req.user.id, req.params.id);
      return ApiResponse.success(res, { interview });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/interviews/:id - Update or reschedule interview event
   */
  async update(req, res, next) {
    try {
      const result = await interviewService.updateInterview(
        req.user.id,
        req.params.id,
        req.body
      );
      return ApiResponse.success(res, {
        interview: result.interview,
        hasOverlap: result.hasOverlap,
        overlappingEvent: result.overlappingEvent
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/interviews/:id - Delete interview event
   */
  async delete(req, res, next) {
    try {
      await interviewService.deleteInterview(req.user.id, req.params.id);
      return ApiResponse.success(res, { success: true });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/interviews/:id/ics - Export .ics iCalendar file (FR-103)
   */
  async exportIcs(req, res, next) {
    try {
      const { filename, content } = await interviewService.generateIcs(
        req.user.id,
        req.params.id
      );

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(content);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InterviewController();
