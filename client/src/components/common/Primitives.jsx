import { Link } from 'react-router-dom';
import { Star, Minus, Plus, ChevronLeft, ChevronRight, Check, Circle } from 'lucide-react';
import { inr, effectivePrice, discountPct } from '@/utils/format';

export function StarRating({ value = 0, size = 16, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} width={size} height={size} className={n <= Math.round(value) ? 'fill-brand text-brand' : 'text-brand'} aria-hidden="true" />)}
    </span>
  );
}
export function RatingPicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)}>
          <Star className={`h-7 w-7 ${n <= value ? 'fill-brand text-brand' : 'text-neutral-400'}`} />
        </button>
      ))}
    </div>
  );
}
export function QuantityControl({ value, onChange, min = 1, max = 20, disabled, small }) {
  const b = `flex ${small ? 'h-7 w-7' : 'h-9 w-9'} items-center justify-center hover:bg-neutral-200 disabled:opacity-40`;
  return (
    <div className="inline-flex items-center rounded-[3px] border border-neutral-400 bg-neutral-100" role="group" aria-label="Quantity">
      <button type="button" className={b} aria-label="Decrease quantity" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}><Minus className="h-3 w-3" /></button>
      <span className={`min-w-[2rem] text-center text-sm ${small ? '' : 'px-1'}`} aria-live="polite">{value}</span>
      <button type="button" className={b} aria-label="Increase quantity" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}><Plus className="h-3 w-3" /></button>
    </div>
  );
}
export function DiscountBadge({ pct, className = '' }) { return pct > 0 ? <span className={`font-semibold text-deal ${className}`}>{pct}% off</span> : null; }
export function PriceDisplay({ variant, size = 'md', taxNote = false, price, mrp }) {
  const sale = price ?? effectivePrice(variant); const regular = mrp ?? variant?.price; const pct = regular > 0 ? Math.round(((regular - sale) / regular) * 100) : 0;
  const big = size === 'lg';
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={`font-bold text-black ${big ? 'text-xl sm:text-2xl' : 'text-sm'}`}>{inr(sale).replace('Rs ', 'Rs. ')}</span>
        {pct > 0 && <><s className={`text-neutral-500 ${big ? 'text-xs' : 'text-[10px]'}`}>{inr(regular).replace('Rs ', 'Rs ')}</s><DiscountBadge pct={pct} className={big ? 'text-sm' : 'text-xs'} /></>}
      </div>
      {taxNote && <p className="text-[11px] text-neutral-700">(Inclusive of all taxes)</p>}
    </div>
  );
}
export function StatusBadge({ status }) {
  const map = { Delivered: 'bg-green-100 text-green-800', Confirmed: 'bg-blue-100 text-blue-800', Processing: 'bg-indigo-100 text-indigo-800', Shipped: 'bg-sky-100 text-sky-800', 'Out for Delivery': 'bg-sky-100 text-sky-800', Pending: 'bg-amber-100 text-amber-800', Cancelled: 'bg-red-100 text-red-800', Rejected: 'bg-red-100 text-red-800', Failed: 'bg-red-100 text-red-800', Paid: 'bg-green-100 text-green-800', Refunded: 'bg-neutral-200 text-neutral-800', 'Refund Completed': 'bg-green-100 text-green-800', Completed: 'bg-green-100 text-green-800', approved: 'bg-green-100 text-green-800', pending: 'bg-amber-100 text-amber-800', rejected: 'bg-red-100 text-red-800', 'Refund Processing': 'bg-amber-100 text-amber-800', Approved: 'bg-green-100 text-green-800' };
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || 'bg-neutral-100 text-neutral-800'}`}>{status}</span>;
}
export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="py-3 text-xs text-neutral-600">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => <li key={i} className="flex items-center gap-1">{i > 0 && <span aria-hidden="true">/</span>}{it.to ? <Link to={it.to} className="hover:underline">{it.label}</Link> : <span aria-current="page" className="font-semibold text-navy">{it.label}</span>}</li>)}
      </ol>
    </nav>
  );
}
export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const nums = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className="p-1 text-neutral-600 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
      {nums.map((n, i) => n === '…' ? <span key={i} aria-hidden="true">…</span> : (
        <button key={n} type="button" aria-label={`Page ${n}`} aria-current={n === page ? 'page' : undefined} onClick={() => onChange(n)}
          className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${n === page ? 'border-brand bg-brand text-white' : 'border-neutral-400 text-neutral-700 hover:border-brand'}`}>{n}</button>
      ))}
      <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)} className="p-1 text-brand disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
    </nav>
  );
}
export function Timeline({ steps, current, history = [], cancelled }) {
  const idx = steps.indexOf(current);
  const at = (s) => history.find((h) => h.status === s)?.at;
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const done = !cancelled && i <= idx; const active = !cancelled && i === idx;
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-0.5 ${done && i < idx ? 'bg-brand' : 'bg-neutral-300'}`} aria-hidden="true" />}
            <span className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-brand bg-brand text-white' : 'border-neutral-300 bg-white text-neutral-300'}`}>{done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2" />}</span>
            <div><p className={`text-sm ${active ? 'font-bold text-brand' : done ? 'font-semibold' : 'text-neutral-500'}`}>{s}</p>{at(s) && <p className="text-xs text-neutral-500">{new Date(at(s)).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>}</div>
          </li>
        );
      })}
    </ol>
  );
}
export { discountPct };
