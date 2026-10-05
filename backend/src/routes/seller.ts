import { Router, Response, NextFunction } from 'express';
import User from '../models/User';
import Product from '../models/Product';
import ProductCompatibility from '../models/ProductCompatibility';
import Order from '../models/Order';
import Review from '../models/Review';
import Coupon from '../models/Coupon';
import Notification from '../models/Notification';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getPaginationMeta, generateSlug, parsePagination, escapeRegex } from '../utils/helpers';
import { transitionOrder, releaseStock, decTotalSales } from '../utils/orderLifecycle';
import { uploadMultiple } from '../middleware/upload';
import mongoose from 'mongoose';

const asyncHandler = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const router = Router();

router.use(authenticate, authorize('seller'));

// ==================== DASHBOARD ====================

router.get('/dashboard', asyncHandler(async (req: AuthRequest, res: Response) => {
  const sellerId = req.user!._id;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    totalProducts, activeProducts, pendingProducts, inactiveProducts, lowStockProducts,
    orderDistribution, revenueAgg, pendingAgg,
    monthlySales, recentOrders, topProducts,
  ] = await Promise.all([
    Product.countDocuments({ seller: sellerId }),
    Product.countDocuments({ seller: sellerId, isActive: true, isApproved: true }),
    Product.countDocuments({ seller: sellerId, isApproved: false, isActive: true }),
    Product.countDocuments({ seller: sellerId, isActive: false }),
    Product.countDocuments({ seller: sellerId, isActive: true, isApproved: true, stock: { $lte: 5 } }),
    // One scan yields every status/payment count for this seller's orders.
    Order.aggregate([
      { $match: { 'items.seller': sellerId } },
      { $group: { _id: { s: '$orderStatus', p: '$paymentStatus' }, n: { $sum: 1 } } },
    ]),
    // ACTUAL sales: verified/paid money on live orders, this seller's items only.
    Order.aggregate([
      { $match: { 'items.seller': sellerId, paymentStatus: 'paid', orderStatus: { $nin: ['cancelled', 'returned'] } } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      { $group: { _id: null, totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, totalSold: { $sum: '$items.quantity' } } },
    ]),
    // Pending revenue: collectible but not yet collected, live orders only.
    Order.aggregate([
      { $match: { 'items.seller': sellerId, paymentStatus: { $in: ['pending', 'failed'] }, orderStatus: { $nin: ['cancelled', 'returned'] } } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
    ]),
    Order.aggregate([
      { $match: { 'items.seller': sellerId, createdAt: { $gte: sixMonthsAgo }, paymentStatus: 'paid', orderStatus: { $nin: ['cancelled', 'returned'] } } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          sales: { $sum: '$items.quantity' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Order.find({ 'items.seller': sellerId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('user items total orderStatus paymentStatus paymentMethod createdAt')
      .lean(),
    Product.find({ seller: sellerId, isActive: true, isApproved: true })
      .sort({ totalSales: -1 }).limit(5).select('name totalSales price images averageRating').lean(),
  ]);

  let totalOrders = 0;
  let paidOrders = 0;
  const statusCount: Record<string, number> = {};
  for (const row of orderDistribution) {
    const s: string = row._id?.s;
    const p: string = row._id?.p;
    totalOrders += row.n;
    statusCount[s] = (statusCount[s] || 0) + row.n;
    if (p === 'paid' && s !== 'cancelled' && s !== 'returned') paidOrders += row.n;
  }

  const revenue = revenueAgg.length > 0 ? revenueAgg[0] : { totalRevenue: 0, totalSold: 0 };

  res.json({
    stats: {
      totalProducts, activeProducts, pendingProducts, inactiveProducts,
      totalOrders,
      pendingOrders: statusCount['pending'] || 0,
      processingOrders: statusCount['processing'] || 0,
      shippedOrders: statusCount['shipped'] || 0,
      deliveredOrders: statusCount['delivered'] || 0,
      cancelledOrders: statusCount['cancelled'] || 0,
      returnedOrders: statusCount['returned'] || 0,
      paidOrders,
      totalRevenue: revenue.totalRevenue, totalSold: revenue.totalSold,
      pendingRevenue: pendingAgg.length > 0 ? pendingAgg[0].total : 0,
      lowStockProducts, monthlySales, recentOrders, topProducts,
    },
  });
}));

// ==================== PRODUCTS ====================

router.get('/products', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, search } = req.query;
  const filter: any = { seller: req.user!._id };
  if (status === 'active') filter.isActive = true;
  else if (status === 'inactive') filter.isActive = false;
  else if (status === 'pending') { filter.isApproved = false; filter.isActive = true; }
  else if (status === 'low-stock') filter.stock = { $lte: 5 };
  if (search) {
    const term = escapeRegex(String(search));
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { sku: { $regex: term, $options: 'i' } },
      { brand: { $regex: term, $options: 'i' } },
    ];
  }

  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const productIds = products.map((p: any) => p._id);
  const compatData = await ProductCompatibility.find({ product: { $in: productIds } })
    .populate('brand', 'name slug')
    .populate('vehicleModel', 'name slug')
    .populate('variant', 'name slug yearFrom yearTo')
    .lean();

  const compatMap = new Map<string, any[]>();
  for (const c of compatData) {
    const pid = c.product.toString();
    if (!compatMap.has(pid)) compatMap.set(pid, []);
    compatMap.get(pid)!.push(c);
  }

  const productsWithCompat = products.map((p: any) => ({
    ...p,
    _compat: compatMap.get(p._id.toString()) || [],
  }));

  res.json({ products: productsWithCompat, pagination: getPaginationMeta(total, page, limit) });
}));

router.get('/products/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user!._id })
    .populate('category', 'name slug');
  if (!product) throw new AppError('Product not found', 404);
  res.json({ product });
}));

router.post('/products', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description, brand, category, price, mrp, partNumber, oemPartNumber, stock, warranty, specifications, weight, dimensions, tags } = req.body;
  if (!name || !description || !brand || !category || price === undefined || mrp === undefined) {
    throw new AppError('Required fields missing', 400);
  }

  const slug = generateSlug(name);
  const existing = await Product.findOne({ slug });
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  const sku = `SP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const product = await Product.create({
    name, slug: finalSlug, description, sku, brand,
    category, seller: req.user!._id,
    price: Number(price), mrp: Number(mrp),
    partNumber, oemPartNumber,
    stock: stock !== undefined ? Number(stock) : 0,
    lowStockThreshold: 5,
    warranty, specifications, weight, dimensions, tags,
    images: [], isActive: true, isApproved: false,
  });

  res.status(201).json({ product });
}));

router.put('/products/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user!._id });
  if (!product) throw new AppError('Product not found', 404);

  const allowed = ['name', 'description', 'brand', 'category', 'price', 'mrp', 'discount', 'partNumber', 'oemPartNumber', 'stock', 'lowStockThreshold', 'warranty', 'specifications', 'weight', 'dimensions', 'tags', 'originCountry'];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.name && !updates.slug) {
    updates.slug = generateSlug(updates.name);
  }

  const updated = await Product.findByIdAndUpdate(product._id, updates, { new: true, runValidators: true });
  res.json({ product: updated });
}));

router.delete('/products/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user!._id });
  if (!product) throw new AppError('Product not found', 404);
  await Product.findByIdAndUpdate(product._id, { isActive: false });
  res.json({ message: 'Product deactivated' });
}));

router.put('/products/:id/toggle', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user!._id });
  if (!product) throw new AppError('Product not found', 404);
  product.isActive = !product.isActive;
  await product.save();
  res.json({ product });
}));

router.put('/products/:id/stock', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { stock } = req.body;
  const product = await Product.findOne({ _id: req.params.id, seller: req.user!._id });
  if (!product) throw new AppError('Product not found', 404);
  product.stock = Number(stock);
  await product.save();
  res.json({ product });
}));

router.post('/products/:id/images', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user!._id });
  if (!product) throw new AppError('Product not found', 404);

  uploadMultiple(req, res, async (err) => {
    if (err) throw new AppError(err.message, 400);
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) throw new AppError('No images uploaded', 400);

    const { uploadToCloudinary } = await import('../middleware/upload');
    const newImages = [];
    for (const file of files) {
      const result = await uploadToCloudinary(file, 'vehiclepart/products');
      newImages.push({ url: result.url, alt: product.name, isPrimary: newImages.length === 0 && product.images.length === 0 });
    }
    product.images.push(...newImages as any);
    await product.save();
    res.json({ product });
  });
}));

router.delete('/products/:id/images/:imageIndex', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user!._id });
  if (!product) throw new AppError('Product not found', 404);
  const idx = parseInt(req.params.imageIndex);
  if (idx < 0 || idx >= product.images.length) throw new AppError('Invalid image index', 400);
  product.images.splice(idx, 1);
  await product.save();
  res.json({ product });
}));

// ==================== VEHICLE COMPATIBILITY ====================

router.get('/products/:id/compatibility', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user!._id });
  if (!product) throw new AppError('Product not found', 404);

  const compatibility = await ProductCompatibility.find({ product: product._id })
    .populate('brand', 'name slug vehicleType')
    .populate('vehicleModel', 'name slug')
    .populate('variant', 'name slug yearFrom yearTo engineType engineCC fuelType')
    .lean();

  res.json({ compatibility });
}));

router.put('/products/:id/compatibility', asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user!._id });
  if (!product) throw new AppError('Product not found', 404);

  const { compatibilityType, compatibility } = req.body;

  await ProductCompatibility.deleteMany({ product: product._id });

  if (compatibilityType === 'universal') {
    await ProductCompatibility.create({
      product: product._id,
      vehicleType: 'universal',
      isUniversal: true,
    });
  } else if (compatibilityType === 'vehicleType' && req.body.vehicleType) {
    await ProductCompatibility.create({
      product: product._id,
      vehicleType: req.body.vehicleType,
      isUniversal: false,
    });
  } else if (compatibilityType === 'specific' && Array.isArray(compatibility)) {
    for (const entry of compatibility) {
      const doc: any = {
        product: product._id,
        vehicleType: entry.vehicleType || 'car',
        isUniversal: false,
      };
      if (entry.brand) doc.brand = entry.brand;
      if (entry.vehicleModel) doc.vehicleModel = entry.vehicleModel;
      if (entry.variant) doc.variant = entry.variant;
      if (entry.yearFrom) doc.yearFrom = Number(entry.yearFrom);
      if (entry.yearTo) doc.yearTo = Number(entry.yearTo);
      if (entry.notes) doc.notes = entry.notes;
      await ProductCompatibility.create(doc);
    }
  }

  const updated = await ProductCompatibility.find({ product: product._id })
    .populate('brand', 'name slug vehicleType')
    .populate('vehicleModel', 'name slug')
    .populate('variant', 'name slug yearFrom yearTo engineType engineCC fuelType')
    .lean();

  res.json({ compatibility: updated });
}));

// ==================== ORDERS ====================

router.get('/orders', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, search } = req.query;
  const filter: any = { 'items.seller': req.user!._id };
  if (status) filter.orderStatus = status;
  if (search) {
    filter.$or = [
      { _id: { $regex: escapeRegex(String(search)), $options: 'i' } },
    ];
  }

  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.json({ orders, pagination: getPaginationMeta(total, page, limit) });
}));

router.get('/orders/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, 'items.seller': req.user!._id })
    .populate('user', 'name email phone');
  if (!order) throw new AppError('Order not found', 404);
  res.json({ order });
}));

router.put('/orders/:id/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderStatus, trackingNumber, reason } = req.body;
  if (!orderStatus || typeof orderStatus !== 'string') throw new AppError('Invalid status', 400);

  const existing = await Order.findOne({ _id: req.params.id, 'items.seller': req.user!._id })
    .select('_id');
  if (!existing) throw new AppError('Order not found', 404);

  // Shared state machine: validates the transition and applies the inventory
  // (stock restore on cancel) and payment (COD paid on delivery) side effects
  // exactly once — the same rules the admin route uses.
  const { order } = await transitionOrder(existing._id, orderStatus, {
    trackingNumber,
    reason,
    cancelReason: reason,
  });

  await Notification.create({
    user: order!.user, title: 'Order Updated',
    message: `Your order #${order!._id.toString().slice(-8).toUpperCase()} has been ${orderStatus}.`,
    type: orderStatus === 'delivered' ? 'success' : 'info',
    link: `/orders/${order!._id}`,
  });

  res.json({ order });
}));

