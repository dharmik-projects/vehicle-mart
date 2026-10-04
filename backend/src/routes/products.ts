import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import Product from '../models/Product';
import ProductCompatibility from '../models/ProductCompatibility';
import Category from '../models/Category';
import User from '../models/User';
import Review from '../models/Review';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { uploadMultiple, uploadToCloudinary } from '../middleware/upload';
import { generateSlug, generateSKU, getPaginationMeta, parsePagination, escapeRegex } from '../utils/helpers';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Search & list products
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    q, category, brand, vehicleType, vehicleBrand, vehicleModel, vehicleVariant,
    minPrice, maxPrice, rating, sort,
    seller, isApproved, inStock, year, ids,
  } = req.query;

  // Clamp page/limit so a client can never request an unbounded page size
  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  const filter: any = { isActive: true };

  // Explicit id list (recently-viewed hydration): invalid ids are dropped so
  // a stale localStorage entry can never produce a CastError 400.
  let idsList: string[] | null = null;
  if (ids) {
    idsList = String(ids)
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && mongoose.Types.ObjectId.isValid(s))
      .slice(0, 24);
    if (idsList.length === 0) {
      res.json({
        products: [],
        pagination: getPaginationMeta(0, 1, limit),
      });
      return;
    }
    filter._id = { $in: idsList };
  }

  // Independent lookups — collected as promises and run together below
  let categoryLookup: Promise<any[]> | null = null;
  let compatUniversalLookup: Promise<any[]> | null = null;
  let compatFilterLookup: Promise<any[]> | null = null;

  // Search — regex across name, brand, SKU, part numbers, category name.
  // escapeRegex() keeps user text literal (no ReDoS / invalid-pattern errors).
  if (q) {
    const searchTerm = escapeRegex(q as string);
    const orConditions: any[] = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { brand: { $regex: searchTerm, $options: 'i' } },
      { sku: { $regex: searchTerm, $options: 'i' } },
      { partNumber: { $regex: searchTerm, $options: 'i' } },
      { oemPartNumber: { $regex: searchTerm, $options: 'i' } },
    ];
    filter.$or = orConditions;

    // Also match products whose category NAME matches the query (best-effort)
    categoryLookup = Category.find({
      name: { $regex: searchTerm, $options: 'i' },
    }).select('_id').lean();
  }

  // Category filter — browsing a parent category must ALSO match products
  // stored under its subcategories (links use root IDs; products live on
  // children). Valid ids expand below in the parallel block; non-ObjectId
  // values keep the old exact-match behaviour (no CastError possible).
  let categoryExpand: Promise<any[]> | null = null;
  if (category) {
    if (mongoose.Types.ObjectId.isValid(String(category))) {
      categoryExpand = Category.find({ isActive: true }).select('_id parent').lean();
    } else {
      filter.category = category as string;
    }
  }
  if (brand) filter.brand = { $regex: escapeRegex(brand as string), $options: 'i' };
  if (seller) filter.seller = seller;
  if (inStock === 'true') filter.stock = { $gt: 0 };
  if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
  else filter.isApproved = true;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (rating) filter.averageRating = { $gte: Number(rating) };

  // Vehicle compatibility filter (universal parts are unioned in below)
  if (vehicleType || vehicleBrand || vehicleModel || vehicleVariant || year) {
    const compatFilter: any = {};
    if (vehicleType) compatFilter.vehicleType = vehicleType;
    if (vehicleBrand) compatFilter.brand = vehicleBrand;
    if (vehicleModel) compatFilter.vehicleModel = vehicleModel;
    if (vehicleVariant) compatFilter.variant = vehicleVariant;
    if (year && !Number.isNaN(Number(year))) {
      const y = Number(year);
      // Rows without year bounds stay compatible (unknown range = fits all)
      compatFilter.$and = [
        { $or: [{ yearFrom: { $exists: false } }, { yearFrom: null }, { yearFrom: { $lte: y } }] },
        { $or: [{ yearTo: { $exists: false } }, { yearTo: null }, { yearTo: { $gte: y } }] },
      ];
    }

    // Split the old single { ...compatFilter, $or: [{ isUniversal: true },
    // { ...compatFilter }] } query into two disjoint queries so both run in
    // parallel; results are unioned into a Set below, which is exactly what
    // the old $or branch list selected (universal rows OR rows matching the
    // vehicle filters).
    compatUniversalLookup = ProductCompatibility.distinct('product', { isUniversal: true });
    compatFilterLookup = ProductCompatibility.distinct('product', { ...compatFilter });
  }

  // Run independent lookups in parallel.
  // Category matching is best-effort (failure = skip that condition);
  // compatibility failure must surface (wrong results would be worse than an error).
  if (categoryLookup || compatUniversalLookup || compatFilterLookup || categoryExpand) {
    const [matchingCategories, universalProductIds, filteredProductIds, activeCategories] = await Promise.all([
      categoryLookup ? categoryLookup.catch(() => null) : Promise.resolve(null),
      compatUniversalLookup ?? Promise.resolve(null),
      compatFilterLookup ?? Promise.resolve(null),
      categoryExpand ? categoryExpand.catch(() => null) : Promise.resolve(null),
    ]);
    if (matchingCategories && matchingCategories.length > 0) {
      filter.$or!.push({ category: { $in: matchingCategories.map((c) => c._id) } });
    }
    if (activeCategories) {
      // Expand the requested category id to include every ACTIVE descendant
      // (depth-agnostic: walk parent links from the requested id downwards).
      const childrenOf = new Map<string, string[]>();
      for (const row of activeCategories) {
        if (!row.parent) continue;
        const key = String(row.parent);
        const list = childrenOf.get(key);
        if (list) list.push(String(row._id));
        else childrenOf.set(key, [String(row._id)]);
      }
      const idSet = new Set<string>([String(category)]);
      const queue: string[] = [String(category)];
      while (queue.length) {
        const cur = queue.pop()!;
        for (const child of childrenOf.get(cur) ?? []) {
          if (!idSet.has(child)) {
            idSet.add(child);
            queue.push(child);
          }
        }
      }
      filter.category = { $in: [...idSet] };
    } else if (category) {
      filter.category = category; // expansion failed → legacy exact match
    }
    if (universalProductIds || filteredProductIds) {
      // Union the two halves (deduped) — matches the old $or semantics.
      const compatSet = new Set<string>();
      for (const id of filteredProductIds ?? []) compatSet.add(String(id));
      for (const id of universalProductIds ?? []) compatSet.add(String(id));
      const compatibleProductIds = [...compatSet];
      // Intersect with an explicit ids filter when both are active.
      if (idsList) {
        const idSet = new Set(idsList);
        filter._id = {
          $in: compatibleProductIds.filter((id: any) => idSet.has(String(id))),
        };
      } else {
        filter._id = { $in: compatibleProductIds };
      }
    }
  }

  // Sort
  let sortOption: any = { createdAt: -1 };
  if (sort === 'price_asc') sortOption = { price: 1 };
  else if (sort === 'price_desc') sortOption = { price: -1 };
  else if (sort === 'rating') sortOption = { averageRating: -1 };
  else if (sort === 'popular') sortOption = { totalSales: -1 };
  else if (sort === 'newest') sortOption = { createdAt: -1 };
  else if (q) sortOption = { totalSales: -1 };

  // Count and page fetch run in parallel; projection returns card fields only
  // (full documents are fetched by the detail endpoint).
  // No populate(): the public UI never reads category/seller objects from the
  // list response — each populate costs an extra DB round trip on every call.
  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .select('name slug brand price mrp stock images averageRating totalReviews category seller')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  // Attach vehicle-type compatibility chips for this page of cards (one query)
  if (products.length > 0) {
    try {
      const compatRows = await ProductCompatibility.find({
        product: { $in: products.map((p) => p._id) },
      }).select('product vehicleType').lean();

      const byProduct = new Map<string, Set<string>>();
      for (const row of compatRows) {
        const key = String(row.product);
        if (!byProduct.has(key)) byProduct.set(key, new Set());
        if (row.vehicleType) byProduct.get(key)!.add(row.vehicleType);
      }
      for (const p of products) {
        const types = byProduct.get(String(p._id));
        (p as any).vehicleTypes = types ? Array.from(types) : [];
      }
    } catch {
      // non-blocking — cards simply omit chips
    }
  }

  res.json({
    products,
    pagination: getPaginationMeta(total, page, limit),
  });
}));

