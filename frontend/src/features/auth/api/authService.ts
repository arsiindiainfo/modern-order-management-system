import { apiClient } from '../../../lib/apiClient';
import type { AuthUser, LoginRequest, LoginResponse, TokenPair } from '../types';

interface Envelope<T> {
  success: true;
  data: T;
}

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await apiClient.post<Envelope<LoginResponse>>(
      '/auth/login',
      payload,
    );
    return data.data;
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    const { data } = await apiClient.post<Envelope<TokenPair>>(
      '/auth/refresh',
      { refreshToken },
    );
    return data.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<Envelope<AuthUser>>('/auth/me');
    return data.data;
  },
};
