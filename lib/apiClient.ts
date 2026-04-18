type ApiError = {
  error: string;
  details?: unknown;
};

let csrfToken: string | null = null;

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const res = await fetch('/api/auth/csrf', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to get CSRF token');
  const data = (await res.json()) as { csrfToken: string };
  csrfToken = data.csrfToken;
  return csrfToken;
}

export async function apiClient<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.json !== undefined) {
    headers.set('content-type', 'application/json');
  }

  const method = (init.method || 'GET').toUpperCase();
  const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

  if (isMutating && path.startsWith('/api/auth')) {
    const token = await ensureCsrfToken();
    headers.set('x-csrf-token', token);
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = (isJson ? await res.json() : await res.text()) as any;

  if (!res.ok) {
    const err = (data || {}) as ApiError;
    throw new Error(err.error || 'Request failed');
  }

  return data as T;
}

