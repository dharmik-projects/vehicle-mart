/**
 * Recently-viewed history (client-only, localStorage).
 *
 * Stores only product IDs (max 24 — the /products?ids= hydration cap, newest
 * first) — display data is always fetched fresh from the API so prices/stock
 * are never stale snapshots. Real view events only; nothing is ever synthesized.
 */

const KEY = "vp_recently_viewed";
const MAX = 24;

export function recordProductView(product: { _id?: string } | null | undefined) {
  if (typeof window === "undefined") return;
  const id = product?._id;
  if (!id) return;
  try {
    const raw = localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [id, ...list.filter((x) => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full / private mode — history is optional */
  }
}

export function getRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Remove one product from the history (per-card remove on /recently-viewed). */
export function removeRecentId(id: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const next = getRecentIds().filter((x) => x !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return getRecentIds();
  }
}

/** Clear the whole history ("Clear Recently Viewed"). */
export function clearRecentHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
