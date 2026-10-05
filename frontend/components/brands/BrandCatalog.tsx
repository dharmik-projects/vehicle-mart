"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, Store } from "lucide-react";
import { thumbUrl } from "@/lib/images";
import { vehicleTypeLabels } from "@/lib/vehicles";

interface Brand {
  _id: string;
  name: string;
  slug: string;
  vehicleType?: string[];
  productCount?: number;
  logo?: string;
}

/* Vehicle Type filter — mirrors the backend vehicle-type enum. */
const TYPE_TABS = [
  { label: "All", value: "all" },
  { label: "Cars", value: "car" },
  { label: "Bikes", value: "2-wheeler" },
  { label: "Trucks", value: "truck" },
  { label: "Tractors", value: "tractor" },
  { label: "EV", value: "ev" },
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * All Vehicle Brands catalog: client-side search + vehicle-type filter +
 * A–Z navigation over the REAL brand list fetched by the server component.
 * Brand cards link to their /brands/[slug] detail page; the parts badge is
 * shown only when the API returned a count (never a fabricated 0).
 */
export default function BrandCatalog({ brands }: { brands: Brand[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [letter, setLetter] = useState<string | null>(null);

  /* Brands matching search + type (the set the A–Z bar is enabled from) */
  const typeFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands.filter((b) => {
      if (q && !b.name.toLowerCase().includes(q)) return false;
      if (type !== "all" && !(b.vehicleType || []).includes(type)) return false;
      return true;
    });
  }, [brands, query, type]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    typeFiltered.forEach((b) => {
      const c = b.name.trim().charAt(0).toUpperCase();
      if (/[A-Z]/.test(c)) set.add(c);
    });
    return set;
  }, [typeFiltered]);

  const visible = useMemo(() => {
    const list = letter
      ? typeFiltered.filter((b) => b.name.trim().charAt(0).toUpperCase() === letter)
      : typeFiltered;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [typeFiltered, letter]);

  const clearFilters = () => {
    setQuery("");
    setType("all");
    setLetter(null);
  };

  /* ── Real empty state: the catalog itself has no brands ── */
  if (brands.length === 0) {
    return (
      <div className="vp-empty">
        <span className="vp-empty-icon">
          <Store className="h-6 w-6" aria-hidden />
        </span>
        <p className="vp-empty-title">No brands available</p>
        <p className="vp-empty-desc">
          The vehicle catalog has no brands yet. They will appear here as soon
          as they are added.
        </p>
        <Link href="/products" className="vp-btn-ink min-h-11 px-7">
          Browse All Parts
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Search + Vehicle Type filter ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLetter(null);
            }}
            placeholder="Search brands…"
            aria-label="Search brands"
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div
          role="group"
          aria-label="Filter by vehicle type"
          className="flex flex-wrap gap-2"
        >
          {TYPE_TABS.map((t) => {
            const active = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setType(t.value);
                  setLetter(null);
                }}
                className={`inline-flex min-h-10 items-center rounded-lg border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── A–Z navigation (letters without brands are disabled) ── */}
      <nav aria-label="Jump to letter" className="flex flex-wrap gap-1">
        {LETTERS.map((L) => {
          const enabled = availableLetters.has(L);
          const active = letter === L;
          return (
            <button
              key={L}
              type="button"
              disabled={!enabled && !active}
              aria-pressed={active}
              aria-label={`Brands starting with ${L}`}
              onClick={() => setLetter(active ? null : L)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : enabled
                    ? "border-border bg-card text-foreground hover:bg-muted"
                    : "border-transparent bg-muted/50 text-muted-foreground/50"
              }`}
            >
              {L}
            </button>
          );
        })}
      </nav>

      {/* ── Results ── */}
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing {visible.length} of {brands.length}{" "}
        {brands.length === 1 ? "brand" : "brands"}
        {letter ? ` · starting with “${letter}”` : ""}
      </p>

      {visible.length === 0 ? (
        <div className="vp-empty">
          <span className="vp-empty-icon">
            <Search className="h-6 w-6" aria-hidden />
          </span>
          <p className="vp-empty-title">No brands match your search</p>
          <p className="vp-empty-desc">
            Try a different name, or clear the filters to see every brand.
          </p>
          <button type="button" onClick={clearFilters} className="vp-btn min-h-11 rounded-lg border border-border bg-card px-6 text-foreground hover:bg-muted">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {visible.map((b) => {
            const types = vehicleTypeLabels(b.vehicleType);
            return (
              <Link
                key={b._id}
                href={`/brands/${b.slug}`}
                className="vp-card vp-card-hover group flex items-center gap-3 p-4"
              >
                {b.logo ? (
                  <Image
                    src={thumbUrl(b.logo, 96)}
                    alt={`${b.name} logo`}
                    width={44}
                    height={44}
                    unoptimized
                    className="h-11 w-11 shrink-0 rounded-xl object-contain"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted font-display text-lg font-semibold text-foreground"
                  >
                    {b.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold tracking-tight text-foreground">
                    {b.name}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {types.length > 0 && <span>{types.join(" · ")}</span>}
                    {typeof b.productCount === "number" && b.productCount > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/80">
                        {b.productCount} {b.productCount === 1 ? "part" : "parts"}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
