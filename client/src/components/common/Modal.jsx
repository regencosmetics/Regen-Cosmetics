import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLockBody } from '@/hooks';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/** Accessible modal: focus trap, ESC to close, scroll lock, returns focus. variant="drawer" slides from the right. */
export default function Modal({ open, onClose, title, children, variant = 'center', className = '', hideClose = false, labelledBy }) {
  const ref = useRef(null); const prev = useRef(null);
  useLockBody(open);
  useEffect(() => {
    if (!open) return undefined;
    prev.current = document.activeElement;
    const node = ref.current;
    setTimeout(() => (node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE))?.focus(), 30);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); }
      if (e.key === 'Tab' && node) {
        const f = [...node.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev.current?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  const drawer = variant === 'drawer';
  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : title} aria-labelledby={labelledBy}
        className={drawer ? `absolute right-0 top-0 flex h-full w-full max-w-[450px] flex-col bg-[#f3f4f8] shadow-2xl animate-[slidein_.3s_cubic-bezier(.22,1,.36,1)] ${className}` : `absolute left-1/2 top-1/2 max-h-[92vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white shadow-2xl ${className}`}>
        {!hideClose && <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full p-1.5 hover:bg-black/10"><X className="h-5 w-5" /></button>}
        {children}
      </div>
      <style>{'@keyframes slidein{from{transform:translateX(100%)}to{transform:none}}'}</style>
    </div>, document.body);
}
