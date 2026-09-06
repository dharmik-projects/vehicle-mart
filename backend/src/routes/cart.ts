import { Router, Response } from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';
import { AuthRequest, authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Get cart
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  let cart = await Cart.findOne({ user: req.user!._id })
    .populate({
      path: 'items.product',
      select: 'name slug price mrp discount images stock isActive isApproved brand',
      populate: { path: 'category', select: 'name slug' },
    });

  if (!cart) {
    cart = await Cart.create({ user: req.user!._id, items: [] });
  }

  // Filter out inactive products
  const validItems = cart.items.filter(
    (item) => item.product && (item.product as any).isActive
  );

  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cart.save();
  }

  const total = cart.items.reduce((sum, item) => {
    const product = item.product as any;
    return sum + (product.price || item.price) * item.quantity;
  }, 0);

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  res.json({ cart, total, totalItems });
}));

// Add to cart
router.post('/add', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) throw new AppError('Product ID is required', 400);

  const product = await Product.findOne({ _id: productId, isActive: true, isApproved: true });
  if (!product) throw new AppError('Product not found', 404);
  if (product.stock < quantity) {
    throw new AppError(`Only ${product.stock} items in stock`, 400);
  }

  let cart = await Cart.findOne({ user: req.user!._id });
  if (!cart) {
    cart = new Cart({ user: req.user!._id, items: [] });
  }

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (newQty > product.stock) {
      throw new AppError(`Only ${product.stock} items in stock`, 400);
    }
    existingItem.quantity = newQty;
    existingItem.price = product.price;
  } else {
    cart.items.push({
      product: product._id,
      quantity,
      price: product.price,
      addedAt: new Date(),
    });
  }

  await cart.save();

  const populatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.product',
      select: 'name slug price mrp discount images stock',
    });

  const totalItems = populatedCart!.items.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ cart: populatedCart, totalItems, message: 'Added to cart' });
}));

// Update cart item quantity
router.put('/item/:productId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) throw new AppError('Valid quantity is required', 400);

  const cart = await Cart.findOne({ user: req.user!._id });
  if (!cart) throw new AppError('Cart not found', 404);

  const item = cart.items.find(
    (item) => item.product.toString() === req.params.productId
  );
  if (!item) throw new AppError('Item not in cart', 404);

  const product = await Product.findById(req.params.productId);
  if (!product) throw new AppError('Product not found', 404);
  if (quantity > product.stock) {
    throw new AppError(`Only ${product.stock} items in stock`, 400);
  }

  item.quantity = quantity;
  item.price = product.price;
  await cart.save();

  const populatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.product',
      select: 'name slug price mrp discount images stock',
    });

  const totalItems = populatedCart!.items.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ cart: populatedCart, totalItems });
}));

// Remove from cart
router.delete('/item/:productId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const cart = await Cart.findOne({ user: req.user!._id });
  if (!cart) throw new AppError('Cart not found', 404);

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== req.params.productId
  );
  await cart.save();

  const populatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.product',
      select: 'name slug price mrp discount images stock',
    });

  const totalItems = populatedCart!.items.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ cart: populatedCart, totalItems, message: 'Removed from cart' });
}));

// Clear cart
router.delete('/clear', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  await Cart.findOneAndUpdate(
    { user: req.user!._id },
    { items: [] }
  );
  res.json({ message: 'Cart cleared' });
}));

export default router;
