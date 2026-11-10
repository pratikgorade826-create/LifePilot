import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lifepilot_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor for 401 response handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        localStorage.removeItem('lifepilot_token');
        localStorage.removeItem('lifepilot_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
  classify: (text) => api.post('/ai/classify', { text }),
  getConversations: () => api.get('/ai/conversations'),
  getMessages: (id) => api.get(`/ai/conversations/${id}/messages`),
  deleteConversation: (id) => api.delete(`/ai/conversations/${id}`),
  approveAction: (data) => api.post('/ai/action/approve', data)
};

export const tripsAPI = {
  generate: (data) => api.post('/trips/generate', data),
  create: (data) => api.post('/trips', data),
  getAll: () => api.get('/trips'),
  getOne: (id) => api.get(`/trips/${id}`),
  update: (id, data) => api.put(`/trips/${id}`, data),
  delete: (id) => api.delete(`/trips/${id}`),
  getReport: (id) => api.get(`/trips/${id}/report`),
  checkFeasibility: (id) => api.post(`/trips/${id}/feasibility`),
  applyFeasibilityFix: (id, data) => api.post(`/trips/${id}/feasibility/apply`, data),
  getRoutes: (id) => api.get(`/trips/${id}/routes`),
  optimizeRoute: (id, data) => api.post(`/trips/${id}/routes/optimize`, data),
  modifyLocation: (id, data) => api.put(`/trips/${id}/activities/location`, data),
  assistantCommand: (id, command) => api.post(`/trips/${id}/assistant/command`, { command }),
  assistantApply: (id, proposedChanges) => api.post(`/trips/${id}/assistant/apply`, { proposedChanges }),
  addExpense: (id, data) => api.post(`/trips/${id}/expenses`, data),
  getExpenses: (id) => api.get(`/trips/${id}/expenses`),
  updateExpense: (id, expenseId, data) => api.put(`/trips/${id}/expenses/${expenseId}`, data),
  deleteExpense: (id, expenseId) => api.delete(`/trips/${id}/expenses/${expenseId}`)
};

export const projectsAPI = {
  generate: (data) => api.post('/projects/generate', data),
  create: (data) => api.post('/projects', data),
  getAll: () => api.get('/projects'),
  getOne: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  askAssistant: (id, question) => api.post(`/projects/${id}/query`, { question })
};

export const tasksAPI = {
  create: (data) => api.post('/tasks', data),
  getAll: (params) => api.get('/tasks', { params }),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`)
};

export const documentsAPI = {
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (search = '') => api.get(search ? `/documents?search=${encodeURIComponent(search)}` : '/documents'),
  getOne: (id) => api.get(`/documents/${id}`),
  searchAll: (q) => api.get(`/documents/search?q=${encodeURIComponent(q)}`),
  summarize: (id) => api.post(`/documents/${id}/summarize`),
  ask: (id, question, history = []) => api.post(`/documents/${id}/ask`, { question, history }),
  multiAsk: (documentIds, question) => api.post('/documents/multi-ask', { documentIds, question }),
  compare: (documentIds) => api.post('/documents/compare', { documentIds }),
  generateStudy: (id, type = 'all') => api.post(`/documents/${id}/study/generate`, { type }),
  evaluateAnswer: (id, question, modelAnswer, userAnswer) => api.post(`/documents/${id}/study/evaluate`, { question, modelAnswer, userAnswer }),
  getResearchAnalysis: (id, refresh = false) => api.get(`/documents/${id}/research-analysis${refresh ? '?refresh=true' : ''}`),
  getKnowledgeGraph: (id, refresh = false) => api.get(`/documents/${id}/knowledge-graph${refresh ? '?refresh=true' : ''}`),
  convertAction: (id, actionIndex) => api.post(`/documents/${id}/convert-action`, { actionIndex }),
  convertAllActions: (id) => api.post(`/documents/${id}/convert-all-actions`),
  convertProject: (id, payload = {}) => api.post(`/documents/${id}/convert-project`, payload),
  delete: (id) => api.delete(`/documents/${id}`)
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity')
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/mark-all-read')
};

export default api;

