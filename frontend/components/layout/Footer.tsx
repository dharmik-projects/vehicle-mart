"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/seller")) return null;

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold">VP</span>
              <span className="text-white font-bold text-lg">VehiclePart</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              India&apos;s vehicle spare parts marketplace. Find genuine and compatible parts for every vehicle.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">All Parts</Link></li>
              <li><Link href="/vehicles" className="hover:text-white transition-colors">By Vehicle</Link></li>
              <li><Link href="/categories" className="hover:text-white transition-colors">Categories</Link></li>
            </ul>
          </div>

          {/* Vehicle Parts */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Vehicle Parts</h4>
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
            <h4 className="text-white font-semibold text-sm mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/profile" className="hover:text-white transition-colors">My Account</Link></li>
              <li><Link href="/orders" className="hover:text-white transition-colors">Track Orders</Link></li>
              <li><span className="cursor-default">Shipping &amp; Delivery</span></li>
              <li><span className="cursor-default">Returns &amp; Refunds</span></li>
            </ul>
          </div>

          {/* Seller */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Seller</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/become-seller" className="hover:text-white transition-colors">Become a Seller</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Seller Login</Link></li>
              <li><Link href="/seller" className="hover:text-white transition-colors">Seller Dashboard</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <p>&copy; {new Date().getFullYear()} VehiclePart. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="cursor-default">Privacy Policy</span>
            <span className="cursor-default">Terms &amp; Conditions</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
