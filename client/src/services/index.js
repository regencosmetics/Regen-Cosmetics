import { api, unwrap } from './api.js';

const q = (params) => ({ params: Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null)) });

export const authApi = {
  me: () => unwrap(api.get('/auth/me')),
  login: (b) => unwrap(api.post('/auth/login', b)),
  register: (b) => unwrap(api.post('/auth/register', b)),
  logout: () => unwrap(api.post('/auth/logout')),
  forgot: (b) => unwrap(api.post('/auth/forgot-password', b)),
  reset: (b) => unwrap(api.post('/auth/reset-password', b)),
  updateProfile: (b) => unwrap(api.patch('/auth/profile', b)),
  changePassword: (b) => unwrap(api.post('/auth/change-password', b)),
};
export const accountApi = {
  addresses: () => unwrap(api.get('/account/addresses')),
  addAddress: (b) => unwrap(api.post('/account/addresses', b)),
  updateAddress: (id, b) => unwrap(api.put(`/account/addresses/${id}`, b)),
  deleteAddress: (id) => unwrap(api.delete(`/account/addresses/${id}`)),
  wishlist: () => unwrap(api.get('/account/wishlist')),
  addWish: (id) => unwrap(api.post(`/account/wishlist/${id}`)),
  removeWish: (id) => unwrap(api.delete(`/account/wishlist/${id}`)),
};
export const catalogApi = {
  products: (params) => unwrap(api.get('/products', q(params))),
  suggest: (term) => unwrap(api.get('/products/suggest', q({ q: term }))),
  product: (slug) => unwrap(api.get(`/products/${slug}`)),
  related: (id) => unwrap(api.get(`/products/${id}/related`)),
  reviews: (id, params) => unwrap(api.get(`/products/${id}/reviews`, q(params))),
  addReview: (id, b) => unwrap(api.post(`/products/${id}/reviews`, b)),
  categories: () => unwrap(api.get('/categories')),
  category: (slug) => unwrap(api.get(`/categories/${slug}`)),
  collections: () => unwrap(api.get('/collections')),
  collection: (slug) => unwrap(api.get(`/collections/${slug}`)),
};
export const cartApi = {
  get: () => unwrap(api.get('/cart')),
  add: (b) => unwrap(api.post('/cart/items', b)),
  update: (b) => unwrap(api.patch('/cart/items', b)),
  remove: (productId, sku) => unwrap(api.delete(`/cart/items/${productId}/${sku}`)),
  clear: () => unwrap(api.delete('/cart')),
  applyCoupon: (code) => unwrap(api.post('/cart/coupon', { code })),
  removeCoupon: () => unwrap(api.delete('/cart/coupon')),
  quote: (b) => unwrap(api.post('/cart/quote', b)),
  merge: (items) => unwrap(api.post('/cart/merge', { items })),
  offers: () => unwrap(api.get('/cart/offers')),
};
export const checkoutApi = {
  config: () => unwrap(api.get('/checkout/config')),
  validate: (b) => unwrap(api.post('/checkout/validate', b)),
  placeOrder: (b, key) => unwrap(api.post('/checkout/orders', b, { headers: { 'Idempotency-Key': key } })),
  verify: (b) => unwrap(api.post('/payments/verify', b)),
  failed: (b) => unwrap(api.post('/payments/failed', b)),
  retry: (orderId) => unwrap(api.post(`/payments/retry/${orderId}`)),
};
export const orderApi = {
  list: (params) => unwrap(api.get('/orders', q(params))),
  get: (id) => unwrap(api.get(`/orders/${id}`)),
  cancel: (id, reason) => unwrap(api.post(`/orders/${id}/cancel`, { reason })),
  track: (params) => unwrap(api.get('/orders/track', q(params))),
  invoiceUrl: (id) => `${api.defaults.baseURL}/orders/${id}/invoice`,
  invoice: (id) => api.get(`/orders/${id}/invoice`, { responseType: 'blob' }),
};
export const returnApi = {
  eligibility: (orderId) => unwrap(api.get(`/returns/eligibility/${orderId}`)),
  create: (formData) => unwrap(api.post('/returns', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  list: (params) => unwrap(api.get('/returns', q(params))),
  get: (id) => unwrap(api.get(`/returns/${id}`)),
};
export const publicApi = {
  cms: (key) => unwrap(api.get(`/cms/${key}`)),
  banners: (placement) => unwrap(api.get('/banners', q({ placement }))),
  contact: (b) => unwrap(api.post('/contact', b)),
  subscribe: (email) => unwrap(api.post('/newsletter/subscribe', { email })),
  unsubscribe: (token) => unwrap(api.post('/newsletter/unsubscribe', { token })),
};
export const adminApi = {
  get: (path, params) => unwrap(api.get(`/admin/${path}`, q(params))),
  post: (path, b, cfg) => unwrap(api.post(`/admin/${path}`, b, cfg)),
  put: (path, b) => unwrap(api.put(`/admin/${path}`, b)),
  patch: (path, b) => unwrap(api.patch(`/admin/${path}`, b)),
  del: (path) => unwrap(api.delete(`/admin/${path}`)),
  blob: (path) => api.get(`/admin/${path}`, { responseType: 'blob' }),
  upload: (files, folder = 'products') => { const f = new FormData(); [...files].forEach((x) => f.append('images', x)); return unwrap(api.post(`/admin/uploads?folder=${folder}`, f, { headers: { 'Content-Type': 'multipart/form-data' } })); },
};
