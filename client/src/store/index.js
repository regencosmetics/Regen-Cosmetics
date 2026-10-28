import { configureStore } from '@reduxjs/toolkit';
import auth, { sessionExpired } from './authSlice.js';
import cart, { persistGuest } from './cartSlice.js';
import wishlist from './wishlistSlice.js';
import ui from './uiSlice.js';
import { setUnauthorizedHandler } from '@/services/api';

export const makeStore = (preloaded) => configureStore({ reducer: { auth, cart, wishlist, ui }, preloadedState: preloaded });
export const store = makeStore();
setUnauthorizedHandler(() => { if (store.getState().auth.user) store.dispatch(sessionExpired()); });

let last;
store.subscribe(() => { const g = store.getState().cart.guest; if (g !== last) { last = g; persistGuest(g); } });
