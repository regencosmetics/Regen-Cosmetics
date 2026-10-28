import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, Star, Minus, Plus, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Seo from '@/components/common/Seo.jsx';
import Accordion, { AccordionItem } from '@/components/common/Accordion.jsx';
import Reveal from '@/components/common/Reveal.jsx';
import FormField from '@/components/common/FormField.jsx';
import { RatingPicker } from '@/components/common/Primitives.jsx';
import { PageLoader, ErrorState } from '@/components/common/Feedback.jsx';
import { useOffers, describe } from '@/components/cart/OffersList.jsx';
import { useFetch, useCms } from '@/hooks';
import { useCartActions, defaultVariant } from '@/hooks/useCartActions';
import { catalogApi } from '@/services';
import { errorMessage } from '@/services/api';
import { openAuth } from '@/store/uiSlice';
import { reviewSchema, zodResolver } from '@/utils/schemas';
import { effectivePrice, inr, productImage, timeAgo } from '@/utils/format';

const navyBtn = 'inline-flex items-center justify-center rounded-[3px] bg-brand font-sans font-semibold text-white transition duration-200 hover:bg-brand-600 hover:shadow-lg active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50';
const Stars = ({ value, size = 22 }) => (
  <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} width={size} height={size} strokeWidth={1.5} className={n <= Math.round(value) ? 'fill-brand text-brand' : 'text-brand'} aria-hidden="true" />)}</span>
);

function Gallery({ images = [], name }) {
  const [i, setI] = useState(0); const list = images.length ? images : [{ url: '/assets/logo.png', alt: name }]; const cur = list[Math.min(i, list.length - 1)];
  const thumbs = (cls, each) => list.slice(0, 6).map((im, n) => (
    <button key={n} type="button" aria-label={`Show image ${n + 1}`} aria-pressed={n === i} onClick={() => setI(n)} className={`${each} overflow-hidden rounded-[6px] border-2 transition ${n === i ? 'border-brand' : 'border-transparent opacity-80 hover:opacity-100'}`}><img src={im.url} alt="" loading="lazy" className="h-full w-full object-cover" /></button>
  ));
  return (
    <div className="flex flex-col gap-3 md:flex-row md:gap-[16px]">
      <div className="hidden w-[102px] shrink-0 flex-col gap-[14px] md:flex">{thumbs('', 'h-[122px] w-[102px]')}</div>
      <div className="relative aspect-[447/530] w-full overflow-hidden rounded-[8px] bg-sky-100 md:w-[447px]">
        <AnimatePresence mode="wait"><motion.img key={cur.url} src={cur.url} alt={cur.alt || name} fetchpriority="high" className="h-full w-full object-cover" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} /></AnimatePresence>
      </div>
      <div className="grid grid-cols-4 gap-2 md:hidden">{thumbs('', 'aspect-[0.86]')}</div>
    </div>
  );
}

