import { useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import Seo from '@/components/common/Seo.jsx';
import ProductCard from '@/components/product/ProductCard.jsx';
import { ProductGridSkeleton, EmptyState, ErrorState } from '@/components/common/Feedback.jsx';
import { Breadcrumbs, Pagination } from '@/components/common/Primitives.jsx';
import { useFetch } from '@/hooks';
import { catalogApi } from '@/services';
import { SORT_OPTIONS } from '@/constants';

export default function Shop({ mode = 'shop' }) {
  const { slug } = useParams(); const [sp, setSp] = useSearchParams(); const [filters, setFilters] = useState(false);
  const page = Number(sp.get('page') || 1); const sort = sp.get('sort') || 'newest'; const q = sp.get('q') || '';
  const params = { page, limit: 12, sort, q: mode === 'search' ? q : '', category: mode === 'category' ? slug : sp.get('category') || '', collection: mode === 'collection' ? slug : '',
    minPrice: sp.get('minPrice') || '', maxPrice: sp.get('maxPrice') || '', inStock: sp.get('inStock') || '', bestseller: sp.get('bestseller') || '', concern: sp.get('concern') || '' };
  const { data, loading, error, reload } = useFetch(() => catalogApi.products(params), [JSON.stringify(params)]);
  const { data: cats } = useFetch(() => catalogApi.categories(), []);
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n); };
  const title = mode === 'search' ? `Search results for “${q}”` : mode === 'category' ? (cats?.items.find((c) => c.slug === slug)?.name || 'Category') : mode === 'collection' ? 'Collection' : 'Shop All';
  return (
    <div className="wrap py-6 md:py-10">
      <Seo title={title} description={`Browse ${title} at REGEN Cosmetics.`} path={mode === 'shop' ? '/shop' : undefined} noindex={mode === 'search'} />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: title }]} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <h1 className="section-title">{title}</h1>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-outline md:hidden" onClick={() => setFilters(!filters)} aria-expanded={filters}><SlidersHorizontal className="mr-1 inline h-4 w-4" />Filters</button>
          <label className="sr-only" htmlFor="sort">Sort by</label>
          <select id="sort" className="input !w-auto" value={sort} onChange={(e) => set('sort', e.target.value)}>{SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className={`${filters ? 'block' : 'hidden'} space-y-4 md:block`} aria-label="Filters">
          {mode !== 'category' && cats?.items.length > 0 && <div><label className="label" htmlFor="cat">Category</label><select id="cat" className="input" value={sp.get('category') || ''} onChange={(e) => set('category', e.target.value)}><option value="">All</option>{cats.items.map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}</select></div>}
          <div className="grid grid-cols-2 gap-2"><div><label className="label" htmlFor="minp">Min price</label><input id="minp" className="input" type="number" min="0" defaultValue={sp.get('minPrice') || ''} onBlur={(e) => set('minPrice', e.target.value)} /></div><div><label className="label" htmlFor="maxp">Max price</label><input id="maxp" className="input" type="number" min="0" defaultValue={sp.get('maxPrice') || ''} onBlur={(e) => set('maxPrice', e.target.value)} /></div></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sp.get('inStock') === 'true'} onChange={(e) => set('inStock', e.target.checked ? 'true' : '')} />In stock only</label>
          {sp.toString() && <button type="button" className="text-sm text-brand underline" onClick={() => setSp(mode === 'search' ? { q } : {})}>Clear filters</button>}
        </aside>
        <section aria-live="polite">
          {loading ? <ProductGridSkeleton n={6} /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? <EmptyState title="No products found" text="Try changing your filters or search term." actionLabel="Browse all" actionTo="/shop" /> : (
            <>
              <p className="mb-3 text-sm text-neutral-600">{data.pagination.total} product{data.pagination.total === 1 ? '' : 's'}</p>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">{data.items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
              <Pagination page={data.pagination.page} pages={data.pagination.pages} onChange={(p) => { set('page', String(p)); window.scrollTo(0, 0); }} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
