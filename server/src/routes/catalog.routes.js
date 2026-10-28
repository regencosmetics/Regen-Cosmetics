import { Router } from 'express';
import * as c from '../controllers/catalogController.js';
import { Category, Collection } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { productQuerySchema, reviewSchema } from '../validators/index.js';

export const products = Router();
products.get('/', validate(productQuerySchema, 'query'), c.list);
products.get('/suggest', c.suggest);
products.get('/:id/related', c.related);
products.get('/:id/reviews', c.listReviews);
products.post('/:id/reviews', requireAuth, validate(reviewSchema), c.createReview);
products.get('/:slug', c.detail);

const cat = c.taxonomy(Category); const col = c.taxonomy(Collection);
export const categories = Router(); categories.get('/', cat.list); categories.get('/:slug', cat.detail);
export const collections = Router(); collections.get('/', col.list); collections.get('/:slug', col.detail);
