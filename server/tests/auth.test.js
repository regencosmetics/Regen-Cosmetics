import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { startDb, stopDb, resetDb, client } from './helpers.js';
import { makeUser, login, PASS } from './fixtures.js';
import { Notification, User } from '../src/models/index.js';
import request from 'supertest';

let mem; const app = createApp();
beforeAll(async () => { mem = await startDb(); }); afterAll(() => stopDb(mem)); beforeEach(resetDb);

const reg = { name: 'Asha Rao', phone: '9876543210', email: 'asha@example.com', password: PASS };

describe('authentication', () => {
  it('registers a customer, hashes the password and never returns secrets', async () => {
    const c = await client(app);
    const r = await c.post('/api/v1/auth/register', reg);
    expect(r.status).toBe(201);
    expect(r.body.data.user.role).toBe('customer');
    expect(JSON.stringify(r.body)).not.toMatch(/passwordHash|resetToken/);
    const u = await User.findOne({ email: reg.email }).select('+passwordHash');
    expect(u.passwordHash).not.toBe(PASS);
    expect(r.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);
  });
  it('registers and logs in with just name, email and password (no phone, no OTP)', async () => {
    const c = await client(app);
    const r = await c.post('/api/v1/auth/register', { name: 'Ravi K', email: 'ravi@example.com', password: PASS });
    expect(r.status).toBe(201);
    const l = await (await client(app)).post('/api/v1/auth/login', { email: 'ravi@example.com', password: PASS });
    expect(l.status).toBe(200);
  });
  it('ignores a client-supplied role (no privilege escalation)', async () => {
    const c = await client(app);
    const r = await c.post('/api/v1/auth/register', { ...reg, role: 'admin' });
    expect(r.body.data.user.role).toBe('customer');
  });
  it('rejects duplicates and weak input with clear errors', async () => {
    const c = await client(app);
    await c.post('/api/v1/auth/register', reg);
    expect((await c.post('/api/v1/auth/register', reg)).status).toBe(409);
    const weak = await c.post('/api/v1/auth/register', { ...reg, email: 'b@example.com', password: 'short' });
    expect(weak.status).toBe(400); expect(weak.body.code).toBe('VALIDATION_ERROR');
    expect((await c.post('/api/v1/auth/register', { ...reg, email: 'c@example.com', phone: '123' })).status).toBe(400);
    expect((await c.post('/api/v1/auth/register', { ...reg, email: 'not-an-email' })).status).toBe(400);
  });
  it('logs in, restores the session, and logs out', async () => {
    const u = await makeUser(); const c = await client(app);
    expect((await c.post('/api/v1/auth/login', { email: u.email, password: 'WrongPass1' })).status).toBe(401);
    expect((await c.post('/api/v1/auth/login', { email: 'nobody@example.com', password: PASS })).status).toBe(401);
    expect((await login(c, u)).status).toBe(200);
    expect((await c.get('/api/v1/auth/me')).body.data.user.email).toBe(u.email);
    await c.post('/api/v1/auth/logout');
    expect((await c.get('/api/v1/auth/me')).status).toBe(401);
  });
  it('redirects admins to the dashboard on login', async () => {
    const a = await makeUser({ role: 'admin' }); const c = await client(app);
    expect((await login(c, a)).body.data.redirectTo).toBe('/admin');
  });
  it('requires a CSRF token for state-changing requests', async () => {
    const r = await request(app).post('/api/v1/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(r.status).toBe(403); expect(r.body.code).toBe('CSRF_INVALID');
  });
  it('performs a single-use password reset', async () => {
    const u = await makeUser(); const c = await client(app);
    const r = await c.post('/api/v1/auth/forgot-password', { email: u.email });
    expect(r.status).toBe(200);
    expect((await c.post('/api/v1/auth/forgot-password', { email: 'ghost@example.com' })).body.message).toBe(r.body.message); // no enumeration
    const mail = await Notification.findOne({ type: 'password_reset' });
    const token = mail.html.match(/token=([a-f0-9]+)/)[1];
    const ok = await c.post('/api/v1/auth/reset-password', { token, password: 'NewPassw0rd' });
    expect(ok.status).toBe(200);
    expect((await c.post('/api/v1/auth/reset-password', { token, password: 'Another1Pass' })).status).toBe(400);
    expect((await c.post('/api/v1/auth/login', { email: u.email, password: 'NewPassw0rd' })).status).toBe(200);
  });
  it('rejects expired reset tokens', async () => {
    const u = await makeUser(); const c = await client(app);
    await c.post('/api/v1/auth/forgot-password', { email: u.email });
    const token = (await Notification.findOne({ type: 'password_reset' })).html.match(/token=([a-f0-9]+)/)[1];
    await User.updateOne({ _id: u._id }, { resetTokenExpires: new Date(Date.now() - 1000) });
    expect((await c.post('/api/v1/auth/reset-password', { token, password: 'NewPassw0rd' })).status).toBe(400);
  });
  it('enforces role-based access on admin APIs', async () => {
    const cust = await makeUser(); const admin = await makeUser({ role: 'admin' });
    const anon = await client(app);
    expect((await anon.get('/api/v1/admin/dashboard')).status).toBe(401);
    const c = await client(app); await login(c, cust);
    expect((await c.get('/api/v1/admin/dashboard')).status).toBe(403);
    expect((await c.post('/api/v1/admin/products', {})).status).toBe(403);
    const a = await client(app); await login(a, admin);
    expect((await a.get('/api/v1/admin/dashboard')).status).toBe(200);
  });
  it('rejects NoSQL operator injection', async () => {
    const c = await client(app);
    const r = await c.post('/api/v1/auth/login', { email: { $gt: '' }, password: { $gt: '' } });
    expect(r.status).toBe(400);
  });
  it('lets a customer change password and update the profile', async () => {
    const u = await makeUser(); const c = await client(app); await login(c, u);
    expect((await c.patch('/api/v1/auth/profile', { name: 'New Name' })).body.data.user.name).toBe('New Name');
    expect((await c.post('/api/v1/auth/change-password', { currentPassword: 'bad', newPassword: 'NewPassw0rd' })).status).toBe(400);
    expect((await c.post('/api/v1/auth/change-password', { currentPassword: PASS, newPassword: 'NewPassw0rd' })).status).toBe(200);
  });
});
