import { User, Product } from '../models/index.js';
import { AppError, notFound } from '../utils/AppError.js';
import { asyncHandler, ok, oid } from '../utils/helpers.js';
import { normalizePhone } from '../validators/index.js';

const clean = (a) => ({ ...a, phone: normalizePhone(a.phone) });
const sorted = (u) => u.addresses;

export const listAddresses = (req, res) => ok(res, { addresses: sorted(req.user) });

export const addAddress = asyncHandler(async (req, res) => {
  if (req.user.addresses.length >= 10) throw new AppError('You can save up to 10 addresses', 400, 'ADDRESS_LIMIT');
  const a = clean(req.body);
  if (a.isDefault || req.user.addresses.length === 0) { req.user.addresses.forEach((x) => { x.isDefault = false; }); a.isDefault = true; }
  req.user.addresses.push(a); await req.user.save();
  ok(res, { addresses: req.user.addresses }, 'Address saved', 201);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const addr = req.user.addresses.id(req.params.id);
  if (!addr) throw notFound('Address');
  const a = clean(req.body);
  if (a.isDefault) req.user.addresses.forEach((x) => { x.isDefault = false; });
  addr.set(a); await req.user.save();
  ok(res, { addresses: req.user.addresses }, 'Address updated');
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const addr = req.user.addresses.id(req.params.id);
  if (!addr) throw notFound('Address');
  const wasDefault = addr.isDefault; addr.deleteOne();
  if (wasDefault && req.user.addresses[0]) req.user.addresses[0].isDefault = true;
  await req.user.save();
  ok(res, { addresses: req.user.addresses }, 'Address removed');
});

export const getWishlist = asyncHandler(async (req, res) => {
  const items = await Product.find({ _id: { $in: req.user.wishlist }, isActive: true }).populate('category', 'name slug');
  ok(res, { items, ids: req.user.wishlist });
});
export const addWishlist = asyncHandler(async (req, res) => {
  const id = oid(req.params.productId, 'product id');
  if (!(await Product.exists({ _id: id, isActive: true }))) throw notFound('Product');
  await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: id } });
  const u = await User.findById(req.user._id);
  ok(res, { ids: u.wishlist }, 'Added to wishlist');
});
export const removeWishlist = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: oid(req.params.productId, 'product id') } });
  const u = await User.findById(req.user._id);
  ok(res, { ids: u.wishlist }, 'Removed from wishlist');
});
