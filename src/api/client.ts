import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://oasiserp.mn/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // A failed login attempt is a normal error, not an expired session, so
      // it must not tear down the auth state.
      const isLoginRequest = error.config?.url?.includes('/auth/login');

      if (!isLoginRequest) {
        // Token expired or invalid - clear storage and reset the auth state.
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('user');
        // The AuthProvider registers a handler here so the in-memory session
        // is dropped too. Without it the app stays on the authenticated
        // screens while every request fails with 401.
        notifyUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Called when the server rejects the stored token. The AuthProvider registers
 * a handler so React state is cleared and the router can redirect to login.
 */
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function notifyUnauthorized() {
  if (unauthorizedHandler) {
    unauthorizedHandler();
  }
}

export default api;
export { API_BASE_URL, api };
