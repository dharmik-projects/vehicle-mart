"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { thumbUrl } from "@/lib/images";

/**
 * Single-row horizontal category carousel.
 *
 * One comfortable row at every width (never a multi-row grid of tiny cards):
 * mobile = swipeable, sm+ = prev/next arrows scroll by ~80% of the viewport.
 * Categories come in as props from the server component (real API data).
 */
export default function CategoryCarousel({ categories }: { categories: any[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges]);

  const scrollByDir = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 200), behavior: "smooth" });
  };

  const Arrow = ({
    dir,
    disabled,
  }: {
    dir: 1 | -1;
    disabled: boolean;
  }) => (
    <button
      type="button"
      aria-label={dir === -1 ? "Scroll categories left" : "Scroll categories right"}
      disabled={disabled}
      onClick={() => scrollByDir(dir)}
      className={`absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card transition-colors hover:bg-muted sm:flex ${
        dir === -1 ? "-left-5" : "-right-5"
      } ${disabled ? "pointer-events-none opacity-30" : "opacity-100"}`}
    >
      {dir === -1 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );

  return (
    <div className="group relative">
      <Arrow dir={-1} disabled={atStart} />
      <Arrow dir={1} disabled={atEnd} />

      <div
        ref={scrollerRef}
        onScroll={updateEdges}
        className="vp-swipe gap-3 py-1 sm:gap-4"
        aria-label="Product categories"
      >
        {categories.map((cat) => (
          <Link
            key={cat._id}
            href={`/products?category=${cat._id}`}
            className="vp-card vp-card-hover group/card flex w-[132px] shrink-0 flex-col items-center justify-center gap-3 p-4 text-center sm:w-[152px] sm:p-5 lg:w-[176px]"
            style={{ minHeight: 134 }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover/card:bg-foreground group-hover/card:text-background sm:h-14 sm:w-14">
              {cat.image?.url ? (
                <Image
                  src={thumbUrl(cat.image.url, 96)}
                  alt=""
                  width={56}
                  height={56}
                  loading="lazy"
                  className="h-12 w-12 rounded-xl object-cover sm:h-14 sm:w-14"
                />
              ) : cat.icon ? (
                <span className="text-2xl leading-none" aria-hidden>
                  {cat.icon}
                </span>
              ) : (
                <Package className="h-6 w-6" />
              )}
            </span>
            <span className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground sm:text-sm">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
