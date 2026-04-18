interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTLSeconds = 900) {
    // Default 15 min cache
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

  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    this.store.set(key, { data, expiry: Date.now() + ttl });
  }

  clear(): void {
    this.store.clear();
  }

  // Prune expired entries periodically
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton cache instance
export const cache = new MemoryCache(900); // 15 minutes default

// Auto-prune every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => cache.prune(), 5 * 60 * 1000);
}
