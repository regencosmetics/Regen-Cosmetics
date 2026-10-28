import { Order, Product, Cart, User, Payment } from '../models/index.js';
import { nextSeq } from '../models/Counter.js';
import env from '../config/env.js';
import { AppError, notFound, conflict } from '../utils/AppError.js';
import { quote } from './pricingService.js';
import { reserveOrderStock, releaseOrderStock } from './inventoryService.js';
import { redeemCoupon, unredeemCoupon } from './couponService.js';
import { createRefund } from './refundService.js';
import { queueEmail } from './emailService.js';
import { templates } from '../templates/emails.js';
import { roundMoney } from '../utils/helpers.js';

export const CUSTOMER_CANCELLABLE = ['Pending', 'Confirmed', 'Processing'];
export const TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery', 'Delivered'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Cancelled: [],
};
export const canCancel = (order) => CUSTOMER_CANCELLABLE.includes(order.status);

async function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `REG-${ymd}-${String(await nextSeq('order')).padStart(5, '0')}`;
}

const emailUser = async (order, type, tpl, dedupe) => {
  const to = order.customer?.email || (await User.findById(order.user))?.email;
  if (to) await queueEmail(type, to, tpl, dedupe);
};

export function validateAddress(a) { return a; } // structural validation lives in validators/; kept for clarity

/**
 * Creates an order in a safe sequence: quote (authoritative) -> insert (idempotent) -> reserve stock (atomic,
 * conditional) -> redeem coupon (atomic) -> confirm (COD) or await payment (Razorpay).
 */
export async function createOrder({ user, items, address, paymentMethod, couponCode, idempotencyKey }) {
  if (paymentMethod === 'cod') {
    if (!env.COD_ENABLED) throw new AppError('Cash on Delivery is not available', 400, 'COD_DISABLED');
  } else if (paymentMethod === 'razorpay' && !env.razorpayConfigured) {
    throw new AppError('Online payments are not configured on this server', 503, 'PAYMENT_NOT_CONFIGURED');
  }
  const idemKey = idempotencyKey ? `${user._id}:${idempotencyKey}` : undefined;
  if (idemKey) {
    const existing = await Order.findOne({ idempotencyKey: idemKey });
    if (existing) return { order: existing, existing: true };
  }
  if (!items?.length) throw new AppError('Your cart is empty', 400, 'EMPTY_CART');
  const q = await quote({ items, couponCode, userId: user._id, paymentMethod, strict: true });
  if (paymentMethod === 'cod') {
    const t = q.pricing.total;
    if (env.COD_MIN_ORDER > 0 && t < env.COD_MIN_ORDER) throw new AppError(`Cash on Delivery is available for orders of Rs ${env.COD_MIN_ORDER} or more`, 400, 'COD_MIN');
    if (env.COD_MAX_ORDER > 0 && t > env.COD_MAX_ORDER) throw new AppError(`Cash on Delivery is available for orders up to Rs ${env.COD_MAX_ORDER}`, 400, 'COD_MAX');
  }
  const now = new Date();
  const isCod = paymentMethod === 'cod';
  const doc = {
    orderNumber: await orderNumber(),
    user: user._id,
    items: q.lines.map((l) => ({
      product: l.product, sku: l.sku, name: l.name, variantLabel: l.variantLabel, image: l.image, slug: l.slug,
      unitPrice: l.unitPrice, mrp: l.mrp, quantity: l.quantity, lineTotal: l.lineTotal, discountShare: l.discountShare, netTotal: l.netTotal,
      returnable: l.returnable, returnWindowDays: l.returnWindowDays,
    })),
    shippingAddress: address,
    customer: { name: user.name, email: user.email, phone: user.phone },
    pricing: { subtotal: q.pricing.subtotal, mrpTotal: q.pricing.mrpTotal, discount: q.pricing.discount, couponCode: q.pricing.couponCode, shipping: q.pricing.shipping, codFee: q.pricing.codFee, total: q.pricing.total, currency: q.pricing.currency },
    paymentMethod,
    paymentStatus: isCod ? 'COD Pending' : 'Pending',
    status: isCod ? 'Confirmed' : 'Pending',
    statusHistory: [{ status: isCod ? 'Confirmed' : 'Pending', note: isCod ? 'Order placed (Cash on Delivery)' : 'Awaiting payment', at: now }],
    reservationExpiresAt: isCod ? undefined : new Date(now.getTime() + env.PAYMENT_RESERVATION_MINUTES * 60000),
    idempotencyKey: idemKey,
    invoiceNumber: `INV-${now.getFullYear()}-${String(await nextSeq('invoice')).padStart(6, '0')}`,
  };
  let order;
  try {
    order = await Order.create(doc);
  } catch (err) {
    if (err?.code === 11000 && idemKey) {
      const existing = await Order.findOne({ idempotencyKey: idemKey });
      if (existing) return { order: existing, existing: true };
    }
    throw err;
  }
  try {
    await reserveOrderStock(order);
    if (q.couponDoc) {
      const okc = await redeemCoupon(q.couponDoc);
      if (!okc) throw new AppError('This coupon has reached its usage limit', 409, 'COUPON_EXHAUSTED');
      await Order.updateOne({ _id: order._id }, { couponRedeemed: true });
    }
  } catch (err) {
    await releaseOrderStock(order._id, 'Order creation failed').catch(() => {});
    await Order.deleteOne({ _id: order._id, status: { $in: ['Pending', 'Confirmed'] } });
    throw err;
  }
  order = await Order.findById(order._id);
  if (isCod) {
    await Cart.updateOne({ user: user._id }, { items: [], couponCode: null });
    await emailUser(order, 'order_confirmation', templates.orderConfirmation(order), `order-confirmed:${order._id}`);
  }
  return { order, existing: false };
}

