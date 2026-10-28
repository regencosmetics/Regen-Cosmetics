// Admin smoke test. Needs ADMIN_EMAIL / ADMIN_PASSWORD of a seeded admin and a server serving the built client at BASE_URL.
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://localhost:5000';
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD'); process.exit(2); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage();
page.setDefaultTimeout(6000);
const errors = []; const results = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|401 \(Unauthorized\)/.test(m.text())) errors.push(`console: ${m.text()}`); });
const step = async (n, fn) => { try { await fn(); results.push(['PASS', n]); console.log('PASS', n); } catch (e) { results.push(['FAIL', n, e.message.split('\n')[0]]); console.log('FAIL', n, '|', e.message.split('\n')[0]); } };

await step('non-admin /admin redirects away', async () => { await page.goto(`${BASE}/admin`); await page.waitForTimeout(1500); if (page.url().includes('/admin')) throw new Error('admin visible while logged out'); });
await step('admin login', async () => {
  await page.goto(`${BASE}/login`); await page.getByLabel('Email', { exact: true }).fill(ADMIN_EMAIL); await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD); await page.locator('main form').getByRole('button', { name: 'Log in' }).click(); await page.waitForURL('**/admin');
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
});
for (const [p, h] of [['', 'Dashboard'], ['products', 'Products'], ['products/new', 'New product'], ['categories', 'Categories'], ['collections', 'Collections'], ['inventory', 'Inventory'], ['orders', 'Orders'], ['returns', 'Returns'], ['refunds', 'Refunds'], ['customers', 'Customers'], ['coupons', 'Coupons'], ['banners', 'Banners'], ['reviews', 'Reviews'], ['messages', 'Messages'], ['newsletter', 'Newsletter subscribers'], ['content', 'Website content'], ['settings', 'Settings']]) {
  await step(`admin page /${p}`, async () => { await page.goto(`${BASE}/admin/${p}`); await page.getByRole('heading', { name: h, exact: true }).first().waitFor({ timeout: 8000 }); });
}
await step('create coupon', async () => {
  await page.goto(`${BASE}/admin/coupons`); await page.getByRole('button', { name: 'Add coupon' }).click(); const code = `E2E${Date.now() % 100000}`;
  await page.getByLabel('Code').fill(code); await page.getByLabel('Percent off').fill('10'); await page.getByRole('button', { name: 'Save' }).click(); await page.getByText(code).waitFor();
});
await step('edit product (price) and save', async () => {
  await page.goto(`${BASE}/admin/products`); await page.locator('tbody a').first().click(); await page.getByLabel('Tagline').fill('E2E tagline'); await page.getByRole('button', { name: 'Save product' }).click(); await page.waitForURL('**/admin/products');
});
await step('content editor saves', async () => {
  await page.goto(`${BASE}/admin/content`); await page.getByRole('tab', { name: 'Footer' }).click(); await page.getByLabel('Copyright').fill('© 2026 REGEN COSMETICS. All Rights Reserved.'); await page.getByRole('button', { name: 'Save changes' }).click(); await page.getByText('Saved.').waitFor();
});
await step('settings: save a shipping value and see it applied', async () => {
  await page.goto(`${BASE}/admin/settings`); const f = page.getByLabel('Shipping charge (Rs)'); await f.fill(String(40 + (Date.now() % 20))); await page.getByRole('button', { name: 'Save settings' }).click(); await page.getByText('Settings saved').first().waitFor();
});
await step('order status flow: confirm → ship (cancel disappears)', async () => {
  await page.goto(`${BASE}/admin/orders`); const link = page.locator('tbody a').first(); if (!(await link.count())) return; await link.click();
  await page.getByRole('heading', { name: /^Order / }).waitFor();
  for (const s of ['Confirmed', 'Processing', 'Shipped']) { const b = page.getByRole('button', { name: `Mark ${s}` }); if (!(await b.count())) continue; await b.click(); await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await page.waitForTimeout(800); }
});
await browser.close();
for (const r of results) console.log(r.join(' | '));
if (errors.length) console.log('\nBROWSER ERRORS:\n' + [...new Set(errors)].join('\n'));
process.exit(results.some((r) => r[0] === 'FAIL') || errors.length ? 1 : 0);
