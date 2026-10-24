// VITE_API_BASE_URL is required in production — fail loudly at startup instead
// of silently issuing same-origin requests that 404. Local dev falls back to
// the default backend port.
export const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

if (!import.meta.env.VITE_API_BASE_URL && !import.meta.env.DEV) {
  console.error(
    '[api-client] VITE_API_BASE_URL is not configured — API requests will target http://localhost:4000 and likely fail.',
  );
}

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
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => { refreshAttempt = null; });
  }
  return refreshAttempt;
}

async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const isFormData = options.body instanceof FormData;

  const fetchOpts: RequestInit = {
    credentials: 'include',
    headers: isFormData
      ? {}
      : {
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
        },
    ...options,
  };
  let response: Response;
  try {
    response = await fetch(url, fetchOpts);
  } catch {
    throw new ApiError(0, 'Network error. Check your connection and try again.');
  }

  if (response.status === 401) {
    // Don't try to refresh if this IS the refresh or login request (prevent loops).
    const isAuthEndpoint = path.includes('/api/users/refresh') || path.includes('/api/users/login');
    if (!isAuthEndpoint && (await attemptTokenRefresh())) {
      // Fresh cookies set — retry original request.
      try {
        response = await fetch(url, fetchOpts);
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
      (typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message?: unknown }).message)
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
    /* noop */
  }
  return { 'Idempotency-Key': `${Date.now()}-${Math.random().toString(36).slice(2)}` };
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    apiClient<T>(buildUrl(path, params)),
  post: <T>(path: string, body?: unknown, opts?: { idempotent?: boolean }) =>
    apiClient<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      headers: opts?.idempotent ? idempotencyHeaders() : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    apiClient<T>(path, { method: 'DELETE', body: body !== undefined ? JSON.stringify(body) : undefined }),
};

export function apiPdfUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}
