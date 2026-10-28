import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export default function ImageGallery({ images = [], name }) {
  const [i, setI] = useState(0); const reduce = useReducedMotion();
  const list = images.length ? images : [{ url: '/assets/logo.png', alt: name }];
  const cur = list[Math.min(i, list.length - 1)];
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[6px] bg-sky-100">
        <AnimatePresence mode="wait">
          <motion.img key={cur.url} src={cur.url} alt={cur.alt || name} width="800" height="800" fetchpriority="high"
            className="h-full w-full object-cover" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.2 }} />
        </AnimatePresence>
      </div>
      {list.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3" role="tablist" aria-label="Product images">
          {list.slice(0, 8).map((im, n) => (
            <button key={n} type="button" role="tab" aria-selected={n === i} aria-label={`Show image ${n + 1}`} onClick={() => setI(n)}
              className={`aspect-square overflow-hidden rounded-[4px] border-2 ${n === i ? 'border-navy' : 'border-transparent'}`}>
              <img src={im.url} alt="" loading="lazy" width="200" height="200" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
