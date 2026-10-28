import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import Seo from '@/components/common/Seo.jsx';
import ProductCard from '@/components/product/ProductCard.jsx';
import { PageLoader, ErrorState } from '@/components/common/Feedback.jsx';
import { useFetch } from '@/hooks';
import { accountApi } from '@/services';
import { errorMessage } from '@/services/api';
import { toggleWishlist } from '@/store/wishlistSlice';

export default function Wishlist() {
  const dispatch = useDispatch(); const { data, loading, error, reload, setData } = useFetch(() => accountApi.wishlist(), []);
  const remove = async (p) => { try { await dispatch(toggleWishlist(String(p._id))).unwrap(); setData((d) => ({ ...d, items: d.items.filter((x) => x._id !== p._id) })); toast.success('Removed from wishlist'); } catch (e) { toast.error(errorMessage(e)); } };
  if (loading) return <PageLoader />;
  if (error) return <div className="wrap py-10"><ErrorState message={error} onRetry={reload} /></div>;
  const empty = data.items.length === 0;
  return (
    <div className="wrap min-h-[520px] py-8 md:py-[62px]"><Seo title="Wishlist" noindex />
      {empty ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-sans text-[22px] font-semibold text-black md:text-[32px]">Wishlist</h1>
          <p className="mt-3 font-sans text-[14px] text-black md:text-[18px]">No products were added to the wishlist page.</p>
          <Link to="/shop" className="mt-6 inline-flex h-[42px] items-center rounded-[4px] bg-brand px-8 font-sans text-[16px] font-semibold text-white transition hover:bg-brand-600 hover:shadow-lg md:h-[50px] md:text-[18px]">Back to shopping</Link>
        </motion.div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4 md:gap-[30px]">
          <AnimatePresence>{data.items.map((p) => <motion.li key={p._id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}><ProductCard product={p} onRemove={remove} /></motion.li>)}</AnimatePresence>
        </ul>
      )}
    </div>
  );
}
