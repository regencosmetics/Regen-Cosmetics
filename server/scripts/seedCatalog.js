// Usage: npm run seed:catalog [-- --with-sample-reviews]
// Development sample catalog built from the supplied REGEN designs/images. All records are flagged isSample.
// Safe to re-run: upserts by slug/code and NEVER deletes or resets existing data.
import { connectDb, disconnectDb } from '../src/config/db.js';
import { Category, Collection, Product, Coupon, Review, User } from '../src/models/index.js';
import { recomputeRating } from '../src/services/productService.js';

await connectDb();
const withReviews = process.argv.includes('--with-sample-reviews');
const up = (Model, slug, data) => Model.findOneAndUpdate({ slug }, { $setOnInsert: { slug, ...data } }, { upsert: true, new: true });

const cats = {};
for (const [i, [name, slug]] of [['Sunscreen', 'sunscreen'], ['Face Wash', 'face-wash'], ['Moisturizers', 'moisturizers'], ['Serums', 'serums']].entries()) {
  cats[slug] = await up(Category, slug, { name, sortOrder: i, description: slug === 'sunscreen' ? 'Broad spectrum sun protection for everyday use.' : '' });
}
const cols = {};
for (const [i, [name, slug]] of [['Best Buy Combos', 'best-buy-combos'], ['Bestsellers', 'bestsellers']].entries()) cols[slug] = await up(Collection, slug, { name, sortOrder: i });

const A = '/assets';
const img = (u, alt) => ({ url: `${A}/${u}`, alt });
const common = { isSample: true, audience: ['men', 'unisex'], isActive: true, category: cats.sunscreen._id, badge: 'Limited Time Offer', returnPolicy: { returnable: true },
  instructions: ['Kindly do Patch Test before use'], highlights: ['Real result takes time, not instantly'],
  detailImages: [img('product-detail-banner.webp', 'REGEN Everyday Sun Protection SPF 50+'), img('key-features.webp', 'Key features'), img('how-to-use.webp', 'How to use')], };
const products = [
  { slug: 'regen-1-hyaluronic-sunscreen-matte-gel-spf-50-50-g', sku: 'RGN-GEL-50', name: 'REGEN 1% Hyaluronic Sunscreen Matte Gel SPF 50+ (50 g)', tagline: 'Suitable For Acne-Prone Skin',
    shortDescription: 'Premium quality Sunscreen Matte Gel', description: 'Give your skin the care it deserves with the REGEN Daily Face Cleanser. Designed for a simple, refreshing cleansing routine, it helps wash away daily buildup and excess oil without complicating your skincare.',
    images: [img('gel.webp', 'REGEN 1% Hyaluronic Sunscreen Matte Gel'), img('combo-blue.webp', 'REGEN sunscreen duo'), img('combo-dark.webp', 'REGEN sunscreen duo'), img('combo-splash.webp', 'REGEN sunscreens')],
    variants: [{ sku: 'RGN-GEL-50-50ML', label: '50 ML', size: '50 ML', netContent: '50 ML', price: 799, salePrice: 499, stock: 50 }], concerns: ['acne', 'oil-control', 'sun-damage'], isBestseller: true, isFeatured: true, tags: ['sunscreen', 'gel', 'spf 50'], collections: [cols.bestsellers._id] },
  { slug: 'regen-daily-protective-sunscreen-serum-spf-50-50-ml', sku: 'RGN-SRM-50', name: 'REGEN Daily Protective Sunscreen Serum SPF 50+ (50 ml)', tagline: 'Non-Comedogenic',
    shortDescription: 'Daily protective sunscreen serum', description: 'Give your skin the care it deserves with the REGEN Daily Face Cleanser. Designed for a simple, refreshing cleansing routine, it helps wash away daily buildup and excess oil without complicating your skincare.',
    images: [img('serum.webp', 'REGEN Daily Protective Sunscreen Serum'), img('combo-blue.webp', 'REGEN sunscreen duo'), img('combo-dark.webp', 'REGEN sunscreen duo'), img('combo-splash.webp', 'REGEN sunscreens')],
    variants: [{ sku: 'RGN-SRM-50-50ML', label: '50 ML', size: '50 ML', netContent: '50 ML', price: 799, salePrice: 599, stock: 50 }], concerns: ['sun-damage', 'dark-spots', 'anti-aging'], isBestseller: true, isFeatured: true, tags: ['sunscreen', 'serum', 'spf 50'], collections: [cols.bestsellers._id] },
  { slug: 'regen-daily-protective-and-regen-1-hyaluronic-sunscreen-combo', sku: 'RGN-CMB-01', name: 'REGEN Daily Protective & REGEN 1% Hyaluronic Sunscreen', tagline: 'Non-Comedogenic', badge: 'Best Buy Combo',
    shortDescription: 'Serum + Matte Gel combo', description: 'The REGEN Daily Protective Sunscreen Serum and the REGEN 1% Hyaluronic Sunscreen Matte Gel together as a combo.',
    images: [img('combo-splash.webp', 'REGEN sunscreen combo'), img('combo-blue.webp', 'REGEN sunscreen combo'), img('combo-dark.webp', 'REGEN sunscreen combo')],
    variants: [{ sku: 'RGN-CMB-01-STD', label: 'Combo', size: '50 ML + 50 g', price: 1598, salePrice: 1099, stock: 30 }], concerns: ['sun-damage'], isFeatured: true, tags: ['combo'], collections: [cols['best-buy-combos']._id] },
];
for (const p of products) {
  const doc = { ...common, ...p };
  const existing = await Product.findOne({ slug: p.slug });
  if (!existing) await Product.create(doc);
}
const gel = await Product.findOne({ sku: 'RGN-GEL-50' }); const serum = await Product.findOne({ sku: 'RGN-SRM-50' });
await Product.updateOne({ _id: gel._id }, { frequentlyBoughtWith: [serum._id] });
await Product.updateOne({ _id: serum._id }, { frequentlyBoughtWith: [gel._id] });

