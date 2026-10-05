"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { thumbUrl } from "@/lib/images";
import { vehicleTypeLabel } from "@/lib/vehicles";

interface Model {
  _id: string;
  name: string;
  slug?: string;
  vehicleType?: string;
  image?: string;
  productCount?: number;
}

interface Variant {
  _id: string;
  name: string;
  yearFrom: number;
  yearTo: number;
  engineType?: string;
  engineCC?: number;
  fuelType?: string;
  transmission?: string;
}

const FUEL_LABELS: Record<string, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  electric: "Electric",
  hybrid: "Hybrid",
  cng: "CNG",
  lpg: "LPG",
};

const TRANSMISSION_LABELS: Record<string, string> = {
  manual: "Manual",
  automatic: "Automatic",
  cvt: "CVT",
  amt: "AMT",
};

/**
 * Brand ↓ Models ↓ Variants ↓ Years ↓ Engine/Fuel ↓ Compatible Parts.
 *
 * All steps are real MongoDB data: models come from the server component,
 * variants load per selected model via /vehicles/variants, and years are the
 * selected variant's actual yearFrom..yearTo — never a generated range. The
 * final CTA links to /products with real compatibility filters.
 */
export default function BrandModels({
  brand,
  models,
}: {
  brand: { _id: string; name: string };
  models: Model[];
}) {
  const [query, setQuery] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [year, setYear] = useState<string>("all");

  const selectedModel = useMemo(
    () => models.find((m) => String(m._id) === selectedModelId) || null,
    [models, selectedModelId]
  );
  const selectedVariant = useMemo(
    () => variants.find((v) => String(v._id) === selectedVariantId) || null,
    [variants, selectedVariantId]
  );

  /* Real variants for the selected model (fresh on every selection) */
  useEffect(() => {
    if (!selectedModelId) return;
    let alive = true;
    setLoading(true);
    setError(false);
    setVariants([]);
    setSelectedVariantId(null);
    setYear("all");
    api
      .fetch(`/vehicles/variants?model=${selectedModelId}`)
      .then((data: any) => {
        if (!alive) return;
        setVariants(data.variants || []);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedModelId]);

  const visibleModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? models.filter((m) => m.name.toLowerCase().includes(q)) : models;
    // Real part counts first, then alphabetical — popular models surface up
    return [...list].sort((a, b) => {
      const d = (b.productCount || 0) - (a.productCount || 0);
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });
  }, [models, query]);

  const popularModels = useMemo(
    () => models.filter((m) => (m.productCount || 0) > 0),
    [models]
  );

  /* Real available years for the selected variant */
  const years = useMemo(() => {
    if (!selectedVariant) return [];
    const from = Number(selectedVariant.yearFrom);
    const to = Number(selectedVariant.yearTo);
    if (!from || !to || to < from || to - from > 80) return [];
    return Array.from({ length: to - from + 1 }, (_, i) => String(to - i));
  }, [selectedVariant]);

  const partsHref = selectedVariant && selectedModel
    ? `/products?vehicleBrand=${brand._id}&vehicleModel=${selectedModel._id}&vehicleVariant=${selectedVariant._id}${
        year !== "all" ? `&year=${year}` : ""
      }`
    : null;

  return (
    <section aria-labelledby="brand-models">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="brand-models" className="vp-heading">
          Models {models.length > 0 && <span className="text-base font-normal text-muted-foreground">({models.length})</span>}
        </h2>
        {models.length > 3 && (
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${brand.name} models…`}
              aria-label={`Search ${brand.name} models`}
              className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
      </div>

      {/* Popular models — only when REAL part counts exist */}
      {popularModels.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Popular models
          </span>
          {popularModels.map((m) => (
            <button
              key={m._id}
              type="button"
              onClick={() => setSelectedModelId(String(m._id))}
              className="vp-badge vp-badge-soft inline-flex min-h-9 items-center gap-1.5 px-3 transition-colors hover:bg-muted"
            >
              {m.name}
              <span className="font-medium text-foreground/70">
                {m.productCount} {m.productCount === 1 ? "part" : "parts"}
              </span>
            </button>
          ))}
        </div>
      )}

      {models.length === 0 ? (
        <div className="vp-empty">
          <p className="vp-empty-title">No models yet</p>
          <p className="vp-empty-desc">
            Models for {brand.name} will appear here once they are added to the
            catalog.
          </p>
        </div>
      ) : visibleModels.length === 0 ? (
        <div className="vp-empty">
          <p className="vp-empty-title">No models match your search</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="vp-btn min-h-11 rounded-lg border border-border bg-card px-6 text-foreground hover:bg-muted"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
          {visibleModels.map((m) => {
            const active = String(m._id) === selectedModelId;
            return (
              <button
                key={m._id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedModelId(active ? null : String(m._id))}
                className={`vp-card flex flex-col items-start gap-2 p-4 text-left transition-shadow ${
                  active ? "ring-2 ring-primary" : "vp-card-hover"
                }`}
              >
                {m.image ? (
                  <Image
                    src={thumbUrl(m.image, 96)}
                    alt={m.name}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 rounded-lg object-contain"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-lg bg-muted font-display text-base font-semibold text-foreground"
                  >
                    {m.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold tracking-tight text-foreground">
                    {m.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {vehicleTypeLabel(m.vehicleType)}
                    {typeof m.productCount === "number" && m.productCount > 0
                      ? ` · ${m.productCount} ${m.productCount === 1 ? "part" : "parts"}`
                      : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Selected model → Variants → Years → Engine/Fuel → Parts ── */}
      {selectedModel && (
        <div
          className="vp-card mt-5 p-4 sm:p-5"
          role="region"
          aria-label={`Variants for ${selectedModel.name}`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {selectedModel.name} — Variants
            </h3>
            <button
              type="button"
              onClick={() => setSelectedModelId(null)}
              aria-label="Close variants"
              className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading
              variants…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">
              Could not load variants.{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setSelectedModelId(String(selectedModel._id))}
              >
                Retry
              </button>
            </p>
          ) : variants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No variants listed for this model yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {variants.map((v) => {
                const active = String(v._id) === selectedVariantId;
                const specs = [
                  v.engineType,
                  v.engineCC ? `${v.engineCC} cc` : "",
                  v.fuelType ? FUEL_LABELS[v.fuelType] || v.fuelType : "",
                  v.transmission
                    ? TRANSMISSION_LABELS[v.transmission] || v.transmission
                    : "",
                ].filter(Boolean);
                return (
                  <button
                    key={v._id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedVariantId(active ? null : String(v._id));
                      setYear("all");
                    }}
                    className={`rounded-lg border p-3.5 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <span className="block text-[15px] font-semibold text-foreground">
                      {v.name}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">
                      {v.yearFrom}–{v.yearTo}
                    </span>
                    {specs.length > 0 && (
                      <span className="mt-1.5 block text-xs text-muted-foreground">
                        {specs.join(" · ")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Variant → Available Years → Engine/Fuel → Compatible Parts ── */}
          {selectedVariant && (
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Available Years — {selectedVariant.name}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  aria-pressed={year === "all"}
                  onClick={() => setYear("all")}
                  className={`inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
                    year === "all"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  Any Year
                </button>
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    aria-pressed={year === y}
                    onClick={() => setYear(y)}
                    className={`inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
                      year === y
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              {(() => {
                const engine = [
                  selectedVariant.engineType,
                  selectedVariant.engineCC ? `${selectedVariant.engineCC} cc` : "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                const fuel = selectedVariant.fuelType
                  ? FUEL_LABELS[selectedVariant.fuelType] || selectedVariant.fuelType
                  : "";
                const trans = selectedVariant.transmission
                  ? TRANSMISSION_LABELS[selectedVariant.transmission] ||
                    selectedVariant.transmission
                  : "";
                const rows = [
                  ["Engine", engine],
                  ["Fuel", fuel],
                  ["Transmission", trans],
                ].filter(([, v]) => v) as [string, string][];
                return rows.length > 0 ? (
                  <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-border pt-3 text-sm sm:grid-cols-3">
                    {rows.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2 sm:block">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="font-medium text-foreground sm:mt-0.5">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null;
              })()}

              {partsHref && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    Parts matching {selectedVariant.name}
                    {year !== "all" ? ` · ${year}` : ""} (real compatibility
                    data)
                  </p>
                  <Link
                    href={partsHref}
                    className="vp-btn-ink min-h-11 px-6"
                  >
                    Compatible Parts <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
