import 'dotenv/config';
import { z } from 'zod';

const bool = (d) => z.preprocess((v) => (v === undefined || v === '' ? d : String(v).toLowerCase() === 'true'), z.boolean());
const num = (d) => z.preprocess((v) => (v === undefined || v === '' ? d : Number(v)), z.number());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: num(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  SERVER_URL: z.string().url().default('http://localhost:5000'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional(),
  DATA_ENCRYPTION_KEY: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_NAME: z.string().default('Store Administrator'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('regen-cosmetics'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('REGEN Cosmetics <onboarding@resend.dev>'),
  EMAIL_REPLY_TO: z.string().optional(),
  SUPPORT_EMAIL_TO: z.string().optional(),
  PASSWORD_RESET_URL: z.string().optional(),
  RETURN_WINDOW_DAYS: num(7),
  DEFAULT_CURRENCY: z.string().default('INR'),
  // JSON string: {"freeShippingThreshold":999,"flatRate":49,"codFee":0}
  SHIPPING_CONFIGURATION: z.string().default('{"freeShippingThreshold":999,"flatRate":49,"codFee":0}'),
  COD_ENABLED: bool(true),
  COD_MIN_ORDER: num(0),
  COD_MAX_ORDER: num(0),
  PAYMENT_RESERVATION_MINUTES: num(20),
  GST_PERCENT_INCLUDED: num(0),
  REVIEW_AUTO_APPROVE: bool(false),
  REVIEW_VERIFIED_ONLY: bool(false),
  TRUST_PROXY: num(0),
  SERVE_CLIENT: bool(false),
  CLIENT_DIST: z.string().optional(),
  RATE_LIMIT_DISABLED: bool(false),
  CORS_ORIGINS: z.string().optional(),
});

export function loadEnv(source = process.env) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${lines}\nSee server/.env.example`);
  }
  const env = parsed.data;
  try {
    env.shipping = { freeShippingThreshold: 999, flatRate: 49, codFee: 0, ...JSON.parse(env.SHIPPING_CONFIGURATION) };
  } catch {
    throw new Error('SHIPPING_CONFIGURATION must be valid JSON');
  }
  env.isProd = env.NODE_ENV === 'production';
  env.isTest = env.NODE_ENV === 'test';
  env.corsOrigins = (env.CORS_ORIGINS || env.CLIENT_URL).split(',').map((s) => s.trim()).filter(Boolean);
  if (env.isProd) {
    if (env.COOKIE_SAMESITE === 'none' && !env.SERVER_URL.startsWith('https')) {
      throw new Error('COOKIE_SAMESITE=none requires an https SERVER_URL');
    }
    if (/change-me|example/i.test(env.JWT_SECRET)) throw new Error('JWT_SECRET must be changed in production');
  }
  env.razorpayConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  env.cloudinaryConfigured = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  env.emailConfigured = Boolean(env.RESEND_API_KEY);
  return env;
}

export const env = loadEnv();
export default env;
