import {
  Product,
  Category,
  Coupon,
  Banner,
  InventoryTransaction,
  Order,
} from "../models/index.js";
import { AppError, notFound } from "../utils/AppError.js";
import {
  asyncHandler,
  ok,
  oid,
  pageParams,
  paged,
  slugify,
  escapeRegex,
} from "../utils/helpers.js";
import {
  listProducts,
  uniqueSlug,
  assertUniqueSkus,
} from "../services/productService.js";
import { uploadImage, deleteImage } from "../services/cloudinaryService.js";
import { adjustStock } from "../services/inventoryService.js";
import { lowStockProducts } from "../services/dashboardService.js";
import { productQuerySchema } from "../validators/index.js";

// ---------- products ----------
export const listProductsAdmin = asyncHandler(async (req, res) => {
  const q = productQuerySchema.parse({ limit: 20, ...req.query });
  const r = await listProducts(q, { admin: true });
  ok(res, r);
});
export const getProduct = asyncHandler(async (req, res) => {
  const p = await Product.findById(oid(req.params.id));
  if (!p) throw notFound("Product");
  ok(res, { product: p });
});
export const createProduct = asyncHandler(async (req, res) => {
  assertUniqueSkus(req.body.variants);
  const slug = await uniqueSlug(req.body.slug || req.body.name);
  const p = await Product.create({ ...req.body, slug });
  ok(res, { product: p }, "Product created", 201);
});
export const updateProduct = asyncHandler(async (req, res) => {
  const p = await Product.findById(oid(req.params.id));
  if (!p) throw notFound("Product");
  assertUniqueSkus(req.body.variants);
  // Stock is NOT writable through a product edit (that would race with live orders). Existing variants keep their
  // current stock; use the audited inventory adjustment endpoint to change it.
  const stockBySku = new Map(p.variants.map((v) => [v.sku, v.stock]));
  const variants = req.body.variants.map((v) => ({
    ...v,
    stock: stockBySku.has(v.sku) ? stockBySku.get(v.sku) : v.stock,
  }));
  const initial = req.body.variants.filter(
    (v) => !stockBySku.has(v.sku) && v.stock > 0,
  );
  const slug =
    req.body.slug && req.body.slug !== p.slug
      ? await uniqueSlug(req.body.slug, p._id)
      : p.slug;
  p.set({ ...req.body, slug, variants });
  await p.save();
  for (const v of initial)
    await InventoryTransaction.create({
      opKey: `initial:${p._id}:${v.sku}:${Date.now()}`,
      product: p._id,
      sku: v.sku,
      delta: v.stock,
      type: "initial",
      reason: "Initial stock for new variant",
      by: req.user._id,
      stockAfter: v.stock,
    });
  ok(res, { product: p }, "Product updated");
});
export const deleteProduct = asyncHandler(async (req, res) => {
  const p = await Product.findById(oid(req.params.id));
  if (!p) throw notFound("Product");
  const referenced = await Order.exists({ "items.product": p._id });
  if (referenced) {
    // history must stay intact: archive instead of deleting
    p.isActive = false;
    await p.save();
    return ok(
      res,
      { archived: true },
      "This product appears in past orders, so it was deactivated instead of deleted",
    );
  }
  await Product.deleteOne({ _id: p._id });
  await Promise.all(
    [...p.images, ...p.detailImages].map((i) => deleteImage(i.publicId)),
  );
  ok(res, { archived: false }, "Product deleted");
});

export const uploadImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new AppError("No image provided", 400, "NO_FILE");
  const folder = ["products", "banners", "categories", "content"].includes(
    req.query.folder,
  )
    ? req.query.folder
    : "products";
  const out = [];
  for (const f of files) out.push(await uploadImage(f, folder));
  ok(res, { images: out }, "Uploaded", 201);
});

// ---------- categories & collections ----------
export const taxonomyAdmin = (Model, label) => ({
  list: asyncHandler(async (_req, res) => {
    const items = await Model.find({}).sort({ sortOrder: 1, name: 1 });
    const key = Model === Category ? "category" : "collections";
    const counts = await Product.aggregate([
      { $unwind: `$${key === "category" ? "category" : "collections"}` },
      {
        $group: {
          _id: `$${key === "category" ? "category" : "collections"}`,
          n: { $sum: 1 },
        },
      },
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.n]));
    ok(res, {
      items: items.map((i) => ({
        ...i.toObject(),
        productCount: map.get(String(i._id)) || 0,
      })),
    });
  }),
  create: asyncHandler(async (req, res) => {
    const slug = slugify(req.body.slug || req.body.name);
    if (await Model.exists({ slug }))
      throw new AppError(
        `A ${label} with this slug already exists`,
        409,
        "DUPLICATE",
      );
    ok(
      res,
      { item: await Model.create({ ...req.body, slug }) },
      `${label} created`,
      201,
    );
  }),
  update: asyncHandler(async (req, res) => {
    const item = await Model.findById(oid(req.params.id));
    if (!item) throw notFound(label);
    const slug = slugify(req.body.slug || item.slug);
    if (slug !== item.slug && (await Model.exists({ slug })))
      throw new AppError(
        `A ${label} with this slug already exists`,
        409,
        "DUPLICATE",
      );
    item.set({ ...req.body, slug });
    await item.save();
    ok(res, { item }, `${label} updated`);
  }),
  // Deleting never leaves dangling references: products are un-assigned (category) / un-linked (collections).
  // Optional ?reassignTo=<id> moves products to another category instead of clearing.
  remove: asyncHandler(async (req, res) => {
    const id = oid(req.params.id);
    const item = await Model.findById(id);
    if (!item) throw notFound(label);
    if (Model === Category) {
      const to = req.query.reassignTo
        ? oid(String(req.query.reassignTo))
        : null;
      if (to && !(await Category.exists({ _id: to })))
        throw notFound("Target category");
      await Product.updateMany(
        { category: id },
        to ? { category: to } : { $unset: { category: 1 } },
      );
    } else {
      await Product.updateMany(
        { collections: id },
        { $pull: { collections: id } },
      );
    }
    await Model.deleteOne({ _id: id });
    ok(res, {}, `${label} deleted`);
  }),
});

