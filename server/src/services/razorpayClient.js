import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';

let client;
export const resetRazorpay = () => { client = undefined; };
export function getRazorpay() {
  if (!env.razorpayConfigured) throw new AppError('Online payments are not configured on this server', 503, 'PAYMENT_NOT_CONFIGURED');
  client ||= new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return client;
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''), 'utf8'); const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Checkout signature: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
export function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

// Webhook signature: HMAC_SHA256(raw request body, webhook_secret)
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !rawBody) return false;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}
