import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { User } from '../models/index.js';
import { unauthorized, forbidden } from '../utils/AppError.js';
import { asyncHandler } from '../utils/helpers.js';

export const COOKIE_NAME = 'regen_token';

export const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
});

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

export const setAuthCookie = (res, user) => {
  const token = signToken(user);
  const decoded = jwt.decode(token);
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: (decoded.exp - decoded.iat) * 1000 });
};
export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions());

async function resolveUser(req) {
  const header = req.headers.authorization;
  const token = req.cookies?.[COOKIE_NAME] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return null;
  let payload;
  try { payload = jwt.verify(token, env.JWT_SECRET); } catch { return null; }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) return null;
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) return null;
  return user; // role always comes from the database, never from the token/client
}

export const optionalAuth = asyncHandler(async (req, _res, next) => { req.user = await resolveUser(req); next(); });
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw unauthorized();
  req.user = user;
  next();
});
export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw unauthorized();
  if (user.role !== 'admin') throw forbidden('Administrator access required');
  req.user = user;
  next();
});
