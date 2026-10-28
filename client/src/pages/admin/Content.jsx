import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PageHead, Card, Async } from './ui.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import { useFetch } from '@/hooks';
import { adminApi } from '@/services';
import { errorMessage } from '@/services/api';

const LABELS = { home: 'Home page', faqs: 'FAQs', testimonials: 'Testimonials', footer: 'Footer', social: 'Social links', contact: 'Contact page', about: 'About page', 'legal.privacy': 'Privacy Policy', 'legal.shipping': 'Shipping & Return', 'legal.terms': 'Terms & Conditions', seo: 'SEO defaults', business: 'Business details (invoices)' };
const pretty = (k) => String(k).replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const blankLike = (sample) => (typeof sample === 'string' ? '' : typeof sample === 'number' ? 0 : typeof sample === 'boolean' ? false : Array.isArray(sample) ? [] : sample && typeof sample === 'object' ? Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, blankLike(v)])) : '');

/** Generic structured editor for the CMS JSON documents: strings, numbers, booleans, lists and nested groups. */
function Node({ label, value, onChange, depth = 0 }) {
  if (Array.isArray(value)) {
    const sample = value[0];
    return (
      <fieldset className="rounded border border-neutral-200 p-3"><legend className="px-1 text-sm font-bold text-brand">{label} ({value.length})</legend>
        {value.map((v, i) => (
          <div key={i} className="mb-2 flex gap-2 rounded bg-neutral-50 p-2"><div className="min-w-0 flex-1"><Node label={`#${i + 1}`} value={v} depth={depth + 1} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} /></div>
            <div className="flex flex-col gap-1 text-xs"><button type="button" aria-label={`Move ${label} item ${i + 1} up`} disabled={i === 0} onClick={() => { const a = [...value]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(a); }}>↑</button><button type="button" aria-label={`Move ${label} item ${i + 1} down`} disabled={i === value.length - 1} onClick={() => { const a = [...value]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; onChange(a); }}>↓</button><button type="button" aria-label={`Remove ${label} item ${i + 1}`} className="text-red-600" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button></div></div>))}
        <button type="button" className="text-sm text-brand underline" onClick={() => onChange([...value, sample === undefined ? '' : blankLike(sample)])}>+ Add item</button></fieldset>
    );
  }
  if (value && typeof value === 'object') {
    return <fieldset className={`space-y-3 ${depth ? '' : ''}`}>{depth > 0 && <legend className="sr-only">{label}</legend>}{Object.entries(value).map(([k, v]) => <Node key={k} label={pretty(k)} value={v} depth={depth + 1} onChange={(nv) => onChange({ ...value, [k]: nv })} />)}</fieldset>;
  }
  const id = `cms-${label}-${depth}-${Math.random().toString(36).slice(2, 7)}`;
  if (typeof value === 'boolean') return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
  if (typeof value === 'number') return <div><label className="label" htmlFor={id}>{label}</label><input id={id} type="number" className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} /></div>;
  const long = String(value).length > 70 || String(value).includes('\n');
  return <div><label className="label" htmlFor={id}>{label}</label>{long ? <textarea id={id} rows={Math.min(8, Math.ceil(String(value).length / 80) + 1)} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} /> : <input id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}</div>;
}

export default function Content() {
  const keys = useFetch(() => adminApi.get('cms'), []); const [key, setKey] = useState('home');
  const doc = useFetch(() => adminApi.get(`cms/${key}`), [key]); const [draft, setDraft] = useState(null); const [busy, setBusy] = useState(false); const [reset, setReset] = useState(false);
  useEffect(() => { setDraft(doc.data ? structuredClone(doc.data.content) : null); }, [doc.data]);
  const save = async () => { setBusy(true); try { await adminApi.put(`cms/${key}`, draft); toast.success('Saved. Changes appear on the site within about 30 seconds.'); doc.reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } };
  const doReset = async () => { try { await adminApi.del(`cms/${key}`); toast.success('Reset to defaults'); doc.reload(); } catch (e) { toast.error(errorMessage(e)); } setReset(false); };
  return (
    <div><PageHead title="Website content"><button className="btn-outline" onClick={() => setReset(true)}>Reset to defaults</button><button className="btn" disabled={busy || !draft} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button></PageHead>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Content sections">{(keys.data?.keys || Object.keys(LABELS)).map((k) => <button key={k} role="tab" aria-selected={k === key} onClick={() => setKey(k)} className={`rounded-full border px-3 py-1 text-sm font-semibold ${k === key ? 'border-brand bg-brand text-white' : 'border-neutral-400 bg-white'}`}>{LABELS[k] || k}</button>)}</div>
      <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-900">Text on the legal pages and FAQ answers marked as draft in the documentation must be reviewed by your business before launch.</p>
      <Async state={doc}>{() => draft && <Card><Node label={LABELS[key] || key} value={draft} onChange={setDraft} /></Card>}</Async>
      <ConfirmDialog open={reset} title="Reset this section?" message="Your edits to this section will be replaced with the original defaults." confirmLabel="Reset" danger onConfirm={doReset} onCancel={() => setReset(false)} />
    </div>
  );
}
