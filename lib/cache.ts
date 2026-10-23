// Client-side lightweight cache for instantaneous navigation between pages

const store = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh window

export function getCachedData<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  // Return cached data immediately to allow instant render
  return entry.data as T;
}

export function setCachedData(key: string, data: any) {
  store.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    store.clear();
    return;
  }
  for (const k of store.keys()) {
    if (k.startsWith(keyPrefix)) {
      store.delete(k);
    }
  }
}
