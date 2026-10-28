import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHead, DataTable, Async, Pager, Badge } from './ui.jsx';
import { useFetch } from '@/hooks';
import { adminApi } from '@/services';
import { RETURN_STEPS } from '@/constants';
import { dateTime } from '@/utils/format';

export default function Returns() {
  const [page, setPage] = useState(1); const [status, setStatus] = useState('');
  const st = useFetch(() => adminApi.get('returns', { page, status }), [page, status]);
  return (
    <div><PageHead title="Returns"><select aria-label="Status" className="input !w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{[...RETURN_STEPS, 'Rejected'].map((s) => <option key={s}>{s}</option>)}</select></PageHead>
      <Async state={st}>{(d) => (<><DataTable rows={d.items} empty="No returns" columns={[{ key: 'returnNumber', label: 'Return', render: (r) => <Link className="font-semibold text-brand underline" to={`/admin/returns/${r._id}`}>{r.returnNumber}</Link> }, { key: 'createdAt', label: 'Requested', render: (r) => dateTime(r.createdAt) }, { key: 'items', label: 'Items', render: (r) => r.items.map((i) => `${i.name} ×${i.quantity}`).join(', ') }, { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> }]} /><Pager d={d} setPage={setPage} /></>)}</Async></div>
  );
}
