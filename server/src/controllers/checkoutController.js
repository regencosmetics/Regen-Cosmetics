import { Cart, Order, User } from '../models/index.js';
import env from '../config/env.js';
import { AppError, notFound } from '../utils/AppError.js';
import { asyncHandler, ok } from '../utils/helpers.js';
import { quote } from '../services/pricingService.js';
import { createOrder, orderView } from '../services/orderService.js';
import { createPaymentOrder, verifyCheckoutPayment, recordPaymentFailure, processWebhook } from '../services/paymentService.js';
import { verifyWebhookSignature } from '../services/razorpayClient.js';
import { normalizePhone } from '../validators/index.js';
import logger from '../utils/logger.js';

async function itemsFor(req) {
  if (req.body.items?.length) return { items: req.body.items, couponCode: req.body.couponCode };
  const cart = await Cart.findOne({ user: req.user._id });
  return { items: (cart?.items || []).map((i) => ({ productId: String(i.product), sku: i.sku, quantity: i.quantity })), couponCode: req.body.couponCode ?? cart?.couponCode };
}

export const config = (_req, res) => ok(res, {
  codEnabled: env.COD_ENABLED, onlineEnabled: env.razorpayConfigured, razorpayKeyId: env.razorpayConfigured ? env.RAZORPAY_KEY_ID : null,
  codMinOrder: env.COD_MIN_ORDER, codMaxOrder: env.COD_MAX_ORDER, codFee: env.shipping.codFee, currency: env.DEFAULT_CURRENCY,
  freeShippingThreshold: env.shipping.freeShippingThreshold, shippingFlatRate: env.shipping.flatRate,
});

export const validateCheckout = asyncHandler(async (req, res) => {
  const { items, couponCode } = await itemsFor(req);
  const q = await quote({ items, couponCode, userId: req.user._id, paymentMethod: req.body.paymentMethod });
  const { couponDoc, ...rest } = q; void couponDoc;
  ok(res, { ...rest, valid: q.lines.length > 0 && q.issues.length === 0 });
});

async function resolveAddress(req) {
  const { addressId, address, saveAddress } = req.body;
  if (addressId) {
    const a = req.user.addresses.id(addressId);
    if (!a) throw notFound('Address');
    const { fullName, phone, line1, line2, landmark, city, state, pincode, country } = a.toObject();
    return { fullName, phone, line1, line2, landmark, city, state, pincode, country: country || 'India' };
  }
  const a = { ...address, phone: normalizePhone(address.phone), country: 'India' };
  if (saveAddress && req.user.addresses.length < 10) {
    req.user.addresses.push({ ...a, isDefault: req.user.addresses.length === 0 }); await req.user.save();
  }
  const { isDefault, label, ...snap } = a; void isDefault; void label;
  return snap;
}

export const placeOrder = asyncHandler(async (req, res) => {
  const key = req.headers['idempotency-key'];
  if (!key || String(key).length < 8 || String(key).length > 100) throw new AppError('An Idempotency-Key header (8-100 chars) is required', 400, 'IDEMPOTENCY_KEY_REQUIRED');
  const { items, couponCode } = await itemsFor(req);
  const address = await resolveAddress(req);
  const { order, existing } = await createOrder({ user: req.user, items, address, paymentMethod: req.body.paymentMethod, couponCode, idempotencyKey: String(key) });
  let payment = null;
  if (order.paymentMethod === 'razorpay' && order.status === 'Pending') {
    try {
      payment = await createPaymentOrder(order);
    } catch (err) {
      // Could not open a payment session: close the order and give the stock back instead of leaving it dangling.
      if (!existing) { const { cancelOrder } = await import('../services/orderService.js'); await cancelOrder(order._id, { actor: 'system', reason: 'Payment session could not be created', system: true }).catch(() => {}); }
      throw err;
    }
  }
  ok(res, { order: orderView(order), payment, duplicate: existing }, existing ? 'Order already placed' : 'Order created', existing ? 200 : 201);
});

export const retryPayment = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
  if (!order) throw notFound('Order');
  ok(res, { payment: await createPaymentOrder(order) });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const b = req.body;
  const { order, alreadyProcessed, refundedAutomatically } = await verifyCheckoutPayment({ userId: req.user._id, razorpayOrderId: b.razorpay_order_id, razorpayPaymentId: b.razorpay_payment_id, signature: b.razorpay_signature });
  if (refundedAutomatically) throw new AppError('Your payment arrived after the order window closed. It will be refunded automatically.', 409, 'PAYMENT_LATE_REFUND');
  ok(res, { order: orderView(order), alreadyProcessed }, 'Payment verified');
});

export const paymentFailed = asyncHandler(async (req, res) => {
  const b = req.body;
  await recordPaymentFailure({ userId: req.user._id, razorpayOrderId: b.razorpay_order_id, razorpayPaymentId: b.razorpay_payment_id, errorCode: b.error_code, errorDescription: b.error_description });
  ok(res, {}, 'Payment failure recorded');
});

export const paymentStatus = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id }).select('status paymentStatus paymentMethod orderNumber');
  if (!order) throw notFound('Order');
  ok(res, { status: order.status, paymentStatus: order.paymentStatus, orderNumber: order.orderNumber });
});

// Mounted with express.raw() BEFORE the JSON parser: the HMAC is computed over the exact raw bytes.
export const webhook = async (req, res, next) => {
  try {
    const raw = req.body;
    const sig = req.headers['x-razorpay-signature'];
    if (!Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, sig)) return res.status(400).json({ success: false, message: 'Invalid webhook signature', code: 'INVALID_SIGNATURE' });
    let body;
    try { body = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ success: false, message: 'Malformed payload', code: 'INVALID_JSON' }); }
    const eventId = req.headers['x-razorpay-event-id'];
    const result = await processWebhook(eventId, body);
    logger.info({ event: body.event, duplicate: result.duplicate }, 'Razorpay webhook handled');
    return res.json({ success: true, message: result.duplicate ? 'Duplicate ignored' : 'Processed', data: {} });
  } catch (err) { return next(err); } // non-2xx makes Razorpay retry later
};
void User; void Cart;
