import mongoose from 'mongoose';
const s = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  status: { type: String, enum: ['subscribed', 'unsubscribed'], default: 'subscribed', index: true },
  unsubscribeToken: { type: String, required: true, select: false },
  subscribedAt: { type: Date, default: Date.now },
  unsubscribedAt: Date,
}, { timestamps: true });
export default mongoose.model('NewsletterSubscriber', s);
