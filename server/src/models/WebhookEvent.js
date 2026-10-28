import mongoose from 'mongoose';
const s = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  event: String,
  processedAt: Date,
  status: { type: String, enum: ['processing', 'done', 'failed'], default: 'processing' },
  createdAt: { type: Date, default: Date.now, index: true },
});
export default mongoose.model('WebhookEvent', s);
