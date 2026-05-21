const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001/api";

// AuthContext installs a getter that returns a fresh Clerk session token.
// Lives at module scope (not in React state) so non-component callers
// (background polling, etc.) can still reach it.
type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;

export function setTokenGetter(fn: TokenGetter | null) {
  tokenGetter = fn;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenGetter ? await tokenGetter() : null;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      data.error || `Request failed: ${res.status}`,
      res.status,
      typeof data.code === "string" ? data.code : undefined
    );
  }

  return res.json();
}

// Thrown by `request` for any non-2xx response. Carries the HTTP `status` and
// (when the backend returns one) a machine-readable `code` so callers can
// branch on specific failure modes — e.g. `code === "email_conflict"` from
// `authMiddleware` when a Clerk-authenticated user collides with an existing
// local row. Extends `Error` so the existing `err.message` consumers keep
// working unchanged.
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: any) =>
    request<T>(path, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
};
