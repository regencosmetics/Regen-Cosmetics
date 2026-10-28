import mongoose from 'mongoose';
const { Schema } = mongoose;
const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  body: { type: String, trim: true, maxlength: 2000 },
  verifiedPurchase: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  isSample: { type: Boolean, default: false },
}, { timestamps: true });
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
export default mongoose.model('Review', reviewSchema);
