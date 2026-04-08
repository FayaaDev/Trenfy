export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
}

/**
 * Retry a function with exponential backoff.
 * Only retries on network errors (TypeError or errors without a .status property).
 * Never retries on AbortError or HTTP errors (4xx/5xx).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, baseDelay = 1000 }: RetryOptions = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      // Never retry AbortError — the caller intentionally cancelled
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }

      // Only retry on network errors: TypeError (fetch failed) or errors without a status code
      const isNetworkError =
        err instanceof TypeError || (err instanceof Error && !('status' in err));

      if (!isNetworkError || attempt === maxAttempts) {
        throw err;
      }

      lastError = err;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but satisfies TypeScript
  throw lastError;
}
