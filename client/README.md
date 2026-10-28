# REGEN Cosmetics — Web
`npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run test:e2e` (needs a running server that serves the built client; see `../docs/environment-setup.md`).
Customer pages live in `src/pages/{customer,products,cart,checkout,account,orders,legal}`, the admin panel in `src/pages/admin`. State: Redux Toolkit slices in `src/store`. Design tokens are in `tailwind.config.js`.
