import crypto from 'node:crypto';
import { Message, NewsletterSubscriber, Banner, Product } from '../models/index.js';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler, ok, randomToken } from '../utils/helpers.js';
import { getCms } from '../services/cmsService.js';
import { PUBLIC_CMS_KEYS } from '../services/cmsDefaults.js';
import { queueEmail } from '../services/emailService.js';
import { templates } from '../templates/emails.js';

export const contact = asyncHandler(async (req, res) => {
  if (req.body.website) return ok(res, {}, 'Thanks! Our team will get in touch soon.'); // honeypot hit: silently accept
  const { name, email, phone, message } = req.body;
  const m = await Message.create({ name, email, phone: phone || undefined, message, ip: req.ip });
  const cms = await getCms('contact');
  const to = env.SUPPORT_EMAIL_TO || cms.email;
  if (to) await queueEmail('contact_notice', to, templates.contactNotice(m), `contact:${m._id}`);
  ok(res, {}, 'Thanks! Our team will get in touch within 3 to 5 business days.', 201);
});

export const subscribe = asyncHandler(async (req, res) => {
  if (req.body.website) return ok(res, {}, 'Subscribed');
  const { email } = req.body;
  let sub = await NewsletterSubscriber.findOne({ email }).select('+unsubscribeToken');
  if (sub?.status === 'subscribed') return ok(res, {}, 'You are already subscribed');
  if (sub) { sub.status = 'subscribed'; sub.subscribedAt = new Date(); sub.unsubscribedAt = undefined; await sub.save(); }
  else sub = await NewsletterSubscriber.create({ email, unsubscribeToken: randomToken(24) });
  await queueEmail('newsletter', email, templates.newsletter(`${env.CLIENT_URL}/unsubscribe?token=${sub.unsubscribeToken}`), `newsletter:${sub._id}:${sub.subscribedAt.getTime()}`);
  ok(res, {}, 'Thanks for subscribing!', 201);
});

export const unsubscribe = asyncHandler(async (req, res) => {
  const token = String(req.body.token || '');
  if (token.length < 20) throw new AppError('Invalid unsubscribe link', 400, 'INVALID_TOKEN');
  const res2 = await NewsletterSubscriber.updateOne({ unsubscribeToken: token }, { status: 'unsubscribed', unsubscribedAt: new Date() });
  if (!res2.matchedCount) throw new AppError('Invalid unsubscribe link', 400, 'INVALID_TOKEN');
  ok(res, {}, 'You have been unsubscribed');
});

export const banners = asyncHandler(async (req, res) => {
  const now = new Date();
  const items = await Banner.find({ isActive: true, ...(req.query.placement ? { placement: String(req.query.placement) } : {}) }).sort({ sortOrder: 1 });
  ok(res, { items: items.filter((b) => (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt >= now)) });
});

export const cms = asyncHandler(async (req, res) => {
  const key = req.params.key;
  if (!PUBLIC_CMS_KEYS.includes(key)) throw new AppError('Content not found', 404, 'NOT_FOUND');
  res.set('Cache-Control', 'public, max-age=30');
  ok(res, { content: await getCms(key) });
});

export const sitemap = asyncHandler(async (_req, res) => {
  const base = env.CLIENT_URL.replace(/\/$/, '');
  const prods = await Product.find({ isActive: true }).select('slug updatedAt');
  const statics = ['', '/shop', '/about', '/contact', '/faq', '/shipping-returns', '/privacy-policy', '/terms', '/track-order'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
    ...statics.map((p) => `<url><loc>${base}${p}</loc></url>`),
    ...prods.map((p) => `<url><loc>${base}/products/${p.slug}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`),
  ].join('\n')}\n</urlset>`;
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(xml);
});
void crypto;
