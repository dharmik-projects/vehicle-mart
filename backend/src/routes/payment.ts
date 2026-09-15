import { Router, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order';
import { AuthRequest, authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new AppError('Payment gateway not configured', 500);
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// Create Razorpay order
router.post(
  '/create-order',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderId } = req.body;
    if (!orderId) throw new AppError('Order ID is required', 400);

    const order = await Order.findOne({ _id: orderId, user: req.user!._id });
    if (!order) throw new AppError('Order not found', 404);
    if (order.paymentMethod === 'cod') {
      throw new AppError('COD orders do not require online payment', 400);
    }
    if (order.paymentStatus === 'paid') {
      throw new AppError('Order is already paid', 400);
    }

    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total * 100),
      currency: 'INR',
      receipt: order._id.toString(),
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  })
);

// Verify payment and mark order as paid
router.post(
  '/verify',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
      throw new AppError('Missing payment verification data', 400);
    }

    const order = await Order.findOne({ _id: orderId, user: req.user!._id });
    if (!order) throw new AppError('Order not found', 404);

    // Verify signature server-side
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      order.paymentStatus = 'failed';
      await order.save();
      throw new AppError('Payment verification failed', 400);
    }

    // Signature verified — mark as paid
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.orderStatus = 'confirmed';
    await order.save();

    res.json({ message: 'Payment verified successfully', order });
  })
);

// Get Razorpay key (public)
router.get('/key', (_req, res) => {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID });
});

export default router;
