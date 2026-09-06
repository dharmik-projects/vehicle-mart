import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicleModel extends Document {
  name: string;
  slug: string;
  brand: mongoose.Types.ObjectId;
  vehicleType: string;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleModelSchema = new Schema<IVehicleModel>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    brand: { type: Schema.Types.ObjectId, ref: 'VehicleBrand', required: true },
    vehicleType: { type: String, required: true, enum: ['2-wheeler', 'car', 'truck', 'tractor', 'ev', 'three-wheeler', 'bus'] },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

VehicleModelSchema.index({ brand: 1 });
VehicleModelSchema.index({ slug: 1 });
VehicleModelSchema.index({ vehicleType: 1 });

export default mongoose.model<IVehicleModel>('VehicleModel', VehicleModelSchema);
