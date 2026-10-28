import mongoose from 'mongoose';
const { Schema } = mongoose;
const refundSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  return: { type: Schema.Types.ObjectId, ref: 'Return' },
  payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  idempotencyKey: { type: String, required: true, unique: true },   // e.g. cancel:<orderId>, return:<returnId>
  amount: { type: Number, required: true, min: 0 },                 // rupees
  method: { type: String, enum: ['razorpay', 'cod_upi', 'cod_bank', 'manual'], required: true },
  reason: String,
  status: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Failed'], default: 'Pending', index: true },
  providerRefundId: { type: String },
  providerStatus: String,
  failureReason: String,
  // minimal payout details for manual (COD) refunds; account number encrypted at rest
  payout: { upiId: String, accountHolder: String, ifsc: String, accountNumberEnc: String, accountLast4: String },
  manualReference: String,
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
}, { timestamps: true });
refundSchema.index({ providerRefundId: 1 }, { unique: true, sparse: true });
export default mongoose.model('Refund', refundSchema);
