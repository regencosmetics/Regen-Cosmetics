import { Product, Category, Collection, Review } from '../models/index.js';
import { escapeRegex, slugify } from '../utils/helpers.js';
import { AppError } from '../utils/AppError.js';

export const SORTS = {
  newest: { createdAt: -1 }, price_asc: { priceMin: 1, _id: 1 }, price_desc: { priceMin: -1, _id: 1 },
  name_asc: { name: 1 }, rating: { ratingAverage: -1, ratingCount: -1 }, discount: { discountMax: -1, _id: 1 },
};

export async function buildProductFilter(q, { admin = false } = {}) {
  const f = {};
  if (!admin) f.isActive = true;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    f.$or = [{ name: rx }, { tagline: rx }, { shortDescription: rx }, { tags: rx }, { sku: rx }, { 'variants.sku': rx }];
  }
  if (q.category) {
    const c = await Category.findOne({ slug: q.category }).select('_id');
    f.category = c ? c._id : null;
  }
  if (q.collection) {
    const c = await Collection.findOne({ slug: q.collection }).select('_id');
    f.collections = c ? c._id : null;
  }
  if (q.concern) f.concerns = q.concern.toLowerCase();
  if (q.audience) f.audience = q.audience;
  if (q.bestseller === 'true') f.isBestseller = true;
  if (q.featured === 'true') f.isFeatured = true;
  if (q.minPrice != null || q.maxPrice != null) {
    f.priceMin = {};
    if (q.minPrice != null) f.priceMin.$gte = q.minPrice;
    if (q.maxPrice != null) f.priceMin.$lte = q.maxPrice;
  }
  if (q.inStock === 'true') f.variants = { $elemMatch: { stock: { $gt: 0 }, active: { $ne: false } } };
  return f;
}

export async function listProducts(q, opts = {}) {
  const filter = await buildProductFilter(q, opts);
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Product.find(filter).sort(SORTS[q.sort] || SORTS.newest).skip(skip).limit(q.limit).populate('category', 'name slug'),
    Product.countDocuments(filter),
  ]);
  return { items, pagination: { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) } };
}

export async function uniqueSlug(base, excludeId) {
  let slug = slugify(base) || 'product'; let n = 1; const root = slug;
  while (await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${root}-${++n}`;
  return slug;
}

export async function recomputeRating(productId) {
  const rows = await Review.aggregate([{ $match: { product: productId, status: 'approved' } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  const avg = rows[0] ? Math.round(rows[0].avg * 10) / 10 : 0;
  await Product.updateOne({ _id: productId }, { ratingAverage: avg, ratingCount: rows[0]?.n || 0 });
}

export function assertUniqueSkus(variants) {
  const s = new Set();
  for (const v of variants) { if (s.has(v.sku)) throw new AppError(`Duplicate variant SKU ${v.sku}`, 400, 'DUPLICATE_SKU'); s.add(v.sku); }
}
