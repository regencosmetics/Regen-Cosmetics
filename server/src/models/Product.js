import mongoose from 'mongoose';
const { Schema } = mongoose;

const variantSchema = new Schema({
  sku: { type: String, required: true, trim: true, uppercase: true },
  label: { type: String, required: true, trim: true, default: 'Standard' }, // e.g. "50 ML"
  size: { type: String, trim: true },
  color: { type: String, trim: true },
  netContent: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },       // regular price (MRP)
  salePrice: { type: Number, min: 0 },                   // optional discounted price
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, default: 5, min: 0 },
  image: String,
  active: { type: Boolean, default: true },
});

const imageSchema = new Schema({
  url: { type: String, required: true },
  publicId: String,
  alt: { type: String, default: '' },
}, { _id: false });

const productSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  tagline: { type: String, trim: true },                    // e.g. "Suitable For Acne-Prone Skin"
  shortDescription: { type: String, trim: true, maxlength: 400 },
  description: { type: String, trim: true, maxlength: 5000 },
  ingredients: { type: String, trim: true, maxlength: 3000 },
  instructions: [{ type: String, trim: true }],
  benefits: [{ type: String, trim: true }],
  highlights: [{ type: String, trim: true }],
  images: [imageSchema],
  detailImages: [imageSchema],                              // long-form banners (Product Detail, Key Features, How To Use)
  category: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
  collections: [{ type: Schema.Types.ObjectId, ref: 'Collection', index: true }],
  concerns: [{ type: String, trim: true, lowercase: true }],
  audience: [{ type: String, enum: ['men', 'women', 'unisex'] }],
  tags: [{ type: String, trim: true, lowercase: true }],
  variants: { type: [variantSchema], validate: [(v) => v.length > 0, 'At least one variant is required'] },
  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false },
  isBestseller: { type: Boolean, default: false },
  badge: { type: String, trim: true },                      // e.g. "Limited Time Offer"
  returnPolicy: {
    returnable: { type: Boolean, default: true },
    windowDays: { type: Number, min: 0 },                   // overrides RETURN_WINDOW_DAYS when set
  },
  faqs: [{ q: String, a: String, _id: false }],
  frequentlyBoughtWith: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  seo: { title: String, description: String },
  priceMin: { type: Number, default: 0, index: true },        // denormalised effective min price (for filtering/sorting)
  discountMax: { type: Number, default: 0 },                  // denormalised best discount percent
  ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0, min: 0 },
  isSample: { type: Boolean, default: false },              // seeded demo record
}, { timestamps: true });

productSchema.index({ 'variants.sku': 1 }, { unique: true });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ name: 1 });


productSchema.pre('validate', function (next) {
  for (const v of this.variants) {
    if (v.salePrice != null && v.salePrice > v.price) {
      return next(new Error(`Sale price cannot exceed regular price (variant ${v.sku})`));
    }
  }
  const act = this.variants.filter((x) => x.active !== false);
  const eff = (v) => (v.salePrice != null && v.salePrice < v.price ? v.salePrice : v.price);
  this.priceMin = act.length ? Math.min(...act.map(eff)) : 0;
  this.discountMax = act.length ? Math.max(...act.map((v) => (v.price > 0 ? Math.round(((v.price - eff(v)) / v.price) * 100) : 0))) : 0;
  next();
});
productSchema.set('toJSON', { virtuals: true, transform: (_d, r) => { delete r.__v; delete r.id; return r; } });
export default mongoose.model('Product', productSchema);