function OfferCards() {
  const { data: offers } = useOffers(); const cart = useSelector((s) => s.cart);
  if (!offers?.length) return null;
  const copy = async (c) => { try { await navigator.clipboard.writeText(c.code); toast.success(`${c.code} copied. Apply it in your cart or at checkout.`); } catch { toast(`Use code ${c.code} at checkout`); } };
  return (
    <section aria-label="Offers" className="mt-8 md:mt-[24px]">
      <ul className="grid grid-cols-3 gap-2 md:gap-[10px]">
        {offers.slice(0, 3).map((c, i) => (
          <motion.li key={c.code} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -3 }} className="flex flex-col rounded-[10px] border border-[#8aa0c8] bg-sky-100 p-2.5 md:min-h-[190px] md:p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand md:text-[12px]">{describe(c)}</span>
            <span className="mt-1.5 w-fit rounded border border-dashed border-brand bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-brand md:text-[14px]">{c.code}</span>
            <p className="mt-2 line-clamp-3 text-[10px] leading-snug text-ink md:text-[13px]">{(c.description || '').replace(/\s*\(sample coupon\)/i, '')}</p>
            <p className="mt-1 text-[9px] text-neutral-600 md:text-[11px]">{c.minOrderAmount > 0 ? `On orders of ${inr(c.minOrderAmount).replace('.00', '')}+` : 'No minimum order'}</p>
            <button type="button" onClick={() => copy(c)} className="mt-auto flex items-center justify-center gap-1 rounded bg-brand py-1 text-[10px] font-semibold text-white transition hover:bg-brand-600 md:mt-3 md:py-1.5 md:text-[13px]"><Copy className="h-3 w-3" />{cart.coupon?.code === c.code ? 'Applied' : 'Copy code'}</button>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

function FbtCard({ product }) {
  const { add } = useCartActions(); const v = defaultVariant(product); const out = !v || v.stock <= 0; const sale = v ? effectivePrice(v) : 0; const pct = v && v.price > 0 ? Math.round(((v.price - sale) / v.price) * 100) : 0;
  return (
    <motion.article whileHover={{ y: -4 }} className="flex flex-col overflow-hidden rounded-[6px] border border-brand bg-white">
      <Link to={`/products/${product.slug}`} className="m-[4px] mb-0 block aspect-[280/331] overflow-hidden rounded-[4px] bg-sky-100"><img src={productImage(product)} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-105" /></Link>
      <div className="flex-1 px-1.5 pb-2 pt-1.5 md:px-1 md:pt-2">
        <h3 className="font-sans text-[12px] font-bold leading-snug text-navy md:text-[18px]"><Link to={`/products/${product.slug}`}>{product.name}</Link></h3>
        {product.tagline && <p className="mt-0.5 font-sans text-[10px] text-[#0a6fb8] md:text-[13px]">{product.tagline}</p>}
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2"><b className="font-sans text-[12px] text-black md:text-[15px]">{inr(sale).replace('Rs ', 'Rs ')}</b>{pct > 0 && <><s className="text-[9px] text-neutral-500 md:text-[10px]">{inr(v.price)}</s><span className="text-[10px] font-medium text-deal md:text-[11px]">{pct}% off</span></>}</p>
      </div>
      <button type="button" disabled={out} onClick={() => add(product, v)} className={`${navyBtn} !rounded-none h-[30px] w-full text-[12px] md:h-[34px] md:text-[16px]`}>{out ? 'Out of stock' : 'Add to Cart'}</button>
    </motion.article>
  );
}

function Reviews({ product, onChange }) {
  const [page, setPage] = useState(1); const user = useSelector((s) => s.auth.user); const dispatch = useDispatch();
  const { data, reload } = useFetch(() => catalogApi.reviews(product._id, { page, limit: 3 }), [product._id, page]);
  const [rating, setRating] = useState(0); const [busy, setBusy] = useState(false); const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(reviewSchema) });
  const submit = async (v) => {
    setBusy(true);
    try { const r = await catalogApi.addReview(product._id, { ...v, rating }); toast.success(r?.message || 'Thanks for your review'); reset(); setRating(0); setOpen(false); reload(); onChange?.(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const write = () => (user ? setOpen(!open) : dispatch(openAuth({ mode: 'login' })));
  const pages = data?.pagination?.pages || 1;
  return (
    <section aria-labelledby="rev-h" className="mt-8 md:mt-[56px]">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="rev-h" className="font-sans text-[18px] font-medium tracking-wide text-black md:text-[28px]">Customer Reviews</h2>
          {data?.summary?.count > 0 && <p className="mt-1 flex items-baseline gap-3 md:mt-2"><b className="font-sans text-[22px] font-semibold md:text-[34px]">{data.summary.average}</b><span className="font-sans text-[13px] font-medium md:text-[22px]">{data.summary.count} reviews</span></p>}</div>
        <button type="button" onClick={write} className={`${navyBtn} h-[34px] w-[150px] text-[13px] md:h-[60px] md:w-[388px] md:text-[24px]`}>Write a review</button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.form key="f" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={handleSubmit(submit)} noValidate className="mt-4 max-w-lg space-y-3 overflow-hidden">
            <RatingPicker value={rating} onChange={setRating} />
            <FormField label="Title" error={errors.title?.message} {...register('title')} />
            <FormField as="textarea" rows={3} label="Review" error={errors.body?.message} {...register('body')} />
            <button className={`${navyBtn} h-11 px-8 text-sm`} disabled={busy || rating === 0}>{busy ? 'Submitting…' : 'Submit review'}</button>
          </motion.form>
        )}
      </AnimatePresence>
      <ul className="mt-6 md:mt-[34px]">
        {data?.items.map((r, k) => (
          <motion.li key={r._id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.05 }} className="border-b border-[#8a8a8a] py-5 md:py-[26px]">
            <Stars value={r.rating} size={20} />
            <div className="mt-3 flex items-center gap-3"><span className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#c4e8ff] font-sans text-[18px] font-medium text-black md:h-[52px] md:w-[52px] md:text-[26px]">{(r.displayName || '?').charAt(0).toUpperCase()}</span>
              <div><p className="font-sans text-[15px] font-medium leading-tight text-black md:text-[26px]">{r.displayName}</p><p className="text-[11px] text-neutral-600 md:text-[15px]">{timeAgo(r.createdAt)}{r.verifiedPurchase ? ' · Verified purchase' : ''}</p></div></div>
            <h3 className="mt-3 font-sans text-[16px] font-semibold text-black md:mt-[22px] md:text-[28px]">{r.title}</h3>
            <p className="mt-1 font-sans text-[12px] text-neutral-700 md:text-[16px]">{r.body}</p>
          </motion.li>
        ))}
        {data && data.items.length === 0 && <li className="py-6 text-sm text-neutral-600">No reviews yet. Be the first to review this product.</li>}
      </ul>
      {pages > 1 && (
        <nav aria-label="Review pages" className="mt-6 flex items-center justify-center gap-3">
          <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-neutral-600 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          {Array.from({ length: pages }, (_, n) => n + 1).slice(0, 7).map((n) => <button key={n} type="button" aria-current={n === page ? 'page' : undefined} onClick={() => setPage(n)} className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border text-[13px] transition ${n === page ? 'border-brand bg-brand text-white' : 'border-neutral-400 text-neutral-600 hover:border-brand'}`}>{n}</button>)}
          <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)} className="text-brand disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </nav>
      )}
    </section>
  );
}

export default function ProductDetail() {
  const { slug } = useParams(); const nav = useNavigate();
  const { data, loading, error, reload } = useFetch(() => catalogApi.product(slug), [slug]);
  const { data: faqs } = useCms('faqs'); const { data: ship } = useCms('legal.shipping');
  const { add, toggleWish, isWished } = useCartActions();
  const [sku, setSku] = useState(null); const [qty, setQty] = useState(1);
  useEffect(() => { if (data) { setSku(defaultVariant(data.product).sku); setQty(1); } }, [data]);
  if (loading) return <PageLoader />;
  if (error) return <div className="wrap py-10"><ErrorState message={error} onRetry={reload} /></div>;
  const p = data.product; const v = p.variants.find((x) => x.sku === sku) || defaultVariant(p); const out = v.stock <= 0;
  const sale = effectivePrice(v); const pct = v.price > 0 ? Math.round(((v.price - sale) / v.price) * 100) : 0;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.shortDescription || p.description, image: p.images.map((i) => i.url), sku: v.sku, brand: { '@type': 'Brand', name: 'REGEN Cosmetics' },
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: sale, availability: out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' },
    ...(p.ratingCount ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.ratingAverage, reviewCount: p.ratingCount } } : {}) };
  const buyNow = async () => { if (await add(p, v, qty)) nav('/checkout'); };
  const [h1, ...hrest] = p.highlights || []; const sections = ['Product Detail', 'Key Features', 'How To Use?'];
  const policy = (s) => (s ? [s.intro, ...(s.sections || []).slice(0, 2).map((x) => x.heading)].filter(Boolean).join(' · ') : '');
  const info = [p.ingredients && `Ingredients: ${p.ingredients}`, p.benefits?.length && `Benefits: ${p.benefits.join(', ')}`, p.instructions?.length && `How to use: ${p.instructions.join(' ')}`].filter(Boolean);
  return (
    <div className="wrap pb-6 pt-[18px] md:pt-[49px]">
      <Seo title={p.seo?.title || p.name} description={p.seo?.description || p.shortDescription} image={p.images[0]?.url} path={`/products/${p.slug}`} type="product" jsonLd={jsonLd} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[565px_1fr] md:gap-[35px]">
        <div className="md:col-start-1 md:row-start-1">
          <h1 className="mb-3 font-sans text-[20px] font-semibold leading-tight text-black md:hidden">{p.name}</h1>
          <Reveal><Gallery images={p.images} name={p.name} /></Reveal>
          <div className="mt-4 hidden items-start justify-between md:flex md:pl-[2px] md:pr-[2px] md:pt-[8px]">{[1, 2, 3].map((n) => <img key={n} src={`/assets/trust-${n}.webp`} alt="" loading="lazy" className="h-[92px] w-auto" />)}</div>
        </div>
        <div className="md:col-start-2 md:row-start-1 md:max-w-[600px]">
          <h1 className="hidden font-sans text-[32px] font-semibold leading-[37px] text-black md:block">{p.name}</h1>
          <p className="flex flex-wrap items-center gap-3 md:mt-[10px]">{p.shortDescription && <span className="font-sans text-[14px] text-black md:text-[16px]">{p.shortDescription.split('.')[0]}</span>}
            {p.ratingCount > 0 && <span className="inline-flex items-center gap-1 rounded bg-[#3a9d46] px-2 py-0.5 text-[12px] font-medium text-white md:text-[13px]"><Star className="h-3 w-3 fill-white" />{p.ratingAverage} ({p.ratingCount})</span>}</p>
          <p className="mt-3 font-sans text-[14px] leading-[21px] text-neutral-700 md:mt-[22px] md:text-[18px]">{p.description || p.shortDescription}</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 md:mt-[28px]"><span className="font-sans text-[22px] font-bold text-black md:text-[26px]">{inr(sale).replace('Rs ', 'Rs. ')}</span>
            {pct > 0 && <><s className="text-[11px] text-neutral-500 md:text-[12px]">{inr(v.price)}</s><span className="text-[12px] font-medium text-deal md:text-[15px]">{pct}% off</span></>}</div>
          <p className="text-[11px] text-neutral-800 md:text-[13px]">(Inclusive of all taxes)</p>
          {p.variants.filter((x) => x.active !== false).length > 1 ? (
            <fieldset className="mt-4"><legend className="text-[12px] md:text-[13px]">Size:</legend><div className="mt-1 flex flex-wrap gap-2">{p.variants.filter((x) => x.active !== false).map((x) => (
              <button key={x.sku} type="button" aria-pressed={x.sku === v.sku} onClick={() => setSku(x.sku)} className={`rounded border px-3 py-1 text-[13px] font-semibold transition ${x.sku === v.sku ? 'border-brand bg-brand text-white' : 'border-neutral-400'} ${x.stock <= 0 ? 'opacity-50' : ''}`}>{x.label}{x.stock <= 0 ? ' (sold out)' : ''}</button>))}</div></fieldset>
          ) : <p className="mt-5 text-[12px] md:mt-[34px] md:text-[13px]">Size: <b>{v.size || v.label}</b></p>}
          <p className="text-[12px] md:text-[13px]">Net Content: <b>{v.netContent || v.label}</b></p>
          <p className={`mt-1 text-[12px] font-semibold ${out ? 'text-red-600' : v.stock <= 5 ? 'text-amber-700' : 'text-transparent'}`} aria-live="polite">{out ? 'Out of stock' : v.stock <= 5 ? `Only ${v.stock} left` : 'In stock'}</p>
          {h1 && <p className="mt-3 font-sans text-[13px] italic text-black md:mt-[22px] md:text-[15px]">{h1}</p>}
          {(hrest.length > 0 || p.instructions?.length > 0) && <ul className="mt-3 list-disc space-y-1 pl-6 text-[12px] text-black md:mt-[22px] md:text-[14px]">{hrest.map((b) => <li key={b}>{b}</li>)}{p.instructions?.map((b) => <li key={b}>Instruction To Use: {b}</li>)}</ul>}
          <div className="mt-5 flex items-center gap-3 md:mt-[28px] md:max-w-[500px]">
            <div className="inline-flex h-[36px] items-center rounded-[3px] border border-neutral-400 bg-neutral-100 md:h-[36px] md:w-[104px] md:justify-between" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={out || qty <= 1} onClick={() => setQty(qty - 1)} className="flex h-full w-9 items-center justify-center hover:bg-neutral-200 disabled:opacity-40"><Minus className="h-3 w-3" /></button>
              <span className="min-w-[1.5rem] text-center text-[14px]" aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" disabled={out || qty >= Math.min(20, v.stock || 1)} onClick={() => setQty(qty + 1)} className="flex h-full w-9 items-center justify-center hover:bg-neutral-200 disabled:opacity-40"><Plus className="h-3 w-3" /></button>
            </div>
            <button type="button" disabled={out} onClick={() => add(p, v, qty)} className={`${navyBtn} h-[36px] flex-1 text-[14px] md:w-[324px] md:flex-none`}>Add to Cart</button>
            <button type="button" className="flex h-[36px] w-[36px] items-center justify-center rounded-[3px] border border-neutral-400 transition hover:bg-neutral-100" aria-pressed={isWished(p._id)} aria-label={isWished(p._id) ? 'Remove from wishlist' : 'Add to wishlist'} onClick={() => toggleWish(p)}><Heart className={`h-4 w-4 ${isWished(p._id) ? 'fill-red-500 text-red-500' : ''}`} /></button>
          </div>
          <button type="button" disabled={out} onClick={buyNow} className={`${navyBtn} mt-3 h-[36px] w-full text-[14px] md:max-w-[498px]`}>Buy it now</button>
          <div className="mt-6 md:mt-[34px] md:max-w-[498px]">
            <AccordionItem title="Description" size="sm"><p className="whitespace-pre-line">{p.description || p.shortDescription}</p></AccordionItem>
            <AccordionItem title="Shipping Policy" size="sm"><p>{policy(ship) || 'Orders are shipped within 1–2 business days.'} <Link to="/shipping-returns" className="text-brand underline">Read the full policy</Link></p></AccordionItem>
            <AccordionItem title="Return Policy" size="sm"><p>Eligible orders can be replaced or refunded within 7 days of delivery. <Link to="/shipping-returns#refund" className="text-brand underline">See Returns &amp; Refunds</Link></p></AccordionItem>
            <AccordionItem title="Information" size="sm">{info.length ? info.map((t) => <p key={t} className="mb-1">{t}</p>) : <p>SKU: {v.sku}</p>}</AccordionItem>
          </div>
          <OfferCards />
          {data.frequentlyBoughtTogether?.length > 0 && (
            <section className="mt-8 md:mt-[48px]" aria-labelledby="fbt-h">
              <Reveal className="text-center"><h2 id="fbt-h" className="font-sans text-[22px] font-semibold tracking-wide text-black md:text-[32px]">Frequently bought together</h2><p className="mt-1 text-[12px] text-neutral-700 md:text-[16px]">Pair it with these favourites.</p></Reveal>
              <div className="mt-4 grid grid-cols-2 gap-3 md:mt-[30px] md:gap-[30px]">{data.frequentlyBoughtTogether.slice(0, 2).map((x) => <FbtCard key={x._id} product={x} />)}</div>
            </section>
          )}
        </div>
      </div>

      {p.detailImages?.map((im, i) => (
        <section key={im.url} className="mt-8 md:mt-[58px]">
          <Reveal><h2 className="font-sans text-[20px] font-semibold tracking-wide text-black md:text-[32px]">{sections[i] || 'More details'}</h2>
            <img src={im.url} alt={im.alt || sections[i]} loading="lazy" className="mt-3 w-full rounded-[2px] md:mt-[16px]" />
            {i === 0 && p.description && <p className="mt-4 whitespace-pre-line font-sans text-[12px] leading-[22px] text-neutral-700 md:mt-[22px] md:text-[16px] md:leading-[25px]">{p.description}</p>}</Reveal>
        </section>
      ))}
      <Reviews product={p} onChange={reload} />
      {faqs?.items?.length > 0 && <section className="mt-10 md:mt-[60px]" aria-labelledby="pfaq-h"><h2 id="pfaq-h" className="mb-3 font-sans text-[18px] font-semibold tracking-wide text-black md:mb-[24px] md:text-[32px]">Frequently Asked Questions:</h2><Accordion items={[...(p.faqs || []).map((f) => ({ title: f.q, content: f.a })), ...faqs.items.map((i) => ({ title: i.q, content: i.a }))]} /></section>}
    </div>
  );
}
