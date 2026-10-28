import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHead, Card, Async, Badge } from './ui.jsx';
import { Timeline } from '@/components/common/Primitives.jsx';
import { useFetch } from '@/hooks';
import { adminApi } from '@/services';
import { errorMessage } from '@/services/api';
import { RETURN_STEPS } from '@/constants';
import { inr, dateTime } from '@/utils/format';

const NEXT = { 'Return Requested': ['Under Review', 'Approved', 'Rejected'], 'Under Review': ['Approved', 'Rejected'], Approved: ['Pickup Scheduled', 'Product Received'], 'Pickup Scheduled': ['Product Received'] };

export default function ReturnDetail() {
  const { id } = useParams(); const st = useFetch(() => adminApi.get(`returns/${id}`), [id]);
  const [note, setNote] = useState(''); const [when, setWhen] = useState(''); const [results, setResults] = useState({}); const [payout, setPayout] = useState({ upiId: '', accountHolder: '', ifsc: '', accountNumber: '' }); const [busy, setBusy] = useState(false);
  const run = async (fn, ok) => { setBusy(true); try { await fn(); toast.success(ok); st.reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } };
  const setStatus = (status) => {
    if (status === 'Rejected' && !note.trim()) { toast.error('Enter a rejection reason in the note box'); return; }
    run(() => adminApi.patch(`returns/${id}/status`, { status, note: note || undefined, ...(status === 'Rejected' ? { rejectionReason: note } : {}), ...(status === 'Pickup Scheduled' && when ? { pickup: { scheduledFor: new Date(when).toISOString(), note } } : {}) }), `Marked ${status}`);
  };
  const inspect = (r) => { const list = r.items.map((i) => ({ sku: i.sku, result: results[i.sku] })); if (list.some((x) => !x.result)) { toast.error('Choose a result for every item'); return; } run(() => adminApi.post(`returns/${id}/inspect`, { results: list }), 'Inspection saved'); };
  const refund = (r, cod) => {
    const p = Object.fromEntries(Object.entries(payout).filter(([, v]) => v.trim()));
    if (cod && !p.upiId && !(p.accountNumber && p.ifsc && p.accountHolder)) { toast.error('Enter a UPI id, or account holder + account number + IFSC'); return; }
    run(() => adminApi.post(`returns/${id}/refund`, cod ? { payout: p } : {}), 'Refund started');
  };
  return (
    <Async state={st}>{({ return: r, refund: rf }) => (
      <div><PageHead title={`Return ${r.returnNumber}`}><Badge status={r.status} /></PageHead>
        <p className="mb-3 text-sm"><Link className="text-brand underline" to={`/admin/orders/${r.order}`}>View order</Link> · Requested {dateTime(r.createdAt)}</p>
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card title="Items">{r.items.map((i) => <div key={i.sku} className="flex items-start gap-3 border-b py-2 text-sm last:border-0"><img src={i.image || '/assets/logo.png'} alt="" className="h-12 w-12 rounded object-cover" /><div className="flex-1"><strong>{i.name}</strong> ×{i.quantity} · {inr(i.unitRefund * i.quantity)}<br />{i.reason}{i.comment ? ` — ${i.comment}` : ''}<br /><span className="text-xs">Inspection: {i.inspection}{i.restocked ? ' · restocked' : ''}</span></div>
              {r.status === 'Product Received' && <select aria-label={`Inspection result for ${i.name}`} className="input !w-40" value={results[i.sku] || ''} onChange={(e) => setResults({ ...results, [i.sku]: e.target.value })}><option value="">Result…</option><option value="resellable">Resellable (restock)</option><option value="not_resellable">Not resellable</option></select>}</div>)}
              {r.status === 'Product Received' && <button className="btn mt-3" disabled={busy} onClick={() => inspect(r)}>Save inspection</button>}</Card>
            {r.evidence?.length > 0 && <Card title="Customer evidence"><div className="flex flex-wrap gap-2">{r.evidence.map((e) => <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer"><img src={e.url} alt="Evidence" className="h-24 w-24 rounded object-cover" /></a>)}</div></Card>}
            <Card title="Progress"><Timeline steps={RETURN_STEPS} current={r.status} history={r.statusHistory} cancelled={r.status === 'Rejected'} /></Card>
          </div>
          <div className="space-y-4">
            {NEXT[r.status] && <Card title="Next step"><label className="label" htmlFor="n">Note / rejection reason</label><textarea id="n" rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
              {NEXT[r.status].includes('Pickup Scheduled') && <div className="mt-2"><label className="label" htmlFor="w">Pickup date (optional)</label><input id="w" type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} /></div>}
              <div className="mt-3 flex flex-wrap gap-2">{NEXT[r.status].map((s) => <button key={s} disabled={busy} className={s === 'Rejected' ? 'btn-danger' : 'btn'} onClick={() => setStatus(s)}>{s === 'Rejected' ? 'Reject' : s}</button>)}</div></Card>}
            {r.status === 'Product Inspected' && !rf && (
              <Card title="Start refund">{r.refundMethod && <p className="mb-2 text-xs">Refund preference: {r.refundMethod}</p>}
                <p className="mb-2 text-sm">Online orders are refunded to the original payment through Razorpay. For Cash on Delivery, enter the customer's payout details; you will then record the transfer reference on the Refunds page.</p>
                {['upiId', 'accountHolder', 'accountNumber', 'ifsc'].map((k) => <div key={k} className="mb-2"><label className="label" htmlFor={`p-${k}`}>{{ upiId: 'UPI ID (COD only)', accountHolder: 'Account holder (COD only)', accountNumber: 'Account number (COD only)', ifsc: 'IFSC (COD only)' }[k]}</label><input id={`p-${k}`} className="input" autoComplete="off" value={payout[k]} onChange={(e) => setPayout({ ...payout, [k]: e.target.value })} /></div>)}
                <div className="flex gap-2"><button className="btn" disabled={busy} onClick={() => refund(r, false)}>Refund online payment</button><button className="btn-outline" disabled={busy} onClick={() => refund(r, true)}>Refund COD (manual)</button></div></Card>)}
            {rf && <Card title="Refund"><p className="text-sm">{inr(rf.amount)} · <Badge status={rf.status} /> · {rf.method}</p><Link to="/admin/refunds" className="mt-2 inline-block text-sm text-brand underline">Manage on Refunds page</Link></Card>}
            {r.adminNote && <Card title="Admin note"><p className="text-sm">{r.adminNote}</p></Card>}
          </div>
        </div>
      </div>)}</Async>
  );
}
