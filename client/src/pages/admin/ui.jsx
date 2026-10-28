import { useState } from 'react';
import { Pagination, StatusBadge } from '@/components/common/Primitives.jsx';
import { PageLoader, ErrorState, EmptyState } from '@/components/common/Feedback.jsx';

export const PageHead = ({ title, children }) => <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-xl font-semibold text-navy sm:text-2xl">{title}</h1><div className="flex flex-wrap gap-2">{children}</div></div>;
export const Card = ({ title, children, className = '' }) => <section className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${className}`}>{title && <h2 className="mb-3 font-display text-base font-semibold text-navy">{title}</h2>}{children}</section>;

/** Responsive table: columns = [{ key, label, render?(row) }]. Scrolls horizontally on small screens. */
export function DataTable({ columns, rows, empty = 'Nothing here yet', onRow }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-sky-50 text-xs uppercase text-neutral-600"><tr>{columns.map((c) => <th key={c.key} scope="col" className="px-3 py-2 font-semibold">{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r._id || i} className={`border-t ${onRow ? 'cursor-pointer hover:bg-sky-50' : ''}`} onClick={() => onRow?.(r)}>{columns.map((c) => <td key={c.key} className="px-3 py-2 align-top">{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Async({ state, children }) {
  if (state.loading) return <PageLoader />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  return children(state.data);
}

export function usePaged() { const [page, setPage] = useState(1); return { page, setPage }; }
export const Pager = ({ d, setPage }) => d?.pagination ? <Pagination page={d.pagination.page} pages={d.pagination.pages} onChange={setPage} /> : null;
export const Badge = StatusBadge;
export const Toggle = ({ label, checked, onChange }) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
export const Field = ({ label, children, hint }) => <div><label className="label">{label}{children}</label>{hint && <p className="mt-1 text-xs text-neutral-600">{hint}</p>}</div>;
export const csvDownload = (name, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
};
