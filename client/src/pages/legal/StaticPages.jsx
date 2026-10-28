import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Seo from '@/components/common/Seo.jsx';
import Accordion from '@/components/common/Accordion.jsx';
import Reveal from '@/components/common/Reveal.jsx';
import { PageLoader, ErrorState } from '@/components/common/Feedback.jsx';
import { useCms } from '@/hooks';

const Paras = ({ list }) => (list || []).map((t, i) => <p key={i} className="mt-2 text-[13px] leading-relaxed text-neutral-900 md:text-[18px] md:leading-[27px]">{t}</p>);
const Bullets = ({ list }) => (list?.length ? <ul className="mt-2 list-disc space-y-1 pl-6 text-[13px] md:text-[18px] md:leading-[25px]">{list.map((t, i) => <li key={i}>{t}</li>)}</ul> : null);

function Section({ s, level = 2 }) {
  return (
    <section id={s.id} className={`scroll-mt-28 ${level === 2 ? 'mt-8 md:mt-[34px]' : 'mt-5'}`}>
      {level === 2 ? <h2 className="font-sans text-[17px] font-semibold text-black md:text-[26px]">{s.heading}</h2> : <h3 className="font-sans text-[14px] font-semibold text-black md:text-[19px]">{s.heading}</h3>}
      <Paras list={s.paragraphs} /><Bullets list={s.bullets} />
      {s.subsections?.map((x) => <Section key={x.heading} s={x} level={3} />)}
      {level === 2 && <hr className="mt-6 border-neutral-400 md:mt-[34px]" />}
    </section>
  );
}

function Gate({ d, loading, error, reload, children }) {
  if (loading) return <PageLoader />;
  if (error) return <div className="wrap py-10"><ErrorState message={error} onRetry={reload} /></div>;
  return children;
}

function Legal({ k, path, accordion }) {
  const { data: d, loading, error, reload } = useCms(k);
  return (
    <Gate d={d} loading={loading} error={error} reload={reload}>
      {d && (
        <div className="wrap py-8 md:pb-[80px] md:pt-[46px]"><Seo title={d.title} description={d.intro?.slice(0, 160)} path={path} />
          <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="font-sans text-[24px] font-semibold text-black md:text-[32px]">{d.title}</h1>
            {d.subtitle && <p className="mt-2 font-sans text-[15px] text-black md:mt-[16px] md:text-[24px]">{d.subtitle}</p>}
            {accordion && d.intro && <p className="mx-auto mt-3 max-w-[960px] font-sans text-[14px] text-black md:mt-[24px] md:text-[26px] md:leading-[29px]">{d.intro}</p>}
          </motion.header>
          {accordion ? (
            <div className="mt-8 md:mt-[66px] [&_h3]:font-normal">
              <Accordion size="sm" items={d.sections.map((s) => ({ title: s.heading, content: <div>{(s.paragraphs || []).map((t, i) => <p key={i} className="mb-2">{t}</p>)}{s.bullets && <ul className="list-disc pl-5">{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}</div> }))} />
            </div>
          ) : (
            <article className="mt-6 md:mt-[40px]">
              {d.introHeading && <h2 className="font-sans text-[18px] font-semibold text-black md:text-[26px]">{d.introHeading}</h2>}
              {!accordion && d.intro && <p className={`text-[13px] md:text-[18px] md:leading-[27px] ${d.introHeading ? 'mt-2' : 'mx-auto max-w-[1200px] text-center md:text-[22px] md:leading-[27px]'}`}>{d.intro}</p>}
              {d.sections?.map((s) => <Section key={s.heading} s={s} />)}
            </article>
          )}
        </div>
      )}
    </Gate>
  );
}

function About() {
  const { data: d, loading, error, reload } = useCms('about');
  const list = (b) => (
    <ul className="mt-4 list-disc space-y-3.5 pl-5 font-sans text-[13px] leading-snug text-black md:mt-[26px] md:space-y-[18px] md:pl-[22px] md:text-[16px]">{b.items.map((i) => <li key={i}>{i}</li>)}</ul>
  );
  return (
    <Gate d={d} loading={loading} error={error} reload={reload}>
      {d && (
        <div className="wrap pb-10 pt-6 md:pb-[70px] md:pt-[34px]"><Seo title="About Us" description={d.body.slice(0, 160)} path="/about" />
          <h1 className="font-sans text-[22px] font-bold text-black md:text-[34px]">{d.title}</h1>
          <Reveal className="mt-5 grid overflow-hidden bg-[#f2f2f2] md:mt-[26px] md:grid-cols-[1fr_407px]">
            <div className="p-4 md:px-4 md:pb-4 md:pt-4">
              <p className="font-sans text-[16px] text-black md:text-[24px]">{d.welcome}</p>
              <h2 className="mt-5 font-sans text-[20px] font-bold leading-tight text-black md:mt-[48px] md:text-[32px]">{d.headline}</h2>
              <p className="mt-3 max-w-[740px] font-sans text-[13px] leading-snug text-neutral-800 md:mt-[16px] md:text-[19px] md:leading-[25px]">{d.body}</p>
            </div>
            <div className="min-h-[160px] bg-[#d9d9d9]">{d.image && <img src={d.image} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
          </Reveal>
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 md:mt-[28px] md:grid-cols-4 md:gap-x-[30px]">
            {d.stats.map((s, i) => (
              <motion.li key={s.value} initial={{ opacity: 0, y: 20, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex flex-col items-center text-center">
                <span className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-brand-foot font-sans text-[16px] font-bold text-white md:h-[80px] md:w-[80px] md:text-[20px]">{s.value}</span>
                <span className="mt-2 max-w-[270px] font-sans text-[12px] leading-snug text-neutral-900 md:mt-[10px] md:text-[18px]">{s.text}</span>
              </motion.li>))}
          </ul>
          <section id="why" className="scroll-mt-28">
            <Reveal><h2 className="mt-10 text-center font-sans text-[22px] font-semibold text-black md:mt-[44px] md:text-[32px]">{d.whyTitle}</h2></Reveal>
            <div className="mt-5 grid gap-8 md:mt-[34px] md:grid-cols-2 md:gap-[67px]">
              {[d.mission, d.vision].map((b) => (
                <Reveal key={b.title}>
                  <div className="aspect-[566/275] overflow-hidden rounded-[14px] bg-[#e6e6e6]">{b.image && <img src={b.image} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
                  <h3 className="mt-5 font-sans text-[20px] font-semibold text-black md:mt-[22px] md:text-[26px]">{b.title}</h3>{list(b)}
                </Reveal>))}
            </div>
          </section>
        </div>
      )}
    </Gate>
  );
}

function Faq() {
  const { data, loading } = useCms('faqs'); const { data: h } = useCms('home');
  if (loading) return <PageLoader />;
  return <div className="wrap py-8 md:py-[46px]"><Seo title="FAQs" path="/faq" /><h1 className="mb-4 font-sans text-[22px] font-semibold text-black md:mb-[28px] md:text-[32px]">{h?.faqTitle || 'Frequently Asked Questions'}</h1><Accordion items={data.items.map((i) => ({ title: i.q, content: i.a }))} /></div>;
}

export default function StaticPages({ page }) {
  if (page === 'about') return <About />; if (page === 'faq') return <Faq />;
  const map = { privacy: ['legal.privacy', '/privacy-policy', true], shipping: ['legal.shipping', '/shipping-returns', false], terms: ['legal.terms', '/terms', false] };
  const [k, path, accordion] = map[page];
  return <Legal k={k} path={path} accordion={accordion} />;
}
