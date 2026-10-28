export const inr = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const inrShort = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const dateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—');
export const timeAgo = (d) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  for (const [u, n] of [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]) if (s >= n) return `${Math.floor(s / n)} ${u}${Math.floor(s / n) > 1 ? 's' : ''} ago`;
  return 'just now';
};
export const effectivePrice = (v) => (v.salePrice != null && v.salePrice < v.price ? v.salePrice : v.price);
export const discountPct = (v) => (v.price > 0 ? Math.round(((v.price - effectivePrice(v)) / v.price) * 100) : 0);
export const totalStock = (p) => (p.variants || []).filter((v) => v.active !== false).reduce((s, v) => s + v.stock, 0);
export const productImage = (p, i = 0) => p?.images?.[i]?.url || '/assets/logo.png';
export const downloadBlob = (blob, name) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); };
export const newIdempotencyKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
