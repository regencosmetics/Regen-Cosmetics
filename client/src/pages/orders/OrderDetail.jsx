import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Seo from '@/components/common/Seo.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import { PageLoader, ErrorState } from '@/components/common/Feedback.jsx';
import { StatusBadge, Timeline, Breadcrumbs } from '@/components/common/Primitives.jsx';
import { useFetch } from '@/hooks';
import { orderApi, checkoutApi } from '@/services';
import { errorMessage } from '@/services/api';
import { ORDER_STEPS } from '@/constants';
import { inr, dateTime, downloadBlob } from '@/utils/format';
import { loadRazorpay } from '@/utils/razorpay';

export default function OrderDetail() {
  const { id } = useParams(); const { data, loading, error, reload } = useFetch(() => orderApi.get(id), [id]);
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  if (loading) return <PageLoader />;
  if (error) return <div className="wrap py-10"><ErrorState message={error} onRetry={reload} /></div>;
  const { order: o, returns, returnEligibility } = data;
  const cancel = async () => { setBusy(true); try { await orderApi.cancel(o._id, 'Cancelled by customer'); toast.success('Order cancelled'); setConfirm(false); reload(); } catch (e) { toast.error(errorMessage(e)); setConfirm(false); reload(); } finally { setBusy(false); } };
  const invoice = async () => { try { const r = await orderApi.invoice(o._id); downloadBlob(r.data, `invoice-${o.orderNumber}.pdf`); } catch (e) { toast.error(errorMessage(e)); } };
  const retry = async () => {
    try { const { payment: p } = await checkoutApi.retry(o._id); const Rz = await loadRazorpay();
      new Rz({ key: p.keyId, amount: p.amount, currency: p.currency, order_id: p.razorpayOrderId, name: 'REGEN Cosmetics', prefill: p.prefill, theme: { color: '#07287a' }, handler: async (r) => { try { await checkoutApi.verify(r); toast.success('Payment received'); } catch (e) { toast.error(errorMessage(e)); } reload(); } }).open();
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const canReturn = returnEligibility?.some((e) => e.eligible);
  const needsPayment = o.paymentMethod === 'razorpay' && o.paymentStatus === 'Pending' && o.status === 'Pending';
  return (
    <div className="wrap py-6 md:py-10"><Seo title={`Order ${o.orderNumber}`} noindex />
      <Breadcrumbs items={[{ label: 'Account', to: '/account' }, { label: 'Orders', to: '/account/orders' }, { label: o.orderNumber }]} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><h1 className="section-title">Order {o.orderNumber}</h1><StatusBadge status={o.status} /></div>
      <p className="text-sm text-neutral-600">Placed {dateTime(o.createdAt)} · Payment: {o.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'} ({o.paymentStatus})</p>
      <section className="mt-5 rounded bg-white p-4 shadow-sm" aria-label="Order progress"><Timeline steps={ORDER_STEPS} current={o.status} history={o.statusHistory} cancelled={o.status === 'Cancelled'} />
        {o.tracking?.trackingNumber && <p className="mt-3 text-sm">Carrier: <strong>{o.tracking.carrier}</strong> · Tracking no.: <strong>{o.tracking.trackingNumber}</strong> {o.tracking.url && <a className="text-brand underline" href={o.tracking.url} target="_blank" rel="noopener noreferrer">Track shipment</a>}</p>}
        {o.status === 'Cancelled' && o.cancelReason && <p className="mt-3 text-sm">Reason: {o.cancelReason}</p>}</section>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <ul className="space-y-3">{o.items.map((i) => <li key={i.sku} className="flex gap-3 rounded bg-white p-3 shadow-sm"><img src={i.image || '/assets/logo.png'} alt="" className="h-16 w-16 rounded bg-sky-100 object-cover" /><div className="flex-1 text-sm"><Link to={`/products/${i.slug}`} className="font-bold text-brand">{i.name}</Link><p className="text-xs text-neutral-600">{i.variantLabel} × {i.quantity}</p></div><strong className="text-sm">{inr(i.netTotal)}</strong></li>)}</ul>
        <aside className="space-y-4">
          <div className="rounded bg-white p-4 text-sm shadow-sm"><h2 className="font-bold text-brand">Shipping address</h2><p>{o.shippingAddress.fullName}<br />{o.shippingAddress.line1}{o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ''}<br />{o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.pincode}<br />{o.shippingAddress.phone}</p></div>
          <dl className="space-y-1 rounded bg-white p-4 text-sm shadow-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(o.pricing.subtotal)}</dd></div>{o.pricing.discount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>- {inr(o.pricing.discount)}</dd></div>}<div className="flex justify-between"><dt>Shipping</dt><dd>{inr(o.pricing.shipping)}</dd></div>{o.pricing.codFee > 0 && <div className="flex justify-between"><dt>COD fee</dt><dd>{inr(o.pricing.codFee)}</dd></div>}<div className="flex justify-between border-t pt-1 font-bold"><dt>Total</dt><dd>{inr(o.pricing.total)}</dd></div>{o.refundedAmount > 0 && <div className="flex justify-between text-saved"><dt>Refunded</dt><dd>{inr(o.refundedAmount)}</dd></div>}</dl>
          <div className="flex flex-col gap-2">
            {needsPayment && <button className="btn" onClick={retry}>Complete payment</button>}
            {o.invoiceNumber && <button className="btn-outline" onClick={invoice}>Download invoice</button>}
            {o.canCancel && <button className="btn-danger" onClick={() => setConfirm(true)}>Cancel order</button>}
            {canReturn && <Link to={`/account/orders/${o._id}/return`} className="btn-outline text-center">Request return</Link>}
          </div>
          {returns?.length > 0 && <div className="rounded bg-white p-4 text-sm shadow-sm"><h2 className="font-bold text-brand">Returns</h2><ul>{returns.map((r) => <li key={r._id}><Link className="underline" to={`/account/returns/${r._id}`}>{r.returnNumber}</Link> — <StatusBadge status={r.status} /></li>)}</ul></div>}
        </aside>
      </div>
      <ConfirmDialog open={confirm} title="Cancel this order?" message="Items will be released and any online payment will be refunded to the original payment method." confirmLabel={busy ? 'Cancelling…' : 'Yes, cancel order'} danger onConfirm={cancel} onCancel={() => setConfirm(false)} />
    </div>
  );
}
