import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import { thumbUrl } from "@/lib/images";
import { vehicleTypeLabels } from "@/lib/vehicles";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import BrandModels from "@/components/brands/BrandModels";
import BrandParts from "@/components/brands/BrandParts";

export const revalidate = 60;

interface BrandPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  try {
    const data = await cached(`brand:${params.slug}`, () =>
      api.fetch(`/vehicles/brands/${params.slug}`)
    );
    const name = data?.brand?.name;
    if (name) return { title: `${name} Parts | VehiclePart` };
  } catch {
    /* fall through */
  }
  return { title: "Brand | VehiclePart" };
}

/**
 * Brand detail — Brand ↓ Models ↓ Variants ↓ Years ↓ Compatible Parts.
 * Everything (brand, models, counts, parts, related categories) is fetched
 * from MongoDB through the vehicle/products APIs; sections with no real data
 * hide or show an empty state instead of filling the gap with placeholders.
 */
export default async function BrandPage({ params }: BrandPageProps) {
  let brand: any = null;
  try {
    const data = await cached(`brand:${params.slug}`, () =>
      api.fetch(`/vehicles/brands/${params.slug}`)
    );
    brand = data?.brand || null;
  } catch {
    brand = null;
  }
  if (!brand) notFound();

  const [modelsRes, partsRes, catsRes] = await Promise.all([
    cached(`brand:${params.slug}:models`, () =>
      api.fetch(`/vehicles/models?brand=${brand._id}&withCounts=true`)
    ).catch(() => ({ models: [] as any[] })),
    cached(`brand:${params.slug}:parts:1`, () =>
      api.fetch(`/vehicles/brands/${params.slug}/products?limit=8`)
    ).catch(() => null),
    cached("categories:all", () => api.fetch("/categories/all")).catch(() => ({
      categories: [] as any[],
    })),
  ]);

  const models: any[] = modelsRes.models || [];
  const parts: any[] = partsRes?.products || [];
  const pagination = partsRes?.pagination || {
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Related categories = categories the brand's parts actually belong to
  const catNameById = new Map<string, string>(
    ((catsRes.categories || []) as any[]).map((c: any) => [String(c._id), c.name])
  );
  const relatedCategories = ((partsRes?.categoryIds || []) as string[])
    .map((id) => ({ id, name: catNameById.get(id) }))
    .filter((c): c is { id: string; name: string } => !!c.name);

  const typeLabels = vehicleTypeLabels(brand.vehicleType);
  const productCount = pagination.total;

  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      <Breadcrumbs
        items={[{ label: "All Vehicle Brands", href: "/brands" }, { label: brand.name }]}
      />

      {/* ── Brand header ── */}
      <header className="vp-card mb-6 flex flex-wrap items-center gap-4 p-5 sm:gap-5 sm:p-6">
        {brand.logo ? (
          <Image
            src={thumbUrl(brand.logo, 160)}
            alt={`${brand.name} logo`}
            width={72}
            height={72}
            unoptimized
            className="h-16 w-16 shrink-0 rounded-2xl object-contain sm:h-[72px] sm:w-[72px]"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-muted font-display text-2xl font-semibold text-foreground sm:h-[72px] sm:w-[72px]"
          >
            {brand.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="vp-page-title">{brand.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            {typeLabels.map((t) => (
              <span key={t} className="vp-badge vp-badge-soft">
                {t}
              </span>
            ))}
            <span>
              {models.length} {models.length === 1 ? "model" : "models"}
            </span>
            <span aria-hidden>·</span>
            {productCount > 0 ? (
              <span className="font-medium text-foreground">
                {productCount} {productCount === 1 ? "part" : "parts"}
              </span>
            ) : (
              <span>No parts listed yet</span>
            )}
          </div>
        </div>
      </header>

      {/* ── Brand ↓ Models ↓ Variants ↓ Years ↓ Engine/Fuel ── */}
      <BrandModels brand={{ _id: brand._id, name: brand.name }} models={models} />

      {/* ── Compatible parts (brand-level, Load More) ── */}
      <div className="mt-8 sm:mt-10">
        <BrandParts slug={params.slug} initial={parts} pagination={pagination} />
      </div>

      {/* ── Related categories (real categories of the brand's parts) ── */}
      {relatedCategories.length > 0 && (
        <section className="mt-8 sm:mt-10" aria-labelledby="related-categories">
          <h2 id="related-categories" className="vp-heading mb-4">
            Related Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedCategories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.id}`}
                className="vp-badge vp-badge-soft inline-flex min-h-9 items-center px-4 transition-colors hover:bg-muted"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
