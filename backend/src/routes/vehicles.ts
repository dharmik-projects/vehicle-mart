import { Router, Request, Response, NextFunction } from 'express';
import VehicleBrand from '../models/VehicleBrand';
import VehicleModel from '../models/VehicleModel';
import VehicleVariant from '../models/VehicleVariant';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const asyncHandler = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const router = Router();

// ==================== BRANDS ====================

// Get all brands
router.get('/brands', asyncHandler(async (req: Request, res: Response) => {
  const { vehicleType } = req.query;
  const filter: any = { isActive: true };
  if (vehicleType) filter.vehicleType = vehicleType;

  const brands = await VehicleBrand.find(filter).sort({ name: 1 }).lean();
  res.json({ brands });
}));

// Get brand by slug
router.get('/brands/:slug', asyncHandler(async (req: Request, res: Response) => {
  const brand = await VehicleBrand.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!brand) throw new AppError('Brand not found', 404);
  res.json({ brand });
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
  const { brand, vehicleType } = req.query;
  const filter: any = { isActive: true };
  if (brand) filter.brand = brand;
  if (vehicleType) filter.vehicleType = vehicleType;

  const models = await VehicleModel.find(filter)
    .populate('brand', 'name slug logo')
    .sort({ name: 1 })
    .lean();
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