// Distinct product brands (for filter sidebar) — MUST be before /:slug
router.get('/brands', asyncHandler(async (_req: Request, res: Response) => {
  const brands = await Product.distinct('brand', {
    isActive: true,
    isApproved: true,
    brand: { $exists: true, $nin: [null, ''] },
  });
  res.json({ brands: brands.sort((a, b) => String(a).localeCompare(String(b))) });
}));

// Distinct sellers with approved products (for filter sidebar) — before /:slug
router.get('/sellers', asyncHandler(async (_req: Request, res: Response) => {
  const sellerIds = await Product.distinct('seller', {
    isActive: true,
    isApproved: true,
    seller: { $ne: null },
  });
  const users = await User.find({ _id: { $in: sellerIds } })
    .select('name sellerInfo.businessName')
    .lean();
  res.json({
    sellers: users
      .map((u: any) => ({ _id: u._id, name: u.sellerInfo?.businessName || u.name }))
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name))),
  });
}));

// Deals: products with a REAL discount (mrp > price), biggest discount first.
// No synthetic discounts — products without a genuine MRP above the selling
// price are never returned. — before /:slug
router.get('/deals', asyncHandler(async (req: Request, res: Response) => {
  const limitNum = Math.min(parseInt(String(req.query.limit ?? '8')) || 8, 24);

  const products = await Product.aggregate([
    {
      $match: {
        isActive: true,
        isApproved: true,
        $expr: { $gt: ['$mrp', '$price'] },
      },
    },
    {
      $addFields: {
        discountRatio: { $divide: [{ $subtract: ['$mrp', '$price'] }, '$mrp'] },
      },
    },
    { $sort: { discountRatio: -1, totalSales: -1, createdAt: -1 } },
    { $limit: limitNum },
    {
      $project: {
        name: 1, slug: 1, brand: 1, price: 1, mrp: 1, stock: 1,
        images: 1, averageRating: 1, totalReviews: 1, category: 1, seller: 1,
        createdAt: 1,
      },
    },
  ]);

  res.json({ products });
}));

