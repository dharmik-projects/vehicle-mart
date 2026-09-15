import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Product from '../models/Product';
import ProductCompatibility from '../models/ProductCompatibility';
import Review from '../models/Review';
import { AuthRequest, authenticate, authorize, optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { uploadMultiple, uploadToCloudinary } from '../middleware/upload';
import { generateSlug, generateSKU, getPaginationMeta } from '../utils/helpers';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Search & list products
router.get('/', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const {
    q, category, brand, vehicleType, vehicleBrand, vehicleModel, vehicleVariant,
    minPrice, maxPrice, rating, sort, page = '1', limit = '20',
    seller, isApproved,
  } = req.query;

  const filter: any = { isActive: true };

  // Search — regex across name, brand, SKU, part numbers, description
  if (q) {
    const searchTerm = q as string;
    filter.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { brand: { $regex: searchTerm, $options: 'i' } },
      { sku: { $regex: searchTerm, $options: 'i' } },
      { partNumber: { $regex: searchTerm, $options: 'i' } },
      { oemPartNumber: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (category) filter.category = category;
  if (brand) filter.brand = { $regex: brand as string, $options: 'i' };
  if (seller) filter.seller = seller;
  if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
  else filter.isApproved = true;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (rating) filter.averageRating = { $gte: Number(rating) };

  // Vehicle compatibility filter
  if (vehicleType || vehicleBrand || vehicleModel || vehicleVariant) {
    const compatFilter: any = {};
    if (vehicleType) compatFilter.vehicleType = vehicleType;
    if (vehicleBrand) compatFilter.brand = vehicleBrand;
    if (vehicleModel) compatFilter.vehicleModel = vehicleModel;
    if (vehicleVariant) compatFilter.variant = vehicleVariant;

    const compatibleProductIds = await ProductCompatibility.distinct('product', {
      ...compatFilter,
      $or: [
        { isUniversal: true },
        { ...compatFilter },
      ],
    });

    // Also include universal products
    const universalIds = await ProductCompatibility.distinct('product', { isUniversal: true });
    const allIds = [...new Set([...compatibleProductIds.map(id => id.toString()), ...universalIds.map(id => id.toString())])];
    filter._id = { $in: allIds };
  }

  // Sort
  let sortOption: any = { createdAt: -1 };
  if (sort === 'price_asc') sortOption = { price: 1 };
  else if (sort === 'price_desc') sortOption = { price: -1 };
  else if (sort === 'rating') sortOption = { averageRating: -1 };
  else if (sort === 'popular') sortOption = { totalSales: -1 };
  else if (sort === 'newest') sortOption = { createdAt: -1 };
  else if (q) sortOption = { totalSales: -1 };

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('category', 'name slug')
    .populate('seller', 'name sellerInfo.businessName')
    .sort(sortOption)
    .skip(skip)
    .limit(limitNum)
    .lean();

  res.json({
    products,
    pagination: getPaginationMeta(total, pageNum, limitNum),
  });
}));

// Get single product
router.get('/:slug', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true })
    .populate('category', 'name slug')
    .populate('seller', 'name sellerInfo.businessName sellerInfo.isApproved')
    .lean();

  if (!product) throw new AppError('Product not found', 404);

  const compatibility = await ProductCompatibility.find({ product: product._id })
    .populate('brand', 'name slug')
    .populate('vehicleModel', 'name slug')
    .populate('variant', 'name slug')
    .lean();

  const reviewCount = await Review.countDocuments({ product: product._id });

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
    const { page = '1', limit = '20', status } = req.query;
    const filter: any = { seller: req.user!._id };
    if (status === 'active') filter.isActive = true;
    else if (status === 'inactive') filter.isActive = false;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.json({
      products,
      pagination: getPaginationMeta(total, pageNum, limitNum),
    });
  })
);

export default router;
