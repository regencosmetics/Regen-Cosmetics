import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
vi.mock('../src/services/cloudinaryService.js', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn(), resetCloudinary: vi.fn() }));
import { createApp } from '../src/app.js';
import { startDb, stopDb, resetDb, client } from './helpers.js';
import { makeUser, login, makeProduct, orderBody, idem, deliver, ADDRESS, cartItem } from './fixtures.js';
import { Order, Review, Product } from '../src/models/index.js';

let mem; const app = createApp();
beforeAll(async () => { mem = await startDb(); }); afterAll(() => stopDb(mem)); beforeEach(resetDb);
const cust = async () => { const u = await makeUser(); const c = await client(app); await login(c, u); return { u, c }; };
const admin = async () => { const c = await client(app); await login(c, await makeUser({ role: 'admin' })); return c; };

describe('admin dashboard', () => {
  it('computes metrics from real records with documented rules', async () => {
    const a = await admin(); const { c } = await cust(); const p = await makeProduct({ variants: [{ sku: 'D-1', label: 'x', price: 100, stock: 3, lowStockThreshold: 5 }] });
    const place = async (m = 'cod') => (await c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(idem()).send(orderBody(p, { paymentMethod: m }))).body.data.order;
    const o1 = await place(); const o2 = await place();
    await deliver(o1._id);
    await c.post(`/api/v1/orders/${o2._id}/cancel`, {});
    const d = (await a.get('/api/v1/admin/dashboard')).body.data;
    expect(d.cards.totalOrders).toBe(1);               // cancelled excluded
    expect(d.cards.totalRevenue).toBe(149);            // delivered COD only: 100 + Rs 49 shipping
    expect(d.cards.totalProducts).toBe(1); expect(d.cards.totalCustomers).toBe(1); // admins are not customers
    expect(d.cards.inventoryAlerts).toBe(1); expect(d.recentOrders).toHaveLength(2); expect(d.definitions.totalRevenue).toBeTruthy();
    expect((await a.get('/api/v1/admin/dashboard?from=garbage')).status).toBe(400);
  });
  it('lists, filters and searches orders and customers', async () => {
    const a = await admin(); const { c, u } = await cust(); const p = await makeProduct();
    await c.raw.post('/api/v1/checkout/orders').set('X-CSRF-Token', c.token).set(idem()).send(orderBody(p));
    expect((await a.get('/api/v1/admin/orders?status=Confirmed')).body.data.pagination.total).toBe(1);
    expect((await a.get(`/api/v1/admin/orders?q=${u.email}`)).body.data.items).toHaveLength(1);
    expect((await a.get('/api/v1/admin/orders?status=Shipped')).body.data.items).toHaveLength(0);
    expect((await a.get('/api/v1/admin/customers')).body.data.items.some((x) => x.email === u.email)).toBe(true);
    const off = await a.patch(`/api/v1/admin/customers/${u._id}/active`, { isActive: false });
    expect(off.body.data.user.isActive).toBe(false);
    expect((await c.get('/api/v1/auth/me')).status).toBe(401); // disabled accounts are locked out immediately
  });
});

