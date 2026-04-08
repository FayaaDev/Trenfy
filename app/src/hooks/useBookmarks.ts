import { useCallback, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';

import { Trend } from '../types';

// Open (or create) the bookmarks database.
const db = SQLite.openDatabaseSync('bookmarks.db');

// Ensure the table exists on startup.
db.execSync(
  `CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL
  );`
);

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
      const rows = db.getAllSync<{ id: string; data: string }>(
        'SELECT id, data FROM bookmarks;'
      );
      const map: Record<string, Trend> = {};
      for (const row of rows) {
        try {
          map[row.id] = JSON.parse(row.data) as Trend;
        } catch {
          // Skip rows with invalid JSON.
        }
      }
      setBookmarks(map);
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
          db.runSync('DELETE FROM bookmarks WHERE id = ?;', [trend.id]);
        } catch {
          // Ignore write errors.
        }
      } else {
        // Add bookmark.
        next[trend.id] = trend;
        try {
          db.runSync(
            'INSERT OR REPLACE INTO bookmarks (id, data) VALUES (?, ?);',
            [trend.id, JSON.stringify(trend)]
          );
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
