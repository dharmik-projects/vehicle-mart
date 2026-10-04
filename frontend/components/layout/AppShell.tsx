"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import Header from "./Header";
import Footer from "./Footer";

//
// Central role gate + app chrome.
//
// - Customer store routes (/ , /products, /cart, /checkout, /orders, ...) are
//   rendered ONLY for guests and customers. A logged-in seller or admin is
//   redirected to their dashboard and never sees the store header/footer.
// - Dashboard routes (/seller/**, /admin/**) are rendered ONLY for the matching
//   role. Wrong role → redirected to that role's dashboard; guest → /login.
//   Dashboards keep their own role-specific header variant and never render
//   the customer store header/footer/navigation.
//
function GateSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground"
        aria-label="Loading"
      />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);

  const isSellerArea = pathname === "/seller" || pathname.startsWith("/seller/");
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isDashArea = isSellerArea || isAdminArea;

  // Route-level protection: send every mismatch where it belongs.
  // (Canonical paths — no middleware 307 alias hop through /seller/dashboard.)
  useEffect(() => {
    if (authLoading) return;
    if (isAdminArea) {
      if (!user) router.replace("/login");
      else if (user.role !== "admin")
        router.replace(user.role === "seller" ? "/seller" : "/");
    } else if (isSellerArea) {
      if (!user) router.replace("/login");
      else if (user.role !== "seller")
        router.replace(user.role === "admin" ? "/admin" : "/");
    } else if (user && user.role !== "user") {
      router.replace(user.role === "seller" ? "/seller" : "/admin");
    }
  }, [authLoading, user, isAdminArea, isSellerArea, router]);

  if (isDashArea) {
    const allowed =
      !authLoading && !!user && (isAdminArea ? user.role === "admin" : user.role === "seller");
    // Wrong role / still loading: hold the shell (no store header) while redirecting.
    if (!allowed) return <GateSpinner />;
    return (
      <>
        <Header />
        <main>{children}</main>
      </>
    );
  }

  // Customer store: hide everything while a seller/admin is being redirected out.
  if (user && user.role !== "user") return <GateSpinner />;

  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
