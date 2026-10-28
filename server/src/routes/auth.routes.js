import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema, forgotSchema, resetSchema, profileSchema, changePasswordSchema } from '../validators/index.js';

const r = Router();
r.get('/csrf', c.csrf);
r.post('/register', authLimiter, validate(registerSchema), c.register);
r.post('/login', authLimiter, validate(loginSchema), c.login);
r.post('/logout', c.logout);
r.get('/me', requireAuth, c.me);
r.post('/forgot-password', passwordResetLimiter, validate(forgotSchema), c.forgotPassword);
r.post('/reset-password', passwordResetLimiter, validate(resetSchema), c.resetPassword);
r.patch('/profile', requireAuth, validate(profileSchema), c.updateProfile);
r.post('/change-password', requireAuth, authLimiter, validate(changePasswordSchema), c.changePassword);
export default r;
