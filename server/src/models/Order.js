import mongoose from 'mongoose';
const { Schema } = mongoose;

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
export const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'COD Pending', 'COD Collected', 'Refund Processing', 'Partially Refunded', 'Refunded'];

const itemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  variantLabel: String,
  image: String,
  slug: String,
  unitPrice: { type: Number, required: true },       // price actually charged per unit before coupon
  mrp: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true },       // unitPrice*qty
  discountShare: { type: Number, default: 0 },       // coupon discount allocated to this line
  netTotal: { type: Number, required: true },        // lineTotal - discountShare
  returnable: { type: Boolean, default: true },
  returnWindowDays: Number,
});

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [itemSchema],
  shippingAddress: {
    fullName: String, phone: String, line1: String, line2: String, landmark: String,
    city: String, state: String, pincode: String, country: String,
  },
  customer: { name: String, email: String, phone: String },
  pricing: {
    subtotal: Number, mrpTotal: Number, discount: { type: Number, default: 0 }, couponCode: String,
    shipping: { type: Number, default: 0 }, codFee: { type: Number, default: 0 }, total: Number, currency: { type: String, default: 'INR' },
  },
  paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },
  paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Pending', index: true },
  status: { type: String, enum: ORDER_STATUSES, default: 'Pending', index: true },
  statusHistory: [{ status: String, note: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now }, _id: false }],
  tracking: { carrier: String, trackingNumber: String, url: String, note: String },
  shippedAt: Date, deliveredAt: Date, cancelledAt: Date, cancelReason: String, cancelledBy: String,
  refundedAmount: { type: Number, default: 0 },
  // inventory bookkeeping; guarded by unique InventoryTransaction opKeys as well
  inventoryReserved: { type: Boolean, default: false },
  inventoryReleased: { type: Boolean, default: false },
  reservationExpiresAt: Date,
  idempotencyKey: { type: String },
  invoiceNumber: { type: String },
  couponRedeemed: { type: Boolean, default: false },
  hasReturns: { type: Boolean, default: false },
}, { timestamps: true });

orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true }); // stored as `${userId}:${clientKey}`
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ reservationExpiresAt: 1, status: 1 });
orderSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });
export default mongoose.model('Order', orderSchema);
