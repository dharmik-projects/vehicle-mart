import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  paymentMethod: 'cod' | 'online' | 'upi';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  trackingNumber?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  stockRestoredAt?: Date | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String },
});

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true, default: 'India' },
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'online', 'upi'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'pending',
    },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    trackingNumber: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    // Set exactly once when reserved stock is given back (cancel / return approval).
    // Undefined/null = stock for this order is still held (decremented at creation).
    stockRestoredAt: { type: Date, default: null },
    notes: { type: String },
  },
  { timestamps: true }
);

// Single-list / dashboard query paths
OrderSchema.index({ user: 1, createdAt: -1 });                 // customer order list
OrderSchema.index({ user: 1, 'items.product': 1, orderStatus: 1 }); // "did user buy this product" (review check)
OrderSchema.index({ createdAt: -1 });                          // admin list sorted by date
OrderSchema.index({ orderStatus: 1, createdAt: -1 });          // admin list filtered by status
OrderSchema.index({ paymentStatus: 1, orderStatus: 1, createdAt: -1 }); // revenue / pending-payment aggregates
OrderSchema.index({ 'items.seller': 1, createdAt: -1 });       // seller order list / recent orders
OrderSchema.index({ 'items.seller': 1, orderStatus: 1 });      // seller status counts
OrderSchema.index({ 'items.seller': 1, paymentStatus: 1, orderStatus: 1, createdAt: -1 }); // seller revenue/pending/monthly aggregates

export default mongoose.model<IOrder>('Order', OrderSchema);
