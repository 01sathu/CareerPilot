import api from './api';

export const notificationService = {
  /**
   * List paginated notifications (FR-107)
   */
  getNotifications: async (params = {}) => {
    const res = await api.get('/notifications', { params });
    return {
      notifications: res.data?.data || [],
      meta: res.data?.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }
    };
  },

  /**
   * Get unread notification count (FR-108)
   */
  getUnreadCount: async () => {
    const res = await api.get('/notifications/unread-count');
    return res.data?.data?.unreadCount || 0;
  },

  /**
   * Mark notification as read (FR-109)
   */
  markRead: async (id) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data?.data?.notification;
  },

  /**
   * Mark notification as unread (FR-109)
   */
  markUnread: async (id) => {
    const res = await api.patch(`/notifications/${id}/unread`);
    return res.data?.data?.notification;
  },

  /**
   * Mark all user's notifications as read (FR-109)
   */
  markAllRead: async () => {
    const res = await api.post('/notifications/mark-all-read');
    return res.data?.data;
  },

  /**
   * Delete single notification (FR-109)
   */
  deleteNotification: async (id) => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  }
};

export default notificationService;
