import { Return, Order, User, Refund } from '../models/index.js';
import { RETURN_STATUSES } from '../models/Return.js';
import { nextSeq } from '../models/Counter.js';
import env from '../config/env.js';
import { AppError, notFound, conflict } from '../utils/AppError.js';
import { roundMoney } from '../utils/helpers.js';
import { applyStockDelta } from './inventoryService.js';
import { createRefund } from './refundService.js';
import { queueEmail } from './emailService.js';
import { templates } from '../templates/emails.js';

export const RETURN_TRANSITIONS = {
  'Return Requested': ['Under Review', 'Approved', 'Rejected'],
  'Under Review': ['Approved', 'Rejected'],
  Approved: ['Pickup Scheduled', 'Product Received'],
  'Pickup Scheduled': ['Product Received'],
  'Product Received': [], // -> Product Inspected only through inspectReturn()
  'Product Inspected': [], // -> Refund Processing only through startRefund()
  'Refund Processing': [], // -> Refund Completed only when the refund completes
  Rejected: [],
  'Refund Completed': [],
};

const ACTIVE = { $ne: 'Rejected' };

export async function returnedQuantities(orderId) {
  const rs = await Return.find({ order: orderId, status: ACTIVE }).select('items');
  const map = {};
  for (const r of rs) for (const i of r.items) map[i.sku] = (map[i.sku] || 0) + i.quantity;
  return map;
}

/** Eligibility for each order line. The server is authoritative; the UI only displays this. */
export async function getEligibility(order, now = new Date()) {
  const used = await returnedQuantities(order._id);
  const delivered = order.status === 'Delivered' && order.deliveredAt;
  return order.items.map((it) => {
    const windowDays = it.returnWindowDays ?? env.RETURN_WINDOW_DAYS;
    const deadline = delivered ? new Date(order.deliveredAt.getTime() + windowDays * 86400000) : null;
    const remaining = it.quantity - (used[it.sku] || 0);
    let eligible = true; let reason = null;
    if (!delivered) { eligible = false; reason = 'Returns can be requested after the order is delivered'; }
    else if (!it.returnable || windowDays <= 0) { eligible = false; reason = 'This product is not eligible for return'; }
    else if (now > deadline) { eligible = false; reason = `The ${windowDays}-day return window has ended`; }
    else if (remaining <= 0) { eligible = false; reason = 'A return has already been requested for this item'; }
    return { sku: it.sku, name: it.name, image: it.image, quantity: it.quantity, remaining: Math.max(0, remaining), eligible, reason, deadline, unitRefund: roundMoney(it.netTotal / it.quantity) };
  });
}

export async function createReturn({ user, orderId, items, evidence, refundMethod = 'original' }) {
  const order = await Order.findOne({ _id: orderId, user: user._id }); // ownership enforced in the query
  if (!order) throw notFound('Order');
  const elig = await getEligibility(order);
  const lines = [];
  for (const req of items) {
    const e = elig.find((x) => x.sku === req.sku.toUpperCase());
    if (!e) throw new AppError(`Item ${req.sku} is not part of this order`, 400, 'ITEM_NOT_IN_ORDER');
    if (!e.eligible) throw new AppError(`${e.name}: ${e.reason}`, 409, 'RETURN_NOT_ELIGIBLE');
    if (req.quantity > e.remaining) throw new AppError(`${e.name}: only ${e.remaining} unit(s) can still be returned`, 409, 'RETURN_QTY_EXCEEDED');
    lines.push({ sku: e.sku, name: e.name, image: e.image, quantity: req.quantity, reason: req.reason, comment: req.comment, unitRefund: e.unitRefund });
  }
  if (order.paymentMethod === 'cod' && !['upi', 'bank'].includes(refundMethod)) refundMethod = 'upi';
  const ret = await Return.create({
    returnNumber: `RET-${new Date().getFullYear()}-${String(await nextSeq('return')).padStart(5, '0')}`,
    order: order._id, user: user._id, items: lines, evidence, refundMethod: order.paymentMethod === 'razorpay' ? 'original' : refundMethod,
    statusHistory: [{ status: 'Return Requested', note: 'Return requested by customer', at: new Date() }],
  });
  // Concurrency re-check: two simultaneous requests must not exceed the purchased quantity.
  const used = await returnedQuantities(order._id);
  const over = order.items.find((it) => (used[it.sku] || 0) > it.quantity);
  if (over) {
    await Return.deleteOne({ _id: ret._id });
    throw conflict(`A return for ${over.name} was already requested`, 'DUPLICATE_RETURN');
  }
  await Order.updateOne({ _id: order._id }, { hasReturns: true });
  await queueEmail('return_received', user.email, templates.returnReceived(ret, order), `return-received:${ret._id}`);
  return ret;
}

async function setReturnStatus(id, from, set, note, by) {
  return Return.findOneAndUpdate({ _id: id, status: from }, { $set: set, $push: { statusHistory: { status: set.status, note, by, at: new Date() } } }, { new: true });
}

