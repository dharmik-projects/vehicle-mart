import { Router, Response, NextFunction } from 'express';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import Category from '../models/Category';
import VehicleBrand from '../models/VehicleBrand';
import VehicleModel from '../models/VehicleModel';
import VehicleVariant from '../models/VehicleVariant';
import Review from '../models/Review';
import Coupon from '../models/Coupon';
import Notification from '../models/Notification';
import ProductCompatibility from '../models/ProductCompatibility';
import { AuthRequest, authenticate, authorize, clearUserCache } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getPaginationMeta, generateSlug, parsePagination, escapeRegex } from '../utils/helpers';
import { transitionOrder } from '../utils/orderLifecycle';

const asyncHandler = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const router = Router();

router.use(authenticate, authorize('admin'));

// ==================== DASHBOARD ====================

router.get('/dashboard', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    totalUsers, totalSellers, pendingSellers,
    activeProducts, pendingProducts, inactiveProducts,
    orderDistribution, revenueAgg, pendingAgg,
    monthlyRevenue, lowStockProducts, recentOrders, topSellingProducts,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ role: 'seller', 'sellerInfo.isApproved': false }),
    Product.countDocuments({ isActive: true, isApproved: true }),
    Product.countDocuments({ isApproved: false, isActive: true }),
    Product.countDocuments({ isActive: false }),
    // One scan of the orders collection yields every status/payment count.
    Order.aggregate([
      { $group: { _id: { s: '$orderStatus', p: '$paymentStatus' }, n: { $sum: 1 } } },
    ]),
    // Collected revenue: verified/paid money, excluding cancelled & returned orders.
    Order.aggregate([
      { $match: { paymentStatus: 'paid', orderStatus: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 }, avg: { $avg: '$total' } } },
    ]),
    // Still-collectible money: not yet collected, on live orders only.
    Order.aggregate([
      { $match: { paymentStatus: { $in: ['pending', 'failed'] }, orderStatus: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, paymentStatus: 'paid', orderStatus: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Product.countDocuments({ isActive: true, isApproved: true, stock: { $lte: 5 } }),
    Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(10).lean(),
    Product.find({ isActive: true, isApproved: true }).sort({ totalSales: -1 }).limit(5).select('name totalSales price images').lean(),
  ]);

  // Derive every order card from the single joint distribution.
  let totalOrders = 0;
  let paidOrders = 0;
  let pendingPayments = 0;
  let refundedOrders = 0;
  const statusCount: Record<string, number> = {};
  for (const row of orderDistribution) {
    const s: string = row._id?.s;
    const p: string = row._id?.p;
    totalOrders += row.n;
    statusCount[s] = (statusCount[s] || 0) + row.n;
    // "Paid orders" = money actually collected on a live order.
    if (p === 'paid' && s !== 'cancelled' && s !== 'returned') paidOrders += row.n;
    // Awaiting payment: payment not completed and the order is still live.
    if ((p === 'pending' || p === 'failed') && s !== 'cancelled' && s !== 'returned') pendingPayments += row.n;
    if (p === 'refunded') refundedOrders += row.n;
  }
  const ordersByStatus = Object.entries(statusCount).map(([status, count]) => ({ _id: status, count }));

  const totalProducts = activeProducts + pendingProducts + inactiveProducts;
  const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
  const avgOrderValue = revenueAgg.length > 0 ? Math.round(revenueAgg[0].avg) : 0;
  const pendingRevenue = pendingAgg.length > 0 ? pendingAgg[0].total : 0;

  res.json({
    stats: {
      totalUsers, totalSellers, pendingSellers, totalProducts, activeProducts,
      pendingProducts, inactiveProducts, totalOrders,
      pendingOrders: statusCount['pending'] || 0,
      deliveredOrders: statusCount['delivered'] || 0,
      cancelledOrders: statusCount['cancelled'] || 0,
      paidOrders, pendingPayments, refundedOrders,
      totalRevenue, pendingRevenue, avgOrderValue, lowStockProducts,
      ordersByStatus, monthlyRevenue, recentOrders, topSellingProducts,
    },
  });
}));

// ==================== USER MANAGEMENT ====================

router.get('/users', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { role, search } = req.query;
  const filter: any = {};
  if (role) filter.role = role;
  if (search) {
    const term = escapeRegex(String(search));
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
    ];
  }
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).select('-password -refreshToken')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  res.json({ users, pagination: getPaginationMeta(total, page, limit) });
}));

router.get('/users/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id).select('-password -refreshToken').lean();
  if (!user) throw new AppError('User not found', 404);
  res.json({ user });
}));

router.put('/users/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { role, isActive, name, phone, sellerInfo } = req.body;
  const updates: any = {};
  if (role) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;
  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (sellerInfo) updates.sellerInfo = sellerInfo;
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    .select('-password -refreshToken');
  if (!user) throw new AppError('User not found', 404);
  clearUserCache(req.params.id);
  res.json({ user });
}));

