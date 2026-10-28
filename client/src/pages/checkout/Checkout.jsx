import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Seo from '@/components/common/Seo.jsx';
import FormField from '@/components/common/FormField.jsx';
import { PageLoader, EmptyState } from '@/components/common/Feedback.jsx';
import { Summary } from '@/components/cart/Summary.jsx';
import CouponBox from '@/components/cart/CouponBox.jsx';
import { useFetch } from '@/hooks';
import { accountApi, checkoutApi } from '@/services';
import { errorMessage } from '@/services/api';
import { loadCart, clearAfterOrder } from '@/store/cartSlice';
import { addressSchema, zodResolver } from '@/utils/schemas';
import { INDIAN_STATES } from '@/constants';
import { newIdempotencyKey, inr } from '@/utils/format';
import { loadRazorpay } from '@/utils/razorpay';

export default function Checkout() {
  const nav = useNavigate(); const dispatch = useDispatch(); const user = useSelector((s) => s.auth.user); const cart = useSelector((s) => s.cart);
  const { data: cfg, loading: cl } = useFetch(() => checkoutApi.config(), []);
  const { data: addrs, loading: al } = useFetch(() => accountApi.addresses(), []);
  const [addressId, setAddressId] = useState(null); const [method, setMethod] = useState(null); const [busy, setBusy] = useState(false); const [save, setSave] = useState(true);
  const [quote, setQuote] = useState(null); const key = useRef(newIdempotencyKey());
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(addressSchema), defaultValues: { fullName: user?.name, phone: user?.phone, state: '' } });
  const list = useMemo(() => addrs?.addresses || [], [addrs]);
  useEffect(() => { if (list.length && addressId === null) setAddressId((list.find((a) => a.isDefault) || list[0])._id); }, [list, addressId]);
  useEffect(() => { if (cfg && !method) setMethod(cfg.onlineEnabled ? 'razorpay' : cfg.codEnabled ? 'cod' : null); }, [cfg, method]);
  useEffect(() => { if (!method) return; checkoutApi.validate({ paymentMethod: method }).then(setQuote).catch(() => setQuote(null)); }, [method, cart.lines, cart.coupon?.code]);
  if (cl || al) return <PageLoader />;
  if (!cart.lines.length) return <div className="container py-10"><EmptyState title="Your cart is empty" actionLabel="Shop now" actionTo="/shop" /></div>;
  const noMethod = !cfg.onlineEnabled && !cfg.codEnabled;

  const finish = (order) => { dispatch(clearAfterOrder()); nav(`/order-success/${order._id}`, { replace: true }); };
  const pay = async (res) => {
    const Rz = await loadRazorpay();
    return new Promise((resolve) => {
      const p = res.payment; let settled = false;
      const inst = new Rz({
        key: p.keyId, amount: p.amount, currency: p.currency, order_id: p.razorpayOrderId, name: 'REGEN Cosmetics', description: `Order ${p.orderNumber}`, prefill: p.prefill, theme: { color: '#04256b' },
        handler: async (r) => {
          settled = true;
          try { const v = await checkoutApi.verify(r); finish(v.order); } catch (e) { toast.error(errorMessage(e)); nav(`/order-success/${res.order._id}`, { replace: true }); }
          resolve();
        },
        modal: { ondismiss: () => { if (!settled) { toast('Payment not completed. Your order is saved; you can retry from My Orders.'); nav(`/account/orders/${res.order._id}`); resolve(); } } },
      });
      inst.on('payment.failed', (r) => { checkoutApi.failed({ razorpay_order_id: p.razorpayOrderId, razorpay_payment_id: r.error?.metadata?.payment_id, error_code: r.error?.code, error_description: r.error?.description }).catch(() => {}); toast.error(r.error?.description || 'Payment failed. You can try again.'); });
      inst.open();
    });
  };
  const place = async (addr) => {
    setBusy(true);
    try {
      const body = { paymentMethod: method, ...(addressId && !addr ? { addressId } : { address: addr, saveAddress: save }) };
      const res = await checkoutApi.placeOrder(body, key.current);
      if (res.order.paymentMethod === 'razorpay' && res.order.status === 'Pending') await pay(res); else finish(res.order);
    } catch (e) { toast.error(errorMessage(e)); if (e?.response?.status === 409) dispatch(loadCart()); key.current = newIdempotencyKey(); } finally { setBusy(false); }
  };
  const submitNew = handleSubmit((v) => place({ ...v, isDefault: undefined }));
  const useSaved = addressId !== null && addressId !== 'new';

  return (
    <div className="container py-6 md:py-10">
      <Seo title="Checkout" noindex /><h1 className="font-display text-[26px] font-semibold text-navy md:text-[40px]">Checkout</h1>
      {noMethod && <p role="alert" className="mt-4 rounded bg-amber-50 p-3 text-sm">No payment method is currently available. Please contact support.</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section aria-labelledby="ship-h" className="rounded bg-white p-4 shadow-sm sm:p-6"><h2 id="ship-h" className="mb-3 font-display text-lg font-semibold text-navy">Shipping address</h2>
            {list.length > 0 && <fieldset className="mb-4 space-y-2"><legend className="sr-only">Saved addresses</legend>
              {list.map((a) => <label key={a._id} className="flex cursor-pointer gap-3 rounded border p-3 text-sm"><input type="radio" name="addr" checked={addressId === a._id} onChange={() => setAddressId(a._id)} /><span><strong>{a.fullName}</strong> · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}</span></label>)}
              <label className="flex cursor-pointer gap-3 rounded border p-3 text-sm"><input type="radio" name="addr" checked={addressId === 'new'} onChange={() => setAddressId('new')} />Use a new address</label></fieldset>}
            {(list.length === 0 || addressId === 'new') && (
              <form id="addr-form" onSubmit={submitNew} noValidate className="grid gap-3 sm:grid-cols-2">
                <FormField label="Full name" error={errors.fullName?.message} {...register('fullName')} /><FormField label="Mobile number" type="tel" error={errors.phone?.message} {...register('phone')} />
                <FormField className="sm:col-span-2" label="Address line 1" error={errors.line1?.message} {...register('line1')} /><FormField className="sm:col-span-2" label="Address line 2 (optional)" {...register('line2')} />
                <FormField label="City" error={errors.city?.message} {...register('city')} />
                <FormField as="select" label="State" error={errors.state?.message} {...register('state')}><option value="">Select state</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</FormField>
                <FormField label="PIN code" inputMode="numeric" maxLength={6} error={errors.pincode?.message} {...register('pincode')} />
                <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />Save this address</label>
              </form>)}
          </section>
          <section aria-labelledby="pay-h" className="rounded bg-white p-4 shadow-sm sm:p-6"><h2 id="pay-h" className="mb-3 font-display text-lg font-semibold text-navy">Payment method</h2>
            <div className="space-y-2">
              {cfg.onlineEnabled && <label className="flex cursor-pointer gap-3 rounded border p-3 text-sm"><input type="radio" name="pm" checked={method === 'razorpay'} onChange={() => setMethod('razorpay')} /><span><strong>Pay online</strong> — UPI, cards, netbanking, wallets (Razorpay)</span></label>}
              {cfg.codEnabled && <label className="flex cursor-pointer gap-3 rounded border p-3 text-sm"><input type="radio" name="pm" checked={method === 'cod'} onChange={() => setMethod('cod')} /><span><strong>Cash on Delivery</strong>{cfg.codFee ? ` (+ ${inr(cfg.codFee)} fee)` : ''}<br /><span className="text-xs text-neutral-600">Available for orders between {inr(cfg.codMinOrder)} and {inr(cfg.codMaxOrder)}</span></span></label>}
              {!cfg.onlineEnabled && <p className="text-xs text-neutral-600">Online payment is not available right now.</p>}
            </div>
          </section>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-[132px] lg:self-start">
          <CouponBox />
          {quote && <Summary pricing={quote.pricing}>
            {quote.issues?.length > 0 && <ul role="alert" className="rounded bg-amber-50 p-2 text-xs text-amber-900">{quote.issues.map((i) => <li key={i.sku + i.code}>{i.message}</li>)}</ul>}
            <button type="button" disabled={busy || noMethod || !method || (quote.issues?.length > 0)} className="btn mt-3 w-full"
              onClick={() => (useSaved ? place() : submitNew())}>{busy ? 'Processing…' : method === 'cod' ? 'Place Order' : 'Pay Now'}</button>
            <Link to="/shop" className="block pt-2 text-center text-sm text-brand underline">Continue shopping</Link></Summary>}
        </aside>
      </div>
    </div>
  );
}
