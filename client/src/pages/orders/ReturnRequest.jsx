import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Seo from '@/components/common/Seo.jsx';
import { PageLoader, ErrorState } from '@/components/common/Feedback.jsx';
import { Breadcrumbs, QuantityControl } from '@/components/common/Primitives.jsx';
import { useFetch } from '@/hooks';
import { returnApi } from '@/services';
import { errorMessage } from '@/services/api';
import { RETURN_REASONS } from '@/constants';
import { inr, date } from '@/utils/format';

const MAX_FILES = 5; const MAX_MB = 5;
export default function ReturnRequest() {
  const { id } = useParams(); const nav = useNavigate();
  const { data, loading, error, reload } = useFetch(() => returnApi.eligibility(id), [id]);
  const [sel, setSel] = useState({}); const [files, setFiles] = useState([]); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState({});
  if (loading) return <PageLoader />;
  if (error) return <div className="wrap py-10"><ErrorState message={error} onRetry={reload} /></div>;
  const chosen = Object.entries(sel).filter(([, v]) => v.on);
  const pick = (e) => {
    const list = [...e.target.files]; const bad = list.find((f) => !/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > MAX_MB * 1024 * 1024);
    if (bad) { toast.error(`Only JPG/PNG/WebP images up to ${MAX_MB}MB are allowed`); e.target.value = ''; return; }
    if (files.length + list.length > MAX_FILES) { toast.error(`You can attach up to ${MAX_FILES} photos`); return; }
    setFiles([...files, ...list]); e.target.value = '';
  };
  const submit = async (e) => {
    e.preventDefault(); const er = {};
    if (!chosen.length) er.form = 'Select at least one item to return';
    chosen.forEach(([sku, v]) => { if (!v.reason) er[sku] = 'Choose a reason'; });
    if (chosen.some(([, v]) => v.reason && v.reason !== 'Other') && files.length === 0) er.files = 'Please attach at least one photo as evidence';
    setErrs(er); if (Object.keys(er).length) return;
    const fd = new FormData();
    fd.append('data', JSON.stringify({ orderId: id, items: chosen.map(([sku, v]) => ({ sku, quantity: v.qty || 1, reason: v.reason, comment: v.comment || undefined })) }));
    files.forEach((f) => fd.append('evidence', f));
    setBusy(true);
    try { const r = await returnApi.create(fd); toast.success('Return request submitted'); nav(`/account/returns/${r.return._id}`, { replace: true }); }
    catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  const upd = (sku, patch) => setSel((s) => ({ ...s, [sku]: { qty: 1, ...s[sku], ...patch } }));
  return (
    <div className="wrap max-w-3xl py-6 md:py-10"><Seo title="Request a return" noindex />
      <Breadcrumbs items={[{ label: 'Orders', to: '/account/orders' }, { label: 'Order', to: `/account/orders/${id}` }, { label: 'Return' }]} /><h1 className="section-title mt-3">Request a return</h1>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        {errs.form && <p role="alert" className="field-error">{errs.form}</p>}
        {data.items.map((i) => (
          <fieldset key={i.sku} className={`rounded bg-white p-4 shadow-sm ${i.eligible ? '' : 'opacity-70'}`}><legend className="sr-only">{i.name}</legend>
            <label className="flex items-start gap-3"><input type="checkbox" disabled={!i.eligible} checked={Boolean(sel[i.sku]?.on)} onChange={(e) => upd(i.sku, { on: e.target.checked })} className="mt-1" />
              <img src={i.image || '/assets/logo.png'} alt="" className="h-14 w-14 rounded object-cover" /><span className="flex-1 text-sm"><strong className="text-brand">{i.name}</strong><br />Refundable: {inr(i.unitRefund)} each · {i.remaining} eligible{i.deadline && <> · return by {date(i.deadline)}</>}{!i.eligible && <span className="block font-semibold text-red-600">{i.reason}</span>}</span></label>
            {sel[i.sku]?.on && <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><span className="label">Quantity</span><QuantityControl value={sel[i.sku].qty || 1} max={i.remaining} onChange={(q) => upd(i.sku, { qty: q })} /></div>
              <div><label className="label" htmlFor={`r-${i.sku}`}>Reason</label><select id={`r-${i.sku}`} className="input" value={sel[i.sku].reason || ''} onChange={(e) => upd(i.sku, { reason: e.target.value })}><option value="">Select a reason</option>{RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}</select>{errs[i.sku] && <p role="alert" className="field-error">{errs[i.sku]}</p>}</div>
              <div className="sm:col-span-2"><label className="label" htmlFor={`c-${i.sku}`}>Comments (optional)</label><textarea id={`c-${i.sku}`} rows={2} maxLength={1000} className="input" onChange={(e) => upd(i.sku, { comment: e.target.value })} /></div></div>}
          </fieldset>
        ))}
        <div className="rounded bg-white p-4 shadow-sm"><label className="label" htmlFor="ev">Photos as evidence (up to {MAX_FILES}, JPG/PNG/WebP, {MAX_MB}MB each)</label><input id="ev" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pick} />
          {errs.files && <p role="alert" className="field-error">{errs.files}</p>}
          <ul className="mt-3 flex flex-wrap gap-2">{files.map((f, i) => <li key={i} className="relative"><img src={URL.createObjectURL(f)} alt={f.name} className="h-16 w-16 rounded object-cover" /><button type="button" aria-label={`Remove ${f.name}`} className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-600 text-xs text-white" onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button></li>)}</ul></div>
        {data.paymentMethod === 'cod' && <p className="rounded bg-sky-100 p-3 text-sm">This was a Cash on Delivery order. After inspection our team will contact you for your UPI or bank details to send the refund.</p>}
        <div className="flex gap-3"><button className="btn" disabled={busy}>{busy ? 'Submitting…' : 'Submit return request'}</button><Link to={`/account/orders/${id}`} className="btn-outline">Cancel</Link></div>
      </form>
    </div>
  );
}
