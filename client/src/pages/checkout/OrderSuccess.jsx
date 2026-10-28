import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';
import Seo from '@/components/common/Seo.jsx';
import { PageLoader, ErrorState } from '@/components/common/Feedback.jsx';
import { useFetch } from '@/hooks';
import { orderApi } from '@/services';
import { inr } from '@/utils/format';

export default function OrderSuccess() {
  const { id } = useParams(); const { data, loading, error, reload } = useFetch(() => orderApi.get(id), [id]);
  if (loading) return <PageLoader />;
  if (error) return <div className="wrap py-10"><ErrorState message={error} onRetry={reload} /></div>;
  const o = data.order; const paid = o.paymentStatus === 'Paid' || o.paymentMethod === 'cod'; const cancelled = o.status === 'Cancelled';
  return (
    <div className="wrap max-w-xl py-12 text-center"><Seo title="Order status" noindex />
      {paid && !cancelled ? <CheckCircle2 className="mx-auto h-16 w-16 text-deal" /> : <Clock className="mx-auto h-16 w-16 text-amber-500" />}
      <h1 className="mt-4 font-display text-2xl font-semibold text-brand">{cancelled ? 'Order cancelled' : paid ? 'Thank you! Your order is placed' : 'Waiting for payment confirmation'}</h1>
      <p className="mt-2">Order <strong>{o.orderNumber}</strong> · {inr(o.pricing.total)}</p>
      {!paid && !cancelled && <p className="mt-2 text-sm text-neutral-700">We will confirm your order as soon as the payment is verified. If you were charged, it will update automatically; you can refresh this page.</p>}
      {paid && !cancelled && <p className="mt-2 text-sm text-neutral-700">A confirmation will be emailed to {o.customer?.email}.</p>}
      <div className="mt-6 flex justify-center gap-3"><button className="btn-outline" onClick={reload}>Refresh status</button><Link to={`/account/orders/${o._id}`} className="btn">View order</Link></div>
    </div>
  );
}