export async function updateReturnStatus(id, to, { by, note, rejectionReason, pickup } = {}) {
  const ret = await Return.findById(id);
  if (!ret) throw notFound('Return');
  if (!RETURN_STATUSES.includes(to)) throw new AppError('Unknown return status', 400, 'INVALID_STATUS');
  if (!(RETURN_TRANSITIONS[ret.status] || []).includes(to)) {
    throw new AppError(`Cannot move a return from ${ret.status} to ${to}`, 409, 'INVALID_TRANSITION');
  }
  const set = { status: to };
  if (to === 'Rejected') {
    if (!rejectionReason) throw new AppError('A rejection reason is required', 400, 'REASON_REQUIRED');
    set.rejectionReason = rejectionReason;
  }
  if (to === 'Pickup Scheduled' && pickup) set.pickup = pickup;
  if (note) set.adminNote = note;
  const updated = await setReturnStatus(id, ret.status, set, note || rejectionReason, by);
  if (!updated) throw conflict('The return was updated by someone else. Refresh and retry.', 'RETURN_CONFLICT');
  if (to === 'Rejected') {
    // rejected quantities become requestable again (ACTIVE filter excludes Rejected); update the order flag if none active
    const active = await Return.countDocuments({ order: updated.order, status: ACTIVE });
    if (!active) await Order.updateOne({ _id: updated.order }, { hasReturns: false });
  }
  if (['Approved', 'Rejected', 'Pickup Scheduled'].includes(to)) await notifyReturn(updated);
  return updated;
}

async function notifyReturn(ret) {
  const [order, user] = await Promise.all([Order.findById(ret.order), User.findById(ret.user)]);
  if (user && order) await queueEmail('return_decision', user.email, templates.returnDecision(ret, order), `return-${ret.status}:${ret._id}`);
}

/**
 * Inspection step. Only here (after the product was physically received and judged) may stock be restored,
 * and only for lines marked resellable. Each restock is idempotent via a per-return opKey.
 */
export async function inspectReturn(id, results, { by, note } = {}) {
  const ret = await Return.findById(id);
  if (!ret) throw notFound('Return');
  if (ret.status !== 'Product Received') throw new AppError('A return can only be inspected after the product has been received', 409, 'INVALID_TRANSITION');
  const order = await Order.findById(ret.order);
  const bySku = new Map(results.map((r) => [r.sku.toUpperCase(), r.result]));
  for (const it of ret.items) if (!bySku.has(it.sku)) throw new AppError(`Inspection result missing for ${it.sku}`, 400, 'INSPECTION_INCOMPLETE');
  const gate = await Return.findOneAndUpdate({ _id: id, status: 'Product Received' }, { status: 'Product Inspected', ...(note ? { adminNote: note } : {}), $push: { statusHistory: { status: 'Product Inspected', note, by, at: new Date() } } }, { new: true });
  if (!gate) throw conflict('The return was updated by someone else. Refresh and retry.', 'RETURN_CONFLICT');
  for (const it of gate.items) {
    const result = bySku.get(it.sku);
    it.inspection = result;
    if (result === 'resellable' && !it.restocked) {
      const line = order.items.find((x) => x.sku === it.sku);
      await applyStockDelta({ productId: line.product, sku: it.sku, delta: it.quantity, type: 'return_restock', opKey: `return:${gate._id}:restock:${it.sku}`, orderId: order._id, returnId: gate._id, reason: `Return ${gate.returnNumber} inspected resellable`, by });
      it.restocked = true;
    }
  }
  gate.markModified('items');
  await gate.save();
  return gate;
}

export async function startRefund(id, { by, amount, payout, reference } = {}) {
  const ret = await Return.findById(id);
  if (!ret) throw notFound('Return');
  if (ret.status === 'Refund Processing' || ret.status === 'Refund Completed') {
    return { ret, refund: ret.refund ? await Refund.findById(ret.refund) : null, duplicate: true };
  }
  if (ret.status !== 'Product Inspected') throw new AppError('Refunds can only be started after the product has been inspected', 409, 'INVALID_TRANSITION');
  const order = await Order.findById(ret.order);
  const max = roundMoney(ret.items.reduce((s, i) => s + i.unitRefund * i.quantity, 0));
  const amt = roundMoney(amount ?? max);
  if (amt <= 0 || amt > max + 0.001) throw new AppError(`Refund amount must be between 0 and ${max}`, 400, 'INVALID_REFUND_AMOUNT');
  const method = order.paymentMethod === 'razorpay' ? 'razorpay' : ret.refundMethod === 'bank' ? 'cod_bank' : 'cod_upi';
  if (method !== 'razorpay' && !payout) throw new AppError('Payout details are required for Cash on Delivery refunds', 400, 'PAYOUT_REQUIRED');
  // Move the return first (atomic gate) so two admins cannot both start a refund.
  const gate = await setReturnStatus(id, 'Product Inspected', { status: 'Refund Processing' }, 'Refund started', by);
  if (!gate) {
    const cur = await Return.findById(id);
    return { ret: cur, refund: null, duplicate: true };
  }
  const refund = await createRefund({ order, amount: amt, key: `return:${id}`, reason: `Return ${ret.returnNumber}`, returnId: ret._id, method, payout, by });
  void reference;
  return { ret: await Return.findById(id), refund, duplicate: false };
}

export const returnView = (r) => {
  const o = r.toObject ? r.toObject() : { ...r };
  delete o.__v;
  return o;
};
void env;
