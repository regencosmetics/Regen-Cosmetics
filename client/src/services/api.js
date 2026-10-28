import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
export const api = axios.create({ baseURL: API_BASE, withCredentials: true, timeout: 30000 });

let csrfToken = null;
let csrfPromise = null;
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => { unauthorizedHandler = fn; };

async function ensureCsrf(force = false) {
  if (csrfToken && !force) return csrfToken;
  csrfPromise ||= axios.get(`${API_BASE}/auth/csrf`, { withCredentials: true }).then((r) => { csrfToken = r.data.data.csrfToken; return csrfToken; }).finally(() => { csrfPromise = null; });
  return csrfPromise;
}

api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) config.headers['X-CSRF-Token'] = await ensureCsrf();
  return config;
});

api.interceptors.response.use((r) => r, async (error) => {
  const { response, config } = error;
  if (response?.data?.code === 'CSRF_INVALID' && !config._retried) {
    config._retried = true; config.headers['X-CSRF-Token'] = await ensureCsrf(true);
    return api(config);
  }
  if (response?.status === 401 && unauthorizedHandler && !config.url.includes('/auth/')) unauthorizedHandler();
  return Promise.reject(error);
});

export const resetCsrf = () => { csrfToken = null; };
export const unwrap = (p) => p.then((r) => r.data.data);
export const errorMessage = (e, fallback = 'Something went wrong. Please try again.') => {
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (e?.message === 'Network Error') return 'Cannot reach the server. Check your connection.';
  return fallback;
};
export const errorCode = (e) => e?.response?.data?.code;
