import { createSlice } from '@reduxjs/toolkit';
const slice = createSlice({
  name: 'ui',
  initialState: { authModal: { open: false, mode: 'login', redirectTo: null }, mobileNav: false, searchOpen: false },
  reducers: {
    openAuth: (s, a) => { s.authModal = { open: true, mode: a.payload?.mode || 'login', redirectTo: a.payload?.redirectTo || null }; },
    closeAuth: (s) => { s.authModal.open = false; },
    setMobileNav: (s, a) => { s.mobileNav = a.payload; },
    setSearchOpen: (s, a) => { s.searchOpen = a.payload; },
  },
});
export const { openAuth, closeAuth, setMobileNav, setSearchOpen } = slice.actions;
export default slice.reducer;