await Coupon.findOneAndUpdate({ code: 'WELCOME10' }, { $setOnInsert: { code: 'WELCOME10', description: '10% off your order (sample coupon)', type: 'percent', value: 10, maxDiscount: 150, minOrderAmount: 499, isSample: true } }, { upsert: true });
await Coupon.findOneAndUpdate({ code: 'FLAT100' }, { $setOnInsert: { code: 'FLAT100', description: 'Rs 100 off orders above Rs 999 (sample coupon)', type: 'fixed', value: 100, minOrderAmount: 999, isSample: true } }, { upsert: true });

if (withReviews) {
  const reviewer = (await User.findOne({ email: 'sample-reviewer@example.invalid' })) || (await User.create({ name: 'Sample Reviewer', email: 'sample-reviewer@example.invalid', phone: '9000000001', passwordHash: 'x'.repeat(60), isActive: false }));
  // one review per (product,user) by schema: create extra inactive sample users for variety
  const samples = [['Krish shah', 5, 'Helped my barrier after over-exfoliating', 'I damaged my skin barrier using too many actives. This product really helped calm the irritation.'], ['Nagesh Patel', 3, 'Okay for the price', 'Decent everyday sunscreen.'], ['Darshana Mohanty', 4, "Finally something that doesn't feel sticky!", 'I have combination skin and almost every product either makes me oily or sits weird on my face. This one is actually lightweight.']];
  for (const [i, [displayName, rating, title, body]] of samples.entries()) {
    const email = `sample-reviewer-${i}@example.invalid`;
    const u = (await User.findOne({ email })) || (await User.create({ name: displayName, email, phone: '9000000002', passwordHash: 'x'.repeat(60), isActive: false }));
    await Review.updateOne({ product: serum._id, user: u._id }, { $setOnInsert: { displayName, rating, title, body, status: 'approved', isSample: true, verifiedPurchase: false } }, { upsert: true });
  }
  void reviewer;
  await recomputeRating(serum._id);
}
console.log('Sample catalog ready (existing records were left untouched).');
await disconnectDb();
