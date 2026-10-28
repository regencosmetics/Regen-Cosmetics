import { Router } from 'express';
import * as c from '../controllers/returnController.js';
import { requireAuth } from '../middleware/auth.js';
import { imageUpload, verifyUploads } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimit.js';

const r = Router();
r.use(requireAuth);
r.get('/eligibility/:orderId', c.eligibility);
r.post('/', uploadLimiter, imageUpload.array('evidence', 4), verifyUploads, c.create);
r.get('/', c.list);
r.get('/:id', c.detail);
export default r;
