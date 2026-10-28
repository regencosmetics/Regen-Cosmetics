import { Router } from 'express';
import * as c from '../controllers/cartController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { cartAddSchema, cartUpdateSchema, quoteSchema, couponApplySchema, mergeSchema } from '../validators/index.js';

const r = Router();
r.post('/quote', optionalAuth, validate(quoteSchema), c.guestQuote);
r.get('/offers', c.publicCoupons);
r.use(requireAuth);
r.get('/', c.get);
r.post('/items', validate(cartAddSchema), c.addItem);
r.patch('/items', validate(cartUpdateSchema), c.updateItem);
r.delete('/items/:productId/:sku', c.removeItem);
r.delete('/', c.clear);
r.post('/coupon', validate(couponApplySchema), c.applyCoupon);
r.delete('/coupon', c.removeCoupon);
r.post('/merge', validate(mergeSchema), c.merge);
export default r;
