import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { addToCart } from '@/store/cartSlice';
import { toggleWishlist } from '@/store/wishlistSlice';
import { openAuth } from '@/store/uiSlice';
import { errorMessage } from '@/services/api';

export const defaultVariant = (p) => p.variants.find((v) => v.active !== false && v.stock > 0) || p.variants.find((v) => v.active !== false) || p.variants[0];

export function useCartActions() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const wishIds = useSelector((s) => s.wishlist.ids);
  const add = async (product, variant = defaultVariant(product), quantity = 1) => {
    if (!variant || variant.stock <= 0) { toast.error('This product is out of stock'); return false; }
    const r = await dispatch(addToCart({ productId: product._id, sku: variant.sku, quantity }));
    if (addToCart.rejected.match(r)) { toast.error(r.payload || 'Could not add to cart'); return false; }
    return true;
  };
  const toggleWish = async (product) => {
    if (!user) { toast('Please log in to save items to your wishlist'); dispatch(openAuth({ mode: 'login' })); return; }
    try {
      const r = await dispatch(toggleWishlist(product._id)).unwrap();
      toast.success(r.added ? 'Added to wishlist' : 'Removed from wishlist');
    } catch (e) { toast.error(errorMessage(e)); }
  };
  return { add, toggleWish, isWished: (id) => wishIds.includes(String(id)) };
}
