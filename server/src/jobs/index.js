import { reconcileExpiredOrders } from '../services/paymentService.js';
import { processOutbox } from '../services/emailService.js';
import { WebhookEvent } from '../models/index.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const timers = [];
const safe = (name, fn) => async () => { try { const r = await fn(); if (r && Object.values(r).some(Boolean)) logger.info({ job: name, ...r }, 'job run'); } catch (err) { logger.error({ job: name, err: err.message }, 'job failed'); } };

export function startJobs() {
  if (env.razorpayConfigured) timers.push(setInterval(safe('expire-unpaid-orders', () => reconcileExpiredOrders()), 60 * 1000));
  // webhook idempotency records older than 90 days are purged (kept as a plain job so it works on any MongoDB-compatible store)
  timers.push(setInterval(safe('purge-webhook-events', async () => ({ purged: (await WebhookEvent.deleteMany({ createdAt: { $lt: new Date(Date.now() - 90 * 864e5) } })).deletedCount })), 6 * 60 * 60 * 1000));
  timers.push(setInterval(safe('email-outbox', () => processOutbox(20)), 60 * 1000));
}
export const stopJobs = () => timers.splice(0).forEach(clearInterval);
