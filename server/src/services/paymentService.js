import { Payment, Order, WebhookEvent, Refund, User } from '../models/index.js';
import env from '../config/env.js';
import { AppError, notFound, forbidden } from '../utils/AppError.js';
import { toPaise } from '../utils/helpers.js';
import { getRazorpay, verifyCheckoutSignature } from './razorpayClient.js';
import { confirmPaidOrder, cancelOrder } from './orderService.js';
import { createRefund, markRefundCompleted, markRefundFailed } from './refundService.js';
import { queueEmail } from './emailService.js';
import { templates } from '../templates/emails.js';
import logger from '../utils/logger.js';

/** Creates (or returns the existing) Razorpay order for one of our orders. */
export async function createPaymentOrder(order) {
  if (order.paymentMethod !== 'razorpay') throw new AppError('This order is not an online-payment order', 400, 'NOT_ONLINE_ORDER');
  if (order.status !== 'Pending' || order.paymentStatus === 'Paid') throw new AppError('This order is not awaiting payment', 409, 'ORDER_NOT_PAYABLE');
  if (order.reservationExpiresAt && order.reservationExpiresAt < new Date()) throw new AppError('The payment window for this order has expired. Please place the order again.', 409, 'PAYMENT_WINDOW_EXPIRED');
  let payment = await Payment.findOne({ order: order._id, status: 'created' });
  if (!payment) {
    const rz = getRazorpay();
    const amount = toPaise(order.pricing.total);
    const rzOrder = await rz.orders.create({ amount, currency: order.pricing.currency || 'INR', receipt: order.orderNumber, notes: { orderId: String(order._id), orderNumber: order.orderNumber } });
    try {
      payment = await Payment.create({ order: order._id, user: order.user, providerOrderId: rzOrder.id, amount, currency: rzOrder.currency });
    } catch (err) {
      if (err?.code === 11000) payment = await Payment.findOne({ providerOrderId: rzOrder.id }); else throw err;
    }
  }
  return {
    keyId: env.RAZORPAY_KEY_ID, razorpayOrderId: payment.providerOrderId, amount: payment.amount, currency: payment.currency,
    orderId: order._id, orderNumber: order.orderNumber,
    prefill: { name: order.customer?.name, email: order.customer?.email, contact: order.customer?.phone },
  };
}

/**
 * Idempotent capture finalisation. Exactly one caller wins the created -> captured transition; everyone else
 * (duplicate callback, webhook racing the browser, retries) simply observes the final state.
 */
export async function finalizeCapture(payment, providerPaymentId, { source, method, amountPaise } = {}) {
  if (amountPaise != null && Number(amountPaise) !== payment.amount) {
    logger.error({ paymentId: String(payment._id), expected: payment.amount, got: amountPaise }, 'Captured amount mismatch');
    throw new AppError('Payment amount mismatch', 409, 'AMOUNT_MISMATCH');
  }
  const won = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: ['created', 'failed'] } }, // a late capture must still be honoured (and then refunded)
    { status: 'captured', providerPaymentId, method, signatureVerified: source === 'checkout' ? true : payment.signatureVerified, capturedAt: new Date(), $push: { attempts: { paymentId: providerPaymentId, status: 'captured', source } } },
    { new: true },
  );
  if (!won) return { order: await Order.findById(payment.order), alreadyProcessed: true };
  const confirmed = await confirmPaidOrder(payment.order);
  if (confirmed) return { order: confirmed, alreadyProcessed: false };

  // The order is no longer awaiting payment (expired/cancelled while the customer paid late).
  // We never ship an order whose stock has been released: compensate with an automatic full refund.
  await Payment.updateOne({ _id: payment._id }, { lateCapture: true });
  const order = await Order.findById(payment.order);
  logger.warn({ order: order.orderNumber }, 'Late payment capture on a closed order; issuing automatic refund');
  await Order.updateOne({ _id: order._id }, { paymentStatus: 'Paid' }); // money was received; refund below updates this
  await createRefund({ order, amount: order.pricing.total, key: `late:${providerPaymentId}`, reason: 'Payment received after the order was closed', method: 'razorpay' });
  return { order: await Order.findById(order._id), alreadyProcessed: false, refundedAutomatically: true };
}

export async function verifyCheckoutPayment({ userId, razorpayOrderId, razorpayPaymentId, signature }) {
  const payment = await Payment.findOne({ providerOrderId: razorpayOrderId });
  if (!payment || String(payment.user) !== String(userId)) throw notFound('Payment');
  if (!verifyCheckoutSignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature })) {
    await Payment.updateOne({ _id: payment._id }, { $push: { attempts: { paymentId: razorpayPaymentId, status: 'signature_invalid', source: 'checkout' } } });
    throw new AppError('Payment verification failed', 400, 'INVALID_SIGNATURE');
  }
  const result = await finalizeCapture(payment, razorpayPaymentId, { source: 'checkout' });
  return result;
}

