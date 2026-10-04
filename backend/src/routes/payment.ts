import { Router, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import asyncHandler from '../middleware/asyncHandler';
import { transitionOrder, incTotalSales } from '../utils/orderLifecycle';

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
  authorize('user'),
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
    if (['cancelled', 'returned', 'delivered'].includes(order.orderStatus)) {
      throw new AppError('Order cannot be paid in its current state', 400);
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
  authorize('user'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
      throw new AppError('Missing payment verification data', 400);
    }

    const order = await Order.findOne({ _id: orderId, user: req.user!._id });
    if (!order) throw new AppError('Order not found', 404);

    // Idempotent: a duplicate verify call for an already-paid order is a no-op.
    if (order.paymentStatus === 'paid') {
      res.json({ message: 'Payment already verified', order });
      return;
    }

    // The signature must belong to the razorpay order WE created for this order
    // (prevents replaying another payment's signature).
    if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
      throw new AppError('Payment verification failed', 400);
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new AppError('Payment gateway not configured', 500);

    // Verify signature server-side — the frontend's success callback is never trusted.
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    let signatureValid = false;
    try {
      signatureValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(String(razorpaySignature), 'utf8')
      );
    } catch {
      signatureValid = false;
    }

    if (!signatureValid) {
      // Payment could not be verified: record the failure, release the reserved
      // stock and close the order (release is guarded so it happens at most once).
      await Order.updateOne(
        { _id: order._id, paymentStatus: { $ne: 'paid' } },
        { $set: { paymentStatus: 'failed' } }
      );
      try {
        await transitionOrder(order._id, 'cancelled', { cancelReason: 'Payment verification failed' });
      } catch {
        // Order already terminal (e.g. cancelled) — nothing left to release.
      }
      throw new AppError('Payment verification failed', 400);
    }

    // Atomically claim the pending -> paid transition so totalSales is counted
    // exactly once even under duplicate or concurrent verify calls.
    const pre = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: { $ne: 'paid' }, orderStatus: { $nin: ['cancelled', 'returned'] } },
      [
        {
          $set: {
            paymentStatus: 'paid',
            razorpayOrderId: String(razorpayOrderId),
            razorpayPaymentId: String(razorpayPaymentId),
            razorpaySignature: String(razorpaySignature),
            // only promote an order that is still awaiting confirmation
            orderStatus: { $cond: [{ $eq: ['$orderStatus', 'pending'] }, 'confirmed', '$orderStatus'] },
          },
        },
      ],
      { new: false }
    );

    if (pre) {
      await incTotalSales(pre.items);
      const fresh = await Order.findById(pre._id);
      res.json({ message: 'Payment verified successfully', order: fresh });
      return;
    }

    const current = await Order.findById(order._id);
    if (!current) throw new AppError('Order not found', 404);

    if (current.paymentStatus === 'paid') {
      // Lost a race with a duplicate verify — the outcome is already correct.
      res.json({ message: 'Payment verified successfully', order: current });
      return;
    }

    if (current.orderStatus === 'cancelled' || current.orderStatus === 'returned') {
      // Payment genuinely succeeded but the order closed while checkout was
      // open. Record the collection; revenue reports exclude these orders.
      await Order.updateOne(
        { _id: current._id, paymentStatus: { $ne: 'paid' } },
        {
          $set: {
            paymentStatus: 'paid',
            razorpayPaymentId: String(razorpayPaymentId),
            razorpaySignature: String(razorpaySignature),
          },
        }
      );
      const updated = await Order.findById(current._id);
      res.json({ message: 'Payment verified successfully', order: updated });
      return;
    }

    throw new AppError('Payment verification failed', 400);
  })
);

// Get Razorpay key (public)
router.get('/key', (_req, res) => {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID });
});

export default router;
