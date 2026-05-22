// ─── Centralized Cache & Request Deduplication Manager ──────────────────────
// Production-ready in-memory caching layer for Vercel/Node.js deployment.
//
// Features:
//   - Generic TTL-based cache with configurable expiry (default 5s)
//   - Request deduplication: if the same key is being fetched, coalesce callers
//   - Prevents N simultaneous users from triggering N external API calls
//   - One external fetch → many consumers receive the same response
//   - Automatic eviction when cache exceeds max size
//
// Architecture:
//   1000 users → /api/quote → CacheManager.getOrFetch("NIFTY", fetchFn)
//      ↓ only ONE external call happens. All 1000 get the same result.
//
// Usage:
//   import { CacheManager, ServerCache } from "@/lib/cache";
//   const cache = new CacheManager<MyType>(5000);
//   const data = await cache.getOrFetch("key", () => externalApiFetch());
// ─────────────────────────────────────────────────────────────────────────────

/** Simple TTL cache (no deduplication). Use for basic key-value storage. */
export class ServerCache<T> {
  private store = new Map<string, { data: T; ts: number }>();
  private readonly ttl: number;
  private readonly maxEntries: number;

  constructor(ttlMs = 5000, maxSize = 500) {
    this.ttl = ttlMs;
    this.maxEntries = maxSize;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  getStale(key: string, maxAgeMs = Infinity): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > maxAgeMs) return null;
    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, { data, ts: Date.now() });
    if (this.store.size > this.maxEntries) this.evict();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  private evict(): void {
    const cutoff = Date.now() - this.ttl * 2;
    for (const [k, v] of this.store) {
      if (v.ts < cutoff) this.store.delete(k);
    }
  }

  get size(): number {
    return this.store.size;
  }
}

/**
 * Advanced cache with request deduplication.
 * If a fetch for the same key is already in-flight, new callers
 * await the same Promise instead of triggering another external call.
 *
 * 1000 users request NIFTY → only 1 NSE API call. All 1000 get same result.
 */
export class CacheManager<T> {
  private cache: ServerCache<T>;
  private pending = new Map<string, Promise<T>>();

  constructor(ttlMs = 5000, maxSize = 500) {
    this.cache = new ServerCache<T>(ttlMs, maxSize);
  }

  /** Get cached data, or fetch it exactly once (deduplicating concurrent requests). */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    options?: { serveStaleOnError?: boolean; maxStaleMs?: number },
  ): Promise<T> {
    // 1. Check cache
    const cached = this.cache.get(key);
    if (cached !== null) return cached;

    // 2. Check if a request is already in-flight for this key
    const inflight = this.pending.get(key);
    if (inflight) return inflight;

    // 3. Start new fetch, store the promise for deduplication
    const promise = fetcher()
      .then((data) => {
        this.cache.set(key, data);
        this.pending.delete(key);
        return data;
      })
      .catch((err) => {
        this.pending.delete(key);
        if (options?.serveStaleOnError) {
          const stale = this.cache.getStale(key, options.maxStaleMs ?? 60_000);
          if (stale !== null) return stale;
        }
        throw err;
      });

    this.pending.set(key, promise);
    return promise;
  }

  get(key: string): T | null {
    return this.cache.get(key);
  }

  set(key: string, data: T): void {
    this.cache.set(key, data);
  }

  isPending(key: string): boolean {
    return this.pending.has(key);
  }

  getStale(key: string, maxAgeMs = Infinity): T | null {
    return this.cache.getStale(key, maxAgeMs);
  }

  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  get pendingCount(): number {
    return this.pending.size;
  }
}