// Popular brands: brands that actually have active+approved products,
// ordered by product count. — before /:slug
router.get('/popular-brands', asyncHandler(async (req: Request, res: Response) => {
  const limitNum = Math.min(parseInt(String(req.query.limit ?? '12')) || 12, 24);

  const brands = await Product.aggregate([
    {
      $match: {
        isActive: true,
        isApproved: true,
        brand: { $exists: true, $nin: [null, ''] },
      },
    },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limitNum },
    { $project: { _id: 0, name: '$_id', count: 1 } },
  ]);

  res.json({ brands });
}));

// Get single product
router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true })
    .populate('category', 'name slug')
    .populate('seller', 'name sellerInfo.businessName sellerInfo.isApproved')
    .lean();

  if (!product) throw new AppError('Product not found', 404);

  // Both depend only on the product id — run them together
  const [compatibility, reviewCount] = await Promise.all([
    ProductCompatibility.find({ product: product._id })
      .populate('brand', 'name slug')
      .populate('vehicleModel', 'name slug')
      .populate('variant', 'name slug')
      .lean(),
    Review.countDocuments({ product: product._id }),
  ]);

  res.json({ product: { ...product, compatibility, reviewCount } });
}));

// Get related products
router.get('/:id/related', asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);

  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
    isActive: true,
    isApproved: true,
  })
    .populate('category', 'name slug')
    .limit(8)
    .lean();

  res.json({ products: related });
}));

