import { useState } from 'react';
import toast from 'react-hot-toast';
import { PageHead, Card, DataTable, Async, Pager, Badge, Toggle, csvDownload } from './ui.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import { useFetch } from '@/hooks';
import { adminApi } from '@/services';
import { errorMessage } from '@/services/api';
import { date, dateTime } from '@/utils/format';

const toLocal = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '');

function useAct(reload) { return async (fn, ok) => { try { await fn(); if (ok) toast.success(ok); reload(); } catch (e) { toast.error(errorMessage(e)); } }; }

function Coupons() {
  const [page, setPage] = useState(1); const st = useFetch(() => adminApi.get('coupons', { page }), [page]); const act = useAct(st.reload);
  const [e, setE] = useState(null); const [del, setDel] = useState(null); const [errs, setErrs] = useState({});
  const blank = { code: '', description: '', type: 'percent', value: '', maxDiscount: '', minOrderAmount: '', usageLimit: '', perUserLimit: '', startsAt: '', expiresAt: '', isActive: true, isPublic: false };
  const save = async (ev) => {
    ev.preventDefault(); const er = {};
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(e.code)) er.code = 'Use 3-30 letters, numbers, - or _'; if (!(Number(e.value) > 0)) er.value = 'Enter a value'; if (e.type === 'percent' && Number(e.value) > 100) er.value = 'Percent cannot exceed 100';
    if (e.startsAt && e.expiresAt && e.expiresAt <= e.startsAt) er.expiresAt = 'Expiry must be after start'; setErrs(er); if (Object.keys(er).length) return;
    const n = (v) => (v === '' || v == null ? undefined : Number(v));
    const body = { code: e.code, description: e.description || undefined, type: e.type, value: Number(e.value), maxDiscount: n(e.maxDiscount), minOrderAmount: n(e.minOrderAmount), usageLimit: n(e.usageLimit), perUserLimit: n(e.perUserLimit), startsAt: e.startsAt ? new Date(e.startsAt).toISOString() : null, expiresAt: e.expiresAt ? new Date(e.expiresAt).toISOString() : null, isActive: e.isActive, isPublic: e.isPublic };
    await act(() => (e._id ? adminApi.put(`coupons/${e._id}`, body) : adminApi.post('coupons', body)), 'Coupon saved'); setE(null);
  };
  const F = ({ k, label, type = 'text', ...p }) => <div><label className="label" htmlFor={`c-${k}`}>{label}</label><input id={`c-${k}`} type={type} className="input" value={e[k] ?? ''} onChange={(ev) => setE({ ...e, [k]: ev.target.value })} aria-invalid={errs[k] ? 'true' : undefined} {...p} />{errs[k] && <p role="alert" className="field-error">{errs[k]}</p>}</div>;
  return (
    <div><PageHead title="Coupons">{!e && <button className="btn" onClick={() => { setErrs({}); setE(blank); }}>Add coupon</button>}</PageHead>
      {e && <Card title={e._id ? 'Edit coupon' : 'New coupon'} className="mb-4"><form onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {F({ k: 'code', label: 'Code', className: 'input uppercase' })}<div><label className="label" htmlFor="c-type">Type</label><select id="c-type" className="input" value={e.type} onChange={(ev) => setE({ ...e, type: ev.target.value })}><option value="percent">Percent</option><option value="fixed">Fixed amount</option></select></div>
        {F({ k: 'value', label: e.type === 'percent' ? 'Percent off' : 'Amount off (INR)', type: 'number', min: 0 })}{F({ k: 'maxDiscount', label: 'Max discount (INR)', type: 'number', min: 0 })}
        {F({ k: 'minOrderAmount', label: 'Min order (INR)', type: 'number', min: 0 })}{F({ k: 'usageLimit', label: 'Total uses (0 = unlimited)', type: 'number', min: 0 })}{F({ k: 'perUserLimit', label: 'Uses per customer', type: 'number', min: 0 })}{F({ k: 'description', label: 'Description' })}
        {F({ k: 'startsAt', label: 'Starts', type: 'datetime-local' })}{F({ k: 'expiresAt', label: 'Expires', type: 'datetime-local' })}
        <div className="flex items-end gap-4"><Toggle label="Active" checked={e.isActive} onChange={(v) => setE({ ...e, isActive: v })} /><Toggle label="Show publicly" checked={e.isPublic} onChange={(v) => setE({ ...e, isPublic: v })} /></div>
        <div className="flex items-end gap-2"><button className="btn">Save</button><button type="button" className="btn-outline" onClick={() => setE(null)}>Cancel</button></div></form></Card>}
      <Async state={st}>{(d) => (<><DataTable rows={d.items} empty="No coupons" columns={[{ key: 'code', label: 'Code' }, { key: 'v', label: 'Discount', render: (c) => (c.type === 'percent' ? `${c.value}%` : `Rs ${c.value}`) }, { key: 'usedCount', label: 'Used', render: (c) => `${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ''}` }, { key: 'expiresAt', label: 'Expires', render: (c) => (c.expiresAt ? date(c.expiresAt) : '—') }, { key: 'isActive', label: 'Status', render: (c) => <Badge status={c.isActive ? 'Active' : 'Inactive'} /> }, { key: 'a', label: '', render: (c) => <div className="flex gap-3"><button className="text-brand underline" onClick={() => { setErrs({}); setE({ ...c, startsAt: toLocal(c.startsAt), expiresAt: toLocal(c.expiresAt) }); }}>Edit</button><button className="text-red-600 underline" onClick={() => setDel(c)}>Delete</button></div> }]} /><Pager d={d} setPage={setPage} /></>)}</Async>
      <ConfirmDialog open={Boolean(del)} title="Delete coupon?" message="Coupons that have been used are deactivated instead of deleted." confirmLabel="Delete" danger onConfirm={() => { act(() => adminApi.del(`coupons/${del._id}`), 'Done'); setDel(null); }} onCancel={() => setDel(null)} />
    </div>
  );
}