// ==================== RETURNS / REFUNDS ====================

router.get('/returns', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  const filter: any = { 'items.seller': req.user!._id, orderStatus: 'returned' };
  // pending = refund not processed yet, approved = refunded.
  // Rejected returns are moved back to "delivered", so none match.
  if (status === 'pending') filter.paymentStatus = { $ne: 'refunded' };
  else if (status === 'approved') filter.paymentStatus = 'refunded';
  else if (status === 'rejected') {
    res.json({ returns: [], pagination: getPaginationMeta(0, page, limit) });
    return;
  }

  const [total, returns] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.json({ returns, pagination: getPaginationMeta(total, page, limit) });
}));

router.put('/returns/:id/approve', asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'items.seller': req.user!._id,
    orderStatus: 'returned',
  });
  if (!order) throw new AppError('Returnable order not found', 404);
  if (order.paymentStatus === 'refunded') throw new AppError('Return has already been approved', 400);

  // For a paid order, flip paid -> refunded atomically: only one caller can
  // win, so a double click can never refund or adjust sales twice.
  if (order.paymentStatus === 'paid') {
    const pre = await Order.findOneAndUpdate(
      { _id: order._id, orderStatus: 'returned', paymentStatus: 'paid' },
      { $set: { paymentStatus: 'refunded' } },
      { new: false }
    );
    if (!pre) throw new AppError('Return has already been approved', 400);
    await decTotalSales(pre.items);
  }

  // Physical stock goes back to inventory — guarded to happen exactly once.
  await releaseStock(order);

  await Notification.create({
    user: order.user, title: 'Return Approved',
    message: `Your return for order #${order._id.toString().slice(-8).toUpperCase()} has been approved.${order.paymentStatus === 'paid' ? ' Refund will be processed.' : ''}`,
    type: 'success', link: `/orders/${order._id}`,
  });

  const fresh = await Order.findById(order._id);
  res.json({ order: fresh });
}));

