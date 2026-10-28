import mongoose from 'mongoose';
const s = new mongoose.Schema({
  placement: { type: String, enum: ['hero', 'promo'], default: 'hero', index: true },
  title: { type: String, trim: true, maxlength: 200 },
  subtitle: { type: String, trim: true, maxlength: 400 },
  image: { url: { type: String, required: true }, publicId: String, alt: String },
  mobileImage: { url: String, publicId: String },
  ctaText: { type: String, trim: true, maxlength: 60 },
  ctaLink: { type: String, trim: true, maxlength: 300 },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  startsAt: Date,
  endsAt: Date,
}, { timestamps: true });
export default mongoose.model('Banner', s);
