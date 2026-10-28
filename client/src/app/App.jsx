import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import PublicLayout from '@/layouts/PublicLayout.jsx';
import ProtectedRoute from '@/routes/ProtectedRoute.jsx';
import { PageLoader } from '@/components/common/Feedback.jsx';
import { restoreSession } from '@/store/authSlice';
import { loadCart } from '@/store/cartSlice';
import { loadWishlist } from '@/store/wishlistSlice';

const L = (f) => lazy(f);
const Home = L(() => import('@/pages/customer/Home.jsx'));
const Shop = L(() => import('@/pages/products/Shop.jsx'));
const ProductDetail = L(() => import('@/pages/products/ProductDetail.jsx'));
const Cart = L(() => import('@/pages/cart/Cart.jsx'));
const Checkout = L(() => import('@/pages/checkout/Checkout.jsx'));
const OrderSuccess = L(() => import('@/pages/checkout/OrderSuccess.jsx'));
const Wishlist = L(() => import('@/pages/account/Wishlist.jsx'));
const Account = L(() => import('@/pages/account/Account.jsx'));
const Orders = L(() => import('@/pages/orders/Orders.jsx'));
const OrderDetail = L(() => import('@/pages/orders/OrderDetail.jsx'));
const TrackOrder = L(() => import('@/pages/orders/TrackOrder.jsx'));
const ReturnRequest = L(() => import('@/pages/orders/ReturnRequest.jsx'));
const Returns = L(() => import('@/pages/orders/Returns.jsx'));
const ReturnDetail = L(() => import('@/pages/orders/ReturnDetail.jsx'));
const AuthPages = L(() => import('@/pages/account/AuthPages.jsx'));
const Static = L(() => import('@/pages/legal/StaticPages.jsx'));
const Contact = L(() => import('@/pages/legal/Contact.jsx'));
const NotFound = L(() => import('@/pages/legal/NotFound.jsx'));
const AdminApp = L(() => import('@/pages/admin/AdminApp.jsx'));

const S = ({ c: C, ...p }) => <C {...p} />;

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(restoreSession()).then((r) => { if (r.payload) { dispatch(loadWishlist()); } dispatch(loadCart()); }); }, [dispatch]);
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/admin/*" element={<ProtectedRoute admin />}><Route path="*" element={<AdminApp />} /></Route>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="search" element={<Shop mode="search" />} />
          <Route path="category/:slug" element={<Shop mode="category" />} />
          <Route path="collection/:slug" element={<Shop mode="collection" />} />
          <Route path="products/:slug" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="track-order" element={<TrackOrder />} />
          <Route path="login" element={<AuthPages kind="login" />} />
          <Route path="register" element={<AuthPages kind="register" />} />
          <Route path="forgot-password" element={<AuthPages kind="forgot" />} />
          <Route path="reset-password" element={<AuthPages kind="reset" />} />
          <Route path="unsubscribe" element={<AuthPages kind="unsubscribe" />} />
          <Route path="about" element={<S c={Static} page="about" />} />
          <Route path="faq" element={<S c={Static} page="faq" />} />
          <Route path="privacy-policy" element={<S c={Static} page="privacy" />} />
          <Route path="shipping-returns" element={<S c={Static} page="shipping" />} />
          <Route path="terms" element={<S c={Static} page="terms" />} />
          <Route path="contact" element={<Contact />} />
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<Checkout />} />
            <Route path="order-success/:id" element={<OrderSuccess />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="account" element={<Account />} />
            <Route path="account/orders" element={<Orders />} />
            <Route path="account/orders/:id" element={<OrderDetail />} />
            <Route path="account/orders/:id/return" element={<ReturnRequest />} />
            <Route path="account/returns" element={<Returns />} />
            <Route path="account/returns/:id" element={<ReturnDetail />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
