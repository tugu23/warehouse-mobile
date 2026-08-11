import api from './client';
import { ApiResponse, LoginRequest, LoginResponse, User } from '../types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<{ token: string; user: User }> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Login failed');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get user');
  },
};
