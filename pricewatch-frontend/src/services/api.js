import axios from 'axios';

export const TOKEN_KEY = 'pricewatch_token';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 20000 });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  const url = err.config?.url || '';
  if (err.response?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/register')) {
    localStorage.removeItem(TOKEN_KEY);
    if (!location.pathname.startsWith('/login')) location.assign('/login');
  }
  return Promise.reject(err);
});

export default api;
