"use client";
import Link from "next/link";
import { Bike, Car, Truck, Tractor, Zap, LayoutGrid } from "lucide-react";

/* Simple horizontal vehicle-type navigation (cars & 2-wheelers first) */
const NAV = [
  { label: "2-Wheeler", value: "2-wheeler", Icon: Bike },
  { label: "Car", value: "car", Icon: Car },
  { label: "Truck", value: "truck", Icon: Truck },
  { label: "Tractor", value: "tractor", Icon: Tractor },
  { label: "EV", value: "ev", Icon: Zap },
];

export default function CategoryNav() {
  return (
    <nav aria-label="Shop by vehicle type" className="border-b border-border bg-card">
      {/* Horizontally scrollable strip on phones — only this row scrolls,
          the page itself never overflows sideways. */}
      <div className="vp-container">
        <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto py-1 sm:justify-between">
          {NAV.map(({ label, value, Icon }) => (
            <li key={value} className="shrink-0">
              <Link
                href={`/products?vehicleType=${value}`}
                className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
          <li className="shrink-0">
            <Link
              href="/products"
              className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
              All Parts
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
