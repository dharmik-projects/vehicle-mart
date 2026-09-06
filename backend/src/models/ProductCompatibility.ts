import mongoose, { Schema, Document } from 'mongoose';

export interface IProductCompatibility extends Document {
  product: mongoose.Types.ObjectId;
  vehicleType: string;
  brand?: mongoose.Types.ObjectId;
  vehicleModel?: mongoose.Types.ObjectId;
  variant?: mongoose.Types.ObjectId;
  yearFrom?: number;
  yearTo?: number;
  isUniversal: boolean;
  notes?: string;
  createdAt: Date;
}

const ProductCompatibilitySchema = new Schema<IProductCompatibility>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    vehicleType: { type: String, required: true, enum: ['2-wheeler', 'car', 'truck', 'tractor', 'ev', 'three-wheeler', 'bus', 'universal'] },
    brand: { type: Schema.Types.ObjectId, ref: 'VehicleBrand' },
    vehicleModel: { type: Schema.Types.ObjectId, ref: 'VehicleModel' },
    variant: { type: Schema.Types.ObjectId, ref: 'VehicleVariant' },
    yearFrom: { type: Number },
    yearTo: { type: Number },
    isUniversal: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

ProductCompatibilitySchema.index({ product: 1 });
ProductCompatibilitySchema.index({ vehicleType: 1 });
ProductCompatibilitySchema.index({ brand: 1 });
ProductCompatibilitySchema.index({ vehicleModel: 1 });
ProductCompatibilitySchema.index({ variant: 1 });

export default mongoose.model<IProductCompatibility>('ProductCompatibility', ProductCompatibilitySchema);
