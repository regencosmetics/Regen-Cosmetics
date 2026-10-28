import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { PageHead, Card, Toggle } from "./ui.jsx";
import { PageLoader } from "@/components/common/Feedback.jsx";
import { useFetch } from "@/hooks";
import { adminApi } from "@/services";
import { errorMessage } from "@/services/api";

const blankVariant = () => ({
  sku: "",
  label: "",
  price: "",
  salePrice: "",
  stock: 0,
  lowStockThreshold: 5,
  active: true,
});

const blankForm = () => ({
  name: "",
  sku: "",
  slug: "",
  tagline: "",
  shortDescription: "",
  description: "",
  ingredients: "",
  instructions: "",
  benefits: "",
  badge: "",
  category: "",
  collections: [],
  isActive: true,
  isFeatured: false,
  isBestseller: false,
  returnable: true,
  windowDays: "",
  images: [],
  detailImages: [],
  variants: [blankVariant()],
  seoTitle: "",
  seoDescription: "",
});

const lines = (value) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const num = (value) =>
  value === "" || value == null ? undefined : Number(value);

const inputClass = "input w-full";
const errorClass = "field-error mt-1";

function Field({ id, label, error, hint, children }) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-neutral-500">{hint}</p>
      )}
      {error && (
        <p className={errorClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function TextField({ name, label, value, onChange, error, hint, ...props }) {
  const id = `product-${name}`;

  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        name={name}
        className={inputClass}
        value={value ?? ""}
        onChange={onChange}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    </Field>
  );
}

function TextAreaField({ name, label, value, onChange, rows = 3, hint }) {
  const id = `product-${name}`;

  return (
    <Field id={id} label={label} hint={hint}>
      <textarea
        id={id}
        name={name}
        className={`${inputClass} resize-y`}
        rows={rows}
        value={value ?? ""}
        onChange={onChange}
      />
    </Field>
  );
}

function ImageUploader({ label, images, onUpload, onRemove, busy }) {
  return (
    <div>
      <p className="label">{label}</p>

      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={`${image.url}-${index}`}
            className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
          >
            <img
              src={image.url}
              alt={image.alt || `${label} ${index + 1}`}
              className="aspect-square w-full object-cover"
              loading="lazy"
            />

            {index === 0 && (
              <span className="absolute bottom-2 left-2 rounded-full bg-black/75 px-2 py-1 text-xs text-white">
                Main image
              </span>
            )}

            <button
              type="button"
              aria-label={`Remove ${label} ${index + 1}`}
              title="Remove image"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-lg text-white shadow hover:bg-red-700"
              onClick={() => onRemove(index)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 px-4 py-6 text-center transition hover:border-neutral-500 hover:bg-neutral-50">
        <span className="text-sm font-semibold text-neutral-800">
          {busy ? "Uploading images…" : "+ Add images"}
        </span>
        <span className="mt-1 text-xs text-neutral-500">JPEG, PNG or WebP</span>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            onUpload(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id;

  const cats = useFetch(() => adminApi.get("categories"), []);
  const cols = useFetch(() => adminApi.get("collections"), []);

  const existing = useFetch(() => adminApi.get(`products/${id}`), [id], {
    enabled: !isNew,
  });

  const [f, setF] = useState(blankForm);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState({
    images: false,
    detailImages: false,
  });

  useEffect(() => {
    const product = existing.data?.product;
    if (!product) return;

    setF({
      ...blankForm(),
      name: product.name || "",
      sku: product.sku || "",
      slug: product.slug || "",
      tagline: product.tagline || "",
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      ingredients: product.ingredients || "",
      instructions: (product.instructions || []).join("\n"),
      benefits: (product.benefits || []).join("\n"),
      badge: product.badge || "",
      category: product.category?._id || product.category || "",
      collections: (product.collections || []).map(
        (collection) => collection._id || collection,
      ),
      isActive: product.isActive !== false,
      isFeatured: Boolean(product.isFeatured),
      isBestseller: Boolean(product.isBestseller),
      returnable: product.returnPolicy?.returnable !== false,
      windowDays: product.returnPolicy?.windowDays ?? "",
      images: product.images || [],
      detailImages: product.detailImages || [],
      variants: (product.variants || []).map((variant) => ({
        ...variant,
        salePrice: variant.salePrice ?? "",
      })),
      seoTitle: product.seo?.title || "",
      seoDescription: product.seo?.description || "",
    });
  }, [existing.data]);

  const set = (key, value) => {
    setF((state) => ({ ...state, [key]: value }));
  };

  const setVar = (index, key, value) => {
    setF((state) => ({
      ...state,
      variants: state.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant,
      ),
    }));
  };

  const upload = async (key, files) => {
    if (!files?.length) return;

    setUploading((state) => ({ ...state, [key]: true }));

    try {
      const result = await adminApi.upload(files, "products");

      setF((state) => ({
        ...state,
        [key]: [...state[key], ...result.images],
      }));

      toast.success(
        `${result.images.length} image${result.images.length === 1 ? "" : "s"} uploaded`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading((state) => ({ ...state, [key]: false }));
    }
  };

  const validate = () => {
    const errors = {};

    if (f.name.trim().length < 2) {
      errors.name = "Enter a product name containing at least 2 characters.";
    }

    if (f.sku.trim().length < 2) {
      errors.sku = "Enter a product SKU containing at least 2 characters.";
    }

    if (f.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(f.slug.trim())) {
      errors.slug = "Use letters, numbers and hyphens without spaces.";
    }

    f.variants.forEach((variant, index) => {
      if (variant.sku.trim().length < 2) {
        errors[`v${index}sku`] = "Enter a valid variant SKU.";
      }

      if (!variant.label.trim()) {
        errors[`v${index}label`] = "Enter a variant label.";
      }

      if (
        variant.price === "" ||
        !Number.isFinite(Number(variant.price)) ||
        Number(variant.price) < 0
      ) {
        errors[`v${index}price`] = "Enter a valid price.";
      }

      if (
        variant.salePrice !== "" &&
        (!Number.isFinite(Number(variant.salePrice)) ||
          Number(variant.salePrice) < 0 ||
          Number(variant.salePrice) > Number(variant.price))
      ) {
        errors[`v${index}salePrice`] =
          "Sale price must be non-negative and cannot exceed the regular price.";
      }

      if (
        !Number.isInteger(Number(variant.lowStockThreshold)) ||
        Number(variant.lowStockThreshold) < 0
      ) {
        errors[`v${index}lowStockThreshold`] =
          "Enter a non-negative whole number.";
      }

      if (
        isNew &&
        (!Number.isInteger(Number(variant.stock)) || Number(variant.stock) < 0)
      ) {
        errors[`v${index}stock`] =
          "Initial stock must be a non-negative whole number.";
      }
    });

    return errors;
  };

  const save = async (event) => {
    event.preventDefault();

    if (busy || Object.values(uploading).some(Boolean)) {
      toast.error("Wait for the current operation to finish.");
      return;
    }

    const errors = validate();
    setErrs(errors);

    if (Object.keys(errors).length) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const body = {
      name: f.name.trim(),
      sku: f.sku.trim(),
      ...(f.slug.trim() ? { slug: f.slug.trim() } : {}),
      tagline: f.tagline,
      shortDescription: f.shortDescription,
      description: f.description,
      ingredients: f.ingredients,
      instructions: lines(f.instructions),
      benefits: lines(f.benefits),
      badge: f.badge,
      category: f.category || null,
      collections: f.collections,
      isActive: f.isActive,
      isFeatured: f.isFeatured,
      isBestseller: f.isBestseller,
      returnPolicy: {
        returnable: f.returnable,
        windowDays: num(f.windowDays) ?? null,
      },
      images: f.images,
      detailImages: f.detailImages,
      seo: {
        title: f.seoTitle,
        description: f.seoDescription,
      },
      variants: f.variants.map((variant) => ({
        sku: variant.sku.trim(),
        label: variant.label.trim(),
        price: Number(variant.price),
        salePrice: variant.salePrice === "" ? null : Number(variant.salePrice),
        lowStockThreshold: Number(variant.lowStockThreshold ?? 5),
        active: variant.active !== false,

        // Initial stock is permitted for new products/variants.
        // For existing variant SKUs, the backend preserves current stock.
        stock: Number(variant.stock || 0),
      })),
    };

    setBusy(true);

    try {
      if (isNew) {
        await adminApi.post("products", body);
      } else {
        await adminApi.put(`products/${id}`, body);
      }

      toast.success(
        isNew ? "Product created successfully" : "Product saved successfully",
      );
      nav("/admin/products");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (!isNew && existing.loading) {
    return <PageLoader />;
  }

  if (!isNew && !existing.data?.product && existing.error) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <Card title="Unable to load product">
          <p className="text-sm text-neutral-600">{existing.error}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={existing.reload}
            >
              Try again
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => nav("/admin/products")}
            >
              Back to products
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const removeImage = (key, index) => {
    set(
      key,
      f[key].filter((_, imageIndex) => imageIndex !== index),
    );
  };

  return (
    <form onSubmit={save} noValidate className="pb-8">
      <PageHead title={isNew ? "Create product" : "Edit product"}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-outline"
            disabled={busy}
            onClick={() => nav("/admin/products")}
          >
            Cancel
          </button>

          <button
            className="btn"
            disabled={busy || Object.values(uploading).some(Boolean)}
          >
            {busy ? "Saving…" : isNew ? "Create product" : "Save changes"}
          </button>
        </div>
      </PageHead>

      <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Product management
            </p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-900">
              {isNew ? "Create a new product" : f.name || "Edit product"}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Manage product information, pricing, images and store visibility.
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
              f.isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            <span className="mr-2 h-2 w-2 rounded-full bg-current" />
            {f.isActive ? "Active product" : "Draft / inactive"}
          </span>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <Card title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="name"
                label="Product name *"
                value={f.name}
                onChange={(event) => set("name", event.target.value)}
                error={errs.name}
                placeholder="e.g. Hydrating Face Serum"
                required
              />

              <TextField
                name="sku"
                label="Product SKU *"
                value={f.sku}
                onChange={(event) => set("sku", event.target.value)}
                error={errs.sku}
                placeholder="e.g. SERUM-001"
                required
              />

              <TextField
                name="slug"
                label="URL slug"
                value={f.slug}
                onChange={(event) => set("slug", event.target.value)}
                error={errs.slug}
                hint="Optional. Use lowercase letters, numbers and hyphens."
                placeholder="hydrating-face-serum"
              />

              <TextField
                name="tagline"
                label="Tagline"
                value={f.tagline}
                onChange={(event) => set("tagline", event.target.value)}
                placeholder="A short product highlight"
              />

              <div className="sm:col-span-2">
                <TextField
                  name="badge"
                  label="Promotional badge"
                  value={f.badge}
                  onChange={(event) => set("badge", event.target.value)}
                  placeholder="e.g. Bestseller, Limited Time Offer"
                />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <TextAreaField
                name="shortDescription"
                label="Short description"
                value={f.shortDescription}
                onChange={(event) =>
                  set("shortDescription", event.target.value)
                }
                rows={2}
              />

              <TextAreaField
                name="description"
                label="Full description"
                value={f.description}
                onChange={(event) => set("description", event.target.value)}
                rows={5}
              />

              <TextAreaField
                name="benefits"
                label="Key benefits"
                value={f.benefits}
                onChange={(event) => set("benefits", event.target.value)}
                hint="Enter one benefit per line."
              />

              <TextAreaField
                name="ingredients"
                label="Ingredients"
                value={f.ingredients}
                onChange={(event) => set("ingredients", event.target.value)}
                rows={4}
              />

              <TextAreaField
                name="instructions"
                label="How to use"
                value={f.instructions}
                onChange={(event) => set("instructions", event.target.value)}
                rows={4}
                hint="Enter one instruction per line."
              />
            </div>
          </Card>

          <Card title="Variants and pricing">
            <p className="mb-4 text-sm text-neutral-500">
              Prices are in INR and tax inclusive. Each variant has its own SKU,
              price and inventory quantity.
            </p>

            <div className="space-y-4">
              {f.variants.map((variant, index) => (
                <div
                  key={`${variant.sku || "new"}-${index}`}
                  className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        Variant {index + 1}
                      </h3>
                      <p className="mt-1 text-xs text-neutral-500">
                        {variant.sku || "SKU not assigned"}
                      </p>
                    </div>

                    {f.variants.length > 1 && (
                      <button
                        type="button"
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Remove this variant from the product form? Make sure it is safe to remove before saving.",
                            )
                          ) {
                            return;
                          }

                          set(
                            "variants",
                            f.variants.filter((_, i) => i !== index),
                          );
                        }}
                      >
                        Remove variant
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ["sku", "Variant SKU"],
                      ["label", "Variant label"],
                      ["price", "Regular price (₹)"],
                      ["salePrice", "Sale price (₹)"],
                      ["stock", "Stock quantity"],
                      ["lowStockThreshold", "Low-stock threshold"],
                    ].map(([key, label]) => {
                      const fieldError =
                        errs[`v${index}${key}`] ||
                        (key === "salePrice" && errs[`v${index}salePrice`]);

                      const stockField = key === "stock";

                      return (
                        <Field
                          key={key}
                          id={`variant-${index}-${key}`}
                          label={`${label}${["sku", "label", "price"].includes(key) ? " *" : ""}`}
                          error={fieldError}
                          hint={
                            stockField && !isNew
                              ? "Existing stock is managed in Inventory."
                              : stockField
                                ? "Initial quantity for this variant."
                                : undefined
                          }
                        >
                          <input
                            id={`variant-${index}-${key}`}
                            className={`${inputClass} ${
                              stockField && !isNew
                                ? "cursor-not-allowed bg-neutral-100 text-neutral-500"
                                : ""
                            }`}
                            type={
                              ["sku", "label"].includes(key) ? "text" : "number"
                            }
                            min="0"
                            step={
                              ["price", "salePrice"].includes(key)
                                ? "0.01"
                                : "1"
                            }
                            value={variant[key] ?? ""}
                            disabled={!isNew && stockField}
                            onChange={(event) =>
                              setVar(index, key, event.target.value)
                            }
                            aria-invalid={fieldError ? "true" : undefined}
                          />
                        </Field>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
                    <Toggle
                      label="Variant active"
                      checked={variant.active !== false}
                      onChange={(checked) => setVar(index, "active", checked)}
                    />

                    <span className="text-xs text-neutral-500">
                      {isNew
                        ? "Initial stock is recorded when the product is created."
                        : "Existing stock changes require an inventory adjustment."}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-outline mt-4"
              onClick={() => set("variants", [...f.variants, blankVariant()])}
              disabled={f.variants.length >= 20}
            >
              + Add variant
            </button>

            {!isNew && (
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <h3 className="text-sm font-semibold text-blue-900">
                  Inventory is managed separately
                </h3>
                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Existing variant stock is read-only here to protect inventory
                  accuracy and order processing. To receive new stock, remove
                  damaged stock or correct a quantity, open Inventory and use
                  Adjust stock.
                </p>
              </div>
            )}
          </Card>

          <Card title="Product images">
            <ImageUploader
              label="Product gallery"
              images={f.images}
              busy={uploading.images}
              onUpload={(files) => upload("images", files)}
              onRemove={(index) => removeImage("images", index)}
            />

            <div className="my-6 border-t border-neutral-200" />

            <ImageUploader
              label="Detail images and banners"
              images={f.detailImages}
              busy={uploading.detailImages}
              onUpload={(files) => upload("detailImages", files)}
              onRemove={(index) => removeImage("detailImages", index)}
            />
          </Card>

          <Card title="Search engine optimisation">
            <div className="space-y-4">
              <TextField
                name="seoTitle"
                label="SEO title"
                value={f.seoTitle}
                onChange={(event) => set("seoTitle", event.target.value)}
                maxLength={70}
                hint={`${f.seoTitle.length}/70 characters`}
                placeholder="Product name | Your Store"
              />

              <TextAreaField
                name="seoDescription"
                label="SEO description"
                value={f.seoDescription}
                onChange={(event) => set("seoDescription", event.target.value)}
                rows={3}
                hint={`${f.seoDescription.length}/170 characters`}
              />
            </div>
          </Card>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-4">
          <Card title="Store visibility">
            <div className="space-y-4">
              <Toggle
                label="Active (visible in store)"
                checked={f.isActive}
                onChange={(value) => set("isActive", value)}
              />

              <Toggle
                label="Featured product"
                checked={f.isFeatured}
                onChange={(value) => set("isFeatured", value)}
              />

              <Toggle
                label="Bestseller"
                checked={f.isBestseller}
                onChange={(value) => set("isBestseller", value)}
              />
            </div>
          </Card>

          <Card title="Categories and collections">
            <Field id="product-category" label="Category">
              <select
                id="product-category"
                className={inputClass}
                value={f.category}
                onChange={(event) => set("category", event.target.value)}
              >
                <option value="">No category</option>
                {(cats.data?.items || []).map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <fieldset className="mt-5">
              <legend className="label">Collections</legend>

              {cols.data?.items?.length ? (
                <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 p-3">
                  {cols.data.items.map((collection) => (
                    <label
                      key={collection._id}
                      className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700"
                    >
                      <input
                        type="checkbox"
                        checked={f.collections.includes(collection._id)}
                        onChange={(event) =>
                          set(
                            "collections",
                            event.target.checked
                              ? [...f.collections, collection._id]
                              : f.collections.filter(
                                  (value) => value !== collection._id,
                                ),
                          )
                        }
                      />
                      <span>{collection.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">
                  No collections available.
                </p>
              )}
            </fieldset>
          </Card>

          <Card title="Return policy">
            <Toggle
              label="Product is returnable"
              checked={f.returnable}
              onChange={(value) => set("returnable", value)}
            />

            <div className="mt-4">
              <TextField
                name="windowDays"
                label="Return window (days)"
                type="number"
                min="0"
                max="365"
                value={f.windowDays}
                onChange={(event) => set("windowDays", event.target.value)}
                hint="Leave blank to use the store default."
              />
            </div>
          </Card>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-neutral-900">Ready to save?</h3>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Review your product details before publishing your changes.
            </p>

            <button
              type="submit"
              className="btn mt-4 w-full"
              disabled={busy || Object.values(uploading).some(Boolean)}
            >
              {busy
                ? "Saving product…"
                : isNew
                  ? "Create product"
                  : "Save product changes"}
            </button>

            <button
              type="button"
              className="btn-outline mt-2 w-full"
              disabled={busy}
              onClick={() => nav("/admin/products")}
            >
              Cancel
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
