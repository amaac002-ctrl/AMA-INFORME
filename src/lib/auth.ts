// Lightweight client-side helpers for the session token issued at login.
// The token is verified server-side; it is only stored here to attach to
// requests that hit protected (admin) endpoints.

const TOKEN_KEY = 'token';

export function setToken(token: string | null | undefined) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(base: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return token ? { ...base, Authorization: `Bearer ${token}` } : { ...base };
}
