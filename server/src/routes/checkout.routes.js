import { Router } from 'express';
import * as c from '../controllers/checkoutController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { checkoutSchema, verifyPaymentSchema, paymentFailedSchema } from '../validators/index.js';

export const checkout = Router();
checkout.get('/config', c.config);
checkout.post('/validate', requireAuth, c.validateCheckout);
checkout.post('/orders', requireAuth, validate(checkoutSchema), c.placeOrder);

export const payments = Router();
payments.post('/verify', requireAuth, validate(verifyPaymentSchema), c.verifyPayment);
payments.post('/failed', requireAuth, validate(paymentFailedSchema), c.paymentFailed);
payments.post('/retry/:orderId', requireAuth, c.retryPayment);
payments.get('/status/:orderId', requireAuth, c.paymentStatus);
