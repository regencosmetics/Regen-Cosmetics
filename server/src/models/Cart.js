import mongoose from 'mongoose';
const { Schema } = mongoose;
const cartSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    _id: false,
  }],
  couponCode: { type: String, uppercase: true, trim: true },
}, { timestamps: true });
export default mongoose.model('Cart', cartSchema);
