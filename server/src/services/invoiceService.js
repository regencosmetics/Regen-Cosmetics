import PDFDocument from 'pdfkit';
import { getCms } from './cmsService.js';

const inr = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const NAVY = '#0a2a78';

function collect(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
  });
}

export async function buildInvoicePdf(order) {
  const biz = await getCms('business');
  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Invoice ${order.invoiceNumber || order.orderNumber}` } });
  const done = collect(doc);
  doc.rect(0, 0, doc.page.width, 70).fill('#050a30');
  doc.fillColor('#fff').fontSize(24).text('REGEN', 40, 24, { continued: true }).fontSize(10).text('  COSMETICS');
  doc.fillColor('#000').fontSize(18).text('TAX INVOICE', 40, 90);
  doc.fontSize(10).fillColor('#333');
  doc.text(`Invoice No: ${order.invoiceNumber || '-'}`, 40, 118).text(`Order No: ${order.orderNumber}`).text(`Invoice date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`);
  doc.text(`Payment: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)'}`).text(`Payment status: ${order.paymentStatus}`);
  const seller = [biz.legalName, biz.address, biz.gstin ? `GSTIN: ${biz.gstin}` : null, biz.email, biz.phone].filter(Boolean);
  doc.fontSize(10).fillColor('#000').text('Sold by', 330, 118, { width: 220 });
  doc.fillColor('#333').text(seller.length ? seller.join('\n') : 'Seller details not configured', 330, 132, { width: 220 });
  const a = order.shippingAddress || {};
  doc.fillColor('#000').text('Billed / shipped to', 40, 190).fillColor('#333')
    .text([order.customer?.name || a.fullName, a.line1, a.line2, [a.city, a.state, a.pincode].filter(Boolean).join(', '), a.country, `Phone: ${a.phone || order.customer?.phone || ''}`].filter(Boolean).join('\n'), 40, 204, { width: 260 });
  let y = 290;
  doc.rect(40, y, 515, 20).fill(NAVY).fillColor('#fff').fontSize(9);
  doc.text('Item', 46, y + 6).text('SKU', 270, y + 6).text('Qty', 340, y + 6).text('Unit', 380, y + 6).text('Disc.', 440, y + 6).text('Total', 495, y + 6);
  y += 26; doc.fillColor('#000');
  for (const it of order.items) {
    if (y > 740) { doc.addPage(); y = 50; }
    doc.text(`${it.name}${it.variantLabel ? ` (${it.variantLabel})` : ''}`, 46, y, { width: 215 });
    const h = doc.heightOfString(`${it.name}${it.variantLabel ? ` (${it.variantLabel})` : ''}`, { width: 215 });
    doc.text(it.sku, 270, y).text(String(it.quantity), 340, y).text(inr(it.unitPrice), 372, y, { width: 62 }).text(inr(it.discountShare), 432, y, { width: 55 }).text(inr(it.netTotal), 488, y, { width: 64, align: 'right' });
    y += Math.max(h, 14) + 8;
    doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#ddd').stroke();
  }
  y += 6;
  const row = (label, val, bold) => { doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, 340, y).text(val, 440, y, { width: 112, align: 'right' }); y += 16; };
  row('Subtotal', inr(order.pricing.subtotal));
  if (order.pricing.discount) row(`Discount${order.pricing.couponCode ? ` (${order.pricing.couponCode})` : ''}`, `- ${inr(order.pricing.discount)}`);
  row('Shipping', inr(order.pricing.shipping));
  if (order.pricing.codFee) row('COD fee', inr(order.pricing.codFee));
  row('Total', inr(order.pricing.total), true);
  doc.font('Helvetica').fontSize(8).fillColor('#666');
  doc.text(biz.taxNote || 'Prices are inclusive of all applicable taxes.', 40, y + 20, { width: 515 });
  doc.end();
  return done;
}

export async function buildShippingLabelPdf(order) {
  const biz = await getCms('business');
  const doc = new PDFDocument({ size: [288, 432], margin: 16, info: { Title: `Label ${order.orderNumber}` } });
  const done = collect(doc);
  const a = order.shippingAddress || {};
  doc.rect(8, 8, 272, 416).lineWidth(1.5).stroke('#000');
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#000').text('REGEN COSMETICS', 16, 18);
  doc.font('Helvetica').fontSize(8).text(`Order: ${order.orderNumber}`, 16, 38).text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`);
  doc.moveTo(16, 64).lineTo(272, 64).stroke();
  doc.font('Helvetica-Bold').fontSize(9).text('SHIP TO', 16, 72);
  doc.font('Helvetica-Bold').fontSize(13).text(a.fullName || order.customer?.name || '', 16, 86, { width: 250 });
  doc.font('Helvetica').fontSize(11).text([a.line1, a.line2, a.landmark, `${a.city || ''}, ${a.state || ''}`, `PIN: ${a.pincode || ''}`].filter(Boolean).join('\n'), 16, doc.y + 2, { width: 250 });
  doc.text(`Phone: ${a.phone || ''}`, 16, doc.y + 6);
  doc.moveTo(16, doc.y + 8).lineTo(272, doc.y + 8).stroke();
  doc.font('Helvetica-Bold').fontSize(11).text(order.paymentMethod === 'cod' ? `COD - COLLECT ${inr(order.pricing.total)}` : 'PREPAID', 16, doc.y + 16);
  doc.font('Helvetica').fontSize(9);
  if (order.tracking?.trackingNumber) doc.text(`Carrier: ${order.tracking.carrier || '-'}\nTracking: ${order.tracking.trackingNumber}`, 16, doc.y + 8);
  doc.text(`Items: ${order.items.reduce((s, i) => s + i.quantity, 0)}`, 16, doc.y + 8);
  doc.fontSize(8).text(order.items.map((i) => `${i.quantity} x ${i.name} [${i.sku}]`).join('\n'), 16, doc.y + 4, { width: 250 });
  const from = [biz.legalName, biz.address, biz.phone].filter(Boolean).join(', ');
  if (from) doc.fontSize(7).text(`Return address: ${from}`, 16, 390, { width: 250 });
  doc.end();
  return done;
}
