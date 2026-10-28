import { Link } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { effectivePrice, inr, productImage } from '@/utils/format';
import { useCartActions, defaultVariant } from '@/hooks/useCartActions';

/** Product card used on Shop, Wishlist and recommendation grids (matches the Wishlist design). */
export default function ProductCard({ product, onRemove, showWishlist = true }) {
  const { add, toggleWish, isWished } = useCartActions(); const reduce = useReducedMotion();
  const v = defaultVariant(product); const out = !v || v.stock <= 0; const wished = isWished(product._id);
  const sale = v ? effectivePrice(v) : 0; const pct = v && v.price > 0 ? Math.round(((v.price - sale) / v.price) * 100) : 0;
  const href = `/products/${product.slug}`;
  return (
    <motion.article whileHover={reduce ? undefined : { y: -4 }} transition={{ duration: 0.2 }} className="flex h-full flex-col overflow-hidden rounded-[6px] border border-brand bg-white shadow-sm hover:shadow-lg">
      <div className="relative m-[4px] mb-0">
        <Link to={href} aria-label={product.name} className="block aspect-[280/331] overflow-hidden rounded-[4px] bg-sky-100">
          <img src={productImage(product)} alt={product.images?.[0]?.alt || product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
        </Link>
        {product.badge && <span className="absolute left-0 top-0 bg-brand px-1.5 py-1 text-[9px] font-semibold text-white md:text-[11px]">{product.badge}</span>}
        {onRemove ? (
          <button type="button" onClick={() => onRemove(product)} aria-label={`Remove ${product.name} from wishlist`} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow transition hover:scale-110 hover:bg-neutral-100 md:h-8 md:w-8"><X className="h-4 w-4" /></button>
        ) : showWishlist && (
          <button type="button" onClick={() => toggleWish(product)} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-110 hover:bg-white md:h-8 md:w-8"><Heart className={`h-4 w-4 ${wished ? 'fill-red-500 text-red-500' : ''}`} /></button>
        )}
        {out && <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">Out of stock</span>}
      </div>
      <div className="flex-1 px-1.5 pb-2 pt-1.5 md:px-[5px] md:pt-2">
        <h3 className="font-sans text-[12px] font-bold leading-snug text-navy md:text-[16px]"><Link to={href}>{product.name}</Link></h3>
        {product.tagline && <p className="mt-0.5 font-sans text-[10px] text-[#0a6fb8] md:text-[12px]">{product.tagline}</p>}
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2"><b className="font-sans text-[12px] text-black md:text-[14px]">{inr(sale)}</b>{pct > 0 && <><s className="text-[9px] text-neutral-500 md:text-[10px]">{inr(v.price)}</s><span className="text-[10px] font-medium text-deal md:text-[11px]">{pct}% off</span></>}</p>
      </div>
      <button type="button" onClick={() => add(product, v)} disabled={out} className="h-[32px] w-full bg-brand font-sans text-[13px] font-semibold text-white transition hover:bg-brand-600 disabled:bg-neutral-400 md:h-[34px] md:text-[16px]" aria-label={`Add ${product.name} to cart`}>{out ? 'Out of stock' : 'Add to Cart'}</button>
    </motion.article>
  );
}
