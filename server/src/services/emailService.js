import { Resend } from 'resend';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { Notification } from '../models/index.js';

let client;
/** Resend client, or null when RESEND_API_KEY is not configured. */
export const getClient = () => {
  if (!env.emailConfigured) return null;
  client ||= new Resend(env.RESEND_API_KEY);
  return client;
};
export const resetEmail = () => { client = undefined; };
export const __setClient = (c) => { client = c; };

/**
 * Sends one message through Resend. The Notification id is the idempotency key, so a retry after a timeout
 * (where the first attempt may actually have been accepted) cannot deliver the email twice.
 */
async function deliver(rs, job) {
  const { data, error } = await rs.emails.send(
    { from: env.EMAIL_FROM, to: [job.to], subject: job.subject, html: job.html, text: job.text, ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}) },
    { idempotencyKey: `notification-${job._id}` },
  );
  if (error) throw Object.assign(new Error(error.message || 'Resend rejected the email'), { resend: error });
  return data?.id;
}

// Queue an email (outbox pattern). Never throws: email problems must not break orders/payments.
export async function queueEmail(type, to, { subject, html, text }, dedupeKey) {
  try {
    await Notification.create({ type, to, subject, html, text, dedupeKey });
    if (env.isTest) return;
    setImmediate(() => processOutbox(5).catch(() => {}));
  } catch (err) {
    if (err?.code !== 11000) logger.warn({ type, err: err.message }, 'Failed to queue email');
  }
}

export async function processOutbox(limit = 20) {
  const results = { sent: 0, failed: 0, skipped: 0 };
  for (let i = 0; i < limit; i++) {
    // claim one job atomically so concurrent workers never double-send
    const job = await Notification.findOneAndUpdate(
      { status: 'pending', nextAttemptAt: { $lte: new Date() } },
      { $set: { nextAttemptAt: new Date(Date.now() + 5 * 60 * 1000) }, $inc: { attempts: 1 } },
      { sort: { createdAt: 1 }, new: true },
    );
    if (!job) break;
    const rs = getClient();
    if (!rs) { await Notification.updateOne({ _id: job._id }, { status: 'skipped', lastError: 'RESEND_API_KEY not configured' }); results.skipped++; continue; }
    try {
      const providerId = await deliver(rs, job);
      await Notification.updateOne({ _id: job._id }, { status: 'sent', sentAt: new Date(), lastError: null, providerId });
      results.sent++;
    } catch (err) {
      // 4xx validation errors (bad address, unverified domain) will never succeed on retry
      const code = err.resend?.statusCode;
      const permanent = code >= 400 && code < 500 && code !== 429;
      const giveUp = permanent || job.attempts >= 5;
      await Notification.updateOne({ _id: job._id }, {
        status: giveUp ? 'failed' : 'pending', lastError: String(err.message).slice(0, 300),
        nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** job.attempts) * 60 * 1000),
      });
      results.failed++;
      logger.warn({ type: job.type, attempts: job.attempts }, 'Email delivery failed');
    }
  }
  return results;
}
