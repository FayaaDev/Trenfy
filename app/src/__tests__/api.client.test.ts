/**
 * Tests for the API client (src/api/client.ts)
 *
 * Note: the BASE_URL is module-level, so we test the observable behavior
 * (correct URL construction, headers, error handling) rather than the env var
 * switching, which would require --experimental-vm-modules.
 */

import { apiFetch } from '../api/client';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('apiFetch', () => {
  it('constructs the URL from the path', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'ok' }),
    });

    await apiFetch('/api/trends');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/trends$/),
      expect.any(Object)
    );
  });

  it('includes Content-Type: application/json header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/api/test');

    const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(callArgs.headers).toMatchObject({
      'Content-Type': 'application/json',
    });
  });

  it('merges caller-provided headers with default headers', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/api/test', { headers: { 'X-Custom': 'value' } });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(callArgs.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Custom': 'value',
    });
  });

  it('returns parsed JSON on success', async () => {
    const mockData = { items: [{ id: '1' }] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await apiFetch<typeof mockData>('/api/trends');
    expect(result).toEqual(mockData);
  });

  it('throws an error for non-2xx responses (404)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(apiFetch('/api/missing')).rejects.toThrow('API 404 on /api/missing');
  });

  it('throws an error for 500 server errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(apiFetch('/api/crash')).rejects.toThrow('API 500 on /api/crash');
  });

  it('passes an AbortSignal to fetch (internal timeout signal)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // apiFetch creates its own internal AbortController for timeout management;
    // it passes that signal (not the caller's) to fetch.
    const controller = new AbortController();
    await apiFetch('/api/test', { signal: controller.signal });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(callArgs.signal).toBeInstanceOf(AbortSignal);
  });
});
