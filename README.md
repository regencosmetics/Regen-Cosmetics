# REGEN Cosmetics — MERN e-commerce platform

Men's-skincare storefront + admin panel built from the supplied desktop designs and the 393 px mobile reference set.

**Stack** — React 18, Vite, Tailwind, React Router, Redux Toolkit, Axios, Framer Motion, react-hook-form + zod · Express, MongoDB/Mongoose, JWT (httpOnly cookie) + CSRF, bcrypt, Razorpay, Cloudinary, **Resend** (email), pdfkit, pino.

## Quick start
```bash
npm run install:all
cp server/.env.example server/.env        # set MONGODB_URI and three random secrets (see docs/environment-setup.md)
npm run seed:admin                        # admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed:catalog                      # optional demo products (flagged isSample)
npm run dev                               # http://localhost:5173  (API :5000)
```
Admin panel: `/admin` (log in with the seeded admin). Production: `npm run build && SERVE_CLIENT=true npm start` — see [docs/deployment.md](docs/deployment.md).

## What works without any third-party account
Browsing, search, cart (guest + merge on login), accounts, wishlist, reviews, **Cash on Delivery** checkout, order tracking, cancellation, returns (image evidence needs Cloudinary), admin panel, CMS editing. Online payment, image upload and email switch on when you add Razorpay / Cloudinary / Resend keys; until then the UI and API say plainly that they are unavailable (nothing is faked).

## Tests
```bash
npm test                         # 76 server tests (real MongoDB) + 20 client tests
npm run lint
npm --prefix client run test:e2e # Playwright smoke tests (see docs/environment-setup.md)
```

## Documentation
[docs/architecture.md](docs/architecture.md) · [docs/api-documentation.md](docs/api-documentation.md) · [docs/database-schema.md](docs/database-schema.md) · [docs/environment-setup.md](docs/environment-setup.md) · [docs/deployment.md](docs/deployment.md) · **[PROJECT_STATUS.md](PROJECT_STATUS.md) — what is verified, what is not, and what you must do before launch.**
