# API reference

Base URL `/api/v1`. JSON in/out. Success: `{ "success": true, "message": "…", "data": {…} }`. Error: `{ "success": false, "message": "…", "code": "SOME_CODE", "errors"?: […] }`.
Auth is a cookie; every non-GET request (except the webhook) must send `X-CSRF-Token` (value of the `regen_csrf` cookie, obtained from `GET /auth/csrf`). **Admin** = role `admin` required. Lists are paged: `?page=&limit=` → `{ items, pagination: { page, limit, total, pages } }`.

## Auth
| Method & path | Notes |
|---|---|
| GET `/auth/csrf` | issues CSRF cookie + token |
| POST `/auth/register` `{name,email,password}` (phone optional) | logs in; merges nothing (client calls `/cart/merge`) |
| POST `/auth/login` `{email,password}` | rate limited; generic error for bad credentials/disabled users |
| POST `/auth/logout` · GET `/auth/me` | |
| POST `/auth/forgot-password` `{email}` | always 200 (no account enumeration) |
| POST `/auth/reset-password` `{token,password}` | single-use token |
| PATCH `/auth/profile` · POST `/auth/change-password` | |

## Account (auth)
GET/POST `/account/addresses`, PUT/DELETE `/account/addresses/:id` (max 10) · GET `/account/wishlist`, POST/DELETE `/account/wishlist/:productId`

## Catalogue (public)
GET `/products` (`q, category, collection, concern, audience, minPrice, maxPrice, inStock, bestseller, featured, sort=newest|price_asc|price_desc|name_asc|rating|discount`) · GET `/products/suggest?q=` · GET `/products/:slugOrId` (→ `{product, frequentlyBoughtTogether}`) · GET `/products/:id/related` · GET/POST `/products/:id/reviews` (POST needs auth; one review per user) · GET `/categories`, `/categories/:slug`, `/collections`, `/collections/:slug`

## Cart
POST `/cart/quote` `{items:[{productId,sku,quantity}], couponCode}` (public, authoritative pricing for guest carts) · GET `/cart/offers` · auth: GET `/cart`, POST/PATCH `/cart/items`, DELETE `/cart/items/:productId/:sku`, DELETE `/cart`, POST/DELETE `/cart/coupon`, POST `/cart/merge`

## Checkout & payments (auth)
* GET `/checkout/config` – `{codEnabled, onlineEnabled, razorpayKeyId, …}`
* POST `/checkout/validate` `{paymentMethod}` → quote + `issues[]`
* POST `/checkout/orders` — header **`Idempotency-Key` required (8–100 chars)**. Body `{paymentMethod:'razorpay'|'cod', addressId | address, saveAddress}`. Re-sending the same key returns the original order (`duplicate:true`). 409 `INSUFFICIENT_STOCK` / `OUT_OF_STOCK` if stock changed.
* POST `/payments/verify` `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` — HMAC verified
* POST `/payments/failed`, POST `/payments/retry/:orderId`, GET `/payments/status/:orderId`
* POST `/payments/webhook` — raw body; `X-Razorpay-Signature` HMAC; de-duplicated by `X-Razorpay-Event-Id`. Handles `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`, `refund.failed`.

## Orders (auth)
GET `/orders` · GET `/orders/:id` (→ order, returns, `returnEligibility`) · POST `/orders/:id/cancel` — **409 `CANCEL_NOT_ALLOWED` from Shipped onwards** · GET `/orders/:id/invoice` (PDF) · GET `/orders/track?orderNumber=&email=` (public; both must match; reduced view)

## Returns (auth)
GET `/returns/eligibility/:orderId` · POST `/returns` (multipart: `data` JSON `{orderId, items:[{sku,quantity,reason,comment}], refundMethod}` + `evidence` image files) · GET `/returns`, `/returns/:id`

## Public
POST `/contact` (honeypot + rate limit) · POST `/newsletter/subscribe`, `/newsletter/unsubscribe` · GET `/banners?placement=` · GET `/cms/:key` (public keys only) · GET `/sitemap.xml`, `/robots.txt`, `/health` (outside `/api/v1`)

## Admin (all require admin)
| Area | Endpoints |
|---|---|
| Dashboard | GET `/admin/dashboard?from=&to=` |
| Products | GET/POST `/admin/products`, GET/PUT/DELETE `/admin/products/:id` (delete of a product in past orders deactivates it; PUT never overwrites stock of existing variants), POST `/admin/uploads?folder=` |
| Taxonomy | GET/POST `/admin/categories|collections`, PUT/DELETE `…/:id` |
| Coupons / Banners | GET/POST `/admin/coupons|banners`, PUT/DELETE `…/:id` (used coupons are deactivated, not deleted) |
| Inventory | GET `/admin/inventory/low-stock`, GET `/admin/inventory/transactions`, POST `/admin/inventory/adjust` `{productId,sku,delta,reason}` (optional `Idempotency-Key`) |
| Orders | GET `/admin/orders` (filters), GET `/admin/orders/:id`, PATCH `…/status` `{status,note,tracking}` (validated transition table), PATCH `…/tracking`, GET `…/invoice`, GET `…/label` (PDF) |
| Returns | GET `/admin/returns[/:id]`, PATCH `…/status`, POST `…/inspect`, POST `…/refund` |
| Refunds | GET `/admin/refunds`, POST `/admin/refunds/:id/complete` `{reference}` (manual), POST `…/retry`, GET `…/payout` |
| Customers | GET `/admin/customers`, PATCH `/admin/customers/:id/active` |
| Reviews / Messages / Newsletter | GET/PATCH/DELETE `/admin/reviews|messages`, GET `/admin/newsletter[/export]`, DELETE `/admin/newsletter/:id` |
| CMS | GET `/admin/cms`, GET/PUT/DELETE(reset) `/admin/cms/:key` |

## Dashboard metric definitions
* **Total Orders** – orders created in the range, excluding cancelled.
* **Total Revenue** – settled orders (online: paid; COD: delivered and collected), excluding cancelled, **minus completed return refunds**.
* **Pending Orders** – Pending/Confirmed orders that are paid online or COD.
* **Inventory Alerts** – active variants at or below their low-stock threshold (including out of stock).
* **Refunds Requiring Attention** – refunds in Pending or Failed state.
* Pending Returns, Products and Customers are straight counts.

## Error codes (selection)
`UNAUTHENTICATED`, `FORBIDDEN`, `CSRF_INVALID`, `AUTH_RATE_LIMITED`, `NOT_FOUND`, `INVALID_ID`, `INVALID_TRANSITION`, `COUPON_EXHAUSTED`, `COD_MIN`, `COD_MAX`, `EMPTY_CART`, `PAYMENT_NOT_CONFIGURED`, `PAYMENT_WINDOW_EXPIRED`, `REFUND_EXCEEDS_PAID`, `INSUFFICIENT_STOCK`, `OUT_OF_STOCK`, `IDEMPOTENCY_KEY_REQUIRED`, `CANCEL_NOT_ALLOWED`, `RETURN_NOT_ELIGIBLE`, `EVIDENCE_REQUIRED`, `INVALID_SIGNATURE`, `PAYMENT_LATE_REFUND`.

## Admin settings (admin only)
| Endpoint | Purpose |
|---|---|
| GET `/admin/settings` | Razorpay, Resend, Cloudinary, shipping/COD and review settings. Secrets are returned masked (`••••1234`), never in full. |
| PUT `/admin/settings` | Partial update. A blank secret keeps the saved one; `null` resets a key to its `.env` value. Takes effect immediately, no restart. |
