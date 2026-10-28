import { Product } from '../models/index.js';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { roundMoney } from '../utils/helpers.js';
import { evaluateCoupon } from './couponService.js';

export const unitPriceOf = (v) => (v.salePrice != null && v.salePrice < v.price ? v.salePrice : v.price);

export function shippingFor(subtotalAfterDiscount) {
  const { freeShippingThreshold, flatRate } = env.shipping;
  if (subtotalAfterDiscount <= 0) return 0;
  return freeShippingThreshold > 0 && subtotalAfterDiscount >= freeShippingThreshold ? 0 : flatRate;
}

/**
 * Builds an authoritative quote from {productId, sku, quantity} lines. Prices, discounts, stock and shipping
 * are all read from the database here. `strict` throws on any problem (used at checkout).
 */
export async function quote({ items, couponCode, userId, paymentMethod, strict = false }) {
  const merged = new Map();
  for (const it of items || []) {
    const key = `${it.productId}:${String(it.sku).toUpperCase()}`;
    const cur = merged.get(key);
    merged.set(key, { productId: String(it.productId), sku: String(it.sku).toUpperCase(), quantity: Math.min(20, (cur?.quantity || 0) + Number(it.quantity || 0)) });
  }
  const list = [...merged.values()];
  const products = await Product.find({ _id: { $in: list.map((l) => l.productId) } });
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const lines = []; const issues = [];
  for (const l of list) {
    const p = byId.get(l.productId);
    const v = p?.variants.find((x) => x.sku === l.sku);
    if (!p || !p.isActive || !v || v.active === false) { issues.push({ sku: l.sku, productId: l.productId, code: 'UNAVAILABLE', message: 'This product is no longer available' }); continue; }
    if (l.quantity < 1) continue;
    let qty = l.quantity;
    if (v.stock <= 0) issues.push({ sku: l.sku, productId: l.productId, code: 'OUT_OF_STOCK', message: `${p.name} is out of stock`, available: 0 });
    else if (qty > v.stock) { issues.push({ sku: l.sku, productId: l.productId, code: 'INSUFFICIENT_STOCK', message: `Only ${v.stock} of ${p.name} available`, available: v.stock }); qty = v.stock; }
    const unitPrice = unitPriceOf(v);
    const q = v.stock <= 0 ? 0 : qty;
    lines.push({
      product: p._id, category: p.category, sku: v.sku, name: p.name, slug: p.slug, variantLabel: v.label, image: v.image || p.images?.[0]?.url,
      tagline: p.tagline, unitPrice, mrp: v.price, quantity: q, requestedQuantity: l.quantity, stock: v.stock,
      lineTotal: roundMoney(unitPrice * q), returnable: p.returnPolicy?.returnable !== false, returnWindowDays: p.returnPolicy?.windowDays,
      inStock: v.stock > 0,
    });
  }
  if (strict && issues.length) throw new AppError(issues[0].message, 409, issues[0].code, issues);
  const payable = lines.filter((l) => l.quantity > 0);
  const subtotal = roundMoney(payable.reduce((s, l) => s + l.lineTotal, 0));
  const mrpTotal = roundMoney(payable.reduce((s, l) => s + l.mrp * l.quantity, 0));
  let discount = 0; let coupon = null; let allocations = {}; let couponError = null;
  if (couponCode && payable.length) {
    try {
      const r = await evaluateCoupon(couponCode, payable, userId);
      discount = r.discount; coupon = r.coupon; allocations = r.allocations;
    } catch (e) {
      if (strict) throw e;
      couponError = { code: e.code, message: e.message };
    }
  }
  const after = roundMoney(subtotal - discount);
  const shipping = shippingFor(after);
  const codFee = paymentMethod === 'cod' ? Number(env.shipping.codFee || 0) : 0;
  const total = roundMoney(after + shipping + codFee);
  const resultLines = lines.map((l) => ({ ...l, discountShare: allocations[l.sku] || 0, netTotal: roundMoney(l.lineTotal - (allocations[l.sku] || 0)) }));
  return {
    lines: resultLines, issues, couponError,
    coupon: coupon ? { code: coupon.code, description: coupon.description, type: coupon.type, value: coupon.value } : null,
    couponDoc: coupon,
    pricing: {
      subtotal, mrpTotal, discount, couponCode: coupon?.code, shipping, codFee, total, currency: env.DEFAULT_CURRENCY,
      savings: roundMoney(mrpTotal - subtotal + discount),
      freeShippingThreshold: env.shipping.freeShippingThreshold,
    },
  };
}
