import mongoose from 'mongoose';
const { Schema } = mongoose;
const base = {
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true, maxlength: 2000 },
  image: { url: String, publicId: String },
  banner: { url: String, publicId: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  seo: { title: String, description: String },
};
export const categorySchema = new Schema(base, { timestamps: true });
categorySchema.index({ isActive: 1, sortOrder: 1 });
export default mongoose.model('Category', categorySchema);
