import { Router } from 'express';
import * as c from '../controllers/accountController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { addressSchema } from '../validators/index.js';

const r = Router();
r.use(requireAuth);
r.get('/addresses', c.listAddresses);
r.post('/addresses', validate(addressSchema), c.addAddress);
r.put('/addresses/:id', validate(addressSchema), c.updateAddress);
r.delete('/addresses/:id', c.deleteAddress);
r.get('/wishlist', c.getWishlist);
r.post('/wishlist/:productId', c.addWishlist);
r.delete('/wishlist/:productId', c.removeWishlist);
export default r;
