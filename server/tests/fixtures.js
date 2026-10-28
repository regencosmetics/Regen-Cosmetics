import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { User, Product, Category, Coupon, Order } from '../src/models/index.js';

export const ADDRESS = { fullName: 'Test Buyer', phone: '9876543210', line1: '12 MG Road', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522001' };
export const PASS = 'Passw0rdOK';

export async function makeUser(over = {}) {
  const email = over.email || `u${crypto.randomBytes(4).toString('hex')}@example.com`;
  return User.create({ name: 'Test User', phone: '9876543210', passwordHash: await bcrypt.hash(PASS, 4), ...over, email });
}
export async function login(c, user) { const r = await c.post('/api/v1/auth/login', { email: user.email, password: PASS }); if (r.status !== 200) throw new Error('login failed ' + JSON.stringify(r.body)); return r; }

export async function makeProduct(over = {}) {
  const n = crypto.randomBytes(3).toString('hex');
  const cat = over.category ?? (await Category.findOne({ slug: 'sunscreen' })) ?? (await Category.create({ name: 'Sunscreen', slug: 'sunscreen' }));
  return Product.create({
    name: `Test Sunscreen ${n}`, slug: `test-sunscreen-${n}`, sku: `T-${n}`,
    variants: [{ sku: `T-${n}-50`, label: '50 ML', price: 799, salePrice: 599, stock: 10 }], ...over, category: cat._id,
  });
}
export const sku = (p, i = 0) => p.variants[i].sku;
export const stockOf = async (p, i = 0) => (await Product.findById(p._id)).variants[i].stock;

export async function makeCoupon(over = {}) { return Coupon.create({ code: 'SAVE10', type: 'percent', value: 10, ...over }); }

export const cartItem = (p, quantity = 1, i = 0) => ({ productId: String(p._id), sku: p.variants[i].sku, quantity });
export const orderBody = (p, extra = {}) => ({ paymentMethod: 'cod', address: ADDRESS, items: [cartItem(p)], ...extra });
let n = 0;
export const idem = () => ({ 'Idempotency-Key': `test-key-${Date.now()}-${n++}-${Math.random().toString(16).slice(2)}` });

export function sign(orderId, paymentId, secret = process.env.RAZORPAY_KEY_SECRET) { return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex'); }
export const webhookSig = (raw) => crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');

export async function deliver(orderId) { return Order.updateOne({ _id: orderId }, { status: 'Delivered', deliveredAt: new Date(), paymentStatus: 'COD Collected' }); }
