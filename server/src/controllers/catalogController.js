import { Product, Review, Order } from '../models/index.js';
import env from '../config/env.js';
import { AppError, notFound } from '../utils/AppError.js';
import { asyncHandler, ok, oid, escapeRegex, pageParams, paged } from '../utils/helpers.js';
import { listProducts, recomputeRating } from '../services/productService.js';

export const list = asyncHandler(async (req, res) => {
  const r = await listProducts(req.validatedQuery);
  ok(res, r);
});

export const suggest = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q.length < 2) return ok(res, { items: [] });
  const rx = new RegExp(escapeRegex(q), 'i');
  const items = await Product.find({ isActive: true, $or: [{ name: rx }, { tags: rx }] }).limit(6).select('name slug images priceMin');
  ok(res, { items });
});

export const detail = asyncHandler(async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug, isActive: true }).populate('category', 'name slug').populate('collections', 'name slug');
  if (!p) throw notFound('Product');
  const bought = p.frequentlyBoughtWith?.length ? await Product.find({ _id: { $in: p.frequentlyBoughtWith }, isActive: true }) : [];
  ok(res, { product: p, frequentlyBoughtTogether: bought });
});

export const related = asyncHandler(async (req, res) => {
  const p = await Product.findOne({ _id: oid(req.params.id), isActive: true });
  if (!p) throw notFound('Product');
  const items = await Product.find({ _id: { $ne: p._id }, isActive: true, ...(p.category ? { category: p.category } : {}) }).limit(8);
  const fill = items.length < 4 ? await Product.find({ _id: { $nin: [p._id, ...items.map((i) => i._id)] }, isActive: true }).limit(4 - items.length) : [];
  ok(res, { items: [...items, ...fill] });
});

export const taxonomy = (Model) => ({
  list: asyncHandler(async (_req, res) => ok(res, { items: await Model.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }) })),
  detail: asyncHandler(async (req, res) => {
    const item = await Model.findOne({ slug: req.params.slug, isActive: true });
    if (!item) throw notFound(Model.modelName);
    ok(res, { item });
  }),
});

export const listReviews = asyncHandler(async (req, res) => {
  const pg = pageParams(req.query, 5, 20);
  const filter = { product: oid(req.params.id), status: 'approved' };
  const [items, total, dist] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).select('-user'),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: filter }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
  ]);
  const p = await Product.findById(req.params.id).select('ratingAverage ratingCount');
  ok(res, { ...paged(items, total, pg), summary: { average: p?.ratingAverage || 0, count: p?.ratingCount || 0, distribution: Object.fromEntries(dist.map((d) => [d._id, d.n])) } });
});

export const createReview = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: oid(req.params.id), isActive: true });
  if (!product) throw notFound('Product');
  const verified = Boolean(await Order.exists({ user: req.user._id, status: 'Delivered', 'items.product': product._id }));
  if (env.REVIEW_VERIFIED_ONLY && !verified) throw new AppError('Only customers who received this product can review it', 403, 'VERIFIED_ONLY');
  try {
    const review = await Review.create({
      product: product._id, user: req.user._id, displayName: req.user.name.split(' ').map((w, i) => (i === 0 ? w : `${w[0]}.`)).join(' '),
      rating: req.body.rating, title: req.body.title, body: req.body.body, verifiedPurchase: verified,
      status: env.REVIEW_AUTO_APPROVE ? 'approved' : 'pending',
    });
    if (review.status === 'approved') await recomputeRating(product._id);
    ok(res, { review }, env.REVIEW_AUTO_APPROVE ? 'Review published' : 'Thanks! Your review will appear after moderation.', 201);
  } catch (err) {
    if (err?.code === 11000) throw new AppError('You have already reviewed this product', 409, 'DUPLICATE_REVIEW');
    throw err;
  }
});
