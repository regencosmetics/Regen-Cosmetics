import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Modal from '@/components/common/Modal.jsx';
import { closeAuth, openAuth } from '@/store/uiSlice';
import { login, register as registerThunk } from '@/store/authSlice';
import { errorMessage } from '@/services/api';
import { loginSchema, registerSchema, zodResolver } from '@/utils/schemas';

const field = 'h-[40px] w-full rounded-[3px] border border-neutral-400 bg-neutral-100 px-3 font-sans text-[14px] text-black placeholder:text-neutral-500 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand md:h-[40px] md:text-[16px]';

/** Email + password auth form (login or register with name, email and password). */
export function AuthForm({ mode, onDone, onSwitch, compact = false }) {
  const dispatch = useDispatch(); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [show, setShow] = useState(false);
  const isLogin = mode === 'login';
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(isLogin ? loginSchema : registerSchema) });
  const submit = async (v) => {
    setBusy(true); setErr('');
    const r = await dispatch((isLogin ? login : registerThunk)(v));
    setBusy(false);
    if (r.error) { setErr(errorMessage(r.payload)); return; }
    toast.success(isLogin ? 'Welcome back!' : 'Account created'); onDone?.(r.payload.user);
  };
  const Err = ({ m }) => (m ? <p role="alert" className="mt-0.5 text-[11px] text-red-600">{m}</p> : null);
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-2.5">
      <AnimatePresence initial={false}>
        {!isLogin && <motion.div key="n" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><label className="sr-only" htmlFor="auth-name">Full name</label><input id="auth-name" placeholder="Full name" autoComplete="name" className={field} aria-invalid={errors.name ? 'true' : undefined} {...register('name')} /><Err m={errors.name?.message} /></motion.div>}
      </AnimatePresence>
      <div><label className="sr-only" htmlFor="auth-email">Email</label><input id="auth-email" type="email" placeholder="Email address" autoComplete="email" className={field} aria-invalid={errors.email ? 'true' : undefined} {...register('email')} /><Err m={errors.email?.message} /></div>
      <div><label className="sr-only" htmlFor="auth-pass">Password</label>
        <div className="relative"><input id="auth-pass" type={show ? 'text' : 'password'} placeholder="Password" autoComplete={isLogin ? 'current-password' : 'new-password'} className={`${field} pr-10`} aria-invalid={errors.password ? 'true' : undefined} {...register('password')} />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-600">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
        <Err m={errors.password?.message} />{!isLogin && <p className="mt-0.5 text-[11px] text-neutral-600">8+ characters with upper and lower case letters and a number</p>}</div>
      {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      <button type="submit" disabled={busy} className="h-[42px] w-full rounded-[4px] bg-brand font-sans text-[17px] font-semibold text-white transition hover:bg-brand-600 hover:shadow-lg active:scale-[.99] disabled:opacity-60 md:h-[41px]">{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}</button>
      <div className={`flex ${compact ? 'flex-col gap-1' : 'items-center justify-between'} text-[13px]`}>
        {isLogin ? <Link to="/forgot-password" onClick={() => onDone?.(null, true)} className="text-brand underline">Forgot password?</Link> : <span />}
        <button type="button" onClick={onSwitch} className="font-semibold text-brand underline">{isLogin ? 'New here? Create account' : 'Have an account? Log in'}</button>
      </div>
    </form>
  );
}

const tiles = [['Customer-first', 'Putting you in the center'], ['Transparent', 'Honest from the inside out'], ['Innovative', 'Getting the absolute best for you']];
const Medal = () => <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-gradient-to-b from-white to-sky-200"><svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" fill="#04256b"><path d="M12 1l2.6 2.2 3.4-.2 1 3.2 2.8 2-1.1 3.2 1.1 3.2-2.8 2-1 3.2-3.4-.2L12 23l-2.6-2.2-3.4.2-1-3.2-2.8-2L3.3 12 2.2 8.8l2.8-2 1-3.2 3.4.2L12 1z" /><path d="M12 7l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.7 1.4.6-3L7.700 10.100l3-.4L12 7z" fill="#fff" /></svg></span>;

export default function AuthModal() {
  const dispatch = useDispatch(); const nav = useNavigate(); const { open, mode, redirectTo } = useSelector((s) => s.ui.authModal);
  const close = () => dispatch(closeAuth());
  const done = (user, skipRedirect) => { close(); if (!skipRedirect && user) nav(user.role === 'admin' && !redirectTo ? '/admin' : redirectTo || window.location.pathname + window.location.search, { replace: true }); };
  return (
    <Modal open={open} onClose={close} title={mode === 'login' ? 'Log in' : 'Create account'} hideClose className="!max-w-[1090px] !overflow-visible !rounded-[14px] !bg-[#04256b] !p-0">
      <div className="relative grid gap-4 p-4 md:grid-cols-[1fr_370px] md:items-stretch md:gap-[30px] md:p-[16px]">
        <button type="button" onClick={close} aria-label="Close" className="absolute right-2 top-2 z-10 rounded-full p-1.5 text-white/90 transition hover:rotate-90 hover:bg-white/15 md:hidden"><X className="h-5 w-5" /></button>
        <div className="flex flex-col items-center md:pt-[20px]">
          <img src="/assets/logo.png" alt="REGEN Cosmetics" className="h-[44px] w-auto md:h-[84px]" />
          <p className="mt-2 text-center font-sans text-[15px] font-medium text-white md:mt-[14px] md:text-[24px]">Signup today for best offers!</p>
          <ul className="mt-6 hidden grid-cols-3 gap-[28px] md:grid">{tiles.map(([t, s], i) => (
            <motion.li key={t} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="flex h-[167px] w-[163px] flex-col items-center justify-center rounded-[4px] bg-[#546894] px-3 text-center text-white"><Medal /><b className="mt-3 font-sans text-[20px] font-medium">{t}</b><span className="mt-1 text-[12px] leading-tight">{s}</span></motion.li>))}</ul>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="relative rounded-[14px] bg-white px-5 py-6 md:px-[21px] md:py-[34px]">
          <button type="button" onClick={close} aria-label="Close" className="absolute right-2 top-2 hidden rounded-full p-1.5 text-neutral-600 transition hover:rotate-90 hover:bg-neutral-100 md:block"><X className="h-5 w-5" /></button>
          <h2 className="mb-5 text-center font-sans text-[20px] font-medium text-black md:mb-[28px] md:text-[22px]">{mode === 'login' ? 'Login to avail exclusive offers!' : 'Register to avail exclusive offers!'}</h2>
          <AuthForm key={mode} mode={mode} onDone={done} onSwitch={() => dispatch(openAuth({ mode: mode === 'login' ? 'register' : 'login', redirectTo }))} />
          <p className="mt-4 text-center text-[10px] leading-tight text-neutral-600">I accept that I have read &amp; understood your <Link to="/privacy-policy" onClick={close} className="underline">Privacy Policy</Link> and <Link to="/terms" onClick={close} className="underline">T&amp;Cs</Link>.</p>
        </motion.div>
      </div>
    </Modal>
  );
}
