import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { rz } from './mocks.js';
vi.mock('../src/services/razorpayClient.js', async (orig) => { const m = await import('./mocks.js'); return { ...(await orig()), getRazorpay: () => m.rz.api }; });
vi.mock('../src/services/cloudinaryService.js', () => ({ uploadImage: vi.fn(async () => ({ url: 'https://res.cloudinary.com/test/e.jpg', publicId: 'e' })), deleteImage: vi.fn() }));
import { createApp } from '../src/app.js';
import { startDb, stopDb, resetDb, client } from './helpers.js';
import { makeUser, login, makeProduct, orderBody, idem, stockOf, deliver, sign, ADDRESS } from './fixtures.js';
import { Order, Return, Refund, InventoryTransaction } from '../src/models/index.js';

let mem; const app = createApp();
beforeAll(async () => { mem = await startDb(); }); afterAll(() => stopDb(mem));
beforeEach(async () => { await resetDb(); rz.reset(); });
const cust = async (over) => { const u = await makeUser(over); const c = await client(app); await login(c, u); return { u, c }; };
const admin = async () => (await cust({ role: 'admin' })).c;
const place = async (c, p, extra = {}) => (await c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(idem()).send(orderBody(p, extra))).body.data;
const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const submitReturn = (c, data, files = 1) => { let r = c.raw.post('/api/v1/returns').set('X-CSRF-Token', c.token).field('data', JSON.stringify(data)); for (let i = 0; i < files; i++) r = r.attach('evidence', png, { filename: 'e.png', contentType: 'image/png' }); return r; };

