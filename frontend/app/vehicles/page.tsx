"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

/* Vehicle types offered by the picker â€” same list the type selector always offered */
const VEHICLE_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "2-wheeler", label: "ðŸï¸ 2-Wheeler" },
  { value: "car", label: "ðŸš— Car" },
  { value: "truck", label: "ðŸš› Truck" },
  { value: "tractor", label: "ðŸšœ Tractor" },
  { value: "ev", label: "âš¡ EV" },
  { value: "three-wheeler", label: "ðŸ›º Three-Wheeler" },
  { value: "bus", label: "ðŸšŒ Bus" },
];

/* Tappable option-card grid shared by the brand and model pickers */
const optionGrid = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4";

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicleType, setVehicleType] = useState('');
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrands();
  }, [vehicleType]);

  useEffect(() => {
    if (selectedBrand) loadModels();
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedModel) loadVariants();
  }, [selectedModel]);

  const loadBrands = async () => {
    setLoading(true);
    try {
      // Shared cache with the homepage VehicleSelector (same keys) â€” revisit is instant
      const data = await cached(`vbrands:${vehicleType || '__all'}`, () =>
        api.getBrands(vehicleType || undefined)
      );
      setBrands(data.brands || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await cached(`vmodels:${selectedBrand}`, () => api.getModels(selectedBrand));
      setModels(data.models || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadVariants = async () => {
    setLoading(true);
    try {
      const data = await cached(`vvariants:${selectedModel}`, () => api.getVariants(selectedModel));
      setVariants(data.variants || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (vehicleType) params.set('vehicleType', vehicleType);
    if (selectedBrand) params.set('vehicleBrand', selectedBrand);
    if (selectedModel) params.set('vehicleModel', selectedModel);
    if (selectedVariant) params.set('vehicleVariant', selectedVariant);
    router.push(`/products?${params.toString()}`);
  };

  const labelClass = "text-[13px] font-medium normal-case tracking-normal text-foreground mb-1.5 block";

  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-xl font-display font-bold text-foreground sm:text-2xl">Select Your Vehicle</h1>
          <p className="text-sm text-muted-foreground">Find compatible spare parts for your vehicle</p>
        </div>

        <Card className="rounded-lg">
          <CardContent className="space-y-5 p-4 sm:p-6">
            {/* Vehicle Type â€” chips wrap on phones so nothing overflows */}
            <div>
              <span className={labelClass}>Vehicle Type</span>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value || '__all'}
                    type="button"
                    onClick={() => { setVehicleType(opt.value); setSelectedBrand(''); setSelectedModel(''); setSelectedVariant(''); setModels([]); setVariants([]); }}
                    className={`min-h-11 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                      (vehicleType || '') === opt.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand â€” tappable cards (â‰¥44px) */}
            <div>
              <span className={labelClass}>Brand</span>
              {loading && brands.length === 0 ? (
                <div className={optionGrid}>
                  {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)}
                </div>
              ) : brands.length === 0 ? (
                <p className="text-sm text-muted-foreground">No brands found.</p>
              ) : (
                <div className={optionGrid}>
                  {brands.map((b) => (
                    <button
                      key={b._id}
                      type="button"
                      onClick={() => { setSelectedBrand(b._id); setSelectedModel(''); setSelectedVariant(''); setVariants([]); }}
                      className={`min-h-11 truncate rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        selectedBrand === b._id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model â€” tappable cards (â‰¥44px) */}
            <div>
              <span className={labelClass}>Model</span>
              {!selectedBrand ? (
                <p className="text-sm text-muted-foreground">Select a brand first.</p>
              ) : loading && models.length === 0 ? (
                <div className={optionGrid}>
                  {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)}
                </div>
              ) : models.length === 0 ? (
                <p className="text-sm text-muted-foreground">No models found.</p>
              ) : (
                <div className={optionGrid}>
                  {models.map((m) => (
                    <button
                      key={m._id}
                      type="button"
                      onClick={() => { setSelectedModel(m._id); setSelectedVariant(''); }}
                      className={`min-h-11 truncate rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        selectedModel === m._id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Variant */}
            <div>
              <label className={labelClass}>Variant (Optional)</label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger disabled={!selectedModel}>
                  <SelectValue placeholder={selectedModel ? "Select variant" : "Select model first"} />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name} ({v.yearFrom}-{v.yearTo}) {v.fuelType} {v.engineCC ? `${v.engineCC}cc` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full min-h-12 bg-primary text-primary-foreground shadow-soft hover:shadow-card" size="lg" onClick={handleSearch} disabled={!selectedBrand}>
              Find Compatible Parts
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
