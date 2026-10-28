import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import Modal from '@/components/common/Modal.jsx';
import { catalogApi } from '@/services';
import { useDebounce } from '@/hooks';
import { productImage, inrShort } from '@/utils/format';

export default function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState(''); const [items, setItems] = useState([]); const nav = useNavigate(); const d = useDebounce(q, 250);
  useEffect(() => { let live = true; if (d.trim().length >= 2) catalogApi.suggest(d.trim()).then((r) => live && setItems(r.items)).catch(() => {}); else setItems([]); return () => { live = false; }; }, [d]);
  useEffect(() => { if (!open) { setQ(''); setItems([]); } }, [open]);
  const go = (e) => { e.preventDefault(); if (q.trim()) { onClose(); nav(`/search?q=${encodeURIComponent(q.trim())}`); } };
  return (
    <Modal open={open} onClose={onClose} title="Search products" hideClose className="!top-[12%] !-translate-y-0 max-w-xl">
      <form onSubmit={go} role="search" className="flex items-center gap-2 border-b p-3">
        <Search className="h-5 w-5 text-neutral-500" aria-hidden="true" />
        <input data-autofocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sunscreen, serum, gel…" aria-label="Search products" className="flex-1 py-2 text-base outline-none" />
        <button type="button" onClick={onClose} aria-label="Close search" className="rounded p-1 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
      </form>
      <ul className="max-h-80 overflow-y-auto">
        {items.map((p) => (
          <li key={p._id}><Link to={`/products/${p.slug}`} onClick={onClose} className="flex items-center gap-3 px-4 py-2.5 hover:bg-sky-50">
            <img src={productImage(p)} alt="" width="40" height="40" className="h-10 w-10 rounded object-cover" /><span className="flex-1 text-sm font-semibold">{p.name}</span><span className="text-sm">{inrShort(p.priceMin)}</span></Link></li>
        ))}
        {d.trim().length >= 2 && items.length === 0 && <li className="px-4 py-6 text-center text-sm text-neutral-600">No suggestions. Press Enter to search all products.</li>}
      </ul>
    </Modal>
  );
}
