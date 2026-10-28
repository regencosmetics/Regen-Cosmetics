import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    enum: ['orders', 'returns', 'refunds', 'customers', 'reviews', 'messages', 'newsletter'],
    unique: true,
  },
  lastViewedAt: { type: Date, default: Date.now, required: true },
}, { timestamps: true });

export default mongoose.model('AdminReadState', schema);