function Banners() {
  const st = useFetch(() => adminApi.get('banners'), []); const act = useAct(st.reload); const [e, setE] = useState(null); const [del, setDel] = useState(null);
  const blank = { placement: 'hero', title: '', subtitle: '', ctaText: '', ctaLink: '', sortOrder: 0, isActive: true, image: null };
  const up = async (files) => { try { const r = await adminApi.upload(files, 'banners'); setE((x) => ({ ...x, image: r.images[0] })); } catch (er) { toast.error(errorMessage(er)); } };
  const save = async (ev) => { ev.preventDefault(); if (!e.image?.url) { toast.error('Upload a banner image'); return; }
    const body = { placement: e.placement, title: e.title, subtitle: e.subtitle, ctaText: e.ctaText, ...(e.ctaLink ? { ctaLink: e.ctaLink } : {}), sortOrder: Number(e.sortOrder || 0), isActive: e.isActive, image: { url: e.image.url, publicId: e.image.publicId, alt: e.title } };
    await act(() => (e._id ? adminApi.put(`banners/${e._id}`, body) : adminApi.post('banners', body)), 'Banner saved'); setE(null); };
  return (
    <div><PageHead title="Banners">{!e && <button className="btn" onClick={() => setE(blank)}>Add banner</button>}</PageHead>
      {e && <Card title="Banner" className="mb-4"><form onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="b-p">Placement</label><select id="b-p" className="input" value={e.placement} onChange={(x) => setE({ ...e, placement: x.target.value })}><option value="hero">Hero</option><option value="promo">Promo</option></select></div>
        {[['title', 'Title'], ['subtitle', 'Subtitle'], ['ctaText', 'Button text'], ['ctaLink', 'Button link']].map(([k, l]) => <div key={k}><label className="label" htmlFor={`b-${k}`}>{l}</label><input id={`b-${k}`} className="input" value={e[k] || ''} onChange={(x) => setE({ ...e, [k]: x.target.value })} /></div>)}
        <div><label className="label" htmlFor="b-s">Sort order</label><input id="b-s" type="number" className="input" value={e.sortOrder} onChange={(x) => setE({ ...e, sortOrder: x.target.value })} /></div>
        <div><span className="label">Image</span>{e.image?.url && <img src={e.image.url} alt="" className="mb-1 h-16 rounded" />}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload banner image" onChange={(x) => x.target.files.length && up(x.target.files)} /></div>
        <Toggle label="Active" checked={e.isActive} onChange={(v) => setE({ ...e, isActive: v })} /><div className="flex gap-2 sm:col-span-2"><button className="btn">Save</button><button type="button" className="btn-outline" onClick={() => setE(null)}>Cancel</button></div></form></Card>}
      <Async state={st}>{(d) => <DataTable rows={d.items} empty="No banners" columns={[{ key: 'img', label: '', render: (b) => <img src={b.image?.url} alt="" className="h-10 w-20 rounded object-cover" /> }, { key: 'title', label: 'Title' }, { key: 'placement', label: 'Placement' }, { key: 'isActive', label: 'Status', render: (b) => <Badge status={b.isActive ? 'Active' : 'Inactive'} /> }, { key: 'a', label: '', render: (b) => <div className="flex gap-3"><button className="text-brand underline" onClick={() => setE(b)}>Edit</button><button className="text-red-600 underline" onClick={() => setDel(b)}>Delete</button></div> }]} />}</Async>
      <ConfirmDialog open={Boolean(del)} title="Delete banner?" message="This cannot be undone." confirmLabel="Delete" danger onConfirm={() => { act(() => adminApi.del(`banners/${del._id}`), 'Banner deleted'); setDel(null); }} onCancel={() => setDel(null)} />
    </div>
  );
}

