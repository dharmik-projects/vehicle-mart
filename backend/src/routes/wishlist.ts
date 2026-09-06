import { Router, Response } from 'express';
import Wishlist from '../models/Wishlist';
import { AuthRequest, authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getPaginationMeta } from '../utils/helpers';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Get wishlist
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const total = await Wishlist.countDocuments({ user: req.user!._id });
  const items = await Wishlist.find({ user: req.user!._id })
    .populate({
      path: 'product',
      select: 'name slug price mrp discount images averageRating totalReviews stock isActive isApproved brand',
      populate: { path: 'category', select: 'name slug' },
    })
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json({
    items: items.filter((item) => item.product && (item.product as any).isActive),
    pagination: getPaginationMeta(total, pageNum, limitNum),
  });
}));

// Toggle wishlist
router.post('/toggle', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
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
router.get('/check/:productId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await Wishlist.findOne({
    user: req.user!._id,
    product: req.params.productId,
  });
  res.json({ wishlisted: !!existing });
}));

// Remove from wishlist
router.delete('/:productId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  await Wishlist.findOneAndDelete({
    user: req.user!._id,
    product: req.params.productId,
  });
  res.json({ message: 'Removed from wishlist' });
}));

export default router;
