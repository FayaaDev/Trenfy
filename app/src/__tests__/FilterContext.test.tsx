/**
 * Tests for FilterContext
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { FilterProvider, useFilters } from '../context/FilterContext';

// Mock fetchCategories to avoid network calls
jest.mock('../api/trends', () => ({
  fetchCategories: jest.fn().mockResolvedValue([
    { value: 'Tech', label: 'Tech' },
    { value: 'Sports', label: 'Sports' },
  ]),
}));

// Mock useFilterPrefs hook
jest.mock('../hooks/useFilterPrefs', () => ({
  __esModule: true,
  default: () => ({
    region: null,
    setRegion: jest.fn(),
    clearPersistedFilters: jest.fn(),
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FilterProvider>{children}</FilterProvider>
);

describe('FilterContext', () => {
  it('starts with no selected categories', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
    });

    expect(result.current.selectedCategories).toEqual([]);
  });

  it('toggleCategory adds a category when not selected', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
    });

    act(() => {
      result.current.toggleCategory('Gaming');
    });

    expect(result.current.selectedCategories).toContain('Gaming');
  });

  it('toggleCategory removes a category when already selected', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
    });

    act(() => {
      result.current.toggleCategory('Gaming');
    });

    expect(result.current.selectedCategories).toContain('Gaming');

    act(() => {
      result.current.toggleCategory('Gaming');
    });

    expect(result.current.selectedCategories).not.toContain('Gaming');
  });

  it('activeFilterCount reflects selected categories count', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
    });

    expect(result.current.activeFilterCount).toBe(0);

    act(() => {
      result.current.toggleCategory('Gaming');
      result.current.toggleCategory('Music');
    });

    expect(result.current.activeFilterCount).toBe(2);
  });

  it('clearAll resets selected categories', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
    });

    act(() => {
      result.current.toggleCategory('Gaming');
      result.current.toggleCategory('Music');
    });

    expect(result.current.selectedCategories).toHaveLength(2);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.selectedCategories).toHaveLength(0);
  });

  it('loads available categories from API (with fallbacks)', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingCategories).toBe(false);
    });

    // Should contain the fallback + API categories merged
    const labels = result.current.availableCategories.map((c) => c.value);
    expect(labels).toContain('Gaming'); // fallback category
    expect(labels).toContain('Tech');   // from mocked API
  });
});
