import { CMSContent } from '../models/index.js';
import { CMS_DEFAULTS, ALL_CMS_KEYS } from './cmsDefaults.js';
import { AppError } from '../utils/AppError.js';

const cache = new Map();
const TTL = 30 * 1000;
export const invalidateCms = (key) => (key ? cache.delete(key) : cache.clear());

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const mergeDefaults = (def, stored) => {
  if (!isObj(def) || !isObj(stored)) return stored ?? def;
  const out = { ...def };
  for (const k of Object.keys(stored)) out[k] = isObj(def[k]) ? mergeDefaults(def[k], stored[k]) : stored[k];
  return out;
};

export async function getCms(key) {
  if (!ALL_CMS_KEYS.includes(key)) throw new AppError('Unknown content key', 404, 'NOT_FOUND');
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  const doc = await CMSContent.findOne({ key }).lean();
  const value = mergeDefaults(CMS_DEFAULTS[key], doc?.data);
  cache.set(key, { value, exp: Date.now() + TTL });
  return value;
}

// ---- sanitation: CMS content is rendered as plain text; we strip markup and block unsafe URLs. ----
const URL_KEYS = /(link|url|to|href|image|avatar|facebook|instagram)$/i;
const safeUrl = (s) => s === '' || /^(https?:\/\/|\/|#|mailto:)/i.test(s);
export function sanitizeDeep(v, key = '', depth = 0) {
  if (depth > 10) throw new AppError('Content is nested too deeply', 400, 'INVALID_CONTENT');
  if (typeof v === 'string') {
    const clean = v.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').slice(0, 6000);
    if (URL_KEYS.test(key) && !safeUrl(clean.trim())) throw new AppError(`Unsafe or invalid URL in "${key}"`, 400, 'INVALID_URL');
    return clean;
  }
  if (Array.isArray(v)) return v.slice(0, 200).map((x) => sanitizeDeep(x, key, depth + 1));
  if (isObj(v)) {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (k.startsWith('$') || k.includes('.')) throw new AppError('Invalid field name in content', 400, 'INVALID_CONTENT');
      out[k] = sanitizeDeep(val, k, depth + 1);
    }
    return out;
  }
  if (typeof v === 'number' || typeof v === 'boolean' || v === null) return v;
  throw new AppError('Unsupported content value', 400, 'INVALID_CONTENT');
}

export async function setCms(key, data, userId) {
  if (!ALL_CMS_KEYS.includes(key)) throw new AppError('Unknown content key', 404, 'NOT_FOUND');
  if (!isObj(data)) throw new AppError('Content must be an object', 400, 'INVALID_CONTENT');
  const clean = sanitizeDeep(data);
  await CMSContent.findOneAndUpdate({ key }, { data: clean, updatedBy: userId }, { upsert: true, new: true });
  invalidateCms(key);
  return getCms(key);
}
export const resetCms = async (key) => { await CMSContent.deleteOne({ key }); invalidateCms(key); return getCms(key); };
