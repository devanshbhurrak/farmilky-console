import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (Number.isNaN(n)) return inr.format(0);
  return inr.format(n);
}

export function formatNumber(value: number | string | null | undefined, digits = 2): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)}, ${formatTime(d)}`;
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function todayLocal(): string {
  return toLocalDateStr(new Date());
}

export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shortId(id: string | null | undefined, len = 6): string {
  if (!id) return '—';
  return id.length > len ? `#${id.slice(-len).toUpperCase()}` : `#${id.toUpperCase()}`;
}

/** Tolerant ID accessor — backend-v2 uses `id`, legacy payloads may use `_id`. */
export function getId(item: unknown): string {
  if (!item || typeof item !== 'object') return '';
  const o = item as Record<string, unknown>;
  const v = o.id ?? o._id;
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  return '';
}

/** Display name for either a populated object `{ name }` or a raw string id. */
export function getName(ref: unknown, fallback = '—'): string {
  if (!ref) return fallback;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object') {
    const o = ref as Record<string, unknown>;
    const n = o.name ?? o.title ?? o.label;
    if (typeof n === 'string' && n) return n;
  }
  return fallback;
}

/** Tolerant phone accessor for populated user refs. */
export function getPhone(ref: unknown): string {
  if (!ref || typeof ref !== 'object') return '';
  const o = ref as Record<string, unknown>;
  return typeof o.phone === 'string' ? o.phone : '';
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .split(/[_\s-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}

/**
 * Backend returns `{ success, data, meta }` for paginated responses, but some
 * legacy endpoints nest the array (`{ data: { users, pagination } }`).
 * This normalizes any of those shapes into `{ items, meta }`.
 */
export function normalizeList<T>(response: unknown, fallbackKeys: string[] = []): {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
} {
  const emptyMeta = { total: 0, page: 1, limit: 20, totalPages: 0 };
  if (!response || typeof response !== 'object') return { items: [], meta: emptyMeta };
  const root = response as Record<string, unknown>;
  const payload = (root.data ?? root.result ?? root) as unknown;

  if (Array.isArray(payload)) {
    const metaRoot = (root.meta ?? {}) as Record<string, unknown>;
    return {
      items: payload as T[],
      meta: {
        total: Number(metaRoot.total ?? payload.length ?? 0),
        page: Number(metaRoot.page ?? 1),
        limit: Number(metaRoot.limit ?? payload.length ?? 20),
        totalPages: Number(metaRoot.totalPages ?? 1),
      },
    };
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const keys = ['items', 'data', 'results', 'users', 'orders', 'subscriptions', 'products', 'invoices', 'payments', 'expenses', 'areas', 'agents', 'manifests', 'suppliers', 'collections', 'complaints', 'returns', 'holidays', 'messages', 'contacts', 'entries', 'list', ...fallbackKeys];
    for (const k of keys) {
      if (Array.isArray(obj[k])) {
        const pagination = (obj.pagination ?? obj.meta ?? root.meta ?? {}) as Record<string, unknown>;
        const total = Number(pagination.total ?? obj.total ?? (obj[k] as unknown[]).length ?? 0);
        const page = Number(pagination.page ?? 1);
        const limit = Number(pagination.limit ?? (obj[k] as unknown[]).length ?? 20);
        return {
          items: obj[k] as T[],
          meta: { total, page, limit, totalPages: Number(pagination.totalPages ?? (limit ? Math.ceil(total / limit) : 1)) },
        };
      }
    }
  }

  return { items: [], meta: emptyMeta };
}

/** Unwrap `{ success, data }` or return the payload as-is. */
export function unwrapData<T>(response: { success?: boolean; data?: T } | T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

export function downloadCsv(filename: string, rows: (string | number)[][], headers: string[]): void {
  const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
