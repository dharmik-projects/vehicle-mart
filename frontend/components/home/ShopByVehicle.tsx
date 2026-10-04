import Link from "next/link";
import { Car, Bike, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import SectionHead from "./SectionHead";

/* Cars first, then 2-wheelers — the marketplace focus */
const TYPES = [
  {
    value: "car",
    label: "Cars",
    desc: "Hatchbacks, sedans, SUVs & more",
    Icon: Car,
    brandsKey: "sbv:brands:car",
    modelsKey: "sbv:models:car",
    modelsQuery: "/vehicles/models?vehicleType=car",
  },
  {
    value: "2-wheeler",
    label: "Bikes & Scooters",
    desc: "Bikes, scooters & mopeds",
    Icon: Bike,
    brandsKey: "sbv:brands:2w",
    modelsKey: "sbv:models:2w",
    modelsQuery: "/vehicles/models?vehicleType=2-wheeler",
  },
];

/**
 * "Shop by Vehicle" — two large entry cards (Cars / Bikes) built from real
 * MongoDB vehicle data: brand + model counts per type and the actual brand
 * names. Renders nothing when a type has no vehicle data.
 */
export default async function ShopByVehicle() {
  const [carBrands, bikeBrands, carModels, bikeModels] = await Promise.all([
    cached(TYPES[0].brandsKey, () => api.getBrands(TYPES[0].value)).catch(() => ({ brands: [] as any[] })),
    cached(TYPES[1].brandsKey, () => api.getBrands(TYPES[1].value)).catch(() => ({ brands: [] as any[] })),
    cached(TYPES[0].modelsKey, () => api.fetch(TYPES[0].modelsQuery)).catch(() => ({ models: [] as any[] })),
    cached(TYPES[1].modelsKey, () => api.fetch(TYPES[1].modelsQuery)).catch(() => ({ models: [] as any[] })),
  ]);

  const dataByValue: Record<string, { brands: any[]; modelCount: number }> = {
    car: { brands: carBrands.brands || [], modelCount: (carModels.models || []).length },
    "2-wheeler": { brands: bikeBrands.brands || [], modelCount: (bikeModels.models || []).length },
  };

  const cards = TYPES.map((t) => ({ ...t, ...dataByValue[t.value] })).filter(
    (c) => c.brands.length > 0 || c.modelCount > 0
  );

  if (cards.length === 0) return null;

  return (
    <section className="vp-container vp-section">
      <SectionHead title="Shop by Vehicle" href="/vehicles" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ value, label, desc, Icon, brands, modelCount }) => (
          <Link
            key={value}
            href={`/products?vehicleType=${value}`}
            className="vp-card vp-card-hover group flex min-h-[168px] flex-col justify-between bg-muted/40 p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <ArrowRight
                className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </div>
            <div className="mt-4">
              <p className="text-lg font-semibold tracking-tight text-foreground">{label}</p>
              <p className="mt-0.5 text-[15px] text-muted-foreground">{desc}</p>
              <p className="mt-3 text-[13px] font-medium text-foreground">
                {brands.length} {brands.length === 1 ? "brand" : "brands"} ·{" "}
                {modelCount} {modelCount === 1 ? "model" : "models"}
              </p>
              {brands.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {brands.slice(0, 6).map((b: any) => (
                    <span
                      key={b._id}
                      className="rounded border border-border bg-card px-2 py-0.5 text-[13px] font-medium text-muted-foreground"
                    >
                      {b.name}
                    </span>
                  ))}
                  {brands.length > 6 && (
                    <span className="rounded border border-border bg-card px-2 py-0.5 text-[13px] text-muted-foreground">
                      +{brands.length - 6}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
