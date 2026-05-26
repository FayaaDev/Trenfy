import * as SQLite from 'expo-sqlite';

import { Trend } from '../types';

const db = SQLite.openDatabaseSync('bookmarks.db');
db.execSync(
  `CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL
  );`
);

export function loadBookmarks(): Record<string, Trend> {
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

  return map;
}

export function saveBookmark(trend: Trend): void {
  db.runSync(
    'INSERT OR REPLACE INTO bookmarks (id, data) VALUES (?, ?);',
    [trend.id, JSON.stringify(trend)]
  );
}

export function deleteBookmark(id: string): void {
  db.runSync('DELETE FROM bookmarks WHERE id = ?;', [id]);
}
