import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHead, DataTable, Async, Pager, Badge } from './ui.jsx';
import { useFetch, useDebounce } from '@/hooks';
import { adminApi } from '@/services';
import { ORDER_STEPS } from '@/constants';
import { inr, dateTime } from '@/utils/format';

export default function Orders() {
  const [page, setPage] = useState(1); const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [pm, setPm] = useState(''); const dq = useDebounce(q, 300);
  const st = useFetch(() => adminApi.get('orders', { page, q: dq, status, paymentMethod: pm, hidePendingOnline: 'true' }), [page, dq, status, pm]);
  return (
    <div><PageHead title="Orders">
      <input aria-label="Search orders" className="input !w-52" placeholder="Order no., email, name…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      <select aria-label="Status" className="input !w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{[...ORDER_STEPS, 'Cancelled'].map((s) => <option key={s}>{s}</option>)}</select>
      <select aria-label="Payment method" className="input !w-36" value={pm} onChange={(e) => { setPm(e.target.value); setPage(1); }}><option value="">All payments</option><option value="razorpay">Online</option><option value="cod">COD</option></select></PageHead>
      <Async state={st}>{(d) => (<><DataTable rows={d.items} empty="No orders match" columns={[
        { key: 'orderNumber', label: 'Order', render: (o) => <Link className="font-semibold text-brand underline" to={`/admin/orders/${o._id}`}>{o.orderNumber}</Link> },
        { key: 'createdAt', label: 'Placed', render: (o) => dateTime(o.createdAt) }, { key: 'c', label: 'Customer', render: (o) => <>{o.customer?.name}<br /><span className="text-xs text-neutral-600">{o.customer?.email}</span></> },
        { key: 't', label: 'Total', render: (o) => inr(o.pricing.total) }, { key: 'p', label: 'Payment', render: (o) => <>{o.paymentMethod === 'cod' ? 'COD' : 'Online'}<br /><span className="text-xs">{o.paymentStatus}</span></> },
        { key: 's', label: 'Status', render: (o) => <Badge status={o.status} /> }]} /><Pager d={d} setPage={setPage} /></>)}</Async></div>
  );
}
