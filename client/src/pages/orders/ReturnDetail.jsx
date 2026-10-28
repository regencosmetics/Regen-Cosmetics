import { Link, useParams } from 'react-router-dom';
import Seo from '@/components/common/Seo.jsx';
import { PageLoader, ErrorState } from '@/components/common/Feedback.jsx';
import { StatusBadge, Timeline, Breadcrumbs } from '@/components/common/Primitives.jsx';
import { useFetch } from '@/hooks';
import { returnApi } from '@/services';
import { RETURN_STEPS } from '@/constants';
import { inr, dateTime } from '@/utils/format';

export default function ReturnDetail() {
  const { id } = useParams(); const { data, loading, error, reload } = useFetch(() => returnApi.get(id), [id]);
  if (loading) return <PageLoader />;
  if (error) return <div className="wrap py-10"><ErrorState message={error} onRetry={reload} /></div>;
  const r = data.return; const rejected = r.status === 'Rejected';
  return (
    <div className="wrap max-w-3xl py-6 md:py-10"><Seo title={`Return ${r.returnNumber}`} noindex />
      <Breadcrumbs items={[{ label: 'Returns', to: '/account/returns' }, { label: r.returnNumber }]} />
      <div className="mt-3 flex items-center justify-between"><h1 className="section-title">{r.returnNumber}</h1><StatusBadge status={r.status} /></div>
      <p className="text-sm text-neutral-600">Requested {dateTime(r.createdAt)} · <Link className="underline" to={`/account/orders/${r.order}`}>View order</Link></p>
      {rejected && <p role="alert" className="mt-3 rounded bg-red-50 p-3 text-sm text-red-800">Your request was not approved.{r.rejectionReason ? ` Reason: ${r.rejectionReason}` : ''}</p>}
      <section className="mt-5 rounded bg-white p-4 shadow-sm"><Timeline steps={RETURN_STEPS} current={r.status} history={r.statusHistory} cancelled={rejected} /></section>
      <ul className="mt-5 space-y-2">{r.items.map((i) => <li key={i.sku} className="flex gap-3 rounded bg-white p-3 text-sm shadow-sm"><img src={i.image || '/assets/logo.png'} alt="" className="h-12 w-12 rounded object-cover" /><div className="flex-1"><strong>{i.name}</strong> × {i.quantity}<br />{i.reason}{i.comment ? ` — ${i.comment}` : ''}</div></li>)}</ul>
      {r.pickup?.scheduledFor && <p className="mt-4 text-sm">Pickup scheduled for {dateTime(r.pickup.scheduledFor)}. {r.pickup.note}</p>}
      {data.refund && <p className="mt-4 rounded bg-green-50 p-3 text-sm">Refund of <strong>{inr(data.refund.amount)}</strong>: {data.refund.status}{data.refund.completedAt ? ` on ${dateTime(data.refund.completedAt)}` : ''}</p>}
      {r.evidence?.length > 0 && <div className="mt-4 flex gap-2">{r.evidence.map((e) => <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer"><img src={e.url} alt="Evidence" className="h-16 w-16 rounded object-cover" /></a>)}</div>}
    </div>
  );
}
