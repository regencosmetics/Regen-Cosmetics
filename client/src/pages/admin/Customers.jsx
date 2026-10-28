import { useState } from 'react';
import toast from 'react-hot-toast';
import { PageHead, DataTable, Async, Pager, Badge } from './ui.jsx';
import { useFetch, useDebounce } from '@/hooks';
import { adminApi } from '@/services';
import { errorMessage } from '@/services/api';
import { date } from '@/utils/format';

export default function Customers() {
  const [page, setPage] = useState(1); const [q, setQ] = useState(''); const dq = useDebounce(q, 300); const st = useFetch(() => adminApi.get('customers', { page, q: dq }), [page, dq]);
  const toggle = async (u) => { try { await adminApi.patch(`customers/${u._id}/active`, { isActive: !u.isActive }); toast.success(u.isActive ? 'Customer disabled' : 'Customer enabled'); st.reload(); } catch (e) { toast.error(errorMessage(e)); } };
  return (
    <div><PageHead title="Customers"><input aria-label="Search customers" className="input !w-56" placeholder="Name, email, phone…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></PageHead>
      <Async state={st}>{(d) => (<><DataTable rows={d.items} empty="No customers" columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'createdAt', label: 'Joined', render: (u) => date(u.createdAt) }, { key: 'isActive', label: 'Status', render: (u) => <Badge status={u.isActive ? 'Active' : 'Disabled'} /> }, { key: 'a', label: '', render: (u) => <button className="text-brand underline" onClick={() => toggle(u)}>{u.isActive ? 'Disable' : 'Enable'}</button> }]} /><Pager d={d} setPage={setPage} /></>)}</Async></div>
  );
}
