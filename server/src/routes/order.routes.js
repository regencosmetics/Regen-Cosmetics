import { Router } from 'express';
import * as c from '../controllers/orderController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { cancelSchema, trackQuerySchema } from '../validators/index.js';
import { authLimiter } from '../middleware/rateLimit.js';

const r = Router();
r.get('/track', authLimiter, validate(trackQuerySchema, 'query'), c.track);
r.use(requireAuth);
r.get('/', c.list);
r.get('/:id', c.detail);
r.post('/:id/cancel', validate(cancelSchema), c.cancel);
r.get('/:id/invoice', c.invoice);
export default r;
