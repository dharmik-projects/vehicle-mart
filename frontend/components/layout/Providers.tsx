"use client";
import { useEffect } from "react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  const { loadUser } = useAuthStore();
  const { loadCart } = useCartStore();

  useEffect(() => {
    loadUser();
    loadCart();
  }, [loadUser, loadCart]);

  return (
    <>
      {children}
      <Toaster position="bottom-right" />
    </>
  );
}
