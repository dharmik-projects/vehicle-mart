import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicleBrand extends Document {
  name: string;
  slug: string;
  logo?: string;
  vehicleType: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleBrandSchema = new Schema<IVehicleBrand>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logo: { type: String },
    vehicleType: [{ type: String, enum: ['2-wheeler', 'car', 'truck', 'tractor', 'ev', 'three-wheeler', 'bus'] }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

VehicleBrandSchema.index({ slug: 1 });
VehicleBrandSchema.index({ vehicleType: 1 });

export default mongoose.model<IVehicleBrand>('VehicleBrand', VehicleBrandSchema);
