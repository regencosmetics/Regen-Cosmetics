import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { BadgePercent } from 'lucide-react';
import { applyCoupon, removeCoupon } from '@/store/cartSlice';
import { useFetch } from '@/hooks';
import { cartApi } from '@/services';
import { inrShort } from '@/utils/format';

export const describe = (c) => (c.type === 'percent' ? `${c.value}% OFF${c.maxDiscount ? ` up to ${inrShort(c.maxDiscount)}` : ''}` : `${inrShort(c.value)} OFF`);

export function useOffers() { return useFetch(async () => (await cartApi.offers()).items || [], []); }

/** Lists every public coupon with a one-tap Apply / Remove, marking the applied one and the ones not yet eligible. */
export default function OffersList({ offers, onApplied }) {
  const dispatch = useDispatch(); const { coupon, pricing } = useSelector((s) => s.cart);
  const subtotal = pricing?.subtotal || 0;
  const apply = async (code) => {
    const r = await dispatch(applyCoupon(code));
    if (applyCoupon.rejected.match(r)) toast.error(r.payload); else { toast.success(`${code} applied`); onApplied?.(code); }
  };
  if (!offers?.length) return <p className="py-6 text-center text-sm text-neutral-600">No offers are available right now.</p>;
  return (
    <ul className="space-y-3">
      {offers.map((c) => {
        const applied = coupon?.code === c.code; const short = c.minOrderAmount > subtotal ? c.minOrderAmount - subtotal : 0;
        return (
          <li key={c._id || c.code} className={`rounded-lg border bg-white p-3 transition ${applied ? 'border-deal shadow-[0_0_0_1px_#16b31a]' : 'border-neutral-300'}`}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded bg-sky-100 text-brand"><BadgePercent className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2"><span className="rounded border border-dashed border-brand px-2 py-0.5 font-mono text-sm font-bold tracking-wide text-brand">{c.code}</span><span className="text-sm font-semibold text-deal">{describe(c)}</span></p>
                {c.description && <p className="mt-1 text-xs text-neutral-700">{c.description.replace(/\s*\(sample coupon\)/i, '')}</p>}
                <p className="mt-0.5 text-xs text-neutral-600">{c.minOrderAmount > 0 ? `Valid on orders of ${inrShort(c.minOrderAmount)} or more` : 'No minimum order'}{c.expiresAt ? ` · Expires ${new Date(c.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}` : ''}</p>
                {short > 0 && !applied && subtotal > 0 && <p className="mt-0.5 text-xs font-semibold text-amber-700">Add {inrShort(short)} more to unlock</p>}
              </div>
              {applied ? <button type="button" onClick={() => dispatch(removeCoupon())} className="shrink-0 rounded border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Remove</button>
                : <button type="button" onClick={() => apply(c.code)} disabled={subtotal === 0} className="shrink-0 rounded bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-600 disabled:opacity-40">Apply</button>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
