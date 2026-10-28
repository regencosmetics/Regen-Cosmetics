import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { errorMessage } from '@/services/api';

export const useAppDispatch = useDispatch;
export const useAuth = () => { const user = useSelector((s) => s.auth.user); return { user, isAdmin: user?.role === 'admin', isAuthed: Boolean(user), ready: useSelector((s) => s.auth.ready) }; };

/** Generic data hook: { data, loading, error, reload, setData }. */
export function useFetch(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const fnRef = useRef(fn); fnRef.current = fn;
  const seq = useRef(0);
  const run = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try { const data = await fnRef.current(); if (id === seq.current) setState({ data, loading: false, error: null }); }
    catch (e) { if (id === seq.current) setState({ data: null, loading: false, error: errorMessage(e), status: e?.response?.status }); }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (enabled) run(); else setState((s) => ({ ...s, loading: false })); }, [enabled, ...deps]);
  return { ...state, reload: run, setData: (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })) };
}

export function useDebounce(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
export function useMediaQuery(q) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false));
  useEffect(() => { if (!window.matchMedia) return undefined; const mq = window.matchMedia(q); const h = () => setM(mq.matches); mq.addEventListener('change', h); h(); return () => mq.removeEventListener('change', h); }, [q]);
  return m;
}
export function useLockBody(locked) {
  useEffect(() => { if (!locked) return undefined; const p = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = p; }; }, [locked]);
}
export function useCms(key) {
  return useFetch(async () => (await (await import('@/services')).publicApi.cms(key)).content, [key]);
}
