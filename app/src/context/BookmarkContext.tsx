import React, { createContext, useContext, ReactNode } from 'react';

import useBookmarks, { UseBookmarksResult } from '../hooks/useBookmarks';
import { Trend } from '../types';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const BookmarkContext = createContext<UseBookmarksResult | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const value = useBookmarks();
  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBookmarkContext(): UseBookmarksResult {
  const ctx = useContext(BookmarkContext);
  if (!ctx) {
    throw new Error('useBookmarkContext must be used inside a BookmarkProvider');
  }
  return ctx;
}

// Re-export Trend so consumers don't need an extra import.
export type { Trend };
