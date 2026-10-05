import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  /** Omit for the current page (rendered as plain text). */
  href?: string;
}

/**
 * Page breadcrumb trail (server-safe) — matches the PDP pattern.
 * `items` are the crumbs AFTER Home; the last crumb is the current page.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
    >
      <Link
        href="/"
        className="inline-flex min-h-9 items-center transition-colors hover:text-foreground"
      >
        Home
      </Link>
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
          {c.href ? (
            <Link
              href={c.href}
              className="inline-flex min-h-9 items-center transition-colors hover:text-foreground"
            >
              {c.label}
            </Link>
          ) : (
            <span className="min-w-0 max-w-full truncate text-foreground">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
