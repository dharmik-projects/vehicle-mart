import { create } from 'zustand';
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
}

export const useAuthStore = create<AuthState>((set) => ({
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
}));

// ==================== CART STORE ====================
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
  loadCart: () => Promise<void>;
  addItem: (productId: string) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  totalItems: 0,
  isOpen: false,
  isLoading: false,
  toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
  loadCart: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      set({ isLoading: true });
      const data = await api.getCart();
      set({
        items: data.cart?.items || [],
        total: data.total || 0,
        totalItems: data.totalItems || 0,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
  addItem: async (productId: string) => {
    await api.addToCart(productId);
    await get().loadCart();
  },
  updateItem: async (productId: string, quantity: number) => {
    await api.updateCartItem(productId, quantity);
    await get().loadCart();
  },
  removeItem: async (productId: string) => {
    await api.removeFromCart(productId);
    await get().loadCart();
  },
  clearAll: async () => {
    await api.clearCart();
    set({ items: [], total: 0, totalItems: 0 });
  },
}));

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
