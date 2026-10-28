import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { cartApi } from '@/services';
import { errorMessage } from '@/services/api';

const GUEST_KEY = 'regen_guest_cart_v1';
const readGuest = () => { try { const v = JSON.parse(localStorage.getItem(GUEST_KEY)); return v?.items ? v : { items: [], couponCode: null }; } catch { return { items: [], couponCode: null }; } };
export const persistGuest = (guest) => { try { localStorage.setItem(GUEST_KEY, JSON.stringify(guest)); } catch { /* storage unavailable */ } };

const isAuthed = (getState) => Boolean(getState().auth.user);
const applyServer = (s, d) => { s.lines = d.cart.lines; s.pricing = d.cart.pricing; s.coupon = d.cart.coupon; s.issues = d.cart.issues || []; s.couponError = d.cart.couponError || null; };
const guestQuote = (guest) => cartApi.quote({ items: guest.items, couponCode: guest.couponCode });
const reject = (e, rejectWithValue) => rejectWithValue(errorMessage(e));

export const loadCart = createAsyncThunk('cart/load', async (_, { getState, rejectWithValue }) => {
  try {
    if (isAuthed(getState)) return await cartApi.get();
    const g = getState().cart.guest;
    return g.items.length ? await guestQuote(g) : { cart: { lines: [], pricing: null, coupon: null, issues: [] } };
  } catch (e) { return reject(e, rejectWithValue); }
});

export const addToCart = createAsyncThunk('cart/add', async ({ productId, sku, quantity = 1 }, { getState, rejectWithValue }) => {
  try {
    if (isAuthed(getState)) return { data: await cartApi.add({ productId, sku, quantity }) };
    const g = getState().cart.guest;
    const items = g.items.map((i) => ({ ...i }));
    const ex = items.find((i) => i.productId === productId && i.sku === sku);
    if (ex) ex.quantity = Math.min(20, ex.quantity + quantity); else items.push({ productId, sku, quantity });
    const data = await guestQuote({ ...g, items });
    const line = data.cart.lines.find((l) => l.sku === sku);
    if (!line || !line.inStock) throw Object.assign(new Error('x'), { response: { data: { message: 'This product is out of stock' } } });
    if (line.quantity < (ex ? ex.quantity : quantity)) throw Object.assign(new Error('x'), { response: { data: { message: `Only ${line.stock} unit(s) available` } } });
    return { data, guest: { ...g, items } };
  } catch (e) { return reject(e, rejectWithValue); }
});

export const setQuantity = createAsyncThunk('cart/qty', async ({ productId, sku, quantity }, { getState, rejectWithValue }) => {
  try {
    if (isAuthed(getState)) return { data: await cartApi.update({ productId, sku, quantity }) };
    const g = getState().cart.guest;
    const items = g.items.map((i) => (i.productId === productId && i.sku === sku ? { ...i, quantity } : i)).filter((i) => i.quantity > 0);
    const data = await guestQuote({ ...g, items });
    return { data, guest: { ...g, items } };
  } catch (e) { return reject(e, rejectWithValue); }
});

export const removeLine = createAsyncThunk('cart/remove', async ({ productId, sku }, { getState, rejectWithValue }) => {
  try {
    if (isAuthed(getState)) return { data: await cartApi.remove(productId, sku) };
    const g = getState().cart.guest;
    const items = g.items.filter((i) => !(i.productId === productId && i.sku === sku));
    const data = items.length ? await guestQuote({ ...g, items }) : { cart: { lines: [], pricing: null, coupon: null, issues: [] } };
    return { data, guest: { ...g, items } };
  } catch (e) { return reject(e, rejectWithValue); }
});

export const applyCoupon = createAsyncThunk('cart/coupon', async (code, { getState, rejectWithValue }) => {
  try {
    if (isAuthed(getState)) return { data: await cartApi.applyCoupon(code) };
    const g = { ...getState().cart.guest, couponCode: code.toUpperCase() };
    const data = await guestQuote(g);
    if (data.cart.couponError) throw Object.assign(new Error('x'), { response: { data: { message: data.cart.couponError.message } } });
    return { data, guest: g };
  } catch (e) { return reject(e, rejectWithValue); }
});

export const removeCoupon = createAsyncThunk('cart/couponRemove', async (_, { getState, rejectWithValue }) => {
  try {
    if (isAuthed(getState)) return { data: await cartApi.removeCoupon() };
    const g = { ...getState().cart.guest, couponCode: null };
    return { data: await guestQuote(g), guest: g };
  } catch (e) { return reject(e, rejectWithValue); }
});

export const mergeGuestCart = createAsyncThunk('cart/merge', async (_, { getState }) => {
  const g = getState().cart.guest;
  if (!g.items.length) return null;
  try { return await cartApi.merge(g.items); } catch { return null; }
});

const empty = { lines: [], pricing: null, coupon: null, issues: [], couponError: null };
const slice = createSlice({
  name: 'cart',
  initialState: { ...empty, guest: readGuest(), loading: false, drawerOpen: false, justAdded: null },
  reducers: {
    openDrawer: (s) => { s.drawerOpen = true; }, closeDrawer: (s) => { s.drawerOpen = false; },
    resetCart: (s) => { Object.assign(s, empty); s.guest = { items: [], couponCode: null }; },
    clearAfterOrder: (s) => { Object.assign(s, empty); s.guest = { items: [], couponCode: null }; },
  },
  extraReducers: (b) => {
    b.addCase(loadCart.pending, (s) => { s.loading = true; });
    b.addCase(loadCart.fulfilled, (s, a) => { s.loading = false; applyServer(s, a.payload); });
    b.addCase(loadCart.rejected, (s) => { s.loading = false; });
    for (const t of [addToCart, setQuantity, removeLine, applyCoupon, removeCoupon]) {
      b.addCase(t.fulfilled, (s, a) => {
        applyServer(s, a.payload.data);
        if (a.payload.guest) s.guest = a.payload.guest;
        if (t === addToCart) { s.justAdded = Date.now(); s.drawerOpen = true; }
      });
    }
    b.addCase(mergeGuestCart.fulfilled, (s, a) => { if (a.payload) { applyServer(s, a.payload); } s.guest = { items: [], couponCode: null }; });
  },
});
export const { openDrawer, closeDrawer, resetCart, clearAfterOrder } = slice.actions;
export default slice.reducer;
export const selectCartCount = (s) => s.cart.lines.reduce((n, l) => n + (l.inStock ? l.quantity : 0), 0);
