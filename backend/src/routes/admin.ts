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
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getPaginationMeta, generateSlug } from '../utils/helpers';

const asyncHandler = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const router = Router();

router.use(authenticate, authorize('admin'));

// ==================== DASHBOARD ====================

router.get('/dashboard', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [
    totalUsers, totalSellers, pendingSellers, totalProducts, activeProducts,
    pendingProducts, inactiveProducts, totalOrders, pendingOrders, deliveredOrders,
    cancelledOrders, totalRevenue, revenueAgg, lowStockProducts, recentOrders,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ role: 'seller', 'sellerInfo.isApproved': false }),
    Product.countDocuments(),
    Product.countDocuments({ isActive: true, isApproved: true }),
    Product.countDocuments({ isApproved: false, isActive: true }),
    Product.countDocuments({ isActive: false }),
    Order.countDocuments(),
    Order.countDocuments({ orderStatus: 'pending' }),
    Order.countDocuments({ orderStatus: 'delivered' }),
    Order.countDocuments({ orderStatus: 'cancelled' }),
    Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, avg: { $avg: '$total' }, count: { $sum: 1 } } }]),
    Product.countDocuments({ isActive: true, isApproved: true, stock: { $lte: 5 } }),
    Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
  const avgOrderValue = revenueAgg.length > 0 ? Math.round(revenueAgg[0].avg) : 0;

  const ordersByStatus = await Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyRevenue = await Order.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo }, paymentStatus: 'paid' } },
    { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const topSellingProducts = await Product.find({ isActive: true, isApproved: true })
    .sort({ totalSales: -1 }).limit(5).select('name totalSales price images').lean();

  res.json({
    stats: {
      totalUsers, totalSellers, pendingSellers, totalProducts, activeProducts,
      pendingProducts, inactiveProducts, totalOrders, pendingOrders, deliveredOrders,
      cancelledOrders, totalRevenue: revenue, avgOrderValue, lowStockProducts,
      ordersByStatus, monthlyRevenue, recentOrders, topSellingProducts,
    },
  });
}));

// ==================== USER MANAGEMENT ====================

router.get('/users', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', role, search } = req.query;
  const filter: any = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter).select('-password -refreshToken')
    .sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean();
  res.json({ users, pagination: getPaginationMeta(total, pageNum, limitNum) });
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
  res.json({ user });
}));

router.delete('/users/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  res.json({ message: 'User deactivated' });
}));

router.put('/users/:id/activate', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true })
    .select('-password -refreshToken');
  if (!user) throw new AppError('User not found', 404);
  res.json({ user });
}));

// ==================== SELLER MANAGEMENT ====================

router.get('/sellers', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', approved, search } = req.query;
  const filter: any = { role: 'seller' };
  if (approved === 'true') filter['sellerInfo.isApproved'] = true;
  else if (approved === 'false') filter['sellerInfo.isApproved'] = false;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'sellerInfo.businessName': { $regex: search, $options: 'i' } },
    ];
  }
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = await User.countDocuments(filter);
  const sellers = await User.find(filter).select('-password -refreshToken')
    .sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean();
  res.json({ sellers, pagination: getPaginationMeta(total, pageNum, limitNum) });
}));

router.put('/sellers/:id/approve', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'seller') throw new AppError('Seller not found', 404);
  user.sellerInfo!.isApproved = true;
  await user.save();
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
  res.json({ user: user.toJSON() });
}));

// ==================== PRODUCT MANAGEMENT ====================

router.get('/products', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', status, search, category, seller } = req.query;
  const filter: any = {};
  if (status === 'approved') { filter.isApproved = true; filter.isActive = true; }
  else if (status === 'pending') { filter.isApproved = false; filter.isActive = true; }
  else if (status === 'inactive') { filter.isActive = false; }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) filter.category = category;
  if (seller) filter.seller = seller;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('category', 'name slug')
    .populate('seller', 'name email sellerInfo.businessName')
    .sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean();
  res.json({ products, pagination: getPaginationMeta(total, pageNum, limitNum) });
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
  const { page = '1', limit = '20', status, paymentStatus } = req.query;
  const filter: any = {};
  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter).populate('user', 'name email phone')
    .sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean();
  res.json({ orders, pagination: getPaginationMeta(total, pageNum, limitNum) });
}));

router.get('/orders/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('items.seller', 'name email sellerInfo.businessName').lean();
  if (!order) throw new AppError('Order not found', 404);
  res.json({ order });
}));

router.put('/orders/:id/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderStatus, trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  order.orderStatus = orderStatus;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (orderStatus === 'delivered') order.deliveredAt = new Date();
  if (orderStatus === 'cancelled') order.cancelledAt = new Date();
  await order.save();
  res.json({ order });
}));

// ==================== REVIEW MANAGEMENT ====================

router.get('/reviews', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = await Review.countDocuments();
  const reviews = await Review.find()
    .populate('user', 'name email').populate('product', 'name slug')
    .sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean();
  res.json({ reviews, pagination: getPaginationMeta(total, pageNum, limitNum) });
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
  const { page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = await Coupon.countDocuments();
  const coupons = await Coupon.find().sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum).limit(limitNum).lean();
  res.json({ coupons, pagination: getPaginationMeta(total, pageNum, limitNum) });
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
  const { page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = await Notification.countDocuments();
  const notifications = await Notification.find().populate('user', 'name email')
    .sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean();
  res.json({ notifications, pagination: getPaginationMeta(total, pageNum, limitNum) });
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
  const { page = '1', limit = '20', lowStock } = req.query;
  const filter: any = { isActive: true, isApproved: true };
  if (lowStock === 'true') filter.stock = { $lte: 5 };
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('category', 'name').populate('seller', 'name sellerInfo.businessName')
    .sort({ stock: 1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean();
  res.json({ products, pagination: getPaginationMeta(total, pageNum, limitNum) });
}));

export default router;
