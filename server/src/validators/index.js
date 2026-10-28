import { z } from 'zod';

const trimmed = (min = 1, max = 200) => z.string().trim().min(min).max(max);
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(200);
export const phone = z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
export const password = z.string().min(8, 'Password must be at least 8 characters').max(100)
  .regex(/[a-z]/, 'Password needs a lowercase letter').regex(/[A-Z]/, 'Password needs an uppercase letter').regex(/\d/, 'Password needs a number');
const url = z.string().trim().max(500).refine((s) => s === '' || /^(https?:\/\/|\/)/i.test(s), 'Must be an http(s) URL or a site path');

export const normalizePhone = (p) => (p || '').replace(/[\s-]/g, '').replace(/^\+91/, '');

export const registerSchema = z.object({ name: trimmed(2, 100), phone: phone.optional(), email, password });
export const loginSchema = z.object({ email, password: z.string().min(1).max(100) });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password });
export const profileSchema = z.object({ name: trimmed(2, 100).optional(), phone: phone.optional() });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });

export const addressSchema = z.object({
  label: trimmed(1, 30).optional(), fullName: trimmed(2, 100), phone,
  line1: trimmed(3, 200), line2: z.string().trim().max(200).optional(), landmark: z.string().trim().max(100).optional(),
  city: trimmed(2, 80), state: trimmed(2, 80), pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit PIN code'),
  isDefault: z.boolean().optional(),
});

export const variantSchema = z.object({
  sku: trimmed(2, 40).transform((s) => s.toUpperCase()),
  label: trimmed(1, 40), size: z.string().trim().max(40).optional(), color: z.string().trim().max(40).optional(), netContent: z.string().trim().max(40).optional(),
  price: z.coerce.number().min(0).max(1000000), salePrice: z.coerce.number().min(0).max(1000000).nullish(),
  stock: z.coerce.number().int().min(0).max(1000000), lowStockThreshold: z.coerce.number().int().min(0).default(5),
  image: z.string().max(500).optional(), active: z.boolean().optional(),
}).refine((v) => v.salePrice == null || v.salePrice <= v.price, { message: 'Sale price cannot exceed regular price', path: ['salePrice'] });

const img = z.object({ url: url.min(1), publicId: z.string().max(200).optional(), alt: z.string().max(200).optional() });
export const productSchema = z.object({
  name: trimmed(2, 200), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens').max(200).optional(),
  sku: trimmed(2, 40).transform((s) => s.toUpperCase()),
  tagline: z.string().trim().max(200).optional(), shortDescription: z.string().trim().max(400).optional(), description: z.string().trim().max(5000).optional(),
  ingredients: z.string().trim().max(3000).optional(), instructions: z.array(z.string().trim().max(300)).max(20).optional(),
  benefits: z.array(z.string().trim().max(300)).max(20).optional(), highlights: z.array(z.string().trim().max(300)).max(20).optional(),
  images: z.array(img).max(12).optional(), detailImages: z.array(img).max(12).optional(),
  category: objectId.nullish(), collections: z.array(objectId).max(20).optional(),
  concerns: z.array(z.string().trim().max(40)).max(20).optional(), audience: z.array(z.enum(['men', 'women', 'unisex'])).optional(), tags: z.array(z.string().trim().max(40)).max(30).optional(),
  variants: z.array(variantSchema).min(1).max(20),
  isActive: z.boolean().optional(), isFeatured: z.boolean().optional(), isBestseller: z.boolean().optional(), badge: z.string().trim().max(60).optional(),
  returnPolicy: z.object({ returnable: z.boolean().optional(), windowDays: z.coerce.number().int().min(0).max(365).nullish() }).optional(),
  faqs: z.array(z.object({ q: trimmed(1, 300), a: trimmed(1, 1500) })).max(30).optional(),
  frequentlyBoughtWith: z.array(objectId).max(6).optional(),
  seo: z.object({ title: z.string().trim().max(70).optional(), description: z.string().trim().max(170).optional() }).optional(),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(60).default(12),
  q: z.string().trim().max(100).optional(), category: z.string().trim().max(100).optional(), collection: z.string().trim().max(100).optional(),
  concern: z.string().trim().max(50).optional(), audience: z.enum(['men', 'women', 'unisex']).optional(),
  minPrice: z.coerce.number().min(0).optional(), maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.enum(['true', 'false']).optional(), bestseller: z.enum(['true', 'false']).optional(), featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc', 'rating', 'discount']).default('newest'),
});

export const taxonomySchema = z.object({
  name: trimmed(2, 120), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  image: z.object({ url: url, publicId: z.string().optional() }).optional(), banner: z.object({ url: url, publicId: z.string().optional() }).optional(),
  isActive: z.boolean().optional(), sortOrder: z.coerce.number().int().min(-1000).max(1000).optional(),
  seo: z.object({ title: z.string().max(70).optional(), description: z.string().max(170).optional() }).optional(),
});

const cartItem = z.object({ productId: objectId, sku: trimmed(2, 40), quantity: z.coerce.number().int().min(1).max(20) });
export const cartAddSchema = cartItem;
export const cartUpdateSchema = z.object({ productId: objectId, sku: trimmed(2, 40), quantity: z.coerce.number().int().min(0).max(20) });
export const quoteSchema = z.object({ items: z.array(cartItem).max(50), couponCode: z.string().trim().max(30).optional().nullable(), paymentMethod: z.enum(['razorpay', 'cod']).optional() });
export const couponApplySchema = z.object({ code: trimmed(3, 30) });
export const mergeSchema = z.object({ items: z.array(cartItem).max(50) });

