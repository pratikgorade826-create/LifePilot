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
  getReport: (id) => api.get(`/trips/${id}/report`)
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
  getAll: () => api.get('/documents'),
  getOne: (id) => api.get(`/documents/${id}`),
  summarize: (id) => api.post(`/documents/${id}/summarize`),
  ask: (id, question) => api.post(`/documents/${id}/ask`, { question }),
  convertAction: (id, actionIndex) => api.post(`/documents/${id}/convert-action`, { actionIndex }),
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

