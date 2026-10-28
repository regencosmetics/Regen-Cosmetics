import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function AccordionItem({ title, children, defaultOpen = false, size = 'md' }) {
  const [open, setOpen] = useState(defaultOpen); const id = useId();
  return (
    <div className="border-b border-[#8a8a8a]">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
          className={`flex w-full items-center justify-between gap-4 py-[14px] text-left font-sans ${size === 'sm' ? 'text-[14px]' : 'text-[12px] md:text-[16px]'} font-normal text-black md:py-[16px]`}>
          <span>{title}</span>
          <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} className="shrink-0"><Plus className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.6} /></motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} role="region" key="c" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="overflow-hidden">
            <div className="pb-4 pr-8 text-[13px] leading-relaxed text-neutral-700 md:text-[15px]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default function Accordion({ items, className = '', size }) {
  return <div className={className}>{items.map((it, i) => <AccordionItem key={i} title={it.title} size={size}>{it.content}</AccordionItem>)}</div>;
}
