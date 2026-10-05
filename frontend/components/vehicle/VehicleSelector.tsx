"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* Cars & 2-wheelers first — they are the marketplace focus */
const VEHICLE_TYPES = [
  { label: "2-Wheeler", value: "2-wheeler" },
  { label: "Car", value: "car" },
  { label: "Truck", value: "truck" },
  { label: "Tractor", value: "tractor" },
  { label: "EV", value: "ev" },
  { label: "3-Wheeler", value: "three-wheeler" },
  { label: "Bus", value: "bus" },
];

const ALL = "__all";

/**
 * Compact "Select Your Vehicle" finder: Type → Brand → Model → Variant → Year.
 * Every step is real MongoDB data loaded through the API. The Year step is
 * derived from the SELECTED VARIANT's actual yearFrom/yearTo — never a
 * generated range — and stays disabled (with an explanatory placeholder)
 * until a variant with a year range is chosen.
 */
export default function VehicleSelector() {
  const router = useRouter();

  const [vehicleType, setVehicleType] = useState(ALL);
  const [brand, setBrand] = useState(ALL);
  const [model, setModel] = useState(ALL);
  const [variant, setVariant] = useState(ALL);
  const [year, setYear] = useState(ALL);

  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState({ brands: true, models: false, variants: false });

  /* Real years for the selected variant only (yearFrom/yearTo from MongoDB). */
  const selectedVariant = variants.find((v: any) => String(v._id) === variant);
  const years = useMemo(() => {
    const from = Number(selectedVariant?.yearFrom);
    const to = Number(selectedVariant?.yearTo);
    if (!from || !to || to < from || to - from > 80) return [];
    return Array.from({ length: to - from + 1 }, (_, i) => String(to - i));
  }, [selectedVariant]);

  /* All brands load on mount via the type effect below (vehicleType starts as ALL) */

  /* Type change → load brands for that type, reset deeper selections */
  useEffect(() => {
    let alive = true;
    setBrand(ALL);
    setModel(ALL);
    setVariant(ALL);
    setYear(ALL);
    setModels([]);
    setVariants([]);
    setLoading((l) => ({ ...l, brands: true }));
    (async () => {
      try {
        const data = await cached(`vbrands:${vehicleType}`, () =>
          api.getBrands(vehicleType === ALL ? undefined : vehicleType)
        );
        if (alive) setBrands(data.brands || []);
      } catch {
        if (alive) setBrands([]);
      } finally {
        if (alive) setLoading((l) => ({ ...l, brands: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [vehicleType]);

  /* Brand change → load models */
  useEffect(() => {
    let alive = true;
    setModel(ALL);
    setVariant(ALL);
    setYear(ALL);
    setVariants([]);
    if (brand === ALL) {
      setModels([]);
      return;
    }
    setLoading((l) => ({ ...l, models: true }));
    (async () => {
      try {
        const data = await cached(`vmodels:${brand}`, () => api.getModels(brand));
        if (alive) setModels(data.models || []);
      } catch {
        if (alive) setModels([]);
      } finally {
        if (alive) setLoading((l) => ({ ...l, models: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [brand]);

  /* Model change → load variants */
  useEffect(() => {
    let alive = true;
    setVariant(ALL);
    setYear(ALL);
    if (model === ALL) {
      setVariants([]);
      return;
    }
    setLoading((l) => ({ ...l, variants: true }));
    (async () => {
      try {
        const data = await cached(`vvariants:${model}`, () => api.getVariants(model));
        if (alive) setVariants(data.variants || []);
      } catch {
        if (alive) setVariants([]);
      } finally {
        if (alive) setLoading((l) => ({ ...l, variants: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [model]);

  const submit = () => {
    const params = new URLSearchParams();
    if (vehicleType !== ALL) params.set("vehicleType", vehicleType);
    if (brand !== ALL) params.set("vehicleBrand", brand);
    if (model !== ALL) params.set("vehicleModel", model);
    if (variant !== ALL) params.set("vehicleVariant", variant);
    if (year !== ALL) params.set("year", year);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  };

  return (
    <section aria-label="Select your vehicle" className="border-b border-border bg-muted/40">
      <div className="vp-container py-4 sm:py-5">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          Find Parts for Your Vehicle
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Select value={vehicleType} onValueChange={setVehicleType}>
            <SelectTrigger className="bg-card" aria-label="Vehicle type">
              <SelectValue placeholder="Vehicle Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any Vehicle Type</SelectItem>
              {VEHICLE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={brand} onValueChange={setBrand} disabled={loading.brands}>
            <SelectTrigger className="bg-card" aria-label="Vehicle brand">
              <SelectValue
                placeholder={
                  loading.brands ? "Loading…" : brands.length === 0 ? "No brands found" : "Brand"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any Brand</SelectItem>
              {brands.map((b: any) => (
                <SelectItem key={b._id} value={b._id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={model} onValueChange={setModel} disabled={brand === ALL || loading.models}>
            <SelectTrigger className="bg-card" aria-label="Vehicle model">
              <SelectValue
                placeholder={
                  loading.models
                    ? "Loading…"
                    : brand !== ALL && models.length === 0
                      ? "No models found"
                      : "Model"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any Model</SelectItem>
              {models.map((m: any) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={variant}
            onValueChange={(v) => {
              setVariant(v);
              setYear(ALL); // year options belong to the newly selected variant
            }}
            disabled={model === ALL || loading.variants}
          >
            <SelectTrigger className="bg-card" aria-label="Vehicle variant">
              <SelectValue
                placeholder={
                  loading.variants
                    ? "Loading…"
                    : model !== ALL && variants.length === 0
                      ? "No variants found"
                      : "Variant"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any Variant</SelectItem>
              {variants.map((v: any) => (
                <SelectItem key={v._id} value={v._id}>
                  {v.name}
                  {Number(v.yearFrom) && Number(v.yearTo)
                    ? ` (${v.yearFrom}–${v.yearTo})`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={variant === ALL ? undefined : year}
            onValueChange={setYear}
            disabled={variant === ALL || years.length === 0}
          >
            <SelectTrigger className="bg-card" aria-label="Vehicle year">
              <SelectValue
                placeholder={
                  variant === ALL
                    ? "Choose variant first"
                    : years.length === 0
                      ? "Years not listed"
                      : "Year"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any Year</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={submit}
            className="col-span-1 min-h-11 min-[420px]:col-span-2 md:col-span-3 xl:col-span-1"
          >
            Find Parts
          </Button>
        </div>
      </div>
    </section>
  );
}