export async function recordPaymentFailure({ userId, razorpayOrderId, razorpayPaymentId, errorCode, errorDescription, source = 'checkout' }) {
  const payment = await Payment.findOne({ providerOrderId: razorpayOrderId });
  if (!payment || (userId && String(payment.user) !== String(userId))) throw notFound('Payment');
  if (payment.status === 'captured') return payment; // a later success wins; never downgrade
  await Payment.updateOne({ _id: payment._id, status: 'created' }, { $push: { attempts: { paymentId: razorpayPaymentId, status: 'failed', errorCode, errorDescription: errorDescription?.slice(0, 200), source } } });
  const order = await Order.findById(payment.order);
  if (order && order.status === 'Pending') {
    await queueEmail('payment_failure', order.customer.email, templates.paymentFailure(order), `payment-failed:${payment._id}:${razorpayPaymentId || 'x'}`);
  }
  return Payment.findById(payment._id);
}

/** Webhook processing. `eventId` must be the X-Razorpay-Event-Id header; duplicates are acknowledged and ignored. */
export async function processWebhook(eventId, body) {
  if (!eventId) throw new AppError('Missing event id', 400, 'MISSING_EVENT_ID');
  try {
    await WebhookEvent.create({ eventId, event: body.event });
  } catch (err) {
    if (err?.code !== 11000) throw err;
    const retry = await WebhookEvent.findOneAndUpdate({ eventId, status: 'failed' }, { status: 'processing' });
    if (!retry) return { duplicate: true };
  }
  try {
    await handleEvent(body);
    await WebhookEvent.updateOne({ eventId }, { status: 'done', processedAt: new Date() });
    return { duplicate: false };
  } catch (err) {
    await WebhookEvent.updateOne({ eventId }, { status: 'failed' });
    throw err;
  }
}

async function handleEvent(body) {
  const ent = body.payload?.payment?.entity;
  switch (body.event) {
    case 'payment.captured':
    case 'order.paid': {
      const p = ent || body.payload?.order?.entity;
      const rzOrderId = ent?.order_id || body.payload?.order?.entity?.id;
      const payment = await Payment.findOne({ providerOrderId: rzOrderId });
      if (!payment) { logger.warn({ rzOrderId }, 'Webhook for unknown payment order'); return; }
      await finalizeCapture(payment, ent?.id || p?.id, { source: 'webhook', method: ent?.method, amountPaise: ent?.amount });
      return;
    }
    case 'payment.failed': {
      if (!ent) return;
      const payment = await Payment.findOne({ providerOrderId: ent.order_id });
      if (!payment) return;
      await recordPaymentFailure({ razorpayOrderId: ent.order_id, razorpayPaymentId: ent.id, errorCode: ent.error_code, errorDescription: ent.error_description, source: 'webhook' });
      return;
    }
    case 'refund.processed': {
      const r = body.payload?.refund?.entity;
      if (!r) return;
      const refund = await Refund.findOne({ providerRefundId: r.id });
      if (refund) await markRefundCompleted(refund._id, { providerRefundId: r.id });
      return;
    }
    case 'refund.failed': {
      const r = body.payload?.refund?.entity;
      if (r) await markRefundFailed(r.id, 'Provider reported the refund as failed');
      return;
    }
    default:
      return; // other events are acknowledged but not acted upon
  }
}

/**
 * Expiry job body: closes unpaid online orders after the reservation window. Before cancelling, asks Razorpay
 * whether a payment was captured (covers "paid but browser closed" with a lost webhook).
 */
export async function reconcileExpiredOrders(limit = 25) {
  const stale = await Order.find({ status: 'Pending', paymentMethod: 'razorpay', reservationExpiresAt: { $lt: new Date() } }).limit(limit);
  let cancelled = 0; let recovered = 0;
  for (const order of stale) {
    try {
      const payments = await Payment.find({ order: order._id, status: 'created' });
      let captured = null;
      for (const p of payments) {
        const list = await getRazorpay().orders.fetchPayments(p.providerOrderId);
        const c = (list.items || []).find((x) => x.status === 'captured');
        if (c) { captured = { p, c }; break; }
      }
      if (captured) { await finalizeCapture(captured.p, captured.c.id, { source: 'reconcile', method: captured.c.method, amountPaise: captured.c.amount }); recovered++; continue; }
      await cancelOrder(order._id, { actor: 'system', reason: 'Payment window expired', system: true });
      cancelled++;
    } catch (err) {
      logger.warn({ order: order.orderNumber, err: err.message }, 'Reconcile skipped; will retry');
    }
  }
  return { cancelled, recovered };
}
void forbidden; void User;
