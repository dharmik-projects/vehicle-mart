/**
 * Lightweight TTL cache + in-flight request dedupe.
 *
 * - `cached("key", fn)` returns cached data while fresh, otherwise runs fn.
 * - Concurrent callers with the same key share ONE network request.
 * - Stale entries are served for up to `staleWhileRevalidate` ms while a
 *   background refresh updates the entry (callers always get data, never void).
 *
 * Used for reference data (categories, vehicle makes/models/variants, search
 * suggestions). Never use for user-specific data (cart, profile, orders).
 */

interface Entry {
  t: number; // freshness timestamp
  data: unknown;
}

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 min fresh
const DEFAULT_SWR = 30 * 60 * 1000; // 30 min serve-stale window

export function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  { ttl = DEFAULT_TTL, swr = DEFAULT_SWR }: { ttl?: number; swr?: number } = {}
): Promise<T> {
  const hit = cache.get(key) as Entry | undefined;
  const now = Date.now();

  // Fresh hit — instant, no network.
  if (hit && now - hit.t < ttl) return Promise.resolve(hit.data as T);

  // Dedupe concurrent misses into one request.
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  // Stale hit inside SWR window — serve stale now, refresh in the background.
  if (hit && now - hit.t < ttl + swr) {
    const bg = fetcher().then(
      (data) => {
        cache.set(key, { t: Date.now(), data });
        inflight.delete(key);
        return data;
      },
      (err) => {
        inflight.delete(key);
        throw err;
      }
    );
    // Nobody may be awaiting this refresh — keep a handler attached so a
    // failed background refresh never surfaces as an unhandled rejection.
    bg.catch(() => undefined);
    inflight.set(key, bg);
    return Promise.resolve(hit.data as T);
  }

  // Cold miss — fetch, cache on success, drop the slot on failure.
  const p = fetcher().then(
    (data) => {
      cache.set(key, { t: Date.now(), data });
      inflight.delete(key);
      return data;
    },
    (err) => {
      inflight.delete(key);
      throw err;
    }
  );
  inflight.set(key, p);
  return p as Promise<T>;
}

/** Drop cached entries whose key starts with the given prefix. */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  Array.from(cache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) cache.delete(key);
  });
}
