import env from '../config/env.js';
import { CMSContent } from '../models/index.js';
import { encrypt, decrypt } from '../utils/helpers.js';
import { AppError } from '../utils/AppError.js';
import { resetRazorpay } from './razorpayClient.js';
import { resetEmail } from './emailService.js';
import { resetCloudinary } from './cloudinaryService.js';

/**
 * Admin-editable configuration. Values saved here override the matching environment variable, so the store owner
 * can run the shop from the admin panel. Secrets are AES-256-GCM encrypted at rest and never sent back to the browser.
 * The .env file is only needed for the bootstrap values (database, JWT/cookie secrets).
 */
export const FIELDS = [
  { key: 'RAZORPAY_KEY_ID', group: 'payments', label: 'Razorpay Key ID', type: 'string' },
  { key: 'RAZORPAY_KEY_SECRET', group: 'payments', label: 'Razorpay Key Secret', type: 'string', secret: true },
  { key: 'RAZORPAY_WEBHOOK_SECRET', group: 'payments', label: 'Razorpay Webhook Secret', type: 'string', secret: true },
  { key: 'COD_ENABLED', group: 'payments', label: 'Cash on Delivery', type: 'boolean' },
  { key: 'COD_MIN_ORDER', group: 'payments', label: 'COD minimum order (Rs, 0 = none)', type: 'number' },
  { key: 'COD_MAX_ORDER', group: 'payments', label: 'COD maximum order (Rs, 0 = none)', type: 'number' },
  { key: 'RESEND_API_KEY', group: 'email', label: 'Resend API key', type: 'string', secret: true },
  { key: 'EMAIL_FROM', group: 'email', label: 'From address', type: 'string' },
  { key: 'EMAIL_REPLY_TO', group: 'email', label: 'Reply-to address', type: 'string' },
  { key: 'SUPPORT_EMAIL_TO', group: 'email', label: 'Contact-form inbox', type: 'string' },
  { key: 'CLOUDINARY_CLOUD_NAME', group: 'images', label: 'Cloudinary cloud name', type: 'string' },
  { key: 'CLOUDINARY_API_KEY', group: 'images', label: 'Cloudinary API key', type: 'string' },
  { key: 'CLOUDINARY_API_SECRET', group: 'images', label: 'Cloudinary API secret', type: 'string', secret: true },
  { key: 'SHIPPING_FREE_ABOVE', group: 'store', label: 'Free shipping above (Rs)', type: 'number' },
  { key: 'SHIPPING_FLAT_RATE', group: 'store', label: 'Shipping charge (Rs)', type: 'number' },
  { key: 'SHIPPING_COD_FEE', group: 'store', label: 'COD fee (Rs)', type: 'number' },
  { key: 'RETURN_WINDOW_DAYS', group: 'store', label: 'Return window (days)', type: 'number' },
  { key: 'REVIEW_AUTO_APPROVE', group: 'store', label: 'Publish reviews without approval', type: 'boolean' },
  { key: 'REVIEW_VERIFIED_ONLY', group: 'store', label: 'Only buyers can review', type: 'boolean' },
];
const BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f]));
const DOC = 'settings';

// the shipping values live in env.shipping rather than in a flat variable
const read = (k) => ({ SHIPPING_FREE_ABOVE: env.shipping.freeShippingThreshold, SHIPPING_FLAT_RATE: env.shipping.flatRate, SHIPPING_COD_FEE: env.shipping.codFee }[k] ?? env[k]);
const write = (k, v) => {
  if (k === 'SHIPPING_FREE_ABOVE') env.shipping.freeShippingThreshold = v;
  else if (k === 'SHIPPING_FLAT_RATE') env.shipping.flatRate = v;
  else if (k === 'SHIPPING_COD_FEE') env.shipping.codFee = v;
  else env[k] = v;
};
const baseline = {}; // what the environment provided, so clearing a setting falls back to it
const captureBaseline = () => { if (!Object.keys(baseline).length) for (const f of FIELDS) baseline[f.key] = read(f.key); };

function refresh() {
  env.razorpayConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  env.cloudinaryConfigured = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  env.emailConfigured = Boolean(env.RESEND_API_KEY);
  resetRazorpay(); resetEmail(); resetCloudinary();
}

const stored = async () => (await CMSContent.findOne({ key: DOC }).lean())?.data || {};

/** Applies saved settings onto the live config. Call after the database connects, and after every save. */
export async function loadSettings() {
  captureBaseline();
  const data = await stored();
  for (const f of FIELDS) {
    let v = baseline[f.key];
    if (data[f.key] !== undefined && data[f.key] !== null) {
      try { v = f.secret ? decrypt(data[f.key]) : data[f.key]; } catch { v = baseline[f.key]; }
    }
    write(f.key, v);
  }
  refresh();
}

const mask = (s) => (s ? `••••${String(s).slice(-4)}` : '');

/** Settings for the admin form. Secret values are masked; the source tells the admin whether a value came from the panel or .env. */
export async function getSettings() {
  captureBaseline();
  const data = await stored();
  const out = {};
  for (const f of FIELDS) {
    const v = read(f.key); const fromPanel = data[f.key] !== undefined && data[f.key] !== null;
    out[f.key] = { ...f, value: f.secret ? '' : (v ?? (f.type === 'boolean' ? false : f.type === 'number' ? 0 : '')), isSet: Boolean(v), masked: f.secret ? mask(v) : undefined, source: fromPanel ? 'panel' : (baseline[f.key] ? 'env' : 'unset') };
  }
  return out;
}

export async function saveSettings(patch, userId) {
  const data = { ...(await stored()) };
  for (const [k, raw] of Object.entries(patch || {})) {
    const f = BY_KEY[k]; if (!f) throw new AppError(`Unknown setting ${k}`, 400, 'INVALID_SETTING');
    if (raw === null) { delete data[k]; continue; } // reset to the .env value
    if (f.type === 'boolean') data[k] = raw === true || raw === 'true';
    else if (f.type === 'number') { const n = Number(raw); if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new AppError(`${f.label} must be a non-negative number`, 400, 'INVALID_SETTING'); data[k] = n; }
    else {
      const s = String(raw).trim().slice(0, 300);
      if (f.secret) { if (s === '' || s.startsWith('••')) continue; data[k] = encrypt(s); } // blank keeps the saved secret
      else data[k] = s;
    }
  }
  await CMSContent.findOneAndUpdate({ key: DOC }, { data, updatedBy: userId }, { upsert: true, new: true });
  await loadSettings();
  return getSettings();
}
