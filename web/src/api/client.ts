// Shared fetch helper. All API functions use this.
// Per D-01: native fetch only (no axios).
// Per D-02: non-2xx throws Error with .status and .body attached.
// Per D-03: accepts AbortSignal for TanStack Query cancellation.
// Per D-04: single error-handling path for all endpoints.
// NOTE: No credentials: 'include' — CORS is allow_credentials: false.

const BASE = import.meta.env.VITE_API_URL ?? '';

interface ApiError extends Error {
  status: number;
  body: unknown;
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(`API ${res.status}`) as ApiError;
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json() as Promise<T>;
}
