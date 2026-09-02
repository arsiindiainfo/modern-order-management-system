import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '../features/auth/api/authService';
import type { AuthUser } from '../features/auth/types';
import { performSilentRefresh } from '../lib/apiClient';
import {
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '../lib/tokenStore';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // A page reload loses the in-memory access token but not the
  // localStorage-persisted refresh token — restore the session from it
  // before rendering any protected route. Goes through the same
  // single-flight performSilentRefresh() the 401-retry interceptor uses —
  // calling authService.refresh() directly here would let React
  // StrictMode's double-invoked effect fire two concurrent rotations of
  // the same refresh token, and the second would look like a replay
  // attack to the backend's reuse-detection, revoking the whole session.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }
      const accessToken = await performSilentRefresh();
      if (!accessToken) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const currentUser = await authService.me();
        if (!cancelled) setUser(currentUser);
      } catch {
        setAccessToken(null);
        setRefreshToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, recaptchaToken?: string) => {
      const result = await authService.login({ email, password, recaptchaToken });
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Best-effort — the client-side state is cleared regardless.
      }
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
