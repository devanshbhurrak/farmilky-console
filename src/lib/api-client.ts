// In production the SPA is served by the same Worker that proxies /api/* to
// the backend service binding, so requests are same-origin (empty base).
// Local dev falls back to the backend port unless VITE_API_BASE_URL is set.
const configuredBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
// A localhost value from the developer's .env must not leak into a production
// build deployed behind the Worker proxy.
const usableBase =
  import.meta.env.PROD && configuredBase === 'http://localhost:4000' ? '' : configuredBase;

export const API_BASE: string =
  usableBase || (import.meta.env.DEV ? 'http://localhost:4000' : '');

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const prefix = path.startsWith('http') ? '' : API_BASE;
  let qs = '';
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      if (typeof v === 'object') continue;
      sp.set(k, String(v));
    }
    const s = sp.toString();
    if (s) qs = `?${s}`;
  }
  return `${prefix}${path}${qs}`;
}

// Deduplicates concurrent refresh attempts — only one POST /refresh in-flight at a time.
let refreshAttempt: Promise<boolean> | null = null;
function attemptTokenRefresh(): Promise<boolean> {
  if (!refreshAttempt) {
    refreshAttempt = fetch(`${API_BASE}/api/users/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshAttempt = null;
      });
  }
  return refreshAttempt;
}

interface RequestOptions extends RequestInit {
  idempotent?: boolean;
}

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers =
    init.body instanceof FormData
      ? (init.headers ?? {})
      : { 'Content-Type': 'application/json', ...(init.headers ?? {}) };
  const config: RequestInit = { credentials: 'include', headers, ...init };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch {
    throw new ApiError(0, 'Network error. Check your connection and try again.');
  }

  if (response.status === 401) {
    const isAuthEndpoint =
      path.includes('/api/users/refresh') || path.includes('/api/users/login');

    if (!isAuthEndpoint && (await attemptTokenRefresh())) {
      try {
        response = await fetch(url, config);
      } catch {
        throw new ApiError(0, 'Network error. Check your connection and try again.');
      }
    }

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (typeof data === 'object' && data && 'message' in data
        ? String((data as { message: unknown }).message)
        : null) ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

function idempotencyHeaders(): Record<string, string> {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return { 'Idempotency-Key': crypto.randomUUID() };
    }
  } catch {
    // Fall through to the timestamp-based key.
  }
  return { 'Idempotency-Key': `${Date.now()}-${Math.random().toString(36).slice(2)}` };
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    request<T>(buildUrl(path, params)),

  post: <T>(path: string, body?: unknown, options?: { idempotent?: boolean }) =>
    request<T>(path, {
      method: 'POST',
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
      headers: options?.idempotent ? idempotencyHeaders() : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'DELETE',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};

export function apiPdfUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}