describe('content & engagement', () => {
  it('updates CMS content, sanitises markup and serves defaults when empty', async () => {
    const a = await admin(); const pub = await client(app);
    expect((await pub.get('/api/v1/cms/home')).body.data.content.hero.headline).toMatch(/Reset Your Skin/);
    const home = (await a.get('/api/v1/admin/cms/home')).body.data.content;
    const saved = await a.put('/api/v1/admin/cms/home', { ...home, hero: { ...home.hero, headline: 'Hello <script>alert(1)</script>World' } });
    expect(saved.body.data.content.hero.headline).toBe('Hello alert(1)World');
    expect((await pub.get('/api/v1/cms/home')).body.data.content.hero.headline).toBe('Hello alert(1)World');
    expect((await a.put('/api/v1/admin/cms/home', { hero: { ctaLink: 'javascript:alert(1)' } })).status).toBe(400);
    expect((await pub.get('/api/v1/cms/business')).status).toBe(404); // business details are not public
    expect((await pub.put('/api/v1/admin/cms/home', {})).status).toBe(401);
    await a.delete('/api/v1/admin/cms/home');
    expect((await pub.get('/api/v1/cms/home')).body.data.content.hero.headline).toMatch(/Reset Your Skin/);
    expect((await pub.get('/api/v1/cms/legal.terms')).body.data.content.sections).toHaveLength(16);
  });
  it('manages banners and only serves active, scheduled ones', async () => {
    const a = await admin(); const pub = await client(app);
    const b = { placement: 'hero', title: 'Sale', image: { url: 'https://res.cloudinary.com/x/a.jpg' }, ctaLink: '/shop' };
    const id = (await a.post('/api/v1/admin/banners', b)).body.data.item._id;
    await a.post('/api/v1/admin/banners', { ...b, title: 'Future', startsAt: new Date(Date.now() + 864e5) });
    await a.post('/api/v1/admin/banners', { ...b, title: 'Off', isActive: false });
    expect((await pub.get('/api/v1/banners?placement=hero')).body.data.items.map((x) => x.title)).toEqual(['Sale']);
    expect((await a.put(`/api/v1/admin/banners/${id}`, { ...b, title: 'Sale 2' })).body.data.item.title).toBe('Sale 2');
    expect((await a.delete(`/api/v1/admin/banners/${id}`)).status).toBe(200);
  });
  it('moderates reviews and computes ratings only from approved reviews', async () => {
    const a = await admin(); const { c, u } = await cust(); const p = await makeProduct(); const pub = await client(app);
    expect((await pub.post(`/api/v1/products/${p._id}/reviews`, { rating: 5, title: 'Great', body: 'x' })).status).toBe(401);
    const r = await c.post(`/api/v1/products/${p._id}/reviews`, { rating: 4, title: 'Nice one', body: 'works' });
    expect(r.status).toBe(201); expect((await c.post(`/api/v1/products/${p._id}/reviews`, { rating: 4, title: 'Again', body: 'x' })).status).toBe(409);
    expect((await pub.get(`/api/v1/products/${p._id}/reviews`)).body.data.items).toHaveLength(0);
    expect((await Product.findById(p._id)).ratingCount).toBe(0);
    await a.patch(`/api/v1/admin/reviews/${r.body.data.review._id}`, { status: 'approved' });
    const list = (await pub.get(`/api/v1/products/${p._id}/reviews`)).body.data;
    expect(list.items).toHaveLength(1); expect(list.summary.average).toBe(4);
    expect(JSON.stringify(list)).not.toContain(String(u._id));
    expect((await Product.findById(p._id)).ratingCount).toBe(1);
    await a.delete(`/api/v1/admin/reviews/${r.body.data.review._id}`);
    expect((await Product.findById(p._id)).ratingCount).toBe(0); void Review;
  });
  it('stores contact messages (validated, honeypot) and lets admins manage them', async () => {
    const a = await admin(); const pub = await client(app);
    const m = { name: 'Ravi', email: 'ravi@example.com', phone: '9876543210', message: 'Where is my order?' };
    expect((await pub.post('/api/v1/contact', m)).status).toBe(201);
    expect((await pub.post('/api/v1/contact', { ...m, email: 'bad' })).status).toBe(400);
    expect((await pub.post('/api/v1/contact', { ...m, message: 'hi' })).status).toBe(400);
    await pub.post('/api/v1/contact', { ...m, website: 'http://spam' }); // bot: silently dropped
    const list = (await a.get('/api/v1/admin/messages')).body.data;
    expect(list.items).toHaveLength(1); expect(list.unread).toBe(1);
    await a.patch(`/api/v1/admin/messages/${list.items[0]._id}`, { isRead: true });
    expect((await a.get('/api/v1/admin/messages?unread=true')).body.data.items).toHaveLength(0);
    expect((await a.delete(`/api/v1/admin/messages/${list.items[0]._id}`)).status).toBe(200);
  });
  it('handles newsletter subscribe, duplicates, unsubscribe and admin-only listing', async () => {
    const a = await admin(); const pub = await client(app); const { NewsletterSubscriber } = await import('../src/models/index.js');
    expect((await pub.post('/api/v1/newsletter/subscribe', { email: 'Fan@Example.com' })).status).toBe(201);
    expect((await pub.post('/api/v1/newsletter/subscribe', { email: 'fan@example.com' })).body.message).toMatch(/already/);
    expect((await pub.post('/api/v1/newsletter/subscribe', { email: 'nope' })).status).toBe(400);
    expect((await pub.get('/api/v1/admin/newsletter')).status).toBe(401);
    const token = (await NewsletterSubscriber.findOne().select('+unsubscribeToken')).unsubscribeToken;
    expect((await pub.post('/api/v1/newsletter/unsubscribe', { token: 'short' })).status).toBe(400);
    expect((await pub.post('/api/v1/newsletter/unsubscribe', { token })).status).toBe(200);
    expect((await a.get('/api/v1/admin/newsletter?status=unsubscribed')).body.data.items).toHaveLength(1);
    expect((await pub.post('/api/v1/newsletter/subscribe', { email: 'fan@example.com' })).status).toBe(201); // resubscribe
    expect((await a.raw.get('/api/v1/admin/newsletter/export')).text).toContain('fan@example.com');
  });
  it('manages coupons (admin) and lists public offers', async () => {
    const a = await admin(); const pub = await client(app);
    const mk = (o) => a.post('/api/v1/admin/coupons', { code: 'save20', type: 'percent', value: 20, ...o });
    expect((await mk()).body.data.item.code).toBe('SAVE20');
    expect((await mk()).status).toBe(409);
    expect((await mk({ code: 'BAD', value: 150 })).status).toBe(400);
    expect((await pub.get('/api/v1/cart/offers')).body.data.items).toHaveLength(1);
  });
  it('manages addresses and wishlist for the signed-in customer only', async () => {
    const { c } = await cust(); const other = await cust(); const p = await makeProduct();
    const add = await c.post('/api/v1/account/addresses', ADDRESS);
    expect(add.body.data.addresses[0].isDefault).toBe(true);
    expect((await c.post('/api/v1/account/addresses', { ...ADDRESS, pincode: '1' })).status).toBe(400);
    const id = add.body.data.addresses[0]._id;
    expect((await other.c.delete(`/api/v1/account/addresses/${id}`)).status).toBe(404);
    expect((await c.delete(`/api/v1/account/addresses/${id}`)).body.data.addresses).toHaveLength(0);
    await c.post(`/api/v1/account/wishlist/${p._id}`);
    expect((await c.get('/api/v1/account/wishlist')).body.data.items).toHaveLength(1);
    expect((await other.c.get('/api/v1/account/wishlist')).body.data.items).toHaveLength(0);
    await c.delete(`/api/v1/account/wishlist/${p._id}`);
    expect((await c.get('/api/v1/account/wishlist')).body.data.items).toHaveLength(0);
  });
  it('serves health, sitemap and robots', async () => {
    const pub = await client(app); await makeProduct({ slug: 'sitemap-prod' });
    expect((await pub.get('/health')).body.db).toBe('connected');
    expect((await pub.raw.get('/sitemap.xml')).text).toContain('/products/sitemap-prod');
    expect((await pub.raw.get('/robots.txt')).text).toContain('Disallow: /admin');
    expect((await pub.get('/api/v1/nonexistent')).status).toBe(404);
  });
});
void cartItem; void Order;
