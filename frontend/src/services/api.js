import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods
export const apiService = {
  // Health check
  healthCheck: () => api.get('/health'),

  // Photo management
  uploadPhotos: (files, onProgress) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
  },

  getPhotos: (page = 1, perPage = 20) => 
    api.get(`/photos?page=${page}&per_page=${perPage}`),

  getPhotoImage: (photoId, thumbnail = false) => 
    `${API_BASE_URL}/photos/${photoId}/image${thumbnail ? '?thumbnail=true' : ''}`,

  downloadPhoto: (photoId) => 
    api.get(`/photos/${photoId}/download`, { responseType: 'blob' }),

  deletePhoto: (photoId) => 
    api.delete(`/admin/photos/${photoId}`),

  // Album management
  getAlbums: () => api.get('/albums'),

  getAlbumPhotos: (personId) => 
    api.get(`/albums/${personId}`),

  downloadAlbum: (personId) => 
    api.get(`/albums/${personId}/download`, { responseType: 'blob' }),

  // Person management
  renamePerson: (personId, name) => 
    api.put(`/admin/persons/${personId}/rename`, { name }),

  mergePersons: (personId1, personId2) => 
    api.post('/admin/persons/merge', { 
      person_id_1: personId1, 
      person_id_2: personId2 
    }),

  // Admin
  getStats: () => api.get('/admin/stats'),

  reprocessFaces: () => api.post('/admin/reprocess'),
};

export default api;