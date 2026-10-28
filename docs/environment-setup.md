# Environment setup

Requirements: Node.js ≥ 20 (developed on 22), MongoDB ≥ 6 (local or Atlas).

```bash
npm run install:all          # installs root, server and client dependencies
cp server/.env.example server/.env      # then edit (see below)
cp client/.env.example client/.env      # optional
npm run seed:admin           # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed:catalog         # sample products/categories (flagged isSample) – skip in production
npm run dev                  # API on :5000, client on :5173 (proxying /api)
```

## Server variables (`server/.env`)
Only the first group is required to boot; everything else degrades gracefully and the app reports what is disabled at start-up.

| Variable | Meaning |
|---|---|
| `MONGODB_URI` | connection string |
| `JWT_SECRET`, `COOKIE_SECRET`, `DATA_ENCRYPTION_KEY` | **required in production**, ≥ 32 random chars each (`openssl rand -hex 32`). Changing `DATA_ENCRYPTION_KEY` makes stored payout details unreadable |
| `CLIENT_URL`, `CORS_ORIGINS` | allowed browser origins |
| `COOKIE_SAMESITE`, `COOKIE_DOMAIN` | use `none` + HTTPS when client and API are on different sites |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | used only by `seed:admin` (strong password enforced; never commit) |
| `RAZORPAY_KEY_ID/KEY_SECRET/WEBHOOK_SECRET` | enable online payments. Without them only COD is offered |
| `CLOUDINARY_*` | enable image uploads (admin product/banner images, return evidence) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SUPPORT_EMAIL_TO` | enable email via [Resend](https://resend.com). `EMAIL_FROM` must be on a domain you have verified in Resend (the default `onboarding@resend.dev` only delivers to your own Resend account address). Without a key emails are recorded as `skipped`. Verify with `npm --prefix server run email:test -- you@example.com` |
| `PASSWORD_RESET_URL` | front-end reset page, e.g. `https://shop.example.com/reset-password` |
| `RETURN_WINDOW_DAYS` | default return window (per-product override available) |
| `SHIPPING_CONFIGURATION` | JSON `{"freeShippingThreshold":999,"flatRate":49,"codFee":0}` |
| `COD_ENABLED`, `COD_MIN_ORDER`, `COD_MAX_ORDER` | COD rules (0 = no limit) |
| `PAYMENT_RESERVATION_MINUTES` | how long unpaid online orders hold stock |
| `REVIEW_AUTO_APPROVE`, `REVIEW_VERIFIED_ONLY` | review moderation |
| `TRUST_PROXY` | set to the number of proxies in front of the API (needed for correct rate limiting/IPs) |
| `SERVE_CLIENT`, `CLIENT_DIST` | serve the built client from Express (enables SEO head injection, sitemap) |

Client: `VITE_API_BASE_URL` (default `/api/v1`).

## Razorpay webhook
Dashboard → Webhooks → URL `https://<api-host>/api/v1/payments/webhook`, secret = `RAZORPAY_WEBHOOK_SECRET`, events `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`, `order.paid`.

## Tests
```bash
npm test                 # server (needs MongoDB) then client
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/regen_test npm --prefix server test
npm --prefix client test
# browser smoke tests (build the client first; server must run with SERVE_CLIENT=true)
npm --prefix client run build && SERVE_CLIENT=true npm --prefix server start &
BASE_URL=http://localhost:5000 ADMIN_EMAIL=… ADMIN_PASSWORD=… npm --prefix client run test:e2e
```
If `TEST_MONGODB_URI` is unset the server tests start `mongodb-memory-server` (which downloads a MongoDB binary).

## Configuration lives in the admin panel
Only the bootstrap values are required in `.env`: `MONGODB_URI`, `JWT_SECRET`, `COOKIE_SECRET`, `CLIENT_URL`, `SERVER_URL` and the first `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
Everything else (Razorpay keys, Resend key and sender, Cloudinary, shipping charges, COD rules, return window, review rules) is edited in **Admin → Settings**.
Values saved there are stored in the database (secrets AES-256-GCM encrypted with `DATA_ENCRYPTION_KEY`, falling back to `COOKIE_SECRET`) and override the matching `.env` variable. Resetting a field falls back to `.env`.
Set a stable `DATA_ENCRYPTION_KEY`: changing it makes saved secrets unreadable (they then fall back to `.env`).
