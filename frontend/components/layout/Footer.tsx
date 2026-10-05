"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Truck, RotateCcw, BadgeCheck, Phone, Mail, MapPin } from "lucide-react";

const columns = [
  {
    title: "Marketplace",
    links: [
      { label: "Home", href: "/" },
      { label: "All Parts", href: "/products" },
      { label: "Shop by Vehicle", href: "/vehicles" },
      { label: "Categories", href: "/categories" },
    ],
  },
  {
    title: "Vehicle Types",
    links: [
      { label: "Car Parts", href: "/products?vehicleType=car" },
      { label: "Bike Parts", href: "/products?vehicleType=2-wheeler" },
      { label: "Truck Parts", href: "/products?vehicleType=truck" },
      { label: "Tractor Parts", href: "/products?vehicleType=tractor" },
      { label: "EV Parts", href: "/products?vehicleType=ev" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "My Account", href: "/profile" },
      { label: "Track Orders", href: "/orders" },
      { label: "Wishlist", href: "/wishlist" },
      { label: "Cart", href: "/cart" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    title: "Sell with us",
    links: [
      { label: "Become a Seller", href: "/become-seller" },
      { label: "Seller Login", href: "/login" },
    ],
  },
];

const trust = [
  { icon: <ShieldCheck className="h-4 w-4" />, label: "100% Genuine Parts" },
  { icon: <Truck className="h-4 w-4" />, label: "Pan-India Delivery" },
  { icon: <RotateCcw className="h-4 w-4" />, label: "Easy Returns" },
  { icon: <BadgeCheck className="h-4 w-4" />, label: "Verified Sellers" },
];

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/seller")) return null;

  return (
    <footer className="border-t border-border bg-muted/70">
      {/* Trust strip — hidden on the homepage, which has the full Trust Features section */}
      {pathname !== "/" && (
        <div className="border-b border-border bg-card">
          <div className="vp-container grid grid-cols-2 gap-x-6 gap-y-4 py-6 sm:gap-y-3 lg:grid-cols-4">
            {trust.map((t) => (
              <div key={t.label} className="flex items-start gap-2.5 text-sm font-medium leading-snug text-foreground">
                <span className="mt-0.5 shrink-0 text-muted-foreground">{t.icon}</span>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Columns */}
      <div className="vp-container py-8 sm:py-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-y-10 lg:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
                VP
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-foreground">
                VehiclePart
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              India&apos;s marketplace for genuine and compatible spare parts — cars, bikes,
              trucks, tractors and EVs from verified sellers.
            </p>

            <div className="mt-5 space-y-1.5 text-[15px] text-muted-foreground">
              <a href="tel:+918000000000" className="flex min-h-10 items-center gap-2.5 transition-colors hover:text-foreground">
                <Phone className="h-4 w-4 shrink-0" /> +91 80000 00000
              </a>
              <a href="mailto:support@vehiclepart.com" className="flex min-h-10 items-center gap-2.5 break-all transition-colors hover:text-foreground">
                <Mail className="h-4 w-4 shrink-0" /> support@vehiclepart.com
              </a>
              <p className="flex items-center gap-2.5 py-1">
                <MapPin className="h-4 w-4 shrink-0" /> Made in India
              </p>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {col.title}
              </h3>
              <ul className="mt-2.5 space-y-0.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="flex min-h-10 items-center py-1 text-sm text-foreground/70 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="vp-container flex flex-col items-center justify-between gap-2 py-4 sm:flex-row sm:gap-4">
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            © {new Date().getFullYear()} VehiclePart. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-0 text-xs text-muted-foreground">
            <Link href="/products" className="inline-flex min-h-10 items-center transition-colors hover:text-foreground">All Parts</Link>
            <Link href="/vehicles" className="inline-flex min-h-10 items-center transition-colors hover:text-foreground">By Vehicle</Link>
            <Link href="/become-seller" className="inline-flex min-h-10 items-center transition-colors hover:text-foreground">Sell on VehiclePart</Link>
            <Link href="/privacy" className="inline-flex min-h-10 items-center transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="inline-flex min-h-10 items-center transition-colors hover:text-foreground">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
