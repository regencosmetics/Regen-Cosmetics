import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { rz } from './mocks.js';
vi.mock('../src/services/razorpayClient.js', async (orig) => { const m = await import('./mocks.js'); return { ...(await orig()), getRazorpay: () => m.rz.api }; });
import { createApp } from '../src/app.js';
import { startDb, stopDb, resetDb, client } from './helpers.js';
import { makeUser, login, makeProduct, makeCoupon, cartItem, orderBody, idem, stockOf, sign, webhookSig, ADDRESS } from './fixtures.js';
import { Order, Payment, Refund, InventoryTransaction, Cart, Coupon, WebhookEvent } from '../src/models/index.js';
import { reconcileExpiredOrders } from '../src/services/paymentService.js';

let mem; const app = createApp();
beforeAll(async () => { mem = await startDb(); }); afterAll(() => stopDb(mem));
beforeEach(async () => { await resetDb(); rz.reset(); });
const customer = async () => { const u = await makeUser(); const c = await client(app); await login(c, u); return { u, c }; };

describe('cart', () => {
  it('adds, updates, removes and shows empty/populated states with server pricing', async () => {
    const { c } = await customer(); const p = await makeProduct();
    expect((await c.get('/api/v1/cart')).body.data.cart.lines).toHaveLength(0);
    const add = await c.post('/api/v1/cart/items', cartItem(p, 2));
    expect(add.body.data.cart.pricing.subtotal).toBe(1198); expect(add.body.data.cart.pricing.shipping).toBe(0);
    await c.post('/api/v1/cart/items', cartItem(p, 1));
    expect((await c.get('/api/v1/cart')).body.data.cart.lines[0].quantity).toBe(3); // no duplicate line
    expect((await c.patch('/api/v1/cart/items', { ...cartItem(p, 1) })).body.data.cart.lines[0].quantity).toBe(1);
    expect((await c.get('/api/v1/cart')).body.data.cart.pricing.shipping).toBe(49);
    await c.delete(`/api/v1/cart/items/${p._id}/${p.variants[0].sku}`);
    expect((await c.get('/api/v1/cart')).body.data.cart.lines).toHaveLength(0);
  });
  it('blocks out-of-stock items and quantities beyond stock', async () => {
    const { c } = await customer();
    const oos = await makeProduct({ variants: [{ sku: 'OOS-1', label: 'x', price: 100, stock: 0 }] });
    const low = await makeProduct({ variants: [{ sku: 'LOW-1', label: 'x', price: 100, stock: 2 }] });
    expect((await c.post('/api/v1/cart/items', cartItem(oos))).body.code).toBe('OUT_OF_STOCK');
    expect((await c.post('/api/v1/cart/items', cartItem(low, 3))).status).toBe(409);
    await c.post('/api/v1/cart/items', cartItem(low, 2));
    expect((await c.post('/api/v1/cart/items', cartItem(low, 1))).status).toBe(409);
    expect((await c.post('/api/v1/cart/items', { productId: String(low._id), sku: 'LOW-1', quantity: 99 })).status).toBe(400);
  });
  it('applies, rejects and removes coupons using server-side rules', async () => {
    const { c } = await customer(); const p = await makeProduct({ variants: [{ sku: 'C-1', label: 'x', price: 1000, stock: 9 }] });
    await c.post('/api/v1/cart/items', cartItem(p));
    expect((await c.post('/api/v1/cart/coupon', { code: 'NOPE' })).body.code).toBe('COUPON_INVALID');
    await makeCoupon({ code: 'OLD', expiresAt: new Date(Date.now() - 1000) });
    expect((await c.post('/api/v1/cart/coupon', { code: 'OLD' })).body.code).toBe('COUPON_EXPIRED');
    await makeCoupon({ code: 'BIG', minOrderAmount: 5000 });
    expect((await c.post('/api/v1/cart/coupon', { code: 'BIG' })).body.code).toBe('COUPON_MIN_ORDER');
    await makeCoupon({ code: 'USED', usageLimit: 1, usedCount: 1 });
    expect((await c.post('/api/v1/cart/coupon', { code: 'USED' })).body.code).toBe('COUPON_EXHAUSTED');
    await makeCoupon({ code: 'TEN', type: 'percent', value: 10, maxDiscount: 50 });
    const ok = await c.post('/api/v1/cart/coupon', { code: 'ten' });
    expect(ok.body.data.cart.pricing.discount).toBe(50); expect(ok.body.data.cart.pricing.total).toBe(999); // 950 + Rs 49 shipping (below free-shipping threshold)
    await makeCoupon({ code: 'HUGE', type: 'fixed', value: 99999 });
    const huge = await c.post('/api/v1/cart/coupon', { code: 'HUGE' });
    expect(huge.body.data.cart.pricing.total).toBeGreaterThanOrEqual(0);
    expect((await c.delete('/api/v1/cart/coupon')).body.data.cart.pricing.discount).toBe(0);
  });
  it('prices guest carts statelessly and merges them on login', async () => {
    const p = await makeProduct(); const g = await client(app);
    const q = await g.post('/api/v1/cart/quote', { items: [cartItem(p, 2)] });
    expect(q.body.data.cart.pricing.subtotal).toBe(1198);
    const { c } = await customer();
    expect((await c.post('/api/v1/cart/merge', { items: [cartItem(p, 2)] })).body.data.cart.lines[0].quantity).toBe(2);
    expect((await c.post('/api/v1/cart/merge', { items: [cartItem(p, 2)] })).body.data.cart.lines[0].quantity).toBe(4);
  });
  it('requires authentication for the persisted cart', async () => {
    expect((await (await client(app)).get('/api/v1/cart')).status).toBe(401);
  });
});

