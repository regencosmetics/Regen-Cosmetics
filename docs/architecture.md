# Architecture

```
client/  React 18 + Vite + Tailwind SPA          server/  Express 4 + Mongoose 8 API (ESM, Node 20+)
  src/pages      customer + admin screens          src/routes → controllers → services → models
  src/store      Redux Toolkit (auth, cart,        src/middleware  auth, csrf, validate, rate limits,
                 wishlist, ui)                                      uploads, SEO head injection
  src/services   Axios API layer                   src/jobs        expiry/reconcile, email outbox, purge
  src/components shared UI                         scripts/        seedAdmin, seedCatalog, check
```

## Request flow
Browser → `/api/v1/*` (Vite proxy in dev, same origin or CORS in prod) → helmet/cors → JSON parser (the Razorpay webhook is mounted *before* it with a raw-body parser) → cookies → rate limiter → operator-injection rejection (`$`/`.` keys) → CSRF check → route → zod validation → controller → service → Mongoose.

Responses are always `{ success, message, data }` or `{ success:false, message, code }`.

## Security model
* JWT in an **httpOnly, SameSite** cookie (`regen_token`); the user's role and active flag are re-read from the database on every request, never trusted from the token.
* **Double-submit CSRF**: `GET /auth/csrf` sets `regen_csrf`; the client echoes it in `X-CSRF-Token` on all mutating calls. The Razorpay webhook is exempt and authenticated by HMAC instead.
* Passwords hashed with bcrypt; password-reset tokens are random, stored hashed, single-use and expiring.
* zod validates every body/query; unknown keys are stripped; Mongo operator keys are rejected outright.
* File uploads: multer memory storage, size/count limits, MIME **and magic-byte** checks, then Cloudinary.
* COD refund bank account numbers are AES-256-GCM encrypted at rest (`DATA_ENCRYPTION_KEY`); only the last 4 digits are ever listed.
* Admin routes require `role === 'admin'` server-side; the client route guard is only a convenience.

## Inventory safety (no multi-document transactions)
Stock lives in `Product.variants[].stock`. Every change goes through `applyStockDelta`:
1. insert a unique `InventoryTransaction.opKey` (the idempotency guard — a repeat of the same operation is a no-op);
2. apply a *conditional atomic* positional `$inc` (`variants.$.stock` guarded by `$elemMatch: { sku, stock: { $gte: n } }`);
3. if the conditional update fails (not enough stock) the ledger row is deleted and the caller gets a 409.

Orders reserve stock at creation. Order flags `inventoryReserved` / `inventoryReleased` make the release **exactly-once** whichever path (customer cancel, admin cancel, payment expiry) gets there first.

## Order lifecycle
`Pending → Confirmed → Processing → Shipped → Out for Delivery → Delivered`; `Cancelled` is reachable only from Pending/Confirmed/Processing, through an atomic status-filtered update, so a cancel racing a ship has exactly one winner. The customer UI hides *Cancel* at Shipped **and** the server rejects it independently. Returns are a separate model (`Return`), not order statuses.

## Payments
* **Online (Razorpay)**: order is created `Pending` with a reservation expiry; the client opens Razorpay checkout; `POST /payments/verify` checks the HMAC-SHA256 signature; the **webhook** (raw body + signature, event-id de-duplication, amount check) finalises independently, so a closed browser tab cannot lose a payment.
* `finalizeCapture` is gated by an atomic transition – exactly one of {browser callback, webhook} wins; the other observes the final state.
* A capture that lands after the order was cancelled/expired triggers an **automatic refund**.
* A background job expires unpaid online orders after `PAYMENT_RESERVATION_MINUTES`, but first asks Razorpay (`orders.fetchPayments`) whether a payment actually arrived.
* **COD**: confirmed immediately, subject to `COD_MIN_ORDER`/`COD_MAX_ORDER`.
* Without Razorpay keys the server reports `onlineEnabled:false`; the UI hides online payment. Nothing is ever faked.

## Refunds
`Refund` has a unique `idempotencyKey` (`cancel:<orderId>`, `return:<returnId>`, `late:<paymentId>`). Razorpay refunds are dispatched once (duplicate guard via `notes.refundKey`) and retried on failure. COD refunds are manual: admin records payout details (encrypted) and completes with a transfer reference.

## Returns
Eligibility is computed server-side: order delivered, inside the return window (`RETURN_WINDOW_DAYS` or per-product override), product returnable, remaining quantity. Evidence images are required unless the reason is "Other". Admin workflow: review → approve/reject → pickup → received → **inspection** (restock only if resellable, exactly once, op key `return:<id>:restock:<sku>`) → refund.

## CMS
`CMSContent` is a key/value store (`home, faqs, testimonials, footer, social, contact, about, legal.*, seo`, plus a non-public `business` document for invoices). Defaults ship in `cmsDefaults.js`; admin edits override them. Values are sanitised (HTML tags stripped, URLs validated) and cached 30 s.

## SEO
The SPA sets titles/meta/canonical/Open Graph per route with react-helmet-async and emits Product JSON-LD. When `SERVE_CLIENT=true` the server additionally **injects head metadata and Product JSON-LD into the HTML it serves** for product and static URLs (so crawlers that don't run JS still see them) and serves dynamic `/sitemap.xml` and `/robots.txt`. Page *bodies* are still client-rendered (no SSR).

## Email
Transactional email is sent with **Resend** (official `resend` SDK). Emails are first written to a `Notification` outbox and delivered by a background job with retries and exponential back-off, so an email outage can never fail an order or payment. Each send passes the notification id as Resend's `Idempotency-Key`, so a retry after a timeout cannot deliver a duplicate. Permanent 4xx errors (e.g. unverified domain, invalid address) are marked `failed` immediately; 429/5xx/network errors are retried up to 5 times. With no `RESEND_API_KEY` messages are recorded as `skipped` — never silently dropped or falsely reported as sent. Emails sent: welcome, password reset, order confirmation / status updates / cancellation, payment failure, return received / decision, refund completed, newsletter confirmation and the contact-form notice to `SUPPORT_EMAIL_TO`.
