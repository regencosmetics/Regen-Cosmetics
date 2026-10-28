import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { makeStore } from '@/store';
import ProtectedRoute from '@/routes/ProtectedRoute.jsx';
import AuthModal from '@/components/layout/AuthModal.jsx';
import Header from '@/components/layout/Header.jsx';
import ProductCard from '@/components/product/ProductCard.jsx';
import { Summary } from '@/components/cart/Summary.jsx';
import { NAV_LINKS } from '@/constants';

vi.mock('@/services/api', async (orig) => ({ ...(await orig()), api: { get: vi.fn().mockResolvedValue({ data: { data: {} } }), post: vi.fn(), defaults: { baseURL: '/api/v1' } } }));

const wrap = (ui, { route = '/', state } = {}) => {
  const store = makeStore(state);
  return { store, ...render(<Provider store={store}><HelmetProvider><MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter></HelmetProvider></Provider>) };
};
const product = { _id: 'p1', slug: 'matte-gel', name: 'Matte Gel SPF 50', images: [{ url: '/x.webp' }], variants: [{ sku: 'MG-50', label: '50 g', price: 1299, salePrice: 999, stock: 5 }], ratingCount: 0 };
const authed = { auth: { user: { name: 'Asha', role: 'customer' }, ready: true } };

describe('protected routes', () => {
  const tree = <Routes><Route element={<ProtectedRoute />}><Route path="/account" element={<p>secret account</p>} /></Route><Route path="/" element={<p>home</p>} /></Routes>;
  it('sends guests home and opens the login modal', () => {
    const { store } = wrap(tree, { route: '/account', state: { auth: { user: null, ready: true } } });
    expect(screen.queryByText('secret account')).not.toBeInTheDocument(); expect(store.getState().ui.authModal.open).toBe(true);
  });
  it('lets a signed-in customer through', () => { wrap(tree, { route: '/account', state: authed }); expect(screen.getByText('secret account')).toBeInTheDocument(); });
  it('blocks customers from admin routes', () => {
    wrap(<Routes><Route element={<ProtectedRoute admin />}><Route path="/admin" element={<p>admin area</p>} /></Route><Route path="/" element={<p>home</p>} /></Routes>, { route: '/admin', state: authed });
    expect(screen.queryByText('admin area')).not.toBeInTheDocument(); expect(screen.getByText('home')).toBeInTheDocument();
  });
});

describe('header', () => {
  beforeEach(() => localStorage.clear());
  it('renders every navigation link', () => { wrap(<Header />); for (const l of NAV_LINKS) expect(screen.getAllByRole('link', { name: l.label }).length).toBeGreaterThan(0); });
  it('shows an empty cart count of zero and opens the login modal from the profile icon', async () => {
    const { store } = wrap(<Header />); expect(screen.getByRole('button', { name: /Shopping bag, 0 items/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Log in' })); expect(store.getState().ui.authModal.open).toBe(true);
  });
});

describe('login modal validation', () => {
  it('shows field errors and does not submit an empty form', async () => {
    wrap(<AuthModal />, { state: { ui: { authModal: { open: true, mode: 'login', redirectTo: null }, mobileNav: false, searchOpen: false } } });
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument(); expect(screen.getByText('Enter your password')).toBeInTheDocument();
  });
});

describe('price display', () => {
  it('shows sale price, struck-through MRP and discount on a product card', () => {
    wrap(<ProductCard product={product} />);
    expect(screen.getByText('Rs 999.00')).toBeInTheDocument(); expect(screen.getByText('23% off')).toBeInTheDocument(); expect(screen.getByRole('button', { name: /Add Matte Gel SPF 50 to cart/ })).toBeEnabled();
  });
  it('disables Add to Cart when out of stock', () => {
    wrap(<ProductCard product={{ ...product, variants: [{ ...product.variants[0], stock: 0 }] }} />);
    expect(screen.getByRole('button', { name: /Add Matte Gel SPF 50 to cart/ })).toBeDisabled(); expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(0);
  });
  it('order summary shows FREE shipping, coupon and savings', () => {
    render(<Summary pricing={{ subtotal: 1999, discount: 200, couponCode: 'SAVE200', shipping: 0, codFee: 0, total: 1799, savings: 500 }} />);
    expect(screen.getByText('FREE')).toBeInTheDocument(); expect(screen.getByText(/SAVE200/)).toBeInTheDocument(); expect(screen.getByText(/Saved So Far/)).toBeInTheDocument(); expect(screen.getByText('Rs 1,799.00')).toBeInTheDocument();
  });
});
