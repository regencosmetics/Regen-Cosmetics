import mongoose from 'mongoose';
const { Schema } = mongoose;
export const RETURN_STATUSES = ['Return Requested', 'Under Review', 'Approved', 'Rejected', 'Pickup Scheduled', 'Product Received', 'Product Inspected', 'Refund Processing', 'Refund Completed'];
export const RETURN_REASONS = ['Damaged Product', 'Wrong Item Received', 'Missing or Incomplete Order', 'Defective Product', 'Other'];
const returnSchema = new Schema({
  returnNumber: { type: String, required: true, unique: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    sku: { type: String, required: true }, name: String, image: String, quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, enum: RETURN_REASONS, required: true }, comment: { type: String, maxlength: 1000 },
    unitRefund: Number,                              // net unit amount paid (after coupon allocation)
    inspection: { type: String, enum: ['pending', 'resellable', 'not_resellable'], default: 'pending' },
    restocked: { type: Boolean, default: false },
    _id: false,
  }],
  evidence: [{ url: String, publicId: String, _id: false }],
  status: { type: String, enum: RETURN_STATUSES, default: 'Return Requested', index: true },
  statusHistory: [{ status: String, note: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now }, _id: false }],
  adminNote: String,
  rejectionReason: String,
  pickup: { scheduledFor: Date, note: String },
  refundMethod: { type: String, enum: ['original', 'upi', 'bank'], default: 'original' },
  refundAmount: Number,
  refund: { type: Schema.Types.ObjectId, ref: 'Refund' },
  // payout details are kept only on the Refund document (encrypted); the request carries them transiently
}, { timestamps: true });
returnSchema.index({ status: 1, createdAt: -1 });
export default mongoose.model('Return', returnSchema);
