import { useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '@/components/common/Seo.jsx';
import { PageLoader, EmptyState, ErrorState } from '@/components/common/Feedback.jsx';
import { StatusBadge, Pagination } from '@/components/common/Primitives.jsx';
import { useFetch } from '@/hooks';
import { returnApi } from '@/services';
import { date } from '@/utils/format';

export default function Returns() {
  const [page, setPage] = useState(1); const { data, loading, error, reload } = useFetch(() => returnApi.list({ page, limit: 10 }), [page]);
  return (
    <div className="wrap py-6 md:py-10"><Seo title="My Returns" noindex /><h1 className="section-title">My Returns</h1>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? <EmptyState title="No return requests" text="Eligible delivered orders can be returned from the order page." actionLabel="View orders" actionTo="/account/orders" /> : (
        <><ul className="mt-5 space-y-3">{data.items.map((r) => <li key={r._id} className="flex items-center justify-between rounded bg-white p-4 shadow-sm"><div><Link to={`/account/returns/${r._id}`} className="font-bold text-brand">{r.returnNumber}</Link><p className="text-xs text-neutral-600">{date(r.createdAt)} · {r.items.length} item(s)</p></div><StatusBadge status={r.status} /></li>)}</ul>
          <Pagination page={data.pagination.page} pages={data.pagination.pages} onChange={setPage} /></>)}
    </div>
  );
}
