const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3001/api';

// AuthProvider installs a getter that returns a fresh Clerk session token.
// Module-scope so non-component callers (background tasks) can use it too.
type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;

export function setTokenGetter(fn: TokenGetter | null) {
  tokenGetter = fn;
}

// Backwards-compatible helper used by world-id-verify to embed the token in a
// URL for the SFSafariViewController bridge. With Clerk this returns the
// short-lived session JWT; the backend's verifyClerkSessionToken accepts it.
export async function getToken(): Promise<string | null> {
  return tokenGetter ? tokenGetter() : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: any) =>
    request<T>(path, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
};
