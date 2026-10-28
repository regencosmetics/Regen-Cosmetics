import { Router } from 'express';
import * as c from '../controllers/publicController.js';
import { validate } from '../middleware/validate.js';
import { contactSchema, newsletterSchema } from '../validators/index.js';
import { contactLimiter, newsletterLimiter } from '../middleware/rateLimit.js';

const r = Router();
r.post('/contact', contactLimiter, validate(contactSchema), c.contact);
r.post('/newsletter/subscribe', newsletterLimiter, validate(newsletterSchema), c.subscribe);
r.post('/newsletter/unsubscribe', newsletterLimiter, c.unsubscribe);
r.get('/banners', c.banners);
r.get('/cms/:key', c.cms);
export default r;
