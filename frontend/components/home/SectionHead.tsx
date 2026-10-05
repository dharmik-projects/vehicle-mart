import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Section heading with optional "View all" link (server-safe). */
export default function SectionHead({
  title,
  href,
  linkLabel = "View all",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 sm:mb-5">
      <h2 className="vp-heading min-w-0">{title}</h2>
      {href && (
        <Link
          href={href}
          className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1 py-1 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel} <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      )}
    </div>
  );
}