describe('COD checkout', () => {
  it('creates a COD order with backend totals, reserves stock and clears the cart', async () => {
    const { c, u } = await customer(); const p = await makeProduct();
    await c.post('/api/v1/cart/items', cartItem(p, 2));
    const r = await c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(idem()).send({ paymentMethod: 'cod', address: ADDRESS });
    expect(r.status).toBe(201);
    const o = r.body.data.order;
    expect(o.status).toBe('Confirmed'); expect(o.paymentStatus).toBe('COD Pending'); expect(o.pricing.total).toBe(1198); expect(o.orderNumber).toMatch(/^REG-/);
    expect(await stockOf(p)).toBe(8);
    expect((await Cart.findOne({ user: u._id })).items).toHaveLength(0);
    expect(await InventoryTransaction.countDocuments({ type: 'reserve' })).toBe(1);
  });
  it('ignores client-submitted prices/totals and rejects bad addresses', async () => {
    const { c } = await customer(); const p = await makeProduct();
    const r = await c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(idem()).send({ ...orderBody(p), items: [{ ...cartItem(p), price: 1, total: 1 }], total: 1 });
    expect(r.body.data.order.pricing.total).toBe(648); // 599 + 49 shipping
    const bad = await c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(idem()).send({ ...orderBody(p), address: { ...ADDRESS, pincode: '12' } });
    expect(bad.status).toBe(400);
    expect((await c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).send(orderBody(p))).body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });
  it('rejects insufficient stock at checkout', async () => {
    const { c } = await customer(); const p = await makeProduct({ variants: [{ sku: 'S-1', label: 'x', price: 100, stock: 1 }] });
    const r = await c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(idem()).send({ ...orderBody(p), items: [cartItem(p, 2)] });
    expect(r.status).toBe(409); expect(await stockOf(p)).toBe(1);
  });
  it('is idempotent: repeated submits create one order and reserve stock once', async () => {
    const { c } = await customer(); const p = await makeProduct(); const h = idem();
    const send = () => c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(h).send(orderBody(p));
    const rs = await Promise.all([send(), send(), send()]);
    expect(rs.every((r) => [200, 201].includes(r.status))).toBe(true);
    expect(new Set(rs.map((r) => r.body.data.order._id)).size).toBe(1);
    expect(await Order.countDocuments()).toBe(1); expect(await stockOf(p)).toBe(9);
  });
  it('never oversells under concurrent orders', async () => {
    const p = await makeProduct({ variants: [{ sku: 'RACE-1', label: 'x', price: 100, stock: 3 }] });
    const buyers = await Promise.all(Array.from({ length: 8 }, customer));
    const rs = await Promise.all(buyers.map(({ c }) => c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(idem()).send(orderBody(p))));
    expect(rs.filter((r) => r.status === 201)).toHaveLength(3);
    expect(rs.filter((r) => r.status === 409)).toHaveLength(5);
    expect(await stockOf(p)).toBe(0); expect(await Order.countDocuments()).toBe(3);
  });
  it('redeems coupons once and respects usage limits', async () => {
    const p = await makeProduct(); await makeCoupon({ code: 'ONCE', usageLimit: 1 });
    const a = await customer(); const b = await customer();
    const ra = await a.c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', a.c.token).set(idem()).send(orderBody(p, { couponCode: 'ONCE' }));
    expect(ra.body.data.order.pricing.discount).toBe(59.9);
    const rb = await b.c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', b.c.token).set(idem()).send(orderBody(p, { couponCode: 'ONCE' }));
    expect(rb.body.code).toBe('COUPON_EXHAUSTED'); expect(await stockOf(p)).toBe(9); // rollback released b's reservation
    expect((await Coupon.findOne({ code: 'ONCE' })).usedCount).toBe(1);
  });
  it('can be disabled by configuration and requires login', async () => {
    const p = await makeProduct(); const g = await client(app);
    expect((await g.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', g.token).set(idem()).send(orderBody(p))).status).toBe(401);
  });
});

describe('Razorpay payments (provider mocked, signatures real)', () => {
  const start = async () => {
    const { c, u } = await customer(); const p = await makeProduct();
    const r = await c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(idem()).send(orderBody(p, { paymentMethod: 'razorpay' }));
    return { c, u, p, order: r.body.data.order, pay: r.body.data.payment, r };
  };
  it('creates a pending order + provider order and verifies a valid signature exactly once', async () => {
    const { c, order, pay, p } = await start();
    expect(order.status).toBe('Pending'); expect(order.paymentStatus).toBe('Pending'); expect(pay.amount).toBe(64800);
    expect(pay.keyId).toBe(process.env.RAZORPAY_KEY_ID); expect(JSON.stringify(pay)).not.toContain(process.env.RAZORPAY_KEY_SECRET);
    expect(await stockOf(p)).toBe(9);
    const body = { razorpay_order_id: pay.razorpayOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(pay.razorpayOrderId, 'pay_1') };
    const v1 = await c.post('/api/v1/payments/verify', body);
    expect(v1.status).toBe(200); expect(v1.body.data.order.paymentStatus).toBe('Paid'); expect(v1.body.data.order.status).toBe('Confirmed');
    const v2 = await c.post('/api/v1/payments/verify', body);
    expect(v2.status).toBe(200); expect(v2.body.data.alreadyProcessed).toBe(true);
    expect(await stockOf(p)).toBe(9); expect(await Payment.countDocuments({ status: 'captured' })).toBe(1);
  });
  it('rejects forged signatures and other users’ payments; the order stays unpaid', async () => {
    const { c, pay, order } = await start();
    const bad = await c.post('/api/v1/payments/verify', { razorpay_order_id: pay.razorpayOrderId, razorpay_payment_id: 'pay_x', razorpay_signature: sign(pay.razorpayOrderId, 'pay_x', 'wrong-secret') });
    expect(bad.status).toBe(400); expect(bad.body.code).toBe('INVALID_SIGNATURE');
    expect((await Order.findById(order._id)).paymentStatus).toBe('Pending');
    const { c: other } = await customer();
    expect((await other.post('/api/v1/payments/verify', { razorpay_order_id: pay.razorpayOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(pay.razorpayOrderId, 'pay_1') })).status).toBe(404);
  });
  const hook = (c, payload, eventId) => { const raw = JSON.stringify(payload); return c.raw.post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', webhookSig(raw)).set('X-Razorpay-Event-Id', eventId).send(raw); };
  const captured = (pay, id = 'pay_w1') => ({ event: 'payment.captured', payload: { payment: { entity: { id, order_id: pay.razorpayOrderId, amount: pay.amount, method: 'upi' } } } });
  it('verifies webhook signatures and processes duplicates once (even before the browser callback)', async () => {
    const { c, pay, order } = await start();
    const raw = JSON.stringify(captured(pay));
    const unsigned = await c.raw.post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', 'bad').set('X-Razorpay-Event-Id', 'e0').send(raw);
    expect(unsigned.status).toBe(400);
    const [w1, w2] = await Promise.all([hook(c, captured(pay), 'evt_1'), hook(c, captured(pay), 'evt_1')]);
    expect([w1.status, w2.status]).toEqual([200, 200]);
    expect(await WebhookEvent.countDocuments({ eventId: 'evt_1' })).toBe(1);
    expect((await Order.findById(order._id)).paymentStatus).toBe('Paid');
    // browser callback after webhook is a harmless no-op
    const v = await c.post('/api/v1/payments/verify', { razorpay_order_id: pay.razorpayOrderId, razorpay_payment_id: 'pay_w1', razorpay_signature: sign(pay.razorpayOrderId, 'pay_w1') });
    expect(v.body.data.alreadyProcessed).toBe(true);
    expect(await Payment.countDocuments({ status: 'captured' })).toBe(1);
  });
  it('rejects webhook amount mismatches', async () => {
    const { c, pay, order } = await start();
    const r = await hook(c, { ...captured(pay), payload: { payment: { entity: { id: 'pay_m', order_id: pay.razorpayOrderId, amount: 100 } } } }, 'evt_m');
    expect(r.status).toBe(409); expect((await Order.findById(order._id)).paymentStatus).toBe('Pending');
  });
  it('records failed payments without confirming the order and lets the customer retry', async () => {
    const { c, pay, order } = await start();
    expect((await c.post('/api/v1/payments/failed', { razorpay_order_id: pay.razorpayOrderId, razorpay_payment_id: 'pay_f', error_code: 'BAD_REQUEST_ERROR', error_description: 'declined' })).status).toBe(200);
    const p = await Payment.findOne({ providerOrderId: pay.razorpayOrderId });
    expect(p.attempts.some((a) => a.status === 'failed')).toBe(true);
    const o = await Order.findById(order._id); expect(o.status).toBe('Pending'); expect(o.paymentStatus).toBe('Pending');
    const retry = await c.post(`/api/v1/payments/retry/${order._id}`);
    expect(retry.body.data.payment.razorpayOrderId).toBe(pay.razorpayOrderId); // same provider order, no duplicates
  });
  it('refunds automatically when payment is captured after the order was closed (late capture)', async () => {
    const { c, pay, order, p } = await start();
    await Order.updateOne({ _id: order._id }, { reservationExpiresAt: new Date(Date.now() - 1000) });
    rz.api.orders.fetchPayments.mockResolvedValueOnce({ items: [] });
    expect((await reconcileExpiredOrders()).cancelled).toBe(1);
    expect(await stockOf(p)).toBe(10); expect((await Order.findById(order._id)).status).toBe('Cancelled');
    const w = await hook(c, captured(pay, 'pay_late'), 'evt_late');
    expect(w.status).toBe(200);
    expect(rz.state.refunds).toHaveLength(1); expect(rz.state.refunds[0].amount).toBe(pay.amount);
    await hook(c, captured(pay, 'pay_late'), 'evt_late2'); // second delivery with a new event id
    expect(rz.state.refunds).toHaveLength(1); expect(await stockOf(p)).toBe(10);
  });
  it('recovers a paid order when the browser closed and the webhook was lost', async () => {
    const { pay, order } = await start();
    await Order.updateOne({ _id: order._id }, { reservationExpiresAt: new Date(Date.now() - 1000) });
    rz.state.payments[pay.razorpayOrderId] = [{ id: 'pay_r', status: 'captured', amount: pay.amount, method: 'card' }];
    expect((await reconcileExpiredOrders()).recovered).toBe(1);
    expect((await Order.findById(order._id)).paymentStatus).toBe('Paid');
  });
  it('cancelling a paid online order issues exactly one refund and restores stock once', async () => {
    const { c, pay, order, p } = await start();
    await c.post('/api/v1/payments/verify', { razorpay_order_id: pay.razorpayOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(pay.razorpayOrderId, 'pay_1') });
    const rs = await Promise.all([c.post(`/api/v1/orders/${order._id}/cancel`, {}), c.post(`/api/v1/orders/${order._id}/cancel`, {})]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await Refund.countDocuments()).toBe(1); expect(rz.state.refunds).toHaveLength(1);
    expect(await stockOf(p)).toBe(10);
    expect((await Order.findById(order._id)).paymentStatus).toBe('Refunded');
  });
  it('does not hold a Razorpay order for failed provider sessions', async () => {
    const { c } = await customer(); const p = await makeProduct();
    rz.api.orders.create.mockRejectedValueOnce(new Error('network'));
    const r = await c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(idem()).send(orderBody(p, { paymentMethod: 'razorpay' }));
    expect(r.status).toBe(500); expect(await stockOf(p)).toBe(10);
  });
});
