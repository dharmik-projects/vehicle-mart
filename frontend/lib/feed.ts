/**
 * Controlled progressive-loading batch size for the product feeds.
 *
 * Lives in a NON-client module on purpose: a constant exported from a
 * `"use client"` file evaluates to `undefined` when imported by a Server
 * Component (the module is never executed on the server), which would make
 * the SSR fetch send `limit=undefined` and silently pull the backend's
 * default page size. Both the server-side first batch and the client-side
 * Load More must read the SAME number from here.
 */
export const FEED_BATCH_SIZE = 8;
