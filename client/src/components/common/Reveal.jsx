import { motion, useReducedMotion } from 'framer-motion';

export default function Reveal({ children, delay = 0, y = 24, className = '', as = 'div' }) {
  const reduce = useReducedMotion(); const Tag = motion[as] || motion.div;
  if (reduce) return <div className={className}>{children}</div>;
  return <Tag className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay, ease: 'easeOut' }}>{children}</Tag>;
}