describe('orders', () => {
  it('shows history/details only to the owner and hides other customers’ orders', async () => {
    const a = await cust(); const b = await cust(); const p = await makeProduct();
    const { order } = await place(a.c, p);
    expect((await a.c.get('/api/v1/orders')).body.data.items).toHaveLength(1);
    expect((await b.c.get('/api/v1/orders')).body.data.items).toHaveLength(0);
    expect((await a.c.get(`/api/v1/orders/${order._id}`)).status).toBe(200);
    expect((await b.c.get(`/api/v1/orders/${order._id}`)).status).toBe(404);
    expect((await b.c.get(`/api/v1/orders/${order._id}/invoice`)).status).toBe(404);
    expect((await b.c.post(`/api/v1/orders/${order._id}/cancel`, {})).status).toBe(404);
  });
  it('serves a real PDF invoice to the owner and to admins', async () => {
    const a = await cust(); const ad = await admin(); const p = await makeProduct();
    const { order } = await place(a.c, p);
    const inv = await a.c.raw.get(`/api/v1/orders/${order._id}/invoice`).buffer().parse((res, cb) => { const ch = []; res.on('data', (d) => ch.push(d)); res.on('end', () => cb(null, Buffer.concat(ch))); });
    expect(inv.headers['content-type']).toMatch(/pdf/); expect(inv.body.subarray(0, 4).toString()).toBe('%PDF');
    const label = await ad.raw.get(`/api/v1/admin/orders/${order._id}/label`).buffer().parse((res, cb) => { const ch = []; res.on('data', (d) => ch.push(d)); res.on('end', () => cb(null, Buffer.concat(ch))); });
    expect(label.body.subarray(0, 4).toString()).toBe('%PDF');
  });
  it('follows allowed status transitions and rejects invalid ones', async () => {
    const a = await cust(); const ad = await admin(); const p = await makeProduct();
    const { order } = await place(a.c, p);
    const set = (status, extra = {}) => ad.patch(`/api/v1/admin/orders/${order._id}/status`, { status, ...extra });
    expect((await set('Delivered')).status).toBe(409);
    expect((await set('Shipped')).status).toBe(409);
    expect((await set('Processing')).status).toBe(200);
    const sh = await set('Shipped', { tracking: { carrier: 'BlueDart', trackingNumber: 'BD123' } });
    expect(sh.body.data.order.tracking.trackingNumber).toBe('BD123');
    expect((await set('Processing')).status).toBe(409);
    expect((await set('Delivered')).status).toBe(200);
    expect((await set('Cancelled')).status).toBe(409);
    const o = await Order.findById(order._id); expect(o.statusHistory.map((h) => h.status)).toEqual(['Confirmed', 'Processing', 'Shipped', 'Delivered']);
    expect(o.paymentStatus).toBe('COD Collected');
  });
  it('blocks confirming an unpaid online order', async () => {
    const a = await cust(); const ad = await admin(); const p = await makeProduct();
    const { order } = await place(a.c, p, { paymentMethod: 'razorpay' });
    expect((await ad.patch(`/api/v1/admin/orders/${order._id}/status`, { status: 'Confirmed' })).body.code).toBe('PAYMENT_NOT_VERIFIED');
  });
  it('cancels before shipment, restores stock exactly once, and rejects repeats', async () => {
    const a = await cust(); const p = await makeProduct();
    const { order } = await place(a.c, p);
    expect(order.canCancel).toBe(true); expect(await stockOf(p)).toBe(9);
    const r1 = await a.c.post(`/api/v1/orders/${order._id}/cancel`, { reason: 'changed mind' });
    expect(r1.status).toBe(200); expect(r1.body.data.order.canCancel).toBe(false);
    expect(await stockOf(p)).toBe(10);
    expect((await a.c.post(`/api/v1/orders/${order._id}/cancel`, {})).status).toBe(409);
    expect(await stockOf(p)).toBe(10); expect(await InventoryTransaction.countDocuments({ type: 'release' })).toBe(1);
  });
  it('rejects cancellation once shipped (backend authoritative) and hides the cancel flag', async () => {
    const a = await cust(); const ad = await admin(); const p = await makeProduct();
    const { order } = await place(a.c, p);
    await ad.patch(`/api/v1/admin/orders/${order._id}/status`, { status: 'Processing' });
    expect((await a.c.get(`/api/v1/orders/${order._id}`)).body.data.order.canCancel).toBe(true);
    await ad.patch(`/api/v1/admin/orders/${order._id}/status`, { status: 'Shipped' });
    expect((await a.c.get(`/api/v1/orders/${order._id}`)).body.data.order.canCancel).toBe(false);
    const r = await a.c.post(`/api/v1/orders/${order._id}/cancel`, {});
    expect(r.status).toBe(409); expect(r.body.code).toBe('CANCEL_NOT_ALLOWED');
    expect(await stockOf(p)).toBe(9);
  });
  it('resolves a cancel/ship race so only one wins and stock stays consistent', async () => {
    const a = await cust(); const ad = await admin(); const p = await makeProduct();
    const { order } = await place(a.c, p);
    await ad.patch(`/api/v1/admin/orders/${order._id}/status`, { status: 'Processing' });
    const [c1, s1] = await Promise.all([a.c.post(`/api/v1/orders/${order._id}/cancel`, {}), ad.patch(`/api/v1/admin/orders/${order._id}/status`, { status: 'Shipped' })]);
    const final = await Order.findById(order._id);
    expect([c1.status === 200, s1.status === 200].filter(Boolean)).toHaveLength(1);
    expect(['Cancelled', 'Shipped']).toContain(final.status);
    expect(await stockOf(p)).toBe(final.status === 'Cancelled' ? 10 : 9);
  });
  it('tracks orders by number + email without exposing private data', async () => {
    const a = await cust(); const p = await makeProduct(); const g = await client(app);
    const { order } = await place(a.c, p);
    const ok = await g.get(`/api/v1/orders/track?orderNumber=${order.orderNumber}&email=${a.u.email}`);
    expect(ok.status).toBe(200); expect(JSON.stringify(ok.body)).not.toMatch(/line1|phone|9876543210/);
    expect((await g.get(`/api/v1/orders/track?orderNumber=${order.orderNumber}&email=x@example.com`)).status).toBe(404);
  });
});

