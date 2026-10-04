import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getPaginationMeta, parsePagination, escapeRegex } from '../utils/helpers';
import asyncHandler from '../middleware/asyncHandler';
import { transitionOrder } from '../utils/orderLifecycle';

const router = Router();

// Create order from cart
router.post(
  '/',
  authenticate,
  authorize('user'),
  [
    body('addressId').notEmpty().withMessage('Delivery address is required'),
    body('paymentMethod').isIn(['cod', 'online', 'upi']).withMessage('Valid payment method is required'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg });
      return;
    }

    const { addressId, paymentMethod, notes } = req.body;

    // Import here to avoid circular dependency
    const Address = (await import('../models/Address')).default;
    const address = await Address.findOne({ _id: addressId, user: req.user!._id });
    if (!address) throw new AppError('Address not found', 404);

    // Atomically claim the cart: exactly one concurrent request can win,
    // so a double-clicked checkout can never create two orders. Default
    // (new: false) returns the PRE-update doc — the items being claimed.
    const claimed = await Cart.findOneAndUpdate(
      { user: req.user!._id, 'items.0': { $exists: true } },
      { $set: { items: [] } }
    );
    if (!claimed || claimed.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }
    const cartItems = claimed.items;

    // Give the items back if anything below fails — but only if the cart is
    // still empty (the customer may have started adding new items meanwhile).
    const restoreCart = async () => {
      await Cart.updateOne(
        { user: req.user!._id, 'items.0': { $exists: false } },
        { $set: { items: cartItems } }
      );
    };

    // Read every product in ONE query (no N+1 read-modify-write loop).
    const products = await Product.find({
      _id: { $in: cartItems.map((item) => item.product) },
      isActive: true,
      isApproved: true,
    }).select('name price stock images seller');
    const productById = new Map(products.map((p) => [String(p._id), p]));

    const orderItems: any[] = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) {
        await restoreCart();
        throw new AppError('Invalid quantity in cart', 400);
      }

      const product = productById.get(String(item.product));
      if (!product) {
        await restoreCart();
        throw new AppError('One or more products in your cart are no longer available', 400);
      }
      if (product.stock < quantity) {
        await restoreCart();
        throw new AppError(`Insufficient stock for ${product.name}. Available: ${product.stock}`, 400);
      }

      orderItems.push({
        product: product._id,
        seller: product.seller,
        name: product.name,
        price: product.price,
        quantity,
        image: product.images[0]?.url,
      });

      subtotal += product.price * quantity;
    }

    // Reserve stock atomically: the `stock: { $gte: qty }` guard makes overselling
    // and negative stock impossible even under concurrent checkouts. This is a
    // reservation only — totalSales (units sold) is NOT touched until the payment
    // is actually collected (verified online payment or COD on delivery).
    const reserve = async (item: any) =>
      Product.updateOne(
        { _id: item.product, isActive: true, isApproved: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
    const restore = (items: any[]) =>
      Product.bulkWrite(
        items.map((item) => ({
          updateOne: { filter: { _id: item.product }, update: { $inc: { stock: item.quantity } } },
        }))
      );

    const reserved: any[] = [];
    for (const item of orderItems) {
      const result = await reserve(item);
      if (result.matchedCount === 0) {
        if (reserved.length) await restore(reserved);
        await restoreCart();
        const product = productById.get(String(item.product));
        throw new AppError(
          `Insufficient stock for ${product?.name ?? 'a product'}. Please try again.`,
          400
        );
      }
      reserved.push(item);
    }

    const shippingCost = subtotal >= 500 ? 0 : 49;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shippingCost + tax;

    let order;
    try {
      order = await Order.create({
        user: req.user!._id,
        items: orderItems,
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: address.country,
        },
        paymentMethod,
        paymentStatus: 'pending',
        // Awaiting confirmation: becomes "confirmed" on verified payment or
        // by the seller — never before payment/stock reality is established.
        orderStatus: 'pending',
        subtotal,
        shippingCost,
        tax,
        total,
        notes,
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } catch (err) {
      // Order creation failed — release the reservation and give the cart back.
      await restore(reserved);
      await restoreCart();
      throw err;
    }

    res.status(201).json({ message: 'Order placed successfully', order });
  })
);

// Get user's orders
router.get('/', authenticate, authorize('user'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const filter: any = { user: req.user!._id };
  if (status) filter.orderStatus = status;

  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.json({
    orders,
    pagination: getPaginationMeta(total, page, limit),
  });
}));

// ==================== SELLER ORDER MANAGEMENT ====================
// (Must be before /:id routes to avoid route conflicts)

// Get seller's orders
router.get(
  '/seller/all',
  authenticate,
  authorize('seller'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.query;
    const filter: any = { 'items.seller': req.user!._id };
    if (status) filter.orderStatus = status;

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

    res.json({
      orders,
      pagination: getPaginationMeta(total, page, limit),
    });
  })
);

// ==================== ADMIN ORDER MANAGEMENT ====================
// (Must be before /:id routes to avoid route conflicts)

// Get all orders (admin)
router.get(
  '/admin/all',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, search } = req.query;
    const filter: any = {};
    if (status) filter.orderStatus = status;
    if (search) {
      const term = escapeRegex(String(search));
      filter.$or = [
        { 'shippingAddress.fullName': { $regex: term, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: term, $options: 'i' } },
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

    res.json({
      orders,
      pagination: getPaginationMeta(total, page, limit),
    });
  })
);

// Get single order (must be after specific routes)
router.get('/:id', authenticate, authorize('user'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user!._id })
    .populate('items.product', 'name slug images')
    .lean();

  if (!order) throw new AppError('Order not found', 404);
  res.json({ order });
}));

// Cancel order (customer) — release the reservation exactly once
router.put('/:id/cancel', authenticate, authorize('user'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user!._id })
    .select('_id orderStatus')
    .lean();
  if (!order) throw new AppError('Order not found', 404);

  if (!['pending', 'confirmed'].includes(order.orderStatus)) {
    throw new AppError('Order cannot be cancelled at this stage', 400);
  }

  const { order: updated } = await transitionOrder(order._id, 'cancelled', {
    cancelReason: req.body.reason || 'Cancelled by user',
  });

  res.json({ message: 'Order cancelled', order: updated });
}));

// Update order status (seller/admin) — validated transition + inventory side effects
router.put(
  '/:id/status',
  authenticate,
  authorize('seller', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderStatus, trackingNumber, reason } = req.body;
    if (!orderStatus || typeof orderStatus !== 'string') {
      throw new AppError('Order status is required', 400);
    }

    // Sellers may only touch orders that actually contain their items.
    const scope: any = { _id: req.params.id };
    if (req.user!.role === 'seller') scope['items.seller'] = req.user!._id;
    const exists = await Order.findOne(scope).select('_id').lean();
    if (!exists) throw new AppError('Order not found', 404);

    const { order } = await transitionOrder(exists._id, orderStatus, {
      trackingNumber,
      reason,
      cancelReason: reason,
    });
    res.json({ order });
  })
);

export default router;
