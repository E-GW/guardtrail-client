import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use(async config => {
  try {
    const session = await fetchAuthSession();
    const token = session?.tokens?.accessToken?.toString();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      localStorage.setItem('guardtrail_token', token);
    }
  } catch {
    const token = localStorage.getItem('guardtrail_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const getReports = (params = {}) =>
  api.get('/api/reports', { params });

export const getReport = (id) =>
  api.get(`/api/reports/${id}`);

export const createReport = (data) =>
  api.post('/api/reports', data);

export const updateReport = (id, data) =>
  api.put(`/api/reports/${id}`, data);

export const deleteReport = (id) =>
  api.delete(`/api/reports/${id}`);

export default api;