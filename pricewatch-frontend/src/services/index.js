import api from './api.js';

const d = (p) => p.then((r) => r.data);
export const authService = {
  register: (b) => d(api.post('/auth/register', b)).then((r) => r.data),
  login: (b) => d(api.post('/auth/login', b)).then((r) => r.data),
  me: () => d(api.get('/auth/me')).then((r) => r.data),
  logout: () => api.post('/auth/logout').catch(() => {}),
};
export const monitoringService = {
  list: (params) => d(api.get('/monitoring', { params })),
  get: (id) => d(api.get(`/monitoring/${id}`)).then((r) => r.data),
  create: (b) => d(api.post('/monitoring', b)).then((r) => r.data),
  update: (id, b) => d(api.put(`/monitoring/${id}`, b)).then((r) => r.data),
  remove: (id) => api.delete(`/monitoring/${id}`),
  action: (id, a) => d(api.post(`/monitoring/${id}/${a}`)).then((r) => r.data),
  history: (id, params) => d(api.get(`/monitoring/${id}/history`, { params })),
  statistics: (id) => d(api.get(`/monitoring/${id}/statistics`)).then((r) => r.data),
  executions: (id, params) => d(api.get(`/monitoring/${id}/executions`, { params })),
};
export const dashboardService = { summary: () => d(api.get('/dashboard/summary')).then((r) => r.data) };
export const notificationService = {
  list: (params) => d(api.get('/notifications', { params })),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};
