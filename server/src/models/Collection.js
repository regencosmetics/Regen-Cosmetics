import mongoose from 'mongoose';
import { categorySchema } from './Category.js';
const collectionSchema = categorySchema.clone();
export default mongoose.model('Collection', collectionSchema);
