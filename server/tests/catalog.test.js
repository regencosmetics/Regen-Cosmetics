import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
vi.mock('../src/services/cloudinaryService.js', () => ({ uploadImage: vi.fn(async () => ({ url: 'https://res.cloudinary.com/test/x.jpg', publicId: 'x' })), deleteImage: vi.fn() }));
import { createApp } from '../src/app.js';
import { startDb, stopDb, resetDb, client } from './helpers.js';
import { makeUser, login, makeProduct } from './fixtures.js';
import { Product, Order, Category } from '../src/models/index.js';

let mem; const app = createApp();
beforeAll(async () => { mem = await startDb(); }); afterAll(() => stopDb(mem)); beforeEach(resetDb);
const adminClient = async () => { const c = await client(app); await login(c, await makeUser({ role: 'admin' })); return c; };
const body = (o = {}) => ({ name: 'New Serum', sku: 'NEW-1', variants: [{ sku: 'NEW-1-A', label: '30 ML', price: 500, salePrice: 400, stock: 5 }], ...o });

describe('public catalog', () => {
  it('lists, paginates, sorts and filters from the database', async () => {
    const c = await client(app);
    await makeProduct({ name: 'Alpha Gel', variants: [{ sku: 'A-1', label: 'x', price: 300, stock: 5 }], isBestseller: true });
    await makeProduct({ name: 'Beta Gel', variants: [{ sku: 'B-1', label: 'x', price: 900, salePrice: 450, stock: 0 }] });
    await makeProduct({ name: 'Gamma Cream', isActive: false });
    const all = await c.get('/api/v1/products');
    expect(all.body.data.pagination.total).toBe(2); // inactive hidden
    expect((await c.get('/api/v1/products?sort=price_desc')).body.data.items[0].name).toBe('Alpha Gel'.replace('Alpha', 'Beta'));
    expect((await c.get('/api/v1/products?sort=price_asc')).body.data.items[0].name).toBe('Alpha Gel');
    expect((await c.get('/api/v1/products?inStock=true')).body.data.items.map((p) => p.name)).toEqual(['Alpha Gel']);
    expect((await c.get('/api/v1/products?bestseller=true')).body.data.items).toHaveLength(1);
    expect((await c.get('/api/v1/products?minPrice=400&maxPrice=500')).body.data.items[0].name).toBe('Beta Gel');
    const p1 = await c.get('/api/v1/products?limit=1&page=2');
    expect(p1.body.data.items).toHaveLength(1); expect(p1.body.data.pagination.pages).toBe(2);
    expect((await c.get('/api/v1/products?limit=1000')).status).toBe(400);
  });
  it('searches, suggests and handles no results', async () => {
    const c = await client(app);
    await makeProduct({ name: 'Hyaluronic Matte Gel' });
    expect((await c.get('/api/v1/products?q=hyalur')).body.data.items).toHaveLength(1);
    expect((await c.get('/api/v1/products?q=zzzz')).body.data.items).toHaveLength(0);
    expect((await c.get('/api/v1/products?q=.*')).body.data.items).toHaveLength(0); // regex is escaped
    expect((await c.get('/api/v1/products/suggest?q=mat')).body.data.items[0].name).toMatch(/Matte/);
  });
  it('returns product details by slug and 404s for unknown/inactive', async () => {
    const c = await client(app); const p = await makeProduct(); const hidden = await makeProduct({ isActive: false });
    expect((await c.get(`/api/v1/products/${p.slug}`)).body.data.product.sku).toBe(p.sku);
    expect((await c.get('/api/v1/products/nope')).status).toBe(404);
    expect((await c.get(`/api/v1/products/${hidden.slug}`)).status).toBe(404);
  });
});

