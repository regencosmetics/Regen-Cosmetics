import mongoose from 'mongoose';
const s = new mongoose.Schema({
  opKey: { type: String, required: true, unique: true },    // idempotency key: one effect per key
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  sku: { type: String, required: true },
  delta: { type: Number, required: true },                  // negative = stock removed
  type: { type: String, enum: ['reserve', 'release', 'return_restock', 'adjustment', 'initial'], required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  return: { type: mongoose.Schema.Types.ObjectId, ref: 'Return' },
  reason: String,
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stockAfter: Number,
}, { timestamps: true });
s.index({ createdAt: -1 });
export default mongoose.model('InventoryTransaction', s);