router.delete('/users/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  clearUserCache(req.params.id);
  res.json({ message: 'User deactivated' });
}));

router.put('/users/:id/activate', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true })
    .select('-password -refreshToken');
  if (!user) throw new AppError('User not found', 404);
  clearUserCache(req.params.id);
  res.json({ user });
}));

// ==================== SELLER MANAGEMENT ====================

router.get('/sellers', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { approved, search } = req.query;
  const filter: any = { role: 'seller' };
  if (approved === 'true') filter['sellerInfo.isApproved'] = true;
  else if (approved === 'false') filter['sellerInfo.isApproved'] = false;
  if (search) {
    const term = escapeRegex(String(search));
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { 'sellerInfo.businessName': { $regex: term, $options: 'i' } },
    ];
  }
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const [total, sellers] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).select('-password -refreshToken')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  res.json({ sellers, pagination: getPaginationMeta(total, page, limit) });
}));

router.put('/sellers/:id/approve', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'seller') throw new AppError('Seller not found', 404);
  user.sellerInfo!.isApproved = true;
  await user.save();
  clearUserCache(String(user._id));
  await Notification.create({
    user: user._id, title: 'Seller Application Approved',
    message: 'Your seller account has been approved. You can now list products.', type: 'success',
  });
  res.json({ message: 'Seller approved', user: user.toJSON() });
}));

router.put('/sellers/:id/reject', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'seller') throw new AppError('Seller not found', 404);
  user.sellerInfo!.isApproved = false;
  await user.save();
  clearUserCache(String(user._id));
  await Notification.create({
    user: user._id, title: 'Seller Application Rejected',
    message: 'Your seller application has been rejected. Please contact support for details.', type: 'error',
  });
  res.json({ message: 'Seller rejected' });
}));

router.put('/sellers/:id/toggle', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'seller') throw new AppError('Seller not found', 404);
  user.isActive = !user.isActive;
  await user.save();
  clearUserCache(String(user._id));
  res.json({ user: user.toJSON() });
}));

// ==================== PRODUCT MANAGEMENT ====================

router.get('/products', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, search, category, seller } = req.query;
  const filter: any = {};
  if (status === 'approved') { filter.isApproved = true; filter.isActive = true; }
  else if (status === 'pending') { filter.isApproved = false; filter.isActive = true; }
  else if (status === 'inactive') { filter.isActive = false; }
  if (search) {
    const term = escapeRegex(String(search));
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { sku: { $regex: term, $options: 'i' } },
      { brand: { $regex: term, $options: 'i' } },
    ];
  }
  if (category) filter.category = category;
  if (seller) filter.seller = seller;
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('seller', 'name email sellerInfo.businessName')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  res.json({ products, pagination: getPaginationMeta(total, page, limit) });
}));

router.put('/products/:id/approve', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
  if (!product) throw new AppError('Product not found', 404);
  await Notification.create({
    user: product.seller, title: 'Product Approved',
    message: `Your product "${product.name}" has been approved and is now live.`, type: 'success',
  });
  res.json({ product });
}));

router.put('/products/:id/reject', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isApproved: false }, { new: true });
  if (!product) throw new AppError('Product not found', 404);
  res.json({ product });
}));

router.put('/products/:id/toggle', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  product.isActive = !product.isActive;
  await product.save();
  res.json({ product });
}));

router.delete('/products/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) throw new AppError('Product not found', 404);
  await ProductCompatibility.deleteMany({ product: req.params.id });
  res.json({ message: 'Product deactivated' });
}));

router.put('/products/:id/stock', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { stock } = req.body;
  const product = await Product.findByIdAndUpdate(req.params.id, { stock: Number(stock) }, { new: true });
  if (!product) throw new AppError('Product not found', 404);
  res.json({ product });
}));

// ==================== ORDER MANAGEMENT ====================

router.get('/orders', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, paymentStatus } = req.query;
  const filter: any = {};
  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter).populate('user', 'name email phone')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  res.json({ orders, pagination: getPaginationMeta(total, page, limit) });
}));

router.get('/orders/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('items.seller', 'name email sellerInfo.businessName').lean();
  if (!order) throw new AppError('Order not found', 404);
  res.json({ order });
}));

router.put('/orders/:id/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderStatus, trackingNumber, reason } = req.body;
  if (!orderStatus || typeof orderStatus !== 'string') {
    throw new AppError('Order status is required', 400);
  }
  // Shared state machine: validates the transition and applies stock/payment
  // side effects exactly once (same rules as the seller route).
  const { order } = await transitionOrder(req.params.id, orderStatus, {
    trackingNumber,
    reason,
    cancelReason: reason,
  });
  res.json({ order });
}));