describe('admin product management', () => {
  it('creates, edits, searches and deletes products', async () => {
    const a = await adminClient();
    const cr = await a.post('/api/v1/admin/products', body());
    expect(cr.status).toBe(201); expect(cr.body.data.product.slug).toBe('new-serum'); expect(cr.body.data.product.priceMin).toBe(400);
    const id = cr.body.data.product._id;
    const up = await a.put(`/api/v1/admin/products/${id}`, body({ name: 'Renamed', variants: [{ sku: 'NEW-1-A', label: '30 ML', price: 500, salePrice: 450, stock: 999 }] }));
    expect(up.status).toBe(200);
    expect(up.body.data.product.variants[0].stock).toBe(5); // stock is not editable via product edit
    expect((await a.get('/api/v1/admin/products?q=Renamed')).body.data.items).toHaveLength(1);
    expect((await a.delete(`/api/v1/admin/products/${id}`)).body.data.archived).toBe(false);
    expect(await Product.countDocuments()).toBe(0);
  });
  it('validates pricing, uniqueness and required fields', async () => {
    const a = await adminClient();
    const bad = await a.post('/api/v1/admin/products', body({ variants: [{ sku: 'X-1', label: 'a', price: 100, salePrice: 150, stock: 1 }] }));
    expect(bad.status).toBe(400);
    await a.post('/api/v1/admin/products', body());
    expect((await a.post('/api/v1/admin/products', body({ name: 'Other' }))).status).toBe(409); // duplicate SKU
    expect((await a.post('/api/v1/admin/products', { name: 'x' })).status).toBe(400);
  });
  it('archives instead of deleting products referenced by orders', async () => {
    const a = await adminClient(); const p = await makeProduct(); const u = await makeUser();
    await Order.create({ orderNumber: 'REG-T-1', user: u._id, items: [{ product: p._id, sku: 'S', name: 'n', unitPrice: 1, mrp: 1, quantity: 1, lineTotal: 1, netTotal: 1 }], paymentMethod: 'cod', pricing: { total: 1 } });
    const r = await a.delete(`/api/v1/admin/products/${p._id}`);
    expect(r.body.data.archived).toBe(true);
    expect((await Product.findById(p._id)).isActive).toBe(false);
  });
  it('validates and accepts image uploads (Cloudinary mocked)', async () => {
    const a = await adminClient();
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const ok = await a.raw.post('/api/v1/admin/uploads').set('X-CSRF-Token', a.token).attach('images', png, { filename: 'a.png', contentType: 'image/png' });
    expect(ok.status).toBe(201);
    const wrongType = await a.raw.post('/api/v1/admin/uploads').set('X-CSRF-Token', a.token).attach('images', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(wrongType.status).toBe(400);
    const spoof = await a.raw.post('/api/v1/admin/uploads').set('X-CSRF-Token', a.token).attach('images', Buffer.from('<script>'), { filename: 'a.png', contentType: 'image/png' });
    expect(spoof.status).toBe(400); expect(spoof.body.code).toBe('INVALID_FILE_CONTENT');
    const big = await a.raw.post('/api/v1/admin/uploads').set('X-CSRF-Token', a.token).attach('images', Buffer.concat([png, Buffer.alloc(6 * 1024 * 1024)]), { filename: 'b.png', contentType: 'image/png' });
    expect(big.status).toBe(400);
  });
  it('manages categories safely: deleting reassigns products', async () => {
    const a = await adminClient(); const c = await client(app);
    const cat = (await a.post('/api/v1/admin/categories', { name: 'Serums' })).body.data.item;
    const other = (await a.post('/api/v1/admin/categories', { name: 'Creams' })).body.data.item;
    const p = await makeProduct({ category: cat });
    expect((await c.get('/api/v1/products?category=serums')).body.data.items).toHaveLength(1);
    expect((await a.post('/api/v1/admin/categories', { name: 'Serums' })).status).toBe(409);
    await a.delete(`/api/v1/admin/categories/${cat._id}?reassignTo=${other._id}`);
    expect(String((await Product.findById(p._id)).category)).toBe(other._id);
    expect((await c.get('/api/v1/categories')).body.data.items.map((i) => i.slug)).toContain('creams');
    void Category;
  });
  it('adjusts stock with an audit trail and rejects negative stock', async () => {
    const a = await adminClient(); const p = await makeProduct();
    const sku = p.variants[0].sku;
    expect((await a.post('/api/v1/admin/inventory/adjust', { productId: String(p._id), sku, delta: 5, reason: 'recount' })).body.data.stockAfter).toBe(15);
    const neg = await a.post('/api/v1/admin/inventory/adjust', { productId: String(p._id), sku, delta: -100, reason: 'oops' });
    expect(neg.status).toBe(409);
    const tx = await a.get('/api/v1/admin/inventory/transactions');
    expect(tx.body.data.items).toHaveLength(1);
    expect((await a.get('/api/v1/admin/inventory/low-stock')).status).toBe(200);
  });
});
