import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({ baseURL: BASE });

// Attach JWT token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('at_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auto-logout on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('at_token');
      localStorage.removeItem('at_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  register: (email, password, name) =>
    api.post('/api/auth/register', { email, password, name }).then(r => r.data),
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }).then(r => r.data),
  me: () => api.get('/api/auth/me').then(r => r.data),
};

// ── Channels ──────────────────────────────────────────
export const channelsAPI = {
  list: () => api.get('/api/channels').then(r => r.data),
  get: id => api.get(`/api/channels/${id}`).then(r => r.data),
  create: data => api.post('/api/channels', data).then(r => r.data),
  update: (id, data) => api.patch(`/api/channels/${id}`, data).then(r => r.data),
  delete: id => api.delete(`/api/channels/${id}`).then(r => r.data),
};

// ── Integrations (API Keys) ────────────────────────────
export const integrationsAPI = {
  get: () => api.get('/api/integrations').then(r => r.data),
  save: data => api.post('/api/integrations', data).then(r => r.data),
  remove: provider => api.delete(`/api/integrations/${provider}`).then(r => r.data),
};

// ── Pipeline ──────────────────────────────────────────
export const pipelineAPI = {
  run: (channelId, prompt, videoType, voiceProvider) =>
    api.post('/api/pipeline/run', { channelId, prompt, videoType, voiceProvider }).then(r => r.data),
  jobs: () => api.get('/api/pipeline/jobs').then(r => r.data),
  job: id => api.get(`/api/pipeline/jobs/${id}`).then(r => r.data),
  avatars: () => api.get('/api/pipeline/avatars').then(r => r.data),
  voices: () => api.get('/api/pipeline/voices').then(r => r.data),
};

// ── Videos ────────────────────────────────────────────
export const videosAPI = {
  list: channelId => api.get('/api/videos', { params: channelId ? { channelId } : {} }).then(r => r.data),
  get: id => api.get(`/api/videos/${id}`).then(r => r.data),
  delete: id => api.delete(`/api/videos/${id}`).then(r => r.data),
};

// ── WebSocket helper ──────────────────────────────────
export function createPipelineSocket(userId, onMessage) {
  const wsBase = process.env.REACT_APP_WS_URL || `ws://${window.location.host}`;
  const ws = new WebSocket(`${wsBase}/ws?userId=${userId}`);
  ws.onmessage = e => { try { onMessage(JSON.parse(e.data)); } catch {} };
  ws.onerror = e => console.error('WS error', e);
  return ws;
}

export default api;