// Create product (seller)
router.post(
  '/',
  authenticate,
  authorize('seller'),
  uploadMultiple,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      name, description, brand, category, price, mrp, partNumber, oemPartNumber,
      stock, specifications, warranty, originCountry, weight, tags, compatibility,
    } = req.body;

    const slug = generateSlug(name);
    const sku = generateSKU(brand?.substring(0, 3).toUpperCase() || 'VP');
    
    // Upload images
    const images: any[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (let i = 0; i < req.files.length; i++) {
        const result = await uploadToCloudinary(req.files[i], 'products');
        images.push({
          url: result.url,
          alt: name,
          isPrimary: i === 0,
        });
      }
    }

    const parsedSpecs = specifications ? JSON.parse(specifications) : {};
    const parsedCompat = compatibility ? JSON.parse(compatibility) : [];
    const parsedTags = tags ? JSON.parse(tags) : [];

    const product = await Product.create({
      name,
      slug,
      description,
      sku,
      partNumber,
      oemPartNumber,
      brand,
      category,
      seller: req.user!._id,
      price: Number(price),
      mrp: Number(mrp),
      stock: Number(stock),
      images,
      specifications: parsedSpecs,
      warranty,
      originCountry,
      weight: weight ? Number(weight) : undefined,
      tags: parsedTags,
      isApproved: false,
    });

    // Add compatibility entries
    if (parsedCompat.length > 0) {
      const compatEntries = parsedCompat.map((c: any) => ({
        product: product._id,
        vehicleType: c.vehicleType,
        brand: c.brand || undefined,
        vehicleModel: c.vehicleModel || undefined,
        variant: c.variant || undefined,
        yearFrom: c.yearFrom,
        yearTo: c.yearTo,
        isUniversal: c.isUniversal || false,
        notes: c.notes,
      }));
      await ProductCompatibility.insertMany(compatEntries);
    }

    res.status(201).json({ product });
  })
);

// Update product (seller)
router.put(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    if (req.user!.role === 'seller' && product.seller.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized to update this product', 403);
    }

    const allowedUpdates = [
      'name', 'description', 'brand', 'category', 'price', 'mrp', 'partNumber',
      'oemPartNumber', 'stock', 'specifications', 'warranty', 'originCountry',
      'weight', 'tags',
    ];

    const updates: any = {};
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        if (field === 'specifications' || field === 'tags') {
          updates[field] = typeof req.body[field] === 'string' ? JSON.parse(req.body[field]) : req.body[field];
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (updates.name) {
      updates.slug = generateSlug(updates.name);
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ product: updated });
  })
);

// Delete product (seller/admin)
router.delete(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    if (req.user!.role === 'seller' && product.seller.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized to delete this product', 403);
    }

    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    await ProductCompatibility.deleteMany({ product: req.params.id });

    res.json({ message: 'Product deleted' });
  })
);

// Add product images
router.post(
  '/:id/images',
  authenticate,
  authorize('seller', 'admin'),
  uploadMultiple,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    if (req.user!.role === 'seller' && product.seller.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    const newImages: any[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file, 'products');
        newImages.push({ url: result.url, alt: product.name, isPrimary: false });
      }
    }

    product.images.push(...newImages);
    await product.save();

    res.json({ product });
  })
);

// Delete product image
router.delete(
  '/:id/images/:imageIndex',
  authenticate,
  authorize('seller', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    const index = parseInt(req.params.imageIndex);
    if (index < 0 || index >= product.images.length) {
      throw new AppError('Invalid image index', 400);
    }

    product.images.splice(index, 1);
    await product.save();

    res.json({ product });
  })
);

// Update compatibility
router.put(
  '/:id/compatibility',
  authenticate,
  authorize('seller', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    const { compatibility } = req.body;
    
    await ProductCompatibility.deleteMany({ product: req.params.id });

    if (compatibility && compatibility.length > 0) {
      const entries = compatibility.map((c: any) => ({
        product: req.params.id,
        vehicleType: c.vehicleType,
        brand: c.brand || undefined,
        vehicleModel: c.vehicleModel || undefined,
        variant: c.variant || undefined,
        yearFrom: c.yearFrom,
        yearTo: c.yearTo,
        isUniversal: c.isUniversal || false,
        notes: c.notes,
      }));
      await ProductCompatibility.insertMany(entries);
    }

    const updatedCompat = await ProductCompatibility.find({ product: req.params.id });

    res.json({ compatibility: updatedCompat });
  })
);

// Get seller's products
router.get(
  '/seller/my',
  authenticate,
  authorize('seller'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.query;
    const { page, limit, skip } = parsePagination(req.query, 20, 100);
    const filter: any = { seller: req.user!._id };
    if (status === 'active') filter.isActive = true;
    else if (status === 'inactive') filter.isActive = false;

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      products,
      pagination: getPaginationMeta(total, page, limit),
    });
  })
);

export default router;