router.put('/returns/:id/reject', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const existing = await Order.findOne({ _id: req.params.id, 'items.seller': req.user!._id })
    .select('_id');
  if (!existing) throw new AppError('Order not found', 404);

  // Rejecting the return means the customer keeps the goods: back to delivered.
  // Stock/sales were never released when the order entered "returned", so the
  // inventory needs no adjustment here (the transition handles any edge cases).
  const { order } = await transitionOrder(existing._id, 'delivered');

  await Notification.create({
    user: order!.user, title: 'Return Rejected',
    message: `Your return for order #${order!._id.toString().slice(-8).toUpperCase()} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
    type: 'error', link: `/orders/${order!._id}`,
  });

  res.json({ order });
}));

// ==================== REVIEWS ====================

router.get('/reviews', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  const sellerProductIds = await Product.distinct('_id', { seller: req.user!._id });
  const filter = { product: { $in: sellerProductIds } };

  const [total, reviews] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .populate('user', 'name email avatar')
      .populate('product', 'name slug images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.json({ reviews, pagination: getPaginationMeta(total, page, limit) });
}));

router.put('/reviews/:id/helpful', asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  review.helpful += 1;
  await review.save();
  res.json({ review });
}));

// ==================== CUSTOMERS ====================

router.get('/customers', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const sellerId = req.user!._id;

  // Match the order (indexed) BEFORE unwinding — never scan the whole collection.
  // Only genuinely-collected sales count as customer activity.
  const customerMatch = { 'items.seller': sellerId, paymentStatus: 'paid', orderStatus: { $nin: ['cancelled', 'returned'] } };

  const [customerAgg, customerIds] = await Promise.all([
    Order.aggregate([
      { $match: customerMatch },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      { $group: {
        _id: '$user',
        orderIds: { $addToSet: '$_id' },
        totalSpent: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        lastOrder: { $max: '$createdAt' },
      }},
      { $project: { totalOrders: { $size: '$orderIds' }, totalSpent: 1, lastOrder: 1 } },
      { $sort: { totalSpent: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
    Order.distinct('user', customerMatch),
  ]);

  const userIds = customerAgg.map((c: any) => c._id).filter(Boolean);
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select('name email phone avatar createdAt').lean()
    : [];
  const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

  const customers = customerAgg.map((c: any) => ({
    ...c,
    user: userMap.get(String(c._id)) || null,
  }));

  res.json({ customers, pagination: getPaginationMeta(customerIds.length, page, limit) });
}));

// ==================== COUPONS ====================

router.get('/coupons', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  const filter = { $or: [{ seller: req.user!._id }, { seller: { $exists: false } }] };
  const [total, coupons] = await Promise.all([
    Coupon.countDocuments(filter),
    Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.json({ coupons, pagination: getPaginationMeta(total, page, limit) });
}));

router.post('/coupons', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { code, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, expiresAt } = req.body;
  if (!code || !discountType || !discountValue || !expiresAt) {
    throw new AppError('Required fields missing', 400);
  }

  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) throw new AppError('Coupon code already exists', 400);

  const coupon = await Coupon.create({
    code: code.toUpperCase(), description, discountType,
    discountValue: Number(discountValue),
    minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
    maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
    usageLimit: usageLimit ? Number(usageLimit) : 0,
    expiresAt: new Date(expiresAt),
  } as any);

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

// ==================== NOTIFICATIONS ====================

router.get('/notifications', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { unreadOnly } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  const filter: any = { $or: [{ user: req.user!._id }, { user: null }] };
  if (unreadOnly === 'true') filter.isRead = false;

  const [total, notifications, unreadCount] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ ...filter, isRead: false }),
  ]);

  res.json({ notifications, unreadCount, pagination: getPaginationMeta(total, page, limit) });
}));

router.put('/notifications/:id/read', asyncHandler(async (req: AuthRequest, res: Response) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, $or: [{ user: req.user!._id }, { user: null }] },
    { isRead: true }, { new: true }
  );
  if (!notification) throw new AppError('Notification not found', 404);
  res.json({ notification });
}));

router.put('/notifications/read-all', asyncHandler(async (req: AuthRequest, res: Response) => {
  await Notification.updateMany(
    { $or: [{ user: req.user!._id }, { user: null }], isRead: false },
    { isRead: true }
  );
  res.json({ message: 'All notifications marked as read' });
}));

// ==================== STORE / PROFILE ====================

router.get('/store', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!._id).select('-password -refreshToken').lean();
  if (!user) throw new AppError('User not found', 404);
  res.json({ store: user });
}));

router.put('/store', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, phone, sellerInfo } = req.body;
  const updates: any = {};
  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (sellerInfo) {
    updates.sellerInfo = {
      ...(req.user!.sellerInfo || {}),
      ...sellerInfo,
    };
  }

  const user = await User.findByIdAndUpdate(req.user!._id, updates, { new: true, runValidators: true })
    .select('-password -refreshToken');
  res.json({ store: user });
}));

router.put('/store/password', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError('Both passwords required', 400);

  const user = await User.findById(req.user!._id);
  if (!user) throw new AppError('User not found', 404);

  const bcrypt = await import('bcryptjs');
  const isMatch = await bcrypt.default.compare(currentPassword, user.password);
  if (!isMatch) throw new AppError('Current password is incorrect', 400);

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
}));

// ==================== PAYOUTS / EARNINGS ====================

router.get('/payouts', asyncHandler(async (req: AuthRequest, res: Response) => {
  const sellerId = req.user!._id;

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  // Match (indexed) BEFORE unwinding; run all three in parallel.
  const livePaid = { 'items.seller': sellerId, paymentStatus: 'paid', orderStatus: { $nin: ['cancelled', 'returned'] } };
  const liveUnpaid = { 'items.seller': sellerId, paymentStatus: { $in: ['pending', 'failed'] }, orderStatus: { $nin: ['cancelled', 'returned'] } };
  const sumStage = (extraMatch: any) => [
    { $match: extraMatch },
    { $unwind: '$items' },
    { $match: { 'items.seller': sellerId } },
    { $group: { _id: null, total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
  ];

  const [totalEarnings, thisMonthEarnings, pendingOrders] = await Promise.all([
    Order.aggregate(sumStage(livePaid)),
    Order.aggregate(sumStage({ ...livePaid, createdAt: { $gte: thisMonth } })),
    // Pending earnings = collectible but not yet collected (live orders only).
    Order.aggregate(sumStage(liveUnpaid)),
  ]);

  res.json({
    earnings: {
      total: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
      thisMonth: thisMonthEarnings.length > 0 ? thisMonthEarnings[0].total : 0,
      pending: pendingOrders.length > 0 ? pendingOrders[0].total : 0,
    },
    payoutInfo: req.user!.sellerInfo?.payoutInfo || null,
  });
}));

router.put('/payouts/bank', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { accountHolder, accountNumber, ifscCode, bankName } = req.body;
  const user = await User.findById(req.user!._id);
  if (!user) throw new AppError('User not found', 404);

  if (!user.sellerInfo) (user as any).sellerInfo = {};
  (user.sellerInfo as any).payoutInfo = { accountHolder, accountNumber, ifscCode, bankName };
  await user.save();

  res.json({ message: 'Bank details updated' });
}));

// ==================== REPORTS ====================

router.get('/reports/sales', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { period = '30' } = req.query;
  const days = Math.min(Math.max(parseInt(period as string, 10) || 30, 1), 365);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Match (indexed) BEFORE unwinding; run all three reports in parallel.
  const reportMatch = { 'items.seller': req.user!._id, paymentStatus: 'paid', orderStatus: { $nin: ['cancelled', 'returned'] }, createdAt: { $gte: startDate } };

  const [salesByDay, salesByCategory, topProducts] = await Promise.all([
    Order.aggregate([
      { $match: reportMatch },
      { $unwind: '$items' },
      { $match: { 'items.seller': req.user!._id } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        orders: { $sum: 1 },
        units: { $sum: '$items.quantity' },
      }},
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: reportMatch },
      { $unwind: '$items' },
      { $match: { 'items.seller': req.user!._id } },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $group: {
        _id: '$category.name',
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        units: { $sum: '$items.quantity' },
      }},
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate([
      { $match: reportMatch },
      { $unwind: '$items' },
      { $match: { 'items.seller': req.user!._id } },
      { $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        units: { $sum: '$items.quantity' },
      }},
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({ salesByDay, salesByCategory, topProducts, period: days });
}));

export default router;
