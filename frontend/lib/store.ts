import { create } from 'zustand';
import toast from 'react-hot-toast';
import api from './api';

// ==================== AUTH STORE ====================
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string;
  sellerInfo?: any;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  /** Client-only, post-hydration: seed `user`/`isLoading` from localStorage so
   *  gated routes open without waiting for the /auth/me round trip. */
  hydrateFromCache: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  login: async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user });
  },
  register: async (formData) => {
    const data = await api.register(formData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user });
  },
  logout: async () => {
    try { await api.logout(); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null });
  },
  loadUser: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const data = await api.getMe();
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, isLoading: false });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ user: null, isLoading: false });
    }
  },
  // SSR-safe: initial state stays { user: null, isLoading: true } so the server
  // HTML matches the first client render; this runs once on the client AFTER
  // hydration (never during SSR) and opens the gates without a network trip.
  hydrateFromCache: () => {
    if (typeof window === 'undefined') return;
    // Never clobber a fresher in-memory user (login() / loadUser() already won).
    if (get().user) return;

    let cached: User | null = null;
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') cached = parsed as User;
      }
    } catch {
      cached = null; // corrupted cache — treat as no cached user
    }

    if (cached) {
      set({ user: cached, isLoading: false });
      return;
    }
    // No cached user: only settle as "logged out" when there is no token either.
    // Token present but no user → leave isLoading true for loadUser() to resolve.
    let hasToken = false;
    try {
      hasToken = !!localStorage.getItem('accessToken');
    } catch {
      hasToken = false;
    }
    if (!hasToken) set({ isLoading: false });
  },
}));

// ==================== CART STORE ====================
//
// Optimistic mutations: the UI updates immediately (header badge, cart page
// lines), ONE API request runs in the background, and the server's populated
// cart from that response is applied directly — no extra GET round-trip.
// On failure the previous state is restored and an error is surfaced.

