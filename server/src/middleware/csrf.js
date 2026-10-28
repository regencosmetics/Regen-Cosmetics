import crypto from 'node:crypto';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { cookieOptions } from './auth.js';

export const CSRF_COOKIE = 'regen_csrf';
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double-submit token. The token is delivered in a JSON response (which cross-origin pages cannot read
// because CORS is restricted) and must be echoed in the X-CSRF-Token header on every state-changing request.
export function issueCsrf(req, res) {
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE, token, { ...cookieOptions(), maxAge: 1000 * 60 * 60 * 24 * 30 });
  return token;
}

export function csrfProtection(req, _res, next) {
  if (SAFE.has(req.method)) return next();
  if (req.path.startsWith('/payments/webhook')) return next(); // authenticated by HMAC signature instead
  if (env.isTest && req.headers['x-test-skip-csrf'] === '1') return next();
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.headers['x-csrf-token'];
  if (!cookie || !header || cookie.length !== String(header).length ||
      !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(String(header)))) {
    return next(new AppError('Invalid or missing CSRF token', 403, 'CSRF_INVALID'));
  }
  next();
}
