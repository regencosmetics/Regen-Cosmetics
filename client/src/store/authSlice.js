import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '@/services';
import { resetCsrf } from '@/services/api';

export const restoreSession = createAsyncThunk('auth/restore', async () => { try { return (await authApi.me()).user; } catch { return null; } });
export const login = createAsyncThunk('auth/login', async (body, { dispatch, rejectWithValue }) => {
  try {
    const data = await authApi.login(body);
    const { onAuthenticated } = await import('./sessionHooks.js'); await onAuthenticated(dispatch);
    return data;
  } catch (e) { return rejectWithValue(e); }
});
export const register = createAsyncThunk('auth/register', async (body, { dispatch, rejectWithValue }) => {
  try {
    const data = await authApi.register(body);
    const { onAuthenticated } = await import('./sessionHooks.js'); await onAuthenticated(dispatch);
    return data;
  } catch (e) { return rejectWithValue(e); }
});
export const logout = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try { await authApi.logout(); } catch { /* cookie may already be gone */ }
  resetCsrf();
  const { onLoggedOut } = await import('./sessionHooks.js'); onLoggedOut(dispatch);
});

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, ready: false },
  reducers: { setUser: (s, a) => { s.user = a.payload; }, sessionExpired: (s) => { s.user = null; } },
  extraReducers: (b) => {
    b.addCase(restoreSession.fulfilled, (s, a) => { s.user = a.payload; s.ready = true; });
    b.addCase(login.fulfilled, (s, a) => { s.user = a.payload.user; });
    b.addCase(register.fulfilled, (s, a) => { s.user = a.payload.user; });
    b.addCase(logout.fulfilled, (s) => { s.user = null; });
  },
});
export const { setUser, sessionExpired } = slice.actions;
export default slice.reducer;
export const selectUser = (s) => s.auth.user;
export const selectIsAdmin = (s) => s.auth.user?.role === 'admin';
