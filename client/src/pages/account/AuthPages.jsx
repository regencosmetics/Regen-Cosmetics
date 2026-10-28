import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Seo from '@/components/common/Seo.jsx';
import FormField from '@/components/common/FormField.jsx';
import { AuthForm } from '@/components/layout/AuthModal.jsx';
import { authApi, publicApi } from '@/services';
import { errorMessage } from '@/services/api';
import { forgotSchema, resetSchema, zodResolver } from '@/utils/schemas';

const Shell = ({ title, children }) => <div className="wrap max-w-md py-12"><Seo title={title} noindex /><div className="rounded bg-white p-6 shadow-sm"><h1 className="mb-4 font-display text-2xl font-semibold text-brand">{title}</h1>{children}</div></div>;

function Forgot() {
  const [sent, setSent] = useState(false); const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(forgotSchema) });
  const go = async (v) => { try { await authApi.forgot(v); setSent(true); } catch (e) { toast.error(errorMessage(e)); } };
  return <Shell title="Forgot password">{sent ? <p role="status">If an account exists for that email, we have sent a password reset link. It expires shortly.</p> : (
    <form onSubmit={handleSubmit(go)} noValidate className="space-y-3"><FormField label="Email" type="email" error={errors.email?.message} {...register('email')} /><button className="btn w-full" disabled={isSubmitting}>Send reset link</button></form>)}</Shell>;
}
function Reset() {
  const [sp] = useSearchParams(); const nav = useNavigate(); const token = sp.get('token');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(resetSchema) });
  const go = async (v) => { try { await authApi.reset({ token, password: v.password }); toast.success('Password updated. Please log in.'); nav('/login'); } catch (e) { toast.error(errorMessage(e)); } };
  if (!token) return <Shell title="Reset password"><p>This reset link is invalid. <Link className="underline" to="/forgot-password">Request a new one</Link>.</p></Shell>;
  return <Shell title="Reset password"><form onSubmit={handleSubmit(go)} noValidate className="space-y-3">
    <FormField label="New password" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
    <FormField label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} /><button className="btn w-full" disabled={isSubmitting}>Update password</button></form></Shell>;
}
function Unsub() {
  const [sp] = useSearchParams(); const [state, setState] = useState('working');
  useEffect(() => { const t = sp.get('token'); if (!t) { setState('bad'); return; } publicApi.unsubscribe(t).then(() => setState('done')).catch(() => setState('bad')); }, [sp]);
  return <Shell title="Unsubscribe"><p role="status">{state === 'working' ? 'Working…' : state === 'done' ? 'You have been unsubscribed from our newsletter.' : 'This unsubscribe link is invalid or has expired.'}</p></Shell>;
}
export default function AuthPages({ kind }) {
  const nav = useNavigate();
  if (kind === 'forgot') return <Forgot />; if (kind === 'reset') return <Reset />; if (kind === 'unsubscribe') return <Unsub />;
  return <Shell title={kind === 'login' ? 'Log in' : 'Create account'}><AuthForm mode={kind} onDone={(u) => u && nav(u.role === 'admin' ? '/admin' : '/account', { replace: true })} onSwitch={() => nav(kind === 'login' ? '/register' : '/login')} /></Shell>;
}
