# Project status

## Verified (run in this build environment)
| Check | Result |
|---|---|
| Server tests (`vitest`, **real MongoDB 7**) | 76 passing: auth, catalogue, checkout, orders, admin, email outbox (see below) |
| Client unit tests (`vitest` + Testing Library) | 20 passing: price helpers, form validation, protected routes, header/nav, login validation, price display, order summary |
| Lint (server + client) | clean |
| Production client build (`vite build`) | succeeds |
| Browser smoke (Playwright/Chromium) | storefront on desktop 1440 px **and** mobile 393 px, static pages, 404, guarded routes; full journey register → add to cart → COD checkout → order detail → cancel; admin login + all 16 admin pages, create coupon, edit product, save CMS, drive an order through statuses |
| Cancel rule | Cancel button offered on new orders, **hidden once Shipped**, and the API independently returns `409 CANCEL_NOT_ALLOWED` (browser + automated server test) |
| Concurrency / idempotency (server tests) | 8 buyers vs stock 3 → exactly 3 succeed; repeated checkout with the same `Idempotency-Key` → one order; duplicate webhook → one effect; late capture after cancel → automatic refund; reconcile recovers a paid-but-expired order; cancel-vs-ship race has one winner; return restock happens once; refund idempotency; COD refund payout encrypted; admin RBAC |
| Payment signatures | Real HMAC-SHA256 verification of checkout signature and webhook (tests use correctly signed payloads against a mocked Razorpay API client) |
| Email outbox | Resend SDK mocked: sends with idempotency key, retries on 429/network, gives up on permanent 4xx, `skipped` when no key |

## NOT verified here — needs your credentials / environment
* **Real Razorpay**: no test/live keys were available. The integration is implemented against the SDK but no real payment, refund or webhook delivery has been performed. Do a ₹ test payment + refund + webhook before launch.
* **Real Resend delivery**: not sent (no key). Use `npm --prefix server run email:test -- you@example.com` and verify your domain's SPF/DKIM in Resend.
* **Real Cloudinary upload**: mocked in tests; admin image upload and return-evidence upload need `CLOUDINARY_*`.
* Cross-browser (only Chromium), real devices, load testing, accessibility audit with assistive technology, and pixel-level comparison against the design PDFs were **not** done. Layouts were built to the references and checked with screenshots at 1440 px and 393 px only.

## Deviations from the brief (deliberate, please review)
* **OTP login → email + password.** The profile design showed a login modal; no SMS/OTP provider was specified. Email/password with reset-by-email is implemented.
* Header has a **hamburger menu on mobile** (the mobile reference had none visible).
* "Shop by concern" tiles and product badges use text only (the supplied artwork had no icons to reuse).
* No cart reservation timer by default (stock is reserved at order creation, not at add-to-cart).
* **Draft copy** you must review: FAQ answers, Privacy Policy body (the PDF contained headings only — placeholder text is shown), concern labels, contact details, social links, testimonials (reproduced from the design — replace with real, consented ones).
* The design PDFs contain inconsistent prices/discounts and a `glopetra` typo in one place; seed prices are sample data, not authoritative.
* **SEO**: per-route meta + Product JSON-LD, with head injection and dynamic sitemap/robots when `SERVE_CLIENT=true`. Page bodies are client-rendered (no SSR/prerender).
* Product search uses a case-insensitive regex, not a MongoDB text index — fine for a small catalogue, revisit at scale.
* **No courier integration**: tracking number/carrier/URL are entered by admin.
* Atomic stock updates need a real MongoDB (not some compatible emulators).
* The dashboard "Total Revenue" definition is documented in `docs/api-documentation.md`.

## Before launch
See the checklist in `docs/deployment.md`.


## Update: design match, simpler auth, admin-controlled settings
- Storefront rebuilt to the supplied PDFs / mobile references (home, header/footer, cart drawer with coupons and offers, checkout coupon box, product page, wishlist, About, Contact, legal pages).
- Customer auth is name + email + password (register) and email + password (login). No OTP; phone is optional.
- Admin: new sidebar layout and animated page changes; **Settings** page for payments, email, images, shipping and review rules (secrets encrypted).
- Verified: server tests, client tests, lint, build, and Playwright e2e (storefront desktop+mobile, register -> COD -> cancel, cancel-rule, admin pages incl. Settings).
- NOT verified against live services: Razorpay payments, Resend delivery, Cloudinary uploads (no credentials here; code paths are covered by mocks/signature tests only).
- Still in the old styling: Account/orders pages, search overlay. They work and use the new fonts/containers but were not redrawn to a design (no PDF page was supplied for them).
