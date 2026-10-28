import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Reveal from "@/components/common/Reveal.jsx";
import Accordion from "@/components/common/Accordion.jsx";
import { useFetch, useMediaQuery } from "@/hooks";
import { catalogApi } from "@/services";
import { useCartActions, defaultVariant } from "@/hooks/useCartActions";
import { effectivePrice, inr, productImage } from "@/utils/format";

const navyBtn =
  "inline-flex items-center justify-center rounded-[3px] bg-brand font-sans font-semibold text-white transition duration-200 hover:bg-brand-600 hover:shadow-lg active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50";

/* ───────────────────────── Hero ───────────────────────── */
export function Hero({ d }) {
  const reduce = useReducedMotion();
  const items = d.ticker?.length ? d.ticker : [];
  const loop = [...items, ...items, ...items, ...items];
  return (
    <section aria-label="Hero" className="relative bg-navy-header">
      <div className="relative aspect-[393/480] w-full overflow-hidden bg-[#020828] md:aspect-[1440/500]">
        <motion.img
          src={d.image}
          alt=""
          initial={reduce ? false : { scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className="absolute left-[-45%] top-[24%] h-auto w-[190%] max-w-none [mask-image:linear-gradient(to_bottom,transparent,#000_16%,#000_84%,transparent)] md:inset-0 md:left-0 md:top-0 md:h-full md:w-full md:object-cover md:object-center md:[mask-image:none]"
          fetchpriority="high"
        />
        <div className="absolute inset-x-0 top-[12%] px-5 text-center text-white md:inset-x-auto md:left-[56%] md:right-0 md:top-[20%] md:px-0">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto max-w-[22ch] whitespace-pre-line font-display text-[21px] font-medium leading-[1.12] tracking-[0.02em] md:mx-0 md:max-w-none md:text-[clamp(28px,3.1vw,44px)]"
          >
            {d.headline}
          </motion.h1>
          <motion.div
            className="hidden md:block"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link
              to={d.ctaLink}
              className="group mt-[24px] inline-flex h-[38px] items-center gap-2.5 rounded-[4px] bg-white px-[20px] font-display text-[20px] font-semibold text-brand shadow-lg transition hover:bg-sky-100 lg:h-[38px]"
            >
              {d.ctaText}
              <ArrowRight
                className="h-5 w-5 transition-transform group-hover:translate-x-1.5"
                strokeWidth={1.6}
              />
            </Link>
          </motion.div>
        </div>
        <motion.div
          className="absolute inset-x-0 bottom-[7%] flex justify-center md:hidden"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Link
            to={d.ctaLink}
            className="inline-flex h-[28px] items-center gap-1.5 rounded-[3px] bg-white px-4 font-display text-[13px] font-semibold text-brand"
          >
            {d.ctaText}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
      <div
        className="relative h-[26px] overflow-x-clip bg-sky-band md:h-[40px]"
        aria-hidden="true"
      >
        <div
          className="absolute left-[-6%] top-[-10px] z-10 w-[112%] -rotate-[4deg] overflow-hidden bg-[#21a2f4] py-[5px] md:top-[-22px] md:-rotate-[5.7deg] md:py-[11px]"
          style={{ height: "auto" }}
        >
          <div
            className={`flex w-max items-center gap-6 whitespace-nowrap font-sans text-[9px] font-semibold uppercase tracking-wide text-navy md:gap-[50px] md:text-[15px] ${reduce ? "" : "animate-[tickerx_32s_linear_infinite]"}`}
          >
            {loop.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-6 md:gap-[50px]"
              >
                {t}
                <span className="text-[10px] md:text-[20px]">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="h-[16px] bg-white md:h-[50px]" />
      <style>{"@keyframes tickerx{to{transform:translateX(-25%)}}"}</style>
    </section>
  );
}

/* ───────────────────────── Our Products ───────────────────────── */
export function ProductRow({ product, index = 0 }) {
  const { add } = useCartActions();
  const v = defaultVariant(product);
  const out = !v || v.stock <= 0;
  const sale = v ? effectivePrice(v) : 0;
  const pct =
    v && v.price > 0 ? Math.round(((v.price - sale) / v.price) * 100) : 0;
  const href = `/products/${product.slug}`;
  const blurb = product.shortDescription || product.description || "";
  return (
    <Reveal y={36} delay={Math.min(index, 3) * 0.05}>
      <article
        className="group relative pt-[52px] md:pt-[78px]"
        aria-label={product.name}
      >
        <Link
          to={href}
          className="absolute left-[20px] top-0 z-10 block h-[115px] w-[100px] overflow-hidden rounded-[6px] border-[2px] border-brand bg-sky-100 shadow-md md:left-[24px] md:h-[275px] md:w-[244px] md:rounded-[8px] md:border-[2.5px]"
          aria-label={product.name}
        >
          <img
            src={productImage(product)}
            alt={product.images?.[0]?.alt || product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          {product.badge && (
            <span className="absolute left-0 top-0 bg-brand px-1.5 py-[2px] font-sans text-[7px] font-semibold text-white md:px-[7px] md:py-[3px] md:text-[11px]">
              {product.badge}
            </span>
          )}
        </Link>
        <div className="absolute left-[130px] right-0 top-0 md:left-[288px]">
          <h3 className="font-sans text-[11px] font-semibold leading-snug text-brand md:text-[18px] md:leading-tight">
            <Link to={href} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          {product.tagline && (
            <p className="mt-0.5 font-sans text-[8px] text-[#0a6fb8] md:mt-1.5 md:text-[14px]">
              {product.tagline}
            </p>
          )}
        </div>
        <div className="min-h-[85px] rounded-[8px] border border-[#8aa0c8] bg-sky-100 pb-3 pl-[130px] pr-2.5 pt-2.5 md:min-h-[220px] md:rounded-[14px] md:pb-[22px] md:pl-[288px] md:pr-[22px] md:pt-[16px]">
          <p className="line-clamp-4 font-sans text-[8.5px] leading-snug text-ink md:text-[13px] md:leading-[17px]">
            {blurb}
          </p>
          <p className="mt-1.5 font-sans text-[8px] text-black md:mt-[20px] md:text-[11px]">
            Size: <b>{v?.size || v?.label}</b>
          </p>
          <p className="font-sans text-[8px] text-black md:text-[11px]">
            Net Content: <b>{v?.netContent || v?.label}</b>
          </p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 md:mt-[14px] md:gap-x-3">
            <span className="font-sans text-[13px] font-bold text-brand md:text-[18px]">
              {inr(sale)}
            </span>
            {pct > 0 && (
              <>
                <s className="font-sans text-[8px] text-neutral-500 md:text-[12px]">
                  {inr(v.price)}
                </s>
                <span className="font-sans text-[8.5px] font-medium text-deal md:text-[14px]">
                  {pct}% off
                </span>
              </>
            )}
          </div>
          <p className="font-sans text-[7px] text-ink md:text-[11px]">
            (Inclusive of all taxes)
          </p>
          <button
            type="button"
            onClick={() => add(product, v)}
            disabled={out}
            className={`${navyBtn} mt-1.5 h-[22px] w-full text-[9.5px] md:mt-[12px] md:h-[32px] md:w-[260px] md:text-[15px]`}
          >
            {out ? "Out of stock" : "Add to Cart"}
          </button>
        </div>
      </article>
    </Reveal>
  );
}

export function ProductsSection({ d }) {
  const [tab, setTab] = useState(0);
  const tabs = d.tabs?.length ? d.tabs : ["All"];
  const best = /best/i.test(tabs[tab] || "");
  const { data, loading } = useFetch(
    () =>
      catalogApi.products({
        limit: 6,
        bestseller: best ? "true" : "",
        sort: "newest",
      }),
    [tab],
  );
  return (
    <section className="wrap pt-[14px] md:pt-[24px]" aria-labelledby="prod-h">
      <Reveal>
        <h2
          id="prod-h"
          className="font-display text-[18px] font-semibold leading-none text-navy md:text-[36px] md:font-semibold"
        >
          {d.title}
        </h2>
      </Reveal>
      <div
        role="tablist"
        className="mt-2.5 flex gap-2 md:mt-[24px] md:gap-[12px]"
      >
        {tabs.map((t, i) => (
          <button
            key={`${t}-${i}`}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`relative h-[20px] rounded-full border px-[10px] font-sans text-[9px] font-medium transition md:h-[30px] md:px-[16px] md:text-[15px] ${tab === i ? "border-brand bg-brand text-white" : "border-[#888] bg-white text-[#777] hover:border-brand hover:text-brand"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-6 md:mt-[48px] md:space-y-[48px]">
        {loading ? (
          [0, 1].map((i) => (
            <div
              key={i}
              className="skeleton h-[120px] rounded-xl md:h-[295px]"
            />
          ))
        ) : data?.items?.length ? (
          data.items.map((p, i) => (
            <ProductRow key={p._id} product={p} index={i} />
          ))
        ) : (
          <p className="py-8 text-center text-neutral-600">
            No products to show yet.
          </p>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── Shop by concern ───────────────────────── */
export function Concerns({ d }) {
  const [who, setWho] = useState("men");
  const list = d[who] || d.men || [];
  return (
    <section className="wrap mt-8 md:mt-[72px]" aria-labelledby="con-h">
      <Reveal>
        <h2
          id="con-h"
          className="text-center font-display text-[18px] font-semibold text-navy md:text-[36px] md:font-semibold"
        >
          {d.title}
        </h2>
      </Reveal>
      <div className="mt-2.5 flex justify-center gap-2 md:mt-[30px] md:gap-[28px]">
        {["men", "women"].map((w) => (
          <button
            key={w}
            onClick={() => setWho(w)}
            aria-pressed={who === w}
            className={`h-[20px] w-[58px] rounded-[3px] border font-sans text-[10px] font-semibold capitalize transition md:h-[42px] md:w-[155px] md:rounded-[4px] md:text-[18px] ${who === w ? "border-brand bg-brand text-white" : "border-[#888] bg-white text-brand hover:border-brand"}`}
          >
            {w}
          </button>
        ))}
      </div>
      <ul className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-2 md:mt-[38px] md:justify-between md:gap-0 md:overflow-visible">
        {list.map((c, i) => (
          <motion.li
            key={`${who}-${c.slug}`}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className="shrink-0 md:w-[180px]"
          >
            <Link
              to={`/shop?concern=${c.slug}&for=${who}`}
              className="group flex w-[64px] flex-col items-center md:w-full"
            >
              <span className="relative flex h-[64px] w-[64px] items-center justify-center rounded-full border border-dashed border-brand md:h-[140px] md:w-[140px]">
                <img
                  src={c.image || `/assets/concern-${(i % 5) + 1}.webp`}
                  alt=""
                  loading="lazy"
                  className="h-[58px] w-[58px] rounded-full border-2 border-brand object-cover transition duration-300 group-hover:scale-105 md:h-[130px] md:w-[130px] md:border-[2.5px]"
                />
              </span>
              <span className="mt-1 whitespace-nowrap font-sans text-[8px] font-medium text-navy md:mt-[12px] md:text-[13px]">
                {c.label}
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────────────────── Own your skin ───────────────────────── */
export const OwnSkin = ({ d }) => (
  <section className="wrap mt-6 grid items-center md:mt-[44px] md:grid-cols-[1fr_310px] md:gap-5">
    <Reveal className="order-2 text-center md:order-1 md:text-left">
      <h2 className="hidden font-display text-[36px] font-semibold text-navy md:block">
        {d.title}
      </h2>
      <div className="md:mt-[24px]">
        {d.paragraphs.map((p) => (
          <p
            key={p}
            className="mt-3 font-ps text-[10.5px] leading-snug text-ink md:mt-0 md:mb-[18px] md:max-w-[580px] md:text-[15px] md:leading-[20px]"
          >
            {p}
          </p>
        ))}
      </div>
      <Link
        to={d.ctaLink}
        className={`${navyBtn} mt-4 h-[22px] px-6 text-[10px] uppercase md:mt-[22px] md:h-[40px] md:w-[245px] md:text-[15px]`}
      >
        {d.ctaText}
      </Link>
    </Reveal>
    <div className="order-1 md:order-2">
      <h2 className="text-center font-display text-[18px] font-semibold text-navy md:hidden">
        {d.title}
      </h2>
      <Reveal
        delay={0.1}
        className="mx-auto mt-2 w-[150px] md:mt-0 md:w-[310px]"
      >
        <motion.img
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          src={d.image}
          alt=""
          loading="lazy"
          className="w-full"
        />
      </Reveal>
    </div>
  </section>
);

/* ───────────────────────── Sample Video Data ───────────────────────── */
const DEFAULT_SAMPLE_VIDEOS = [
  {
    id: "sample-1",
    title: "Daily Serum Apply",
    video:
      "https://assets.mixkit.co/videos/preview/mixkit-woman-applying-face-cream-41585-large.mp4",
    image:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&q=80",
    link: "/shop",
  },
  {
    id: "sample-2",
    title: "Facial Cleanser Demo",
    video:
      "https://assets.mixkit.co/videos/preview/mixkit-young-woman-washing-her-face-41584-large.mp4",
    image:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80",
    link: "/shop",
  },
  {
    id: "sample-3",
    title: "Hydrating Moisturizer",
    video:
      "https://assets.mixkit.co/videos/preview/mixkit-woman-putting-on-face-cream-in-front-of-a-41583-large.mp4",
    image:
      "https://plus.unsplash.com/premium_photo-1674739375749-7efe56fc8bbb?q=80&w=686&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    link: "/shop",
  },
  {
    id: "sample-4",
    title: "Sunscreen Protection",
    video:
      "https://assets.mixkit.co/videos/preview/mixkit-woman-applying-cream-to-her-face-41582-large.mp4",
    image:
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500&q=80",
    link: "/shop",
  },
  {
    id: "sample-5",
    title: "Night Repair Oil",
    video:
      "https://assets.mixkit.co/videos/preview/mixkit-woman-applying-facial-oil-41581-large.mp4",
    image:
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80",
    link: "/shop",
  },
];

/* ───────────────────────── Watch and Buy ───────────────────────── */
export function WatchAndBuy({ d }) {
  const items = d?.items?.length ? d.items : DEFAULT_SAMPLE_VIDEOS;

  return (
    <section className="mt-8 md:mt-[48px]" aria-labelledby="wb-h">
      <Reveal>
        <h2
          id="wb-h"
          className="text-center font-display text-[18px] font-semibold text-navy md:text-[36px]"
        >
          {d?.title || "Watch and Buy"}
        </h2>
      </Reveal>

      <div className="no-scrollbar mx-auto mt-2.5 flex max-w-[1040px] gap-[8px] overflow-x-auto px-4 pb-2 md:mt-[26px] md:gap-[12px] md:px-0 md:pb-0">
        {items.map((it, i) => {
          const card =
            "relative h-[130px] w-[80px] shrink-0 overflow-hidden rounded-[6px] md:h-[310px] md:w-[190px] md:rounded-[10px]";

          const hasContent = it.video || it.image;

          const inner = hasContent ? (
            it.video ? (
              <video
                src={it.video}
                poster={it.image}
                muted
                loop
                playsInline
                autoPlay
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={it.image}
                alt={it.title || ""}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )
          ) : (
            /* Skeleton Loader State */
            <div className="relative h-full w-full bg-navy/10 dark:bg-slate-800">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-7 w-7 rounded-full bg-brand/20 backdrop-blur-sm md:h-11 md:w-11" />
              </div>
            </div>
          );

          return (
            <motion.div
              key={it._ph ?? it.id ?? i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={hasContent ? { y: -6 } : {}}
            >
              {it.link ? (
                <Link
                  to={it.link}
                  className={`${card} block group`}
                  aria-label={it.title || "Watch and buy"}
                >
                  {inner}
                  {it.title && (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 font-sans text-[10px] font-semibold text-white md:text-xs">
                      {it.title}
                    </span>
                  )}
                </Link>
              ) : (
                <div className={card}>{inner}</div>
              )}
            </motion.div>
          );
        })}
      </div>
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  );
}
/* ───────────────────────── Skincare, Simplified ───────────────────────── */
function Badge() {
  const reduce = useReducedMotion();
  return (
    <div
      className="relative h-[48px] w-[48px] md:h-[96px] md:w-[96px]"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 132 132"
        className={`absolute inset-0 h-full w-full ${reduce ? "" : "animate-spinslow"}`}
      >
        <circle cx="66" cy="66" r="66" fill="#092b72" />
        <defs>
          <path
            id="rc"
            d="M66,66 m-48,0 a48,48 0 1,1 96,0 a48,48 0 1,1 -96,0"
          />
        </defs>
        <text
          fill="#fff"
          fontSize="13"
          fontFamily="Syne, serif"
          letterSpacing="3.2"
        >
          <textPath href="#rc">Regen Cosmetics • Regen Cosmetics •</textPath>
        </text>
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="absolute left-1/2 top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 md:h-[40px] md:w-[40px]"
        fill="#fff"
      >
        <path d="M12 0c.7 6.7 4.6 10.6 12 12-7.4 1.4-11.3 5.3-12 12-.7-6.7-4.6-10.6-12-12C7.400 10.600 11.300 6.700 12 0z" />
      </svg>
    </div>
  );
}
function PopularBox({ items }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || items.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 3800);
    return () => clearInterval(t);
  }, [items.length, reduce]);
  const p = items[i];
  return (
    <div className="relative h-[100px] overflow-hidden rounded-[6px] bg-[#d9d9d9] md:h-[96px] md:w-[230px]">
      {p && (
        <motion.div
          key={p._id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="h-full"
        >
          <Link
            to={`/products/${p.slug}`}
            className="flex h-full items-center gap-2.5 bg-white p-2 hover:bg-sky-50"
          >
            <img
              src={productImage(p)}
              alt=""
              loading="lazy"
              className="h-full w-[75px] rounded object-cover"
            />
            <div className="min-w-0">
              <p className="line-clamp-2 font-sans text-[11px] font-semibold text-brand">
                {p.name}
              </p>
              <p className="mt-0.5 font-sans text-[12px] font-bold text-black">
                {inr(p.priceMin)}
              </p>
            </div>
          </Link>
        </motion.div>
      )}
      {items.length > 1 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
          {items.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={`Show product ${k + 1}`}
              className={`h-1 rounded-full transition-all ${k === i ? "w-3 bg-brand" : "w-1 bg-brand/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
export function Simplified({ d }) {
  const { data } = useFetch(
    () => catalogApi.products({ limit: 4, sort: "rating" }),
    [],
  );
  return (
    <section className="mt-8 md:mt-[60px]">
      <Reveal>
        <h2 className="text-center font-display text-[18px] font-semibold text-navy md:text-[48px] md:font-semibold md:leading-none">
          <span className="md:hidden">{d.mobileTitle || d.title}</span>
          <span className="hidden md:inline">{d.title}</span>
        </h2>
      </Reveal>
      <div className="wrap relative z-10 mt-3 grid md:mt-[34px] md:grid-cols-[1fr_310px_1fr] md:items-start md:gap-[30px]">
        <Reveal className="md:pt-[30px]">
          <p className="font-ps text-[10px] leading-snug text-navy md:max-w-[270px] md:text-[13px] md:leading-[16px]">
            {d.body}
          </p>
          <Link
            to={d.ctaLink}
            className={`${navyBtn} mt-3 h-[18px] px-4 text-[9px] md:mt-[36px] md:h-[32px] md:w-[240px] md:text-[15px]`}
          >
            <span className="md:hidden">SHOP THE COLLECTION</span>
            <span className="hidden md:inline">{d.ctaText}</span>
          </Link>
        </Reveal>
        <div className="relative mx-auto mt-8 w-[130px] md:mt-0 md:w-[310px] md:pt-[34px]">
          <div className="absolute inset-x-0 bottom-0 top-[18px] rounded-t-[65px] bg-sky-arch md:top-[66px] md:rounded-t-[155px]" />
          <div className="absolute -top-[4px] right-[-18px] z-20 md:top-[0] md:right-[-16px]">
            <Badge />
          </div>
          <Reveal delay={0.1}>
            <img
              src={d.image}
              alt=""
              loading="lazy"
              className="relative z-10 w-full"
              style={{ clipPath: "none" }}
            />
          </Reveal>
        </div>
        <div className="mt-[26px] hidden md:block md:pt-[30px]">
          <h3 className="font-ps text-[21px] font-semibold italic text-ink">
            {d.popularTitle}
          </h3>
          <div className="mt-[8px]">
            <PopularBox items={data?.items || []} />
          </div>
        </div>
      </div>
      <div className="relative -mt-[26px] bg-[#092b72] pt-[32px] text-white md:-mt-[80px] md:h-[190px] md:pt-0">
        <div className="wrap grid grid-cols-2 gap-3 pb-4 md:grid-cols-[1fr_310px_1fr] md:gap-[30px] md:pb-0 md:pt-[20px]">
          <Reveal className="md:ml-[-12px]">
            <img
              src="/assets/stat-avatars.webp"
              alt=""
              loading="lazy"
              className="h-[26px] w-auto md:h-[68px]"
            />
            <p className="mt-1 font-display text-[21px] font-semibold leading-none md:mt-[14px] md:font-ps md:text-[42px] md:font-bold">
              {d.statLeft.value}
            </p>
            <p className="mt-1.5 max-w-[120px] font-ps text-[8px] leading-snug md:mt-[10px] md:max-w-[160px] md:text-[9.5px]">
              {d.statLeft.text}
            </p>
          </Reveal>
          <div className="hidden md:block" />
          <Reveal delay={0.1} className="md:pt-[20px]">
            <p className="mt-4 font-display text-[21px] font-semibold leading-none md:mt-0 md:font-ps md:text-[42px]">
              {d.statRight.value}
            </p>
            <p className="mt-0.5 font-ps text-[8px] md:mt-[3px] md:text-[12px]">
              {d.statRight.label}
            </p>
            <p className="mt-2 font-ps text-[8px] font-semibold italic leading-snug md:mt-[32px] md:max-w-[220px] md:text-[12px]">
              {d.statRight.text}
            </p>
          </Reveal>
        </div>
      </div>
      <div className="wrap mt-4 md:hidden">
        <h3 className="text-center font-ps text-[13px] font-semibold italic text-ink">
          {d.popularTitle}
        </h3>
        <div className="mt-2">
          <PopularBox items={data?.items || []} />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Best buy combos ───────────────────────── */
export function Combos({ d }) {
  const { data } = useFetch(
    () => catalogApi.products({ limit: 6, featured: "true" }),
    [],
  );
  const { add } = useCartActions();
  const all = data?.items || [];
  const combos = all.filter(
    (p) => /combo/i.test(p.badge || "") || p.tags?.includes("combo"),
  );
  const items = combos.length ? combos : all.slice(0, 1);
  return (
    <section className="wrap mt-8 md:mt-[72px]" aria-labelledby="combo-h">
      <Reveal className="text-center">
        <h2
          id="combo-h"
          className="font-display text-[18px] font-semibold text-navy md:text-[48px] md:font-semibold md:leading-none"
        >
          {d.title}
        </h2>
        <p className="mt-1 font-ps text-[9.5px] text-ink md:mt-[6px] md:text-[18px]">
          {d.subtitle}
        </p>
      </Reveal>
      <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-14 md:mt-[72px]">
        {items.map((p, i) => {
          const v = defaultVariant(p);
          const sale = v ? effectivePrice(v) : 0;
          const pct =
            v && v.price > 0
              ? Math.round(((v.price - sale) / v.price) * 100)
              : 0;
          const out = !v || v.stock <= 0;
          return (
            <Reveal key={p._id} delay={i * 0.08}>
              <div className="relative mx-auto mt-[42px] w-[180px] rounded-b-[10px] border-x-2 border-b-2 border-brand pb-[20px] pt-[140px] text-center md:mt-[85px] md:w-[360px] md:pb-[26px] md:pt-[285px]">
                <span className="absolute left-0 top-0 h-[2px] w-[12px] bg-brand md:w-[20px]" />
                <span className="absolute right-0 top-0 h-[2px] w-[12px] bg-brand md:w-[20px]" />
                <Link
                  to={`/products/${p.slug}`}
                  className="absolute left-1/2 top-[-42px] w-[155px] -translate-x-1/2 md:top-[-85px] md:w-[310px]"
                >
                  <motion.img
                    whileHover={{ scale: 1.04, rotate: -1.5 }}
                    src={
                      d.image && i === 0 && !p.images?.length
                        ? d.image
                        : productImage(p)
                    }
                    alt={p.name}
                    loading="lazy"
                    className="w-full"
                  />
                </Link>
                <h3 className="mx-auto max-w-[150px] font-sans text-[9.5px] font-medium leading-snug text-black md:max-w-[300px] md:text-[16px]">
                  <Link to={`/products/${p.slug}`}>{p.name}</Link>
                </h3>
                <p className="mt-1.5 flex flex-wrap items-baseline justify-center gap-x-1.5 md:mt-[16px] md:gap-x-2.5">
                  <span className="font-sans text-[11.5px] font-bold text-brand md:text-[21px]">
                    {inr(sale)}
                  </span>
                  {pct > 0 && (
                    <>
                      <s className="font-sans text-[7px] text-black md:text-[13.5px]">
                        {inr(v.price)}
                      </s>
                      <span className="font-sans text-[8px] text-neutral-700 md:text-[15px]">
                        {pct}% off
                      </span>
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => add(p, v)}
                  disabled={out}
                  className={`${navyBtn} absolute -bottom-[10px] left-1/2 h-[22px] w-[150px] -translate-x-1/2 text-[10px] md:-bottom-[18px] md:h-[35px] md:w-[310px] md:text-[18px]`}
                >
                  {out ? "Out of stock" : "Add to Cart"}
                </button>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────── Promo banner ───────────────────────── */
export const Promo = ({ d }) => (
  <Reveal className="mt-10 md:mt-[60px]">
    <Link to={d.link} aria-label={d.alt} className="block">
      <img
        src={d.image}
        alt={d.alt}
        loading="lazy"
        className="hidden w-full md:block"
      />
      <div role="img" aria-label={d.alt} className="md:hidden">
        <div
          className="w-full"
          style={{
            aspectRatio: "800/480",
            backgroundImage: `url(${d.image})`,
            backgroundSize: "179.9% 100%",
            backgroundPosition: "0 0",
          }}
        />
        <div
          className="-mt-px w-full"
          style={{
            aspectRatio: "639/430",
            backgroundImage: `url(${d.image})`,
            backgroundSize: "225.2% 112%",
            backgroundPosition: "100% 100%",
          }}
        />
      </div>
    </Link>
  </Reveal>
);

/* ───────────────────────── Why Regen ───────────────────────── */
export const Why = ({ d }) => (
  <section
    className="wrap mt-6 text-center md:mt-[44px]"
    aria-labelledby="why-h"
  >
    <Reveal>
      <h2
        id="why-h"
        className="font-display text-[17px] font-semibold text-navy md:text-[36px] md:font-semibold"
      >
        {d.title}
      </h2>
      <p className="mx-auto mt-1.5 max-w-[810px] font-ps text-[9px] leading-snug text-navy md:mt-[14px] md:text-[15px] md:leading-[20px]">
        {d.intro}
      </p>
    </Reveal>
    <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 text-left md:mt-[32px] md:grid-cols-3 md:gap-0">
      {d.stats.map((s, i) => (
        <motion.div
          key={s.value}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="flex items-start gap-2 md:gap-[16px]"
        >
          <span className="mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-navy md:mt-[4px] md:h-[44px] md:w-[44px]">
            <Check
              className="h-[10px] w-[10px] text-white md:h-[24px] md:w-[24px]"
              strokeWidth={1.8}
            />
          </span>
          <div>
            <dt className="font-ps text-[13px] font-semibold leading-tight text-ink md:text-[26px]">
              {s.value}
            </dt>
            <dd className="font-ps text-[8px] leading-tight text-ink md:mt-[3px] md:max-w-[200px] md:text-[15px] md:leading-[16px]">
              {s.text}
            </dd>
          </div>
        </motion.div>
      ))}
    </dl>
  </section>
);

/* ───────────────────────── Testimonials ───────────────────────── */
export function Testimonials({ heading, items }) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const per = desktop ? 3 : 1;
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / per));
  useEffect(() => setPage(0), [per]);
  const visible = items.slice(page * per, page * per + per);
  const quoteSvg = (
    <svg
      viewBox="0 0 30 24"
      className="mx-auto h-[11px] w-[14px] md:h-[18px] md:w-[22px]"
      fill="#2a9df4"
      aria-hidden="true"
    >
      <path d="M0 24V13L6 0h6L9 11h5v13H0zm16 0V13L22 0h6l-3 11h5v13H16z" />
    </svg>
  );
  return (
    <section className="wrap mt-9 md:mt-[72px]" aria-labelledby="t-h">
      <Reveal className="text-center">
        <h2
          id="t-h"
          className="font-display text-[17px] font-semibold uppercase text-navy md:text-[36px]"
        >
          {heading.title}
        </h2>
        <p className="mt-0.5 font-ps text-[9px] text-navy md:mt-[6px] md:text-[15px]">
          {heading.subtitle}
        </p>
      </Reveal>
      <div className="relative mt-4 flex items-center justify-center md:mt-[32px]">
        {pages > 1 && (
          <button
            type="button"
            aria-label="Previous testimonials"
            onClick={() => setPage((p) => (p - 1 + pages) % pages)}
            className="absolute left-0 z-10 flex h-[16px] w-[16px] items-center justify-center rounded-full border border-brand bg-white text-brand transition hover:bg-brand hover:text-white md:-left-9 md:h-7 md:w-7"
          >
            <ChevronLeft className="h-2.5 w-2.5 md:h-4 md:w-4" />
          </button>
        )}
        <ul
          className="flex w-full items-stretch justify-center gap-[14px]"
          key={page}
        >
          {visible.map((t, i) => (
            <motion.li
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="flex w-[130px] flex-col items-center rounded-[5px] border border-[#777] bg-white px-2.5 pb-4 pt-5 text-center shadow-[2px_3px_6px_rgba(0,0,0,0.2)] md:min-h-[300px] md:w-[260px] md:rounded-[6px] md:px-[20px] md:pb-0 md:pt-[32px]"
            >
              {quoteSvg}
              <blockquote className="mt-2.5 font-ps text-[8.5px] leading-snug text-navy md:mt-[18px] md:text-[15px] md:leading-[20px]">
                “{t.quote}”
              </blockquote>
              <img
                src={
                  t.avatar ||
                  `/assets/avatar-${(items.indexOf(t) % 3) + 1}.webp`
                }
                alt=""
                loading="lazy"
                width="80"
                height="80"
                className="mt-3 h-[38px] w-[38px] rounded-full border border-[#999] object-cover md:mt-[18px] md:h-[80px] md:w-[80px]"
              />
              <p className="mt-1.5 font-ps text-[8.5px] text-navy md:mt-[14px] md:text-[15px]">
                {t.name}
              </p>
            </motion.li>
          ))}
        </ul>
        {pages > 1 && (
          <button
            type="button"
            aria-label="Next testimonials"
            onClick={() => setPage((p) => (p + 1) % pages)}
            className="absolute right-0 z-10 flex h-[16px] w-[16px] items-center justify-center rounded-full border border-brand bg-white text-brand transition hover:bg-brand hover:text-white md:-right-9 md:h-7 md:w-7"
          >
            <ChevronRight className="h-2.5 w-2.5 md:h-4 md:w-4" />
          </button>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── Selfcare simplified ───────────────────────── */
export const Selfcare = ({ d }) => (
  <section
    className="relative mt-8 h-[72px] md:mt-[24px] md:h-[210px]"
    aria-label={d.title}
  >
    <div className="absolute inset-x-0 top-0 h-[48px] bg-[#092b72] md:h-[165px]" />
    <h2 className="relative hidden pt-[22px] text-center font-display text-[32px] font-semibold text-white md:block">
      {d.title}
    </h2>
    <ul className="absolute inset-x-0 top-[22px] flex justify-center gap-[4px] px-2 md:top-[86px] md:gap-[28px]">
      {d.badges.map((b, i) => (
        <motion.li
          key={b}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: i * 0.08,
            type: "spring",
            stiffness: 160,
            damping: 14,
          }}
          whileHover={{ y: -6, rotate: 3 }}
        >
          <img
            src={`/assets/badge-${(i % 5) + 1}.webp`}
            alt={b}
            loading="lazy"
            className="h-[44px] w-[44px] md:h-[124px] md:w-[124px]"
          />
        </motion.li>
      ))}
    </ul>
  </section>
);

/* ───────────────────────── Why choose ───────────────────────── */
const Arrow = ({ d: path }) => (
  <path
    d={path}
    fill="none"
    stroke="#04256b"
    strokeWidth="2.6"
    strokeDasharray="7 6"
    strokeLinecap="round"
    markerEnd="url(#ah)"
  />
);
export function WhyChoose({ d }) {
  const p = d.points;
  const t = (k) => p[k] || { title: "", text: "" };
  const Txt = ({ k, cls }) => (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: k * 0.1 }}
      className={`absolute text-center ${cls}`}
    >
      <h3 className="font-ps text-[9.5px] font-bold leading-tight text-ink md:text-[18px]">
        {t(k).title}
      </h3>
      <p className="mx-auto mt-0.5 font-ps text-[7px] leading-tight text-ink md:mt-1 md:text-[13.5px] md:leading-[20px]">
        {t(k).text}
      </p>
    </motion.div>
  );
  return (
    <section className="wrap mt-8 md:mt-[48px]" id="why" aria-labelledby="wc-h">
      <Reveal>
        <h2
          id="wc-h"
          className="text-center font-display text-[15px] font-semibold text-navy md:text-[36px] md:font-semibold"
        >
          {d.title}
        </h2>
      </Reveal>
      <div className="relative mx-auto mt-4 aspect-[1200/580] w-full md:mt-[24px]">
        <svg
          viewBox="0 0 1200 580"
          className="absolute inset-0 hidden h-full w-full md:block"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="ah"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path
                d="M1 1 L8 5 L1 9"
                fill="none"
                stroke="#04256b"
                strokeWidth="1.8"
              />
            </marker>
          </defs>
          <Arrow d="M430 196 C380 215 340 180 288 152" />
          <Arrow d="M772 198 C830 176 860 215 940 266" />
          <Arrow d="M410 372 C380 405 340 440 316 446" />
          <Arrow d="M772 405 C800 450 840 480 884 500" />
        </svg>
        <div className="absolute left-[33.6%] top-[17%] aspect-square w-[33%] rounded-full bg-[#092b72]" />
        <motion.img
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          src={d.image}
          alt=""
          loading="lazy"
          className="absolute left-[34.5%] top-0 h-full w-[31%] object-contain"
        />
        <Txt
          k={0}
          cls="left-[2%] top-[4%] w-[30%] md:left-[5.2%] md:top-[9%] md:w-[22%]"
        />
        <Txt
          k={1}
          cls="right-[1%] top-[26%] w-[30%] md:right-auto md:left-[76.7%] md:top-[25.5%] md:w-[22%]"
        />
        <Txt
          k={2}
          cls="left-[0] top-[66%] w-[32%] md:left-0 md:top-[69%] md:w-[23%]"
        />
        <Txt
          k={3}
          cls="right-[1%] top-[78%] w-[30%] md:right-auto md:left-[76%] md:top-[78.5%] md:w-[25%]"
        />
      </div>
    </section>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */
export const Faq = ({ title, items }) => (
  <section className="wrap mt-6 md:mt-[26px]" aria-labelledby="faq-h">
    <Reveal>
      <h2
        id="faq-h"
        className="mb-2 font-sans text-[14px] font-bold text-black md:mb-[20px] md:text-[24px]"
      >
        {title}
      </h2>
    </Reveal>
    <Accordion items={items.map((i) => ({ title: i.q, content: i.a }))} />
  </section>
);
