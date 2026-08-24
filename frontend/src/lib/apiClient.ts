import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from './tokenStore';

export interface AppApiError {
  statusCode: number;
  code: string;
  message: string;
  traceId: string;
  fields?: { field: string; message: string }[];
}

interface ErrorEnvelope {
  success: false;
  error: AppApiError;
}

interface RetryableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

// Endpoints that must never trigger the silent-refresh-and-retry dance —
// a wrong password on /login is INVALID_CREDENTIALS, not a stale-token
// problem, and retrying /refresh itself would recurse.
const REFRESH_EXEMPT_PATHS = ['/auth/login', '/auth/refresh'];

export const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function performSilentRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post<{
      data: { accessToken: string; refreshToken: string };
    }>(`${baseURL}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    setAccessToken(accessToken);
    setRefreshToken(newRefreshToken);
    return accessToken;
  } catch {
    setAccessToken(null);
    setRefreshToken(null);
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorEnvelope>) => {
    const original = error.config as RetryableConfig | undefined;
    const isExempt = REFRESH_EXEMPT_PATHS.some((path) =>
      original?.url?.includes(path),
    );

    if (error.response?.status === 401 && original && !original._retry && !isExempt) {
      original._retry = true;
      refreshPromise ??= performSilentRefresh().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return apiClient(original);
      }
    }

    const normalized: AppApiError = error.response?.data?.error ?? {
      statusCode: error.response?.status ?? 0,
      code: 'INTERNAL_ERROR',
      message: error.message || 'Network error. Please try again.',
      traceId: '',
    };
    return Promise.reject(normalized);
  },
);
