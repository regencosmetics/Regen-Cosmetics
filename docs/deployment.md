# Deployment

## Option A — one service (simplest)
1. `npm run install:all && npm run build` (builds `client/dist`).
2. Set `NODE_ENV=production`, `SERVE_CLIENT=true`, all secrets, `CLIENT_URL`/`SERVER_URL` = the public URL, `TRUST_PROXY=1`.
3. `npm start` behind HTTPS (Render, Railway, Fly, a VPS with nginx/Caddy…). Cookies are `Secure` in production, so HTTPS is mandatory.
4. `npm run seed:admin` once. **Do not** run `seed:catalog` in production unless you want the demo products.

## Option B — split (static client + API)
* API: as above with `SERVE_CLIENT=false`, `CORS_ORIGINS=https://shop.example.com`, `COOKIE_SAMESITE=none`.
* Client: build with `VITE_API_BASE_URL=https://api.example.com/api/v1`, host `client/dist` on any static host with an SPA fallback to `index.html`. You lose server-side head injection and the dynamic sitemap on the static host (point `/sitemap.xml` at the API).

## Checklist before going live
- [ ] Real Razorpay **live** keys + webhook configured and a real ₹ test payment, refund and webhook delivery performed
- [ ] Cloudinary configured; Resend domain verified (SPF/DKIM) and `npm --prefix server run email:test -- you@…` delivered to a real inbox
- [ ] Strong unique `JWT_SECRET`, `COOKIE_SECRET`, `DATA_ENCRYPTION_KEY`; admin password rotated
- [ ] MongoDB backups on, network-restricted
- [ ] Admin → Website content: replace draft FAQ answers, **Privacy Policy** body (not in the supplied design), contact details, social links, business/GSTIN details, real testimonials
- [ ] Remove sample catalog (`isSample:true`) and sample reviews; add real products/images
- [ ] Legal review of the Terms / Shipping & Return text
- [ ] Log shipping/courier tracking manually in Admin → Orders (no courier API is integrated)
