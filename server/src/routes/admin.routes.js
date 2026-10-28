import { Router } from "express";
import * as cat from "../controllers/adminCatalogController.js";
import * as sales from "../controllers/adminSalesController.js";
import * as content from "../controllers/adminContentController.js";
import * as notifications from "../controllers/adminNotificationController.js";
import { Category, Collection } from "../models/index.js";
import { validate } from "../middleware/validate.js";
import { requireAdmin } from "../middleware/auth.js";
import { imageUpload, verifyUploads } from "../middleware/upload.js";
import { uploadLimiter } from "../middleware/rateLimit.js";
import * as v from "../validators/index.js";

const r = Router();
r.use(requireAdmin); // every admin endpoint is authorised on the server from the stored user role

r.get("/settings", content.readSettings);
r.put("/settings", content.updateSettings);
r.get("/dashboard", content.dashboard);
r.get("/unread-counts", notifications.getUnreadCounts);
r.post("/read-state/:section", notifications.markSectionAsRead);

r.get("/products", cat.listProductsAdmin);
r.post("/products", validate(v.productSchema), cat.createProduct);
r.get("/products/:id", cat.getProduct);
r.put("/products/:id", validate(v.productSchema), cat.updateProduct);
r.delete("/products/:id", cat.deleteProduct);
r.post(
  "/uploads",
  uploadLimiter,
  imageUpload.array("images", 6),
  verifyUploads,
  cat.uploadImages,
);

for (const [path, Model, label] of [
  ["categories", Category, "Category"],
  ["collections", Collection, "Collection"],
]) {
  const t = cat.taxonomyAdmin(Model, label);
  r.get(`/${path}`, t.list);
  r.post(`/${path}`, validate(v.taxonomySchema), t.create);
  r.put(`/${path}/:id`, validate(v.taxonomySchema), t.update);
  r.delete(`/${path}/:id`, t.remove);
}
r.get("/coupons", cat.coupons.list);
r.post("/coupons", validate(v.couponSchema), cat.coupons.create);
r.put("/coupons/:id", validate(v.couponSchema), cat.coupons.update);
r.delete("/coupons/:id", cat.coupons.remove);
r.get("/banners", cat.banners.list);
r.post("/banners", validate(v.bannerSchema), cat.banners.create);
r.put("/banners/:id", validate(v.bannerSchema), cat.banners.update);
r.delete("/banners/:id", cat.banners.remove);

r.get("/inventory", cat.inventory.list);
r.get("/inventory/low-stock", cat.inventory.low);
r.get("/inventory/transactions", cat.inventory.transactions);
r.post(
  "/inventory/adjust",
  validate(v.stockAdjustSchema),
  cat.inventory.adjust,
);

r.get("/orders", sales.listOrders);
r.get("/orders/:id", sales.getOrder);
r.patch(
  "/orders/:id/status",
  validate(v.orderStatusSchema),
  sales.setOrderStatus,
);
r.patch("/orders/:id/tracking", validate(v.trackingSchema), sales.setTracking);
r.get("/orders/:id/invoice", sales.adminInvoice);
r.get("/orders/:id/label", sales.adminLabel);

r.get("/returns", sales.listReturns);
r.get("/returns/:id", sales.getReturn);
r.patch(
  "/returns/:id/status",
  validate(v.returnStatusSchema),
  sales.setReturnStatus,
);
r.post("/returns/:id/inspect", validate(v.inspectSchema), sales.inspect);
r.post(
  "/returns/:id/refund",
  validate(v.returnRefundSchema),
  sales.refundReturn,
);

r.get("/refunds", sales.listRefunds);
r.post(
  "/refunds/:id/complete",
  validate(v.manualRefundSchema),
  sales.completeRefund,
);
r.post("/refunds/:id/retry", sales.retryRefundCtl);
r.get("/refunds/:id/payout", sales.payoutDetails);

r.get("/customers", sales.listCustomers);
r.patch("/customers/:id/active", sales.setCustomerActive);

r.get("/reviews", content.listReviews);
r.patch(
  "/reviews/:id",
  validate(v.reviewModerateSchema),
  content.moderateReview,
);
r.delete("/reviews/:id", content.deleteReview);
r.get("/messages", content.listMessages);
r.patch("/messages/:id", content.setMessageRead);
r.delete("/messages/:id", content.deleteMessage);
r.get("/newsletter", content.listSubscribers);
r.get("/newsletter/export", content.exportSubscribers);
r.delete("/newsletter/:id", content.deleteSubscriber);

r.get("/cms", content.cmsKeys);
r.get("/cms/:key", content.getCmsAdmin);
r.put("/cms/:key", content.putCms);
r.delete("/cms/:key", content.resetCmsCtl);
export default r;
