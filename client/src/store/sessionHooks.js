import { loadCart, mergeGuestCart, resetCart } from './cartSlice.js';
import { loadWishlist, clearWishlist } from './wishlistSlice.js';

export async function onAuthenticated(dispatch) {
  await dispatch(mergeGuestCart());
  dispatch(loadWishlist());
  dispatch(loadCart());
}
export function onLoggedOut(dispatch) { dispatch(resetCart()); dispatch(clearWishlist()); }
