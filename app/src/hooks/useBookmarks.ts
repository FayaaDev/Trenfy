import { useCallback, useEffect, useState } from 'react';

import { Trend } from '../types';
import { deleteBookmark, loadBookmarks, saveBookmark } from '../storage/bookmarks';

export interface UseBookmarksResult {
  bookmarks: Record<string, Trend>;
  toggleBookmark: (trend: Trend) => void;
  isBookmarked: (id: string) => boolean;
}

export default function useBookmarks(): UseBookmarksResult {
  const [bookmarks, setBookmarks] = useState<Record<string, Trend>>({});

  // Load all bookmarks from SQLite on mount.
  useEffect(() => {
    try {
      setBookmarks(loadBookmarks());
    } catch {
      // If the DB read fails, start with an empty map.
    }
  }, []);

  const toggleBookmark = useCallback((trend: Trend) => {
    setBookmarks((prev) => {
      const next = { ...prev };
      if (next[trend.id]) {
        // Remove bookmark.
        delete next[trend.id];
        try {
          deleteBookmark(trend.id);
        } catch {
          // Ignore write errors.
        }
      } else {
        // Add bookmark.
        next[trend.id] = trend;
        try {
          saveBookmark(trend);
        } catch {
          // Ignore write errors.
        }
      }
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (id: string) => Boolean(bookmarks[id]),
    [bookmarks]
  );

  return { bookmarks, toggleBookmark, isBookmarked };
}
