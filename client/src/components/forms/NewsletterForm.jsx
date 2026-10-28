import { useState } from 'react';
import toast from 'react-hot-toast';
import { publicApi } from '@/services';
import { errorMessage } from '@/services/api';
import { email as emailSchema } from '@/utils/schemas';

export default function NewsletterForm() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    const v = emailSchema.safeParse(email); if (!v.success) { setError(v.error.issues[0].message); return; }
    setBusy(true);
    try { await publicApi.subscribe(email.trim()); toast.success('Thanks for subscribing!'); setEmail(''); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-2 md:space-y-[13px]">
      <label htmlFor="nl-email" className="sr-only">Email address</label>
      <input id="nl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" autoComplete="email"
        className="h-[32px] w-full rounded-[3px] border border-white bg-transparent px-2 text-[10px] font-medium text-white placeholder:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 md:h-[39px] md:px-[26px] md:text-[18px]" aria-invalid={error ? 'true' : undefined} />
      {error && <p role="alert" className="text-xs text-red-200">{error}</p>}
      <button type="submit" disabled={busy} className="h-[32px] w-full rounded-[3px] bg-white text-[11px] font-bold uppercase text-brand transition hover:bg-sky-100 active:scale-[.99] disabled:opacity-60 md:h-[39px] md:text-[20px]">{busy ? 'Subscribing…' : 'Subscribe'}</button>
    </form>
  );
}
