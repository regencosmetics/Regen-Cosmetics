import { useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '@/components/common/Seo.jsx';
import { PageLoader, EmptyState, ErrorState } from '@/components/common/Feedback.jsx';
import { StatusBadge, Pagination, Breadcrumbs } from '@/components/common/Primitives.jsx';
import { useFetch } from '@/hooks';
import { orderApi } from '@/services';
import { inr, date } from '@/utils/format';

export default function Orders() {
  const [page, setPage] = useState(1); const { data, loading, error, reload } = useFetch(() => orderApi.list({ page, limit: 10 }), [page]);
  return (
    <div className="wrap py-6 md:py-10"><Seo title="My Orders" noindex /><Breadcrumbs items={[{ label: 'Account', to: '/account' }, { label: 'Orders' }]} /><h1 className="section-title mt-3">My Orders</h1>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? <EmptyState title="No orders yet" actionLabel="Start shopping" actionTo="/shop" /> : (
        <>
          <ul className="mt-5 space-y-3">{data.items.map((o) => (
            <li key={o._id} className="rounded bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><Link to={`/account/orders/${o._id}`} className="font-bold text-brand">{o.orderNumber}</Link><p className="text-xs text-neutral-600">{date(o.createdAt)} · {o.items.length} item(s)</p></div><div className="text-right"><StatusBadge status={o.status} /><p className="mt-1 text-sm font-bold">{inr(o.pricing.total)}</p></div></div>
              <div className="mt-3 flex gap-2">{o.items.slice(0, 4).map((i) => <img key={i.sku} src={i.image || '/assets/logo.png'} alt={i.name} className="h-12 w-12 rounded bg-sky-100 object-cover" />)}</div></li>))}</ul>
          <Pagination page={data.pagination.page} pages={data.pagination.pages} onChange={setPage} />
        </>)}
    </div>
  );
}