interface CartItem {
  _id: string;
  product: any;
  quantity: number;
  price: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  totalItems: number;
  isOpen: boolean;
  isLoading: boolean;
  toggleCart: () => void;
  loadCart: (opts?: { silent?: boolean }) => Promise<void>;
  addItem: (productId: string, quantity?: number, snapshot?: any) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const productIdOf = (item: CartItem): string =>
  typeof item.product === 'object' && item.product !== null ? item.product._id : item.product;

/** Mirror of the server's total/totalItems computation (price × qty, Σ qty). */
const totalsOf = (items: CartItem[]) => ({
  total: items.reduce((sum, i) => sum + (i.product?.price ?? i.price ?? 0) * i.quantity, 0),
  totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
});

export const useCartStore = create<CartState>((set, get) => {
  /* One shared GET /cart in flight at a time (Header + Providers both request it). */
  let inflight: Promise<void> | null = null;
  let lastLoadedAt = 0;

  /** Apply a { cart, totalItems } response from a mutation — no refetch needed. */
  const applyServerCart = (res: any): boolean => {
    if (!res?.cart) return false;
    const items: CartItem[] = res.cart.items || [];
    set({ items, ...totalsOf(items) });
    lastLoadedAt = Date.now();
    return true;
  };

  /** Full fetch with in-flight dedupe. Best-effort: never rejects. */
  const sync = async (): Promise<void> => {
    if (inflight) return inflight;
    const p = (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token) return;
        const data = await api.getCart();
        const items: CartItem[] = data.cart?.items || [];
        set({
          items,
          total: data.total || 0,
          totalItems: data.totalItems || 0,
          isLoading: false,
        });
        lastLoadedAt = Date.now();
      } catch {
        set({ isLoading: false });
      }
    })();
    // Clear the slot in a microtask AFTER the assignment — a synchronous
    // completion inside the IIFE must not null out the slot too early.
    inflight = p.finally(() => {
      inflight = null;
    });
    return inflight;
  };

  return {
    items: [],
    total: 0,
    totalItems: 0,
    isOpen: false,
    isLoading: false,
    toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

    loadCart: async (opts) => {
      const silent = opts?.silent ?? false;
      // Freshness guard: avoid refetching on every page mount (8s window).
      if (!silent && Date.now() - lastLoadedAt < 8000) return;
      if (inflight) return inflight;
      if (!silent) set({ isLoading: true });
      try {
        await sync();
      } catch {
        set({ isLoading: false });
      }
    },

    addItem: async (productId, quantity = 1, snapshot) => {
      const prev = get();
      const prevItems = prev.items;
      const idx = prevItems.findIndex((i) => productIdOf(i) === productId);

      let nextItems: CartItem[];
      if (idx >= 0) {
        const existing = prevItems[idx];
        const stock = existing.product?.stock;
        const rawQty = existing.quantity + quantity;
        const nextQty = stock ? Math.min(rawQty, Math.max(stock, 1)) : rawQty;
        nextItems = prevItems.map((it, j) => (j === idx ? { ...it, quantity: nextQty } : it));
      } else if (snapshot) {
        nextItems = [...prevItems, { _id: productId, product: snapshot, quantity, price: snapshot.price ?? 0 }];
      } else {
        nextItems = prevItems;
      }
      // 1) Optimistic UI — badge/cart update instantly.
      set({ items: nextItems, ...totalsOf(nextItems) });

      try {
        // 2) ONE background request (server response replaces optimistic state).
        const res: any = await api.addToCart(productId, quantity);
        if (!applyServerCart(res)) await sync();
      } catch (err) {
        set({ items: prevItems, total: prev.total, totalItems: prev.totalItems });
        throw err;
      }
    },

    updateItem: async (productId, quantity) => {
      const prev = get();
      const prevItems = prev.items;
      const nextItems = prevItems.map((i) =>
        productIdOf(i) === productId ? { ...i, quantity } : i
      );
      set({ items: nextItems, ...totalsOf(nextItems) });
      try {
        const res: any = await api.updateCartItem(productId, quantity);
        if (!applyServerCart(res)) await sync();
      } catch (err: any) {
        set({ items: prevItems, total: prev.total, totalItems: prev.totalItems });
        toast.error(err?.message || 'Could not update quantity');
      }
    },

    removeItem: async (productId) => {
      const prev = get();
      const prevItems = prev.items;
      const nextItems = prevItems.filter((i) => productIdOf(i) !== productId);
      set({ items: nextItems, ...totalsOf(nextItems) });
      try {
        const res: any = await api.removeFromCart(productId);
        if (!applyServerCart(res)) await sync();
      } catch (err: any) {
        set({ items: prevItems, total: prev.total, totalItems: prev.totalItems });
        toast.error(err?.message || 'Could not remove item');
      }
    },

    clearAll: async () => {
      const prev = get();
      set({ items: [], total: 0, totalItems: 0 });
      try {
        await api.clearCart();
        lastLoadedAt = Date.now();
      } catch (err: any) {
        set({ items: prev.items, total: prev.total, totalItems: prev.totalItems });
        toast.error(err?.message || 'Could not clear cart');
      }
    },
  };
});

// ==================== VEHICLE SELECTION STORE ====================
interface VehicleState {
  vehicleType: string;
  brandId: string;
  modelId: string;
  variantId: string;
  setVehicleType: (type: string) => void;
  setBrand: (id: string) => void;
  setModel: (id: string) => void;
  setVariant: (id: string) => void;
  clear: () => void;
}

export const useVehicleStore = create<VehicleState>((set) => ({
  vehicleType: '',
  brandId: '',
  modelId: '',
  variantId: '',
  setVehicleType: (type) => set({ vehicleType: type, brandId: '', modelId: '', variantId: '' }),
  setBrand: (id) => set({ brandId: id, modelId: '', variantId: '' }),
  setModel: (id) => set({ modelId: id, variantId: '' }),
  setVariant: (id) => set({ variantId: id }),
  clear: () => set({ vehicleType: '', brandId: '', modelId: '', variantId: '' }),
}));
