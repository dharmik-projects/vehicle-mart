import mongoose, { Schema, Document } from 'mongoose';

export interface IProductImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  sku: string;
  partNumber?: string;
  oemPartNumber?: string;
  brand: string;
  category: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  price: number;
  mrp: number;
  discount?: number;
  stock: number;
  lowStockThreshold: number;
  images: IProductImage[];
  specifications: Map<string, string>;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  warranty?: string;
  originCountry?: string;
  isActive: boolean;
  isApproved: boolean;
  averageRating: number;
  totalReviews: number;
  totalSales: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    partNumber: { type: String, trim: true },
    oemPartNumber: { type: String, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    specifications: { type: Map, of: String, default: {} },
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    warranty: { type: String },
    originCountry: { type: String },
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

ProductSchema.index({ slug: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ seller: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });
ProductSchema.index({ isActive: 1, isApproved: 1 });
ProductSchema.index({ averageRating: -1 });
ProductSchema.index({ totalSales: -1 });
ProductSchema.index({ partNumber: 1 });
ProductSchema.index({ oemPartNumber: 1 });
// List endpoint combos: common (isActive, isApproved) filter + sort key in one
// index so listing pages never need an in-memory sort at scale.
ProductSchema.index({ isActive: 1, isApproved: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, isApproved: 1, totalSales: -1 });
ProductSchema.index({ isActive: 1, isApproved: 1, price: 1 });
ProductSchema.index({ isActive: 1, isApproved: 1, averageRating: -1 });
// Seller "my products" list (scoped by seller + status flags, newest first)
ProductSchema.index({ seller: 1, isActive: 1, isApproved: 1, createdAt: -1 });
// Public list filtered/sorted by sidebar facets
ProductSchema.index({ isActive: 1, isApproved: 1, brand: 1 });
ProductSchema.index({ isActive: 1, isApproved: 1, category: 1 });
ProductSchema.index({ isActive: 1, isApproved: 1, stock: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);
