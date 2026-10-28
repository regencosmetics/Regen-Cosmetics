import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AppError } from './AppError.js';

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const ok = (res, data = {}, message = 'OK', status = 200, meta) =>
  res.status(status).json({ success: true, message, data, ...(meta ? { meta } : {}) });

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const roundMoney = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const toPaise = (n) => Math.round(Number(n) * 100);
export const isObjectId = (id) => mongoose.isValidObjectId(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
export const oid = (id, label = 'id') => {
  if (!isObjectId(id)) throw new AppError(`Invalid ${label}`, 400, 'INVALID_ID');
  return new mongoose.Types.ObjectId(id);
};
export const pageParams = (q, defLimit = 20, max = 100) => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(max, Math.max(1, parseInt(q.limit, 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
};
export const paged = (items, total, { page, limit }) => ({ items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });

// AES-256-GCM helpers for the few fields that must be recoverable (manual refund payout details)
import env from '../config/env.js';
const key = () => crypto.createHash('sha256').update(env.DATA_ENCRYPTION_KEY || env.COOKIE_SECRET).digest();
export const encrypt = (plain) => {
  if (!plain) return undefined;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return [iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join('.');
};
export const decrypt = (blob) => {
  if (!blob) return undefined;
  const [iv, tag, enc] = blob.split('.').map((p) => Buffer.from(p, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
};
