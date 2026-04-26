interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTLSeconds = 900) {
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  // Returns data even if expired (for stale-while-revalidate)
  getStale<T>(key: string): { data: T | null; isStale: boolean } {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return { data: null, isStale: false };
    return { data: entry.data, isStale: Date.now() > entry.expiry };
  }

  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    this.store.set(key, { data, expiry: Date.now() + ttl });
  }

  clear(): void {
    this.store.clear();
  }

  prune(): void {
    const now = Date.now();
    // Keep entries up to 24h past expiry for stale fallback
    const hardCutoff = now - 24 * 60 * 60 * 1000;
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiry < hardCutoff) this.store.delete(key);
    }
  }
}

export const cache = new MemoryCache(900);

if (typeof setInterval !== "undefined") {
  setInterval(() => cache.prune(), 5 * 60 * 1000);
}
