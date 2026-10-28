import { useState } from 'react';
import toast from 'react-hot-toast';
import { PageHead, Card, DataTable, Async, Toggle } from './ui.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import { useFetch } from '@/hooks';
import { adminApi } from '@/services';
import { errorMessage } from '@/services/api';

export default function Taxonomy({ kind, label }) {
  const st = useFetch(() => adminApi.get(kind), [kind]); const [edit, setEdit] = useState(null); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault(); if (edit.name.trim().length < 2) { toast.error('Enter a name'); return; }
    const body = { name: edit.name.trim(), description: edit.description || '', isActive: edit.isActive !== false, sortOrder: Number(edit.sortOrder || 0), ...(edit.slug ? { slug: edit.slug } : {}), ...(edit.image?.url ? { image: { url: edit.image.url, publicId: edit.image.publicId } } : {}) };
    setBusy(true); try { if (edit._id) await adminApi.put(`${kind}/${edit._id}`, body); else await adminApi.post(kind, body); toast.success(`${label} saved`); setEdit(null); st.reload(); } catch (er) { toast.error(errorMessage(er)); } finally { setBusy(false); }
  };
  const upload = async (files) => { try { const r = await adminApi.upload(files, kind); setEdit((x) => ({ ...x, image: r.images[0] })); } catch (er) { toast.error(errorMessage(er)); } };
  const remove = async () => { try { await adminApi.del(`${kind}/${del._id}`); toast.success(`${label} deleted`); st.reload(); } catch (er) { toast.error(errorMessage(er)); } setDel(null); };
  return (
    <div><PageHead title={`${label === 'Category' ? 'Categories' : 'Collections'}`}>{!edit && <button className="btn" onClick={() => setEdit({ name: '', isActive: true })}>Add {label.toLowerCase()}</button>}</PageHead>
      {edit && <Card title={edit._id ? `Edit ${label.toLowerCase()}` : `New ${label.toLowerCase()}`} className="mb-4"><form onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="t-name">Name</label><input id="t-name" className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="t-slug">Slug (optional)</label><input id="t-slug" className="input" value={edit.slug || ''} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="t-desc">Description</label><textarea id="t-desc" rows={2} className="input" value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
        <div><label className="label" htmlFor="t-sort">Sort order</label><input id="t-sort" type="number" className="input" value={edit.sortOrder ?? 0} onChange={(e) => setEdit({ ...edit, sortOrder: e.target.value })} /></div>
        <div><span className="label">Image</span>{edit.image?.url && <img src={edit.image.url} alt="" className="mb-1 h-14 w-14 rounded object-cover" />}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload image" onChange={(e) => e.target.files.length && upload(e.target.files)} /></div>
        <Toggle label="Active" checked={edit.isActive !== false} onChange={(v) => setEdit({ ...edit, isActive: v })} />
        <div className="flex gap-2 sm:col-span-2"><button className="btn" disabled={busy}>Save</button><button type="button" className="btn-outline" onClick={() => setEdit(null)}>Cancel</button></div></form></Card>}
      <Async state={st}>{(d) => <DataTable rows={d.items} columns={[{ key: 'name', label: 'Name' }, { key: 'slug', label: 'Slug' }, { key: 'productCount', label: 'Products' }, { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') }, { key: 'a', label: '', render: (r) => <div className="flex gap-3"><button className="text-brand underline" onClick={() => setEdit(r)}>Edit</button><button className="text-red-600 underline" onClick={() => setDel(r)}>Delete</button></div> }]} />}</Async>
      <ConfirmDialog open={Boolean(del)} title={`Delete ${label.toLowerCase()}?`} message="This cannot be undone. Deletion is blocked while products use it." confirmLabel="Delete" danger onConfirm={remove} onCancel={() => setDel(null)} />
    </div>
  );
}
