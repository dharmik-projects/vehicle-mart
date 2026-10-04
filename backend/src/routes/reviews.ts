import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import Review from '../models/Review';
import Product from '../models/Product';
import Order from '../models/Order';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { uploadMultiple, uploadToCloudinary } from '../middleware/upload';
import { getPaginationMeta, parsePagination } from '../utils/helpers';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Get reviews for a product
router.get('/product/:productId', asyncHandler(async (req: any, res: Response) => {
  const { sort = 'newest' } = req.query;
  // Clamp page/limit (default page size stays 10)
  const { page, limit, skip } = parsePagination(req.query, 10, 100);

  let sortOption: any = { createdAt: -1 };
  if (sort === 'highest') sortOption = { rating: -1 };
  else if (sort === 'lowest') sortOption = { rating: 1 };
  else if (sort === 'helpful') sortOption = { helpful: -1 };

  // Resolve the stats id up front, before any query promise is created, so
  // invalid ids still surface exactly as before (CastError → 400 from
  // count/find; RangeError → 500 for ids the hex conversion rejects).
  const rawProductId = String(req.params.productId);
  const statsProductId = mongoose.Types.ObjectId.isValid(rawProductId)
    ? mongoose.Types.ObjectId.createFromHexString(rawProductId)
    : null;

  // Count, page fetch and rating stats are independent — run them together
  const [total, reviews, ratingBreakdown] = await Promise.all([
    Review.countDocuments({ product: req.params.productId }),
    Review.find({ product: req.params.productId })
      .populate('user', 'name avatar')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.aggregate([
      { $match: { product: statsProductId } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]),
  ]);

  res.json({
    reviews,
    ratingBreakdown,
    pagination: getPaginationMeta(total, page, limit),
  });
}));

// Create review
router.post(
  '/',
  authenticate,
  authorize('user'),
  uploadMultiple,
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('comment').trim().notEmpty().withMessage('Review comment is required'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg });
      return;
    }

    const { productId, rating, title, comment } = req.body;

    // Check if already reviewed
    const existing = await Review.findOne({ user: req.user!._id, product: productId });
    if (existing) {
      throw new AppError('You have already reviewed this product', 400);
    }

    // Check if verified purchase
    const hasPurchased = await Order.findOne({
      user: req.user!._id,
      'items.product': productId,
      orderStatus: 'delivered',
    });

    // Upload images
    const images: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file, 'reviews');
        images.push(result.url);
      }
    }

    const review = await Review.create({
      user: req.user!._id,
      product: productId,
      rating: Number(rating),
      title,
      comment,
      images,
      isVerifiedPurchase: !!hasPurchased,
    });

    // Update product average rating
    const stats = await Review.aggregate([
      { $match: { product: require('mongoose').Types.ObjectId.createFromHexString(productId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        averageRating: Math.round(stats[0].avg * 10) / 10,
        totalReviews: stats[0].count,
      });
    }

    res.status(201).json({
      review: { ...review.toObject(), user: { _id: req.user!._id, name: req.user!.name } },
    });
  })
);

// Update review
router.put('/:id', authenticate, authorize('user'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user!._id });
  if (!review) throw new AppError('Review not found', 404);

  const { rating, title, comment } = req.body;
  if (rating) review.rating = Number(rating);
  if (title !== undefined) review.title = title;
  if (comment) review.comment = comment;
  await review.save();

  // Recalculate average
  const stats = await Review.aggregate([
    { $match: { product: review.product } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(review.product, {
      averageRating: Math.round(stats[0].avg * 10) / 10,
      totalReviews: stats[0].count,
    });
  }

  res.json({ review });
}));

// Delete review
router.delete('/:id', authenticate, authorize('user'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user!._id });
  if (!review) throw new AppError('Review not found', 404);

  const productId = review.product;
  await review.deleteOne();

  // Recalculate average
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(stats[0].avg * 10) / 10,
      totalReviews: stats[0].count,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }

  res.json({ message: 'Review deleted' });
}));

// Mark review as helpful
router.post('/:id/helpful', authenticate, authorize('user'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $inc: { helpful: 1 } },
    { new: true }
  );
  if (!review) throw new AppError('Review not found', 404);
  res.json({ helpful: review.helpful });
}));

// Admin: delete any review
router.delete(
  '/admin/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
        averageRating: Math.round(stats[0].avg * 10) / 10,
        totalReviews: stats[0].count,
      });
    }

    res.json({ message: 'Review deleted by admin' });
  })
);

export default router;
