"use client";

/**
 * Route error boundary — any thrown server/client exception (API down mid-SSR,
 * unexpected null, network blip) lands here instead of a raw 500 page.
 * Shows the real failure with a retry; never fake data.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="vp-container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
        We couldn&apos;t load this page
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        A temporary error interrupted the request. Nothing was lost — please
        try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-11 min-w-[10rem] items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
