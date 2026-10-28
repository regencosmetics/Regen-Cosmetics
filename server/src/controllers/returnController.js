import { Return, Order, Refund } from '../models/index.js';
import { AppError, notFound } from '../utils/AppError.js';
import { asyncHandler, ok, oid, pageParams, paged } from '../utils/helpers.js';
import { createReturn, getEligibility, returnView } from '../services/returnService.js';
import { uploadImage } from '../services/cloudinaryService.js';
import { returnCreateSchema } from '../validators/index.js';
import { publicRefund } from '../services/refundService.js';

export const eligibility = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: oid(req.params.orderId), user: req.user._id });
  if (!order) throw notFound('Order');
  ok(res, { items: await getEligibility(order), paymentMethod: order.paymentMethod });
});

export const create = asyncHandler(async (req, res) => {
  let payload;
  try { payload = JSON.parse(req.body.data || '{}'); } catch { throw new AppError('Malformed return data', 400, 'INVALID_JSON'); }
  const parsed = returnCreateSchema.parse(payload); // validated BEFORE any file is uploaded
  const files = req.files || [];
  const needsEvidence = parsed.items.some((i) => i.reason !== 'Other');
  if (needsEvidence && files.length === 0) throw new AppError('Please attach at least one photo as evidence', 400, 'EVIDENCE_REQUIRED');
  const order = await Order.findOne({ _id: parsed.orderId, user: req.user._id });
  if (!order) throw notFound('Order');
  const elig = await getEligibility(order);
  for (const it of parsed.items) { const e = elig.find((x) => x.sku === it.sku.toUpperCase()); if (e && !e.eligible) throw new AppError(`${e.name}: ${e.reason}`, 409, 'RETURN_NOT_ELIGIBLE'); }
  const evidence = [];
  for (const f of files) evidence.push(await uploadImage(f, 'returns'));
  const ret = await createReturn({ user: req.user, orderId: parsed.orderId, items: parsed.items, evidence, refundMethod: parsed.refundMethod });
  ok(res, { return: returnView(ret) }, 'Return request submitted', 201);
});

export const list = asyncHandler(async (req, res) => {
  const pg = pageParams(req.query, 10, 50);
  const filter = { user: req.user._id };
  const [items, total] = await Promise.all([Return.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('order', 'orderNumber'), Return.countDocuments(filter)]);
  ok(res, paged(items, total, pg));
});

export const detail = asyncHandler(async (req, res) => {
  const r = await Return.findOne({ _id: oid(req.params.id), user: req.user._id }).populate('order', 'orderNumber paymentMethod');
  if (!r) throw notFound('Return');
  const refund = r.refund ? await Refund.findById(r.refund) : null;
  ok(res, { return: returnView(r), refund: refund ? { amount: refund.amount, status: refund.status, method: refund.method, completedAt: refund.completedAt } : null });
});
void publicRefund;
