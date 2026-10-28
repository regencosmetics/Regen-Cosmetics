import { Helmet } from 'react-helmet-async';

const SITE = 'REGEN Cosmetics';
export default function Seo({ title, description, image, path, noindex, jsonLd, type = 'website' }) {
  const full = title ? `${title} | ${SITE}` : `${SITE} | Men's Skincare, Simplified`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonical = `${origin}${path ?? (typeof window !== 'undefined' ? window.location.pathname : '')}`;
  const img = image && (image.startsWith('http') ? image : `${origin}${image}`);
  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      {img && <meta property="og:image" content={img} />}
      <meta name="twitter:card" content={img ? 'summary_large_image' : 'summary'} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
