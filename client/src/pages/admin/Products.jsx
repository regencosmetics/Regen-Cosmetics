import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHead, DataTable, Async, Pager, Badge } from './ui.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import { useFetch, useDebounce } from '@/hooks';
import { adminApi } from '@/services';
import { errorMessage } from '@/services/api';
import { inrShort, productImage, totalStock } from '@/utils/format';

export default function Products() {
  const nav = useNavigate(); const [page, setPage] = useState(1); const [q, setQ] = useState(''); const dq = useDebounce(q, 300); const [del, setDel] = useState(null);
  const st = useFetch(() => adminApi.get('products', { page, q: dq, limit: 20 }), [page, dq]);
  const remove = async () => { try { const r = await adminApi.del(`products/${del._id}`); toast.success(r.archived ? 'Product deactivated (it is in past orders)' : 'Product deleted'); st.reload(); } catch (e) { toast.error(errorMessage(e)); } setDel(null); };
  return (
    <div><PageHead title="Products"><input aria-label="Search products" className="input !w-56" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /><Link to="/admin/products/new" className="btn">Add product</Link></PageHead>
      <Async state={st}>{(d) => (<>
        <DataTable rows={d.items} empty="No products" columns={[
          { key: 'img', label: '', render: (p) => <img src={productImage(p)} alt="" className="h-10 w-10 rounded object-cover" /> },
          { key: 'name', label: 'Name', render: (p) => <Link className="font-semibold text-brand underline" to={`/admin/products/${p._id}`}>{p.name}</Link> },
          { key: 'sku', label: 'SKU' }, { key: 'price', label: 'From', render: (p) => inrShort(p.priceMin) },
          { key: 'stock', label: 'Stock', render: (p) => totalStock(p) }, { key: 'isActive', label: 'Status', render: (p) => <Badge status={p.isActive ? 'Active' : 'Inactive'} /> },
          { key: 'a', label: '', render: (p) => <div className="flex gap-3"><button className="text-brand underline" onClick={() => nav(`/admin/products/${p._id}`)}>Edit</button><button className="text-red-600 underline" onClick={() => setDel(p)}>Delete</button></div> }]} />
        <Pager d={d} setPage={setPage} /></>)}</Async>
      <ConfirmDialog open={Boolean(del)} title="Delete product?" message={`"${del?.name}" will be removed. Products that appear in past orders are deactivated instead.`} confirmLabel="Delete" danger onConfirm={remove} onCancel={() => setDel(null)} />
    </div>
  );
}
