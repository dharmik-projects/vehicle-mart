import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicleVariant extends Document {
  name: string;
  slug: string;
  vehicleModel: mongoose.Types.ObjectId;
  yearFrom: number;
  yearTo: number;
  engineType: string;
  engineCC?: number;
  fuelType: string;
  transmission?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleVariantSchema = new Schema<IVehicleVariant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    vehicleModel: { type: Schema.Types.ObjectId, ref: 'VehicleModel', required: true },
    yearFrom: { type: Number, required: true },
    yearTo: { type: Number, required: true },
    engineType: { type: String, required: true },
    engineCC: { type: Number },
    fuelType: { type: String, required: true, enum: ['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'] },
    transmission: { type: String, enum: ['manual', 'automatic', 'cvt', 'amt'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

VehicleVariantSchema.index({ vehicleModel: 1 });
VehicleVariantSchema.index({ slug: 1 });
VehicleVariantSchema.index({ fuelType: 1 });

export default mongoose.model<IVehicleVariant>('VehicleVariant', VehicleVariantSchema);
