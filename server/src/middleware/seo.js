import fs from 'node:fs';
import path from 'node:path';
import env from '../config/env.js';
import { Product } from '../models/index.js';
import { getCms } from '../services/cmsService.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Server-side <head> injection so crawlers and link-preview bots get real metadata + Product JSON-LD even though
// the page body is rendered client-side. Used only when SERVE_CLIENT=true (single-origin deployment).
export function seoMiddleware(distDir) {
  const indexPath = path.join(distDir, 'index.html');
  return async (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || path.extname(req.path)) return next();
    let html;
    try { html = fs.readFileSync(indexPath, 'utf8'); } catch { return next(); }
    const base = env.CLIENT_URL.replace(/\/$/, '');
    const seo = await getCms('seo').catch(() => ({}));
    let title = seo.siteTitle; let desc = seo.siteDescription; let ogImage = ''; let ld = '';
    const m = req.path.match(/^\/products\/([a-z0-9-]+)$/);
    if (m) {
      const p = await Product.findOne({ slug: m[1], isActive: true }).catch(() => null);
      if (p) {
        title = p.seo?.title || `${p.name} | REGEN Cosmetics`; desc = p.seo?.description || p.shortDescription || p.description?.slice(0, 160) || desc;
        const abs = (u) => (u?.startsWith('http') ? u : `${base}${u}`);
        ogImage = p.images?.[0]?.url ? abs(p.images[0].url) : '';
        const v = p.variants.find((x) => x.active !== false) || p.variants[0];
        const price = v && (v.salePrice != null && v.salePrice < v.price ? v.salePrice : v.price);
        const data = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: desc, sku: p.sku, image: p.images.map((i) => abs(i.url)), brand: { '@type': 'Brand', name: 'REGEN Cosmetics' },
          offers: { '@type': 'Offer', priceCurrency: env.DEFAULT_CURRENCY, price: String(price), availability: p.variants.some((x) => x.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${base}/products/${p.slug}` } };
        if (p.ratingCount > 0) data.aggregateRating = { '@type': 'AggregateRating', ratingValue: p.ratingAverage, reviewCount: p.ratingCount }; // only real, approved reviews
        ld = `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
      }
    }
    const tags = `<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(base + req.path)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(base + req.path)}"><meta property="og:type" content="${m ? 'product' : 'website'}">${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}${ld}`;
    html = html.replace(/<title>.*?<\/title>/s, '').replace('</head>', `${tags}</head>`);
    res.type('html').send(html);
  };
}
