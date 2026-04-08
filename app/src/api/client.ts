/**
 * Trenfy Mobile API Client
 * All API traffic goes through FastAPI only — no NocoDB direct calls.
 * Base URL configured via EXPO_PUBLIC_API_URL in .env.local
 */
import Constants from 'expo-constants';

const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 10_000;

/** App version attached to every request for traceability */
const APP_VERSION: string = Constants.expoConfig?.version ?? 'unknown';

/**
 * Sanitize a URL path+query string so all query parameter values are
 * percent-encoded, preventing injection via special characters.
 */
function sanitizePath(path: string): string {
  const qIndex = path.indexOf('?');
  if (qIndex === -1) return path;

  const basePath = path.slice(0, qIndex);
  const queryString = path.slice(qIndex + 1);

  const sanitized = queryString
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) return encodeURIComponent(decodeURIComponent(pair));
      const key = pair.slice(0, eqIndex);
      const value = pair.slice(eqIndex + 1);
      return `${encodeURIComponent(decodeURIComponent(key))}=${encodeURIComponent(decodeURIComponent(value))}`;
    })
    .join('&');

  return `${basePath}?${sanitized}`;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const sanitizedPath = sanitizePath(path);
  const url = `${BASE_URL}${sanitizedPath}`;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutController.abort(new Error('Request timeout')),
    REQUEST_TIMEOUT_MS
  );

  if (options?.signal) {
    options.signal.addEventListener(
      'abort',
      () => timeoutController.abort(options.signal!.reason),
      { once: true }
    );
  }

  try {
    const res = await fetch(url, {
      ...options,
      signal: timeoutController.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-App-Version': APP_VERSION,
        ...(options?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const err = new Error(`API ${res.status} on ${sanitizedPath}`);
      if (__DEV__) {
        console.error(`[API] ${res.status} ${res.statusText} — ${url}`);
      }
      throw err;
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (__DEV__ && !(err instanceof Error && err.name === 'AbortError')) {
      console.error(`[API] Request failed — ${url}:`, err);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
