import { Router, Request, Response, NextFunction } from 'express';
import VehicleBrand from '../models/VehicleBrand';
import VehicleModel from '../models/VehicleModel';
import VehicleVariant from '../models/VehicleVariant';
import Product from '../models/Product';
import ProductCompatibility from '../models/ProductCompatibility';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { escapeRegex, getPaginationMeta, parsePagination } from '../utils/helpers';

const asyncHandler = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const router = Router();

/**
 * Real product counts for vehicle brands — ONE shared definition so a count
 * shown anywhere in the UI can never disagree with the product list behind it.
 *
 * Per brand the product set is the union of:
 *  1. approved+active products with a compatibility link to the brand, and
 *  2. approved+active products whose `brand` NAME equals the vehicle brand
 *     (case-insensitive exact match — e.g. genuine parts branded "Hyundai").
 *
 * Returns Map<BrandId, count>; brands absent from the map have 0 products and
 * callers must then omit the count field instead of inventing a number.
 */
async function computeBrandProductCounts(
  brands: Array<{ _id: any; name: string }>
): Promise<Map<string, number>> {
  const [compatPairs, named] = await Promise.all([
    // (1) compatibility links → product sets, active + approved only
    ProductCompatibility.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: '_p',
          pipeline: [{ $match: { isActive: true, isApproved: true } }, { $project: { _id: 1 } }],
        },
      },
      { $unwind: '$_p' },
      { $match: { brand: { $ne: null } } },
      { $group: { _id: '$brand', products: { $addToSet: '$_p._id' } } },
    ]),
    // (2) product brand NAME grouped lowercase (exact-match lookup below)
    Product.aggregate([
      { $match: { isActive: true, isApproved: true, brand: { $type: 'string', $ne: '' } } },
      { $group: { _id: { $toLower: '$brand' }, products: { $addToSet: '$_id' } } },
    ]),
  ]);

  const compatByBrandId = new Map<string, Set<string>>();
  compatPairs.forEach((c: any) =>
    compatByBrandId.set(String(c._id), new Set((c.products || []).map(String)))
  );
  const namedByName = new Map<string, Set<string>>();
  named.forEach((n: any) =>
    namedByName.set(String(n._id), new Set((n.products || []).map(String)))
  );

  const counts = new Map<string, number>();
  for (const b of brands) {
    const ids = new Set<string>(compatByBrandId.get(String(b._id)) || []);
    (namedByName.get(String(b.name).toLowerCase()) || []).forEach((id) => ids.add(id));
    if (ids.size > 0) counts.set(String(b._id), ids.size);
  }
  return counts;
}

// ==================== BRANDS ====================

// Get all brands
router.get('/brands', asyncHandler(async (req: Request, res: Response) => {
  const { vehicleType, withCounts } = req.query;
  const filter: any = { isActive: true };
  if (vehicleType) filter.vehicleType = vehicleType;

  const brands = await VehicleBrand.find(filter).sort({ name: 1 }).lean();

  // ?withCounts=true — attach a REAL productCount; the field is omitted when
  // 0 so the UI never displays an invented number.
  if (withCounts === 'true') {
    const counts = await computeBrandProductCounts(brands);
    res.json({
      brands: brands.map((b) => {
        const n = counts.get(String(b._id));
        return n ? { ...b, productCount: n } : b;
      }),
    });
    return;
  }
  res.json({ brands });
}));

// Get brand by slug
router.get('/brands/:slug', asyncHandler(async (req: Request, res: Response) => {
  const brand = await VehicleBrand.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!brand) throw new AppError('Brand not found', 404);
  res.json({ brand });
}));

// Parts for a brand — the SAME real set the counts are computed from:
// exact case-insensitive brand-name match OR an active compatibility link.
// Paginated like /products so the brand page can Load More without ever
// pulling the whole catalog. Returns distinct category ids as well, so the
// page can render "related categories" without a second product query.
router.get('/brands/:slug/products', asyncHandler(async (req: Request, res: Response) => {
  const brand = await VehicleBrand.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!brand) throw new AppError('Brand not found', 404);

  const { page, limit, skip } = parsePagination(req.query, 8, 24);
  const compatIds = await ProductCompatibility.distinct('product', { brand: brand._id });
  const filter: any = {
    isActive: true,
    isApproved: true,
    $or: [
      { brand: { $regex: `^${escapeRegex(brand.name)}$`, $options: 'i' } },
      { _id: { $in: compatIds } },
    ],
  };

  const [total, products, categoryIds] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .select('name slug brand price mrp stock images averageRating totalReviews category seller')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.distinct('category', filter),
  ]);

  // Vehicle-type chips for this page of cards (same as the main listing)
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
    categoryIds: categoryIds.filter(Boolean).map(String),
  });
}));

// Popular brands — REAL VehicleBrand documents only; counts come from the
// shared computeBrandProductCounts (identical to /brands?withCounts and the
// brand page's parts list). Sorted: real counts first, then alphabetical.
router.get('/popular-brands', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 12, 1), 50);

  const brands = await VehicleBrand.find({ isActive: true }).select('name slug vehicleType').lean();
  const counts = await computeBrandProductCounts(brands);

  const withCounts = brands.map((b: any) => {
    const n = counts.get(String(b._id));
    const base = { _id: String(b._id), name: b.name, slug: b.slug, vehicleType: b.vehicleType };
    return n ? { ...base, productCount: n } : base;
  });

  withCounts.sort((a: any, b: any) => {
    const d = (b.productCount || 0) - (a.productCount || 0);
    return d !== 0 ? d : String(a.name).localeCompare(String(b.name));
  });

  res.json({ brands: withCounts.slice(0, limit) });
}));

