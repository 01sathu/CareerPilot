const Notification = require('../models/Notification');
const User = require('../models/User');
const AppError = require('../utils/appError');

class NotificationService {
  /**
   * Create an in-app notification with preference enforcement (FR-105, FR-111)
   */
  async createNotification(userId, {
    type,
    title,
    message,
    relatedEntityType = null,
    relatedEntityId = null,
    metadata = {}
  }) {
    // Check user's notification preferences (FR-111)
    if (type !== 'system') {
      const user = await User.findById(userId).select('notificationPreferences');
      if (user && user.notificationPreferences) {
        const isEnabled = user.notificationPreferences[type];
        // If explicitly set to false, do not create
        if (isEnabled === false) {
          return null;
        }
      }
    }

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      metadata
    });

    return notification;
  }

  /**
   * List paginated notifications (FR-107)
   */
  async listNotifications(userId, { page = 1, limit = 20, isRead }) {
    const filter = { userId };
    if (typeof isRead === 'boolean') {
      filter.isRead = isRead;
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      notifications,
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Get unread notification count (FR-108)
   */
  async getUnreadCount(userId) {
    const count = await Notification.countDocuments({
      userId,
      isRead: false
    });
    return { unreadCount: count };
  }

  /**
   * Mark single notification as read (FR-109)
   */
  async markRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    return notification;
  }

  /**
   * Mark single notification as unread (FR-109)
   */
  async markUnread(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: false, readAt: null },
      { new: true }
    );

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    return notification;
  }

  /**
   * Mark all user's notifications as read (FR-109)
   */
  async markAllRead(userId) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return {
      modifiedCount: result.modifiedCount
    };
  }

  /**
   * Delete a notification (FR-109)
   */
  async deleteNotification(userId, notificationId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    return { success: true };
  }

  /**
   * Remove notifications older than 90 days (FR-112, AC-G-04)
   */
  async cleanExpiredNotifications() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await Notification.deleteMany({
      createdAt: { $lt: ninetyDaysAgo }
    });
    return result.deletedCount;
  }
}

module.exports = new NotificationService();
