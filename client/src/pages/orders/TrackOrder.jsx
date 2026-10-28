import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Seo from '@/components/common/Seo.jsx';
import FormField from '@/components/common/FormField.jsx';
import { StatusBadge, Timeline } from '@/components/common/Primitives.jsx';
import { orderApi } from '@/services';
import { errorMessage } from '@/services/api';
import { zodResolver, email } from '@/utils/schemas';
import { ORDER_STEPS } from '@/constants';
import { inr } from '@/utils/format';

const schema = z.object({ orderNumber: z.string().trim().min(4, 'Enter your order number'), email });
export default function TrackOrder() {
  const [order, setOrder] = useState(null); const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const go = async (v) => { setErr(''); setOrder(null); try { setOrder((await orderApi.track(v)).order); } catch (e) { setErr(errorMessage(e)); } };
  return (
    <div className="wrap max-w-2xl py-8 md:py-12"><Seo title="Track Order" path="/track-order" /><h1 className="section-title">Track your order</h1>
      <form onSubmit={handleSubmit(go)} noValidate className="mt-4 grid gap-3 rounded bg-white p-4 shadow-sm sm:grid-cols-2">
        <FormField label="Order number" placeholder="e.g. RGN-2026-000001" error={errors.orderNumber?.message} {...register('orderNumber')} /><FormField label="Email used at checkout" type="email" error={errors.email?.message} {...register('email')} />
        <button className="btn sm:col-span-2" disabled={isSubmitting}>{isSubmitting ? 'Searching…' : 'Track'}</button></form>
      {err && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {order && <section className="mt-6 rounded bg-white p-4 shadow-sm" aria-live="polite"><div className="flex items-center justify-between"><h2 className="font-bold text-brand">{order.orderNumber}</h2><StatusBadge status={order.status} /></div>
        <p className="mb-3 text-sm text-neutral-600">{order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')} · {inr(order.total)}</p>
        <Timeline steps={ORDER_STEPS} current={order.status} history={order.statusHistory} cancelled={order.status === 'Cancelled'} />
        {order.tracking?.trackingNumber && <p className="mt-3 text-sm">Carrier: {order.tracking.carrier} · {order.tracking.trackingNumber}</p>}</section>}
    </div>
  );
}
