// Verifies the business rule end-to-end: Cancel is offered up to Processing, hidden once Shipped, and the API refuses it too.
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://localhost:5000'; const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const out = []; const ok = (n, c, extra = '') => { out.push([c ? 'PASS' : 'FAIL', n, extra]); console.log(c ? 'PASS' : 'FAIL', n, extra); };
const mk = async () => { const c = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = await c.newPage(); p.setDefaultTimeout(8000); return p; };
const login = async (p, e, pw) => { await p.goto(`${BASE}/login`); await p.getByLabel('Email', { exact: true }).fill(e); await p.getByLabel('Password', { exact: true }).fill(pw); await p.locator('main form').getByRole('button', { name: 'Log in' }).click(); await p.waitForURL(/\/(admin|account)/); };

const cust = await mk(); const email = `cancel${Date.now()}@example.com`;
await cust.goto(`${BASE}/register`); await cust.getByLabel('Full name').fill('Cancel Rule'); await cust.getByLabel('Email', { exact: true }).fill(email); await cust.getByLabel('Password', { exact: true }).fill('Str0ngPass!word'); await cust.locator('main form').getByRole('button', { name: 'Create account' }).click(); await cust.waitForURL('**/account');
await cust.goto(`${BASE}/shop`); await cust.getByRole('button', { name: /^Add .* to cart$/ }).first().click(); await cust.locator('label:has(a[href="/terms"]) input[type=checkbox]').check(); await cust.getByRole('button', { name: 'Checkout', exact: true }).click(); await cust.getByText('Shipping address').waitFor();
await cust.getByLabel('Full name').fill('Cancel Rule'); await cust.getByLabel('Mobile number').fill('9876543210'); await cust.getByLabel('Address line 1').fill('1 Test Street'); await cust.getByLabel('City').fill('Guntur'); await cust.getByLabel('State').selectOption('Andhra Pradesh'); await cust.getByLabel('PIN code').fill('522001');
await cust.getByLabel(/Cash on Delivery/).check(); await cust.getByRole('button', { name: 'Place Order' }).click(); await cust.waitForURL('**/order-success/**'); await cust.getByRole('link', { name: 'View order' }).click();
await cust.getByRole('heading', { name: /^Order / }).waitFor(); const orderUrl = cust.url(); const orderId = orderUrl.split('/').pop();
ok('Cancel offered on a new order', await cust.getByRole('button', { name: 'Cancel order' }).count() === 1);

const adm = await mk(); await login(adm, ADMIN_EMAIL, ADMIN_PASSWORD); await adm.goto(`${BASE}/admin/orders`);
await adm.getByRole('link', { name: (await cust.getByRole('heading', { name: /^Order / }).innerText()).replace('Order ', '') }).click();
for (const s of ['Confirmed', 'Processing', 'Shipped']) { // COD orders may already be Confirmed
  const b = adm.getByRole('button', { name: `Mark ${s}` }); await adm.waitForTimeout(400); if (!(await b.count())) continue;
  await b.click(); await adm.getByRole('button', { name: 'Confirm', exact: true }).click(); await adm.waitForTimeout(900);
}
await cust.reload(); await cust.getByRole('heading', { name: /^Order / }).waitFor();
ok('Order is Shipped', await cust.getByText('Shipped', { exact: true }).first().isVisible());
ok('Cancel button is NOT shown once Shipped', await cust.getByRole('button', { name: 'Cancel order' }).count() === 0);
const res = await cust.evaluate(async (id) => {
  const t = (await (await fetch('/api/v1/auth/csrf', { credentials: 'include' })).json()).data.csrfToken;
  const r = await fetch(`/api/v1/orders/${id}/cancel`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t }, body: JSON.stringify({ reason: 'try anyway' }) });
  return { status: r.status, body: await r.json() };
}, orderId);
ok('Server independently rejects cancel after Shipped', res.status === 409 && res.body.code === 'CANCEL_NOT_ALLOWED', `status=${res.status} code=${res.body.code}`);
await browser.close(); process.exit(out.some((r) => r[0] === 'FAIL') ? 1 : 0);
