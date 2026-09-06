import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getPaginationMeta } from '../utils/helpers';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Create order from cart
router.post(
  '/',
  authenticate,
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

    // Get cart
    const cart = await Cart.findOne({ user: req.user!._id });
    if (!cart || cart.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    // Import here to avoid circular dependency
    const Address = (await import('../models/Address')).default;
    const address = await Address.findOne({ _id: addressId, user: req.user!._id });
    if (!address) throw new AppError('Address not found', 404);

    // Validate stock and create order items
    const orderItems: any[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = await Product.findOne({
        _id: item.product,
        isActive: true,
        isApproved: true,
      });

      if (!product) {
        throw new AppError(`Product ${item.product} is no longer available`, 400);
      }
      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${product.name}. Available: ${product.stock}`, 400);
      }

      orderItems.push({
        product: product._id,
        seller: product.seller,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images[0]?.url,
      });

      subtotal += product.price * item.quantity;

      // Reduce stock
      product.stock -= item.quantity;
      product.totalSales += item.quantity;
      await product.save();
    }

    const shippingCost = subtotal >= 500 ? 0 : 49;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shippingCost + tax;

    const order = await Order.create({
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
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      orderStatus: 'confirmed',
      subtotal,
      shippingCost,
      tax,
      total,
      notes,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Clear cart
    cart.items = [];
    await cart.save();

    res.status(201).json({ message: 'Order placed successfully', order });
  })
);

// Get user's orders
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', status } = req.query;
  const filter: any = { user: req.user!._id };
  if (status) filter.orderStatus = status;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  res.json({
    orders,
    pagination: getPaginationMeta(total, pageNum, limitNum),
  });
}));

// Get single order
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user!._id })
    .populate('items.product', 'name slug images')
    .lean();

  if (!order) throw new AppError('Order not found', 404);
  res.json({ order });
}));

// Cancel order
router.put('/:id/cancel', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user!._id });
  if (!order) throw new AppError('Order not found', 404);

  if (!['pending', 'confirmed'].includes(order.orderStatus)) {
    throw new AppError('Order cannot be cancelled at this stage', 400);
  }

  order.orderStatus = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelReason = req.body.reason || 'Cancelled by user';
  await order.save();

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity, totalSales: -item.quantity },
    });
  }

  res.json({ message: 'Order cancelled', order });
}));

// ==================== SELLER ORDER MANAGEMENT ====================

// Get seller's orders
router.get(
  '/seller/all',
  authenticate,
  authorize('seller'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20', status } = req.query;
    const filter: any = { 'items.seller': req.user!._id };
    if (status) filter.orderStatus = status;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.json({
      orders,
      pagination: getPaginationMeta(total, pageNum, limitNum),
    });
  })
);

// Update order status (seller)
router.put(
  '/:id/status',
  authenticate,
  authorize('seller', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderStatus, trackingNumber } = req.body;

    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
      returned: [],
    };

    const order = await Order.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);

    if (!validTransitions[order.orderStatus]?.includes(orderStatus)) {
      throw new AppError(`Cannot transition from ${order.orderStatus} to ${orderStatus}`, 400);
    }

    order.orderStatus = orderStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (orderStatus === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';
    }
    if (orderStatus === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancelReason = req.body.reason || 'Cancelled by seller';
      // Restore stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity, totalSales: -item.quantity },
        });
      }
    }

    await order.save();
    res.json({ order });
  })
);

// ==================== ADMIN ORDER MANAGEMENT ====================

// Get all orders (admin)
router.get(
  '/admin/all',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20', status, search } = req.query;
    const filter: any = {};
    if (status) filter.orderStatus = status;
    if (search) {
      filter.$or = [
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.json({
      orders,
      pagination: getPaginationMeta(total, pageNum, limitNum),
    });
  })
);

export default router;
