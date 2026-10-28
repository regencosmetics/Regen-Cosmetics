import { Order, Return, Refund, User, Payment } from '../models/index.js';
import { AppError, notFound } from '../utils/AppError.js';
import { asyncHandler, ok, oid, pageParams, paged, escapeRegex } from '../utils/helpers.js';
import { transitionOrder, updateTracking, orderView, cancelOrder, TRANSITIONS } from '../services/orderService.js';
import { buildInvoicePdf, buildShippingLabelPdf } from '../services/invoiceService.js';
import { updateReturnStatus, inspectReturn, startRefund, returnView } from '../services/returnService.js';
import { recordManualRefundCompletion, retryRefund, revealPayout, publicRefund } from '../services/refundService.js';

// ---------- orders ----------
export const listOrders = asyncHandler(async (req, res) => {
  const pg = pageParams(req.query, 20, 100);
  const f = {};
  if (req.query.status) f.status = String(req.query.status);
  if (req.query.paymentStatus) f.paymentStatus = String(req.query.paymentStatus);
  if (req.query.paymentMethod) f.paymentMethod = String(req.query.paymentMethod);
  if (req.query.q) { const rx = new RegExp(escapeRegex(String(req.query.q)), 'i'); f.$or = [{ orderNumber: rx }, { 'customer.email': rx }, { 'customer.name': rx }, { 'customer.phone': rx }]; }
  if (req.query.from || req.query.to) f.createdAt = { ...(req.query.from ? { $gte: new Date(String(req.query.from)) } : {}), ...(req.query.to ? { $lte: new Date(String(req.query.to)) } : {}) };
  if (req.query.hidePendingOnline === 'true') f.$nor = [{ paymentMethod: 'razorpay', paymentStatus: 'Pending' }];
  const [items, total] = await Promise.all([Order.find(f).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).select('-items.image'), Order.countDocuments(f)]);
  ok(res, paged(items.map((o) => orderView(o, { forAdmin: true })), total, pg));
});
export const getOrder = asyncHandler(async (req, res) => {
  const o = await Order.findById(oid(req.params.id));
  if (!o) throw notFound('Order');
  const [payments, refunds, returns] = await Promise.all([Payment.find({ order: o._id }), Refund.find({ order: o._id }).select('-payout.accountNumberEnc'), Return.find({ order: o._id }).select('returnNumber status createdAt')]);
  ok(res, { order: orderView(o, { forAdmin: true }), payments, refunds, returns, allowedTransitions: TRANSITIONS[o.status] || [] });
});
export const setOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, tracking } = req.body;
  const o = status === 'Cancelled' ? await cancelOrder(req.params.id, { actor: 'admin', reason: note || 'Cancelled by store' }) : await transitionOrder(oid(req.params.id), status, { by: req.user._id, note, tracking });
  ok(res, { order: orderView(o, { forAdmin: true }) }, `Order marked ${status}`);
});
export const setTracking = asyncHandler(async (req, res) => ok(res, { order: orderView(await updateTracking(oid(req.params.id), req.body), { forAdmin: true }) }, 'Tracking updated'));
const sendPdf = (res, buf, name) => res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'private, no-store' }).send(buf);
export const adminInvoice = asyncHandler(async (req, res) => { const o = await Order.findById(oid(req.params.id)); if (!o) throw notFound('Order'); sendPdf(res, await buildInvoicePdf(o), `invoice-${o.orderNumber}.pdf`); });
export const adminLabel = asyncHandler(async (req, res) => { const o = await Order.findById(oid(req.params.id)); if (!o) throw notFound('Order'); sendPdf(res, await buildShippingLabelPdf(o), `label-${o.orderNumber}.pdf`); });

// ---------- returns ----------
export const listReturns = asyncHandler(async (req, res) => {
  const pg = pageParams(req.query, 20, 100);
  const f = req.query.status ? { status: String(req.query.status) } : {};
  const [items, total] = await Promise.all([Return.find(f).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('order', 'orderNumber paymentMethod').populate('user', 'name email'), Return.countDocuments(f)]);
  ok(res, paged(items, total, pg));
});
export const getReturn = asyncHandler(async (req, res) => {
  const r = await Return.findById(oid(req.params.id)).populate('order', 'orderNumber paymentMethod pricing items').populate('user', 'name email phone');
  if (!r) throw notFound('Return');
  const refund = r.refund ? await Refund.findById(r.refund).select('-payout.accountNumberEnc') : null;
  ok(res, { return: returnView(r), refund });
});
export const setReturnStatus = asyncHandler(async (req, res) => ok(res, { return: returnView(await updateReturnStatus(oid(req.params.id), req.body.status, { by: req.user._id, ...req.body })) }, 'Return updated'));
export const inspect = asyncHandler(async (req, res) => ok(res, { return: returnView(await inspectReturn(oid(req.params.id), req.body.results, { by: req.user._id, note: req.body.note })) }, 'Inspection recorded'));
export const refundReturn = asyncHandler(async (req, res) => {
  const r = await startRefund(oid(req.params.id), { by: req.user._id, amount: req.body.amount, payout: req.body.payout });
  ok(res, { return: returnView(r.ret), refund: r.refund ? publicRefund(r.refund) : null, duplicate: r.duplicate }, r.duplicate ? 'Refund was already started' : 'Refund started');
});

// ---------- refunds ----------
export const listRefunds = asyncHandler(async (req, res) => {
  const pg = pageParams(req.query, 20, 100);
  const f = req.query.status ? { status: String(req.query.status) } : {};
  const [items, total] = await Promise.all([Refund.find(f).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('order', 'orderNumber').select('-payout.accountNumberEnc'), Refund.countDocuments(f)]);
  ok(res, paged(items, total, pg));
});
export const completeRefund = asyncHandler(async (req, res) => ok(res, { refund: publicRefund(await recordManualRefundCompletion(oid(req.params.id), { reference: req.body.reference, by: req.user._id })) }, 'Refund recorded as completed'));
export const retryRefundCtl = asyncHandler(async (req, res) => ok(res, { refund: publicRefund(await retryRefund(oid(req.params.id))) }, 'Refund retried'));
export const payoutDetails = asyncHandler(async (req, res) => {
  const p = await revealPayout(oid(req.params.id));
  if (!p) throw notFound('Payout details');
  res.set('Cache-Control', 'no-store');
  ok(res, { payout: p });
});

// ---------- customers ----------
export const listCustomers = asyncHandler(async (req, res) => {
  const pg = pageParams(req.query, 20, 100);
  const f = { role: 'customer' };
  if (req.query.q) { const rx = new RegExp(escapeRegex(String(req.query.q)), 'i'); f.$or = [{ name: rx }, { email: rx }, { phone: rx }]; }
  const [items, total] = await Promise.all([User.find(f).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).select('-addresses -wishlist'), User.countDocuments(f)]);
  ok(res, paged(items, total, pg));
});
export const setCustomerActive = asyncHandler(async (req, res) => {
  const u = await User.findOne({ _id: oid(req.params.id), role: 'customer' });
  if (!u) throw notFound('Customer');
  u.isActive = Boolean(req.body.isActive); await u.save();
  ok(res, { user: u }, u.isActive ? 'Customer enabled' : 'Customer disabled');
});
void AppError;
