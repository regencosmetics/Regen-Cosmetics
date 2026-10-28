import mongoose from 'mongoose';
const { Schema } = mongoose;

const addressSchema = new Schema({
  label: { type: String, trim: true, default: 'Home' },
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true, maxlength: 200 },
  line2: { type: String, trim: true, maxlength: 200 },
  landmark: { type: String, trim: true, maxlength: 100 },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  state: { type: String, required: true, trim: true, maxlength: 80 },
  pincode: { type: String, required: true, trim: true, match: /^[1-9][0-9]{5}$/ },
  country: { type: String, default: 'India' },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
  addresses: [addressSchema],
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  isActive: { type: Boolean, default: true },
  passwordChangedAt: Date,
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: { type: Date, select: false },
  lastLoginAt: Date,
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (_d, ret) => { delete ret.passwordHash; delete ret.resetTokenHash; delete ret.resetTokenExpires; delete ret.__v; return ret; },
});
export default mongoose.model('User', userSchema);