function Reviews() {
  const [page, setPage] = useState(1); const [status, setStatus] = useState('pending'); const st = useFetch(() => adminApi.get('reviews', { page, status }), [page, status]); const act = useAct(st.reload);
  return (
    <div><PageHead title="Reviews"><select aria-label="Status" className="input !w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>{['pending', 'approved', 'rejected', ''].map((s) => <option key={s} value={s}>{s || 'All'}</option>)}</select></PageHead>
      <Async state={st}>{(d) => (<><DataTable rows={d.items} empty="No reviews" columns={[{ key: 'product', label: 'Product', render: (r) => r.product?.name }, { key: 'rating', label: 'Rating', render: (r) => `${r.rating}/5` }, { key: 'body', label: 'Review', render: (r) => <><strong>{r.title}</strong><br />{r.body}<br /><span className="text-xs text-neutral-600">{r.displayName} · {date(r.createdAt)}{r.verifiedPurchase ? ' · verified' : ''}</span></> }, { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
        { key: 'a', label: '', render: (r) => <div className="flex flex-col gap-1">{r.status !== 'approved' && <button className="text-brand underline" onClick={() => act(() => adminApi.patch(`reviews/${r._id}`, { status: 'approved' }), 'Approved')}>Approve</button>}{r.status !== 'rejected' && <button className="text-brand underline" onClick={() => act(() => adminApi.patch(`reviews/${r._id}`, { status: 'rejected' }), 'Rejected')}>Reject</button>}<button className="text-red-600 underline" onClick={() => act(() => adminApi.del(`reviews/${r._id}`), 'Deleted')}>Delete</button></div> }]} /><Pager d={d} setPage={setPage} /></>)}</Async></div>
  );
}

function Messages() {
  const [page, setPage] = useState(1); const st = useFetch(() => adminApi.get('messages', { page }), [page]); const act = useAct(st.reload);
  return (
    <div><PageHead title="Messages" />
      <Async state={st}>{(d) => (<><p className="mb-2 text-sm">{d.unread} unread</p><ul className="space-y-3">{d.items.map((m) => <li key={m._id} className={`rounded-lg border bg-white p-4 text-sm shadow-sm ${m.isRead ? '' : 'border-brand'}`}><div className="flex flex-wrap justify-between gap-2"><strong>{m.name}</strong><span className="text-xs text-neutral-600">{dateTime(m.createdAt)}</span></div><p className="text-xs text-neutral-600"><a className="underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ''}</p><p className="mt-2 whitespace-pre-wrap">{m.message}</p><div className="mt-2 flex gap-4"><button className="text-brand underline" onClick={() => act(() => adminApi.patch(`messages/${m._id}`, { isRead: !m.isRead }))}>{m.isRead ? 'Mark unread' : 'Mark read'}</button><button className="text-red-600 underline" onClick={() => act(() => adminApi.del(`messages/${m._id}`), 'Deleted')}>Delete</button></div></li>)}{d.items.length === 0 && <li className="text-sm text-neutral-600">No messages yet.</li>}</ul><Pager d={d} setPage={setPage} /></>)}</Async></div>
  );
}

function Newsletter() {
  const [page, setPage] = useState(1); const st = useFetch(() => adminApi.get('newsletter', { page }), [page]); const act = useAct(st.reload);
  const exportAll = async () => { try { const r = await adminApi.blob('newsletter/export'); const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'subscribers.csv'; a.click(); } catch (e) { toast.error(errorMessage(e)); } };
  return (
    <div><PageHead title="Newsletter subscribers"><button className="btn-outline" onClick={exportAll}>Export CSV</button></PageHead>
      <Async state={st}>{(d) => (<><DataTable rows={d.items} empty="No subscribers yet" columns={[{ key: 'email', label: 'Email' }, { key: 'status', label: 'Status', render: (s) => <Badge status={s.status === 'subscribed' ? 'Active' : 'Disabled'} /> }, { key: 'subscribedAt', label: 'Subscribed', render: (s) => date(s.subscribedAt) }, { key: 'a', label: '', render: (s) => <button className="text-red-600 underline" onClick={() => act(() => adminApi.del(`newsletter/${s._id}`), 'Removed')}>Remove</button> }]} /><Pager d={d} setPage={setPage} /></>)}</Async></div>
  );
}
void csvDownload;
export default function Simple({ kind }) { return { coupons: <Coupons />, banners: <Banners />, reviews: <Reviews />, messages: <Messages />, newsletter: <Newsletter /> }[kind]; }
