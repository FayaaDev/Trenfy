/**
 * Trenfy Cache Utility
 * Thin AsyncStorage wrapper with TTL-based expiry.
 * Used by useTrendFeed for stale-while-revalidate offline support.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'trenfy_cache:';

interface CacheEntry<T> {
  data: T;
  storedAt: number; // Unix ms
}

/**
 * Write a value to cache with a timestamp.
 * Silently ignores errors (cache is best-effort).
 */
export async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data: value, storedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

/**
 * Read a value from cache.
 * Returns null when missing, unparseable, or older than ttlMs.
 */
export async function cacheGet<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.storedAt > ttlMs) return null;

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Read a stale value regardless of TTL — used as a fallback when offline.
 * Returns null when missing or unparseable.
 */
export async function cacheGetStale<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch {
    return null;
  }
}
