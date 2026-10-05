const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface FetchOptions extends RequestInit {
  body?: any;
}

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  private setTokens(access: string, refresh: string) {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  /**
   * Single-flight refresh. Several fetches often race the same expired access
   * token; the backend rotates (single-uses) refresh tokens, so a second
   * concurrent refresh with the old token would 401 and log the user out.
   * All concurrent callers therefore share ONE refresh request.
   */
  private refreshInFlight: Promise<boolean> | null = null;

  private refreshAccessToken(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.doRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      }

      // Definitive rejection (expired/rotated token) — end the session.
      // Network / 5xx hiccups keep the tokens: a backend blip must not
      // silently log the user out.
      if (res.status >= 400 && res.status < 500) this.clearTokens();
    } catch {
      // transient network error — keep tokens, report failure
    }
    return false;
  }

  async fetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { body, headers: customHeaders, ...rest } = options;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    };

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // If token expired, try refresh
    if (res.status === 401 && token) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
        res = await fetch(`${API_URL}${endpoint}`, {
          ...rest,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
      }
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  }

  async upload<T = any>(endpoint: string, formData: FormData, method = 'POST'): Promise<T> {
    const token = this.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  }

  // Auth
  register = (data: any) => this.fetch('/auth/register', { method: 'POST', body: data });
  login = (data: any) => this.fetch('/auth/login', { method: 'POST', body: data });
  getMe = () => this.fetch('/auth/me');
  logout = () => this.fetch('/auth/logout', { method: 'POST' });

  // Users
  updateProfile = (data: any) => this.fetch('/users/profile', { method: 'PUT', body: data });
  updatePassword = (data: any) => this.fetch('/users/password', { method: 'PUT', body: data });
  uploadAvatar = (formData: FormData) => this.upload('/users/avatar', formData);
  becomeSeller = (data: any) => this.fetch('/users/become-seller', { method: 'POST', body: data });

  // Vehicles
  getBrands = (vehicleType?: string) => this.fetch(`/vehicles/brands${vehicleType ? `?vehicleType=${vehicleType}` : ''}`);
  getModels = (brand?: string) => this.fetch(`/vehicles/models${brand ? `?brand=${brand}` : ''}`);
  getVariants = (model?: string) => this.fetch(`/vehicles/variants${model ? `?model=${model}` : ''}`);
  getVehicleSelect = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/vehicles/select${q ? `?${q}` : ''}`);
  };

  // Categories
  getCategories = () => this.fetch('/categories');
  getCategoriesFlat = () => this.fetch('/categories/all');
  getCategoryBySlug = (slug: string) => this.fetch(`/categories/${slug}`);

  // Products
  getProducts = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/products${q ? `?${q}` : ''}`);
  };
  getProduct = (slug: string) => this.fetch(`/products/${slug}`);
  getRelatedProducts = (id: string) => this.fetch(`/products/${id}/related`);
  createProduct = (data: any) => this.fetch('/products', { method: 'POST', body: data });
  updateProduct = (id: string, data: any) => this.fetch(`/products/${id}`, { method: 'PUT', body: data });
  deleteProduct = (id: string) => this.fetch(`/products/${id}`, { method: 'DELETE' });
  uploadProductImages = (id: string, formData: FormData) => this.upload(`/products/${id}/images`, formData);
  updateCompatibility = (id: string, data: any) => this.fetch(`/products/${id}/compatibility`, { method: 'PUT', body: data });

  // Cart
  getCart = () => this.fetch('/cart');
  addToCart = (productId: string, quantity = 1) => this.fetch('/cart/add', { method: 'POST', body: { productId, quantity } });
  updateCartItem = (productId: string, quantity: number) => this.fetch(`/cart/item/${productId}`, { method: 'PUT', body: { quantity } });
  removeFromCart = (productId: string) => this.fetch(`/cart/item/${productId}`, { method: 'DELETE' });
  clearCart = () => this.fetch('/cart/clear', { method: 'DELETE' });

  // Wishlist
  getWishlist = (page?: number) => this.fetch(`/wishlist?page=${page || 1}`);
  toggleWishlist = (productId: string) => this.fetch('/wishlist/toggle', { method: 'POST', body: { productId } });
  checkWishlist = (productId: string) => this.fetch(`/wishlist/check/${productId}`);

  // Addresses
  getAddresses = () => this.fetch('/addresses');
  createAddress = (data: any) => this.fetch('/addresses', { method: 'POST', body: data });
  updateAddress = (id: string, data: any) => this.fetch(`/addresses/${id}`, { method: 'PUT', body: data });
  deleteAddress = (id: string) => this.fetch(`/addresses/${id}`, { method: 'DELETE' });
  setDefaultAddress = (id: string) => this.fetch(`/addresses/${id}/default`, { method: 'PUT' });

  // Orders
  createOrder = (data: any) => this.fetch('/orders', { method: 'POST', body: data });
  getOrders = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/orders${q ? `?${q}` : ''}`);
  };
  getOrder = (id: string) => this.fetch(`/orders/${id}`);
  cancelOrder = (id: string, reason?: string) => this.fetch(`/orders/${id}/cancel`, { method: 'PUT', body: { reason } });

  // Payment
  createRazorpayOrder = (orderId: string) => this.fetch('/payment/create-order', { method: 'POST', body: { orderId } });
  verifyPayment = (data: any) => this.fetch('/payment/verify', { method: 'POST', body: data });
  getPaymentKey = () => this.fetch('/payment/key');

  // Reviews
  getProductReviews = (productId: string, params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/reviews/product/${productId}${q ? `?${q}` : ''}`);
  };
  createReview = (data: any) => this.fetch('/reviews', { method: 'POST', body: data });
  markHelpful = (reviewId: string) => this.fetch(`/reviews/${reviewId}/helpful`, { method: 'POST' });

  // Seller - Dashboard
  getSellerDashboard = () => this.fetch('/seller/dashboard');

  // Seller - Products
  getSellerProducts = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/seller/products${q ? `?${q}` : ''}`);
  };
  getSellerProduct = (id: string) => this.fetch(`/seller/products/${id}`);
  createSellerProduct = (data: any) => this.fetch('/seller/products', { method: 'POST', body: data });
  updateSellerProduct = (id: string, data: any) => this.fetch(`/seller/products/${id}`, { method: 'PUT', body: data });
  deleteSellerProduct = (id: string) => this.fetch(`/seller/products/${id}`, { method: 'DELETE' });
  toggleSellerProduct = (id: string) => this.fetch(`/seller/products/${id}/toggle`, { method: 'PUT' });
  updateSellerProductStock = (id: string, stock: number) => this.fetch(`/seller/products/${id}/stock`, { method: 'PUT', body: { stock } });
  uploadSellerProductImages = (id: string, formData: FormData) => this.upload(`/seller/products/${id}/images`, formData);
  deleteSellerProductImage = (id: string, imageIndex: number) => this.fetch(`/seller/products/${id}/images/${imageIndex}`, { method: 'DELETE' });

  // Seller - Vehicle Compatibility
  getSellerProductCompatibility = (id: string) => this.fetch(`/seller/products/${id}/compatibility`);
  updateSellerProductCompatibility = (id: string, data: any) => this.fetch(`/seller/products/${id}/compatibility`, { method: 'PUT', body: data });

  // Seller - Orders
  getSellerOrders = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/seller/orders${q ? `?${q}` : ''}`);
  };
  getSellerOrder = (id: string) => this.fetch(`/seller/orders/${id}`);
  updateSellerOrderStatus = (id: string, data: any) => this.fetch(`/seller/orders/${id}/status`, { method: 'PUT', body: data });

  // Seller - Returns
  getSellerReturns = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/seller/returns${q ? `?${q}` : ''}`);
  };
  approveSellerReturn = (id: string) => this.fetch(`/seller/returns/${id}/approve`, { method: 'PUT' });
  rejectSellerReturn = (id: string, reason?: string) => this.fetch(`/seller/returns/${id}/reject`, { method: 'PUT', body: { reason } });

  // Seller - Reviews
  getSellerReviews = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/seller/reviews${q ? `?${q}` : ''}`);
  };
  markReviewHelpful = (id: string) => this.fetch(`/seller/reviews/${id}/helpful`, { method: 'PUT' });

  // Seller - Customers
  getSellerCustomers = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/seller/customers${q ? `?${q}` : ''}`);
  };

  // Seller - Coupons
  getSellerCoupons = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/seller/coupons${q ? `?${q}` : ''}`);
  };
  createSellerCoupon = (data: any) => this.fetch('/seller/coupons', { method: 'POST', body: data });
  updateSellerCoupon = (id: string, data: any) => this.fetch(`/seller/coupons/${id}`, { method: 'PUT', body: data });
  deleteSellerCoupon = (id: string) => this.fetch(`/seller/coupons/${id}`, { method: 'DELETE' });

  // Seller - Notifications
  getSellerNotifications = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/seller/notifications${q ? `?${q}` : ''}`);
  };
  markSellerNotificationRead = (id: string) => this.fetch(`/seller/notifications/${id}/read`, { method: 'PUT' });
  markAllSellerNotificationsRead = () => this.fetch('/seller/notifications/read-all', { method: 'PUT' });

  // Seller - Store / Profile
  getSellerStore = () => this.fetch('/seller/store');
  updateSellerStore = (data: any) => this.fetch('/seller/store', { method: 'PUT', body: data });
  updateSellerPassword = (data: any) => this.fetch('/seller/store/password', { method: 'PUT', body: data });

  // Seller - Payouts
  getSellerPayouts = () => this.fetch('/seller/payouts');
  updateSellerBankDetails = (data: any) => this.fetch('/seller/payouts/bank', { method: 'PUT', body: data });

  // Seller - Reports
  getSellerSalesReport = (period?: string) => this.fetch(`/seller/reports/sales?period=${period || '30'}`);

  // Admin - Dashboard
  getAdminDashboard = () => this.fetch('/admin/dashboard');

  // Admin - Users
  getAdminUsers = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/admin/users${q ? `?${q}` : ''}`);
  };
  getAdminUser = (id: string) => this.fetch(`/admin/users/${id}`);
  updateAdminUser = (id: string, data: any) => this.fetch(`/admin/users/${id}`, { method: 'PUT', body: data });
  deleteAdminUser = (id: string) => this.fetch(`/admin/users/${id}`, { method: 'DELETE' });
  activateAdminUser = (id: string) => this.fetch(`/admin/users/${id}/activate`, { method: 'PUT' });

  // Admin - Sellers
  getAdminSellers = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/admin/sellers${q ? `?${q}` : ''}`);
  };
  approveSeller = (id: string) => this.fetch(`/admin/sellers/${id}/approve`, { method: 'PUT' });
  rejectSeller = (id: string) => this.fetch(`/admin/sellers/${id}/reject`, { method: 'PUT' });
  toggleSeller = (id: string) => this.fetch(`/admin/sellers/${id}/toggle`, { method: 'PUT' });

  // Admin - Products
  getAdminProducts = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/admin/products${q ? `?${q}` : ''}`);
  };
  approveProduct = (id: string) => this.fetch(`/admin/products/${id}/approve`, { method: 'PUT' });
  rejectProduct = (id: string) => this.fetch(`/admin/products/${id}/reject`, { method: 'PUT' });
  toggleProduct = (id: string) => this.fetch(`/admin/products/${id}/toggle`, { method: 'PUT' });
  deleteAdminProduct = (id: string) => this.fetch(`/admin/products/${id}`, { method: 'DELETE' });
  updateProductStock = (id: string, stock: number) => this.fetch(`/admin/products/${id}/stock`, { method: 'PUT', body: { stock } });

  // Admin - Orders
  getAdminOrders = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/admin/orders${q ? `?${q}` : ''}`);
  };
  getAdminOrder = (id: string) => this.fetch(`/admin/orders/${id}`);
  updateAdminOrderStatus = (id: string, data: any) => this.fetch(`/admin/orders/${id}/status`, { method: 'PUT', body: data });

  // Admin - Reviews
  getAdminReviews = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/admin/reviews${q ? `?${q}` : ''}`);
  };
  deleteAdminReview = (id: string) => this.fetch(`/admin/reviews/${id}`, { method: 'DELETE' });

  // Admin - Categories
  adminGetCategories = () => this.fetch('/admin/categories');
  adminCreateCategory = (data: any) => this.fetch('/categories', { method: 'POST', body: data });
  adminUpdateCategory = (id: string, data: any) => this.fetch(`/categories/${id}`, { method: 'PUT', body: data });
  adminDeleteCategory = (id: string) => this.fetch(`/categories/${id}`, { method: 'DELETE' });

  // Admin - Vehicles
  adminGetBrands = () => this.fetch('/admin/brands');
  adminGetModels = (brand?: string) => this.fetch(`/admin/models${brand ? `?brand=${brand}` : ''}`);
  adminGetVariants = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/admin/variants${q ? `?${q}` : ''}`);
  };
  adminCreateBrand = (data: any) => this.fetch('/vehicles/brands', { method: 'POST', body: data });
  adminUpdateBrand = (id: string, data: any) => this.fetch(`/vehicles/brands/${id}`, { method: 'PUT', body: data });
  adminDeleteBrand = (id: string) => this.fetch(`/vehicles/brands/${id}`, { method: 'DELETE' });
  adminCreateModel = (data: any) => this.fetch('/vehicles/models', { method: 'POST', body: data });
  adminUpdateModel = (id: string, data: any) => this.fetch(`/vehicles/models/${id}`, { method: 'PUT', body: data });
  adminDeleteModel = (id: string) => this.fetch(`/vehicles/models/${id}`, { method: 'DELETE' });
  adminCreateVariant = (data: any) => this.fetch('/admin/variants', { method: 'POST', body: data });
  adminUpdateVariant = (id: string, data: any) => this.fetch(`/admin/variants/${id}`, { method: 'PUT', body: data });
  adminDeleteVariant = (id: string) => this.fetch(`/admin/variants/${id}`, { method: 'DELETE' });

  // Admin - Coupons
  getAdminCoupons = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/admin/coupons${q ? `?${q}` : ''}`);
  };
  createAdminCoupon = (data: any) => this.fetch('/admin/coupons', { method: 'POST', body: data });
  updateAdminCoupon = (id: string, data: any) => this.fetch(`/admin/coupons/${id}`, { method: 'PUT', body: data });
  deleteAdminCoupon = (id: string) => this.fetch(`/admin/coupons/${id}`, { method: 'DELETE' });

  // Admin - Notifications
  getAdminNotifications = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/admin/notifications${q ? `?${q}` : ''}`);
  };
  createAdminNotification = (data: any) => this.fetch('/admin/notifications', { method: 'POST', body: data });
  markNotificationRead = (id: string) => this.fetch(`/admin/notifications/${id}/read`, { method: 'PUT' });

  // Admin - Inventory
  getAdminInventory = (params?: any) => {
    const q = new URLSearchParams(params).toString();
    return this.fetch(`/admin/inventory${q ? `?${q}` : ''}`);
  };
}

export const api = new ApiClient();
export default api;
