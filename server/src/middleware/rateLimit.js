import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const make = (windowMs, max, message, code = 'RATE_LIMITED') =>
  rateLimit({
    windowMs, max, standardHeaders: true, legacyHeaders: false,
    skip: () => env.RATE_LIMIT_DISABLED || env.isTest,
    handler: (_req, res) => res.status(429).json({ success: false, message, code }),
  });

export const apiLimiter = make(15 * 60 * 1000, 1000, 'Too many requests. Please slow down.');
export const authLimiter = make(15 * 60 * 1000, 20, 'Too many attempts. Please try again in 15 minutes.', 'AUTH_RATE_LIMITED');
export const passwordResetLimiter = make(60 * 60 * 1000, 8, 'Too many reset requests. Try again later.');
export const contactLimiter = make(60 * 60 * 1000, 5, 'Too many messages sent. Please try again later.');
export const newsletterLimiter = make(60 * 60 * 1000, 10, 'Too many subscription attempts.');
export const uploadLimiter = make(60 * 60 * 1000, 60, 'Too many uploads. Try again later.');