// ==================== REVIEW MANAGEMENT ====================

router.get('/reviews', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const [total, reviews] = await Promise.all([
    Review.countDocuments(),
    Review.find()
      .populate('user', 'name email').populate('product', 'name slug')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  res.json({ reviews, pagination: getPaginationMeta(total, page, limit) });
}));

router.delete('/reviews/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  const productId = review.product;
  await review.deleteOne();
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(stats[0].avg * 10) / 10, totalReviews: stats[0].count,
    });
  } else {
    await Product.findByIdAndUpdate(productId, { averageRating: 0, totalReviews: 0 });
  }
  res.json({ message: 'Review deleted' });
}));

// ==================== CATEGORY MANAGEMENT ====================

router.get('/categories', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const categories = await Category.find()
    .populate('parent', 'name slug').sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ categories });
}));

// ==================== VEHICLE DATA MANAGEMENT ====================

router.get('/brands', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const brands = await VehicleBrand.find().sort({ name: 1 }).lean();
  res.json({ brands });
}));

router.get('/models', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { brand } = req.query;
  const filter: any = {};
  if (brand) filter.brand = brand;
  const models = await VehicleModel.find(filter).populate('brand', 'name slug').sort({ name: 1 }).lean();
  res.json({ models });
}));

router.get('/variants', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { model, brand } = req.query;
  const filter: any = {};
  if (model) filter.vehicleModel = model;
  if (brand) {
    const modelIds = await VehicleModel.distinct('_id', { brand });
    filter.vehicleModel = { $in: modelIds };
  }
  const variants = await VehicleVariant.find(filter)
    .populate({ path: 'vehicleModel', select: 'name slug brand', populate: { path: 'brand', select: 'name slug' } })
    .sort({ yearFrom: -1 }).lean();
  res.json({ variants });
}));

router.post('/variants', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, vehicleModel, yearFrom, yearTo, engineType, engineCC, fuelType, transmission } = req.body;
  if (!name || !name.trim()) throw new AppError('Variant name is required', 400);
  if (!vehicleModel) throw new AppError('Model is required', 400);
  const slug = `${name}-${engineType}-${engineCC || ''}`.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');
  const variant = await VehicleVariant.create({
    name: name.trim(), slug, vehicleModel, yearFrom, yearTo, engineType, engineCC, fuelType, transmission,
  });
  res.status(201).json({ variant });
}));

router.put('/variants/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const variant = await VehicleVariant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!variant) throw new AppError('Variant not found', 404);
  res.json({ variant });
}));

router.delete('/variants/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const variant = await VehicleVariant.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!variant) throw new AppError('Variant not found', 404);
  res.json({ message: 'Variant deactivated' });
}));

// ==================== COUPON MANAGEMENT ====================

router.get('/coupons', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const [total, coupons] = await Promise.all([
    Coupon.countDocuments(),
    Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  res.json({ coupons, pagination: getPaginationMeta(total, page, limit) });
}));

router.post('/coupons', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { code, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, expiresAt } = req.body;
  if (!code) throw new AppError('Coupon code is required', 400);
  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) throw new AppError('Coupon code already exists', 400);
  const coupon = await Coupon.create({
    code: code.toUpperCase(), description, discountType, discountValue,
    minOrderAmount: minOrderAmount || 0, maxDiscount, usageLimit: usageLimit || 0, expiresAt,
  });
  res.status(201).json({ coupon });
}));

router.put('/coupons/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!coupon) throw new AppError('Coupon not found', 404);
  res.json({ coupon });
}));

router.delete('/coupons/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!coupon) throw new AppError('Coupon not found', 404);
  res.json({ message: 'Coupon deactivated' });
}));

// ==================== NOTIFICATION MANAGEMENT ====================

router.get('/notifications', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const [total, notifications] = await Promise.all([
    Notification.countDocuments(),
    Notification.find().populate('user', 'name email')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  res.json({ notifications, pagination: getPaginationMeta(total, page, limit) });
}));

router.post('/notifications', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { user, title, message, type, link } = req.body;
  const notification = await Notification.create({ user, title, message, type, link });
  res.status(201).json({ notification });
}));

router.put('/notifications/:id/read', asyncHandler(async (req: AuthRequest, res: Response) => {
  const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!notification) throw new AppError('Notification not found', 404);
  res.json({ notification });
}));

// ==================== INVENTORY / LOW STOCK ====================

router.get('/inventory', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { lowStock } = req.query;
  const filter: any = { isActive: true, isApproved: true };
  if (lowStock === 'true') filter.stock = { $lte: 5 };
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .populate('category', 'name').populate('seller', 'name sellerInfo.businessName')
      .sort({ stock: 1 }).skip(skip).limit(limit).lean(),
  ]);
  res.json({ products, pagination: getPaginationMeta(total, page, limit) });
}));

export default router;