async function pushStatus(orderId, filter, set, note, by) {
  return Order.findOneAndUpdate(
    { _id: orderId, ...filter },
    { $set: set, $push: { statusHistory: { status: set.status, note, by, at: new Date() } } },
    { new: true },
  );
}

/** Marks an online order paid + confirmed. Safe to call repeatedly (gated on status Pending). */
export async function confirmPaidOrder(orderId) {
  const order = await pushStatus(orderId, { status: 'Pending', paymentMethod: 'razorpay' }, { status: 'Confirmed', paymentStatus: 'Paid', reservationExpiresAt: null }, 'Payment received', undefined);
  if (order) {
    await Cart.updateOne({ user: order.user }, { items: [], couponCode: null });
    await emailUser(order, 'order_confirmation', templates.orderConfirmation(order), `order-confirmed:${order._id}`);
    await emailUser(order, 'payment_confirmation', templates.paymentConfirmation(order), `payment-confirmed:${order._id}`);
  }
  return order;
}

/**
 * Cancels an order if (and only if) its status is currently cancellable. The status check is part of the
 * atomic update, so a concurrent "Shipped" update and a cancellation can never both succeed.
 */
export async function cancelOrder(orderId, { actor, userId, reason, system = false }) {
  const filter = { status: { $in: CUSTOMER_CANCELLABLE } };
  if (userId) filter.user = userId;
  const order = await pushStatus(orderId, filter, { status: 'Cancelled', cancelledAt: new Date(), cancelReason: reason || 'Cancelled', cancelledBy: actor }, reason || 'Order cancelled', undefined);
  if (!order) {
    const cur = await Order.findOne({ _id: orderId, ...(userId ? { user: userId } : {}) });
    if (!cur) throw notFound('Order');
    throw conflict(`This order can no longer be cancelled because it is ${cur.status}`, 'CANCEL_NOT_ALLOWED');
  }
  await releaseOrderStock(order._id, `Order ${order.orderNumber} cancelled`);
  if (order.couponRedeemed && order.pricing.couponCode) {
    const gate = await Order.findOneAndUpdate({ _id: order._id, couponRedeemed: true }, { couponRedeemed: false });
    if (gate) await unredeemCoupon(order.pricing.couponCode);
  }
  let refundNote = '';
  if (order.paymentMethod === 'razorpay' && order.paymentStatus === 'Paid') {
    const refund = await createRefund({ order, amount: order.pricing.total, key: `cancel:${order._id}`, reason: 'Order cancelled', method: 'razorpay' });
    refundNote = `A refund of Rs ${roundMoney(order.pricing.total)} is ${refund.status === 'Completed' ? 'completed' : 'being processed'}.`;
  } else if (order.paymentMethod === 'cod') {
    await Order.updateOne({ _id: order._id }, { paymentStatus: 'Pending' });
  } else if (order.paymentMethod === 'razorpay' && !system) {
    await Payment.updateMany({ order: order._id, status: 'created' }, { $push: { attempts: { status: 'order_cancelled', source: 'system' } } });
  }
  const fresh = await Order.findById(order._id);
  await emailUser(fresh, 'order_cancelled', templates.orderCancelled(fresh, refundNote), `order-cancelled:${order._id}`);
  return fresh;
}

