import api from './api';

/**
 * Analytics API Service
 * Fetches aggregated metrics, conversion funnels, and trend data
 */
export const analyticsService = {
  /**
   * Get career analytics overview
   * @param {Object} params - Query params (range, timezone)
   * @returns {Promise<Object>} API response data
   */
  getOverview: async (params = {}) => {
    const res = await api.get('/analytics/overview', { params });
    return res.data?.data;
  }
};

export default analyticsService;
