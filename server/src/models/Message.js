import mongoose from 'mongoose';
const s = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  isRead: { type: Boolean, default: false, index: true },
  ip: String,
}, { timestamps: true });
s.index({ createdAt: -1 });
export default mongoose.model('Message', s);