export const checkoutSchema = z.object({
  addressId: objectId.optional(), address: addressSchema.optional(), saveAddress: z.boolean().optional(),
  paymentMethod: z.enum(['razorpay', 'cod']),
  items: z.array(cartItem).max(50).optional(), // Buy-it-now: explicit items; otherwise the saved cart is used
  couponCode: z.string().trim().max(30).optional().nullable(),
}).refine((d) => d.addressId || d.address, { message: 'Delivery address is required', path: ['address'] });

export const verifyPaymentSchema = z.object({ razorpay_order_id: trimmed(5, 100), razorpay_payment_id: trimmed(5, 100), razorpay_signature: trimmed(10, 200) });
export const paymentFailedSchema = z.object({ razorpay_order_id: trimmed(5, 100), razorpay_payment_id: z.string().max(100).optional(), error_code: z.string().max(100).optional(), error_description: z.string().max(300).optional() });

export const orderStatusSchema = z.object({
  status: z.enum(['Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']), note: z.string().trim().max(300).optional(),
  tracking: z.object({ carrier: z.string().trim().max(60).optional(), trackingNumber: z.string().trim().max(80).optional(), url: url.optional(), note: z.string().max(200).optional() }).optional(),
});
export const trackingSchema = z.object({ carrier: z.string().trim().max(60).optional(), trackingNumber: z.string().trim().max(80).optional(), url: url.optional(), note: z.string().max(200).optional() });
export const cancelSchema = z.object({ reason: z.string().trim().max(300).optional() });
export const trackQuerySchema = z.object({ orderNumber: trimmed(5, 40), email });

export const returnCreateSchema = z.object({
  orderId: objectId,
  items: z.array(z.object({
    sku: trimmed(2, 40), quantity: z.coerce.number().int().min(1).max(20),
    reason: z.enum(['Damaged Product', 'Wrong Item Received', 'Missing or Incomplete Order', 'Defective Product', 'Other']), comment: z.string().trim().max(1000).optional(),
  })).min(1).max(20),
  refundMethod: z.enum(['original', 'upi', 'bank']).optional(),
});
export const returnStatusSchema = z.object({
  status: z.enum(['Under Review', 'Approved', 'Rejected', 'Pickup Scheduled', 'Product Received']),
  note: z.string().trim().max(500).optional(), rejectionReason: z.string().trim().max(500).optional(),
  pickup: z.object({ scheduledFor: z.coerce.date().optional(), note: z.string().max(300).optional() }).optional(),
});
export const inspectSchema = z.object({ results: z.array(z.object({ sku: trimmed(2, 40), result: z.enum(['resellable', 'not_resellable']) })).min(1), note: z.string().max(500).optional() });
export const returnRefundSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  payout: z.object({
    upiId: z.string().trim().regex(/^[\w.-]{2,}@[\w]{2,}$/, 'Invalid UPI id').optional(),
    accountHolder: z.string().trim().max(100).optional(), ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC').optional(),
    accountNumber: z.string().trim().regex(/^\d{9,18}$/, 'Invalid account number').optional(),
  }).optional(),
});
export const manualRefundSchema = z.object({ reference: trimmed(3, 100) });

export const reviewSchema = z.object({ rating: z.coerce.number().int().min(1).max(5), title: trimmed(3, 120), body: z.string().trim().max(2000).optional() });
export const reviewModerateSchema = z.object({ status: z.enum(['approved', 'rejected', 'pending']) });

export const contactSchema = z.object({
  name: trimmed(2, 100), email, phone: z.string().trim().regex(/^[+\d][\d\s-]{6,17}$/, 'Enter a valid phone number').optional().or(z.literal('')),
  message: trimmed(10, 3000), website: z.string().max(0).optional(), // honeypot: must stay empty
});
export const newsletterSchema = z.object({ email, website: z.string().max(0).optional() });

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Use 3-30 letters, numbers, - or _'),
  description: z.string().trim().max(200).optional(), type: z.enum(['percent', 'fixed']), value: z.coerce.number().positive().max(1000000),
  maxDiscount: z.coerce.number().min(0).optional(), minOrderAmount: z.coerce.number().min(0).optional(),
  startsAt: z.coerce.date().nullish(), expiresAt: z.coerce.date().nullish(), usageLimit: z.coerce.number().int().min(0).optional(), perUserLimit: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(), isPublic: z.boolean().optional(), eligibleProducts: z.array(objectId).optional(), eligibleCategories: z.array(objectId).optional(),
}).refine((c) => c.type !== 'percent' || c.value <= 100, { message: 'Percent cannot exceed 100', path: ['value'] })
  .refine((c) => !c.startsAt || !c.expiresAt || c.expiresAt > c.startsAt, { message: 'Expiry must be after start', path: ['expiresAt'] });

export const bannerSchema = z.object({
  placement: z.enum(['hero', 'promo']).default('hero'), title: z.string().trim().max(200).optional(), subtitle: z.string().trim().max(400).optional(),
  image: z.object({ url: url.min(1), publicId: z.string().optional(), alt: z.string().max(200).optional() }),
  mobileImage: z.object({ url: url, publicId: z.string().optional() }).optional(),
  ctaText: z.string().trim().max(60).optional(), ctaLink: url.optional(), sortOrder: z.coerce.number().int().default(0), isActive: z.boolean().optional(),
  startsAt: z.coerce.date().nullish(), endsAt: z.coerce.date().nullish(),
});

export const stockAdjustSchema = z.object({ productId: objectId, sku: trimmed(2, 40), delta: z.coerce.number().int().refine((n) => n !== 0, 'Delta cannot be zero'), reason: trimmed(3, 200) });
export const idParam = z.object({ id: objectId });
