import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import User from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { uploadSingle, uploadToCloudinary } from '../middleware/upload';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Update profile
router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, phone } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;

    const user = await User.findByIdAndUpdate(req.user!._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password -refreshToken');

    res.json({ user });
  })
);

// Update password
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!._id).select('+password');

    if (!user) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  })
);

// Upload avatar
router.post(
  '/avatar',
  authenticate,
  uploadSingle,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new AppError('No image file provided', 400);
    }

    const result = await uploadToCloudinary(req.file, 'avatars');
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { avatar: result.url },
      { new: true }
    ).select('-password -refreshToken');

    res.json({ user });
  })
);

// Apply as seller
router.post(
  '/become-seller',
  authenticate,
  [
    body('businessName').trim().notEmpty().withMessage('Business name is required'),
    body('businessAddress').trim().notEmpty().withMessage('Business address is required'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg });
      return;
    }

    if (req.user!.role === 'seller') {
      throw new AppError('Already a seller', 400);
    }

    const { businessName, businessAddress, gstNumber, description } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        role: 'seller',
        sellerInfo: {
          businessName,
          businessAddress,
          gstNumber,
          isApproved: false,
          description,
        },
      },
      { new: true }
    ).select('-password -refreshToken');

    res.json({ message: 'Seller application submitted', user });
  })
);

export default router;
