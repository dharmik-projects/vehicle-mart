"use client";
import { useEffect } from "react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  const loadUser = useAuthStore((s) => s.loadUser);
  const hydrateFromCache = useAuthStore((s) => s.hydrateFromCache);
  const loadCart = useCartStore((s) => s.loadCart);

  useEffect(() => {
    // Runs synchronously right after hydration: gates open from the cached
    // user before any network response (no hydration mismatch — this is post-
    // first-paint). Never touches localStorage during SSR.
    hydrateFromCache();

    // Background profile refresh — runs alongside, never blocks navigation.
    void loadUser();

    // Cart bootstrap in parallel with the profile request (do not await it):
    // the role comes from the just-hydrated cached user. A cart failure must
    // never block auth or navigation, so it is fire-and-forget.
    // Cart is customer-only — sellers/admins never load it (API is 403 for them).
    const role = useAuthStore.getState().user?.role;
    if (!role || role === "user") void loadCart();
  }, [hydrateFromCache, loadUser, loadCart]);

  return (
    <>
      {children}
      <Toaster position="bottom-right" />
    </>
  );
}
