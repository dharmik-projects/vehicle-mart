import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import vehicleRoutes from './vehicles';
import categoryRoutes from './categories';
import productRoutes from './products';
import cartRoutes from './cart';
import wishlistRoutes from './wishlist';
import addressRoutes from './addresses';
import orderRoutes from './orders';
import reviewRoutes from './reviews';
import adminRoutes from './admin';
import sellerRoutes from './seller';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/addresses', addressRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);
router.use('/seller', sellerRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
