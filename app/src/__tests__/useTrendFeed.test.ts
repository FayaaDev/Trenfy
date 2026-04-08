/**
 * Tests for useTrendFeed hook
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import useTrendFeed from '../hooks/useTrendFeed';
import type { TrendFeedFilters } from '../hooks/useTrendFeed';
import type { Trend } from '../types';

// Mock the API module
jest.mock('../api/trends', () => ({
  fetchTrends: jest.fn(),
}));

// Mock cache utils so stale-cache fallback doesn't swallow errors
jest.mock('../utils/cache', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheGetStale: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
}));

const { fetchTrends } = require('../api/trends') as {
  fetchTrends: jest.Mock;
};

const DEFAULT_FILTERS: TrendFeedFilters = {
  platform: null,
  selectedCategories: [],
  regionCode: null,
};

const MOCK_TRENDS: Trend[] = [
  {
    id: '1',
    title: 'Test Trend',
    title_ar: 'اتجاه تجريبي',
    status: 'approved',
    platform: 'youtube',
  },
  {
    id: '2',
    title: 'Another Trend',
    status: 'approved',
    platform: 'x',
  },
];

const MOCK_RESPONSE = {
  items: MOCK_TRENDS,
  paging: {
    limit: 20,
    next_cursor: null,
    has_more: false,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useTrendFeed', () => {
  it('returns loading state initially', () => {
    fetchTrends.mockResolvedValueOnce(MOCK_RESPONSE);

    const { result } = renderHook(() => useTrendFeed(DEFAULT_FILTERS));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns trends after successful fetch', async () => {
    fetchTrends.mockResolvedValueOnce(MOCK_RESPONSE);

    const { result } = renderHook(() => useTrendFeed(DEFAULT_FILTERS));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].id).toBe('1');
    expect(result.current.items[1].id).toBe('2');
    expect(result.current.error).toBeNull();
  });

  it('sets error state when fetch fails', async () => {
    fetchTrends.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTrendFeed(DEFAULT_FILTERS));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.items).toEqual([]);
  });

  it('sets lastUpdatedAt after successful fetch', async () => {
    fetchTrends.mockResolvedValueOnce(MOCK_RESPONSE);

    const { result } = renderHook(() => useTrendFeed(DEFAULT_FILTERS));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastUpdatedAt).toBeInstanceOf(Date);
  });

  it('refresh reloads items', async () => {
    fetchTrends
      .mockResolvedValueOnce(MOCK_RESPONSE)
      .mockResolvedValueOnce({
        items: [MOCK_TRENDS[0]],
        paging: { limit: 20, next_cursor: null, has_more: false },
      });

    const { result } = renderHook(() => useTrendFeed(DEFAULT_FILTERS));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
  });
});
