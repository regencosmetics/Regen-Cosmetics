import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Tag } from 'lucide-react';
import OffersList, { useOffers } from './OffersList.jsx';
import { applyCoupon, removeCoupon } from '@/store/cartSlice';
import { inr } from '@/utils/format';

/** Coupon entry + the list of available offers; used on the checkout page. */
export default function CouponBox() {
  const dispatch = useDispatch(); const { coupon, couponError, pricing } = useSelector((s) => s.cart);
  const { data: offers } = useOffers(); const [code, setCode] = useState('');
  const apply = async (e) => { e.preventDefault(); if (!code.trim()) return; const r = await dispatch(applyCoupon(code.trim())); if (applyCoupon.rejected.match(r)) toast.error(r.payload); else { toast.success('Coupon applied'); setCode(''); } };
  return (
    <section aria-label="Coupons and offers" className="rounded-lg border border-neutral-300 bg-white p-4 shadow-sm md:p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy"><Tag className="h-5 w-5" />Coupons &amp; Offers</h2>
      {coupon ? (
        <div className="mt-3 flex items-center justify-between rounded border border-deal bg-green-50 px-3 py-2.5 text-sm"><span><b className="font-mono">{coupon.code}</b> applied{pricing?.discount > 0 && <span className="ml-1 font-semibold text-deal">− {inr(pricing.discount)}</span>}</span><button type="button" className="font-semibold text-red-600 underline" onClick={() => dispatch(removeCoupon())}>Remove</button></div>
      ) : (
        <form onSubmit={apply} className="mt-3 flex gap-2">
          <label htmlFor="co-coupon" className="sr-only">Coupon code</label>
          <input id="co-coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter Coupon Code" autoComplete="off" className="h-[42px] min-w-0 flex-1 rounded-[3px] border border-dashed border-neutral-500 bg-neutral-100 px-3 text-sm uppercase placeholder:normal-case focus:border-brand focus:outline-none" />
          <button type="submit" className="h-[42px] rounded-[3px] bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-600 active:scale-95">Apply</button>
        </form>
      )}
      {couponError && !coupon && <p role="alert" className="mt-2 text-xs text-red-600">{couponError.message}</p>}
      {offers?.length > 0 && <div className="mt-4"><p className="mb-2 text-sm font-semibold text-black">Available offers ({offers.length})</p><OffersList offers={offers} /></div>}
    </section>
  );
}
