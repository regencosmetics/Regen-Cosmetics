import env from '../config/env.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => `Rs ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const layout = (title, body) => `<!doctype html><html><body style="margin:0;background:#f2f4f8;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:#050a30;color:#fff;padding:20px 28px;font-size:22px;letter-spacing:2px;font-weight:bold">REGEN <span style="font-weight:normal;font-size:12px">COSMETICS</span></td></tr>
<tr><td style="padding:28px"><h2 style="margin:0 0 16px;color:#0a2a78">${esc(title)}</h2>${body}</td></tr>
<tr><td style="background:#0a2a78;color:#cfd8f5;padding:16px 28px;font-size:12px">&copy; ${new Date().getFullYear()} REGEN COSMETICS. This is an automated message.</td></tr>
</table></td></tr></table></body></html>`;

const btn = (href, label) => `<p><a href="${esc(href)}" style="display:inline-block;background:#0a2a78;color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:bold">${esc(label)}</a></p>`;
const itemsTable = (order) => `<table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
<tr style="background:#eef3ff"><th align="left">Item</th><th>Qty</th><th align="right">Amount</th></tr>
${order.items.map((i) => `<tr><td style="border-bottom:1px solid #eee">${esc(i.name)}${i.variantLabel ? ` (${esc(i.variantLabel)})` : ''}</td><td align="center" style="border-bottom:1px solid #eee">${i.quantity}</td><td align="right" style="border-bottom:1px solid #eee">${inr(i.lineTotal)}</td></tr>`).join('')}
<tr><td colspan="2" align="right">Discount</td><td align="right">- ${inr(order.pricing.discount || 0)}</td></tr>
<tr><td colspan="2" align="right">Shipping</td><td align="right">${inr(order.pricing.shipping || 0)}</td></tr>
<tr><td colspan="2" align="right"><b>Total</b></td><td align="right"><b>${inr(order.pricing.total)}</b></td></tr></table>`;
const orderUrl = (o) => `${env.CLIENT_URL}/account/orders/${o._id}`;

const t = (subject, title, body) => ({ subject, html: layout(title, body), text: `${title}\n\n${body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}` });

export const templates = {
  welcome: (u) => t('Welcome to REGEN Cosmetics', `Welcome, ${u.name}!`, `<p>Your account has been created. Skincare made simple starts here.</p>${btn(env.CLIENT_URL + '/shop', 'Start shopping')}`),
  passwordReset: (u, url) => t('Reset your REGEN password', 'Password reset', `<p>Hi ${esc(u.name)}, we received a request to reset your password. This link expires in 60 minutes and can be used once.</p>${btn(url, 'Reset password')}<p style="font-size:12px;color:#666">If you did not request this, you can ignore this email.</p>`),
  orderConfirmation: (o) => t(`Order ${o.orderNumber} confirmed`, 'Thank you for your order', `<p>Hi ${esc(o.customer.name)}, your order <b>${esc(o.orderNumber)}</b> has been placed.</p>${itemsTable(o)}<p>Payment: ${o.paymentMethod === 'cod' ? 'Cash on Delivery (pay when delivered)' : 'Paid online'}</p>${btn(orderUrl(o), 'View order')}`),
  paymentConfirmation: (o) => t(`Payment received for ${o.orderNumber}`, 'Payment received', `<p>We received your payment of <b>${inr(o.pricing.total)}</b> for order ${esc(o.orderNumber)}.</p>${btn(orderUrl(o), 'View order')}`),
  paymentFailure: (o) => t(`Payment failed for ${o.orderNumber}`, 'Payment failed', `<p>Your payment for order ${esc(o.orderNumber)} could not be completed. No order will be shipped until payment succeeds. You can try again from your cart.</p>${btn(env.CLIENT_URL + '/cart', 'Return to cart')}`),
  orderCancelled: (o, refundNote) => t(`Order ${o.orderNumber} cancelled`, 'Order cancelled', `<p>Your order ${esc(o.orderNumber)} has been cancelled.${refundNote ? ' ' + esc(refundNote) : ''}</p>${btn(orderUrl(o), 'View order')}`),
  orderShipped: (o) => t(`Order ${o.orderNumber} has shipped`, 'Your order is on its way', `<p>Order ${esc(o.orderNumber)} has been shipped.${o.tracking?.carrier ? ` Carrier: ${esc(o.tracking.carrier)}.` : ''}${o.tracking?.trackingNumber ? ` Tracking number: <b>${esc(o.tracking.trackingNumber)}</b>.` : ''}</p>${o.tracking?.url ? btn(o.tracking.url, 'Track shipment') : ''}${btn(orderUrl(o), 'View order')}`),
  orderDelivered: (o) => t(`Order ${o.orderNumber} delivered`, 'Delivered', `<p>Your order ${esc(o.orderNumber)} has been delivered. If anything is wrong, you can request a return within the policy window.</p>${btn(orderUrl(o), 'View order')}`),
  returnReceived: (r, o) => t(`Return ${r.returnNumber} received`, 'We received your return request', `<p>Return <b>${esc(r.returnNumber)}</b> for order ${esc(o.orderNumber)} is under review. We will update you by email.</p>${btn(`${env.CLIENT_URL}/account/returns/${r._id}`, 'Track return')}`),
  returnDecision: (r, o) => t(`Return ${r.returnNumber} ${r.status.toLowerCase()}`, `Return ${r.status}`, `<p>Your return <b>${esc(r.returnNumber)}</b> for order ${esc(o.orderNumber)} is now <b>${esc(r.status)}</b>.${r.rejectionReason ? ` Reason: ${esc(r.rejectionReason)}` : ''}</p>${btn(`${env.CLIENT_URL}/account/returns/${r._id}`, 'View return')}`),
  refundUpdate: (r, o, amount, status) => t(`Refund ${status.toLowerCase()} for ${o.orderNumber}`, `Refund ${status}`, `<p>Your refund of <b>${inr(amount)}</b> for order ${esc(o.orderNumber)} is <b>${esc(status)}</b>. Bank timelines may vary by provider.</p>${btn(orderUrl(o), 'View order')}`),
  newsletter: (url) => t('You are subscribed to REGEN updates', 'Thanks for subscribing', `<p>You will receive skincare tips and product updates.</p><p style="font-size:12px"><a href="${esc(url)}">Unsubscribe</a></p>`),
  contactNotice: (m) => t(`New contact message from ${m.name}`, 'New contact message', `<p><b>${esc(m.name)}</b> &lt;${esc(m.email)}&gt; ${esc(m.phone || '')}</p><p>${esc(m.message).replace(/\n/g, '<br>')}</p>`),
};
