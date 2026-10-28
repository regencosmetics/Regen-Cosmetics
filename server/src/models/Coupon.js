import mongoose from 'mongoose';
const { Schema } = mongoose;
const couponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9_-]{3,30}$/ },
  description: { type: String, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  maxDiscount: { type: Number, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  startsAt: Date,
  expiresAt: Date,
  usageLimit: { type: Number, min: 0 },          // total; 0/undefined = unlimited
  perUserLimit: { type: Number, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  eligibleProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  eligibleCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  isPublic: { type: Boolean, default: true },    // listed in "View all offers"
  isSample: { type: Boolean, default: false },
}, { timestamps: true });
couponSchema.pre('validate', function (next) {
  if (this.type === 'percent' && this.value > 100) return next(new Error('Percent discount cannot exceed 100'));
  next();
});
export default mongoose.model('Coupon', couponSchema);
