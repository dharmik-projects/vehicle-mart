import Link from "next/link";
import { Car, Bike, Truck, Tractor, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import SectionHead from "./SectionHead";

/* Cars first, then 2-wheelers, then the commercial / farm / EV types —
   every card below is built from real MongoDB vehicle data per type. */
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
  {
    value: "truck",
    label: "Trucks",
    desc: "LCVs, pickups & haulers",
    Icon: Truck,
    brandsKey: "sbv:brands:truck",
    modelsKey: "sbv:models:truck",
    modelsQuery: "/vehicles/models?vehicleType=truck",
  },
  {
    value: "tractor",
    label: "Tractors",
    desc: "Farm tractors & implements",
    Icon: Tractor,
    brandsKey: "sbv:brands:tractor",
    modelsKey: "sbv:models:tractor",
    modelsQuery: "/vehicles/models?vehicleType=tractor",
  },
  {
    value: "ev",
    label: "EVs",
    desc: "Electric cars, scooters & more",
    Icon: Zap,
    brandsKey: "sbv:brands:ev",
    modelsKey: "sbv:models:ev",
    modelsQuery: "/vehicles/models?vehicleType=ev",
  },
];

/**
 * "Shop by Vehicle" — entry cards (Cars / Bikes on phones, all five types
 * from Trucks…EV on tablet, a single 5-across row on desktop) built from
 * real MongoDB vehicle data: brand + model counts and actual brand names.
 * Renders nothing when no type has any vehicle data.
 */
export default async function ShopByVehicle() {
  const results = await Promise.all(
    TYPES.map(async (t) => {
      const [brandsRes, modelsRes] = await Promise.all([
        cached(t.brandsKey, () => api.getBrands(t.value)).catch(() => ({ brands: [] as any[] })),
        cached(t.modelsKey, () => api.fetch(t.modelsQuery)).catch(() => ({ models: [] as any[] })),
      ]);
      return {
        brands: (brandsRes.brands || []) as any[],
        modelCount: (modelsRes.models || []).length,
      };
    })
  );

  const cards = TYPES.map((t, i) => ({ ...t, ...results[i] })).filter(
    (c) => c.brands.length > 0 || c.modelCount > 0
  );

  if (cards.length === 0) return null;

  /* Keep every track filled — never leave empty columns when a type has
     no data (5 types → the full desktop row the design calls for). */
  const mdCols = cards.length <= 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  const lgCols =
    cards.length >= 5
      ? "lg:grid-cols-5"
      : cards.length === 4
        ? "lg:grid-cols-4"
        : cards.length === 3
          ? "lg:grid-cols-3"
          : "lg:grid-cols-2";

  return (
    <section className="vp-container vp-section">
      <SectionHead title="Shop by Vehicle" href="/vehicles" />
      <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${mdCols} ${lgCols}`}>
        {cards.map(({ value, label, desc, Icon, brands, modelCount }) => (
          <Link
            key={value}
            href={`/products?vehicleType=${value}`}
            className="vp-card vp-card-hover group flex min-h-[124px] flex-col items-center justify-center gap-1.5 p-4 text-center sm:p-5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-brand transition-transform group-hover:scale-105">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="mt-1 text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
              {label}
            </span>
            <span className="hidden text-[13px] leading-snug text-muted-foreground sm:block">
              {desc}
            </span>
            <span className="text-[13px] font-medium text-muted-foreground">
              {brands.length} {brands.length === 1 ? "brand" : "brands"} · {modelCount}{" "}
              {modelCount === 1 ? "model" : "models"}
            </span>
            {brands.length > 0 && (
              <span className="hidden w-full truncate text-[13px] text-muted-foreground sm:block">
                {brands.slice(0, 4).map((b: any) => b.name).join(", ")}
                {brands.length > 4 && `, +${brands.length - 4}`}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
