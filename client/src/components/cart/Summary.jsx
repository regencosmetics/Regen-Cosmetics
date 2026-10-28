import { inr } from '@/utils/format';

export function Summary({ pricing, children }) {
  return (
    <div className="space-y-2 rounded-lg border border-neutral-300 bg-white p-4 shadow-sm md:p-5">
      <h2 className="font-display text-lg font-semibold text-navy">Order Summary</h2>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(pricing.subtotal)}</dd></div>
        {pricing.discount > 0 && <div className="flex justify-between font-semibold text-deal"><dt>Coupon {pricing.couponCode && `(${pricing.couponCode})`}</dt><dd>- {inr(pricing.discount)}</dd></div>}
        <div className="flex justify-between"><dt>Shipping</dt><dd>{pricing.shipping === 0 ? 'FREE' : inr(pricing.shipping)}</dd></div>
        {pricing.codFee > 0 && <div className="flex justify-between"><dt>COD fee</dt><dd>{inr(pricing.codFee)}</dd></div>}
        <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{inr(pricing.total)}</dd></div>
        {pricing.savings > 0 && <p className="rounded bg-[#16b79c] px-2 py-1 text-center text-xs font-bold text-white">₹{Number(pricing.savings).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Saved So Far!</p>}
      </dl>
      {children}
    </div>
  );
}
