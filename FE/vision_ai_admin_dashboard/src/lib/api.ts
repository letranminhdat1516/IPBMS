import { useAuthStore } from '@/stores/authStore';

const BASE_URL = (import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/$/, '');

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type JsonErrorBody = { message?: string; title?: string; [k: string]: unknown };
interface HttpError extends Error {
  status?: number;
  statusText?: string;
  url?: string;
  body?: unknown;
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { access_token?: string };
      const token = typeof data.access_token === 'string' ? data.access_token : null;
      if (token) {
        useAuthStore.getState().auth.setAccessToken(token);
      } else {
        useAuthStore.getState().auth.resetAccessToken();
      }
      return token ?? null;
    } catch {
      useAuthStore.getState().auth.resetAccessToken();
      return null;
    } finally {
      // Allow next refresh after this settles
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();
  return refreshInFlight;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options?: {
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
    unwrapResponse?: boolean;
  }
): Promise<T> {
  const {
    auth: { accessToken },
  } = useAuthStore.getState();

  const tokenToUse = accessToken;

  const url = buildUrl(path, options?.query);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers ?? {}),
  };
  if (tokenToUse) headers.Authorization = `Bearer ${tokenToUse}`;

  const doFetch = () =>
    fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
    });

  let res = await doFetch();
  // Attempt a one-time refresh on 401 then retry
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let body: unknown = undefined;
    try {
      // Try parse JSON error body
      body = await res.clone().json();
    } catch {
      try {
        body = await res.text();
      } catch {
        // noop
      }
    }
    const jb = (typeof body === 'object' && body ? (body as JsonErrorBody) : undefined) as
      | JsonErrorBody
      | undefined;
    const message =
      (jb?.message ? String(jb.message) : '') ||
      (jb?.title ? String(jb.title) : '') ||
      (typeof body === 'string' && body) ||
      res.statusText ||
      'Request failed';

    const error: HttpError = new Error(message);
    error.status = res.status;
    error.statusText = res.statusText;
    error.url = url;
    error.body = body;
    throw error;
  }

  const rawResponse = await res.json();

  // Auto-unwrap standardized response format: { success: true, data: {...} }
  const shouldUnwrap = options?.unwrapResponse !== false;
  if (
    shouldUnwrap &&
    typeof rawResponse === 'object' &&
    rawResponse !== null &&
    'success' in rawResponse &&
    rawResponse.success === true &&
    'data' in rawResponse
  ) {
    return rawResponse.data as T;
  }

  // Return raw response (wrapper) when unwrapping disabled or response not in standard shape
  return rawResponse as T;
}

export const api = {
  get: <T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
    options?: { unwrapResponse?: boolean }
  ) => request<T>('GET', path, { query, unwrapResponse: options?.unwrapResponse }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export default api;
