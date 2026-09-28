import api from './api';

export const getApplications = async (params = {}) => {
  const res = await api.get('/applications', { params });
  return res.data;
};

export const getApplication = async (id) => {
  const res = await api.get(`/applications/${id}`);
  return res.data.data;
};

export const createApplication = async (data) => {
  const res = await api.post('/applications', data);
  return res.data.data.application;
};

export const updateApplication = async (id, data) => {
  const res = await api.patch(`/applications/${id}`, data);
  return res.data.data.application;
};

export const deleteApplication = async (id) => {
  const res = await api.delete(`/applications/${id}`);
  return res.data;
};