describe('returns & refunds', () => {
  const deliveredOrder = async (opts = {}) => {
    const a = await cust(); const p = await makeProduct(opts.product);
    const { order } = await place(a.c, p, { items: [{ productId: String(p._id), sku: p.variants[0].sku, quantity: 2 }] });
    await deliver(order._id);
    return { ...a, p, order };
  };
  const retBody = (order, p, over = {}) => ({ orderId: order._id, items: [{ sku: p.variants[0].sku, quantity: 1, reason: 'Damaged Product', ...over }] });

  it('reports eligibility and accepts an eligible return with evidence', async () => {
    const { c, p, order } = await deliveredOrder();
    const el = await c.get(`/api/v1/returns/eligibility/${order._id}`);
    expect(el.body.data.items[0]).toMatchObject({ eligible: true, remaining: 2 });
    const r = await submitReturn(c, retBody(order, p));
    expect(r.status).toBe(201); expect(r.body.data.return.status).toBe('Return Requested'); expect(r.body.data.return.evidence).toHaveLength(1);
    expect(await stockOf(p)).toBe(8); // submitting a return never restocks
  });
  it('rejects ineligible returns: undelivered, expired, non-returnable, over-quantity, duplicates', async () => {
    const a = await cust(); const p = await makeProduct(); const { order } = await place(a.c, p);
    expect((await submitReturn(a.c, retBody(order, p))).body.code).toBe('RETURN_NOT_ELIGIBLE'); // not delivered
    await deliver(order._id);
    expect((await submitReturn(a.c, retBody(order, p, { quantity: 5 }))).status).toBe(409);
    expect((await submitReturn(a.c, retBody(order, p))).status).toBe(201);
    expect((await submitReturn(a.c, retBody(order, p))).status).toBe(409); // already returned
    const old = await deliveredOrder();
    await Order.updateOne({ _id: old.order._id }, { deliveredAt: new Date(Date.now() - 10 * 864e5) });
    const exp = await submitReturn(old.c, retBody(old.order, old.p));
    expect(exp.status).toBe(409); expect(exp.body.message).toMatch(/window/);
    const nr = await deliveredOrder({ product: { returnPolicy: { returnable: false } } });
    expect((await submitReturn(nr.c, retBody(nr.order, nr.p))).status).toBe(409);
  });
  it('honours product-specific return windows', async () => {
    const a = await deliveredOrder({ product: { returnPolicy: { returnable: true, windowDays: 30 } } });
    await Order.updateOne({ _id: a.order._id }, { deliveredAt: new Date(Date.now() - 20 * 864e5) });
    expect((await submitReturn(a.c, retBody(a.order, a.p))).status).toBe(201);
  });
  it('blocks other users, missing evidence, bad files and malformed data', async () => {
    const a = await deliveredOrder(); const other = await cust();
    expect((await submitReturn(other.c, retBody(a.order, a.p))).status).toBe(404);
    expect((await submitReturn(a.c, retBody(a.order, a.p), 0)).body.code).toBe('EVIDENCE_REQUIRED');
    const bad = await a.c.raw.post('/api/v1/returns').set('X-CSRF-Token', a.c.token).field('data', JSON.stringify(retBody(a.order, a.p))).attach('evidence', Buffer.from('MZ-exe'), { filename: 'x.exe', contentType: 'application/x-msdownload' });
    expect(bad.status).toBe(400);
    expect((await a.c.raw.post('/api/v1/returns').set('X-CSRF-Token', a.c.token).field('data', '{bad')).status).toBe(400);
    expect((await other.c.get(`/api/v1/returns/eligibility/${a.order._id}`)).status).toBe(404);
  });
  it('rejects a return and lets the quantity be requested again', async () => {
    const a = await deliveredOrder(); const ad = await admin();
    const r = (await submitReturn(a.c, retBody(a.order, a.p))).body.data.return;
    expect((await ad.patch(`/api/v1/admin/returns/${r._id}/status`, { status: 'Rejected' })).status).toBe(400); // reason required
    expect((await ad.patch(`/api/v1/admin/returns/${r._id}/status`, { status: 'Rejected', rejectionReason: 'Used product' })).body.data.return.status).toBe('Rejected');
    expect((await a.c.get(`/api/v1/returns/${r._id}`)).body.data.return.rejectionReason).toBe('Used product'); // customer sees admin updates
    expect((await ad.patch(`/api/v1/admin/returns/${r._id}/status`, { status: 'Approved' })).status).toBe(409);
    expect((await submitReturn(a.c, retBody(a.order, a.p, { quantity: 2 }))).status).toBe(201);
  });
  it('enforces the workflow order; restocks only after inspection, only resellable items, once', async () => {
    const a = await deliveredOrder(); const ad = await admin();
    const r = (await submitReturn(a.c, retBody(a.order, a.p))).body.data.return;
    const st = (status, extra) => ad.patch(`/api/v1/admin/returns/${r._id}/status`, { status, ...extra });
    expect((await st('Product Received')).status).toBe(409);
    expect((await ad.post(`/api/v1/admin/returns/${r._id}/inspect`, { results: [{ sku: a.p.variants[0].sku, result: 'resellable' }] })).status).toBe(409);
    expect((await st('Under Review')).status).toBe(200); expect((await st('Approved')).status).toBe(200);
    expect((await st('Pickup Scheduled', { pickup: { note: 'tomorrow' } })).status).toBe(200); expect((await st('Product Received')).status).toBe(200);
    expect(await stockOf(a.p)).toBe(8);
    const insp = { results: [{ sku: a.p.variants[0].sku, result: 'resellable' }] };
    expect((await ad.post(`/api/v1/admin/returns/${r._id}/inspect`, insp)).status).toBe(200);
    expect(await stockOf(a.p)).toBe(9);
    expect((await ad.post(`/api/v1/admin/returns/${r._id}/inspect`, insp)).status).toBe(409); // cannot restock twice
    expect(await stockOf(a.p)).toBe(9); expect(await InventoryTransaction.countDocuments({ type: 'return_restock' })).toBe(1);
  });
  it('does not restock non-resellable items', async () => {
    const a = await deliveredOrder(); const ad = await admin();
    const r = (await submitReturn(a.c, retBody(a.order, a.p))).body.data.return;
    for (const s of ['Approved', 'Product Received']) await ad.patch(`/api/v1/admin/returns/${r._id}/status`, { status: s });
    await ad.post(`/api/v1/admin/returns/${r._id}/inspect`, { results: [{ sku: a.p.variants[0].sku, result: 'not_resellable' }] });
    expect(await stockOf(a.p)).toBe(8);
  });
  const toInspected = async (a, ad, r) => { for (const s of ['Approved', 'Product Received']) await ad.patch(`/api/v1/admin/returns/${r._id}/status`, { status: s }); await ad.post(`/api/v1/admin/returns/${r._id}/inspect`, { results: [{ sku: a.p.variants[0].sku, result: 'not_resellable' }] }); };
  it('refunds Razorpay returns once via the provider API (idempotent), completing on webhook-style confirmation', async () => {
    const a = await cust(); const ad = await admin(); const p = await makeProduct();
    const placed = await place(a.c, p, { paymentMethod: 'razorpay', items: [{ productId: String(p._id), sku: p.variants[0].sku, quantity: 2 }] });
    const pay = placed.payment;
    await a.c.post('/api/v1/payments/verify', { razorpay_order_id: pay.razorpayOrderId, razorpay_payment_id: 'pay_9', razorpay_signature: sign(pay.razorpayOrderId, 'pay_9') });
    await Order.updateOne({ _id: placed.order._id }, { status: 'Delivered', deliveredAt: new Date() });
    const r = (await submitReturn(a.c, retBody(placed.order, p))).body.data.return;
    await toInspected({ p }, ad, r);
    const rf = await Promise.all([ad.post(`/api/v1/admin/returns/${r._id}/refund`, {}), ad.post(`/api/v1/admin/returns/${r._id}/refund`, {})]);
    expect(rf.every((x) => x.status === 200)).toBe(true);
    expect(rz.state.refunds).toHaveLength(1); expect(rz.state.refunds[0].amount).toBe(59900);
    expect(await Refund.countDocuments()).toBe(1);
    const final = await Return.findById(r._id); expect(final.status).toBe('Refund Completed');
    expect((await ad.post(`/api/v1/admin/returns/${r._id}/refund`, {})).body.data.duplicate).toBe(true);
    expect(rz.state.refunds).toHaveLength(1);
    expect((await Order.findById(placed.order._id)).paymentStatus).toBe('Partially Refunded');
  });
  it('keeps a failed provider refund retryable without duplicating it', async () => {
    const a = await cust(); const ad = await admin(); const p = await makeProduct();
    const placed = await place(a.c, p, { paymentMethod: 'razorpay' });
    await a.c.post('/api/v1/payments/verify', { razorpay_order_id: placed.payment.razorpayOrderId, razorpay_payment_id: 'pay_8', razorpay_signature: sign(placed.payment.razorpayOrderId, 'pay_8') });
    await Order.updateOne({ _id: placed.order._id }, { status: 'Delivered', deliveredAt: new Date() });
    const r = (await submitReturn(a.c, retBody(placed.order, p))).body.data.return;
    await toInspected({ p }, ad, r);
    rz.state.fail = true;
    const f = await ad.post(`/api/v1/admin/returns/${r._id}/refund`, {});
    expect(f.body.data.refund.status).toBe('Failed');
    rz.state.fail = false;
    const retry = await ad.post(`/api/v1/admin/refunds/${f.body.data.refund._id}/retry`);
    expect(retry.body.data.refund.status).toBe('Completed'); expect(rz.state.refunds).toHaveLength(1);
    expect((await ad.post(`/api/v1/admin/refunds/${f.body.data.refund._id}/retry`)).status).toBe(409);
  });
  it('tracks COD refunds manually: payout details required, encrypted, completed only with a reference', async () => {
    const a = await deliveredOrder(); const ad = await admin();
    const r = (await submitReturn(a.c, { ...retBody(a.order, a.p), refundMethod: 'upi' })).body.data.return;
    await toInspected(a, ad, r);
    expect((await ad.post(`/api/v1/admin/returns/${r._id}/refund`, {})).body.code).toBe('PAYOUT_REQUIRED');
    const rf = await ad.post(`/api/v1/admin/returns/${r._id}/refund`, { payout: { upiId: 'asha@okhdfc' } });
    expect(rf.body.data.refund.status).toBe('Pending'); expect(rz.state.refunds).toHaveLength(0);
    const id = rf.body.data.refund._id;
    expect((await ad.post(`/api/v1/admin/refunds/${id}/complete`, { reference: '' })).status).toBe(400);
    expect((await ad.post(`/api/v1/admin/refunds/${id}/complete`, { reference: 'UTR123456' })).body.data.refund.status).toBe('Completed');
    expect((await ad.post(`/api/v1/admin/refunds/${id}/complete`, { reference: 'UTR123456' })).status).toBe(200);
    expect((await Order.findById(a.order._id)).refundedAmount).toBe(599); // counted once
    expect((await Return.findById(r._id)).status).toBe('Refund Completed');
    expect((await a.c.get(`/api/v1/returns/${r._id}`)).body.data.refund.status).toBe('Completed');
    expect(JSON.stringify((await a.c.get(`/api/v1/returns/${r._id}`)).body)).not.toMatch(/upiId|accountNumber/);
  });
  it('stores bank account numbers encrypted and reveals them only to admins', async () => {
    const a = await deliveredOrder(); const ad = await admin();
    const r = (await submitReturn(a.c, { ...retBody(a.order, a.p), refundMethod: 'bank' })).body.data.return;
    await toInspected(a, ad, r);
    const rf = await ad.post(`/api/v1/admin/returns/${r._id}/refund`, { payout: { accountHolder: 'Asha', ifsc: 'HDFC0001234', accountNumber: '123456789012' } });
    const raw = await Refund.findById(rf.body.data.refund._id).lean();
    expect(raw.payout.accountNumberEnc).not.toContain('123456789012'); expect(raw.payout.accountLast4).toBe('9012');
    expect((await ad.get(`/api/v1/admin/refunds/${raw._id}/payout`)).body.data.payout.accountNumber).toBe('123456789012');
    expect((await a.c.get(`/api/v1/admin/refunds/${raw._id}/payout`)).status).toBe(403);
  });
});
void ADDRESS;
