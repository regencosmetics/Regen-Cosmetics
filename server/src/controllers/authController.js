import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import env from '../config/env.js';
import { AppError, unauthorized } from '../utils/AppError.js';
import { asyncHandler, ok, randomToken, sha256 } from '../utils/helpers.js';
import { normalizePhone } from '../validators/index.js';
import { setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { issueCsrf } from '../middleware/csrf.js';
import { queueEmail } from '../services/emailService.js';
import { templates } from '../templates/emails.js';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // constant-time-ish login for unknown emails

export const csrf = (req, res) => ok(res, { csrfToken: issueCsrf(req, res) });

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (await User.exists({ email })) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  const user = await User.create({ name, email, ...(phone ? { phone: normalizePhone(phone) } : {}), passwordHash: await bcrypt.hash(password, 12), role: 'customer' }); // role is never client-controlled
  setAuthCookie(res, user);
  await queueEmail('welcome', user.email, templates.welcome(user), `welcome:${user._id}`);
  ok(res, { user }, 'Account created', 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !valid || !user.isActive) throw unauthorized('Invalid email or password');
  user.lastLoginAt = new Date(); await user.save();
  setAuthCookie(res, user);
  ok(res, { user, redirectTo: user.role === 'admin' ? '/admin' : null }, 'Logged in');
});

export const logout = (req, res) => { clearAuthCookie(res); ok(res, {}, 'Logged out'); };
export const me = (req, res) => ok(res, { user: req.user });

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && user.isActive) {
    const token = randomToken(32);
    user.resetTokenHash = sha256(token); user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const base = env.PASSWORD_RESET_URL || `${env.CLIENT_URL}/reset-password`;
    await queueEmail('password_reset', user.email, templates.passwordReset(user, `${base}?token=${token}`));
  }
  ok(res, {}, 'If an account exists for this email, a reset link has been sent'); // identical response: no account enumeration
});

export const resetPassword = asyncHandler(async (req, res) => {
  const filter = { resetTokenHash: sha256(req.body.token), resetTokenExpires: { $gt: new Date() } };
  const target = await User.findOne(filter).select('_id');
  // single-use: the update only matches while the token is still present, and clears it in the same atomic write
  const result = target && await User.updateOne({ _id: target._id, ...filter }, { $unset: { resetTokenHash: 1, resetTokenExpires: 1 }, $set: { passwordHash: await bcrypt.hash(req.body.password, 12), passwordChangedAt: new Date() } });
  if (!result || result.modifiedCount !== 1) throw new AppError('This reset link is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
  clearAuthCookie(res);
  ok(res, {}, 'Password updated. Please log in.');
});

export const updateProfile = asyncHandler(async (req, res) => {
  if (req.body.name) req.user.name = req.body.name;
  if (req.body.phone) req.user.phone = normalizePhone(req.body.phone);
  await req.user.save();
  ok(res, { user: req.user }, 'Profile updated');
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) throw new AppError('Current password is incorrect', 400, 'WRONG_PASSWORD');
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12); user.passwordChangedAt = new Date(); await user.save();
  setAuthCookie(res, user);
  ok(res, {}, 'Password changed');
});
