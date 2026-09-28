import api from './api';

export const interviewSessionService = {
  /**
   * Create new AI interview session (FR-068, FR-070)
   */
  createSession: async (data) => {
    const res = await api.post('/interview-sessions', data);
    return res.data?.data?.session;
  },

  /**
   * List paginated interview sessions (FR-078)
   */
  getSessions: async (params = {}) => {
    const res = await api.get('/interview-sessions', { params });
    return {
      sessions: res.data?.data?.sessions || [],
      meta: res.data?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 }
    };
  },

  /**
   * Get single interview session details (FR-078)
   */
  getSession: async (id) => {
    const res = await api.get(`/interview-sessions/${id}`);
    return res.data?.data?.session;
  },

  /**
   * Save user answer, skipped state, revisit flag, or current question index (FR-072, FR-073, FR-079)
   */
  saveAnswer: async (sessionId, questionId, data) => {
    const res = await api.patch(`/interview-sessions/${sessionId}/questions/${questionId}/answer`, data);
    return res.data?.data;
  },

  /**
   * Request sample/example answer for a question (FR-071)
   */
  getExampleAnswer: async (sessionId, questionId) => {
    const res = await api.post(`/interview-sessions/${sessionId}/questions/${questionId}/example-answer`);
    return res.data?.data;
  },

  /**
   * Request structured AI feedback for an answer (FR-074, FR-075)
   */
  evaluateAnswer: async (sessionId, questionId, userAnswer) => {
    const res = await api.post(`/interview-sessions/${sessionId}/questions/${questionId}/feedback`, {
      userAnswer
    });
    return res.data?.data;
  },

  /**
   * Complete mock or practice session and compute summary (FR-077)
   */
  completeSession: async (sessionId) => {
    const res = await api.post(`/interview-sessions/${sessionId}/complete`);
    return res.data?.data?.session;
  },

  /**
   * Delete interview session (FR-078)
   */
  deleteSession: async (id) => {
    const res = await api.delete(`/interview-sessions/${id}`);
    return res.data;
  }
};

export default interviewSessionService;
