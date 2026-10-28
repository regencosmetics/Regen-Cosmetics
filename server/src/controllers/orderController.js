import { Order, Return } from '../models/index.js';
import { notFound, forbidden } from '../utils/AppError.js';
import { asyncHandler, ok, oid, pageParams, paged } from '../utils/helpers.js';
import { cancelOrder, orderView } from '../services/orderService.js';
import { buildInvoicePdf } from '../services/invoiceService.js';
import { getEligibility } from '../services/returnService.js';

const mine = async (req) => {
  const o = await Order.findOne({ _id: oid(req.params.id), user: req.user._id }); // ownership in the query
  if (!o) throw notFound('Order');
  return o;
};

export const list = asyncHandler(async (req, res) => {
  const pg = pageParams(req.query, 10, 50);
  const filter = { user: req.user._id, ...(req.query.status ? { status: String(req.query.status) } : {}) };
  // unpaid online orders that never completed payment are not shown as orders
  filter.$nor = [{ paymentMethod: 'razorpay', paymentStatus: 'Pending', status: 'Cancelled' }];
  const [items, total] = await Promise.all([Order.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit), Order.countDocuments(filter)]);
  ok(res, paged(items.map((o) => orderView(o)), total, pg));
});

export const detail = asyncHandler(async (req, res) => {
  const o = await mine(req);
  const [returns, eligibility] = await Promise.all([Return.find({ order: o._id }).select('returnNumber status createdAt'), getEligibility(o)]);
  ok(res, { order: orderView(o), returns, returnEligibility: eligibility });
});

export const cancel = asyncHandler(async (req, res) => {
  const o = await cancelOrder(req.params.id, { actor: 'customer', userId: req.user._id, reason: req.body.reason || 'Cancelled by customer' });
  ok(res, { order: orderView(o) }, 'Order cancelled');
});

export const invoice = asyncHandler(async (req, res) => {
  const o = await mine(req);
  if (o.status === 'Cancelled' && o.paymentStatus === 'Pending') throw forbidden('No invoice is available for this order');
  const pdf = await buildInvoicePdf(o);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoice-${o.orderNumber}.pdf"`, 'Cache-Control': 'private, no-store' }).send(pdf);
});

// Guest-friendly tracking: requires BOTH the order number and the email used at checkout; returns a reduced view.
export const track = asyncHandler(async (req, res) => {
  const { orderNumber, email } = req.validatedQuery;
  const o = await Order.findOne({ orderNumber: orderNumber.toUpperCase(), 'customer.email': email });
  if (!o) throw notFound('Order');
  const view = orderView(o);
  ok(res, {
    order: {
      orderNumber: view.orderNumber, createdAt: view.createdAt, status: view.status, statusHistory: view.statusHistory.map((h) => ({ status: h.status, at: h.at })),
      paymentStatus: view.paymentStatus, paymentMethod: view.paymentMethod, tracking: view.tracking, items: view.items.map((i) => ({ name: i.name, variantLabel: i.variantLabel, quantity: i.quantity, image: i.image })),
      shippingAddress: { city: view.shippingAddress.city, state: view.shippingAddress.state, pincode: view.shippingAddress.pincode }, total: view.pricing.total, canCancel: view.canCancel,
    },
  });
});
