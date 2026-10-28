import { Order, Product, User, Return, Refund, Message, Review, InventoryTransaction } from '../models/index.js';

/**
 * Metric definitions (documented in docs/api-documentation.md):
 *  - totalOrders: all non-cancelled orders created in range (cancelled/expired orders excluded).
 *  - totalRevenue: sum of pricing.total of orders that are NOT cancelled and whose payment is settled:
 *      online orders with a captured payment, or COD orders that were delivered (cash collected), minus completed
 *      return refunds (refunds of cancelled orders are already excluded with the order). Failed/pending/cancelled payments never count.
 *  - pendingOrders: status Pending or Confirmed (not yet processing).
 */
export async function getDashboard({ from, to } = {}) {
  const range = {};
  if (from) range.$gte = from; if (to) range.$lte = to;
  const dateFilter = Object.keys(range).length ? { createdAt: range } : {};
  const afterPay = ['Partially Refunded', 'Refund Processing', 'Refunded'];
  const settled = { status: { $ne: 'Cancelled' }, $or: [
    { paymentMethod: 'razorpay', paymentStatus: { $in: ['Paid', ...afterPay] } },
    { paymentMethod: 'cod', deliveredAt: { $exists: true }, paymentStatus: { $in: ['COD Collected', ...afterPay] } },
  ] };
  const [orders, revenueRows, products, customers, pendingOrders, pendingReturns, refundsAttention, lowStock, recentOrders, recentCustomers, recentReturns, recentInv, unreadMessages, pendingReviews, refundedRows] = await Promise.all([
    Order.countDocuments({ ...dateFilter, status: { $ne: 'Cancelled' } }),
    Order.aggregate([{ $match: { ...dateFilter, ...settled } }, { $group: { _id: null, sum: { $sum: '$pricing.total' } } }]),
    Product.countDocuments({}),
    User.countDocuments({ role: 'customer' }),
    Order.countDocuments({ status: { $in: ['Pending', 'Confirmed'] }, ...(paidOrCod()) }),
    Return.countDocuments({ status: { $in: ['Return Requested', 'Under Review'] } }),
    Refund.countDocuments({ status: { $in: ['Pending', 'Failed'] } }),
    lowStockProducts(10),
    Order.find({}).sort({ createdAt: -1 }).limit(8).select('orderNumber status paymentStatus paymentMethod pricing.total customer.name createdAt'),
    User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(6).select('name email createdAt'),
    Return.find({}).sort({ createdAt: -1 }).limit(6).select('returnNumber status createdAt order'),
    InventoryTransaction.find({}).sort({ createdAt: -1 }).limit(8).populate('product', 'name'),
    Message.countDocuments({ isRead: false }),
    Review.countDocuments({ status: 'pending' }),
    Refund.aggregate([{ $match: { status: 'Completed', return: { $exists: true }, ...(Object.keys(range).length ? { completedAt: range } : {}) } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
  ]);
  const gross = revenueRows[0]?.sum || 0; const refunded = refundedRows[0]?.sum || 0;
  return {
    cards: {
      totalOrders: orders, totalRevenue: Math.max(0, Math.round((gross - refunded) * 100) / 100), totalProducts: products, totalCustomers: customers,
      pendingOrders, pendingReturns, inventoryAlerts: lowStock.length, refundsRequiringAttention: refundsAttention,
    },
    extras: { unreadMessages, pendingReviews, grossRevenue: gross, refundedAmount: refunded },
    recentOrders, recentCustomers, recentReturns, lowStock: lowStock.slice(0, 8), recentInventory: recentInv,
    definitions: {
      totalOrders: 'Orders created in the range excluding cancelled orders.',
      totalRevenue: 'Settled orders (online: paid; COD: delivered and collected) excluding cancelled, minus completed refunds.',
      pendingOrders: 'Orders in Pending/Confirmed status that are paid online or Cash on Delivery.',
      inventoryAlerts: 'Active variants at or below their low-stock threshold (including out of stock).',
      refundsRequiringAttention: 'Refunds in Pending or Failed state.',
    },
  };
}
const paidOrCod = () => ({ $or: [{ paymentMethod: 'cod' }, { paymentStatus: 'Paid' }] });

export async function lowStockProducts(limit = 500) {
  const prods = await Product.find({ isActive: true }).select('name slug variants images').limit(1000);
  const rows = [];
  for (const p of prods) for (const v of p.variants) {
    if (v.active !== false && v.stock <= (v.lowStockThreshold ?? 5)) rows.push({ productId: p._id, name: p.name, slug: p.slug, sku: v.sku, label: v.label, stock: v.stock, threshold: v.lowStockThreshold ?? 5 });
  }
  return rows.sort((a, b) => a.stock - b.stock).slice(0, limit);
}
