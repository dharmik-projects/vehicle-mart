import Link from "next/link";

export default function NotFound() {
  return (
    <div className="vp-container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        404
      </p>
      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
        Page not found
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 min-w-[10rem] items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to home
      </Link>
    </div>
  );
}
