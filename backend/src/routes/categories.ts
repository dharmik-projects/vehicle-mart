import { Router, Request, Response } from 'express';
import Category from '../models/Category';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateSlug } from '../utils/helpers';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Get all categories (top-level with subcategories)
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find({ isActive: true, parent: undefined })
    .sort({ sortOrder: 1, name: 1 });
  
  const categoriesWithChildren = await Promise.all(
    categories.map(async (cat) => {
      const children = await Category.find({ parent: cat._id, isActive: true }).sort({ sortOrder: 1 });
      return { ...cat.toObject(), children };
    })
  );

  res.json({ categories: categoriesWithChildren });
}));

// Get all flat categories
router.get('/all', asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find({ isActive: true })
    .populate('parent', 'name slug')
    .sort({ sortOrder: 1, name: 1 });
  res.json({ categories });
}));

// Get category by slug
router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true })
    .populate('parent', 'name slug');
  if (!category) throw new AppError('Category not found', 404);
  const children = await Category.find({ parent: category._id, isActive: true });
  res.json({ category: { ...category.toObject(), children } });
}));

// Create category (admin)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description, image, icon, parent, sortOrder } = req.body;
    const slug = generateSlug(name);
    const category = await Category.create({
      name, slug, description, image, icon, parent, sortOrder,
    });
    res.status(201).json({ category });
  })
);

// Update category (admin)
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) throw new AppError('Category not found', 404);
    res.json({ category });
  })
);

// Delete category (admin)
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!category) throw new AppError('Category not found', 404);
    res.json({ message: 'Category deactivated' });
  })
);

export default router;
