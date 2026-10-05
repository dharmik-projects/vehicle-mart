/**
 * Vehicle-type display labels shared by the brand catalog, brand pages and
 * recently-viewed filters. Values mirror the backend enums (Product /
 * VehicleBrand / ProductCompatibility) — this is display config, never data.
 */

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: "Car",
  "2-wheeler": "2-Wheeler",
  truck: "Truck",
  tractor: "Tractor",
  ev: "EV",
  "three-wheeler": "3-Wheeler",
  bus: "Bus",
  universal: "Universal",
};

export function vehicleTypeLabel(type?: string | null): string {
  if (!type) return "";
  return VEHICLE_TYPE_LABELS[type] || type;
}

/** Normalize VehicleBrand.vehicleType (array) / model.vehicleType (string). */
export function vehicleTypeLabels(value?: string | string[] | null): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map(vehicleTypeLabel).filter(Boolean);
}
