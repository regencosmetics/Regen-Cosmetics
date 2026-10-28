import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startDb, stopDb } from './helpers.js';
import env from '../src/config/env.js';
import { Notification } from '../src/models/index.js';
import { queueEmail, processOutbox, __setClient } from '../src/services/emailService.js';

const mail = { subject: 'Hello', html: '<p>Hi</p>', text: 'Hi' };
let send;
const useResend = (impl) => { send = vi.fn(impl); __setClient({ emails: { send } }); env.emailConfigured = true; env.RESEND_API_KEY = 're_test'; };

let mem;
beforeAll(async () => { mem = await startDb(); }); afterAll(() => stopDb(mem));
beforeEach(async () => { await Notification.deleteMany({}); env.emailConfigured = false; __setClient(undefined); });

describe('Resend email outbox', () => {
  it('marks messages skipped (not sent) when RESEND_API_KEY is missing', async () => {
    await queueEmail('welcome', 'a@example.com', mail, 'k1');
    expect(await processOutbox()).toMatchObject({ skipped: 1, sent: 0 });
    const n = await Notification.findOne(); expect(n.status).toBe('skipped'); expect(n.lastError).toMatch(/RESEND_API_KEY/);
  });

  it('sends through Resend with from, to array, content and a per-notification idempotency key', async () => {
    useResend(async () => ({ data: { id: 'em_123' }, error: null }));
    await queueEmail('order_confirmation', 'buyer@example.com', mail, 'k2');
    expect(await processOutbox()).toMatchObject({ sent: 1, failed: 0 });
    const [payload, opts] = send.mock.calls[0]; const n = await Notification.findOne();
    expect(payload).toMatchObject({ to: ['buyer@example.com'], subject: 'Hello', html: '<p>Hi</p>', text: 'Hi', from: env.EMAIL_FROM });
    expect(opts.idempotencyKey).toBe(`notification-${n._id}`);
    expect(n).toMatchObject({ status: 'sent', providerId: 'em_123' });
  });

  it('treats a Resend {error} response as a failure and retries later (rate limit / server error)', async () => {
    useResend(async () => ({ data: null, error: { name: 'rate_limit_exceeded', message: 'Too many requests', statusCode: 429 } }));
    await queueEmail('x', 'a@example.com', mail, 'k3');
    expect(await processOutbox()).toMatchObject({ failed: 1, sent: 0 });
    const n = await Notification.findOne(); expect(n.status).toBe('pending'); expect(n.lastError).toMatch(/Too many/); expect(n.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('gives up immediately on permanent 4xx errors such as an unverified domain', async () => {
    useResend(async () => ({ data: null, error: { name: 'validation_error', message: 'The domain is not verified', statusCode: 403 } }));
    await queueEmail('x', 'a@example.com', mail, 'k4'); await processOutbox();
    expect((await Notification.findOne()).status).toBe('failed');
  });

  it('retries after a network exception and succeeds on the next run', async () => {
    let calls = 0; useResend(async () => { if (++calls === 1) throw new Error('ECONNRESET'); return { data: { id: 'em_9' }, error: null }; });
    await queueEmail('x', 'a@example.com', mail, 'k5'); await processOutbox();
    await Notification.updateOne({}, { nextAttemptAt: new Date(Date.now() - 1000) });
    expect(await processOutbox()).toMatchObject({ sent: 1 });
    expect(send.mock.calls[0][1].idempotencyKey).toBe(send.mock.calls[1][1].idempotencyKey);
  });

  it('does not queue the same dedupeKey twice', async () => {
    await queueEmail('x', 'a@example.com', mail, 'same'); await queueEmail('x', 'a@example.com', mail, 'same');
    expect(await Notification.countDocuments()).toBe(1);
  });
});
