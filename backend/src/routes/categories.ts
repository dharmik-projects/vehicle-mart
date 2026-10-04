import { Router, Request, Response } from 'express';
import Category from '../models/Category';
import Product from '../models/Product';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateSlug } from '../utils/helpers';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Get all categories (top-level with subcategories)
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  // ONE query for the whole visible tree (previously 1 + N: one query per
  // top-level category to fetch its children), plus a parallel count of
  // active+approved products per category (lets the UI show only categories
  // that actually have products).
  const [all, counts] = await Promise.all([
    Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean(),
    Product.aggregate([
      { $match: { isActive: true, isApproved: true } },
      { $group: { _id: '$category', n: { $sum: 1 } } },
    ]),
  ]);

  const countByCat = new Map<string, number>(
    counts.map((c: any) => [String(c._id), c.n as number])
  );

  const roots = all.filter((cat) => !cat.parent);
  const rootIds = new Set(roots.map((cat) => String(cat._id)));
  const childrenByParent = new Map<string, any[]>();
  for (const cat of all) {
    if (!cat.parent) continue;
    const key = String(cat.parent);
    if (!rootIds.has(key)) continue; // previous behaviour: one level deep only
    const list = childrenByParent.get(key);
    if (list) list.push(cat);
    else childrenByParent.set(key, [cat]);
  }

  const categories = roots.map((cat) => {
    const children = (childrenByParent.get(String(cat._id)) ?? []).map((ch) => ({
      ...ch,
      productCount: countByCat.get(String(ch._id)) ?? 0,
    }));
    const childSum = children.reduce((sum, ch) => sum + ch.productCount, 0);
    return {
      ...cat,
      productCount: (countByCat.get(String(cat._id)) ?? 0) + childSum,
      children,
    };
  });

  res.json({ categories });
}));

// Get all flat categories
router.get('/all', asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find({ isActive: true })
    .populate('parent', 'name slug')
    .sort({ sortOrder: 1, name: 1 })
    .lean();
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
