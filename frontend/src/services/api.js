import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Authentication API
 */
export const authAPI = {
  /**
   * Login with API key or client credentials
   * @param {Object} credentials - { authType: 'apikey' | 'token', apiKey?, clientId?, clientSecret? }
   */
  login: async (credentials) => {
    const response = await api.post('/login', credentials);
    return response.data;
  },

  /**
   * Logout
   */
  logout: async () => {
    const response = await api.post('/logout');
    return response.data;
  },

  /**
   * Check authentication status
   */
  checkAuth: async () => {
    const response = await api.get('/auth/check');
    return response.data;
  }
};

/**
 * Image Generation API
 */
export const imageAPI = {
  /**
   * Generate image from prompt
   * @param {Object} params - { prompt, scale?, source_image?, webhookUrl? }
   */
  generate: async (params) => {
    const response = await api.post('/generate', params);
    return response.data;
  },

  /**
   * Create variant or upscale
   * @param {Object} params - { _id, button, webhookUrl? }
   */
  createVariant: async (params) => {
    const response = await api.post('/variant', params);
    return response.data;
  },

  /**
   * Get image status
   * @param {string} imageModelId - The image model ID
   */
  getStatus: async (imageModelId) => {
    const response = await api.get(`/status/${imageModelId}`);
    return response.data;
  }
};

export default api;

