import { Trend } from '../types';

const BOOKMARKS_KEY = 'bookmarks';

export function loadBookmarks(): Record<string, Trend> {
  try {
    const value = window.localStorage.getItem(BOOKMARKS_KEY);
    return value ? JSON.parse(value) as Record<string, Trend> : {};
  } catch {
    return {};
  }
}

export function saveBookmark(trend: Trend): void {
  try {
    const bookmarks = loadBookmarks();
    bookmarks[trend.id] = trend;
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {
    // ignore
  }
}

export function deleteBookmark(id: string): void {
  try {
    const bookmarks = loadBookmarks();
    delete bookmarks[id];
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {
    // ignore
  }
}
