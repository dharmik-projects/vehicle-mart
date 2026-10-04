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
    <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5">
      <h2 className="vp-heading">{title}</h2>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
