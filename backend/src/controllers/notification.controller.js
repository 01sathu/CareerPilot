const notificationService = require('../services/notification.service');
const ApiResponse = require('../utils/apiResponse');

class NotificationController {
  /**
   * GET /api/v1/notifications - List paginated notifications
   */
  async list(req, res, next) {
    try {
      const { page, limit, isRead } = req.query;
      const result = await notificationService.listNotifications(req.user.id, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        isRead
      });

      return ApiResponse.success(res, result.notifications, 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count - Get count of unread notifications
   */
  async getUnreadCount(req, res, next) {
    try {
      const data = await notificationService.getUnreadCount(req.user.id);
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read - Mark notification as read
   */
  async markRead(req, res, next) {
    try {
      const notification = await notificationService.markRead(req.user.id, req.params.id);
      return ApiResponse.success(res, { notification });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/unread - Mark notification as unread
   */
  async markUnread(req, res, next) {
    try {
      const notification = await notificationService.markUnread(req.user.id, req.params.id);
      return ApiResponse.success(res, { notification });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/notifications/mark-all-read - Mark all notifications as read
   */
  async markAllRead(req, res, next) {
    try {
      const result = await notificationService.markAllRead(req.user.id);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/notifications/:id - Delete notification
   */
  async delete(req, res, next) {
    try {
      await notificationService.deleteNotification(req.user.id, req.params.id);
      return ApiResponse.success(res, { success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
