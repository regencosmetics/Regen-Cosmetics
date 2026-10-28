import { Coupon, Order } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { roundMoney } from '../utils/helpers.js';

const fail = (msg, code) => new AppError(msg, 400, code);

/** Validates a coupon against priced lines. Pure server-side; client values are never used. */
export async function evaluateCoupon(code, lines, userId) {
  const coupon = await Coupon.findOne({ code: String(code || '').trim().toUpperCase() });
  if (!coupon || !coupon.isActive) throw fail('This coupon code is not valid', 'COUPON_INVALID');
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw fail('This coupon is not active yet', 'COUPON_NOT_STARTED');
  if (coupon.expiresAt && coupon.expiresAt < now) throw fail('This coupon has expired', 'COUPON_EXPIRED');
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw fail('This coupon has reached its usage limit', 'COUPON_EXHAUSTED');
  if (coupon.perUserLimit > 0 && userId) {
    const used = await Order.countDocuments({ user: userId, 'pricing.couponCode': coupon.code, status: { $ne: 'Cancelled' } });
    if (used >= coupon.perUserLimit) throw fail('You have already used this coupon the maximum number of times', 'COUPON_USER_LIMIT');
  }
  const hasProd = coupon.eligibleProducts?.length; const hasCat = coupon.eligibleCategories?.length;
  const prodSet = new Set((coupon.eligibleProducts || []).map(String));
  const catSet = new Set((coupon.eligibleCategories || []).map(String));
  const eligible = lines.filter((l) => !hasProd && !hasCat ? true : (hasProd && prodSet.has(String(l.product))) || (hasCat && l.category && catSet.has(String(l.category))));
  if (!eligible.length) throw fail('This coupon does not apply to the items in your cart', 'COUPON_NOT_ELIGIBLE');
  const eligibleSubtotal = roundMoney(eligible.reduce((s, l) => s + l.lineTotal, 0));
  const subtotal = roundMoney(lines.reduce((s, l) => s + l.lineTotal, 0));
  if (subtotal < (coupon.minOrderAmount || 0)) {
    throw fail(`Add items worth Rs ${roundMoney(coupon.minOrderAmount - subtotal)} more to use this coupon`, 'COUPON_MIN_ORDER');
  }
  let discount = coupon.type === 'percent' ? (eligibleSubtotal * coupon.value) / 100 : coupon.value;
  if (coupon.type === 'percent' && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  discount = roundMoney(Math.min(discount, eligibleSubtotal)); // can never push the total negative
  // allocate proportionally across eligible lines (largest remainder goes to last line)
  const allocations = {};
  let allocated = 0;
  eligible.forEach((l, i) => {
    const share = i === eligible.length - 1 ? roundMoney(discount - allocated) : roundMoney((discount * l.lineTotal) / eligibleSubtotal);
    allocations[l.sku] = share; allocated = roundMoney(allocated + share);
  });
  return { coupon, discount, allocations };
}

/** Atomically consumes one use. Returns false if the limit was hit concurrently. */
export async function redeemCoupon(coupon) {
  const filter = { _id: coupon._id, isActive: true };
  if (coupon.usageLimit > 0) filter.usedCount = { $lt: coupon.usageLimit };
  const res = await Coupon.updateOne(filter, { $inc: { usedCount: 1 } });
  return res.modifiedCount === 1;
}
export const unredeemCoupon = (code) => Coupon.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