/** Admin status transition with an allow-list and an atomic compare-and-set on the current status. */
export async function transitionOrder(orderId, to, { by, note, tracking } = {}) {
  const order = await Order.findById(orderId);
  if (!order) throw notFound('Order');
  if (to === 'Cancelled') return cancelOrder(orderId, { actor: 'admin', reason: note || 'Cancelled by store', userId: undefined });
  const allowed = TRANSITIONS[order.status] || [];
  if (!allowed.includes(to)) throw new AppError(`Cannot move an order from ${order.status} to ${to}`, 409, 'INVALID_TRANSITION');
  if (to === 'Confirmed' && order.paymentMethod === 'razorpay' && order.paymentStatus !== 'Paid') {
    throw new AppError('An online order cannot be confirmed before payment is verified', 409, 'PAYMENT_NOT_VERIFIED');
  }
  const set = { status: to };
  if (to === 'Shipped') { set.shippedAt = new Date(); }
  if (tracking && (to === 'Shipped' || to === 'Out for Delivery')) {
    for (const k of ['carrier', 'trackingNumber', 'url', 'note']) if (tracking[k]) set[`tracking.${k}`] = tracking[k];
  }
  if (to === 'Delivered') {
    set.deliveredAt = new Date();
    if (order.paymentMethod === 'cod' && order.paymentStatus === 'COD Pending') set.paymentStatus = 'COD Collected';
  }
  const updated = await pushStatus(orderId, { status: order.status }, set, note, by);
  if (!updated) throw conflict('The order was modified by someone else. Please refresh and try again.', 'ORDER_CONFLICT');
  if (to === 'Shipped') await emailUser(updated, 'order_shipped', templates.orderShipped(updated), `order-shipped:${updated._id}`);
  if (to === 'Delivered') await emailUser(updated, 'order_delivered', templates.orderDelivered(updated), `order-delivered:${updated._id}`);
  return updated;
}

export async function updateTracking(orderId, tracking) {
  const set = {};
  for (const k of ['carrier', 'trackingNumber', 'url', 'note']) if (tracking[k] !== undefined) set[`tracking.${k}`] = tracking[k];
  const o = await Order.findByIdAndUpdate(orderId, { $set: set }, { new: true });
  if (!o) throw notFound('Order');
  return o;
}

export const orderView = (order, { forAdmin = false } = {}) => {
  const o = order.toObject ? order.toObject() : { ...order };
  o.canCancel = canCancel(o);
  delete o.idempotencyKey; delete o.__v;
  if (!forAdmin) { delete o.inventoryReserved; delete o.inventoryReleased; delete o.couponRedeemed; }
  return o;
};
void Product;
