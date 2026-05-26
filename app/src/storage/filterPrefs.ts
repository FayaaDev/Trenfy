import Storage from 'expo-sqlite/kv-store';

export function getFilterPref(key: string): string | null {
  return Storage.getItemSync(key);
}

export function setFilterPref(key: string, value: string): void {
  Storage.setItemSync(key, value);
}

export function removeFilterPref(key: string): void {
  Storage.removeItemSync(key);
}
