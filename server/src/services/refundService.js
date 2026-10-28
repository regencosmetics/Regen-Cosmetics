import { Refund, Order, Payment, Return, User } from '../models/index.js';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { toPaise, roundMoney, encrypt, decrypt } from '../utils/helpers.js';
import { getRazorpay } from './razorpayClient.js';
import { queueEmail } from './emailService.js';
import { templates } from '../templates/emails.js';
import logger from '../utils/logger.js';

const publicRefund = (r) => {
  const o = r.toObject ? r.toObject() : { ...r };
  if (o.payout) { delete o.payout.accountNumberEnc; }
  return o;
};
export { publicRefund };

/**
 * Creates (or returns the existing) refund for an idempotency key, then dispatches it.
 * Duplicate calls with the same key never create or send a second refund.
 */
export async function createRefund({ order, amount, key, reason, returnId, method, payout, by }) {
  amount = roundMoney(amount);
  if (!(amount > 0)) throw new AppError('Refund amount must be greater than zero', 400, 'INVALID_REFUND_AMOUNT');
  let refund = await Refund.findOne({ idempotencyKey: key });
  if (refund) return refund;

  const fresh = await Order.findById(order._id);
  const pending = await Refund.aggregate([{ $match: { order: fresh._id, status: { $in: ['Pending', 'Processing', 'Completed'] } } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]);
  const committed = pending[0]?.sum || 0;
  if (roundMoney(committed + amount) > fresh.pricing.total + 0.001) {
    throw new AppError('Refund would exceed the amount paid for this order', 409, 'REFUND_EXCEEDS_PAID');
  }

  let payment = null;
  if (fresh.paymentMethod === 'razorpay') {
    payment = await Payment.findOne({ order: fresh._id, status: { $in: ['captured', 'partially_refunded', 'refunded'] } });
    if (!payment) throw new AppError('No captured payment found for this order', 409, 'NO_CAPTURED_PAYMENT');
    method = 'razorpay';
  } else if (!['cod_upi', 'cod_bank', 'manual'].includes(method)) {
    method = 'manual';
  }
  const doc = {
    order: fresh._id, return: returnId, payment: payment?._id, user: fresh.user, idempotencyKey: key, amount, method, reason,
    processedBy: by,
  };
  if (method === 'cod_upi' && payout?.upiId) doc.payout = { upiId: payout.upiId };
  if (method === 'cod_bank' && payout?.accountNumber) {
    doc.payout = { accountHolder: payout.accountHolder, ifsc: payout.ifsc, accountNumberEnc: encrypt(payout.accountNumber), accountLast4: String(payout.accountNumber).slice(-4) };
  }
  try {
    refund = await Refund.create(doc);
  } catch (err) {
    if (err?.code === 11000) return Refund.findOne({ idempotencyKey: key });
    throw err;
  }
  if (returnId) await Return.updateOne({ _id: returnId }, { refund: refund._id, refundAmount: amount });
  await Order.updateOne({ _id: fresh._id, paymentStatus: { $ne: 'Refunded' } }, { paymentStatus: 'Refund Processing' });
  if (method === 'razorpay') return dispatchRazorpayRefund(refund._id);
  return refund; // manual refunds wait for an administrator to record completion
}

export async function dispatchRazorpayRefund(refundId) {
  // gate: only one caller may move Pending -> Processing and talk to the provider
  const refund = await Refund.findOneAndUpdate({ _id: refundId, status: 'Pending', providerRefundId: { $in: [null, undefined] } }, { status: 'Processing' }, { new: true });
  if (!refund) return Refund.findById(refundId);
  const payment = await Payment.findById(refund.payment);
  try {
    const rz = getRazorpay();
    // If a previous attempt timed out after reaching Razorpay, reuse that refund instead of creating a duplicate.
    let existing;
    try {
      const list = await rz.payments.fetchMultipleRefund(payment.providerPaymentId, { count: 100 });
      existing = (list?.items || []).find((r) => r.notes?.refundKey === refund.idempotencyKey);
    } catch { /* fall through to create */ }
    const result = existing || await rz.payments.refund(payment.providerPaymentId, {
      amount: toPaise(refund.amount), speed: 'normal', notes: { refundKey: refund.idempotencyKey, orderId: String(refund.order) },
    });
    refund.providerRefundId = result.id; refund.providerStatus = result.status;
    await refund.save();
    if (result.status === 'processed') return markRefundCompleted(refund._id, { providerRefundId: result.id });
    return refund;
  } catch (err) {
    logger.warn({ refundId: String(refund._id), err: err?.error?.description || err.message }, 'Razorpay refund failed');
    await Refund.updateOne({ _id: refund._id }, { status: 'Failed', failureReason: String(err?.error?.description || err.message).slice(0, 300) });
    return Refund.findById(refund._id);
  }
}

export async function retryRefund(refundId) {
  const r = await Refund.findOneAndUpdate({ _id: refundId, status: 'Failed', method: 'razorpay' }, { status: 'Pending', failureReason: null }, { new: true });
  if (!r) throw new AppError('Only failed Razorpay refunds can be retried', 409, 'REFUND_NOT_RETRYABLE');
  return dispatchRazorpayRefund(r._id);
}

/** Idempotent completion: only the first transition to Completed updates balances and sends notifications. */
export async function markRefundCompleted(refundId, { providerRefundId, manualReference, by } = {}) {
  const set = { status: 'Completed', completedAt: new Date() };
  if (providerRefundId) set.providerRefundId = providerRefundId;
  if (manualReference) set.manualReference = manualReference;
  if (by) set.processedBy = by;
  const refund = await Refund.findOneAndUpdate({ _id: refundId, status: { $ne: 'Completed' } }, set, { new: true });
  if (!refund) return Refund.findById(refundId);
  const order = await Order.findByIdAndUpdate(refund.order, { $inc: { refundedAmount: refund.amount } }, { new: true });
  const full = roundMoney(order.refundedAmount) >= roundMoney(order.pricing.total);
  await Order.updateOne({ _id: order._id }, { paymentStatus: full ? 'Refunded' : 'Partially Refunded' });
  if (refund.payment) {
    await Payment.updateOne({ _id: refund.payment }, { $inc: { refundedAmount: toPaise(refund.amount) }, status: full ? 'refunded' : 'partially_refunded' });
  }
  if (refund.return) {
    await Return.updateOne({ _id: refund.return, status: 'Refund Processing' }, { status: 'Refund Completed', $push: { statusHistory: { status: 'Refund Completed', note: 'Refund completed', at: new Date() } } });
  }
  const user = await User.findById(order.user);
  if (user) await queueEmail('refund_completed', user.email, templates.refundUpdate(null, order, refund.amount, 'Completed'), `refund-done:${refund._id}`);
  return refund;
}

export async function markRefundFailed(providerRefundId, reason) {
  return Refund.findOneAndUpdate({ providerRefundId, status: { $ne: 'Completed' } }, { status: 'Failed', failureReason: reason?.slice(0, 300) }, { new: true });
}

export async function recordManualRefundCompletion(refundId, { reference, by }) {
  const r = await Refund.findById(refundId);
  if (!r) throw new AppError('Refund not found', 404, 'NOT_FOUND');
  if (r.method === 'razorpay') throw new AppError('Razorpay refunds are completed by the payment provider, not manually', 409, 'NOT_MANUAL_REFUND');
  if (!reference || reference.trim().length < 3) throw new AppError('A payout reference (UTR / transaction id) is required', 400, 'REFERENCE_REQUIRED');
  return markRefundCompleted(r._id, { manualReference: reference.trim(), by });
}

export async function revealPayout(refundId) {
  const r = await Refund.findById(refundId);
  if (!r?.payout) return null;
  return { upiId: r.payout.upiId, accountHolder: r.payout.accountHolder, ifsc: r.payout.ifsc, accountNumber: decrypt(r.payout.accountNumberEnc) };
}
void env;
