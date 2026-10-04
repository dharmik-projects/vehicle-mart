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
      // Shared cache with the homepage VehicleSelector (same keys) — revisit is instant
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
    <div className="container mx-auto px-4 py-8 max-w-2xl fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-display font-semibold text-foreground mb-2">Select Your Vehicle</h1>
        <p className="text-muted-foreground">Find compatible spare parts for your vehicle</p>
      </div>

      <Card className="rounded-lg">
        <CardContent className="p-6 space-y-4">
          {/* Vehicle Type */}
          <div>
            <label className={labelClass}>Vehicle Type</label>
            <Select value={vehicleType || "__all"} onValueChange={(v) => { setVehicleType(v === '__all' ? '' : v); setSelectedBrand(''); setSelectedModel(''); setSelectedVariant(''); setModels([]); setVariants([]); }}>
              <SelectTrigger><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Types</SelectItem>
                <SelectItem value="2-wheeler">🏍️ 2-Wheeler</SelectItem>
                <SelectItem value="car">🚗 Car</SelectItem>
                <SelectItem value="truck">🚛 Truck</SelectItem>
                <SelectItem value="tractor">🚜 Tractor</SelectItem>
                <SelectItem value="ev">⚡ EV</SelectItem>
                <SelectItem value="three-wheeler">🛺 Three-Wheeler</SelectItem>
                <SelectItem value="bus">🚌 Bus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Brand */}
          <div>
            <label className={labelClass}>Brand</label>
            <Select value={selectedBrand} onValueChange={(v) => { setSelectedBrand(v); setSelectedModel(''); setSelectedVariant(''); setVariants([]); }}>
              <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="__loading">Loading...</SelectItem>
                ) : (
                  brands.map((b) => (
                    <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div>
            <label className={labelClass}>Model</label>
            <Select value={selectedModel} onValueChange={(v) => { setSelectedModel(v); setSelectedVariant(''); }}>
              <SelectTrigger disabled={!selectedBrand}>
                <SelectValue placeholder={selectedBrand ? "Select model" : "Select brand first"} />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <Button className="w-full bg-primary text-primary-foreground shadow-soft hover:shadow-card" size="lg" onClick={handleSearch} disabled={!selectedBrand}>
            Find Compatible Parts
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
