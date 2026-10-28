import crypto from 'node:crypto';
import { Product, InventoryTransaction, Order } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

/**
 * Applies a stock delta to one variant exactly once per opKey.
 *  - A unique InventoryTransaction(opKey) is inserted first: repeated calls (webhook retries, double clicks,
 *    repeated cancellations) hit the unique index and become no-ops.
 *  - Decrements use a conditional atomic update ({stock: {$gte: n}}) so concurrent orders can never oversell
 *    and stock can never go negative.
 *  - If the stock update fails, the ledger row is removed again so the opKey can be retried later.
 * No multi-document transaction is required (works on standalone MongoDB).
 */
export async function applyStockDelta({ productId, sku, delta, type, opKey, orderId, returnId, reason, by }) {
  if (!Number.isInteger(delta) || delta === 0) throw new AppError('Invalid stock delta', 400, 'INVALID_DELTA');
  const upper = String(sku).toUpperCase();
  let tx;
  try {
    tx = await InventoryTransaction.create({ opKey, product: productId, sku: upper, delta, type, order: orderId, return: returnId, reason, by });
  } catch (err) {
    if (err?.code === 11000) return { applied: false, duplicate: true };
    throw err;
  }
  const filter = { _id: productId, variants: { $elemMatch: delta < 0 ? { sku: upper, stock: { $gte: -delta } } : { sku: upper } } };
  const updated = await Product.findOneAndUpdate(filter, { $inc: { 'variants.$.stock': delta } }, { new: true });
  if (!updated) {
    await InventoryTransaction.deleteOne({ _id: tx._id });
    const p = await Product.findById(productId).select('variants name');
    const v = p?.variants.find((x) => x.sku === upper);
    if (!p || !v) throw new AppError('Product variant not found', 404, 'VARIANT_NOT_FOUND');
    throw new AppError(`Insufficient stock for ${p.name} (${v.stock} available)`, 409, 'INSUFFICIENT_STOCK', { sku: upper, available: v.stock });
  }
  const after = updated.variants.find((x) => x.sku === upper)?.stock;
  await InventoryTransaction.updateOne({ _id: tx._id }, { stockAfter: after });
  return { applied: true, stockAfter: after };
}

export async function reserveOrderStock(order) {
  const done = [];
  try {
    for (const it of order.items) {
      await applyStockDelta({ productId: it.product, sku: it.sku, delta: -it.quantity, type: 'reserve', opKey: `order:${order._id}:reserve:${it.sku}`, orderId: order._id, reason: `Order ${order.orderNumber}` });
      done.push(it);
    }
  } catch (err) {
    for (const it of done) {
      await applyStockDelta({ productId: it.product, sku: it.sku, delta: it.quantity, type: 'release', opKey: `order:${order._id}:rollback:${it.sku}`, orderId: order._id, reason: 'Reservation rollback' }).catch(() => {});
    }
    throw err;
  }
  await Order.updateOne({ _id: order._id }, { inventoryReserved: true });
}

// Releases reserved stock exactly once (guarded by an atomic flag AND per-line unique opKeys).
export async function releaseOrderStock(orderId, reason = 'Order cancelled') {
  const gate = await Order.findOneAndUpdate({ _id: orderId, inventoryReserved: true, inventoryReleased: false }, { inventoryReleased: true }, { new: true });
  if (!gate) return false;
  for (const it of gate.items) {
    await applyStockDelta({ productId: it.product, sku: it.sku, delta: it.quantity, type: 'release', opKey: `order:${gate._id}:release:${it.sku}`, orderId: gate._id, reason });
  }
  return true;
}

export const adjustStock = ({ productId, sku, delta, reason, by, opKey }) =>
  applyStockDelta({ productId, sku, delta, type: 'adjustment', opKey: opKey || `adj:${crypto.randomUUID()}`, reason, by });
