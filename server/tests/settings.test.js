import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import env from '../src/config/env.js';
import { CMSContent } from '../src/models/index.js';
import { startDb, stopDb, resetDb, client } from './helpers.js';
import { makeUser, login } from './fixtures.js';
import { loadSettings } from '../src/services/settingsService.js';

let mem; const app = createApp();
beforeAll(async () => { mem = await startDb(); }); afterAll(() => stopDb(mem)); beforeEach(async () => { await resetDb(); await loadSettings(); });
const admin = async () => { const c = await client(app); await login(c, await makeUser({ role: 'admin' })); return c; };

describe('admin settings', () => {
  it('is admin-only', async () => {
    const c = await client(app); await login(c, await makeUser());
    expect((await c.get('/api/v1/admin/settings')).status).toBe(403);
    expect((await (await client(app)).get('/api/v1/admin/settings')).status).toBe(401);
  });
  it('saves payment keys encrypted, applies them live, and never returns the secret', async () => {
    const c = await admin();
    const r = await c.put('/api/v1/admin/settings', { RAZORPAY_KEY_ID: 'rzp_test_abc', RAZORPAY_KEY_SECRET: 'supersecret1234' });
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toContain('supersecret1234');
    expect(r.body.data.RAZORPAY_KEY_SECRET.masked).toBe('••••1234');
    expect(env.razorpayConfigured).toBe(true);
    const raw = await CMSContent.findOne({ key: 'settings' }).lean();
    expect(JSON.stringify(raw)).not.toContain('supersecret1234');
    // blank secret keeps the stored one; null resets to .env
    await c.put('/api/v1/admin/settings', { RAZORPAY_KEY_SECRET: '' });
    expect(env.RAZORPAY_KEY_SECRET).toBe('supersecret1234');
    await c.put('/api/v1/admin/settings', { RAZORPAY_KEY_ID: null, RAZORPAY_KEY_SECRET: null });
    expect(env.RAZORPAY_KEY_ID).toBe('rzp_test_dummykey');
  });
  it('controls shipping, COD and rejects bad values', async () => {
    const c = await admin();
    await c.put('/api/v1/admin/settings', { SHIPPING_FREE_ABOVE: 1500, COD_ENABLED: false });
    expect(env.shipping.freeShippingThreshold).toBe(1500); expect(env.COD_ENABLED).toBe(false);
    expect((await c.put('/api/v1/admin/settings', { SHIPPING_FLAT_RATE: -5 })).status).toBe(400);
    expect((await c.put('/api/v1/admin/settings', { NOPE: 1 })).status).toBe(400);
    await c.put('/api/v1/admin/settings', { SHIPPING_FREE_ABOVE: null, COD_ENABLED: null });
    expect(env.COD_ENABLED).toBe(true);
  });
});
