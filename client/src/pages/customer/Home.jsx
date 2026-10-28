import { useEffect, useState } from "react";
import Seo from "@/components/common/Seo.jsx";
import { useCms } from "@/hooks";
import { publicApi } from "@/services";
import { PageLoader } from "@/components/common/Feedback.jsx";
import * as S from "@/components/home/HomeSections.jsx";

export default function Home() {
  const { data: h, loading } = useCms("home");
  const { data: t } = useCms("testimonials");
  const { data: f } = useCms("faqs");

  const [heroBanner, setHeroBanner] = useState(null);

  useEffect(() => {
    let cancelled = false;

    publicApi
      .banners("hero")
      .then((res) => {
        if (!cancelled) {
          setHeroBanner(res?.items?.[0] || null);
        }
      })
      .catch((err) => {
        console.error("Failed to load hero banners:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !h) return <PageLoader />;

  const vis = (k) => h.sectionVisibility?.[k] !== false;

  const heroData = heroBanner
    ? {
        image: heroBanner.image?.url,
        headline: heroBanner.title,
        subheading: heroBanner.subtitle,
        ctaText: heroBanner.ctaText,
        ctaLink: heroBanner.ctaLink,
        alt:
          heroBanner.image?.alt || heroBanner.title || "REGEN Cosmetics banner",
      }
    : h.hero;

  const map = {
    hero: () => <S.Hero d={heroData} />,
    products: () => <S.ProductsSection d={h.products} />,
    concerns: () => <S.Concerns d={h.concerns} />,
    ownSkin: () => <S.OwnSkin d={h.ownSkin} />,
    watchAndBuy: () =>
      h.watchAndBuy ? <S.WatchAndBuy d={h.watchAndBuy} /> : null,
    simplified: () => <S.Simplified d={h.simplified} />,
    combos: () => <S.Combos d={h.combos} />,
    promo: () => <S.Promo d={h.promo} />,
    why: () => <S.Why d={h.why} />,
    testimonials: () =>
      t?.items?.length ? (
        <S.Testimonials heading={h.testimonialsHeading} items={t.items} />
      ) : null,
    selfcare: () => <S.Selfcare d={h.selfcare} />,
    whyChoose: () => <S.WhyChoose d={h.whyChoose} />,
    faq: () =>
      f?.items?.length ? <S.Faq title={h.faqTitle} items={f.items} /> : null,
  };

  return (
    <div className="overflow-x-clip pb-12 md:pb-[80px]">
      <Seo
        title="Men's Skincare"
        description="REGEN Cosmetics: simple, effective skincare for men. Sunscreen, serums and gels that cleanse, hydrate and protect."
        path="/"
      />

      {h.sectionOrder.filter(vis).map((k) => (
        <div key={k}>{map[k]?.()}</div>
      ))}
    </div>
  );
}
