import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { accountApi } from '@/services';

export const loadWishlist = createAsyncThunk('wishlist/load', async (_, { getState }) => (getState().auth.user ? (await accountApi.wishlist()).ids : []));
export const toggleWishlist = createAsyncThunk('wishlist/toggle', async (productId, { getState }) => {
  const has = getState().wishlist.ids.includes(productId);
  return { ids: (has ? await accountApi.removeWish(productId) : await accountApi.addWish(productId)).ids, added: !has };
});
const slice = createSlice({
  name: 'wishlist', initialState: { ids: [] },
  reducers: { clearWishlist: (s) => { s.ids = []; } },
  extraReducers: (b) => {
    b.addCase(loadWishlist.fulfilled, (s, a) => { s.ids = a.payload.map(String); });
    b.addCase(toggleWishlist.fulfilled, (s, a) => { s.ids = a.payload.ids.map(String); });
  },
});
export const { clearWishlist } = slice.actions;
export default slice.reducer;