// Create brand (admin)
router.post(
  '/brands',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, logo, vehicleType } = req.body;
    if (!name || !name.trim()) throw new AppError('Brand name is required', 400);
    const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');
    const brand = await VehicleBrand.create({ name: name.trim(), slug, logo, vehicleType });
    res.status(201).json({ brand });
  })
);

// Update brand (admin)
router.put(
  '/brands/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const brand = await VehicleBrand.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!brand) throw new AppError('Brand not found', 404);
    res.json({ brand });
  })
);

// Delete brand (admin)
router.delete(
  '/brands/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const brand = await VehicleBrand.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!brand) throw new AppError('Brand not found', 404);
    res.json({ message: 'Brand deactivated' });
  })
);

// ==================== MODELS ====================

// Get models by brand
router.get('/models', asyncHandler(async (req: Request, res: Response) => {
  const { brand, vehicleType, withCounts } = req.query;
  const filter: any = { isActive: true };
  if (brand) filter.brand = brand;
  if (vehicleType) filter.vehicleType = vehicleType;

  const models = await VehicleModel.find(filter)
    .populate('brand', 'name slug logo')
    .sort({ name: 1 })
    .lean();

  // ?withCounts=true — attach REAL part counts (distinct active+approved
  // products linked via compatibility). Field omitted when 0.
  if (withCounts === 'true') {
    const rows = await ProductCompatibility.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: '_p',
          pipeline: [{ $match: { isActive: true, isApproved: true } }, { $project: { _id: 1 } }],
        },
      },
      { $unwind: '$_p' },
      { $match: { vehicleModel: { $ne: null } } },
      { $group: { _id: '$vehicleModel', products: { $addToSet: '$product' } } },
    ]);
    const counts = new Map<string, number>(
      rows.map((r: any) => [String(r._id), (r.products || []).length])
    );
    res.json({
      models: models.map((m: any) => {
        const n = counts.get(String(m._id));
        return n ? { ...m, productCount: n } : m;
      }),
    });
    return;
  }
  res.json({ models });
}));

// Get model by slug
router.get('/models/:slug', asyncHandler(async (req: Request, res: Response) => {
  const model = await VehicleModel.findOne({ slug: req.params.slug, isActive: true })
    .populate('brand', 'name slug logo')
    .lean();
  if (!model) throw new AppError('Model not found', 404);
  res.json({ model });
}));

// Create model (admin)
router.post(
  '/models',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, brand, vehicleType, image } = req.body;
    if (!name || !name.trim()) throw new AppError('Model name is required', 400);
    if (!brand) throw new AppError('Brand is required', 400);
    const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');
    const model = await VehicleModel.create({ name: name.trim(), slug, brand, vehicleType, image });
    res.status(201).json({ model });
  })
);

// Update model (admin)
router.put(
  '/models/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const model = await VehicleModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!model) throw new AppError('Model not found', 404);
    res.json({ model });
  })
);

// Delete model (admin)
router.delete(
  '/models/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const model = await VehicleModel.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!model) throw new AppError('Model not found', 404);
    res.json({ message: 'Model deactivated' });
  })
);

// ==================== VARIANTS ====================

// Get variants by model
router.get('/variants', asyncHandler(async (req: Request, res: Response) => {
  const { model } = req.query;
  const filter: any = { isActive: true };
  if (model) filter.vehicleModel = model;

  const variants = await VehicleVariant.find(filter)
    .populate({ path: 'vehicleModel', select: 'name slug brand', populate: { path: 'brand', select: 'name slug' } })
    .sort({ yearFrom: -1 })
    .lean();
  res.json({ variants });
}));

// Create variant (admin)
router.post(
  '/variants',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, vehicleModel, yearFrom, yearTo, engineType, engineCC, fuelType, transmission } = req.body;
    if (!name || !name.trim()) throw new AppError('Variant name is required', 400);
    if (!vehicleModel) throw new AppError('Model is required', 400);
    const slug = `${name}-${engineType}-${engineCC || ''}`.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');
    const variant = await VehicleVariant.create({
      name: name.trim(), slug, vehicleModel, yearFrom, yearTo, engineType, engineCC, fuelType, transmission,
    });
    res.status(201).json({ variant });
  })
);

// Update variant (admin)
router.put(
  '/variants/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const variant = await VehicleVariant.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!variant) throw new AppError('Variant not found', 404);
    res.json({ variant });
  })
);

// Delete variant (admin)
router.delete(
  '/variants/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const variant = await VehicleVariant.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    );
    if (!variant) throw new AppError('Variant not found', 404);
    res.json({ message: 'Variant deactivated' });
  })
);

// ==================== VEHICLE SELECTION PATH ====================

// Full vehicle selection cascade
router.get('/select', asyncHandler(async (req: Request, res: Response) => {
  const { vehicleType, brandId, modelId } = req.query;
  const result: any = {};

  const brandFilter: any = { isActive: true };
  if (vehicleType) brandFilter.vehicleType = vehicleType;

  // The three steps only depend on query params — run them in parallel
  const [brands, models, variants] = await Promise.all([
    VehicleBrand.find(brandFilter).sort({ name: 1 }).lean(),
    brandId
      ? VehicleModel.find({ brand: brandId, isActive: true }).sort({ name: 1 }).lean()
      : Promise.resolve(null),
    modelId
      // VehicleVariant's parent-model field is `vehicleModel` (not `model`)
      ? VehicleVariant.find({ vehicleModel: modelId, isActive: true }).sort({ yearFrom: -1 }).lean()
      : Promise.resolve(null),
  ]);

  result.brands = brands;
  if (brandId) result.models = models;
  if (modelId) result.variants = variants;

  res.json(result);
}));

export default router;
