import api from './api';

export const calendarService = {
  /**
   * List interview events with date range and status filters (FR-095)
   */
  getInterviews: async (params = {}) => {
    const res = await api.get('/interviews', { params });
    return res.data?.data?.interviews || [];
  },

  /**
   * Get upcoming events scheduled within next 30 days (FR-094)
   */
  getUpcomingInterviews: async () => {
    const res = await api.get('/interviews/upcoming');
    return res.data?.data?.interviews || [];
  },

  /**
   * Get single interview event by ID
   */
  getInterview: async (id) => {
    const res = await api.get(`/interviews/${id}`);
    return res.data?.data?.interview;
  },

  /**
   * Create interview event (FR-089)
   */
  createInterview: async (data) => {
    const res = await api.post('/interviews', data);
    return res.data?.data;
  },

  /**
   * Update or reschedule interview event (FR-092)
   */
  updateInterview: async (id, data) => {
    const res = await api.patch(`/interviews/${id}`, data);
    return res.data?.data;
  },

  /**
   * Delete interview event (FR-092)
   */
  deleteInterview: async (id) => {
    const res = await api.delete(`/interviews/${id}`);
    return res.data;
  },

  /**
   * Download .ics iCalendar file (FR-103)
   */
  downloadIcs: async (id) => {
    const res = await api.get(`/interviews/${id}/ics`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/calendar' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `interview-${id}.ics`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default calendarService;
