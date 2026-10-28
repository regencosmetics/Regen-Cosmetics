import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, Mail, Image as Img, Truck, CheckCircle2, CircleAlert } from 'lucide-react';
import { PageHead, Card, Async, Toggle } from './ui.jsx';
import { useFetch } from '@/hooks';
import { adminApi } from '@/services';
import { errorMessage } from '@/services/api';

const GROUPS = [
  { id: 'payments', title: 'Payments', icon: CreditCard, help: 'Razorpay for online payments and Cash on Delivery rules. Get keys from your Razorpay dashboard (Settings → API Keys). Set the webhook URL there to /api/v1/payments/webhook.' },
  { id: 'email', title: 'Email (Resend)', icon: Mail, help: 'Order, shipping and password-reset emails are sent through Resend. The From address must belong to a domain you verified in Resend.' },
  { id: 'images', title: 'Image uploads (Cloudinary)', icon: Img, help: 'Used when you upload product, banner and content images.' },
  { id: 'store', title: 'Shipping & store rules', icon: Truck, help: 'Charges and policies applied at the cart and checkout.' },
];

function Row({ f, val, set, reset }) {
  const id = `s-${f.key}`;
  const changed = val !== undefined;
  return (
    <div className="grid gap-1 sm:grid-cols-[240px_1fr] sm:items-start sm:gap-4">
      <label htmlFor={id} className="pt-2 text-sm font-semibold text-navy">{f.label}</label>
      <div>
        {f.type === 'boolean' ? (
          <div className="pt-2"><Toggle label={(changed ? val : f.value) ? 'On' : 'Off'} checked={changed ? val : f.value} onChange={set} /></div>
        ) : (
          <input id={id} className="input" type={f.type === 'number' ? 'number' : f.secret ? 'password' : 'text'} min={f.type === 'number' ? 0 : undefined} autoComplete="off"
            placeholder={f.secret ? (f.isSet ? `${f.masked} (saved — type to replace)` : 'Not set') : ''} value={changed ? val : f.secret ? '' : f.value} onChange={(e) => set(e.target.value)} />
        )}
        <p className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
          {f.isSet ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{f.source === 'panel' ? 'Saved in admin' : 'Using .env value'}</span> : f.secret || f.type === 'string' ? <span className="inline-flex items-center gap-1 text-amber-700"><CircleAlert className="h-3.5 w-3.5" />Not set</span> : null}
          {f.source === 'panel' && <button type="button" className="text-brand underline" onClick={reset}>Reset to .env</button>}
        </p>
      </div>
    </div>
  );
}

function Form({ initial, onSaved }) {
  const [edits, setEdits] = useState({}); const [busy, setBusy] = useState(false);
  useEffect(() => setEdits({}), [initial]);
  const save = async (patch) => {
    setBusy(true);
    try { onSaved(await adminApi.put('settings', patch)); setEdits({}); toast.success('Settings saved'); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const dirty = Object.keys(edits).length > 0;
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(edits); }} className="space-y-5">
      {GROUPS.map((g) => (
        <Card key={g.id} title={<span className="inline-flex items-center gap-2"><g.icon className="h-4 w-4" />{g.title}</span>}>
          <p className="mb-4 text-sm text-neutral-600">{g.help}</p>
          <div className="space-y-4">
            {Object.values(initial).filter((f) => f.group === g.id).map((f) => <Row key={f.key} f={f} val={edits[f.key]} set={(v) => setEdits({ ...edits, [f.key]: v })} reset={() => save({ [f.key]: null })} />)}
          </div>
        </Card>
      ))}
      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-lg border bg-white/95 p-3 shadow-lg backdrop-blur">
        <p className="text-sm text-neutral-600">{dirty ? 'You have unsaved changes.' : 'Changes apply immediately — no restart needed.'}</p>
        <button className="btn" disabled={!dirty || busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  );
}

export default function Settings() {
  const st = useFetch(() => adminApi.get('settings'), []);
  const [fresh, setFresh] = useState(null);
  return (
    <>
      <PageHead title="Settings" />
      <p className="mb-4 max-w-3xl text-sm text-neutral-600">Run the store from here. Secret keys are encrypted and never shown again after saving. Anything left unset falls back to the server&rsquo;s .env file.</p>
      <Async state={st}>{(d) => <Form initial={fresh || d} onSaved={setFresh} />}</Async>
    </>
  );
}
