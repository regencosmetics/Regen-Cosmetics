import { Cart, Coupon } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler, ok } from '../utils/helpers.js';
import { quote } from '../services/pricingService.js';

const toItems = (cart) => (cart?.items || []).map((i) => ({ productId: String(i.product), sku: i.sku, quantity: i.quantity }));
const getCart = async (userId) => (await Cart.findOne({ user: userId })) || (await Cart.create({ user: userId, items: [] }));

async function respond(res, cart, userId, extra = {}) {
  const q = await quote({ items: toItems(cart), couponCode: cart.couponCode, userId });
  // Self-heal the persisted cart: drop unavailable lines and clamp quantities to current stock.
  const valid = new Map(q.lines.map((l) => [`${l.product}:${l.sku}`, l]));
  let dirty = false;
  const next = [];
  for (const i of cart.items) {
    const l = valid.get(`${i.product}:${i.sku}`);
    if (!l) { dirty = true; continue; }
    const qty = l.quantity > 0 ? l.quantity : i.quantity;
    if (qty !== i.quantity) dirty = true;
    next.push({ product: i.product, sku: i.sku, quantity: qty });
  }
  if (q.couponError && cart.couponCode) { cart.couponCode = undefined; dirty = true; }
  if (dirty) { cart.items = next; await cart.save(); }
  const { couponDoc, ...rest } = q; void couponDoc;
  ok(res, { cart: { items: next.length, ...rest }, ...extra });
}

export const get = asyncHandler(async (req, res) => respond(res, await getCart(req.user._id), req.user._id));

export const addItem = asyncHandler(async (req, res) => {
  const { productId, sku, quantity } = req.body;
  const probe = await quote({ items: [{ productId, sku, quantity }], strict: true });
  const line = probe.lines[0];
  const cart = await getCart(req.user._id);
  const existing = cart.items.find((i) => String(i.product) === productId && i.sku === line.sku);
  const total = (existing?.quantity || 0) + quantity;
  if (total > line.stock) throw new AppError(`Only ${line.stock} unit(s) available`, 409, 'INSUFFICIENT_STOCK', { available: line.stock });
  if (existing) existing.quantity = Math.min(20, total); else cart.items.push({ product: productId, sku: line.sku, quantity });
  await cart.save();
  await respond(res, cart, req.user._id);
});

export const updateItem = asyncHandler(async (req, res) => {
  const { productId, sku, quantity } = req.body;
  const cart = await getCart(req.user._id);
  const idx = cart.items.findIndex((i) => String(i.product) === productId && i.sku === sku.toUpperCase());
  if (idx < 0) throw new AppError('Item not in cart', 404, 'NOT_FOUND');
  if (quantity === 0) cart.items.splice(idx, 1);
  else {
    const probe = await quote({ items: [{ productId, sku, quantity }], strict: true }).catch((e) => { if (e.code === 'INSUFFICIENT_STOCK') throw e; throw e; });
    void probe;
    cart.items[idx].quantity = quantity;
  }
  await cart.save();
  await respond(res, cart, req.user._id);
});

export const removeItem = asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id);
  cart.items = cart.items.filter((i) => !(String(i.product) === req.params.productId && i.sku === req.params.sku.toUpperCase()));
  await cart.save();
  await respond(res, cart, req.user._id);
});

export const clear = asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id); cart.items = []; cart.couponCode = undefined; await cart.save();
  await respond(res, cart, req.user._id);
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id);
  await quote({ items: toItems(cart), couponCode: req.body.code, userId: req.user._id, strict: true }); // throws a precise COUPON_* error
  cart.couponCode = req.body.code.toUpperCase(); await cart.save();
  await respond(res, cart, req.user._id, { message: 'Coupon applied' });
});

export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id); cart.couponCode = undefined; await cart.save();
  await respond(res, cart, req.user._id);
});

// Stateless pricing for guests (client sends its local cart; the server returns authoritative prices).
export const guestQuote = asyncHandler(async (req, res) => {
  const q = await quote({ items: req.body.items, couponCode: req.body.couponCode, userId: req.user?._id, paymentMethod: req.body.paymentMethod });
  const { couponDoc, ...rest } = q; void couponDoc;
  ok(res, { cart: { items: rest.lines.length, ...rest } });
});

// Merge a guest cart into the user's persisted cart at login (stock-clamped, no duplicate lines).
export const merge = asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id);
  for (const it of req.body.items) {
    const probe = await quote({ items: [{ ...it, quantity: 1 }] });
    const line = probe.lines[0];
    if (!line || !line.inStock) continue;
    const existing = cart.items.find((i) => String(i.product) === it.productId && i.sku === line.sku);
    const qty = Math.min(20, line.stock, (existing?.quantity || 0) + it.quantity);
    if (existing) existing.quantity = qty; else cart.items.push({ product: it.productId, sku: line.sku, quantity: qty });
  }
  await cart.save();
  await respond(res, cart, req.user._id);
});

export const publicCoupons = asyncHandler(async (_req, res) => {
  const now = new Date();
  const items = await Coupon.find({ isActive: true, isPublic: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }).select('code description type value minOrderAmount maxDiscount expiresAt');
  ok(res, { items: items.filter((c) => !c.startsAt || c.startsAt <= now) });
});
