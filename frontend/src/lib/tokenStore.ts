const REFRESH_TOKEN_KEY = 'oms.refreshToken';

// Access token lives only in memory — never persisted — so it's gone on a
// hard reload; AuthProvider re-derives it via a silent refresh on mount.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // Private browsing / storage disabled — the session just won't
    // survive a reload, which is a reasonable degradation.
  }
}
