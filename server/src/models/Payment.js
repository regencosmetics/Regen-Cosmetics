import mongoose from 'mongoose';
const { Schema } = mongoose;
const paymentSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, default: 'razorpay' },
  providerOrderId: { type: String, required: true, unique: true },
  providerPaymentId: { type: String },
  amount: { type: Number, required: true },            // in paise
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['created', 'captured', 'failed', 'refunded', 'partially_refunded'], default: 'created', index: true },
  method: String,
  signatureVerified: { type: Boolean, default: false },
  capturedAt: Date,
  attempts: [{ paymentId: String, status: String, errorCode: String, errorDescription: String, source: String, at: { type: Date, default: Date.now }, _id: false }],
  refundedAmount: { type: Number, default: 0 },        // paise
  lateCapture: { type: Boolean, default: false },
}, { timestamps: true });
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });
export default mongoose.model('Payment', paymentSchema);
