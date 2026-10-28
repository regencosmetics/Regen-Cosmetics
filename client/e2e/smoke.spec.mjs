// Smoke test against a running server that also serves the built client (SERVE_CLIENT=true) on BASE_URL.
// Run: BASE_URL=http://localhost:5000 node e2e/smoke.spec.mjs   (needs Chromium; set CHROMIUM_PATH if not Playwright's default)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const SHOTS = process.env.SHOTS_DIR;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const errors = [];
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); } };

async function run(viewport, label) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|401 \(Unauthorized\)/.test(m.text())) errors.push(`${label} console: ${m.text()}`); });
  const shot = (n) => SHOTS && page.screenshot({ path: `${SHOTS}/${label}-${n}.png`, fullPage: true });

  await step(`${label}: home renders products`, async () => { await page.goto(BASE); await page.waitForSelector('article', { timeout: 10000 }); await shot('home'); });
  await step(`${label}: shop lists products`, async () => { await page.goto(`${BASE}/shop`); await page.waitForSelector('article'); await shot('shop'); });
  await step(`${label}: product detail + add to cart`, async () => {
    await page.goto(`${BASE}/shop`); await page.locator('article h3 a').first().click(); await page.locator('h1:visible').first().waitFor();
    await page.getByRole('button', { name: 'Add to Cart', exact: true }).first().click();
    await page.getByRole('button', { name: 'Checkout', exact: true }).waitFor(); await shot('product');
  });
  await step(`${label}: cart drawer shows total, coupon box and offers`, async () => { await page.getByText('Estimated Total').waitFor(); await page.getByText(/View all Offers/i).waitFor(); await shot('cart'); });
  await step(`${label}: static pages`, async () => { for (const p of ['/about', '/contact', '/privacy-policy', '/shipping-returns', '/terms', '/faq', '/track-order']) { const r = await page.goto(BASE + p); assert.equal(r.status(), 200); await page.locator('h1:visible').first().waitFor(); } await shot('terms'); });
  await step(`${label}: unknown route 404 page`, async () => { await page.goto(`${BASE}/nope`); await page.getByText("couldn't find").waitFor(); });
  await step(`${label}: protected route opens login`, async () => { await page.goto(`${BASE}/account/orders`); await page.getByRole('dialog').waitFor(); });
  await ctx.close();
}

await run({ width: 1440, height: 900 }, 'desktop');
await run({ width: 393, height: 852 }, 'mobile');

// Full customer journey on desktop: register -> checkout COD -> order detail -> cancel
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`journey pageerror: ${e.message}`));
  const email = `e2e${Date.now()}@example.com`;
  await step('journey: register', async () => {
    await page.goto(`${BASE}/register`); await page.getByLabel('Full name').fill('E2E Tester'); await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Str0ngPass!word'); await page.locator('main form').getByRole('button', { name: /Register|Create account|Sign ?up/i }).click(); await page.waitForURL('**/account');
  });
  await step('journey: add to cart, COD checkout', async () => {
    await page.goto(`${BASE}/shop`); await page.getByRole('button', { name: /^Add .* to cart$/ }).first().click(); await page.getByRole('button', { name: 'Checkout', exact: true }).waitFor();
    await page.locator('label:has(a[href="/terms"]) input[type=checkbox]').check(); await page.getByRole('button', { name: 'Checkout', exact: true }).click(); await page.waitForURL('**/checkout'); await page.getByText('Shipping address').waitFor();
    await page.getByLabel('Full name').fill('E2E Tester'); await page.getByLabel('Mobile number').fill('9876543210'); await page.getByLabel('Address line 1').fill('12 MG Road');
    await page.getByLabel('City').fill('Guntur'); await page.getByLabel('State').selectOption('Andhra Pradesh'); await page.getByLabel('PIN code').fill('522001');
    await page.getByLabel(/Cash on Delivery/).check(); await page.getByRole('button', { name: 'Place Order' }).click(); await page.waitForURL('**/order-success/**'); await page.getByText('Thank you').waitFor();
  });
  await step('journey: order detail shows Cancel, cancel works', async () => {
    await page.getByRole('link', { name: 'View order' }).click(); await page.getByRole('button', { name: 'Cancel order' }).click();
    await page.getByRole('button', { name: 'Yes, cancel order' }).click(); await page.getByText('Order cancelled').first().waitFor();
  });
  await ctx.close();
}
await browser.close();
for (const r of results) console.log(r.join(' | '));
if (errors.length) console.log('\nBROWSER ERRORS:\n' + [...new Set(errors)].join('\n'));
process.exit(results.some((r) => r[0] === 'FAIL') || errors.length ? 1 : 0);