// ---------- coupons ----------
export const coupons = {
  list: asyncHandler(async (req, res) => {
    const pg = pageParams(req.query, 20, 100);
    const [items, total] = await Promise.all([
      Coupon.find({}).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
      Coupon.countDocuments({}),
    ]);
    ok(res, paged(items, total, pg));
  }),
  create: asyncHandler(async (req, res) =>
    ok(res, { item: await Coupon.create(req.body) }, "Coupon created", 201),
  ),
  update: asyncHandler(async (req, res) => {
    const { code, ...rest } = req.body;
    void code; // code is immutable once created (orders reference it)
    const c = await Coupon.findByIdAndUpdate(oid(req.params.id), rest, {
      new: true,
      runValidators: true,
    });
    if (!c) throw notFound("Coupon");
    ok(res, { item: c }, "Coupon updated");
  }),
  remove: asyncHandler(async (req, res) => {
    const c = await Coupon.findById(oid(req.params.id));
    if (!c) throw notFound("Coupon");
    if (c.usedCount > 0) {
      c.isActive = false;
      await c.save();
      return ok(
        res,
        { archived: true },
        "Coupon has been used, so it was deactivated instead of deleted",
      );
    }
    await c.deleteOne();
    ok(res, {}, "Coupon deleted");
  }),
};

// ---------- banners ----------
export const banners = {
  list: asyncHandler(async (_req, res) =>
    ok(res, {
      items: await Banner.find({}).sort({ placement: 1, sortOrder: 1 }),
    }),
  ),
  create: asyncHandler(async (req, res) =>
    ok(res, { item: await Banner.create(req.body) }, "Banner created", 201),
  ),
  update: asyncHandler(async (req, res) => {
    const b = await Banner.findByIdAndUpdate(oid(req.params.id), req.body, {
      new: true,
      runValidators: true,
    });
    if (!b) throw notFound("Banner");
    ok(res, { item: b }, "Banner updated");
  }),
  remove: asyncHandler(async (req, res) => {
    const b = await Banner.findByIdAndDelete(oid(req.params.id));
    if (!b) throw notFound("Banner");
    await deleteImage(b.image?.publicId);
    ok(res, {}, "Banner deleted");
  }),
};

// ---------- inventory ----------
export const inventory = {
  low: asyncHandler(async (_req, res) =>
    ok(res, { items: await lowStockProducts() }),
  ),
  list: asyncHandler(async (req, res) => {
    const pg = pageParams(req.query, 20, 100);
    const search = String(req.query.search || "").trim();

    const filter = {};

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { "variants.sku": { $regex: safeSearch, $options: "i" } },
        { "variants.label": { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ updatedAt: -1 })
        .skip(pg.skip)
        .limit(pg.limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    const items = products.flatMap((product) =>
      (product.variants || [])
        .filter((variant) => {
          if (!search) return true;

          const query = search.toLowerCase();

          return (
            product.name?.toLowerCase().includes(query) ||
            variant.sku?.toLowerCase().includes(query) ||
            variant.label?.toLowerCase().includes(query)
          );
        })
        .map((variant) => ({
          productId: String(product._id),
          name: product.name,
          sku: variant.sku,
          label: variant.label,
          stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold ?? 5,
          isActive: product.isActive,
        })),
    );

    ok(res, {
      items,
      page: pg.page,
      limit: pg.limit,
      total,
      pages: Math.ceil(total / pg.limit),
    });
  }),
  transactions: asyncHandler(async (req, res) => {
    const pg = pageParams(req.query, 25, 100);
    const filter = {};
    if (req.query.productId) filter.product = oid(String(req.query.productId));
    if (req.query.sku) filter.sku = String(req.query.sku).toUpperCase();
    const [items, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(pg.skip)
        .limit(pg.limit)
        .populate("product", "name")
        .populate("by", "name"),
      InventoryTransaction.countDocuments(filter),
    ]);
    ok(res, paged(items, total, pg));
  }),
  adjust: asyncHandler(async (req, res) => {
    const { productId, sku, delta, reason } = req.body;
    const r = await adjustStock({
      productId: oid(productId),
      sku,
      delta,
      reason,
      by: req.user._id,
      opKey: req.headers["idempotency-key"]
        ? `adj:${req.user._id}:${req.headers["idempotency-key"]}`
        : undefined,
    });
    ok(
      res,
      r,
      r.applied === false ? "Adjustment already applied" : "Stock adjusted",
    );
  }),
};
void escapeRegex;
