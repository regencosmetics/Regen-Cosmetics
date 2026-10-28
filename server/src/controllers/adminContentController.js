import { Review, Message, NewsletterSubscriber } from '../models/index.js';
import { notFound } from '../utils/AppError.js';
import { asyncHandler, ok, oid, pageParams, paged } from '../utils/helpers.js';
import { recomputeRating } from '../services/productService.js';
import { getCms, setCms, resetCms } from '../services/cmsService.js';
import { ALL_CMS_KEYS } from '../services/cmsDefaults.js';
import { getDashboard } from '../services/dashboardService.js';
import { AppError } from '../utils/AppError.js';

import { getSettings, saveSettings } from '../services/settingsService.js';
export const readSettings = asyncHandler(async (req, res) => ok(res, await getSettings()));
export const updateSettings = asyncHandler(async (req, res) => ok(res, await saveSettings(req.body, req.user._id)));
export const dashboard = asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  if ((from && isNaN(from)) || (to && isNaN(to))) throw new AppError('Invalid date range', 400, 'INVALID_DATE');
  ok(res, await getDashboard({ from, to }));
});

export const listReviews = asyncHandler(async (req, res) => {
  const pg = pageParams(req.query, 20, 100);
  const f = req.query.status ? { status: String(req.query.status) } : {};
  const [items, total] = await Promise.all([Review.find(f).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('product', 'name slug'), Review.countDocuments(f)]);
  ok(res, paged(items, total, pg));
});
export const moderateReview = asyncHandler(async (req, res) => {
  const r = await Review.findByIdAndUpdate(oid(req.params.id), { status: req.body.status }, { new: true });
  if (!r) throw notFound('Review');
  await recomputeRating(r.product);
  ok(res, { review: r }, `Review ${r.status}`);
});
export const deleteReview = asyncHandler(async (req, res) => {
  const r = await Review.findByIdAndDelete(oid(req.params.id));
  if (!r) throw notFound('Review');
  await recomputeRating(r.product);
  ok(res, {}, 'Review deleted');
});

export const listMessages = asyncHandler(async (req, res) => {
  const pg = pageParams(req.query, 20, 100);
  const f = req.query.unread === 'true' ? { isRead: false } : {};
  const [items, total, unread] = await Promise.all([Message.find(f).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit), Message.countDocuments(f), Message.countDocuments({ isRead: false })]);
  ok(res, { ...paged(items, total, pg), unread });
});
export const setMessageRead = asyncHandler(async (req, res) => {
  const m = await Message.findByIdAndUpdate(oid(req.params.id), { isRead: Boolean(req.body.isRead) }, { new: true });
  if (!m) throw notFound('Message');
  ok(res, { message: m });
});
export const deleteMessage = asyncHandler(async (req, res) => { const m = await Message.findByIdAndDelete(oid(req.params.id)); if (!m) throw notFound('Message'); ok(res, {}, 'Message deleted'); });

export const listSubscribers = asyncHandler(async (req, res) => {
  const pg = pageParams(req.query, 25, 200);
  const f = req.query.status ? { status: String(req.query.status) } : {};
  const [items, total] = await Promise.all([NewsletterSubscriber.find(f).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit), NewsletterSubscriber.countDocuments(f)]);
  ok(res, paged(items, total, pg));
});
export const deleteSubscriber = asyncHandler(async (req, res) => { const s = await NewsletterSubscriber.findByIdAndDelete(oid(req.params.id)); if (!s) throw notFound('Subscriber'); ok(res, {}, 'Subscriber removed'); });
export const exportSubscribers = asyncHandler(async (_req, res) => {
  const rows = await NewsletterSubscriber.find({ status: 'subscribed' }).sort({ createdAt: 1 }).lean();
  res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="subscribers.csv"' }).send(`email,subscribed_at\n${rows.map((r) => `${r.email},${new Date(r.subscribedAt).toISOString()}`).join('\n')}\n`);
});

export const cmsKeys = (_req, res) => ok(res, { keys: ALL_CMS_KEYS });
export const getCmsAdmin = asyncHandler(async (req, res) => ok(res, { content: await getCms(req.params.key) }));
export const putCms = asyncHandler(async (req, res) => ok(res, { content: await setCms(req.params.key, req.body, req.user._id) }, 'Content saved'));
export const resetCmsCtl = asyncHandler(async (req, res) => ok(res, { content: await resetCms(req.params.key) }, 'Content reset to defaults'));
