import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'user' | 'seller' | 'admin';
  avatar?: string;
  isActive: boolean;
  sellerInfo?: {
    businessName: string;
    businessAddress: string;
    gstNumber?: string;
    isApproved: boolean;
    description?: string;
    payoutInfo?: {
      accountHolder?: string;
      accountNumber?: string;
      ifscCode?: string;
      bankName?: string;
    };
  };
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['user', 'seller', 'admin'],
      default: 'user',
    },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    sellerInfo: {
      businessName: String,
      businessAddress: String,
      gstNumber: String,
      isApproved: { type: Boolean, default: false },
      description: String,
    },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
// Admin/seller listing & dashboard filters (role-scoped newest-first scans)
UserSchema.index({ createdAt: -1 });
UserSchema.index({ role: 1, createdAt: -1 });
UserSchema.index({ role: 1, 'sellerInfo.isApproved': 1 });

export default mongoose.model<IUser>('User', UserSchema);
