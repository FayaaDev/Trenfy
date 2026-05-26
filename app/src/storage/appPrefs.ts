import * as SQLite from 'expo-sqlite';

const kvDb = SQLite.openDatabaseSync('app_prefs.db');
kvDb.execSync(
  `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`
);

export function setKv(key: string, value: string): void {
  try {
    kvDb.runSync(
      'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?);',
      [key, value]
    );
  } catch {
    // ignore
  }
}

export function getKv(key: string): string | null {
  try {
    const row = kvDb.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?;', [key]);
    return row?.value ?? null;
  } catch {
    return null;
  }
}
