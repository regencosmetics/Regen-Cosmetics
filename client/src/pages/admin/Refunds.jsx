import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHead, DataTable, Async, Pager, Badge } from './ui.jsx';
import Modal from '@/components/common/Modal.jsx';
import { useFetch } from '@/hooks';
import { adminApi } from '@/services';
import { errorMessage } from '@/services/api';
import { inr, dateTime } from '@/utils/format';

export default function Refunds() {
  const [page, setPage] = useState(1); const [status, setStatus] = useState(''); const st = useFetch(() => adminApi.get('refunds', { page, status }), [page, status]);
  const [done, setDone] = useState(null); const [ref, setRef] = useState(''); const [payout, setPayout] = useState(null);
  const act = async (fn, ok) => { try { await fn(); toast.success(ok); st.reload(); } catch (e) { toast.error(errorMessage(e)); } };
  const complete = async (e) => { e.preventDefault(); if (ref.trim().length < 3) { toast.error('Enter the transfer reference (UTR / transaction id)'); return; } await act(() => adminApi.post(`refunds/${done._id}/complete`, { reference: ref.trim() }), 'Refund marked completed'); setDone(null); setRef(''); };
  const showPayout = async (r) => { try { setPayout((await adminApi.get(`refunds/${r._id}/payout`)).payout); } catch (e) { toast.error(errorMessage(e)); } };
  return (
    <div><PageHead title="Refunds"><select aria-label="Status" className="input !w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option>{['Pending', 'Processing', 'Completed', 'Failed'].map((s) => <option key={s}>{s}</option>)}</select></PageHead>
      <Async state={st}>{(d) => (<><DataTable rows={d.items} empty="No refunds" columns={[
        { key: 'createdAt', label: 'Created', render: (r) => dateTime(r.createdAt) }, { key: 'order', label: 'Order', render: (r) => <Link className="text-brand underline" to={`/admin/orders/${r.order?._id || r.order}`}>{r.order?.orderNumber || 'View'}</Link> },
        { key: 'amount', label: 'Amount', render: (r) => inr(r.amount) }, { key: 'method', label: 'Method' }, { key: 'reason', label: 'Reason' }, { key: 'status', label: 'Status', render: (r) => <><Badge status={r.status} />{r.failureReason && <p className="text-xs text-red-700">{r.failureReason}</p>}</> },
        { key: 'a', label: '', render: (r) => <div className="flex flex-col gap-1">{['cod_upi', 'cod_bank', 'manual'].includes(r.method) && r.status !== 'Completed' && <><button className="text-brand underline" onClick={() => showPayout(r)}>View payout details</button><button className="text-brand underline" onClick={() => setDone(r)}>Mark completed</button></>}{r.status === 'Failed' && r.method === 'razorpay' && <button className="text-brand underline" onClick={() => act(() => adminApi.post(`refunds/${r._id}/retry`), 'Refund retried')}>Retry</button>}{r.manualReference && <span className="text-xs">Ref: {r.manualReference}</span>}</div> }]} /><Pager d={d} setPage={setPage} /></>)}</Async>
      <Modal open={Boolean(done)} onClose={() => setDone(null)} title="Mark refund completed"><form onSubmit={complete} noValidate className="space-y-3 p-6"><h2 className="font-bold text-brand">Mark refund completed</h2><p className="text-sm">Only confirm after you have actually transferred {done && inr(done.amount)}. Enter the bank / UPI reference.</p><label className="label" htmlFor="ref">Transfer reference</label><input id="ref" data-autofocus className="input" value={ref} onChange={(e) => setRef(e.target.value)} /><div className="flex gap-2"><button className="btn">Confirm</button><button type="button" className="btn-outline" onClick={() => setDone(null)}>Cancel</button></div></form></Modal>
      <Modal open={Boolean(payout)} onClose={() => setPayout(null)} title="Payout details"><div className="space-y-1 p-6 text-sm"><h2 className="font-bold text-brand">Payout details</h2>{payout && Object.entries(payout).filter(([, v]) => v).map(([k, v]) => <p key={k}><strong>{k}:</strong> {String(v)}</p>)}<button className="btn mt-3" onClick={() => setPayout(null)}>Close</button></div></Modal>
    </div>
  );
}
