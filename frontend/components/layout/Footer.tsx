"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">🔧</span> VehiclePart
            </h3>
            <p className="text-sm leading-relaxed mb-4">
              India&apos;s vehicle spare parts marketplace. Find genuine and compatible parts for every vehicle.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">All Parts</Link></li>
              <li><Link href="/vehicles" className="hover:text-white transition-colors">By Vehicle</Link></li>
              <li><Link href="/categories" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/categories" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Vehicle Parts */}
          <div>
            <h4 className="text-white font-semibold mb-4">Vehicle Parts</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products?vehicleType=car" className="hover:text-white transition-colors">Car Parts</Link></li>
              <li><Link href="/products?vehicleType=2-wheeler" className="hover:text-white transition-colors">Bike Parts</Link></li>
              <li><Link href="/products?vehicleType=truck" className="hover:text-white transition-colors">Truck Parts</Link></li>
              <li><Link href="/products?vehicleType=tractor" className="hover:text-white transition-colors">Tractor Parts</Link></li>
              <li><Link href="/products?vehicleType=ev" className="hover:text-white transition-colors">EV Parts</Link></li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Customer Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/categories" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/categories" className="hover:text-white transition-colors">Shipping &amp; Delivery</Link></li>
              <li><Link href="/categories" className="hover:text-white transition-colors">Returns &amp; Refunds</Link></li>
              <li><Link href="/categories" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/categories" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Seller */}
          <div>
            <h4 className="text-white font-semibold mb-4">Seller</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/become-seller" className="hover:text-white transition-colors">Become a Seller</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Seller Login</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <p>&copy; 2026 VehiclePart. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/categories" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/categories" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
