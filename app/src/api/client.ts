/**
 * Trenfy Mobile API Client
 * All API traffic goes through FastAPI only — no NocoDB direct calls.
 * Base URL configured via EXPO_PUBLIC_API_URL in .env.local
 */

const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`API ${res.status} on ${path}`);
  }

  return res.json() as Promise<T>;
}
