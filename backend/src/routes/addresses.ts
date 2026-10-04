import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Address from '../models/Address';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

// Address book belongs to the customer checkout flow
router.use(authenticate, authorize('user'));

// Get all addresses
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const addresses = await Address.find({ user: req.user!._id })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();
  res.json({ addresses });
}));

// Get single address
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user!._id });
  if (!address) throw new AppError('Address not found', 404);
  res.json({ address });
}));

// Create address
router.post(
  '/',
  [
    body('label').trim().notEmpty().withMessage('Label is required'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('addressLine1').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('pincode').trim().notEmpty().withMessage('Pincode is required'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg });
      return;
    }

    const { label, fullName, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault } = req.body;

    if (isDefault) {
      await Address.updateMany({ user: req.user!._id }, { isDefault: false });
    }

    const address = await Address.create({
      user: req.user!._id,
      label, fullName, phone, addressLine1, addressLine2,
      city, state, pincode, country: country || 'India', isDefault,
    });

    res.status(201).json({ address });
  })
);

// Update address
router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user!._id });
  if (!address) throw new AppError('Address not found', 404);

  if (req.body.isDefault) {
    await Address.updateMany({ user: req.user!._id }, { isDefault: false });
  }

  Object.assign(address, req.body);
  await address.save();

  res.json({ address });
}));

// Delete address
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user!._id });
  if (!address) throw new AppError('Address not found', 404);
  res.json({ message: 'Address deleted' });
}));

// Set default
router.put('/:id/default', asyncHandler(async (req: AuthRequest, res: Response) => {
  await Address.updateMany({ user: req.user!._id }, { isDefault: false });
  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, user: req.user!._id },
    { isDefault: true },
    { new: true }
  );
  if (!address) throw new AppError('Address not found', 404);
  res.json({ address });
}));

export default router;
