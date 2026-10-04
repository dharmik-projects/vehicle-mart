import { Router, Response } from 'express';
import Wishlist from '../models/Wishlist';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getPaginationMeta, parsePagination } from '../utils/helpers';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Wishlist is a customer (marketplace) feature
router.use(authenticate, authorize('user'));

// Get wishlist
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Clamp page/limit (default page size stays 20)
  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  // Count and page fetch are independent — run them together
  const [total, items] = await Promise.all([
    Wishlist.countDocuments({ user: req.user!._id }),
    Wishlist.find({ user: req.user!._id })
      .populate({
        path: 'product',
        select: 'name slug price mrp discount images averageRating totalReviews stock isActive isApproved brand',
        populate: { path: 'category', select: 'name slug' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  res.json({
    items: items.filter((item) => item.product && (item.product as any).isActive),
    pagination: getPaginationMeta(total, page, limit),
  });
}));

// Toggle wishlist
router.post('/toggle', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { productId } = req.body;
  if (!productId) throw new AppError('Product ID is required', 400);

  const existing = await Wishlist.findOne({
    user: req.user!._id,
    product: productId,
  });

  if (existing) {
    await existing.deleteOne();
    res.json({ wishlisted: false, message: 'Removed from wishlist' });
  } else {
    await Wishlist.create({ user: req.user!._id, product: productId });
    res.json({ wishlisted: true, message: 'Added to wishlist' });
  }
}));

// Check if product is wishlisted
router.get('/check/:productId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await Wishlist.findOne({
    user: req.user!._id,
    product: req.params.productId,
  });
  res.json({ wishlisted: !!existing });
}));

// Remove from wishlist
router.delete('/:productId', asyncHandler(async (req: AuthRequest, res: Response) => {
  await Wishlist.findOneAndDelete({
    user: req.user!._id,
    product: req.params.productId,
  });
  res.json({ message: 'Removed from wishlist' });
}));

export default router;
