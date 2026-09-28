import api from './api';

export const resumeService = {
  /**
   * Upload PDF resume (FR-046)
   */
  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    const res = await api.post('/resumes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data?.data?.resume;
  },

  /**
   * List all user resumes (metadata only, FR-051)
   */
  listResumes: async () => {
    const res = await api.get('/resumes');
    return res.data?.data || [];
  },

  /**
   * Get single resume with extracted text and analyses
   */
  getResume: async (id) => {
    const res = await api.get(`/resumes/${id}`);
    return res.data?.data?.resume;
  },

  /**
   * Get 5-minute signed download URL (FR-052)
   */
  getDownloadToken: async (id) => {
    const res = await api.get(`/resumes/${id}/download-token`);
    return res.data?.data;
  },

  /**
   * Delete resume, file, and analyses (FR-053)
   */
  deleteResume: async (id) => {
    const res = await api.delete(`/resumes/${id}`);
    return res.data;
  },

  /**
   * Run general AI resume analysis (FR-054)
   */
  analyzeResume: async (id) => {
    const res = await api.post(`/resumes/${id}/analyze`);
    return res.data?.data;
  },

  /**
   * Run job match analysis (FR-055 - FR-058)
   */
  matchResume: async (id, payload) => {
    const res = await api.post(`/resumes/${id}/match`, payload);
    return res.data?.data;
  },

  /**
   * Delete specific analysis record (FR-062)
   */
  deleteAnalysis: async (id, analysisId) => {
    const res = await api.delete(`/resumes/${id}/analyses/${analysisId}`);
    return res.data;
  },

  /**
   * Record AI consent acknowledgement (FR-063)
   */
  acceptAiConsent: async () => {
    const res = await api.post('/users/ai-consent');
    return res.data?.data?.user;
  }
};

export default resumeService;
