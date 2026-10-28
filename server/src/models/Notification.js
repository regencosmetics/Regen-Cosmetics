import mongoose from 'mongoose';
// Email outbox: enables retry and decouples email failures from order/payment success.
const s = new mongoose.Schema({
  type: { type: String, required: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  html: { type: String, required: true },
  text: String,
  status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  lastError: String,
  providerId: String,
  dedupeKey: { type: String },
  sentAt: Date,
}, { timestamps: true });
s.index({ dedupeKey: 1 }, { unique: true, sparse: true });
s.index({ status: 1, nextAttemptAt: 1 });
export default mongoose.model('Notification', s);
