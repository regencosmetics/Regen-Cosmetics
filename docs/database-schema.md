# Database schema (MongoDB / Mongoose)

| Collection | Purpose | Notable fields / indexes |
|---|---|---|
| users | customers + admins | `email` unique; embedded `addresses[]` (max 10), `wishlist[]`, `role`, `isActive`, reset token hash+expiry |
| products | catalogue | `slug`,`sku` unique; embedded `variants[]` (`sku`,`label`,`price`,`salePrice`,`stock`,`lowStockThreshold`,`active`); denormalised `priceMin`, `discountMax`, `ratingAverage/Count`; `isSample` marks seeded demo data |
| categories, collections | taxonomy | `slug` unique, `sortOrder`, `isActive` |
| carts | server cart for logged-in users | one per user; items `{product, sku, quantity}`, `couponCode` |
| coupons | discount codes | `code` unique; `type` percent/fixed, limits, `usedCount`, validity window |
| orders | orders | `orderNumber` unique (counter based), `idempotencyKey` sparse-unique (`userId:key`), items snapshot, `pricing`, `paymentMethod/Status`, `status`, `statusHistory`, `tracking`, `inventoryReserved/Released`, `reservationExpiresAt` |
| payments | Razorpay payment records | `providerOrderId` unique, `providerPaymentId`, `status`, `amount` (paise) |
| webhookevents | webhook de-duplication | unique event id; purged by job |
| refunds | refund ledger | `idempotencyKey` unique, `method`, `status`, encrypted `payout.accountNumberEnc` |
| returns | return requests | `returnNumber` unique, items w/ reason + inspection result, `evidence[]`, `statusHistory`, `refund` |
| inventorytransactions | stock ledger | `opKey` **unique** – the idempotency guard; `delta`, `type`, `stockAfter`, `by` |
| reviews | product reviews | unique (`product`,`user`); `status` pending/approved/rejected; `verifiedPurchase` |
| messages | contact-form messages | `isRead` |
| newslettersubscribers | newsletter | `email` unique, `status`, hidden `unsubscribeToken` |
| banners | admin banners | `placement`, `sortOrder`, validity window |
| cmscontents | CMS documents | `key` unique, `value` (JSON), `updatedBy` |
| notifications | email outbox | `status` queued/sent/failed/skipped, `attempts` |
| counters | sequences | order/invoice/return numbers |

TTL and partial indexes are deliberately **not** used (purging is done by a job; uniqueness uses sparse indexes), so the schema also works on MongoDB-compatible servers that lack them. The atomic stock update requires a real MongoDB (positional `$elemMatch` updates) — tests run against real MongoDB 7.
